/**
 * ============================================
 * WATER RECORD APP - Print Utilities
 * ============================================
 * Shared functions for all print pages
 * Version: 4.2.0
 * 
 * Dependencies: utils.js (formatResultValue, preserveLeadingZeros, 
 *               stripApostrophe, formatDateDMY)
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================
const PRINT_CONFIG = {
  MAX_SAMPLES: 30,
  SERVER_URL: 'http://localhost:8000'
};

// Form type configurations for future forms
const FORM_TYPES = {
  'PW-PRW': {
    templateName: 'pw-prw-template.docx',
    folderName: 'pw-prw',
    hasMultipleResults: true
  },
  'WFI-PUS': {
    templateName: 'wfi-pus-template.docx',
    folderName: 'wfi-pus',
    hasMultipleResults: false
  },
  'COMPRESSED-AIR': {
    templateName: 'ca-template.docx',
    folderName: 'compressed-air',
    hasMultipleResults: false
  },
  'EM-AIR': {
    templateName: 'em-template.docx',
    folderName: 'em-air',
    hasMultipleResults: false
  },
  'CLEANING-VALIDATION': {
    templateName: 'cv-contact-template.docx',
    folderName: 'cleaning-validation',
    hasMultipleResults: false
  },
  'GROWTH-PROMOTION': {
    templateName: 'growth-promotion-template.docx',
    folderName: 'growth-promotion',
    hasMultipleResults: false
  },
  'IDENTIFICATION': {
    templateName: 'identification-template.docx',
    folderName: 'identification',
    hasMultipleResults: false
  }
};

// ============================================
// SAMPLE DATA PARSING
// ============================================

/**
 * Parse samples from data object
 * @param {Object} data - Data object with samples or samplesJson
 * @returns {Array} Parsed samples array
 */
function parseSamples(data) {
  let samples = [];

  if (data.samples && Array.isArray(data.samples)) {
    samples = data.samples;
  } else if (data.samplesJson) {
    try {
      let parsed = typeof data.samplesJson === 'string'
        ? JSON.parse(data.samplesJson)
        : data.samplesJson;
      // handle double-encoded: JSON.parse returned another string
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      samples = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Parse samples error:', e);
    }
  }

  console.log('[parseSamples] count:', samples.length);
  return samples;
}

// ============================================
// SERVER COMMUNICATION
// ============================================

/**
 * Check if PDF server is ready
 * @returns {Promise<boolean>} Server ready status
 */
async function checkServerReady() {
  try {
    const response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/status`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'running';
  } catch (e) {
    console.error('Server check failed:', e);
    return false;
  }
}

/**
 * Check if a PDF converter (MS Office or LibreOffice) is available.
 * Returns detailed status with actionable guidance for the user.
 * @returns {Promise<Object>} { available: boolean, converter: string, message: string }
 */
async function checkConverterAvailable() {
  try {
    const response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/status`);
    if (!response.ok) {
      return {
        available: false,
        converter: null,
        message: 'PDF Server ไม่ตอบสนอง — กรุณารัน START-SERVER.bat'
      };
    }
    const data = await response.json();

    if (data.msOffice) {
      return { available: true, converter: 'Microsoft Office', message: '' };
    }
    if (data.libreOffice) {
      return { available: true, converter: 'LibreOffice', message: '' };
    }

    return {
      available: false,
      converter: null,
      message:
        'ไม่พบโปรแกรมแปลง PDF บนเครื่องนี้\n\n' +
        'กรุณาติดตั้งอย่างใดอย่างหนึ่ง:\n' +
        '1. Microsoft Office → จากนั้นรัน INSTALL-MSOFFICE-SUPPORT.bat\n' +
        '2. LibreOffice (ฟรี) → https://www.libreoffice.org/download/\n\n' +
        'หลังติดตั้งแล้ว ให้ Restart START-SERVER.bat'
    };
  } catch (e) {
    return {
      available: false,
      converter: null,
      message: 'ไม่สามารถเชื่อมต่อ PDF Server ได้ — กรุณารัน START-SERVER.bat'
    };
  }
}

