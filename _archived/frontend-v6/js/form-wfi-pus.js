/**
 * ============================================
 * WATER RECORD APP - WFI/PUS Form Logic
 * ============================================
 * Version: 4.2.0
 * Uses: utils.js for formatResultValue, preserveLeadingZeros
 * ============================================
 */

// ============================================
// Form State
// ============================================
let currentWorksheetNo = null;
let currentDocNo = null;
let samplingPoints = [];
window.samplingPoints = samplingPoints;
let sampleRows = [];
let manualRows = [];
let nextRowId = 1;
let currentStatus = 'Routine';
let currentInputMode = 'dropdown';
window.currentInputMode = currentInputMode;
let isOtherBuilding = false;

const MAX_SAMPLE_ROWS = 30;

// ============================================
// Initialize Form
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing WFI/PUS Form...');

  // Check username
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = username;

  // Initialize database
  await initDatabase();

  // Load master data from API/JSON
  await loadMasterDataFromSource();

  // Set default status
  document.getElementById('recordStatus').value = 'Routine';
  currentStatus = 'Routine';

  // Set default building (Building 16)
  document.getElementById('building').value = 'Building 16';
  await onBuildingChange();

  // Set default dates
  setupDateAutoFill();

  // Initialize with 10 sample rows
  for (let i = 0; i < 10; i++) {
    addSampleRow();
  }

  // Setup paste handler
  setupPasteHandler();

  // Fetch next DocNo from Google Sheet
  await fetchNextDocNoFromSheet();

  console.log('✅ WFI/PUS Form initialized');
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
// Load Master Data from API or JSON
// ============================================
async function loadMasterDataFromSource() {
  console.log('🔄 Loading master data...');
  
  try {
    // Try API first
    const response = await fetch(`${SYNC_CONFIG.SCRIPT_URL}?action=getMasterData&sheetName=database`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      await waterDB.loadMasterData(result.data);
      console.log(`✅ Loaded ${result.data.length} master data records from API`);
      return;
    }
  } catch (error) {
    console.warn('API fetch failed, trying local JSON:', error.message);
  }
  
  // Fallback to local JSON
  try {
    const jsonResponse = await fetch('../data/water-data.json');
    const jsonData = await jsonResponse.json();
    await waterDB.loadMasterData(jsonData);
    console.log(`✅ Loaded ${jsonData.length} master data records from JSON`);
  } catch (error) {
    console.error('Failed to load master data:', error);
    UI.showToast('ไม่สามารถโหลดข้อมูล Sampling Points ได้', 'error');
  }
}

// ============================================
// Setup Date Auto-Fill Logic
// ============================================
function setupDateAutoFill() {
  const samplingDateInput = document.getElementById('samplingDate');
  
  // Set initial date
  const today = DateUtils.today();
  samplingDateInput.value = today;
  updateDerivedDates(today);

  // Listen for changes
  samplingDateInput.addEventListener('change', (e) => {
    updateDerivedDates(e.target.value);
  });
}

function updateDerivedDates(samplingDate) {
  if (!samplingDate) return;

  // Parse date components to avoid timezone issues
  const [year, month, day] = samplingDate.split('-').map(Number);
  const samplingDateObj = new Date(year, month - 1, day);

  // Performed Date = Sampling Date + 1 day
  const performedDate = new Date(samplingDateObj);
  performedDate.setDate(performedDate.getDate() + 1);
  document.getElementById('performedDate').value = formatDateForInput(performedDate);

  // Determined, Concluded, Approved = Sampling Date + 3 days
  const derivedDate = new Date(samplingDateObj);
  derivedDate.setDate(derivedDate.getDate() + 3);
  const derivedDateStr = formatDateForInput(derivedDate);
  
  document.getElementById('determinedDate').value = derivedDateStr;
  document.getElementById('concludedDate').value = derivedDateStr;
  document.getElementById('approvedDate').value = derivedDateStr;
}

