/**
 * ============================================
 * WATER RECORD APP - PW/PRW Form Logic
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
// Expose globally for input mode toggle
window.samplingPoints = samplingPoints;
let sampleRows = [];
let nextRowId = 1;
let currentStatus = 'Routine'; // 'Routine' or 'PQ1-2'

// ============================================
// Initialize Form
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing PW/PRW Form...');

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

  // Load buildings dropdown
  await loadBuildings();

  // Set default status FIRST
  document.getElementById('recordStatus').value = 'Routine';
  currentStatus = 'Routine';

  // Set default dates with auto-calculation
  setupDateAutoFill();

  // Initialize with 10 sample rows
  for (let i = 0; i < 10; i++) {
    addSampleRow();
  }

  // Setup paste handler for Excel import
  setupPasteHandler();

  // Fetch next DocNo from Google Sheet
  await fetchNextDocNoFromSheet();

  // Check pending sync (silently, without modal popup on init)
  // await checkPendingSync();

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
// Load Master Data from API or JSON
// ============================================
async function loadMasterDataFromSource() {
  console.log('🔄 Loading master data...');
  
  try {
    // Try API first (using database sheet from Google Sheet)
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
  const performedDateInput = document.getElementById('performedDate');
  const determinedDateInput = document.getElementById('determinedDate');
  const concludedDateInput = document.getElementById('concludedDate');
  const approvedDateInput = document.getElementById('approvedDate');

  // Set initial dates
  const today = DateUtils.today();
  samplingDateInput.value = today;

  // Calculate derived dates
  updateDerivedDates(today);

  // Listen for Sampling Date changes
  samplingDateInput.addEventListener('change', (e) => {
    updateDerivedDates(e.target.value);
  });
}

// ============================================
// Update Derived Dates based on Sampling Date
// ============================================
function updateDerivedDates(samplingDate) {
  if (!samplingDate) return;

  // Parse date components to avoid timezone issues
  const [year, month, day] = samplingDate.split('-').map(Number);
  const samplingDateObj = new Date(year, month - 1, day);

  // Performed Date = Sampling Date + 1 day
  const performedDate = new Date(samplingDateObj);
  performedDate.setDate(performedDate.getDate() + 1);
  document.getElementById('performedDate').value = formatDateForInput(performedDate);

  // Determined, Concluded, Approved Date = Sampling Date + 3 days
  const plus3Date = new Date(samplingDateObj);
  plus3Date.setDate(plus3Date.getDate() + 3);
  const plus3DateStr = formatDateForInput(plus3Date);

  document.getElementById('determinedDate').value = plus3DateStr;
  document.getElementById('concludedDate').value = plus3DateStr;
  document.getElementById('approvedDate').value = plus3DateStr;
}

// ============================================
// Format Date for Input (YYYY-MM-DD)
// ============================================
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// Status Change Handler
// ============================================
async function onStatusChange() {
  const status = document.getElementById('recordStatus').value;
  currentStatus = status;

  // Handle Building based on Status
  if (status === 'PQ1-2/OLD') {
    // Fix Building 12 only
    setBuildingSelection(['Building 12'], true);

    // Clear and rebuild rows for dropdown mode
    clearAllSampleRows();
    for (let i = 0; i < 10; i++) {
      addSampleRow();
    }
  } else if (status === 'PQ1-2/OCL') {
    // Fix Building 16 only
    setBuildingSelection(['Building 16'], true);

    // Clear and rebuild rows for dropdown mode
    clearAllSampleRows();
    for (let i = 0; i < 10; i++) {
      addSampleRow();
    }
  } else if (status === 'RAMA6') {
    // Clear Building and disable selection
    selectedBuildings = [];
    updateBuildingUI();
    setBuildingDisabled(true);
    samplingPoints = []; // Clear sampling points

    // Clear and rebuild rows for free text input
    clearAllSampleRows();
    for (let i = 0; i < 10; i++) {
      addSampleRow();
    }
  } else {
    // Routine: Enable building selection (multi-select)
    setBuildingDisabled(false);

    // Clear and rebuild rows for dropdown mode
    clearAllSampleRows();
    for (let i = 0; i < 10; i++) {
      addSampleRow();
    }
  }

  // Clear current worksheet and doc numbers when changing status
  // Force regeneration on next save to avoid wasting numbers
  currentWorksheetNo = null;
  currentDocNo = null;

  // Fetch next DocNo from Google Sheet
  await fetchNextDocNoFromSheet();

  console.log('✅ Status changed to:', currentStatus);
}

// ============================================
// Fetch Next DocNo from Google Sheet
// ============================================
async function fetchNextDocNoFromSheet() {
  console.log('🔄 Fetching next DocNo from Google Sheet for status:', currentStatus);

  // Show loading in UI
  document.getElementById('worksheetNoDisplay').textContent = 'Worksheet: กำลังโหลด...';
  document.getElementById('docNo').value = '';

  try {
    if (!SYNC_CONFIG.SCRIPT_URL) {
      console.log('No script URL configured, using fallback');
      await generateWorksheetAndDocNo();
      return;
    }

    const url = `${SYNC_CONFIG.SCRIPT_URL}?action=getNextDocNo&status=${encodeURIComponent(currentStatus)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.data) {
      const { nextDocNo, nextSeq, prefix, maxSeq } = result.data;

      // Update state
      currentWorksheetNo = nextDocNo;
      currentDocNo = nextDocNo;

      // Update UI
      document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${nextDocNo}`;
      document.getElementById('docNo').value = nextDocNo;

      console.log(`✅ Next DocNo from Sheet: ${nextDocNo} (current max: ${maxSeq})`);
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching next DocNo:', error);
    console.log('Falling back to local generation...');

    // Fallback to local generation if API fails
    await generateWorksheetAndDocNo();
  }
}

// ============================================
// Generate Worksheet No. AND Document No. (Auto for all statuses)
// ============================================
async function generateWorksheetAndDocNo() {
  console.log('🔢 generateWorksheetAndDocNo() called for status:', currentStatus);

  try {
    const year = DateUtils.getCurrentYear2Digit();
    let prefix = '';
    let storeKey = '';

    // Clean up old dash-style keys (migrate to underscore style)
    const oldDashKey = `lastSeq_WT-${year}`;
    if (Storage.get(oldDashKey)) {
      console.log(`[MIGRATE] Removing old key format: ${oldDashKey}`);
      Storage.remove(oldDashKey);
    }

    // Determine prefix and store key based on status
    switch (currentStatus) {
      case 'Routine':
        prefix = 'WT';
        storeKey = `WT_${year}`;  // Use underscore to match sync.js
        break;
      case 'PQ1-2/OLD':
        prefix = 'PQ-OLD';
        storeKey = 'PQ_OLD';
        break;
      case 'PQ1-2/OCL':
        prefix = 'PQ-OCL';
        storeKey = 'PQ_OCL';
        break;
      case 'RAMA6':
        prefix = 'RA6';
        storeKey = 'RA6';
        break;
      default:
        prefix = 'WT';
        storeKey = `WT_${year}`;
    }

    // Get all existing records
    const records = await waterDB.getAllRecords();

    // Filter records by status and extract sequence numbers
    let maxSeq = 0;

    if (currentStatus === 'Routine') {
      // Routine: Filter by WT-YY-XXXX format AND current year only
      // This ensures running number resets to 0001 when year changes
      const yearPattern = new RegExp(`^WT-${year}-(\\d{4})$`);
      const filteredRecords = records.filter(r => {
        return r.docNo && yearPattern.test(r.docNo);
      });

      filteredRecords.forEach(r => {
        const match = r.docNo.match(yearPattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
    } else if (currentStatus === 'PQ1-2/OLD') {
      // PQ1-2/OLD: Filter by PQ-OLD-XXXX format
      const filteredRecords = records.filter(r => {
        return r.docNo && r.docNo.match(/^PQ-OLD-\d{4}$/);
      });

      filteredRecords.forEach(r => {
        const match = r.docNo.match(/^PQ-OLD-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
    } else if (currentStatus === 'PQ1-2/OCL') {
      // PQ1-2/OCL: Filter by PQ-OCL-XXXX format
      const filteredRecords = records.filter(r => {
        return r.docNo && r.docNo.match(/^PQ-OCL-\d{4}$/);
      });

      filteredRecords.forEach(r => {
        const match = r.docNo.match(/^PQ-OCL-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
    } else if (currentStatus === 'RAMA6') {
      // RAMA6: Filter by RA6-XXXX format
      const filteredRecords = records.filter(r => {
        return r.docNo && r.docNo.match(/^RA6-\d{4}$/);
      });

      filteredRecords.forEach(r => {
        const match = r.docNo.match(/^RA6-(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
    }

    // Also check localStorage for last generated sequence
    const localStorageKey = `lastSeq_${storeKey}`;
    const storedSeq = Storage.get(localStorageKey) || 0;
    
    // Debug: Log what we found
    console.log(`[DEBUG] Year: ${year}, StoreKey: ${storeKey}`);
    console.log(`[DEBUG] Max from records (filtered by year): ${maxSeq}`);
    console.log(`[DEBUG] Stored in localStorage (${localStorageKey}): ${storedSeq}`);
    
    // For new year, only use maxSeq from records (not localStorage from previous year)
    // localStorage key includes year, so it should be correct
    maxSeq = Math.max(maxSeq, storedSeq);
    
    console.log(`[DEBUG] Final maxSeq: ${maxSeq}, nextSeq will be: ${maxSeq + 1}`);

    // Generate next number
    const nextSeq = maxSeq + 1;

    // Format the numbers (worksheetNo and docNo are SAME for all statuses)
    let worksheetNo = '';
    let docNo = '';

    if (currentStatus === 'Routine') {
      // Routine: WT-25-XXXX
      worksheetNo = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    } else if (currentStatus === 'PQ1-2/OLD') {
      // PQ1-2/OLD: PQ-OLD-XXXX
      worksheetNo = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    } else if (currentStatus === 'PQ1-2/OCL') {
      // PQ1-2/OCL: PQ-OCL-XXXX
      worksheetNo = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    } else if (currentStatus === 'RAMA6') {
      // RAMA6: RA6-XXXX
      worksheetNo = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
      docNo = worksheetNo;
    }

    // Save to state
    currentWorksheetNo = worksheetNo;
    currentDocNo = docNo;

    // Save sequence to localStorage
    Storage.set(localStorageKey, nextSeq);

    // Update UI
    document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${worksheetNo}`;
    document.getElementById('docNo').value = docNo;

    console.log(`Generated - Worksheet: ${worksheetNo}, DocNo: ${docNo} (Status: ${currentStatus})`);

  } catch (error) {
    console.error('Error generating numbers:', error);
    UI.showToast('เกิดข้อผิดพลาดในการสร้างเลขที่เอกสาร', 'error');
  }
}

// ============================================
// Reset Running Numbers (Clear localStorage)
// ============================================
function resetRunningNumbers() {
  console.log('🔄 Resetting all running numbers...');

  // Clear all sequence numbers from localStorage
  const year = DateUtils.getCurrentYear2Digit();
  Storage.remove(`lastSeq_WT_${year}`);
  Storage.remove('lastSeq_PQ_OLD');
  Storage.remove('lastSeq_PQ_OCL');
  Storage.remove('lastSeq_RA6');

  console.log('✅ Running numbers reset complete');
}

// ============================================
// Sync and Reset Numbers from Google Sheets
// ============================================
async function syncAndResetNumbers() {
  console.log('🔄 Syncing running numbers from Google Sheets...');

  // Reset local numbers first
  resetRunningNumbers();

  // Sync from Google Sheets
  if (typeof syncRunningNumbersFromSheet === 'function') {
    await syncRunningNumbersFromSheet();
    UI.showToast('✅ Sync เลข Running Number จาก Google Sheet สำเร็จ', 'success');
  } else {
    console.warn('syncRunningNumbersFromSheet() not available');
  }
}

// ============================================
// Validate Document No.
// ============================================
async function validateDocNo(docNo) {
  const errors = [];

  if (!docNo) {
    return ['กรุณากรอก Document No.'];
  }

  // Check format for Routine
  if (currentStatus === 'Routine') {
    const match = docNo.match(/^WT-(\d{2})-(\d{4})$/);
    if (!match) {
      errors.push('รูปแบบ Document No. ไม่ถูกต้อง (ต้องเป็น WT-YY-XXXX)');
    }
  }

  // Check for duplicates (all docNo must be unique)
  const records = await waterDB.getAllRecords();
  const duplicate = records.find(r => r.docNo === docNo && r.worksheetNo !== currentWorksheetNo);

  if (duplicate) {
    errors.push(`Document No. "${docNo}" ซ้ำกับ Worksheet ${duplicate.worksheetNo}`);
  }

  return errors;
}

// ============================================
// Multi-Select Building State
// ============================================
let selectedBuildings = [];
let buildingDropdownOpen = false;

const AVAILABLE_BUILDINGS = [
  { value: 'Building 10', label: 'Building 10', icon: '10' },
  { value: 'Building 12', label: 'Building 12', icon: '12' },
  { value: 'Building 16', label: 'Building 16', icon: '16' },
  { value: 'Building 19', label: 'Building 19', icon: '19' }
];

// ============================================
// Load Buildings Multi-Select
// ============================================
async function loadBuildings() {
  try {
    const optionsContainer = document.getElementById('buildingOptions');
    if (!optionsContainer) return;

    // Clear and populate options
    optionsContainer.innerHTML = '';

    AVAILABLE_BUILDINGS.forEach(building => {
      const option = document.createElement('div');
      option.className = 'multi-select__option';
      option.dataset.value = building.value;
      option.onclick = (e) => {
        e.stopPropagation();
        toggleBuildingOption(building.value);
      };

      option.innerHTML = `
        <div class="multi-select__checkbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="multi-select__option-icon">${building.icon}</span>
        <span class="multi-select__option-label">${building.label}</span>
      `;

      optionsContainer.appendChild(option);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', handleClickOutsideDropdown);

    console.log('✅ Building multi-select loaded');

  } catch (error) {
    console.error('Error loading buildings:', error);
    UI.showToast('ไม่สามารถโหลดข้อมูล Building ได้', 'error');
  }
}

// ============================================
// Toggle Building Dropdown
// ============================================
function toggleBuildingDropdown() {
  const multiSelect = document.getElementById('buildingMultiSelect');
  if (multiSelect.classList.contains('is-disabled')) return;

  buildingDropdownOpen = !buildingDropdownOpen;
  multiSelect.classList.toggle('is-open', buildingDropdownOpen);
}

// ============================================
// Handle Click Outside Dropdown
// ============================================
function handleClickOutsideDropdown(e) {
  const multiSelect = document.getElementById('buildingMultiSelect');
  if (multiSelect && !multiSelect.contains(e.target)) {
    closeBuildingDropdown();
  }
}

// ============================================
// Close Building Dropdown
// ============================================
function closeBuildingDropdown() {
  buildingDropdownOpen = false;
  const multiSelect = document.getElementById('buildingMultiSelect');
  if (multiSelect) {
    multiSelect.classList.remove('is-open');
  }
}

// ============================================
// Toggle Building Option (Select/Deselect)
// ============================================
function toggleBuildingOption(value) {
  const index = selectedBuildings.indexOf(value);

  if (index > -1) {
    // Deselect
    selectedBuildings.splice(index, 1);
  } else {
    // Select
    selectedBuildings.push(value);
  }

  updateBuildingUI();
  onBuildingChange();
}

// ============================================
// Select All Buildings
// ============================================
function selectAllBuildings() {
  selectedBuildings = AVAILABLE_BUILDINGS.map(b => b.value);
  updateBuildingUI();
  onBuildingChange();
}

// ============================================
// Clear All Buildings
// ============================================
function clearAllBuildings() {
  selectedBuildings = [];
  updateBuildingUI();
  onBuildingChange();
}

// ============================================
// Remove Single Building Tag
// ============================================
function removeBuildingTag(value, e) {
  e.stopPropagation();
  const index = selectedBuildings.indexOf(value);
  if (index > -1) {
    selectedBuildings.splice(index, 1);
    updateBuildingUI();
    onBuildingChange();
  }
}

// ============================================
// Update Building UI (Tags + Options)
// ============================================
function updateBuildingUI() {
  const placeholder = document.getElementById('buildingPlaceholder');
  const tagsContainer = document.getElementById('buildingTags');
  const hiddenInput = document.getElementById('selectedBuildings');
  const optionsContainer = document.getElementById('buildingOptions');

  // Update hidden input value
  hiddenInput.value = selectedBuildings.join(',');

  // Update placeholder visibility and tags
  if (selectedBuildings.length === 0) {
    placeholder.style.display = 'block';
    tagsContainer.innerHTML = '';
  } else {
    placeholder.style.display = 'none';

    // Build tags HTML
    tagsContainer.innerHTML = selectedBuildings.map(value => {
      const building = AVAILABLE_BUILDINGS.find(b => b.value === value);
      return `
        <span class="multi-select__tag">
          ${building ? building.label : value}
          <span class="multi-select__tag-remove" onclick="removeBuildingTag('${value}', event)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </span>
      `;
    }).join('');
  }

  // Update options selection state
  if (optionsContainer) {
    const options = optionsContainer.querySelectorAll('.multi-select__option');
    options.forEach(option => {
      const value = option.dataset.value;
      option.classList.toggle('is-selected', selectedBuildings.includes(value));
    });
  }
}

// ============================================
// Set Building Selection Programmatically
// ============================================
function setBuildingSelection(buildings, disabled = false) {
  selectedBuildings = Array.isArray(buildings) ? [...buildings] : [buildings];
  updateBuildingUI();

  const multiSelect = document.getElementById('buildingMultiSelect');
  if (multiSelect) {
    multiSelect.classList.toggle('is-disabled', disabled);
  }

  onBuildingChange();
}

// ============================================
// Enable/Disable Building Multi-Select
// ============================================
function setBuildingDisabled(disabled) {
  const multiSelect = document.getElementById('buildingMultiSelect');
  if (multiSelect) {
    multiSelect.classList.toggle('is-disabled', disabled);
    if (disabled) {
      closeBuildingDropdown();
    }
  }
}

// ============================================
// Building Change Handler (Multi-Select)
// ============================================
async function onBuildingChange() {
  // No buildings selected
  if (selectedBuildings.length === 0) {
    samplingPoints = [];
    window.samplingPoints = samplingPoints;  // Sync global
    updateSamplingPointDropdowns();
    return;
  }

  try {
    samplingPoints = [];

    // Fetch and combine sampling points from all selected buildings
    for (const bldg of selectedBuildings) {
      const points = await waterDB.getMasterDataByBuilding(bldg);
      samplingPoints = samplingPoints.concat(points);
    }
    
    // Sync to global for input mode toggle
    window.samplingPoints = samplingPoints;

    console.log(`✅ Loaded ${samplingPoints.length} sampling points from: ${selectedBuildings.join(', ')}`);

    // Update all dropdown options
    updateSamplingPointDropdowns();

  } catch (error) {
    console.error('Error loading sampling points:', error);
    UI.showToast('ไม่สามารถโหลดข้อมูล Sampling Points ได้', 'error');
  }
}

// ============================================
// Update All Sampling Point Dropdowns
// ============================================
function updateSamplingPointDropdowns() {
  const selects = document.querySelectorAll('.sampling-point-select');

  selects.forEach(select => {
    const currentValue = select.value;

    // Clear options
    select.innerHTML = '<option value="">-- เลือก --</option>';

    // Add sampling point options
    samplingPoints.forEach(point => {
      const option = document.createElement('option');
      option.value = point.samplingPoint;
      option.textContent = point.samplingPoint;
      select.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && samplingPoints.some(p => p.samplingPoint === currentValue)) {
      select.value = currentValue;
    }
  });
}

// ============================================
// MAX ROWS CONSTANT
// ============================================
const MAX_SAMPLE_ROWS = 30;

// ============================================
// Handle Paste from Excel (Column of Sampling Points)
// ============================================
function setupPasteHandler() {
  // Listen for paste on the entire sampling table
  const tbody = document.getElementById('samplingTableBody');
  if (!tbody) return;

  tbody.addEventListener('paste', handlePasteFromExcel);
  console.log('✅ Paste handler setup complete');
}

async function handlePasteFromExcel(e) {
  // Only handle paste on sampling table area
  const target = e.target;
  const isInTable = target.closest('#samplingTableBody') ||
                    target.classList.contains('sampling-point-select') ||
                    (target.tagName === 'INPUT' && target.id?.startsWith('point-')) ||
                    (target.tagName === 'INPUT' && target.id?.startsWith('result'));

  if (!isInTable) return;

  // Get clipboard data
  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedText = clipboardData.getData('text');

  if (!pastedText) return;

  // Parse pasted data - split by newline and tab to support multi-column
  const lines = pastedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // If only one item and no tabs, let normal paste happen
  if (lines.length <= 1 && !pastedText.includes('\t')) return;

  // Prevent default paste
  e.preventDefault();

  // Parse each line into columns (tab-separated)
  const parsedData = lines.map(line => {
    const cols = line.split('\t').map(col => col.trim());
    return {
      samplingPoint: cols[0] || '',
      tag: cols[1] || '',
      result1: cols[2] || '',
      result2: cols[3] || ''
    };
  });

  console.log(`📋 Pasted ${parsedData.length} rows from Excel`);
  console.log('📋 First row:', parsedData[0]);

  // Check max limit
  if (parsedData.length > MAX_SAMPLE_ROWS) {
    UI.showModal({
      title: '⚠️ ข้อมูลเกินกำหนด',
      message: `คุณวางข้อมูล ${parsedData.length} รายการ แต่ระบบรองรับสูงสุด ${MAX_SAMPLE_ROWS} รายการ\n\nระบบจะนำเข้าเฉพาะ ${MAX_SAMPLE_ROWS} รายการแรก`,
      type: 'warning',
      onConfirm: () => {
        processPastedData(parsedData.slice(0, MAX_SAMPLE_ROWS));
      }
    });
    return;
  }

  // Process pasted data
  await processPastedData(parsedData);
}

async function processPastedData(pastedRows) {
  const isRAMA6 = currentStatus === 'RAMA6';
  const targetRowCount = pastedRows.length;
  const currentRowCount = sampleRows.length;

  console.log(`📊 Processing ${targetRowCount} rows, current rows: ${currentRowCount}`);
  console.log(`📊 Mode: ${isRAMA6 ? 'RAMA6' : 'Normal'}, Buildings: ${selectedBuildings.join(', ')}`);
  console.log(`📊 Available sampling points: ${samplingPoints.length}`);

  // Check if building is selected (for normal mode)
  if (!isRAMA6 && (selectedBuildings.length === 0 || samplingPoints.length === 0)) {
    UI.showModal({
      title: '⚠️ กรุณาเลือก Building ก่อน',
      message: 'กรุณาเลือก Building เพื่อให้ระบบโหลดรายการ Sampling Points\n\nหลังจากเลือก Building แล้ว ลอง Paste ใหม่อีกครั้ง',
      type: 'warning'
    });
    return;
  }

  // Adjust row count
  if (targetRowCount > currentRowCount) {
    // Add more rows
    const rowsToAdd = targetRowCount - currentRowCount;
    for (let i = 0; i < rowsToAdd; i++) {
      addSampleRow();
    }
  } else if (targetRowCount < currentRowCount) {
    // Remove excess rows (from bottom)
    const rowsToRemove = currentRowCount - targetRowCount;
    for (let i = 0; i < rowsToRemove; i++) {
      const lastRowId = sampleRows[sampleRows.length - 1];
      removeSampleRowSilent(lastRowId);
    }
  }

  // Re-query rows after adjustment (important!)
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');

  console.log(`📊 After adjustment: ${rows.length} rows in DOM, sampleRows: ${sampleRows.length}`);

  let matchedCount = 0;
  let notFoundList = [];

  // Process each row
  for (let index = 0; index < pastedRows.length; index++) {
    const pastedRow = pastedRows[index];
    const rowId = sampleRows[index]; // Use sampleRows array instead of DOM index
    const samplingPointValue = pastedRow.samplingPoint;

    console.log(`📊 Row ${index}: rowId=${rowId}, samplingPoint=${samplingPointValue}`);

    if (!rowId) {
      console.warn(`⚠️ Row ${index}: No rowId found`);
      continue;
    }

    if (isRAMA6) {
      // RAMA6: Set text input directly
      const input = document.getElementById(`point-${rowId}`);
      if (input && samplingPointValue) {
        input.value = samplingPointValue;
      }
      
      // Set tag if available
      const tagInput = document.getElementById(`tag-${rowId}`);
      if (tagInput && pastedRow.tag) {
        tagInput.value = pastedRow.tag;
      }
      
      matchedCount++;
    } else {
      // Check for text input (paste mode) or select (dropdown mode)
      const textInput = document.getElementById(`point-paste-${rowId}`) || 
                        document.querySelector(`#row-${rowId} .sampling-point-input`);
      const select = document.querySelector(`#row-${rowId} .sampling-point-select`);
      
      console.log(`📊 Row ${index}: textInput=${!!textInput}, select=${!!select}`);

      if (textInput) {
        // Paste mode - use text input
        if (samplingPointValue) {
          textInput.value = samplingPointValue;
          
          // Trigger change to update tag/location
          if (typeof handlePasteInputChange === 'function') {
            handlePasteInputChange(textInput, rowId);
          }
          matchedCount++;
        }
      } else if (select) {
        // Dropdown mode - use select
        if (!samplingPointValue) {
          console.warn(`⚠️ Row ${index}: Empty sampling point value`);
          continue;
        }

        // Debug: Show available options
        const availableOptions = Array.from(select.options).map(opt => opt.value).filter(v => v);
        console.log(`📊 Row ${index}: ${availableOptions.length} options available`);

        if (availableOptions.length === 0) {
          notFoundList.push(samplingPointValue + ' (no options)');
          continue;
        }

        // Check if value exists in options (exact match)
        const optionExists = availableOptions.includes(samplingPointValue);

        if (optionExists) {
          select.value = samplingPointValue;
          onSamplingPointChange(rowId);
          matchedCount++;
        } else {
          // Try case-insensitive match
          const matchingOption = availableOptions.find(
            opt => opt.toLowerCase() === samplingPointValue.toLowerCase()
          );

          if (matchingOption) {
            select.value = matchingOption;
            onSamplingPointChange(rowId);
            matchedCount++;
          } else {
            // Try partial match (contains)
            const partialMatch = availableOptions.find(
              opt => opt.toLowerCase().includes(samplingPointValue.toLowerCase()) ||
                     samplingPointValue.toLowerCase().includes(opt.toLowerCase())
            );

            if (partialMatch) {
              select.value = partialMatch;
              onSamplingPointChange(rowId);
              matchedCount++;
              console.log(`📊 Row ${index}: Partial match "${samplingPointValue}" → "${partialMatch}"`);
            } else {
              notFoundList.push(samplingPointValue);
              console.warn(`⚠️ Sampling point not found: ${samplingPointValue}`);
            }
          }
        }
      } else {
        console.warn(`⚠️ Row ${index}: No input element found for rowId=${rowId}`);
      }
    }

    // Set result1 if available
    if (pastedRow.result1) {
      const result1Input = document.getElementById(`result1-${rowId}`);
      if (result1Input) {
        const numVal = parseFloat(pastedRow.result1);
        result1Input.value = isNaN(numVal) ? 0 : numVal;
      }
    }

    // Set result2 if available
    if (pastedRow.result2) {
      const result2Input = document.getElementById(`result2-${rowId}`);
      if (result2Input) {
        const numVal = parseFloat(pastedRow.result2);
        result2Input.value = isNaN(numVal) ? 0 : numVal;
      }
    }

    // Calculate average for this row
    calculateRowAverage(rowId);
  }

  // Show result
  if (notFoundList.length > 0) {
    UI.showModal({
      title: '⚠️ บาง Sampling Point ไม่พบในระบบ',
      message: `นำเข้าสำเร็จ ${matchedCount} รายการ\n\nไม่พบในระบบ ${notFoundList.length} รายการ:\n• ${notFoundList.slice(0, 10).join('\n• ')}${notFoundList.length > 10 ? `\n... และอีก ${notFoundList.length - 10} รายการ` : ''}\n\nโปรดตรวจสอบว่าเลือก Building ถูกต้อง หรือตรวจสอบชื่อ Sampling Point`,
      type: 'warning'
    });
  } else if (matchedCount > 0) {
    UI.showToast(`✅ นำเข้า ${matchedCount} รายการสำเร็จ`, 'success');
  } else {
    UI.showToast(`⚠️ ไม่สามารถนำเข้าข้อมูลได้`, 'warning');
  }

  console.log(`✅ Paste complete: ${matchedCount} matched, ${notFoundList.length} not found`);
}

// Remove row without minimum check (for paste adjustment)
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
  // Check max limit
  if (sampleRows.length >= MAX_SAMPLE_ROWS) {
    UI.showToast(`สูงสุด ${MAX_SAMPLE_ROWS} แถว`, 'warning');
    return;
  }

  const tbody = document.getElementById('samplingTableBody');
  const rowId = nextRowId++;

  // Calculate display number (sequential, not using rowId)
  const displayNum = sampleRows.length + 1;

  const row = document.createElement('tr');
  row.id = `row-${rowId}`;
  row.dataset.rowId = rowId;

  // Check if RAMA6 status for free text inputs
  const isRAMA6 = currentStatus === 'RAMA6';
  
  // Check if paste mode is active (defined in form.html)
  const isPasteMode = typeof window.currentInputMode !== 'undefined' && window.currentInputMode === 'paste';

  if (isRAMA6) {
    // RAMA6: Free text inputs for all fields
    row.innerHTML = `
    <td class="row-number">${displayNum}</td>
    <td class="col-point">
      <input type="text" id="point-${rowId}" placeholder="Sampling Point (optional)" style="width: 100%; padding: 0.4rem;">
    </td>
    <td class="col-tag">
      <input type="text" id="tag-${rowId}" placeholder="Sampling Tag (optional)" style="width: 100%; padding: 0.4rem;">
    </td>
    <td class="col-location">
      <input type="text" id="location-${rowId}" placeholder="Location (optional)" style="width: 100%; padding: 0.4rem;">
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result1-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result2-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-avg">
      <div class="result-avg" id="avg-${rowId}">0</div>
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
  } else if (isPasteMode) {
    // Paste mode: Text input for sampling point
    row.innerHTML = `
    <td class="row-number">${displayNum}</td>
    <td class="col-point">
      <input type="text" 
             id="point-paste-${rowId}" 
             class="sampling-point-input"
             placeholder="Paste หรือพิมพ์ Sampling Point"
             onchange="handlePasteInputChange(this, '${rowId}')"
             style="width: 100%; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-md);">
    </td>
    <td class="col-tag">
      <div class="info-display" id="tag-${rowId}">-</div>
    </td>
    <td class="col-location">
      <div class="info-display" id="location-${rowId}">-</div>
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result1-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result2-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-avg">
      <div class="result-avg" id="avg-${rowId}">0</div>
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
    // Normal: Dropdown for sampling points
    row.innerHTML = `
    <td class="row-number">${displayNum}</td>
    <td class="col-point">
      <select class="sampling-point-select" onchange="onSamplingPointChange(${rowId})">
        <option value="">-- เลือก --</option>
        ${samplingPoints.map(p => `<option value="${p.samplingPoint}">${p.samplingPoint}</option>`).join('')}
      </select>
    </td>
    <td class="col-tag">
      <div class="info-display" id="tag-${rowId}">-</div>
    </td>
    <td class="col-location">
      <div class="info-display" id="location-${rowId}">-</div>
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result1-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-result">
      <input type="number" step="1" id="result2-${rowId}" value="0" onchange="calculateRowAverage(${rowId})">
    </td>
    <td class="col-avg">
      <div class="result-avg" id="avg-${rowId}">0</div>
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

  console.log(`Added row ${rowId}, total rows: ${sampleRows.length}`);
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

    // Re-number remaining rows
    renumberRows();

    console.log(`Removed row ${rowId}, remaining rows: ${sampleRows.length}`);
  }
}

// ============================================
// Clear All Sample Rows
// ============================================
function clearAllSampleRows() {
  const tbody = document.getElementById('samplingTableBody');
  tbody.innerHTML = '';
  sampleRows = [];
  nextRowId = 1;
}

// ============================================
// Re-number Rows (Fix index display)
// ============================================
function renumberRows() {
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');

  rows.forEach((row, index) => {
    const numberCell = row.querySelector('.row-number');
    if (numberCell) {
      numberCell.textContent = index + 1;
    }
  });
}

// ============================================
// Sampling Point Change Handler
// ============================================
function onSamplingPointChange(rowId) {
  const select = document.querySelector(`#row-${rowId} .sampling-point-select`);
  const samplingPoint = select?.value;

  const tagDisplay = document.getElementById(`tag-${rowId}`);
  const locationDisplay = document.getElementById(`location-${rowId}`);

  if (!samplingPoint) {
    tagDisplay.textContent = '-';
    locationDisplay.textContent = '-';
    return;
  }

  // Find sampling point data
  const pointData = samplingPoints.find(p => p.samplingPoint === samplingPoint);

  if (pointData) {
    tagDisplay.textContent = pointData.samplingTag || '-';
    locationDisplay.textContent = `${pointData.noLocation || ''} / ${pointData.location || ''}`;
    locationDisplay.title = pointData.location || '';
  }
}

// ============================================
// Calculate Row Average
// ============================================
function calculateRowAverage(rowId) {
  const result1 = document.getElementById(`result1-${rowId}`)?.value;
  const result2 = document.getElementById(`result2-${rowId}`)?.value;
  const avgDisplay = document.getElementById(`avg-${rowId}`);

  const avg = calculateAverage(result1, result2);
  avgDisplay.textContent = avg || '-';
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
      // Reset form fields
      document.getElementById('pwPrwForm').reset();

      // Set default dates
      document.getElementById('samplingDate').value = DateUtils.today();
      document.getElementById('performedDate').value = DateUtils.today();

      // Clear sampling table
      document.getElementById('samplingTableBody').innerHTML = '';
      sampleRows = [];
      nextRowId = 1;

      // Add 10 new rows
      for (let i = 0; i < 10; i++) {
        addSampleRow();
      }

      // Generate new worksheet number
      currentWorksheetNo = await WorksheetNo.generate(currentStatus);
      document.getElementById('worksheetNoDisplay').textContent = `Worksheet: ${currentWorksheetNo}`;

      // Reset status to Routine and regenerate docNo
      document.getElementById('recordStatus').value = 'Routine';
      currentStatus = 'Routine';
      await onStatusChange();

      UI.showToast('ล้างฟอร์มเรียบร้อย', 'success');
    }
  });
}

// ============================================
// Validate Form
// ============================================
async function validateForm() {
  const errors = [];

  // Required fields - use multi-select building
  const samplingDate = document.getElementById('samplingDate').value;
  const performedDate = document.getElementById('performedDate').value;
  const docNo = document.getElementById('docNo').value;

  // Building validation (skip for RAMA6 which doesn't use buildings)
  if (currentStatus !== 'RAMA6' && selectedBuildings.length === 0) {
    errors.push('กรุณาเลือก Building อย่างน้อย 1 รายการ');
  }
  if (!samplingDate) errors.push('กรุณาระบุ Sampling Date');
  if (!performedDate) errors.push('กรุณาระบุ Performed Date');

  // Validate Document No.
  const docNoErrors = await validateDocNo(docNo);
  errors.push(...docNoErrors);

  // Check at least one sampling point (for non-RAMA6)
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');
  let hasData = false;

  if (currentStatus === 'RAMA6') {
    // For RAMA6, check if any row has result data
    rows.forEach(row => {
      const rowId = row.dataset.rowId;
      const result1 = document.getElementById(`result1-${rowId}`)?.value;
      const result2 = document.getElementById(`result2-${rowId}`)?.value;
      if (result1 || result2) {
        hasData = true;
      }
    });
  } else {
    // For other statuses, check sampling point selection (dropdown OR text input)
    rows.forEach(row => {
      const rowId = row.dataset.rowId;
      // Check dropdown
      const select = row.querySelector('.sampling-point-select');
      // Check text input (paste mode)
      const textInput = row.querySelector('.sampling-point-input') || 
                        document.getElementById(`point-paste-${rowId}`);
      
      if (select?.value || textInput?.value?.trim()) {
        hasData = true;
      }
    });
  }

  if (!hasData) {
    errors.push(currentStatus === 'RAMA6'
      ? 'กรุณากรอกผลทดสอบอย่างน้อย 1 แถว'
      : 'กรุณาเลือก Sampling Point อย่างน้อย 1 จุด');
  }

  return errors;
}

// ============================================
// Collect Form Data
// ============================================
function collectFormData() {
  // Check if blank print mode is enabled
  const blankMode = typeof isBlankPrintModeEnabled === 'function' && isBlankPrintModeEnabled();
  
  const data = {
    worksheetNo: currentWorksheetNo,
    formType: 'PW-PRW',
    recordStatus: document.getElementById('recordStatus').value,

    // Basic Info - Multi-select buildings stored as array and string
    buildings: selectedBuildings,
    building: selectedBuildings.join(', '), // For display/backward compatibility
    samplingDate: document.getElementById('samplingDate').value,
    performedDate: document.getElementById('performedDate').value,
    temp: document.getElementById('temp').value,
    docNo: document.getElementById('docNo').value,

    // Equipment Info
    incNo: preserveLeadingZeros(document.getElementById('incNo').value),
    // QC results: empty if blank mode
    rightEM: blankMode ? '' : formatResultValue(document.getElementById('rightEM').value),
    leftEM: blankMode ? '' : formatResultValue(document.getElementById('leftEM').value),
    negativeValue: blankMode ? '' : formatResultValue(document.getElementById('negativeValue').value),
    lotTSA: preserveLeadingZeros(document.getElementById('lotTSA').value),
    lotPCA: preserveLeadingZeros(document.getElementById('lotPCA').value),
    lotPlate: preserveLeadingZeros(document.getElementById('lotPlate').value),
    lotPipette: preserveLeadingZeros(document.getElementById('lotPipette').value),

    // Dates
    determinedDate: document.getElementById('determinedDate').value,
    concludedDate: document.getElementById('concludedDate').value,
    approvedDate: document.getElementById('approvedDate').value,

    // Comment
    comment: document.getElementById('comment').value,
    
    // Blank print mode flag
    blankPrintMode: blankMode,

    // Sampling Data
    samples: []
  };

  // Collect sampling rows
  const tbody = document.getElementById('samplingTableBody');
  const rows = tbody.querySelectorAll('tr');
  const isRAMA6 = currentStatus === 'RAMA6';

  rows.forEach((row, index) => {
    const rowId = row.dataset.rowId;

    if (isRAMA6) {
      // RAMA6: Get values from text inputs
      const samplingPoint = document.getElementById(`point-${rowId}`)?.value?.trim() || '';
      const samplingTag = document.getElementById(`tag-${rowId}`)?.value?.trim() || '';
      const location = document.getElementById(`location-${rowId}`)?.value?.trim() || '';
      const result1 = document.getElementById(`result1-${rowId}`)?.value || '';
      const result2 = document.getElementById(`result2-${rowId}`)?.value || '';

      // Include rows: blank mode includes all rows with sampling point, normal mode requires results
      const shouldInclude = blankMode ? samplingPoint : (result1 || result2);
      
      if (shouldInclude) {
        data.samples.push({
          index: index + 1,
          samplingPoint: samplingPoint,
          samplingTag: samplingTag,
          location: location,
          noLocation: '',  // Not used for RAMA6
          waterType: 'PW',  // Default for RAMA6
          result1: blankMode ? '' : formatResultValue(result1),
          result2: blankMode ? '' : formatResultValue(result2),
          resultAvg: blankMode ? '' : formatResultValue(document.getElementById(`avg-${rowId}`)?.textContent || '')
        });
      }
    } else {
      // Normal: Get values from dropdown select OR text input (paste mode)
      const select = row.querySelector('.sampling-point-select');
      const textInput = row.querySelector('.sampling-point-input') || 
                        document.getElementById(`point-paste-${rowId}`);
      
      // Get sampling point from either dropdown or text input
      const samplingPoint = select?.value || textInput?.value?.trim();

      if (samplingPoint) {
        // Find point data from master data
        const pointData = samplingPoints.find(p => 
          p.samplingPoint === samplingPoint ||
          p.samplingPoint.toLowerCase() === samplingPoint.toLowerCase()
        );

        // Get tag and location from display elements (auto-filled) or point data
        const tagDisplay = document.getElementById(`tag-${rowId}`);
        const locationDisplay = document.getElementById(`location-${rowId}`);
        
        const samplingTag = tagDisplay?.textContent !== '-' ? tagDisplay?.textContent : (pointData?.samplingTag || '');
        const location = pointData?.location || '';
        const noLocation = pointData?.noLocation || '';

        data.samples.push({
          index: index + 1,
          samplingPoint: samplingPoint,
          samplingTag: samplingTag,
          location: location,
          noLocation: noLocation,
          waterType: pointData?.waterType || '',
          result1: blankMode ? '' : formatResultValue(document.getElementById(`result1-${rowId}`)?.value || ''),
          result2: blankMode ? '' : formatResultValue(document.getElementById(`result2-${rowId}`)?.value || ''),
          resultAvg: blankMode ? '' : formatResultValue(document.getElementById(`avg-${rowId}`)?.textContent || '')
        });
      }
    }
  });

  data.samplesJson = JSON.stringify(data.samples);

  return data;
}

// ============================================
// Save Form
// ============================================
async function saveForm() {
  // Generate worksheet and doc numbers if not already generated
  if (!currentWorksheetNo || !currentDocNo) {
    await fetchNextDocNoFromSheet();

    // If still no number, use fallback
    if (!currentWorksheetNo || !currentDocNo) {
      await generateWorksheetAndDocNo();
    }
  }

  // Validate
  const errors = await validateForm();
  if (errors.length > 0) {
    UI.showToast(errors[0], 'error');
    return false;
  }

  UI.showLoading('กำลังบันทึก...');

  try {
    // Collect data
    const formData = collectFormData();

    // Save to database (original data)
    await waterDB.saveRecord(formData);

    // Also push to Google Sheet immediately if online
    if (Network.isOnline() && SYNC_CONFIG.SCRIPT_URL) {
      try {
        // Prepare data for Google Sheets (format results + preserve leading zeros)
        const sheetsData = prepareDataForGoogleSheets(formData);
        
        // Use simple fetch without Content-Type header to avoid CORS preflight
        const response = await fetch(SYNC_CONFIG.SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'saveRecord',
            record: sheetsData
          })
        });
        const result = await response.json();
        if (result.success) {
          console.log('✅ Record saved to Google Sheet:', result);
        } else {
          console.warn('⚠️ Failed to save to Sheet, will sync later:', result.error);
        }
      } catch (syncError) {
        console.warn('⚠️ Could not sync to Sheet:', syncError);
      }
    }

    UI.showToast(`✅ บันทึกสำเร็จ: ${formData.docNo}`, 'success');

    // Fetch next DocNo for next entry
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
// Go to Print Page (without saving)
// ============================================
function goToPrint() {
  // Just redirect to print page
  window.location.href = 'print.html';
}
