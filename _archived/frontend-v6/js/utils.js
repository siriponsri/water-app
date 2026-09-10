/**
 * ============================================
 * WATER RECORD APP - Utility Functions
 * ============================================
 */

// ============================================
// CONSTANTS
// ============================================
const APP_CONFIG = {
  APP_NAME: 'Water Record System',
  VERSION: '1.0.0',
  STORAGE_PREFIX: 'waterapp_',
  GOOGLE_SCRIPT_URL: '', // Will be set after deploying Apps Script
  BACKUP_PATH: '', // Machine-specific backup path is intentionally not hard-coded
};

// ============================================
// DATA TRANSFORMATION HELPERS
// ============================================

/**
 * Format result value for storage/display
 * - Round UP to integer (0 decimal places)
 * - If value is 0, return "<1"
 * @param {string|number} value - Result value
 * @returns {string} Formatted result
 */
function formatResultValue(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  
  // Parse as number
  const num = parseFloat(value);
  
  // Check if valid number
  if (isNaN(num)) {
    return String(value);
  }
  
  // If 0, return "<1"
  if (num === 0) {
    return '<1';
  }
  
  // Round UP (ceiling) to integer
  const rounded = Math.ceil(num);
  
  return String(rounded);
}

/**
 * Preserve leading zeros by adding single quote prefix
 * For Google Sheets to treat as text instead of number
 * @param {string} value - Value to check
 * @returns {string} Value with ' prefix if has leading zero
 */
function preserveLeadingZeros(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  // Check if starts with 0 and has more digits
  // e.g., "031125" should become "'031125"
  if (/^0\d+$/.test(value)) {
    return "'" + value;
  }
  
  return value;
}

/**
 * Strip leading apostrophe (from Google Sheet text prefix)
 * Use when reading data from Google Sheet for display/PDF
 * @param {string} value - Value from Google Sheet
 * @returns {string} Clean value
 */
function stripApostrophe(value) {
  if (!value) return '';
  const str = String(value);
  return str.startsWith("'") ? str.substring(1) : str;
}

/**
 * Format date to DD Mon YYYY (e.g., 20 Nov 2025)
 * @param {string|Date|number} dateValue - Date to format
 * @returns {string} Formatted date or empty string
 */
function formatDateDMY(dateValue) {
  if (!dateValue) return '';
  
  // Month names (English short)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  try {
    let day, month, year;
    
    // Debug log
    console.log('[formatDateDMY] Input:', dateValue, 'Type:', typeof dateValue);
    
    // Handle Date object
    if (dateValue instanceof Date) {
      day = dateValue.getDate();
      month = dateValue.getMonth();
      year = dateValue.getFullYear();
    } 
    // Handle string
    else if (typeof dateValue === 'string') {
      // Already in DD Mon YYYY format (e.g., "20 Nov 2025")
      if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateValue)) {
        return dateValue;
      }
      // Already in DD/MM/YYYY format - convert to new format
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
        const parts = dateValue.split('/');
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      // ISO format with T (2025-11-20T00:00:00 or 2026-01-23T17:00:00.000Z)
      // Must use Date object to convert UTC to local timezone
      else if (dateValue.includes('T')) {
        const parsed = new Date(dateValue);
        day = parsed.getDate();
        month = parsed.getMonth();
        year = parsed.getFullYear();
      }
      // YYYY-MM-DD format - parse directly without Date object to avoid timezone issues
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const parts = dateValue.split('-');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
      // DD-MM-YYYY format (e.g., 23-12-2025)
      else if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
        const parts = dateValue.split('-');
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      // Google Sheets serial date (number as string)
      else if (/^\d+(\.\d+)?$/.test(dateValue)) {
        const serial = parseFloat(dateValue);
        // Excel/Google Sheets serial date (days since 1899-12-30)
        // Use UTC to avoid timezone issues
        const msPerDay = 86400000;
        const excelEpoch = Date.UTC(1899, 11, 30);
        const utcDate = new Date(excelEpoch + serial * msPerDay);
        day = utcDate.getUTCDate();
        month = utcDate.getUTCMonth();
        year = utcDate.getUTCFullYear();
      }
      else {
        // Fallback - try parsing with noon time to avoid timezone issues
        // First try adding T12:00:00
        let parsed = new Date(dateValue + 'T12:00:00');
        if (isNaN(parsed.getTime())) {
          // If that fails, try direct parsing
          parsed = new Date(dateValue);
        }
        if (!isNaN(parsed.getTime())) {
          day = parsed.getDate();
          month = parsed.getMonth();
          year = parsed.getFullYear();
        } else {
          return String(dateValue);
        }
      }
    }
    // Handle number (Google Sheets serial date)
    else if (typeof dateValue === 'number') {
      const msPerDay = 86400000;
      const excelEpoch = Date.UTC(1899, 11, 30);
      const utcDate = new Date(excelEpoch + dateValue * msPerDay);
      day = utcDate.getUTCDate();
      month = utcDate.getUTCMonth();
      year = utcDate.getUTCFullYear();
    }
    
    if (day === undefined || month === undefined || year === undefined) {
      return String(dateValue);
    }
    
    const result = `${String(day).padStart(2, '0')} ${monthNames[month]} ${year}`;
    console.log('[formatDateDMY] Output:', result, 'from', { day, month: month + 1, year });
    return result;
  } catch (e) {
    console.warn('formatDateDMY error:', e, 'value:', dateValue);
    return String(dateValue || '');
  }
}

