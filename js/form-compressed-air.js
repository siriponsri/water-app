/**
 * ============================================
 * AIR RECORD APP - Compressed Air Form Logic
 * ============================================
 * Version: 1.0.0
 * Dependencies: utils.js, db.js, sync.js, form-utils.js
 * 
 * Sheet: records_ca (20 cols)
 * Database: database_ca (8 cols)
 * Template: ca-template.docx (10 samples/page, max 50)
 * DocNo: AC-YY-XXXX
 * ============================================
 */

// ============================================
// AIR SYNC CONFIG (separate from water)
// ============================================
const AIR_SYNC_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbytoaWepwl0RJLilSvShVBIMIJZ3kYpN4UEynRbdeNTEAlfOHWWkNXJTwe62-Ry_TeB/exec'
};

// ============================================
// Form State
// ============================================
let currentWorksheetNo = null;
let currentDocNo = null;
let samplingPoints = [];
window.samplingPoints = samplingPoints;
let sampleRows = [];
let nextRowId = 1;
let currentStatus = 'Routine';
let currentMediaType = 'tsa'; // 'tsa' or 'other'

const MAX_SAMPLE_ROWS = 50;

// Buildings from database_ca
const CA_BUILDINGS = [
  { value: 'Building 10', label: 'Building 10' },
  { value: 'Building 11', label: 'Building 11' },
  { value: 'Building 12', label: 'Building 12' },
  { value: 'Building 16', label: 'Building 16' }
];

// ============================================
// Initialize Form
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Compressed Air Form...');

  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('usernameDisplay').textContent = username;

  // Load saved Air Script URL
  const savedUrl = Storage.get('air_script_url');
  if (savedUrl) {
    AIR_SYNC_CONFIG.SCRIPT_URL = savedUrl;
  }

  await initDatabase();
  loadBuildingDropdown();

  document.getElementById('recordStatus').value = 'Routine';
  currentStatus = 'Routine';

  setupDateAutoFill();
  setMediaType('tsa');

  for (let i = 0; i < 10; i++) {
    addSampleRow();
  }

  setupPasteHandler();
  await fetchNextDocNoFromSheet();

  console.log('Form initialized');
});

// ============================================
// Initialize Database
// ============================================
async function initDatabase() {
  try {
    await waterDB.init();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('Database init error:', error);
  }
}

// ============================================
// Load Master Data
// ============================================
async function loadMasterDataFromSource(building) {
  console.log('🔄 Loading CA master data for:', building);

  try {
    if (AIR_SYNC_CONFIG.SCRIPT_URL) {
      const response = await fetch(`${AIR_SYNC_CONFIG.SCRIPT_URL}?action=getMasterData&sheetName=database_ca`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Filter by building
        const filtered = building
          ? result.data.filter(d => d.building === building)
          : result.data;
        samplingPoints = filtered;
        window.samplingPoints = samplingPoints;
        console.log(`✅ Loaded ${filtered.length} CA sampling points from API`);
        return;
      }
    }
  } catch (error) {
    console.warn('API fetch failed:', error.message);
  }

  // Fallback: try local DB
  try {
    const points = await waterDB.getMasterDataByBuilding(building);
    samplingPoints = points;
    window.samplingPoints = samplingPoints;
    console.log(`✅ Loaded ${points.length} CA sampling points from local DB`);
  } catch (error) {
    console.warn('Local DB load failed:', error.message);
    samplingPoints = [];
    window.samplingPoints = samplingPoints;
  }
}

// ============================================
// Building Dropdown (single-select)
// ============================================
function loadBuildingDropdown() {
  const select = document.getElementById('building');
  select.innerHTML = '<option value="">-- เลือก --</option>';

  CA_BUILDINGS.forEach(b => {
    const option = document.createElement('option');
    option.value = b.value;
    option.textContent = b.label;
    select.appendChild(option);
  });
}

