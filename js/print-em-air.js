/**
 * ============================================
 * AIR RECORD APP - Print EM Air
 * ============================================
 * Version: 1.0.0
 * Uses: print-utils.js for shared functions
 * 
 * Template: em-template.docx
 *   - 50 samples per page
 *   - Max 150 samples = up to 3 pages
 *   - All pages share same docNo
 * Tags: docNo, building, floor, performedDate, samplingDate, incNo,
 *        lotMedia, mfgMedia, expMedia, temp,
 *        determinedDate, concludedDate, approvedDate
 *        Per sample (x50): roomNo01-50, grade01-50, tempRoom01-50, rhRoom01-50,
 *                          timeIn01-50, timeOut01-50, occurResult01-50
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================
const FORM_TYPE = 'EM-AIR';
const TEMPLATE_NAME = 'em-template.docx';
const FOLDER_NAME = 'em-air';
const SAMPLES_PER_PAGE = 50;

// Air Sync Config
const AIR_PRINT_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbytoaWepwl0RJLilSvShVBIMIJZ3kYpN4UEynRbdeNTEAlfOHWWkNXJTwe62-Ry_TeB/exec'
};

// ============================================
// STATE
// ============================================
let worksheets = [];
let selectedData = null;
let currentStatus = 'Routine';
let currentPreviewMode = null;
let currentPdfUrl = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('usernameDisplay').textContent = username;

  const savedUrl = Storage.get('air_script_url');
  if (savedUrl) {
    AIR_PRINT_CONFIG.SCRIPT_URL = savedUrl;
  }

  checkPdfServer();
  await loadWorksheets();
});

// ============================================
// PDF SERVER CHECK
// ============================================
async function checkPdfServer() {
  try {
    const converterStatus = await checkConverterAvailable();
    const statusEl = document.getElementById('pdfStatus');
    if (converterStatus.available) {
      statusEl.textContent = `PDF Server พร้อม (${converterStatus.converter})`;
      statusEl.className = 'status-badge status-badge--success';
    } else {
      statusEl.textContent = 'PDF Converter ไม่พร้อม';
      statusEl.className = 'status-badge status-badge--offline';
      console.warn('[PDF]', converterStatus.message);
    }
  } catch (e) {
    console.error('Server check error:', e);
    const statusEl = document.getElementById('pdfStatus');
    if (statusEl) {
      statusEl.textContent = 'PDF Server ไม่พร้อม';
      statusEl.className = 'status-badge status-badge--offline';
    }
  }
}

// ============================================
// LOAD WORKSHEETS
// ============================================
async function loadWorksheets() {
  const listEl = document.getElementById('worksheetList');
  listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">กำลังโหลด...</div>';

  try {
    const scriptUrl = AIR_PRINT_CONFIG.SCRIPT_URL;

    if (!scriptUrl) {
      listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">ยังไม่ได้ตั้งค่า Air Script URL</div>';
      return;
    }

    const allData = await fetchAllAirWorksheets(scriptUrl, 'em-air');
    if (allData.length) {
      let filtered = allData;
      if (currentStatus !== 'Routine') {
        filtered = allData.filter(r => r.recordStatus === currentStatus);
      } else {
        filtered = allData.filter(r => !r.recordStatus || r.recordStatus === 'Routine');
      }

      worksheets = filtered.sort((a, b) => {
        const dateA = a.samplingDate ? new Date(a.samplingDate + 'T12:00:00') : new Date(0);
        const dateB = b.samplingDate ? new Date(b.samplingDate + 'T12:00:00') : new Date(0);
        return dateB - dateA;
      });

      renderWorksheetList();
      selectRequestedWorksheet();
    } else {
      listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">ไม่พบข้อมูล</div>';
    }
  } catch (e) {
    console.error('Load worksheets error:', e);
    listEl.innerHTML = '<div style="text-align: center; color: var(--error); padding: var(--space-4);">โหลดข้อมูลไม่สำเร็จ</div>';
  }
}

async function fetchAllAirWorksheets(scriptUrl, workflow) {
  const items = [];
  const seenCursors = new Set();
  let cursor = '';

  while (true) {
    const params = new URLSearchParams({ action: 'search', workflow: workflow, limit: '100' });
    if (cursor) params.set('cursor', cursor);
    const response = await fetch(`${scriptUrl}?${params.toString()}`);
    if (!response.ok) throw new Error(`Worksheet search failed (${response.status})`);
    const result = await response.json();
    if (!result || result.success !== true || !result.data || !Array.isArray(result.data.items)) {
      throw new Error('Worksheet search returned an invalid response');
    }
    items.push(...result.data.items);
    const nextCursor = String(result.data.nextCursor || '');
    if (!nextCursor) return items;
    if (seenCursors.has(nextCursor)) throw new Error('Worksheet search returned a repeated cursor');
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}

function selectRequestedWorksheet() {
  const requested = new URLSearchParams(window.location.search).get('worksheetNo');
  if (!requested) return;
  const index = worksheets.findIndex(record => String(record.worksheetNo || record.docNo || '') === requested);
  if (index >= 0) selectWorksheet(index);
}

// ============================================
// RENDER WORKSHEET LIST
// ============================================
function renderWorksheetList() {
  const listEl = document.getElementById('worksheetList');

  if (worksheets.length === 0) {
    listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">ไม่พบข้อมูล</div>';
    return;
  }

  listEl.innerHTML = worksheets.map((ws, index) => `
    <div class="worksheet-item" onclick="selectWorksheet(${index})" data-index="${index}">
      <div class="worksheet-item__docno">${ws.worksheetNo || ws.docNo || '-'}</div>
      <div class="worksheet-item__meta">${ws.building || '-'} • ${formatDateDMY(ws.samplingDate) || '-'}</div>
    </div>
  `).join('');
}

// ============================================
// SELECT WORKSHEET
// ============================================
async function selectWorksheet(index) {
  const summary = worksheets[index];
  if (!summary) return;
  selectedData = null;
  document.getElementById('btnPreview').disabled = true;
  document.getElementById('btnPreviewPdf').disabled = true;
  document.getElementById('btnPrintPdf').disabled = true;
  try {
    const response = await fetch(`${AIR_PRINT_CONFIG.SCRIPT_URL}?action=get&workflow=em-air&recordKey=${encodeURIComponent(summary.recordKey || summary.worksheetNo || summary.docNo)}`);
    if (!response.ok) throw new Error(`Worksheet detail failed (${response.status})`);
    const result = await response.json();
    if (!result || result.success !== true || !result.data || !result.data.record || !Array.isArray(result.data.samples)) {
      throw new Error('Worksheet detail returned an invalid response');
    }
    selectedData = { ...summary, ...result.data.record, samples: result.data.samples };
  } catch (error) {
    console.warn('Load worksheet detail failed:', error);
    document.querySelectorAll('.worksheet-item').forEach((el) => el.classList.remove('active'));
    document.getElementById('selectedInfo').textContent = 'Load failed — select the worksheet again to retry';
    showEmptyState('Unable to load the current worksheet. Select it again to retry.');
    UI.showToast('โหลดรายละเอียด Worksheet ไม่สำเร็จ — กรุณาเลือกอีกครั้งเพื่อลองใหม่', 'error');
    return;
  }

  document.querySelectorAll('.worksheet-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  document.getElementById('selectedInfo').textContent = selectedData.worksheetNo || selectedData.docNo || '-';

  document.getElementById('btnPreview').disabled = false;
  document.getElementById('btnPreviewPdf').disabled = false;
  document.getElementById('btnPrintPdf').disabled = false;

  currentPreviewMode = null;
  currentPdfUrl = null;
  showEmptyState('เลือก Worksheet แล้ว - กด Preview Data หรือ Preview PDF');

  UI.showToast('เลือก Worksheet สำเร็จ', 'success');
}

// ============================================
// STATUS FILTER
// ============================================
function onStatusFilterChange() {
  currentStatus = document.getElementById('statusFilter').value;
  selectedData = null;
  currentPreviewMode = null;

  document.getElementById('btnPreview').disabled = true;
  document.getElementById('btnPreviewPdf').disabled = true;
  document.getElementById('btnPrintPdf').disabled = true;
  document.getElementById('selectedInfo').textContent = 'เลือก Worksheet';

  showEmptyState();
  loadWorksheets();
}

// ============================================
// CLEAR CACHE
// ============================================
function clearCache() {
  if (confirm('ล้าง Cache และโหลดข้อมูลใหม่?')) {
    UI.showToast('ล้าง Cache สำเร็จ กำลังโหลดใหม่...', 'success');
    setTimeout(() => window.location.reload(), 1000);
  }
}

// ============================================
// SHOW EMPTY STATE
// ============================================
function showEmptyState(message = 'เลือก Worksheet แล้วกด Preview Data') {
  const container = document.getElementById('pdfViewerContent');
  container.innerHTML = `
    <div class="pdf-viewer__placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p>${message}</p>
    </div>
  `;
  document.querySelector('.pdf-viewer__title').textContent = 'ตัวอย่างข้อมูล';
}

// ============================================
// PREVIEW DATA
// ============================================
function previewData() {
  if (!selectedData) {
    UI.showToast('กรุณาเลือก Worksheet ก่อน', 'warning');
    return;
  }

  currentPreviewMode = 'data';
  document.querySelector('.pdf-viewer__title').textContent = 'ตัวอย่างข้อมูล';

  const samples = parseSamples(selectedData);
  // Derive floor from first sample if not at record level
  if (!selectedData.floor && samples.length > 0) {
    selectedData.floor = samples[0].floor || '';
  }

  const html = `
    <div style="width: 100%; max-width: 900px;">
      ${generateEMDocInfoHTML(selectedData)}
      ${generateEMMediaHTML(selectedData)}
      ${generateEMSamplesTableHTML(samples)}
    </div>
  `;

  const container = document.getElementById('pdfViewerContent');
  container.innerHTML = html;
  container.classList.remove('preview-pdf-mode');

  UI.showToast('โหลดข้อมูลสำเร็จ', 'success');
}



// ============================================
// PREVIEW PDF
// ============================================
async function previewPdf() {
  if (!selectedData) { UI.showToast('กรุณาเลือก Worksheet ก่อน', 'warning'); return; }
  if (!await checkServerReady()) { UI.showToast('PDF Server ไม่พร้อม - กรุณารัน START-SERVER.bat', 'error'); return; }
  const worksheetNo = selectedData.worksheetNo || selectedData.docNo;
  UI.showLoading('กำลังตรวจสอบ PDF...');
  try {
    const cacheResult = await (await fetch(
      PRINT_CONFIG.SERVER_URL + '/api/check-pdf?worksheetNo=' + encodeURIComponent(worksheetNo) + '&formType=' + FOLDER_NAME
    )).json();
    let files;
    if (cacheResult.exists) {
      UI.hideLoading();
      if (!confirm(`พบ PDF ที่สร้างไว้แล้ว (${cacheResult.pages.length} ชุด)
OK = สร้างใหม่  |  Cancel = ใช้ไฟล์เดิม`)) {
        UI.showLoading('กำลังโหลด PDF...');
        files = await Promise.all(cacheResult.pages.map(async function(pk) {
          const r = await fetch(PRINT_CONFIG.SERVER_URL + '/api/get-cached-pdf?worksheetNo=' + encodeURIComponent(pk) + '&formType=' + FOLDER_NAME);
          if (!r.ok) throw new Error('โหลด cache ไม่สำเร็จ: ' + pk);
          return { key: pk, url: URL.createObjectURL(await r.blob()) };
        }));
      }
    }
    if (!files) {
      UI.showLoading('กำลังสร้าง PDF...');
      files = await generatePdfFiles(
        { worksheetNo: worksheetNo, templateName: TEMPLATE_NAME, formType: FOLDER_NAME },
        parseSamples(selectedData),
        function(ps) { return mapDataToTags(selectedData, ps); },
        SAMPLES_PER_PAGE
      );
    }
    currentPreviewMode = 'pdf'; currentPdfUrl = files[0].url;
    renderPdfViewer(files);
    UI.hideLoading();
    UI.showToast('สร้าง PDF สำเร็จ (' + files.length + ' ชุด)', 'success');
  } catch (e) { UI.hideLoading(); UI.showToast(e.message || 'เกิดข้อผิดพลาด', 'error'); }
}

// ============================================
// PRINT PDF (Save to Desktop)
// ============================================
async function printPdf() {
  if (!selectedData) { UI.showToast('กรุณาเลือก Worksheet ก่อน', 'warning'); return; }
  if (!await checkServerReady()) { UI.showToast('PDF Server ไม่พร้อม - กรุณารัน START-SERVER.bat', 'error'); return; }
  const worksheetNo = selectedData.worksheetNo || selectedData.docNo;
  UI.showLoading('กำลังตรวจสอบ PDF...');
  try {
    const cacheResult = await (await fetch(
      PRINT_CONFIG.SERVER_URL + '/api/check-pdf?worksheetNo=' + encodeURIComponent(worksheetNo) + '&formType=' + FOLDER_NAME
    )).json();
    let pageKeys;
    if (cacheResult.exists) {
      UI.hideLoading();
      if (!confirm(`พบ PDF ที่สร้างไว้แล้ว (${cacheResult.pages.length} ชุด)\nOK = สร้างใหม่  |  Cancel = ใช้ไฟล์เดิม`)) {
        pageKeys = cacheResult.pages;
      }
    }
    if (!pageKeys) {
      UI.showLoading('กำลังสร้าง PDF...');
      const files = await generatePdfFiles(
        { worksheetNo: worksheetNo, templateName: TEMPLATE_NAME, formType: FOLDER_NAME },
        parseSamples(selectedData),
        function(ps) { return mapDataToTags(selectedData, ps); },
        SAMPLES_PER_PAGE
      );
      pageKeys = files.map(function(f) { return f.key; });
    }
    UI.hideLoading();
    const owResult = await checkDesktopOverwrite(worksheetNo, FOLDER_NAME, pageKeys);
    if (!owResult.proceed) {
      UI.showToast('ยกเลิก — ไฟล์เดิมบน Desktop ยังคงอยู่', 'info');
      return;
    }
    UI.showLoading('กำลังบันทึก PDF...');
    for (var i = 0; i < pageKeys.length; i++) {
      var r = await savePdfToDesktop(pageKeys[i], FOLDER_NAME);
      if (!r.success) throw new Error(r.error || 'บันทึกไม่สำเร็จ: ' + pageKeys[i]);
    }
    UI.hideLoading();
    UI.showToast('บันทึก PDF สำเร็จ (' + pageKeys.length + ' ชุด): ' + worksheetNo, 'success');
  } catch (e) { UI.hideLoading(); UI.showToast(e.message || 'เกิดข้อผิดพลาด', 'error'); }
}

// ============================================
// MAP DATA TO TEMPLATE TAGS (EM)
// ============================================
function mapDataToTags(data, pageSamples) {
  const json = {};

  // Header info (same for all pages)
  json.docNo = data.docNo || '';
  json.building = data.building || '';

  // floor: derive from first sample if not at record level
  const samples = pageSamples || parseSamples(data);
  json.floor = data.floor || (samples.length > 0 ? (samples[0].floor || '') : '');

  json.samplingDate = formatDateDMY(data.samplingDate) || '';
  json.performedDate = formatDateDMY(data.performedDate) || '';
  json.incNo = stripApostrophe(data.incNo) || '';
  json.lotMedia = stripApostrophe(data.lotMedia) || '';
  json.mfgMedia = ensureDateFieldString(data.mfgMedia);
  json.expMedia = ensureDateFieldString(data.expMedia);
  json.temp = data.temp || '';
  json.determinedDate = formatDateDMY(data.determinedDate) || '';
  json.concludedDate = formatDateDMY(data.concludedDate) || '';
  json.approvedDate = formatDateDMY(data.approvedDate) || '';

  // Samples (max 50 per page) — already resolved above for floor extraction

  for (let i = 1; i <= 50; i++) {
    const idx = String(i).padStart(2, '0');
    const sample = samples[i - 1];

    if (sample) {
      json[`roomNo${idx}`]      = sample.samplingPoint || '';
      json[`grade${idx}`]       = sample.grade || '';
      json[`tempRoom${idx}`]    = formatMeasurementValue(sample.tempRoom);
      json[`rhRoom${idx}`]      = formatMeasurementValue(sample.rhRoom);
      json[`timeIn${idx}`]      = sample.timeIn || 'N/A';
      json[`timeOut${idx}`]     = sample.timeOut || 'N/A';
      json[`occurResult${idx}`] = formatResultValue(sample.occurResult);
      json[`remark${idx}`]      = sample.remark || 'N/A';
    } else {
      json[`roomNo${idx}`]      = '';
      json[`grade${idx}`]       = '';
      json[`tempRoom${idx}`]    = '';
      json[`rhRoom${idx}`]      = '';
      json[`timeIn${idx}`]      = '';
      json[`timeOut${idx}`]     = '';
      json[`occurResult${idx}`] = '';
      json[`remark${idx}`]      = '';
    }
  }

  return json;
}

// ============================================
// HTML PREVIEW GENERATORS
// ============================================
function generateEMDocInfoHTML(data) {
  return `
    <section class="preview-section">
      <div class="preview-section__header">Document Information</div>
      <div class="preview-grid preview-grid--4">
        <div class="preview-field">
          <div class="preview-field__label">Document No.</div>
          <div class="preview-field__value preview-field__value--mono">${data.docNo || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Building</div>
          <div class="preview-field__value">${data.building || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Floor</div>
          <div class="preview-field__value">${data.floor || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Status</div>
          <div class="preview-field__value">${data.recordStatus || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Room Temp</div>
          <div class="preview-field__value">${data.temp || '-'} °C</div>
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
          <div class="preview-field__label">Incubator No.</div>
          <div class="preview-field__value">${data.incNo || '-'}</div>
        </div>
      </div>
    </section>
  `;
}

function generateEMMediaHTML(data) {
  return `
    <section class="preview-section">
      <div class="preview-section__header">Media Information</div>
      <div class="preview-grid preview-grid--4">
        <div class="preview-field">
          <div class="preview-field__label">Lot Media</div>
          <div class="preview-field__value">${data.lotMedia || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Mfg Media</div>
          <div class="preview-field__value">${ensureDateFieldString(data.mfgMedia) || '-'}</div>
        </div>
        <div class="preview-field">
          <div class="preview-field__label">Exp Media</div>
          <div class="preview-field__value">${ensureDateFieldString(data.expMedia) || '-'}</div>
        </div>
      </div>
    </section>
  `;
}

function generateEMSamplesTableHTML(samples) {
  const rows = samples.length > 0
    ? samples.map((s, i) => `
        <tr>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--muted">${i + 1}</td>
          <td class="preview-table__cell preview-table__cell--bold">${s.samplingPoint || '-'}</td>
          <td class="preview-table__cell">${s.location || '-'}</td>
          <td class="preview-table__cell">${s.grade || '-'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.tempRoom || '-'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.rhRoom || '-'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.timeIn || 'N/A'}</td>
          <td class="preview-table__cell preview-table__cell--center">${s.timeOut || 'N/A'}</td>
          <td class="preview-table__cell preview-table__cell--center preview-table__cell--bold">${s.occurResult || '-'}</td>
          <td class="preview-table__cell">${s.remark || 'N/A'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="10" class="preview-table__cell preview-table__cell--empty">No sampling data</td></tr>';

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
              <th class="preview-table__th">Room No.</th>
              <th class="preview-table__th">Location</th>
              <th class="preview-table__th">Grade</th>
              <th class="preview-table__th preview-table__th--center">Temp</th>
              <th class="preview-table__th preview-table__th--center">RH</th>
              <th class="preview-table__th preview-table__th--center">Time In</th>
              <th class="preview-table__th preview-table__th--center">Time Out</th>
              <th class="preview-table__th preview-table__th--center">Result</th>
              <th class="preview-table__th">Remark</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}