/**
 * Fields that may contain leading zeros and need preservation
 * Covers both PW-PRW and WFI-PUS forms
 */
const LEADING_ZERO_FIELDS = [
  // PW-PRW
  'lotTSA',
  'lotPCA', 
  'lotPlate',
  'lotPipette',
  // WFI-PUS
  'lotMembrane',
  'lotForceps',
  'lotBuffer',
  // Compressed Air / EM Air
  'lotMedia',
  'lotOther',
  // Common
  'incNo'
];

/**
 * Fields that must be stored as text (not date) in Google Sheets.
 * These get apostrophe prefix to prevent auto-date conversion.
 * Covers CA and EM Air forms (mfgMedia/expMedia in dd/mm/yyyy format like "08/09/2026").
 */
const FORCE_TEXT_FIELDS = [
  'mfgMedia',
  'expMedia'
];

/**
 * Force a value to be treated as text in Google Sheets.
 * Always adds single-quote prefix so Sheets never interprets as date/number.
 * @param {string} value - Value to protect
 * @returns {string} Value with ' prefix, or empty string
 */
function forceTextForSheets(value) {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return value || '';
  }
  // Already has apostrophe prefix
  if (value.startsWith("'")) return value;
  return "'" + value;
}

/**
 * Ensure a mfgMedia / expMedia value is a plain string in dd/mm/yyyy format.
 * Handles cases where Google Sheets returns a serial date number,
 * an ISO date string (2026-09-08), or an apostrophe-prefixed string.
 * @param {*} value - Value from data (could be string, number, Date)
 * @returns {string} Clean string like "08/09/2026"
 */