function formatDateForInput(date) {
  // Format date to YYYY-MM-DD for input[type="date"]
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// Status Change Handler
// ============================================
async function onStatusChange() {
  currentStatus = document.getElementById('recordStatus').value;
  console.log('Status changed to:', currentStatus);
  await fetchNextDocNoFromSheet();
}

// ============================================
// Building Change Handler
// ============================================
async function onBuildingChange() {
  const building = document.getElementById('building').value;
  isOtherBuilding = (building === 'Other');
  
  const samplingTableContainer = document.getElementById('samplingTableContainer');
  const manualTableContainer = document.getElementById('manualTableContainer');
  const inputModeToggle = document.getElementById('inputModeToggle');
  
  if (isOtherBuilding) {
    // Show manual input table, hide dropdown table
    samplingTableContainer.style.display = 'none';
    manualTableContainer.style.display = 'block';
    inputModeToggle.style.display = 'none';
    
    // Clear and reinit manual rows
    manualRows = [];
    nextRowId = 1;
    document.getElementById('manualTableBody').innerHTML = '';
    for (let i = 0; i < 10; i++) {
      addManualRow();
    }
    
    console.log('✅ Switched to manual input mode (Other building)');
  } else {
    // Show dropdown table, hide manual table
    samplingTableContainer.style.display = 'block';
    manualTableContainer.style.display = 'none';
    inputModeToggle.style.display = 'flex';
    
    // Load sampling points for Building 16 with WFI/PUS filter
    try {
      samplingPoints = await waterDB.getMasterDataByBuildingAndWaterType('Building 16', ['WFI', 'PUS']);
      window.samplingPoints = samplingPoints;
      console.log(`✅ Loaded ${samplingPoints.length} WFI/PUS sampling points for Building 16`);
      
      // Rebuild table to update dropdowns
      rebuildSamplingTable();
    } catch (error) {
      console.error('Error loading sampling points:', error);
      UI.showToast('ไม่สามารถโหลดข้อมูล Sampling Points ได้', 'error');
    }
  }
}

// ============================================
// Fetch Next DocNo from Google Sheet
// ============================================
async function fetchNextDocNoFromSheet() {
  console.log(`🔄 Fetching next DocNo for WFI/PUS status: ${currentStatus}`);

  try {
    // Determine sheet name based on status
    const sheetName = currentStatus === 'Routine' ? 'records_wfi' : 'records_wfi_pq';
    const year = DateUtils.getCurrentYear2Digit();

    const response = await fetch(`${SYNC_CONFIG.SCRIPT_URL}?action=getRecords&sheetName=${sheetName}`);
    const result = await response.json();

    let maxSeq = 0;
    if (result.success && result.data) {
      const records = result.data;
      
      if (currentStatus === 'Routine') {
        // Format: WP-YY-XXXX
        records.forEach(r => {
          const match = r.worksheetNo?.match(/^WP-(\d{2})-(\d{4})$/);
          if (match && match[1] === year) {
            const seq = parseInt(match[2], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        });
      } else {
        // Format: PQ-XXXX (for PQ1-2)
        records.forEach(r => {
          const match = r.worksheetNo?.match(/^PQ-(\d{4})$/);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        });
      }
    }

    // Generate next number
    const nextSeq = maxSeq + 1;
    let worksheetNo, docNo;

    if (currentStatus === 'Routine') {
      worksheetNo = `WP-${year}-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    } else {
      // PQ1-2: PQ-XXXX format
      worksheetNo = `PQ-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    }

    currentWorksheetNo = worksheetNo;
    currentDocNo = docNo;

    document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${worksheetNo}`;
    document.getElementById('docNo').value = docNo;

    console.log(`✅ Generated - Worksheet: ${worksheetNo}, DocNo: ${docNo}`);

  } catch (error) {
    console.error('Error fetching DocNo:', error);
    // Generate offline fallback
    const year = DateUtils.getCurrentYear2Digit();
    const timestamp = Date.now().toString().slice(-4);
    
    if (currentStatus === 'Routine') {
      currentWorksheetNo = `WP-${year}-${timestamp}`;
    } else {
      currentWorksheetNo = `PQ-${timestamp}`;
    }
    currentDocNo = currentWorksheetNo;
    
    document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${currentWorksheetNo}`;
    document.getElementById('docNo').value = currentDocNo;
    
    UI.showToast('ใช้เลขที่ชั่วคราว (Offline)', 'warning');
  }
}

// ============================================
// Input Mode Toggle
// ============================================
function setInputMode(mode) {
  currentInputMode = mode;
  window.currentInputMode = mode;

  const dropdownBtn = document.getElementById('modeDropdown');
  const pasteBtn = document.getElementById('modePaste');
  const pasteHint = document.getElementById('pasteHint');

  if (mode === 'dropdown') {
    dropdownBtn.classList.add('toggle-btn--active');
    dropdownBtn.style.background = 'var(--water)';
    dropdownBtn.style.color = 'white';
    pasteBtn.classList.remove('toggle-btn--active');
    pasteBtn.style.background = 'transparent';
    pasteBtn.style.color = 'inherit';
    pasteHint.style.display = 'none';
  } else {
    pasteBtn.classList.add('toggle-btn--active');
    pasteBtn.style.background = 'var(--water)';
    pasteBtn.style.color = 'white';
    dropdownBtn.classList.remove('toggle-btn--active');
    dropdownBtn.style.background = 'transparent';
    dropdownBtn.style.color = 'inherit';
    pasteHint.style.display = 'flex';
  }

  // Rebuild table rows with new mode
  rebuildSamplingTable();
}

function rebuildSamplingTable() {
  const tbody = document.getElementById('samplingTableBody');
  const currentRowCount = sampleRows.length || 10;
  
  // Clear existing
  sampleRows = [];
  nextRowId = 1;
  tbody.innerHTML = '';
  
  // Rebuild with current count
  for (let i = 0; i < currentRowCount; i++) {
    addSampleRow();
  }
}

// ============================================
// Add Sample Row (Dropdown/Paste Mode)
// ============================================
function addSampleRow() {
  if (isOtherBuilding) {
    addManualRow();
    return;
  }
  
  if (sampleRows.length >= MAX_SAMPLE_ROWS) {
    UI.showToast(`สูงสุด ${MAX_SAMPLE_ROWS} แถว`, 'warning');
    return;
  }

  const tbody = document.getElementById('samplingTableBody');
  const rowId = nextRowId++;
  const displayNum = sampleRows.length + 1;

  const row = document.createElement('tr');
  row.id = `row-${rowId}`;
  row.dataset.rowId = rowId;

  if (currentInputMode === 'paste') {
    // Paste mode: Text input
    row.innerHTML = `
      <td class="row-number">${displayNum}</td>
      <td class="col-point">
        <input type="text" 
               id="point-paste-${rowId}" 
               class="sampling-point-input"
               placeholder="Paste หรือพิมพ์ Sampling Point"
               onchange="handlePasteInputChange(this, ${rowId})"
               style="width: 100%; padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-md);">
      </td>
      <td class="col-tag">
        <div class="info-display" id="tag-${rowId}">-</div>
      </td>
      <td class="col-location">
        <div class="info-display" id="location-${rowId}">-</div>
      </td>
      <td class="col-result">
        <input type="number" step="1" id="result-${rowId}" min="0" placeholder="0" style="width: 80px; text-align: center;">
      </td>
      <td class="col-action">
        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${rowId})" title="ลบแถว">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    `;
  } else {
    // Dropdown mode
    const options = samplingPoints.map(p => `<option value="${p.samplingPoint}">${p.samplingPoint}</option>`).join('');
    row.innerHTML = `
      <td class="row-number">${displayNum}</td>
      <td class="col-point">
        <select id="point-${rowId}" class="sampling-point-select" onchange="onSamplingPointChange(${rowId})" style="width: 100%;">
          <option value="">-- เลือก --</option>
          ${options}
        </select>
      </td>
      <td class="col-tag">
        <div class="info-display" id="tag-${rowId}">-</div>
      </td>
      <td class="col-location">
        <div class="info-display" id="location-${rowId}">-</div>
      </td>
      <td class="col-result">
        <input type="number" step="1" id="result-${rowId}" min="0" placeholder="0" style="width: 80px; text-align: center;">
      </td>
      <td class="col-action">
        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${rowId})" title="ลบแถว">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    `;
  }

  tbody.appendChild(row);
  sampleRows.push(rowId);
  
  // Apply blank print mode if enabled
  if (typeof applyBlankPrintModeToNewRows === 'function') {
    applyBlankPrintModeToNewRows();
  }
}

// ============================================
// Add Manual Row (Other Building Mode)
// ============================================
function addManualRow() {
  if (manualRows.length >= MAX_SAMPLE_ROWS) {
    UI.showToast(`สูงสุด ${MAX_SAMPLE_ROWS} แถว`, 'warning');
    return;
  }

  const tbody = document.getElementById('manualTableBody');
  const rowId = nextRowId++;
  const displayNum = manualRows.length + 1;

  const row = document.createElement('tr');
  row.id = `manual-row-${rowId}`;
  row.dataset.rowId = rowId;

  row.innerHTML = `
    <td class="row-number">${displayNum}</td>
    <td class="col-point">
      <input type="text" id="manual-point-${rowId}" placeholder="Sampling Point" 
             style="width: 100%; padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-md);">
    </td>
    <td class="col-tag">
      <input type="text" id="manual-tag-${rowId}" placeholder="Tag" 
             style="width: 100%; padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-md);">
    </td>
    <td class="col-location">
      <input type="text" id="manual-location-${rowId}" placeholder="Location" 
             style="width: 100%; padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-md);">
    </td>
    <td class="col-result">
      <input type="number" step="1" id="manual-result-${rowId}" min="0" placeholder="0"
             style="width: 80px; text-align: center;">
    </td>
    <td class="col-action">
      <button type="button" class="btn-remove-row" onclick="removeManualRow(${rowId})" title="ลบแถว">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </td>
  `;

  tbody.appendChild(row);
  manualRows.push(rowId);
  
  // Apply blank print mode if enabled
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
    updateRowNumbers();
  }
}

function removeManualRow(rowId) {
  if (manualRows.length <= 1) {
    UI.showToast('ต้องมีอย่างน้อย 1 แถว', 'warning');
    return;
  }
  
  const row = document.getElementById(`manual-row-${rowId}`);
  if (row) {
    row.remove();
    manualRows = manualRows.filter(id => id !== rowId);
    updateManualRowNumbers();
  }
}

function removeSampleRowSilent(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (row) {
    row.remove();
    sampleRows = sampleRows.filter(id => id !== rowId);
  }
}

function updateRowNumbers() {
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    const numCell = row.querySelector('.row-number');
    if (numCell) numCell.textContent = index + 1;
  });
}