async function onBuildingChange() {
  const building = document.getElementById('building').value;

  if (!building) {
    samplingPoints = [];
    window.samplingPoints = samplingPoints;
    updateSamplingPointDropdowns();
    return;
  }

  await loadMasterDataFromSource(building);
  updateSamplingPointDropdowns();
}

// ============================================
// Update All Sampling Point Dropdowns
// ============================================
function updateSamplingPointDropdowns() {
  const selects = document.querySelectorAll('.sampling-point-select');

  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- เลือก --</option>';

    samplingPoints.forEach(point => {
      const option = document.createElement('option');
      option.value = point.samplingLabel || point.samplingPoint;
      option.textContent = point.samplingLabel || point.samplingPoint;
      select.appendChild(option);
    });

    if (currentValue && samplingPoints.some(p => (p.samplingLabel || p.samplingPoint) === currentValue)) {
      select.value = currentValue;
    }
  });
}

// ============================================
// Date Auto-Fill (Air: performed = sampling, dates = sampling+3)
// ============================================
function setupDateAutoFill() {
  const samplingDateInput = document.getElementById('samplingDate');
  const today = DateUtils.today();
  samplingDateInput.value = today;

  samplingDateInput.addEventListener('change', (e) => {
    updateDerivedDates(e.target.value);
  });

  updateDerivedDates(today);
}