function ensureDateFieldString(value) {
  if (value === null || value === undefined || value === '') return '';

  // Strip leading apostrophe (from Sheets text-force prefix)
  let str = String(value);
  if (str.startsWith("'")) str = str.substring(1);

  // If it's a pure number (Google Sheets serial date), convert back to dd/mm/yyyy
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    // Only treat as serial date if reasonable range (> 1000 = ~1902+)
    if (serial > 1000) {
      const msPerDay = 86400000;
      const excelEpoch = Date.UTC(1899, 11, 30);
      const utcDate = new Date(excelEpoch + serial * msPerDay);
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // If it looks like an ISO date (2026-01-01 or 2026-01-01T00:00:00.000Z), extract dd/mm/yyyy
  if (/^\d{4}-\d{2}/.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch(_) { /* fall through */ }
  }

  return str;
}

/**
 * Fields that need result formatting (ceil + 0 becomes <1)
 * Covers both PW-PRW and WFI-PUS forms
 */
const RESULT_VALUE_FIELDS = [
  // PW-PRW
  'rightEM',
  'leftEM',
  'negativeValue',
  // WFI-PUS additional
  'rightHand',
  'leftHand'
];

/**
 * Prepare record data for Google Sheets
 * - Format result values (ceil + <1 for 0)
 * - Add ' prefix to fields with leading zeros
 * @param {Object} data - Record data
 * @returns {Object} Transformed data for Google Sheets
 */
function prepareDataForGoogleSheets(data) {
  if (!data) return data;
  
  // Clone to avoid mutation
  const prepared = JSON.parse(JSON.stringify(data));
  
  // Format leading zero fields
  LEADING_ZERO_FIELDS.forEach(field => {
    if (prepared[field]) {
      prepared[field] = preserveLeadingZeros(String(prepared[field]));
    }
  });

  // Force text fields (mfgMedia, expMedia) — prevent Google Sheets date auto-conversion
  FORCE_TEXT_FIELDS.forEach(field => {
    if (prepared[field] !== undefined && prepared[field] !== '') {
      prepared[field] = forceTextForSheets(String(prepared[field]));
    }
  });
  
  // Format result value fields (rightEM, leftEM, negativeValue)
  RESULT_VALUE_FIELDS.forEach(field => {
    if (prepared[field] !== undefined && prepared[field] !== '') {
      prepared[field] = formatResultValue(prepared[field]);
    }
  });
  
  // Format result values in samples
  if (prepared.samples && Array.isArray(prepared.samples)) {
    prepared.samples = prepared.samples.map(sample => {
      const formatted = { ...sample };
      // Water: result1, result2, resultAvg
      if (sample.result1 !== undefined) formatted.result1 = formatResultValue(sample.result1);
      if (sample.result2 !== undefined) formatted.result2 = formatResultValue(sample.result2);
      if (sample.resultAvg !== undefined) formatted.resultAvg = formatResultValue(sample.resultAvg);
      // Compressed Air: occResult
      if (sample.occResult !== undefined) formatted.occResult = formatResultValue(sample.occResult);
      // EM Air: occurResult
      if (sample.occurResult !== undefined) formatted.occurResult = formatResultValue(sample.occurResult);
      return formatted;
    });
  }
  
  console.log('[DATA] Prepared for Google Sheets:', {
    leadingZeros: LEADING_ZERO_FIELDS.filter(f => prepared[f]?.startsWith("'")),
    resultFields: RESULT_VALUE_FIELDS.map(f => `${f}: ${prepared[f]}`),
    sampleCount: prepared.samples?.length || 0
  });
  
  return prepared;
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
const Storage = {
  get(key) {
    try {
      const value = localStorage.getItem(APP_CONFIG.STORAGE_PREFIX + key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.set error:', e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(APP_CONFIG.STORAGE_PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(APP_CONFIG.STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
};

// ============================================
// DATE HELPERS
// ============================================
const DateUtils = {
  // Get today's date in YYYY-MM-DD format (local timezone)
  today() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Format date to Thai format
  formatThai(dateStr) {
    if (!dateStr) return '';
    // Parse date carefully to avoid timezone issues
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // For YYYY-MM-DD format, parse components directly
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr + 'T12:00:00');
    }
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Format date to DD Mon YYYY (e.g., 20 Nov 2025)
  formatDMY(dateStr) {
    // Use the main formatDateDMY function to avoid timezone issues
    return formatDateDMY(dateStr);
  },

  // Get current year (2 digits)
  getCurrentYear2Digit() {
    return String(new Date().getFullYear()).slice(-2);
  },

  // Get timestamp
  timestamp() {
    return new Date().toISOString();
  }
};

// ============================================
// WORKSHEET NUMBER GENERATOR
// ============================================
const WorksheetNo = {
  // Generate worksheet number based on status
  async generate(status = 'Routine') {
    let prefix, formatKey;
    
    switch(status) {
      case 'PQ1-2/OLD':
        prefix = 'PQ-OLD';
        formatKey = 'PQ_OLD';
        break;
      case 'PQ1-2/OCL':
        prefix = 'PQ-OCL';
        formatKey = 'PQ_OCL';
        break;
      case 'RAMA6':
        prefix = 'RA6';
        formatKey = 'RA6';
        break;
      case 'Routine':
      default:
        const year = DateUtils.getCurrentYear2Digit();
        prefix = `WT-${year}`;
        formatKey = `WT_${year}`;
        break;
    }
    
    const key = `lastSeq_${formatKey}`;
    
    // Sync running number from Google Sheets first (if online)
    if (Network.isOnline() && typeof syncRunningNumbersFromSheet === 'function') {
      try {
        await syncRunningNumbersFromSheet();
      } catch (error) {
        console.warn('Could not sync running numbers, using local:', error);
      }
    }
    
    // Get last sequence number
    let lastSeq = Storage.get(key) || 0;
    lastSeq++;
    
    // Save new sequence
    Storage.set(key, lastSeq);
    
    // Format: WT-25-0001, PQ-OLD-0001, PQ-OCL-0001, RA6-0001
    const seqStr = String(lastSeq).padStart(4, '0');
    return `${prefix}-${seqStr}`;
  },

  // Parse worksheet number
  parse(worksheetNo) {
    // Match patterns: WT-25-0001, PQ-OLD-0001, PQ-OCL-0001, RA6-0001
    const routineMatch = worksheetNo.match(/^WT-(\d{2})-(\d{4})$/);
    if (routineMatch) {
      return {
        prefix: 'WT',
        year: routineMatch[1],
        sequence: parseInt(routineMatch[2], 10),
        status: 'Routine'
      };
    }
    
    const pqOldMatch = worksheetNo.match(/^PQ-OLD-(\d{4})$/);
    if (pqOldMatch) {
      return {
        prefix: 'PQ-OLD',
        sequence: parseInt(pqOldMatch[1], 10),
        status: 'PQ1-2/OLD'
      };
    }
    
    const pqOclMatch = worksheetNo.match(/^PQ-OCL-(\d{4})$/);
    if (pqOclMatch) {
      return {
        prefix: 'PQ-OCL',
        sequence: parseInt(pqOclMatch[1], 10),
        status: 'PQ1-2/OCL'
      };
    }
    
    const ra6Match = worksheetNo.match(/^RA6-(\d{4})$/);
    if (ra6Match) {
      return {
        prefix: 'RA6',
        sequence: parseInt(ra6Match[1], 10),
        status: 'RAMA6'
      };
    }
    
    return null;
  }
};

// ============================================
// UI HELPERS
// ============================================
const UI = {
  // Show loading overlay
  showLoading(message = 'กำลังโหลด...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.querySelector('.loading-text').textContent = message;
      overlay.style.display = 'flex';
    }
  },

  // Hide loading overlay
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  // Show toast notification
  showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.success}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Show modal
  showModal(options) {
    const { title, message, type = 'info', onConfirm, onCancel, confirmText = 'ตกลง', cancelText = 'ยกเลิก', showCancel = true } = options;
    
    const overlay = document.getElementById('modalOverlay');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    const modalFooter = document.getElementById('modalFooter');

    if (!overlay) return;

    // Set icon type
    modalIcon.className = `modal__icon modal__icon--${type}`;
    
    const icons = {
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };
    
    modalIcon.innerHTML = icons[type] || icons.info;
    modalTitle.textContent = title;
    modalText.textContent = message;

    // Store callbacks
    window._modalOnConfirm = onConfirm;
    window._modalOnCancel = onCancel;

    // Update footer buttons
    modalFooter.innerHTML = `
      ${showCancel ? `<button class="btn btn--secondary" onclick="closeModal()">${cancelText}</button>` : ''}
      <button class="btn btn--primary" onclick="confirmModal()">${confirmText}</button>
    `;

    overlay.classList.add('active');
  },

  // Close modal
  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      if (window._modalOnCancel) {
        window._modalOnCancel();
      }
    }
  },

  // Confirm modal
  confirmModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      if (window._modalOnConfirm) {
        window._modalOnConfirm();
      }
    }
  }
};

