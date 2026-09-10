/**
 * ============================================
 * WATER RECORD APP - Form Utilities
 * ============================================
 * Shared functions for all form pages
 * Version: 4.2.0
 * 
 * Dependencies: utils.js, db.js, sync.js
 * ============================================
 */

// ============================================
// FORM CONFIGURATION TEMPLATES
// ============================================
const FORM_CONFIG_TEMPLATES = {
  'PW-PRW': {
    sheetNames: {
      'Routine': 'records_pw',
      'PQ1-2/OLD': 'records_pw_pq',
      'PQ1-2/OCL': 'records_pw_pq',
      'RAMA6': 'records_pw_rama6'
    },
    worksheetPrefix: 'WT',
    docCodePrefix: 'WT',
    hasMultipleResults: true,
    maxSampleRows: 30
  },
  'WFI-PUS': {
    sheetNames: {
      'Routine': 'records_wfi',
      'PQ1-2': 'records_wfi_pq'
    },
    worksheetPrefix: 'WP',
    docCodePrefix: 'WP',
    hasMultipleResults: false,
    maxSampleRows: 30
  },
  'COMPRESSED-AIR': {
    sheetNames: { 'Routine': 'records_ca', 'Other': 'records_ca' },
    worksheetPrefix: 'AC',
    docCodePrefix: 'AC',
    hasMultipleResults: false,
    maxSampleRows: 50
  },
  'EM-AIR': {
    sheetNames: { 'Routine': 'records_em', 'Other': 'records_em' },
    worksheetPrefix: 'AT',
    docCodePrefix: 'AT',
    hasMultipleResults: false,
    maxSampleRows: 150
  },
  'CLEANING-VALIDATION': {
    sheetNames: { 'Routine': 'records_cleaning' },
    worksheetPrefix: 'CV',
    docCodePrefix: 'CV',
    hasMultipleResults: false,
    maxSampleRows: 30
  },
  'GROWTH-PROMOTION': {
    sheetNames: { 'Routine': 'records_growth' },
    worksheetPrefix: 'GP',
    docCodePrefix: 'GP',
    hasMultipleResults: false,
    maxSampleRows: 30
  },
  'IDENTIFICATION': {
    sheetNames: { 'Routine': 'records_id' },
    worksheetPrefix: 'ID',
    docCodePrefix: 'ID',
    hasMultipleResults: false,
    maxSampleRows: 30
  }
};

// ============================================
// BLANK PRINT MODE
// ============================================
// When enabled, disables all result fields for printing blank worksheets

let isBlankPrintMode = false;

/**
 * Toggle blank print mode
 * @param {boolean} enabled - Whether blank print mode is enabled
 */
function toggleBlankPrintMode(enabled) {
  isBlankPrintMode = enabled;
  
  // Find all result input fields in the form
  const resultInputs = document.querySelectorAll(
    'input[name="result"], input[name="result1"], input[name="result2"], ' +
    'input[id^="result"], input[class*="result-input"]'
  );
  
  // Also find QC result fields (rightEM, leftEM, rightHand, leftHand, negativeValue)
  const qcInputs = document.querySelectorAll(
    '#rightEM, #leftEM, #rightHand, #leftHand, #negativeValue'
  );
  
  // Combine all inputs
  const allResultInputs = [...resultInputs, ...qcInputs];
  
  allResultInputs.forEach(input => {
    if (enabled) {
      // Disable and clear
      input.disabled = true;
      input.value = '';
      input.style.backgroundColor = 'var(--surface-secondary, #f5f5f5)';
      input.style.cursor = 'not-allowed';
      input.placeholder = 'ไม่ลงผล';
    } else {
      // Re-enable
      input.disabled = false;
      input.style.backgroundColor = '';
      input.style.cursor = '';
      input.placeholder = '';
    }
  });
  
  // Update avg fields for PW-PRW (they should also be cleared/disabled)
  const avgInputs = document.querySelectorAll('input[name="avg"], input[id^="avg"]');
  avgInputs.forEach(input => {
    if (enabled) {
      input.value = '';
    }
  });
  
  // Show toast notification
  if (enabled) {
    UI.showToast('โหมด Print ใบเปล่า - ช่องลงผลถูกปิดใช้งาน', 'info');
  } else {
    UI.showToast('โหมดปกติ - สามารถลงผลได้', 'success');
  }
  
  console.log('Blank print mode:', enabled ? 'ON' : 'OFF');
}

/**
 * Check if blank print mode is enabled
 * @returns {boolean}
 */
function isBlankPrintModeEnabled() {
  return isBlankPrintMode;
}

/**
 * Apply blank print mode to newly added rows
 * Call this after adding new sample rows
 */