function updateManualRowNumbers() {
  const tbody = document.getElementById('manualTableBody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    const numCell = row.querySelector('.row-number');
    if (numCell) numCell.textContent = index + 1;
  });
}

// ============================================
// Sampling Point Change Handler
// ============================================
function onSamplingPointChange(rowId) {
  const select = document.getElementById(`point-${rowId}`);
  const selectedValue = select.value;
  
  const tagEl = document.getElementById(`tag-${rowId}`);
  const locationEl = document.getElementById(`location-${rowId}`);
  
  if (selectedValue) {
    const point = samplingPoints.find(p => p.samplingPoint === selectedValue);
    if (point) {
      tagEl.textContent = point.samplingTag || '-';
      locationEl.textContent = point.location || '-';
    }
  } else {
    tagEl.textContent = '-';
    locationEl.textContent = '-';
  }
}

// ============================================
// Handle Paste Input Change
// ============================================
function handlePasteInputChange(input, rowId) {
  const value = input.value.trim();
  const tagEl = document.getElementById(`tag-${rowId}`);
  const locationEl = document.getElementById(`location-${rowId}`);
  
  if (value) {
    const point = samplingPoints.find(p => p.samplingPoint === value);
    if (point) {
      tagEl.textContent = point.samplingTag || '-';
      locationEl.textContent = point.location || '-';
      input.style.borderColor = 'var(--success)';
    } else {
      tagEl.textContent = '-';
      locationEl.textContent = '-';
      input.style.borderColor = 'var(--error)';
    }
  } else {
    tagEl.textContent = '-';
    locationEl.textContent = '-';
    input.style.borderColor = 'var(--line)';
  }
}