// Global modal functions
function closeModal() { UI.closeModal(); }
function confirmModal() { UI.confirmModal(); }

// ============================================
// NETWORK STATUS
// ============================================
const Network = {
  isOnline() {
    return navigator.onLine;
  },

  // Update connection status badge
  updateStatus() {
    const badge = document.getElementById('connectionStatus');
    if (!badge) return;

    if (this.isOnline()) {
      badge.className = 'status-badge status-badge--online';
      badge.innerHTML = '<span class="status-dot"></span><span>Online</span>';
    } else {
      badge.className = 'status-badge status-badge--offline';
      badge.innerHTML = '<span class="status-dot"></span><span>Offline</span>';
    }
  },

  // Setup listeners
  init() {
    window.addEventListener('online', () => {
      this.updateStatus();
      UI.showToast('กลับมา Online แล้ว', 'success');
      // Trigger sync check
      if (typeof checkPendingSync === 'function') {
        checkPendingSync();
      }
    });

    window.addEventListener('offline', () => {
      this.updateStatus();
      UI.showToast('ขาดการเชื่อมต่อ Internet', 'warning');
    });

    this.updateStatus();
  }
};

// ============================================
// VALIDATION HELPERS
// ============================================
const Validate = {
  required(value, fieldName) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} จำเป็นต้องกรอก`;
    }
    return null;
  },

  number(value, fieldName) {
    if (value && isNaN(Number(value))) {
      return `${fieldName} ต้องเป็นตัวเลข`;
    }
    return null;
  },

  date(value, fieldName) {
    if (value && isNaN(Date.parse(value))) {
      return `${fieldName} รูปแบบวันที่ไม่ถูกต้อง`;
    }
    return null;
  }
};

// ============================================
// FILE EXPORT HELPERS
// ============================================
const FileExport = {
  // Export data as JSON file
  toJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.download(blob, filename);
  },

  // Export data as CSV file
  toCSV(data, filename, headers) {
    const csvRows = [];
    
    // Add headers
    if (headers) {
      csvRows.push(headers.join(','));
    }
    
    // Add data rows
    data.forEach(row => {
      const values = Object.values(row).map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const csv = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, filename);
  },

  // Download blob as file
  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// ============================================
// AVERAGE CALCULATOR
// ============================================
function calculateAverage(val1, val2) {
  const num1 = parseFloat(val1) || 0;
  const num2 = parseFloat(val2) || 0;
  
  // If both are 0, return 0
  if (num1 === 0 && num2 === 0) return '0';
  
  // If only one has value, return that value (ceiling)
  if (!val1 || num1 === 0) return String(Math.ceil(num2));
  if (!val2 || num2 === 0) return String(Math.ceil(num1));
  
  // Calculate average and round up (ceiling)
  const avg = (num1 + num2) / 2;
  return String(Math.ceil(avg));
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  Network.init();
});

console.log(`${APP_CONFIG.APP_NAME} v${APP_CONFIG.VERSION} loaded`);
