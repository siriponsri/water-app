/**
 * ============================================
 * ANF3 QC Auto Sync - Worksheet Number Management
 * ============================================
 * Auto-generate worksheetNo and map back to source sheets
 */

// ============================================================================
// WORKSHEET NUMBER GENERATION
// ============================================================================

/**
 * Generate new worksheetNo with auto-increment
 * Format: {PREFIX}-{YEAR}-{NUMBER}
 * Example: AT-26-0001, WT-26-0045
 *
 * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
 * @return {String} Generated worksheetNo
 */
function generateWorksheetNo(formType) {
  const prefix = CONFIG.WORKSHEET_NO_PREFIXES[formType];
  if (!prefix) {
    throw new Error(`Unknown formType: ${formType}`);
  }

  const year = getCurrentYear(); // e.g., "26" for 2026
  const propertyKey = `lastWorksheetNo_${prefix}_${year}`;

  // Use script properties for persistence
  const scriptProperties = PropertiesService.getScriptProperties();

  // Get last number (default to 0)
  let lastNumber = parseInt(scriptProperties.getProperty(propertyKey) || '0');

  // Increment
  const newNumber = lastNumber + 1;

  // Save back
  scriptProperties.setProperty(propertyKey, String(newNumber));

  // Format: PREFIX-YEAR-NUMBER (zero-padded to 4 digits)
  const worksheetNo = `${prefix}-${year}-${String(newNumber).padStart(4, '0')}`;

  Logger.log(`Generated worksheetNo: ${worksheetNo} (${formType})`);
  return worksheetNo;
}

/**
 * Get the last worksheetNo for a given formType (for debugging)
 * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
 * @return {String} Last worksheetNo or null
 */
function getLastWorksheetNo(formType) {
  const prefix = CONFIG.WORKSHEET_NO_PREFIXES[formType];
  const year = getCurrentYear();
  const propertyKey = `lastWorksheetNo_${prefix}_${year}`;

  const scriptProperties = PropertiesService.getScriptProperties();
  const lastNumber = scriptProperties.getProperty(propertyKey);

  if (!lastNumber) return null;

  return `${prefix}-${year}-${String(lastNumber).padStart(4, '0')}`;
}

/**
 * Reset running number for a formType (use with caution!)
 * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
 * @param {Number} startFrom - Number to start from (default: 0)
 */
function resetWorksheetNoCounter(formType, startFrom) {
  startFrom = startFrom || 0;
  const prefix = CONFIG.WORKSHEET_NO_PREFIXES[formType];
  const year = getCurrentYear();
  const propertyKey = `lastWorksheetNo_${prefix}_${year}`;

  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(propertyKey, String(startFrom));

  Logger.log(`Reset ${formType} counter to ${startFrom}`);
}

// ============================================================================
// MAP WORKSHEET NO BACK TO SOURCE
// ============================================================================

/**
 * Map worksheetNo back to source sheet rows
 * Updates the worksheetNo column for all rows in the group
 *
 * Strategy: Match by composite key (samplingDate + building + samplingPoint/roomNo)
 *
 * @param {Sheet} sourceSheet - Source sheet object
 * @param {Array} rowsInGroup - Array of row objects that belong to this group
 * @param {String} worksheetNo - The worksheetNo to write back
 * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
 * @return {Number} Number of rows updated
 */
function mapWorksheetNoBack(sourceSheet, rowsInGroup, worksheetNo, formType) {
  if (!sourceSheet || !rowsInGroup || rowsInGroup.length === 0) {
    Logger.log('mapWorksheetNoBack: Invalid input');
    return 0;
  }

  // Get worksheetNo column name for this formType
  const worksheetNoColumn = CONFIG.SOURCE_WORKSHEET_NO_COLUMN[formType];
  if (!worksheetNoColumn) {
    Logger.log(`Warning: No worksheetNo column defined for ${formType}`);
    return 0;
  }

  // Get all headers from source sheet
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[String(header).trim()] = index + 1; // Column index (1-based)
  });

  const worksheetNoColIndex = headerMap[worksheetNoColumn];
  if (!worksheetNoColIndex) {
    Logger.log(`Warning: Column '${worksheetNoColumn}' not found in source sheet`);
    return 0;
  }

  let updatedCount = 0;

  // Update each row using stored _rowIndex
  for (const row of rowsInGroup) {
    const rowIndex = row._rowIndex;
    if (!rowIndex) {
      Logger.log('Warning: Row missing _rowIndex, skipping');
      continue;
    }

    try {
      // Write worksheetNo to the specific cell
      sourceSheet.getRange(rowIndex, worksheetNoColIndex).setValue(worksheetNo);
      updatedCount++;
    } catch (e) {
      Logger.log(`Error updating row ${rowIndex}: ${e}`);
    }
  }

  Logger.log(`Mapped ${worksheetNo} to ${updatedCount} rows in source sheet`);
  return updatedCount;
}