function updateDerivedDates(samplingDate) {
  if (!samplingDate) return;

  const [year, month, day] = samplingDate.split('-').map(Number);
  const samplingDateObj = new Date(year, month - 1, day);

  // Performed Date = Sampling Date (same day for air)
  document.getElementById('performedDate').value = formatDateForInput(samplingDateObj);

  // Determined, Concluded, Approved = Sampling + 3
  const plus3 = new Date(samplingDateObj);
  plus3.setDate(plus3.getDate() + 3);
  const plus3Str = formatDateForInput(plus3);

  document.getElementById('determinedDate').value = plus3Str;
  document.getElementById('concludedDate').value = plus3Str;
  document.getElementById('approvedDate').value = plus3Str;
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================
// Media Type Toggle (TSA / Other)
// ============================================
function setMediaType(type) {
  currentMediaType = type;

  const btnTSA = document.getElementById('btnUseTSA');
  const btnOther = document.getElementById('btnUseOther');
  const lotTSAGroup = document.getElementById('lotTSAGroup');
  const lotOtherGroup = document.getElementById('lotOtherGroup');

  if (type === 'tsa') {
    btnTSA.classList.add('toggle-btn--active');
    btnOther.classList.remove('toggle-btn--active');
    lotTSAGroup.style.display = '';
    lotOtherGroup.style.display = 'none';
    document.getElementById('lotOther').value = 'N/A';
  } else {
    btnTSA.classList.remove('toggle-btn--active');
    btnOther.classList.add('toggle-btn--active');
    lotTSAGroup.style.display = 'none';
    lotOtherGroup.style.display = '';
    document.getElementById('lotTSA').value = 'N/A';
  }
}

// ============================================
// Status Change
// ============================================
async function onStatusChange() {
  const status = document.getElementById('recordStatus').value;
  currentStatus = status;

  clearAllSampleRows();
  for (let i = 0; i < 10; i++) {
    addSampleRow();
  }

  currentWorksheetNo = null;
  currentDocNo = null;
  await fetchNextDocNoFromSheet();

  console.log('✅ Status changed to:', currentStatus);
}

// ============================================
// Fetch Next DocNo from Sheet (AC-YY-XXXX)
// ============================================
async function fetchNextDocNoFromSheet() {
  document.getElementById('worksheetNoDisplay').textContent = 'Worksheet: กำลังโหลด...';
  document.getElementById('docNo').value = '';

  try {
    if (AIR_SYNC_CONFIG.SCRIPT_URL) {
      const url = `${AIR_SYNC_CONFIG.SCRIPT_URL}?action=getNextDocNo&status=${encodeURIComponent(currentStatus)}&formType=CA`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data) {
        const { nextDocNo } = result.data;
        currentWorksheetNo = nextDocNo;
        currentDocNo = nextDocNo;
        document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${nextDocNo}`;
        document.getElementById('docNo').value = nextDocNo;
        console.log(`✅ Next DocNo from Sheet: ${nextDocNo}`);
        return;
      }
    }
  } catch (error) {
    console.warn('Fetch next DocNo error:', error.message);
  }

  // Fallback
  await generateLocalDocNo();
}

async function generateLocalDocNo() {
  const year = DateUtils.getCurrentYear2Digit();
  const storeKey = `lastSeq_AC_${year}`;
  const storedSeq = Storage.get(storeKey) || 0;
  const nextSeq = storedSeq + 1;

  const docNo = `AC-${year}-${String(nextSeq).padStart(4, '0')}`;
  currentWorksheetNo = docNo;
  currentDocNo = docNo;

  Storage.set(storeKey, nextSeq);

  document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${docNo}`;
  document.getElementById('docNo').value = docNo;
  console.log(`Generated local DocNo: ${docNo}`);
}

// ============================================
// Paste Handler
// ============================================
const CA_COLUMN_PREFIXES = ['temp-', 'rh-', 'result-', 'remark-'];

function setupPasteHandler() {
  const tbody = document.getElementById('samplingTableBody');
  if (!tbody) return;
  tbody.addEventListener('paste', handlePasteFromExcel);
  console.log('✅ Paste handler setup complete');
}

function handleColumnPaste(e) {
  const target = e.target;
  if (!target || target.tagName !== 'INPUT') return false;

  const id = target.id || '';
  const prefix = CA_COLUMN_PREFIXES.find(p => id.startsWith(p));
  if (!prefix) return false;

  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedText = clipboardData.getData('text');
  if (!pastedText) return false;

  const values = pastedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (values.length <= 1) return false;

  e.preventDefault();

  // Find starting row index
  const currentRowId = id.replace(prefix, '');
  const startIdx = sampleRows.indexOf(Number(currentRowId));
  if (startIdx === -1) return true;

  let filled = 0;
  for (let i = 0; i < values.length && (startIdx + i) < sampleRows.length; i++) {
    const rowId = sampleRows[startIdx + i];
    const el = document.getElementById(`${prefix}${rowId}`);
    if (el) { el.value = values[i]; filled++; }
  }

  UI.showToast(`📋 Paste ${filled} ค่าลงคอลัมน์ ${prefix.replace('-', '')}`, 'success');
  return true;
}

async function handlePasteFromExcel(e) {
  // Try column paste first
  if (handleColumnPaste(e)) return;

  const target = e.target;
  const isInTable = target.closest('#samplingTableBody');
  if (!isInTable) return;

  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedText = clipboardData.getData('text');
  if (!pastedText) return;

  const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 1 && !pastedText.includes('\t')) return;

  e.preventDefault();

  const parsedData = lines.map(line => {
    const cols = line.split('\t').map(c => c.trim());
    return {
      samplingPoint: cols[0] || '',
      temp: cols[1] || '',
      rh: cols[2] || '',
      result: cols[3] || ''
    };
  });

  console.log(`📋 Pasted ${parsedData.length} rows from Excel`);

  if (parsedData.length > MAX_SAMPLE_ROWS) {
    UI.showModal({
      title: '⚠️ ข้อมูลเกินกำหนด',
      message: `คุณวางข้อมูล ${parsedData.length} รายการ แต่ระบบรองรับสูงสุด ${MAX_SAMPLE_ROWS} รายการ\nระบบจะนำเข้าเฉพาะ ${MAX_SAMPLE_ROWS} รายการแรก`,
      type: 'warning',
      onConfirm: () => processPastedData(parsedData.slice(0, MAX_SAMPLE_ROWS))
    });
    return;
  }

  await processPastedData(parsedData);
}

async function processPastedData(pastedRows) {
  const building = document.getElementById('building').value;
  if (!building || samplingPoints.length === 0) {
    UI.showModal({
      title: '⚠️ กรุณาเลือก Building ก่อน',
      message: 'กรุณาเลือก Building เพื่อให้ระบบโหลดรายการ Sampling Points\n\nหลังจากเลือก Building แล้ว ลอง Paste ใหม่อีกครั้ง',
      type: 'warning'
    });
    return;
  }

  const targetRowCount = pastedRows.length;
  const currentRowCount = sampleRows.length;

  // Adjust rows
  if (targetRowCount > currentRowCount) {
    for (let i = 0; i < targetRowCount - currentRowCount; i++) addSampleRow();
  } else if (targetRowCount < currentRowCount) {
    for (let i = 0; i < currentRowCount - targetRowCount; i++) {
      removeSampleRowSilent(sampleRows[sampleRows.length - 1]);
    }
  }

  let matchedCount = 0;
  let notFoundList = [];

  for (let i = 0; i < pastedRows.length; i++) {
    const pastedRow = pastedRows[i];
    const rowId = sampleRows[i];
    if (!rowId) continue;

    const pointValue = pastedRow.samplingPoint;

    // Try text input first (paste mode), then select (dropdown mode)
    const textInput = document.getElementById(`point-paste-${rowId}`) ||
                      document.querySelector(`#row-${rowId} .sampling-point-input`);
    const select = document.querySelector(`#row-${rowId} .sampling-point-select`);

    if (textInput) {
      if (pointValue) {
        textInput.value = pointValue;
        handlePasteInputChange(textInput, String(rowId));
        matchedCount++;
      }
    } else if (select && pointValue) {
      const opts = Array.from(select.options).map(o => o.value).filter(v => v);
      const exactMatch = opts.find(o => o === pointValue);
      const caseMatch = opts.find(o => o.toLowerCase() === pointValue.toLowerCase());
      const partialMatch = opts.find(o => o.toLowerCase().includes(pointValue.toLowerCase()));

      if (exactMatch) { select.value = exactMatch; onSamplingPointChange(select, String(rowId)); matchedCount++; }
      else if (caseMatch) { select.value = caseMatch; onSamplingPointChange(select, String(rowId)); matchedCount++; }
      else if (partialMatch) { select.value = partialMatch; onSamplingPointChange(select, String(rowId)); matchedCount++; }
      else { notFoundList.push(pointValue); }
    }

    // Set temp, rh, result
    if (pastedRow.temp) {
      const el = document.getElementById(`temp-${rowId}`);
      if (el) el.value = pastedRow.temp;
    }
    if (pastedRow.rh) {
      const el = document.getElementById(`rh-${rowId}`);
      if (el) el.value = pastedRow.rh;
    }
    if (pastedRow.result) {
      const el = document.getElementById(`result-${rowId}`);
      if (el) el.value = pastedRow.result;
    }
  }

  if (notFoundList.length > 0) {
    UI.showModal({
      title: '⚠️ บาง Sampling Point ไม่พบในระบบ',
      message: `นำเข้าสำเร็จ ${matchedCount} รายการ\n\nไม่พบ ${notFoundList.length} รายการ:\n• ${notFoundList.slice(0, 10).join('\n• ')}`,
      type: 'warning'
    });
  } else if (matchedCount > 0) {
    UI.showToast(`✅ นำเข้า ${matchedCount} รายการสำเร็จ`, 'success');
  }
}

function removeSampleRowSilent(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (row) {
    row.remove();
    sampleRows = sampleRows.filter(id => id !== rowId);
  }
}

// ============================================
// Add Sample Row
// ============================================
function addSampleRow() {
  if (sampleRows.length >= MAX_SAMPLE_ROWS) {
    UI.showToast(`สูงสุด ${MAX_SAMPLE_ROWS} แถว`, 'warning');
    return;
  }

  const tbody = document.getElementById('samplingTableBody');
  const rowId = nextRowId++;
  const displayNum = sampleRows.length + 1;
  const isPasteMode = typeof window.currentInputMode !== 'undefined' && window.currentInputMode === 'paste';

  const row = document.createElement('tr');
  row.id = `row-${rowId}`;
  row.dataset.rowId = rowId;

  if (isPasteMode) {
    row.innerHTML = `
      <td class="row-number">${displayNum}</td>
      <td class="col-point">
        <input type="text" id="point-paste-${rowId}" class="sampling-point-input"
               placeholder="Paste หรือพิมพ์ Room No."
               onchange="handlePasteInputChange(this, '${rowId}')"
               style="width: 100%; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-md);">
      </td>
      <td class="col-location"><div class="info-display" id="location-${rowId}">-</div></td>
      <td><span class="info-display" id="grade-${rowId}">-</span></td>
      <td><input type="number" step="0.1" id="temp-${rowId}" value="20.0" style="width: 60px;"></td>
      <td><input type="number" step="0.1" id="rh-${rowId}" value="45.0" style="width: 60px;"></td>
      <td><input type="text" id="result-${rowId}" value="" placeholder="CFU" class="result-input" style="width: 60px;"></td>
      <td><input type="text" id="remark-${rowId}" value="N/A" style="width: 70px; font-size:0.8rem;"></td>
      <td>
        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${rowId})" title="ลบแถว">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </td>
    `;
  } else {
    row.innerHTML = `
      <td class="row-number">${displayNum}</td>
      <td class="col-point">
        <select class="sampling-point-select" onchange="onSamplingPointChange(this, '${rowId}')">
          <option value="">-- เลือก --</option>
          ${samplingPoints.map(p => `<option value="${p.samplingLabel || p.samplingPoint}">${p.samplingLabel || p.samplingPoint}</option>`).join('')}
        </select>
      </td>
      <td class="col-location"><div class="info-display" id="location-${rowId}">-</div></td>
      <td><span class="info-display" id="grade-${rowId}">-</span></td>
      <td><input type="number" step="0.1" id="temp-${rowId}" value="20.0" style="width: 60px;"></td>
      <td><input type="number" step="0.1" id="rh-${rowId}" value="45.0" style="width: 60px;"></td>
      <td><input type="text" id="result-${rowId}" value="" placeholder="CFU" class="result-input" style="width: 60px;"></td>
      <td><input type="text" id="remark-${rowId}" value="N/A" style="width: 70px; font-size:0.8rem;"></td>
      <td>
        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${rowId})" title="ลบแถว">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </td>
    `;
  }

  tbody.appendChild(row);
  sampleRows.push(rowId);

  if (typeof applyBlankPrintModeToNewRows === 'function') {
    applyBlankPrintModeToNewRows();
  }
}

// ============================================
// Remove Sample Row
// ============================================
function removeSampleRow(rowId) {
  if (sampleRows.length <= 1) {
    UI.showToast('ต้องมีอย่างน้อย 1 แถว', 'warning');
    return;
  }
  const row = document.getElementById(`row-${rowId}`);
  if (row) {
    row.remove();
    sampleRows = sampleRows.filter(id => id !== rowId);
    renumberRows();
  }
}

function clearAllSampleRows() {
  document.getElementById('samplingTableBody').innerHTML = '';
  sampleRows = [];
  nextRowId = 1;
}

function renumberRows() {
  const rows = document.getElementById('samplingTableBody').querySelectorAll('tr');
  rows.forEach((row, i) => {
    const cell = row.querySelector('.row-number');
    if (cell) cell.textContent = i + 1;
  });
}

// ============================================
// Sampling Point Change
// ============================================
function checkDuplicateRoomNo(value, currentRowId) {
  if (!value) return false;
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');
  for (const row of rows) {
    const rid = row.dataset.rowId;
    if (String(rid) === String(currentRowId)) continue;
    const select = row.querySelector('.sampling-point-select');
    const textInput = row.querySelector('.sampling-point-input') || document.getElementById(`point-paste-${rid}`);
    const existing = select?.value || textInput?.value?.trim();
    if (existing && existing === value) return true;
  }
  return false;
}

function onSamplingPointChange(selectEl, rowId) {
  const value = selectEl.value;
  const gradeEl = document.getElementById(`grade-${rowId}`);
  const locationEl = document.getElementById(`location-${rowId}`);

  if (!value) {
    if (gradeEl) gradeEl.textContent = '-';
    if (locationEl) locationEl.textContent = '-';
    return;
  }

  if (checkDuplicateRoomNo(value, rowId)) {
    UI.showToast(`⚠️ Room No. "${value}" ซ้ำกับแถวอื่นในตาราง — ตรวจสอบ Master Data ว่าต้องใช้ .1 หรือ .2 หรือไม่`, 'warning');
  }

  const pointData = samplingPoints.find(p => (p.samplingLabel || p.samplingPoint) === value);
  if (pointData) {
    if (gradeEl) gradeEl.textContent = pointData.grade || '-';
    if (locationEl) locationEl.textContent = pointData.location || pointData.noLocation || 'ไม่พบ Location ที่ตรงกับ Room No.';
  } else {
    if (gradeEl) gradeEl.textContent = '-';
    if (locationEl) locationEl.textContent = 'ไม่พบ Location ที่ตรงกับ Room No.';
  }
}

// ============================================
// Collect Form Data
// ============================================
function collectFormData() {
  const blankMode = typeof isBlankPrintModeEnabled === 'function' && isBlankPrintModeEnabled();

  const data = {
    worksheetNo: currentWorksheetNo,
    formType: 'COMPRESSED-AIR',
    recordStatus: document.getElementById('recordStatus').value,
    building: document.getElementById('building').value,
    samplingDate: document.getElementById('samplingDate').value,
    performedDate: document.getElementById('performedDate').value,
    temp: document.getElementById('tempRoom').value,
    incNo: preserveLeadingZeros(document.getElementById('incNo').value),
    lotTSA: currentMediaType === 'tsa' ? preserveLeadingZeros(document.getElementById('lotTSA').value) : 'N/A',
    lotMedia: preserveLeadingZeros(document.getElementById('lotMedia').value),
    lotOther: currentMediaType === 'other' ? preserveLeadingZeros(document.getElementById('lotOther').value) : 'N/A',
    mfgMedia: String(document.getElementById('mfgMedia').value || '').trim(),
    expMedia: String(document.getElementById('expMedia').value || '').trim(),
    determinedDate: document.getElementById('determinedDate').value,
    concludedDate: document.getElementById('concludedDate').value,
    approvedDate: document.getElementById('approvedDate').value,
    docNo: document.getElementById('docNo').value,
    blankPrintMode: blankMode,
    samples: []
  };

  // Collect sampling rows
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');

  rows.forEach((row, index) => {
    const rowId = row.dataset.rowId;

    const select = row.querySelector('.sampling-point-select');
    const textInput = row.querySelector('.sampling-point-input') || document.getElementById(`point-paste-${rowId}`);
    const samplingPoint = select?.value || textInput?.value?.trim();

    if (samplingPoint) {
      const pointData = samplingPoints.find(p =>
        (p.samplingLabel || p.samplingPoint) === samplingPoint ||
        (p.samplingLabel || p.samplingPoint).toLowerCase() === samplingPoint.toLowerCase()
      );

      data.samples.push({
        index: index + 1,
        samplingPoint: samplingPoint,
        noLocation: pointData?.noLocation || '',
        location: pointData?.location || pointData?.noLocation || '',
        samplingTag: pointData?.samplingTag || '',
        grade: pointData?.grade || '',
        airType: pointData?.airType || '',
        temp: document.getElementById(`temp-${rowId}`)?.value || '20.0',
        rh: document.getElementById(`rh-${rowId}`)?.value || '45.0',
        occResult: blankMode ? '' : (document.getElementById(`result-${rowId}`)?.value || ''),
        remark: document.getElementById(`remark-${rowId}`)?.value || 'N/A'
      });
    }
  });

  return data;
}

// ============================================
// Validate Form
// ============================================
async function validateForm() {
  const errors = [];

  if (!document.getElementById('building').value) errors.push('กรุณาเลือก Building');
  if (!document.getElementById('samplingDate').value) errors.push('กรุณาระบุ Sampling Date');
  if (!document.getElementById('performedDate').value) errors.push('กรุณาระบุ Performed Date');

  const docNo = document.getElementById('docNo').value;
  if (!docNo) errors.push('กรุณากรอก Document No.');

  // Check at least one sampling point
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');
  let hasData = false;
  rows.forEach(row => {
    const select = row.querySelector('.sampling-point-select');
    const textInput = row.querySelector('.sampling-point-input');
    if (select?.value || textInput?.value?.trim()) hasData = true;
  });
  if (!hasData) errors.push('กรุณาเลือก Sampling Point อย่างน้อย 1 จุด');

  return errors;
}

// ============================================
// Save Form
// ============================================
async function saveForm() {
  if (!currentWorksheetNo || !currentDocNo) {
    await fetchNextDocNoFromSheet();
    if (!currentWorksheetNo || !currentDocNo) {
      await generateLocalDocNo();
    }
  }

  const errors = await validateForm();
  if (errors.length > 0) {
    UI.showToast(errors[0], 'error');
    return false;
  }

  UI.showLoading('กำลังบันทึก...');

  try {
    const formData = collectFormData();

    // Add metadata
    formData.createdAt = DateUtils.timestamp();
    formData.updatedAt = DateUtils.timestamp();
    formData.createdBy = Storage.get('username') || 'Unknown';

    // Save to IndexedDB
    await waterDB.saveRecord(formData);

    // Push to Google Sheet if online
    if (Network.isOnline() && AIR_SYNC_CONFIG.SCRIPT_URL) {
      try {
        const sheetsData = prepareDataForGoogleSheets(formData);
        const response = await fetch(AIR_SYNC_CONFIG.SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'saveRecord',
            record: sheetsData,
            sheetName: 'records_ca'
          })
        });
        const result = await response.json();
        if (result.success) {
          console.log('✅ Record saved to Google Sheet');
        } else {
          console.warn('⚠️ Failed to save to Sheet:', result.error);
        }
      } catch (syncError) {
        console.warn('⚠️ Could not sync to Sheet:', syncError);
      }
    }

    UI.showToast(`✅ บันทึกสำเร็จ: ${formData.docNo}`, 'success');
    await fetchNextDocNoFromSheet();
    return true;

  } catch (error) {
    console.error('Save error:', error);
    UI.showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error');
    return false;
  } finally {
    UI.hideLoading();
  }
}

// ============================================
// Reset Form
// ============================================
function resetForm() {
  UI.showModal({
    title: 'ยืนยันการล้างฟอร์ม',
    message: 'คุณต้องการล้างข้อมูลทั้งหมดและเริ่มใหม่หรือไม่?',
    type: 'warning',
    onConfirm: async () => {
      document.getElementById('caForm').reset();
      document.getElementById('samplingDate').value = DateUtils.today();
      updateDerivedDates(DateUtils.today());

      clearAllSampleRows();
      for (let i = 0; i < 10; i++) addSampleRow();

      setMediaType('tsa');
      document.getElementById('recordStatus').value = 'Routine';
      currentStatus = 'Routine';
      currentWorksheetNo = null;
      currentDocNo = null;
      await fetchNextDocNoFromSheet();

      UI.showToast('ล้างฟอร์มเรียบร้อย', 'success');
    }
  });
}

// ============================================
// Go to Print Page
// ============================================
function goToPrint() {
  window.location.href = 'print.html';
}
