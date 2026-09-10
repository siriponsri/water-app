/**
 * ============================================
 * ANF3 QC Auto Sync - Upsert and Logging
 * ============================================
 */

// ============================================================================
// UPSERT FUNCTIONS
// ============================================================================

/**
 * Upsert a record to target sheet
 * @param {Sheet} targetSheet - Target Google Sheet
 * @param {Object} record - Record object with field names as keys
 * @param {String} keyField - Field name to use as primary key (e.g., 'worksheetNo')
 * @return {String} 'INSERT' or 'UPDATE' or 'SKIP'
 */
function upsertTargetRow(targetSheet, record, keyField) {
  const keyValue = record[keyField];
  if (!keyValue) {
    Logger.log('Cannot upsert: missing key field');
    return 'SKIP';
  }

  // Get all data from target sheet
  const targetData = targetSheet.getDataRange().getValues();
  if (targetData.length < 1) {
    Logger.log('Error: target sheet has no headers');
    return 'SKIP';
  }

  const headers = targetData[0].map(h => String(h || '').trim());
  const keyIndex = headers.indexOf(keyField);

  if (keyIndex === -1) {
    Logger.log(`Error: key field '${keyField}' not found in target sheet`);
    return 'SKIP';
  }

  // Find existing row
  let existingRowIndex = -1;
  for (let i = 1; i < targetData.length; i++) {
    if (targetData[i][keyIndex] === keyValue) {
      existingRowIndex = i;
      break;
    }
  }

  // Prepare row values
  const rowValues = headers.map(header => {
    if (record.hasOwnProperty(header)) {
      return record[header];
    }
    return null;
  });

  if (existingRowIndex !== -1) {
    // UPDATE existing row
    const rowNumber = existingRowIndex + 1;

    // Preserve createdAt and createdBy
    const createdAtIndex = headers.indexOf('createdAt');
    const createdByIndex = headers.indexOf('createdBy');

    if (createdAtIndex !== -1) {
      rowValues[createdAtIndex] = targetData[existingRowIndex][createdAtIndex];
    }
    if (createdByIndex !== -1) {
      rowValues[createdByIndex] = targetData[existingRowIndex][createdByIndex];
    }

    // Update updatedAt
    const updatedAtIndex = headers.indexOf('updatedAt');
    if (updatedAtIndex !== -1) {
      rowValues[updatedAtIndex] = new Date();
    }

    targetSheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
    Logger.log(`Updated row ${rowNumber} for ${keyField}=${keyValue}`);
    return 'UPDATE';

  } else {
    // INSERT new row
    targetSheet.appendRow(rowValues);
    Logger.log(`Inserted new row for ${keyField}=${keyValue}`);
    return 'INSERT';
  }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Append log entry to logs sheet
 * @param {String} spreadsheetId - Target spreadsheet ID
 * @param {String} action - Action type (e.g., INSERT_AIR_EM, UPDATE_WATER_WFI)
 * @param {String} worksheetNo - Worksheet number or null
 * @param {String} username - User email
 * @param {String} details - Additional details or error message
 */
function appendLog(spreadsheetId, action, worksheetNo, username, details) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const logsSheet = spreadsheet.getSheetByName(CONFIG.TARGET_SHEETS.LOGS);

    if (!logsSheet) {
      Logger.log('Warning: logs sheet not found, skipping log');
      return;
    }

    const timestamp = new Date();
    const logEntry = [
      timestamp,
      action,
      worksheetNo || '',
      username || '',
      details || ''
    ];

    logsSheet.appendRow(logEntry);

  } catch (e) {
    Logger.log(`Error writing log: ${e}`);
    // Don't throw - logging failure shouldn't break sync
  }
}