/**
 * Wrapper: ensure converter is available before generating PDF.
 * Shows user-friendly alert and throws if not available.
 */
async function ensureConverterOrThrow() {
  const status = await checkConverterAvailable();
  if (!status.available) {
    UI.showToast('ไม่พบ PDF Converter — ดูรายละเอียดใน Alert', 'error', 5000);
    alert(status.message);
    throw new Error(status.message.split('\n')[0]);
  }
  return status;
}

/**
 * Generate separate PDF files for each page group (worksheetNo_p1, _p2, ...).
 * One request per file → each file = one complete template copy (single or multi-page).
 * Returns array of blob URLs, one per file.
 * @param {Object} baseInfo  - { worksheetNo, templateName, formType }
 * @param {Array}  samples   - Full samples array
 * @param {Function} mapFn   - (pageSamples) → tags object
 * @param {number} perPage   - max samples per template copy
 * @returns {Promise<Array<{key:string, url:string}>>}
 */
/**
 * Show/update a real progress bar inside the loading overlay.
 * step: current step (1-based), total: total steps, label: text to show
 */
function showProgress(step, total, label) {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  let bar = document.getElementById('_progressBar');
  if (!bar) {
    overlay.innerHTML = `
      <div style="text-align:center;padding:2rem;min-width:320px;">
        <div id="_progressLabel" style="font-size:0.9rem;margin-bottom:12px;color:var(--ink,#333);font-weight:600;"></div>
        <div style="background:var(--line,#ddd);border-radius:8px;height:12px;overflow:hidden;">
          <div id="_progressBar" style="height:100%;background:var(--water,#1976D2);border-radius:8px;transition:width 0.3s;width:0%"></div>
        </div>
        <div id="_progressStep" style="font-size:0.75rem;color:var(--ink-muted,#888);margin-top:8px;"></div>
      </div>`;
    bar = document.getElementById('_progressBar');
  }
  const pct = total > 0 ? Math.round((step / total) * 100) : 0;
  bar.style.width = pct + '%';
  const labelEl = document.getElementById('_progressLabel');
  if (labelEl) labelEl.textContent = label;
  const stepEl = document.getElementById('_progressStep');
  if (stepEl) stepEl.textContent = `${step} / ${total} (${pct}%)`;
}

function hideProgress() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
  // Restore original spinner HTML for next use
  const spinner = '<div class="loading-spinner"></div><div id="loadingText" class="loading-text">กำลังโหลด...</div>';
  if (overlay) overlay.innerHTML = spinner;
}

/**
 * Generate PDF files using 2-step flow:
 *   Step 1: POST /api/generate-words — build all DOCX first
 *   Step 2: POST /api/convert-word-to-pdf — convert each DOCX → PDF
 * Shows real progress bar throughout.
 */
async function generatePdfFiles(baseInfo, samples, mapFn, perPage) {
  const { worksheetNo, templateName, formType } = baseInfo;
  const totalFiles = Math.max(1, Math.ceil(samples.length / perPage));

  // Build pages payload
  const pages = [];
  for (let p = 0; p < totalFiles; p++) {
    const pageSamples = samples.slice(p * perPage, (p + 1) * perPage);
    const tags = mapFn(pageSamples);
    const key = totalFiles > 1 ? `${worksheetNo}_p${p + 1}` : worksheetNo;
    pages.push({ worksheetNo: key, tags });
  }

  const totalSteps = totalFiles + 1; // 1 generate-words call + N convert calls
  let step = 0;

  // ── Step 1: Generate all DOCX ──
  showProgress(step, totalSteps, 'กำลังสร้างไฟล์ Word...');
  const genRes = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/generate-words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateName, formType, pages })
  });
  if (!genRes.ok) {
    let msg = 'Failed to generate Word files';
    try { msg = (await genRes.json()).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  const genData = await genRes.json();
  step = 1;

  // ── Step 2: Convert each DOCX → PDF ──
  const results = [];
  for (const file of genData.files) {
    showProgress(step, totalSteps, `กำลังแปลง PDF ชุดที่ ${step} / ${totalFiles}...`);

    const cvRes = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/convert-word-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordPath: file.wordPath, formType, key: file.key })
    });
    if (!cvRes.ok) {
      let msg = 'PDF conversion failed';
      try { msg = (await cvRes.json()).error || msg; } catch (_) {}
      if (msg.toLowerCase().includes('no pdf converter') || msg.toLowerCase().includes('not available')) {
        alert('ไม่สามารถแปลง PDF ได้ — กรุณาติดตั้ง Microsoft Office หรือ LibreOffice แล้ว Restart server');
        throw new Error('PDF Converter ไม่พร้อมใช้งาน');
      }
      throw new Error(msg);
    }
    results.push({ key: file.key, url: URL.createObjectURL(await cvRes.blob()) });
    step++;
  }

  showProgress(totalSteps, totalSteps, 'เสร็จสิ้น!');
  await new Promise(r => setTimeout(r, 300)); // brief flash of 100%
  hideProgress();
  return results;
}