function applyBlankPrintModeToNewRows() {
  if (!isBlankPrintMode) return;
  
  const resultInputs = document.querySelectorAll(
    'input[name="result"]:not([disabled]), input[name="result1"]:not([disabled]), ' +
    'input[name="result2"]:not([disabled]), input[id^="result"]:not([disabled])'
  );
  
  resultInputs.forEach(input => {
    input.disabled = true;
    input.value = '';
    input.style.backgroundColor = 'var(--surface-secondary, #f5f5f5)';
    input.style.cursor = 'not-allowed';
    input.placeholder = 'ไม่ลงผล';
  });
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize IndexedDB for form
 * @returns {Promise<void>}
 */
async function initFormDatabase() {
  try {
    await waterDB.init();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('Database init error:', error);
    throw error;
  }
}

// ============================================
// MASTER DATA LOADING
// ============================================

/**
 * Load master data from API or fallback to local JSON
 * @param {string} sheetName - Sheet name for master data (default: 'database')
 * @returns {Promise<Array>} Master data array
 */
async function loadFormMasterData(sheetName = 'database') {
  console.log('🔄 Loading master data...');
  
  try {
    // Try API first
    const response = await fetch(`${SYNC_CONFIG.SCRIPT_URL}?action=getMasterData&sheetName=${sheetName}`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      await waterDB.loadMasterData(result.data);
      console.log(`✅ Loaded ${result.data.length} master data records from API`);
      return result.data;
    }
  } catch (error) {
    console.warn('API fetch failed, trying local JSON:', error.message);
  }
  
  // Fallback to local JSON
  try {
    const localResponse = await fetch('data/water-data.json');
    const localData = await localResponse.json();
    
    if (localData.samplingPoints) {
      await waterDB.loadMasterData(localData.samplingPoints);
      console.log(`✅ Loaded ${localData.samplingPoints.length} master data records from local JSON`);
      return localData.samplingPoints;
    }
  } catch (error) {
    console.warn('Local JSON load failed:', error.message);
  }
  
  console.log('⚠️ No master data available');
  return [];
}

// ============================================
// DATE AUTO-FILL SETUP
// ============================================

/**
 * Setup auto-fill for derived dates based on sampling date
 * Performs Date = Sampling + 1 day
 * Determined/Concluded/Approved = Sampling + 3 days
 */
function setupFormDateAutoFill() {
  const samplingDateInput = document.getElementById('samplingDate');
  if (!samplingDateInput) return;
  
  // Set default to today (local timezone)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  samplingDateInput.value = today;
  
  // Add change listener
  samplingDateInput.addEventListener('change', function() {
    updateFormDerivedDates(this.value);
  });
  
  // Initialize derived dates
  updateFormDerivedDates(today);
}

/**
 * Update derived dates based on sampling date
 * @param {string} samplingDate - Sampling date in YYYY-MM-DD format
 */
function updateFormDerivedDates(samplingDate) {
  if (!samplingDate) return;

  // Parse date components to avoid timezone issues
  const [year, month, day] = samplingDate.split('-').map(Number);
  const samplingDateObj = new Date(year, month - 1, day);

  // Performed Date = Sampling Date + 1 day
  const performedDate = new Date(samplingDateObj);
  performedDate.setDate(performedDate.getDate() + 1);
  
  const performedInput = document.getElementById('performedDate');
  if (performedInput) {
    performedInput.value = formatDateYMD(performedDate);
  }

  // Determined, Concluded, Approved Date = Sampling Date + 3 days
  const plus3Date = new Date(samplingDateObj);
  plus3Date.setDate(plus3Date.getDate() + 3);
  const plus3DateStr = formatDateYMD(plus3Date);

  ['determinedDate', 'concludedDate', 'approvedDate'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = plus3DateStr;
    }
  });
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// WORKSHEET NUMBER GENERATION
// ============================================

/**
 * Fetch next document number from Google Sheet
 * @param {string} status - Current status
 * @param {Object} config - Form config with worksheetPrefix
 * @returns {Promise<Object>} Object with worksheetNo and docNo
 */