// ============================================
// Setup Paste Handler
// ============================================
function setupPasteHandler() {
  const tbody = document.getElementById('samplingTableBody');
  if (tbody) {
    tbody.addEventListener('paste', handlePasteFromExcel);
  }
  console.log('✅ Paste handler setup complete');
}

async function handlePasteFromExcel(e) {
  const target = e.target;
  const isInTable = target.closest('#samplingTableBody') ||
                    target.classList.contains('sampling-point-select') ||
                    target.classList.contains('sampling-point-input');

  if (!isInTable) return;

  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedText = clipboardData.getData('text');

  if (!pastedText) return;

  const lines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1 && !pastedText.includes('\t')) return;

  e.preventDefault();

  // Parse data - WFI has single result
  const parsedData = lines.map(line => {
    const cols = line.split('\t').map(col => col.trim());
    return {
      samplingPoint: cols[0] || '',
      tag: cols[1] || '',
      result: cols[2] || ''
    };
  });

  console.log(`📋 Pasted ${parsedData.length} rows`);

  if (parsedData.length > MAX_SAMPLE_ROWS) {
    UI.showModal({
      title: '⚠️ ข้อมูลเกินกำหนด',
      message: `คุณวางข้อมูล ${parsedData.length} รายการ แต่ระบบรองรับสูงสุด ${MAX_SAMPLE_ROWS} รายการ`,
      type: 'warning',
      onConfirm: () => processPastedData(parsedData.slice(0, MAX_SAMPLE_ROWS))
    });
    return;
  }

  await processPastedData(parsedData);
}

