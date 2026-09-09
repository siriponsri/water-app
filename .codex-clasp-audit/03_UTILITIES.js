/**
 * ============================================
 * ANF3 QC Auto Sync - Utility Functions
 * ============================================
 * Data reading, validation, normalization
 */

// ============================================================================
// DATA READING
// ============================================================================

/**
 * Read existing records from RPP2 target sheet
 * Returns a map of groupKey -> worksheetNo for duplicate detection
 *
 * @param {Sheet} targetSheet - RPP2 target sheet
 * @param {Array<String>} groupByFields - Fields to group by (e.g., ['samplingDate', 'building'])
 * @return {Object} Map of groupKey -> worksheetNo
 */
function readExistingRecords(targetSheet, groupByFields) {
  const existingMap = {};

  try {
    const data = targetSheet.getDataRange().getValues();
    if (data.length < 2) {
      return existingMap; // Empty sheet
    }

    const headers = data[0].map(h => String(h || '').trim());
    const worksheetNoIndex = headers.indexOf('worksheetNo');

    if (worksheetNoIndex === -1) {
      Logger.log('Warning: worksheetNo column not found in target sheet');
      return existingMap;
    }

    // Get indices for groupBy fields
    const fieldIndices = {};
    for (const field of groupByFields) {
      const index = headers.indexOf(field);
      if (index === -1) {
        Logger.log(`Warning: field '${field}' not found in target sheet`);
        return existingMap;
      }
      fieldIndices[field] = index;
    }

    // Build map
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const worksheetNo = row[worksheetNoIndex];

      if (!worksheetNo) continue;

      // Build groupKey
      const keyParts = [];
      for (const field of groupByFields) {
        const index = fieldIndices[field];
        let value = row[index];

        // Normalize date fields
        if (field.toLowerCase().includes('date') && value) {
          value = normalizeDate(value);
        }

        keyParts.push(String(value || ''));
      }

      const groupKey = keyParts.join('|');
      existingMap[groupKey] = worksheetNo;
    }

    Logger.log(`Built existing records map with ${Object.keys(existingMap).length} entries`);
    return existingMap;

  } catch (e) {
    Logger.log(`Error reading existing records: ${e}`);
    return existingMap;
  }
}

/**
 * Insert a new record to target sheet (INSERT only, never UPDATE)
 * @param {Sheet} targetSheet - Target Google Sheet
 * @param {Object} record - Record object with field names as keys
 * @return {String} 'INSERT' or 'SKIP'
 */
function insertTargetRow(targetSheet, record) {
  try {
    // Get headers
    const targetData = targetSheet.getDataRange().getValues();
    if (targetData.length < 1) {
      Logger.log('Error: target sheet has no headers');
      return 'SKIP';
    }

    const headers = targetData[0].map(h => String(h || '').trim());

    // Prepare row values
    const rowValues = headers.map(header => {
      if (record.hasOwnProperty(header)) {
        return record[header];
      }
      return null;
    });

    // Append new row
    targetSheet.appendRow(rowValues);

    const worksheetNo = record.worksheetNo || 'unknown';
    Logger.log(`Inserted new row for worksheetNo=${worksheetNo}`);

    return 'INSERT';

  } catch (e) {
    Logger.log(`Error inserting row: ${e}`);
    return 'SKIP';
  }
}
/**
 * Reads a sheet and returns rows as objects using normalized headers.
 *
 * @param {Sheet} sheet - Google Sheet object
 * @return {Array} Array of objects with normalized headers as keys
 */
function readSheetAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h || '').trim());
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    row._rowIndex = i + 1; // Store original row index (1-based)
    let isEmpty = true;

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const value = data[i][j];

      if (value !== null && value !== undefined && value !== '') {
        isEmpty = false;
      }

      row[key] = value;
    }

    // Skip completely empty rows
    if (!isEmpty) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Group rows by specified keys
 * @param {Array} rows - Array of row objects
 * @param {Array} keys - Array of key names to group by
 * @return {Object} Object with composite keys pointing to arrays of rows
 */