async function fetchFormNextDocNo(status, config) {
  console.log('🔄 Fetching next DocNo for status:', status);

  try {
    if (!SYNC_CONFIG.SCRIPT_URL) {
      console.log('No script URL configured, using fallback');
      return generateLocalDocNo(config);
    }

    const url = `${SYNC_CONFIG.SCRIPT_URL}?action=getNextDocNo&status=${encodeURIComponent(status)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.nextDocNo) {
      console.log('✅ Got next DocNo from Sheet:', result.nextDocNo);
      return {
        worksheetNo: result.worksheetNo || result.nextDocNo,
        docNo: result.nextDocNo
      };
    }
  } catch (error) {
    console.error('Fetch next DocNo error:', error);
  }

  return generateLocalDocNo(config);
}

/**
 * Generate local document number as fallback
 * @param {Object} config - Form config with worksheetPrefix
 * @returns {Object} Object with worksheetNo and docNo
 */
function generateLocalDocNo(config) {
  const year = new Date().getFullYear().toString().slice(-2);
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  const prefix = config.worksheetPrefix || 'XX';
  
  const docNo = `${prefix}-${year}-${sequence}`;
  
  return {
    worksheetNo: docNo,
    docNo: docNo
  };
}

// ============================================
// PASTE HANDLER SETUP
// ============================================

/**
 * Setup paste handler for Excel import
 * @param {string} tableBodyId - ID of the table body element
 * @param {Function} processFn - Function to process pasted data
 */
function setupFormPasteHandler(tableBodyId, processFn) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  tbody.addEventListener('paste', async (e) => {
    // Get pasted text
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');

    if (!pastedText) return;

    // Parse pasted data
    const lines = pastedText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If single item without tabs, let normal paste happen
    if (lines.length <= 1 && !pastedText.includes('\t')) return;

    // Prevent default paste
    e.preventDefault();

    // Parse each line into columns
    const parsedData = lines.map(line => {
      const cols = line.split('\t').map(col => col.trim());
      return cols;
    });

    console.log(`📋 Pasted ${parsedData.length} rows from Excel`);

    // Call processing function
    if (processFn) {
      await processFn(parsedData);
    }
  });

  console.log('✅ Paste handler setup complete');
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate required form fields
 * @param {Array<string>} requiredFields - Array of field IDs
 * @returns {Object} Object with isValid and errors array
 */
function validateFormFields(requiredFields) {
  const errors = [];

  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const value = field.value.trim();
    if (!value) {
      const label = field.closest('.form-group')?.querySelector('label')?.textContent || fieldId;
      errors.push(`${label} จำเป็นต้องกรอก`);
      field.classList.add('error');
    } else {
      field.classList.remove('error');
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate samples have required data
 * @param {Array} samples - Samples array
 * @param {boolean} hasMultipleResults - Whether form has multiple result columns
 * @returns {Object} Object with isValid and errors array
 */
function validateFormSamples(samples, hasMultipleResults = false) {
  const errors = [];

  if (!samples || samples.length === 0) {
    errors.push('ต้องมีข้อมูล Sampling อย่างน้อย 1 รายการ');
    return { isValid: false, errors };
  }

  samples.forEach((sample, index) => {
    if (!sample.samplingPoint) {
      errors.push(`Row ${index + 1}: Sampling Point จำเป็นต้องกรอก`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// ============================================
// FORM DATA COLLECTION HELPERS
// ============================================

/**
 * Get value from form field with fallback
 * @param {string} fieldId - Field ID
 * @param {string} fallback - Fallback value
 * @returns {string} Field value or fallback
 */
function getFormFieldValue(fieldId, fallback = '') {
  const field = document.getElementById(fieldId);
  return field ? field.value.trim() : fallback;
}

/**
 * Get checkbox state from form field
 * @param {string} fieldId - Field ID
 * @returns {boolean} Checkbox checked state
 */
function getFormCheckboxValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.checked : false;
}

// ============================================
// FORM RESET
// ============================================

/**
 * Reset form to initial state
 * @param {string} formId - Form element ID (optional)
 */
function resetFormFields(formId = null) {
  if (formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
  }

  // Clear error states
  document.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
  });

  // Reset date fields
  setupFormDateAutoFill();
}

// ============================================
// SAMPLE ROW MANAGEMENT
// ============================================

/**
 * Create sample row HTML template
 * @param {number} rowId - Row ID
 * @param {boolean} hasMultipleResults - Whether to show multiple result columns
 * @param {string} inputMode - 'dropdown' or 'text'
 * @param {Array} samplingPoints - Available sampling points for dropdown
 * @returns {string} HTML string for row
 */
function createSampleRowHTML(rowId, hasMultipleResults, inputMode = 'dropdown', samplingPoints = []) {
  const pointOptions = samplingPoints.map(p => 
    `<option value="${p.samplingPoint}">${p.samplingPoint}</option>`
  ).join('');

  const pointInput = inputMode === 'dropdown' 
    ? `<select id="point-${rowId}" class="sampling-point-select" onchange="onSamplingPointChange(${rowId})">
         <option value="">-- เลือก --</option>
         ${pointOptions}
       </select>`
    : `<input type="text" id="point-${rowId}" class="form-input sampling-point-input" placeholder="Sampling Point">`;

  const resultColumns = hasMultipleResults
    ? `<td>
         <input type="number" id="result1-${rowId}" class="form-input result-input" min="0" step="1" 
                placeholder="0" onchange="calculateRowAverage(${rowId})">
       </td>
       <td>
         <input type="number" id="result2-${rowId}" class="form-input result-input" min="0" step="1" 
                placeholder="0" onchange="calculateRowAverage(${rowId})">
       </td>
       <td>
         <span id="avg-${rowId}" class="avg-display">-</span>
       </td>`
    : `<td>
         <input type="number" id="result-${rowId}" class="form-input result-input" min="0" step="1" placeholder="0">
       </td>`;

  return `
    <tr id="row-${rowId}" data-row-id="${rowId}">
      <td class="row-number">${rowId}</td>
      <td class="sampling-point-cell">${pointInput}</td>
      <td>
        <input type="text" id="tag-${rowId}" class="form-input tag-input" readonly placeholder="Auto">
      </td>
      <td>
        <input type="text" id="location-${rowId}" class="form-input location-input" readonly placeholder="Auto">
      </td>
      ${resultColumns}
      <td>
        <button type="button" class="btn-icon btn-remove" onclick="removeSampleRow(${rowId})" title="ลบแถว">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
}

// ============================================
// LOG
// ============================================
console.log('✅ form-utils.js loaded');