async function processPastedData(pastedRows) {
  const targetRowCount = pastedRows.length;
  const currentRowCount = sampleRows.length;

  // Adjust row count
  if (targetRowCount > currentRowCount) {
    for (let i = 0; i < targetRowCount - currentRowCount; i++) {
      addSampleRow();
    }
  } else if (targetRowCount < currentRowCount) {
    for (let i = 0; i < currentRowCount - targetRowCount; i++) {
      const lastRowId = sampleRows[sampleRows.length - 1];
      removeSampleRowSilent(lastRowId);
    }
  }

  let matchedCount = 0;
  let notFoundList = [];

  for (let index = 0; index < pastedRows.length; index++) {
    const pastedRow = pastedRows[index];
    const rowId = sampleRows[index];
    const samplingPointValue = pastedRow.samplingPoint;

    if (!rowId) continue;

    // Find matching point
    const point = samplingPoints.find(p => p.samplingPoint === samplingPointValue);

    if (currentInputMode === 'paste') {
      const input = document.getElementById(`point-paste-${rowId}`);
      if (input) {
        input.value = samplingPointValue;
        if (point) {
          input.style.borderColor = 'var(--success)';
          document.getElementById(`tag-${rowId}`).textContent = point.samplingTag || '-';
          document.getElementById(`location-${rowId}`).textContent = point.location || '-';
          matchedCount++;
        } else {
          input.style.borderColor = 'var(--error)';
          notFoundList.push(samplingPointValue);
        }
      }
    } else {
      const select = document.getElementById(`point-${rowId}`);
      if (select && point) {
        select.value = samplingPointValue;
        onSamplingPointChange(rowId);
        matchedCount++;
      } else if (samplingPointValue) {
        notFoundList.push(samplingPointValue);
      }
    }

    // Set result
    if (pastedRow.result) {
      const resultInput = document.getElementById(`result-${rowId}`);
      if (resultInput) {
        const numVal = parseFloat(pastedRow.result);
        resultInput.value = isNaN(numVal) ? 0 : numVal;
      }
    }
  }

  if (notFoundList.length > 0) {
    UI.showModal({
      title: '⚠️ บาง Sampling Point ไม่พบ',
      message: `นำเข้าสำเร็จ ${matchedCount} รายการ\n\nไม่พบ ${notFoundList.length} รายการ:\n• ${notFoundList.slice(0, 5).join('\n• ')}`,
      type: 'warning'
    });
  } else if (matchedCount > 0) {
    UI.showToast(`✅ นำเข้า ${matchedCount} รายการสำเร็จ`, 'success');
  }
}

// Note: formatResultValue and preserveLeadingZeros are defined in utils.js

// ============================================
// Collect Sample Data
// ============================================
function collectSampleData() {
  const samples = [];
  
  // Check if blank print mode is enabled
  const blankMode = typeof isBlankPrintModeEnabled === 'function' && isBlankPrintModeEnabled();
  
  if (isOtherBuilding) {
    // Manual input mode
    manualRows.forEach(rowId => {
      const point = document.getElementById(`manual-point-${rowId}`)?.value?.trim();
      const tag = document.getElementById(`manual-tag-${rowId}`)?.value?.trim();
      const location = document.getElementById(`manual-location-${rowId}`)?.value?.trim();
      const result = document.getElementById(`manual-result-${rowId}`)?.value;
      
      if (point) {
        samples.push({
          samplingPoint: point,
          samplingTag: tag || '',
          location: location || '',
          result: blankMode ? '' : formatResultValue(result || '0')
        });
      }
    });
  } else {
    // Dropdown/Paste mode
    sampleRows.forEach(rowId => {
      let point;
      
      if (currentInputMode === 'paste') {
        point = document.getElementById(`point-paste-${rowId}`)?.value?.trim();
      } else {
        point = document.getElementById(`point-${rowId}`)?.value;
      }
      
      const tag = document.getElementById(`tag-${rowId}`)?.textContent;
      const location = document.getElementById(`location-${rowId}`)?.textContent;
      const result = document.getElementById(`result-${rowId}`)?.value;
      
      if (point) {
        samples.push({
          samplingPoint: point,
          samplingTag: tag === '-' ? '' : tag,
          location: location === '-' ? '' : location,
          result: blankMode ? '' : formatResultValue(result || '0')
        });
      }
    });
  }
  
  return samples;
}