/**
 * Generate PDF and get blob URL for preview
 * @param {Object} data - Data for PDF generation
 * @returns {Promise<string>} Blob URL for PDF
 */
async function generatePdfPreview(data) {
  const response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/preview-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    let errorMsg = 'Failed to generate PDF';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (_) { /* response wasn't JSON */ }

    // Detect converter-not-found errors and give specific guidance
    const lower = errorMsg.toLowerCase();
    if (lower.includes('no pdf converter') || lower.includes('converter not found') ||
        lower.includes('conversion failed') || lower.includes('not available')) {
      const guidance =
        'ไม่สามารถแปลง PDF ได้ — ไม่พบ PDF Converter บนเครื่องนี้\n\n' +
        'วิธีแก้ไข:\n' +
        '1. ติดตั้ง Microsoft Office แล้วรัน INSTALL-MSOFFICE-SUPPORT.bat\n' +
        '   หรือ\n' +
        '2. ติดตั้ง LibreOffice (ฟรี): https://www.libreoffice.org/download/\n\n' +
        'จากนั้น Restart START-SERVER.bat แล้วลองใหม่';
      alert(guidance);
      throw new Error('PDF Converter ไม่พร้อมใช้งาน');
    }

    throw new Error(errorMsg);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Save PDF to desktop
 * @param {string} worksheetNo - Worksheet number
 * @param {string} formType - Form type folder name
 * @returns {Promise<Object>} Result with success status
 */
async function savePdfToDesktop(worksheetNo, formType) {
  const response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/print-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      worksheetNo, 
      formType,
      copyToDesktop: true 
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to save PDF');
  }
  
  return await response.json();
}

// ============================================
// DATA PREVIEW HTML GENERATORS
// ============================================

/**
 * Generate document info section HTML
 * @param {Object} data - Document data
 * @returns {string} HTML string
 */