// ============================================================================
// UTILITY FUNCTIONS FOR WORKSHEET NO
// ============================================================================

/**
 * View all running numbers (for debugging)
 */
function viewAllWorksheetNoCounters() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();

  Logger.log('=== Current Worksheet Number Counters ===');
  for (const key in allProperties) {
    if (key.startsWith('lastWorksheetNo_')) {
      Logger.log(`${key}: ${allProperties[key]}`);
    }
  }
}

/**
 * Initialize running numbers from existing RPP2 data
 * Run this ONCE when deploying to production to sync with existing worksheetNos
 *
 * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
 */
function initializeWorksheetNoFromRPP2(formType) {
  Logger.log(`Initializing worksheetNo counter for ${formType}...`);

  const prefix = CONFIG.WORKSHEET_NO_PREFIXES[formType];
  const year = getCurrentYear();

  // Determine which target sheet to query
  let spreadsheetId, sheetName;
  if (formType === 'air-em') {
    spreadsheetId = CONFIG.TARGET_AIR_ID;
    sheetName = CONFIG.TARGET_SHEETS.AIR_EM;
  } else if (formType === 'air-ca') {
    spreadsheetId = CONFIG.TARGET_AIR_ID;
    sheetName = CONFIG.TARGET_SHEETS.AIR_CA;
  } else if (formType === 'water-prw') {
    spreadsheetId = CONFIG.TARGET_WATER_ID;
    sheetName = CONFIG.TARGET_SHEETS.WATER_PRW_PW;
  } else if (formType === 'water-wfi') {
    spreadsheetId = CONFIG.TARGET_WATER_ID;
    sheetName = CONFIG.TARGET_SHEETS.WATER_WFI;
  } else {
    throw new Error(`Unknown formType: ${formType}`);
  }

  // Read all worksheetNo from target sheet
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const worksheetNoColIndex = headers.indexOf('worksheetNo');

  if (worksheetNoColIndex === -1) {
    throw new Error('worksheetNo column not found');
  }

  // Find max number for this prefix and year
  let maxNumber = 0;
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

  for (let i = 1; i < data.length; i++) {
    const worksheetNo = data[i][worksheetNoColIndex];
    if (!worksheetNo) continue;

    const match = String(worksheetNo).match(pattern);
    if (match) {
      const number = parseInt(match[1]);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  // Set the counter
  const propertyKey = `lastWorksheetNo_${prefix}_${year}`;
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(propertyKey, String(maxNumber));

  Logger.log(`Initialized ${formType} counter to ${maxNumber} (found in RPP2)`);
  Logger.log(`Next worksheetNo will be: ${prefix}-${year}-${String(maxNumber + 1).padStart(4, '0')}`);
}

/**
 * Initialize ALL counters from RPP2 (run once on deployment)
 */
function initializeAllWorksheetNoCounters() {
  Logger.log('=== Initializing all worksheetNo counters from RPP2 ===');

  try {
    initializeWorksheetNoFromRPP2('air-em');
  } catch (e) {
    Logger.log(`Error initializing air-em: ${e}`);
  }

  try {
    initializeWorksheetNoFromRPP2('air-ca');
  } catch (e) {
    Logger.log(`Error initializing air-ca: ${e}`);
  }

  try {
    initializeWorksheetNoFromRPP2('water-prw');
  } catch (e) {
    Logger.log(`Error initializing water-prw: ${e}`);
  }

  try {
    initializeWorksheetNoFromRPP2('water-wfi');
  } catch (e) {
    Logger.log(`Error initializing water-wfi: ${e}`);
  }

  Logger.log('=== Initialization complete ===');
  viewAllWorksheetNoCounters();
}
