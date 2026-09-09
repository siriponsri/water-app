/**
 * ============================================
 * WATER RECORD APP - Print WFI/PUS
 * ============================================
 * Version: 4.2.0
 * Uses: print-utils.js for shared functions
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================
const FORM_TYPE = 'WFI-PUS';
const TEMPLATE_NAME = 'wfi-pus-template.docx';
const FOLDER_NAME = 'wfi-pus';
const SAMPLES_PER_PAGE = 30;

// Sheet names by status
const SHEET_NAMES = {
  'Routine': 'records_wfi',
  'PQ1-2': 'records_wfi_pq'
};

// ============================================
// STATE
// ============================================
let worksheets = [];
let selectedData = null;
let currentStatus = 'Routine';
let currentPreviewMode = null; // 'data' or 'pdf'
let currentPdfUrl = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check login
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('usernameDisplay').textContent = username;
  
  // Check PDF server
  checkPdfServer();
  
  // Load worksheets
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
// LOAD WORKSHEETS FROM GOOGLE SHEET
// ============================================
async function loadWorksheets() {
  const listEl = document.getElementById('worksheetList');
  listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">กำลังโหลด...</div>';
  
  try {
    const sheetName = SHEET_NAMES[currentStatus] || 'records_wfi';
    
    // Use GET request with query params (same as sync.js)
    const url = `${SYNC_CONFIG.SCRIPT_URL}?action=getRecords&sheetName=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    
    const result = await response.json();
    
    if (result.success && result.data) {
      worksheets = result.data.sort((a, b) => {
        // Parse dates safely to avoid timezone issues
        const dateA = a.samplingDate ? new Date(a.samplingDate + 'T12:00:00') : new Date(0);
        const dateB = b.samplingDate ? new Date(b.samplingDate + 'T12:00:00') : new Date(0);
        return dateB - dateA;
      });
      
      renderWorksheetList();
    } else {
      listEl.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: var(--space-4);">ไม่พบข้อมูล</div>';
    }
  } catch (e) {
    console.error('Load worksheets error:', e);
    listEl.innerHTML = '<div style="text-align: center; color: var(--error); padding: var(--space-4);">โหลดข้อมูลไม่สำเร็จ</div>';
  }
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
function selectWorksheet(index) {
  selectedData = worksheets[index];
  
  // Update UI
  document.querySelectorAll('.worksheet-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  
  // Update info
  document.getElementById('selectedInfo').textContent = selectedData.worksheetNo || selectedData.docNo || '-';
  
  // Enable buttons
  document.getElementById('btnPreview').disabled = false;
  document.getElementById('btnPreviewPdf').disabled = false;
  document.getElementById('btnPrintPdf').disabled = false;
  
  // Clear preview
  currentPreviewMode = null;
  currentPdfUrl = null;
  showEmptyState('เลือก Worksheet แล้ว - กด Preview Data หรือ Preview PDF');
  
  UI.showToast('เลือก Worksheet สำเร็จ', 'success');
}

// ============================================
// STATUS FILTER CHANGE
// ============================================
function onStatusFilterChange() {
  currentStatus = document.getElementById('statusFilter').value;
  selectedData = null;
  currentPreviewMode = null;
  
  // Disable buttons
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
    // Clear IndexedDB
    if (typeof waterDB !== 'undefined' && waterDB.clearAll) {
      waterDB.clearAll();
    }
    
    // Clear local storage
    localStorage.clear();
    
    // Reload page
    UI.showToast('ล้าง Cache สำเร็จ กำลังโหลดใหม่...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
  
  // Update header
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
  
  // Update header
  document.querySelector('.pdf-viewer__title').textContent = 'ตัวอย่างข้อมูล';
  
  // Parse samples
  const samples = parseSamples(selectedData);
  
  // Build HTML
  const html = `
    <div style="width: 100%; max-width: 900px;">
      ${generateDocInfoHTML(selectedData)}
      ${generateQCHTML_WFI(selectedData)}
      ${generateSamplesTableHTML_Single(samples)}
    </div>
  `;
  
  const container = document.getElementById('pdfViewerContent');
  container.innerHTML = html;
  container.classList.remove('preview-pdf-mode');
  container.classList.add('preview-data-mode');
  
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
// MAP DATA TO TEMPLATE TAGS
// ============================================
function mapDataToTags(data, pageSamples) {
  const json = {};

  json.docNo = data.docNo || data.worksheetNo || '';
  json.building = data.building || '';
  json.samplingDate = formatDateDMY(data.samplingDate) || '';
  json.performedDate = formatDateDMY(data.performedDate) || '';
  json.temp = data.temp || '';
  json.incNo = stripApostrophe(data.incNo) || '';

  json.rightHand = data.rightHand || '';
  json.leftHand = data.leftHand || '';
  json.rightEm = data.rightEM || data.rightEm || '';
  json.leftEm = data.leftEM || data.leftEm || '';
  json.negativeValue = data.negativeValue || '';

  json.lotMembrane = stripApostrophe(data.lotMembrane);
  json.lotForceps = stripApostrophe(data.lotForceps);
  json.lotBuffer = stripApostrophe(data.lotBuffer);
  json.lotTSA = stripApostrophe(data.lotTSA);

  json.determinedDate = formatDateDMY(data.determinedDate) || '';
  json.concludedDate = formatDateDMY(data.concludedDate) || '';
  json.approvedDate = formatDateDMY(data.approvedDate) || '';
  json.comment = data.comment || '';

  const samples = pageSamples || parseSamples(data);

  for (let i = 1; i <= SAMPLES_PER_PAGE; i++) {
    const idx = String(i).padStart(2, '0');
    const s = samples[i - 1];
    json[`samplingPoint${idx}`] = s ? (s.samplingPoint || '') : '';
    json[`tagNo${idx}`]         = s ? (s.samplingTag   || '') : '';
    json[`result${idx}`]        = s && s.result !== undefined ? String(s.result) : '';
  }

  return json;
}