function groupRows(rows, keys) {
  const groups = {};

  for (const row of rows) {
    const keyParts = keys.map(k => {
      const value = row[k];
      if (value instanceof Date) {
        return Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      }
      return String(value || '');
    });
    const compositeKey = keyParts.join('|');

    if (!groups[compositeKey]) {
      groups[compositeKey] = [];
    }
    groups[compositeKey].push(row);
  }

  return groups;
}

/**
 * Normalize date to Date object
 * Handles various date formats from Excel/Google Sheets
 */
function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  // Try parsing string dates
  if (typeof value === 'string') {
    // dd/MM/yyyy format (common in Thailand)
    const ddmmyyyyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1]);
      const month = parseInt(ddmmyyyyMatch[2]) - 1;
      const year = parseInt(ddmmyyyyMatch[3]);
      return new Date(year, month, day);
    }

    // yyyy-MM-dd format
    const yyyymmddMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1]);
      const month = parseInt(yyyymmddMatch[2]) - 1;
      const day = parseInt(yyyymmddMatch[3]);
      return new Date(year, month, day);
    }

    // Try default parsing
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Excel serial number
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }

  return null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Air EM row
 */
function isValidAirEMRow(row) {
  // Check exclude flag
  if (CONFIG.SKIP_EXCLUDED_ROWS) {
    const exclude = row.Exclude || row.exclude;
    if (exclude === true || exclude === 'X' || exclude === 'x' || exclude === 1) {
      return false;
    }
  }

  // Check mandatory fields
  if (!row['Sampling Date'] && !row.samplingDate) {
    return false;
  }
  if (!row.building) {
    return false;
  }
  if (!row.roomNo) {
    return false;
  }

  return true;
}

/**
 * Validate Air CA row
 */
function isValidAirCARow(row) {
  // Check exclude flag
  if (CONFIG.SKIP_EXCLUDED_ROWS) {
    const exclude = row.Exclude || row.exclude;
    if (exclude === true || exclude === 'X' || exclude === 'x' || exclude === 1) {
      return false;
    }
  }

  // Check mandatory fields
  if (!row.SamplingDate && !row.samplingDate) return false;
  if (!row.building) return false;
  if (!row.roomNo) return false;

  return true;
}

/**
 * Validate Water row (both PRW/PW and WFI)
 */
function isValidWaterRow(row) {
  // Check exclude flag
  if (CONFIG.SKIP_EXCLUDED_ROWS) {
    const exclude = row.Exclude || row.exclude;
    if (exclude === true || exclude === 'X' || exclude === 'x' || exclude === 1) {
      return false;
    }
  }

  // Check mandatory fields
  if (!row.samplingDate) return false;
  if (!row.samplingPoint) return false;
  if (!row.waterType) return false;

  // At least one result must be present
  if (!row.result1 && !row.resultAvg) {
    return false;
  }

  return true;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load CA database for grade lookup
 * @return {Object} Object with roomNo as key, containing grade info
 */
function loadCADatabase() {
  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SOURCE_AIR_ID);
  const dbSheet = sourceSpreadsheet.getSheetByName(CONFIG.SOURCE_SHEETS.AIR_CA_DATABASE);

  if (!dbSheet) {
    Logger.log('Warning: CA database sheet not found, using default grade D');
    return {};
  }

  const dbData = readSheetAsObjects(dbSheet);
  const database = {};

  for (const row of dbData) {
    const roomNo = row.roomNo || row['room no.'];
    if (roomNo) {
      database[roomNo] = {
        grade: row.Class || row.class || 'D',
        building: row.bld || row.building,
        location: row.roomName || row['room name']
      };
    }
  }

  Logger.log(`Loaded ${Object.keys(database).length} entries from CA database`);
  return database;
}

/**
 * Map waterType to formType
 * @param {String} waterType - Water type from source (PRW, PW, WFI)
 * @return {String} Form type for target
 */
function mapWaterTypeToFormType(waterType) {
  if (!waterType) return 'PW';

  const type = String(waterType).toUpperCase().trim();

  // Mapping logic
  if (type === 'PW') return 'PW';
  if (type === 'PRW') return 'PW-PRW';
  if (type === 'WFI') return 'WFI-PUS';
  if (type === 'PUS') return 'WFI-PUS';

  // Default
  return type;
}