function generateDocInfoHTML(data) {
  return `
    <section class="preview-section">
      <div class="preview-section__header">Document Information</div>
      <div class="preview-grid preview-grid--4">
        <div class="preview-field">
          <div class="preview-field__label">Worksheet No.</div>
          <div class="preview-field__value preview-field__value--mono">${data.worksheetNo || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Document No.</div>
          <div class="preview-field__value preview-field__value--mono">${data.docNo || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Building</div>
          <div class="preview-field__value">${data.building || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Status</div>
          <div class="preview-field__value">${data.recordStatus || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Sampling Date</div>
          <div class="preview-field__value">${formatDateDMY(data.samplingDate) || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Performed Date</div>
          <div class="preview-field__value">${formatDateDMY(data.performedDate) || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Temp (°C)</div>
          <div class="preview-field__value">${data.temp || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Incubator No.</div>
          <div class="preview-field__value">${data.incNo || '-'}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate QC section HTML for WFI-PUS (with Glove Print)
 * @param {Object} data - QC data
 * @returns {string} HTML string
 */
function generateQCHTML_WFI(data) {
  return `
    <section class="preview-section">
      <div class="preview-section__header">Glove Print & QC</div>
      <div class="preview-grid preview-grid--5">
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Right Hand</div>
          <div class="preview-qc-box__value">${data.rightHand || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Left Hand</div>
          <div class="preview-qc-box__value">${data.leftHand || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Right EM</div>
          <div class="preview-qc-box__value">${data.rightEM || data.rightEm || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Left EM</div>
          <div class="preview-qc-box__value">${data.leftEM || data.leftEm || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Negative</div>
          <div class="preview-qc-box__value">${data.negativeValue || '0'}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate QC section HTML for PW-PRW
 * @param {Object} data - QC data
 * @returns {string} HTML string
 */
function generateQCHTML_PW(data) {
  return `
    <section class="preview-section">
      <div class="preview-section__header">QC Data</div>
      <div class="preview-grid preview-grid--3">
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Right EM</div>
          <div class="preview-qc-box__value">${data.rightEM || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Left EM</div>
          <div class="preview-qc-box__value">${data.leftEM || '0'}</div>
        </div>
        <div class="preview-qc-box">
          <div class="preview-qc-box__label">Negative</div>
          <div class="preview-qc-box__value">${data.negativeValue || '0'}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate samples table HTML for single result (WFI-PUS)
 * @param {Array} samples - Samples array
 * @returns {string} HTML string
 */
function generateSamplesTableHTML_Single(samples) {
  const rows = samples.length > 0 
    ? samples.map((s, i) => `
        <tr>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--muted">${i + 1}</td>
          <td class="preview-table__cell preview-table__cell--bold">${s.samplingPoint || '-'}</td>
          <td class="preview-table__cell preview-table__cell--light">${s.samplingTag || '-'}</td>
          <td class="preview-table__cell preview-table__cell--light">${s.location || '-'}</td>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--bold">${s.result || '0'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" class="preview-table__cell preview-table__cell--empty">No sampling data</td></tr>`;

  return `
    <section class="preview-section">
      <div class="preview-section__header">
        <span>Sampling Data</span>
        <span class="preview-section__count">${samples.length} records</span>
      </div>
      <div class="preview-table-wrapper">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="preview-table__th preview-table__th--center" style="width:36px">#</th>
              <th class="preview-table__th">Sampling Point</th>
              <th class="preview-table__th">Tag</th>
              <th class="preview-table__th">Location</th>
              <th class="preview-table__th preview-table__th--center" style="width:70px">Result</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

/**
 * Generate samples table HTML for multiple results (PW-PRW)
 * @param {Array} samples - Samples array
 * @returns {string} HTML string
 */
function generateSamplesTableHTML_Multi(samples) {
  const rows = samples.length > 0 
    ? samples.map((s, i) => `
        <tr>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--muted">${i + 1}</td>
          <td class="preview-table__cell preview-table__cell--bold">${s.samplingPoint || '-'}</td>
          <td class="preview-table__cell preview-table__cell--light">${s.samplingTag || '-'}</td>
          <td class="preview-table__cell preview-table__cell--light">${s.location || '-'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.result1 ?? '0'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.result2 ?? '0'}</td>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--bold">${s.resultAvg ?? '0'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" class="preview-table__cell preview-table__cell--empty">No sampling data</td></tr>`;

  return `
    <section class="preview-section">
      <div class="preview-section__header">
        <span>Sampling Data</span>
        <span class="preview-section__count">${samples.length} records</span>
      </div>
      <div class="preview-table-wrapper">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="preview-table__th preview-table__th--center" style="width:36px">#</th>
              <th class="preview-table__th">Sampling Point</th>
              <th class="preview-table__th">Tag</th>
              <th class="preview-table__th">Location</th>
              <th class="preview-table__th preview-table__th--center" style="width:60px">R1</th>
              <th class="preview-table__th preview-table__th--center" style="width:60px">R2</th>
              <th class="preview-table__th preview-table__th--center" style="width:60px">Avg</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

// ============================================
// PDF VIEWER RENDERER (shared)
// ============================================

/**
 * Render PDF files with tab switcher (one iframe visible at a time).
 * @param {Array<{key:string,url:string}>} files
 */
function renderPdfViewer(files, containerId = 'pdfViewerContent', titleSelector = '.pdf-viewer__title') {
  const container = document.getElementById(containerId);
  container.classList.remove('preview-data-mode');
  container.classList.add('preview-pdf-mode');
  container.style.position = '';

  const n = files.length;
  document.querySelector(titleSelector).textContent =
    n > 1 ? 'ตัวอย่าง PDF (' + n + ' ชุด)' : 'ตัวอย่าง PDF';

  // Clear previous tabs from header
  const statusEl = document.getElementById('pdfViewerStatus');

  // Inject tabs into header status area (same row as title)
  if (n > 1 && statusEl) {
    statusEl.innerHTML = files.map(function(f, i) {
      const active = i === 0;
      return '<button onclick="__pdfTab(this,' + i + ')" data-tab="' + i + '" style="'
        + 'padding:4px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;border:none;border-radius:6px;'
        + 'margin-left:4px;transition:all 0.18s;white-space:nowrap;'
        + (active
            ? 'background:var(--water,#1976D2);color:#fff;box-shadow:0 2px 6px rgba(25,118,210,0.3);transform:translateY(-1px);'
            : 'background:var(--paper,#f0f0f0);color:var(--ink-muted,#888);')
        + '">ชุด ' + (i + 1) + ' / ' + n + '</button>';
    }).join('');
  } else if (statusEl) {
    statusEl.innerHTML = '';
  }

  // Render iframes only — no extra wrapper/bar
  container.innerHTML =
    '<style>@keyframes _pdfFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}</style>'
    + files.map(function(f, i) {
      return '<iframe src="' + f.url + '" data-panel="' + i
        + '" style="width:100%;min-height:1123px;border:none;display:' + (i === 0 ? 'block' : 'none') + ';'
        + (i === 0 ? 'animation:_pdfFadeIn 0.35s ease;' : '')
        + '" title="PDF ' + f.key + '"></iframe>';
    }).join('');

  window.__pdfTab = function(btn, idx) {
    if (statusEl) {
      statusEl.querySelectorAll('button[data-tab]').forEach(function(b) {
        b.style.background = 'var(--paper,#f0f0f0)';
        b.style.color = 'var(--ink-muted,#888)';
        b.style.boxShadow = '';
        b.style.transform = '';
      });
    }
    btn.style.background = 'var(--water,#1976D2)';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 2px 6px rgba(25,118,210,0.3)';
    btn.style.transform = 'translateY(-1px)';

    container.querySelectorAll('iframe[data-panel]').forEach(function(f) {
      const show = parseInt(f.dataset.panel) === idx;
      f.style.display = show ? 'block' : 'none';
      if (show) { f.style.animation = 'none'; f.offsetHeight; f.style.animation = '_pdfFadeIn 0.35s ease'; }
    });
  };
}

// ============================================
// DESKTOP OVERWRITE CHECK
// ============================================

/**
 * Check Desktop for existing files; prompt user if any exist.
 * Returns { proceed: true } to save, or { proceed: false, useExisting: true } to show cached PDF.
 * @param {string} worksheetNo
 * @param {string} formType
 * @param {string[]} pageKeys  - e.g. ["AT-26-0026"] or ["AT-26-0026_p1","AT-26-0026_p2"]
 * @returns {Promise<{proceed:boolean, useExisting:boolean}>}
 */
async function checkDesktopOverwrite(worksheetNo, formType, pageKeys) {
  try {
    const res = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/check-desktop-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worksheetNo, pageKeys })
    });
    const data = await res.json();
    const existing = data.existing || [];

    if (existing.length === 0) return { proceed: true, useExisting: false };

    const fileList = existing.join(', ');
    const ok = confirm(
      `⚠️ พบไฟล์เดิมบน Desktop แล้ว:\n${fileList}.pdf\n\nOK = บันทึกทับไฟล์เดิม\nCancel = เปิดไฟล์เดิม`
    );
    return { proceed: ok, useExisting: !ok };
  } catch (_) {
    // ถ้า check ไม่ได้ ให้ผ่านไปได้เลย
    return { proceed: true, useExisting: false };
  }
}

// ============================================
// LOG
// ============================================
console.log('✅ print-utils.js loaded');