// ============================================
// Save Form
// ============================================
async function saveForm() {
  // Validate
  const building = document.getElementById('building').value;
  const samplingDate = document.getElementById('samplingDate').value;
  const performedDate = document.getElementById('performedDate').value;

  if (!building || !samplingDate || !performedDate) {
    UI.showToast('กรุณากรอกข้อมูลที่จำเป็น', 'error');
    return;
  }

  const samples = collectSampleData();
  if (samples.length === 0) {
    UI.showToast('กรุณากรอกข้อมูล Sampling อย่างน้อย 1 รายการ', 'error');
    return;
  }
  
  // Check if blank print mode is enabled
  const blankMode = typeof isBlankPrintModeEnabled === 'function' && isBlankPrintModeEnabled();

  UI.showLoading('กำลังบันทึก...');

  const formData = {
    worksheetNo: currentWorksheetNo,
    docNo: currentDocNo,
    formType: 'WFI-PUS',
    recordStatus: currentStatus,
    building: building,
    samplingDate: samplingDate,
    performedDate: performedDate,
    temp: document.getElementById('temp').value || '',
    incNo: preserveLeadingZeros(document.getElementById('incNo').value || ''),
    // QC results: empty if blank mode
    rightHand: blankMode ? '' : formatResultValue(document.getElementById('rightHand').value || '0'),
    leftHand: blankMode ? '' : formatResultValue(document.getElementById('leftHand').value || '0'),
    rightEM: blankMode ? '' : formatResultValue(document.getElementById('rightEM').value || '0'),
    leftEM: blankMode ? '' : formatResultValue(document.getElementById('leftEM').value || '0'),
    negativeValue: blankMode ? '' : formatResultValue(document.getElementById('negativeValue').value || '0'),
    lotMembrane: preserveLeadingZeros(document.getElementById('lotMembrane').value),
    lotForceps: preserveLeadingZeros(document.getElementById('lotForceps').value),
    lotBuffer: preserveLeadingZeros(document.getElementById('lotBuffer').value),
    lotTSA: preserveLeadingZeros(document.getElementById('lotTSA').value),
    determinedDate: document.getElementById('determinedDate').value || '',
    concludedDate: document.getElementById('concludedDate').value || '',
    approvedDate: document.getElementById('approvedDate').value || '',
    comment: document.getElementById('comment').value || '',
    blankPrintMode: blankMode,
    samples: samples,
    samplesJson: JSON.stringify(samples),
    createdBy: Storage.get('username'),
    createdAt: new Date().toISOString()
  };

  try {
    // Save to Google Sheet
    const sheetName = currentStatus === 'Routine' ? 'records_wfi' : 'records_wfi_pq';
    
    const response = await fetch(SYNC_CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveRecord',
        sheetName: sheetName,
        data: formData
      })
    });

    const result = await response.json();

    UI.hideLoading();

    if (result.success) {
      UI.showToast('✅ บันทึกสำเร็จ', 'success');
      
      // Ask to print
      UI.showModal({
        title: '✅ บันทึกสำเร็จ',
        message: `บันทึก ${currentWorksheetNo} เรียบร้อยแล้ว\n\nต้องการพิมพ์รายงานหรือไม่?`,
        type: 'success',
        confirmText: 'พิมพ์',
        cancelText: 'ปิด',
        onConfirm: () => goToPrint(),
        onCancel: () => resetForm()
      });
    } else {
      throw new Error(result.error || 'Save failed');
    }

  } catch (error) {
    console.error('Save error:', error);
    UI.hideLoading();
    UI.showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
  }
}

// ============================================
// Reset Form
// ============================================
function resetForm() {
  document.getElementById('wfiForm').reset();
  
  // Reset state
  sampleRows = [];
  manualRows = [];
  nextRowId = 1;
  
  // Clear tables
  document.getElementById('samplingTableBody').innerHTML = '';
  document.getElementById('manualTableBody').innerHTML = '';
  
  // Re-init
  document.getElementById('recordStatus').value = 'Routine';
  currentStatus = 'Routine';
  document.getElementById('building').value = 'Building 16';
  
  setupDateAutoFill();
  onBuildingChange();
  
  fetchNextDocNoFromSheet();
}

// ============================================
// Go to Print Page
// ============================================
function goToPrint() {
  window.location.href = `print.html?worksheetNo=${encodeURIComponent(currentWorksheetNo)}`;
}
