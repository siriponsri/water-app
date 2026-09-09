/**
 * ============================================
 * ANF3 QC Auto Sync - Web App API
 * ============================================
 * Provides REST-like API for water-app to read/update RPP2 data
 */

/**
 * Handle GET requests
 * Supports: fetch, get, search, ping
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    switch (action) {
      case 'ping':
        return jsonResponse({ success: true, message: 'API is running', timestamp: new Date() });

      case 'fetch':
        return handleFetch(params);

      case 'get':
        return handleGet(params);

      case 'search':
        return handleSearch(params);

      default:
        return jsonResponse({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (error) {
    Logger.log(`API Error: ${error}`);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests
 * Supports: update
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'update':
        return handleUpdate(data);

      default:
        return jsonResponse({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (error) {
    Logger.log(`API Error: ${error}`);
    return jsonResponse({ success: false, error: error.toString() }, 500);
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Fetch records by date range
 * Query params: formType, startDate, endDate
 */
function handleFetch(params) {
  const formType = params.formType;
  const startDate = params.startDate;
  const endDate = params.endDate;

  if (!formType || !startDate || !endDate) {
    return jsonResponse({ success: false, error: 'Missing parameters' }, 400);
  }

  // Determine which spreadsheet and sheet to query
  const { spreadsheetId, sheetName } = getTargetSheet(formType);

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return jsonResponse({ success: false, error: `Sheet not found: ${sheetName}` }, 404);
  }

  // Read all data
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const records = [];

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Find samplingDate column
  const dateColIndex = headers.indexOf('samplingDate');
  if (dateColIndex === -1) {
    return jsonResponse({ success: false, error: 'samplingDate column not found' }, 500);
  }

  // Filter and convert to objects
  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][dateColIndex]);

    if (rowDate >= start && rowDate <= end) {
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = data[i][j];
      }
      records.push(record);
    }
  }

  return jsonResponse({ success: true, data: records, count: records.length });
}

/**
 * Get single record by worksheetNo
 * Query params: worksheetNo
 */
function handleGet(params) {
  const worksheetNo = params.worksheetNo;

  if (!worksheetNo) {
    return jsonResponse({ success: false, error: 'Missing worksheetNo' }, 400);
  }

  // Determine formType from worksheetNo prefix
  const prefix = worksheetNo.split('-')[0];
  const formTypeMap = {
    'AT': 'air-em',
    'AC': 'air-ca',
    'WT': 'water-prw',
    'WP': 'water-wfi'
  };

  const formType = formTypeMap[prefix];
  if (!formType) {
    return jsonResponse({ success: false, error: 'Invalid worksheetNo prefix' }, 400);
  }

  const { spreadsheetId, sheetName } = getTargetSheet(formType);

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return jsonResponse({ success: false, error: `Sheet not found: ${sheetName}` }, 404);
  }

  // Find the record
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const worksheetNoColIndex = headers.indexOf('worksheetNo');

  if (worksheetNoColIndex === -1) {
    return jsonResponse({ success: false, error: 'worksheetNo column not found' }, 500);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][worksheetNoColIndex] === worksheetNo) {
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = data[i][j];
      }
      return jsonResponse({ success: true, data: record });
    }
  }

  return jsonResponse({ success: false, error: 'Record not found' }, 404);
}

/**
 * Search records
 * Query params: q (query), building, formType, startDate, endDate
 */
function handleSearch(params) {
  const query = params.q || '';
  const building = params.building || '';
  const formType = params.formType || '';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';

  // If formType specified, search only that type
  const formTypes = formType ? [formType] : ['air-em', 'air-ca', 'water-prw', 'water-wfi'];

  let allRecords = [];

  for (const ft of formTypes) {
    const { spreadsheetId, sheetName } = getTargetSheet(ft);

    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // Get column indices
      const worksheetNoColIndex = headers.indexOf('worksheetNo');
      const buildingColIndex = headers.indexOf('building');
      const dateColIndex = headers.indexOf('samplingDate');

      for (let i = 1; i < data.length; i++) {
        const row = data[i];

        // Filter by building
        if (building && row[buildingColIndex] !== building) continue;

        // Filter by date range
        if (startDate && endDate) {
          const rowDate = new Date(row[dateColIndex]);
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (rowDate < start || rowDate > end) continue;
        }

        // Search in worksheetNo
        if (query && !String(row[worksheetNoColIndex]).toLowerCase().includes(query.toLowerCase())) {
          continue;
        }

        // Convert to object
        const record = { formType: ft };
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = row[j];
        }
        allRecords.push(record);
      }
    } catch (e) {
      Logger.log(`Error searching ${ft}: ${e}`);
    }
  }

  // Sort by date descending
  allRecords.sort((a, b) => new Date(b.samplingDate) - new Date(a.samplingDate));

  return jsonResponse({ success: true, data: allRecords, count: allRecords.length });
}

/**
 * Update record fields
 * Body: { worksheetNo, updates: { field: value, ... } }
 */
function handleUpdate(data) {
  const worksheetNo = data.worksheetNo;
  const updates = data.updates;

  if (!worksheetNo || !updates) {
    return jsonResponse({ success: false, error: 'Missing parameters' }, 400);
  }

  // Determine formType from worksheetNo
  const prefix = worksheetNo.split('-')[0];
  const formTypeMap = {
    'AT': 'air-em',
    'AC': 'air-ca',
    'WT': 'water-prw',
    'WP': 'water-wfi'
  };

  const formType = formTypeMap[prefix];
  if (!formType) {
    return jsonResponse({ success: false, error: 'Invalid worksheetNo' }, 400);
  }

  const { spreadsheetId, sheetName } = getTargetSheet(formType);

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return jsonResponse({ success: false, error: `Sheet not found: ${sheetName}` }, 404);
  }

  // Find the record
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const worksheetNoColIndex = headers.indexOf('worksheetNo');

  if (worksheetNoColIndex === -1) {
    return jsonResponse({ success: false, error: 'worksheetNo column not found' }, 500);
  }

  let rowIndex = -1;
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][worksheetNoColIndex] === worksheetNo) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse({ success: false, error: 'Record not found' }, 404);
  }

  // Update fields
  const rowNumber = rowIndex + 1; // 1-based
  for (const field in updates) {
    const colIndex = headers.indexOf(field);
    if (colIndex !== -1) {
      sheet.getRange(rowNumber, colIndex + 1).setValue(updates[field]);
    }
  }

  // Update updatedAt
  const updatedAtColIndex = headers.indexOf('updatedAt');
  if (updatedAtColIndex !== -1) {
    sheet.getRange(rowNumber, updatedAtColIndex + 1).setValue(new Date());
  }

  // Log the update
  const userEmail = Session.getActiveUser().getEmail();
  appendLog(spreadsheetId, 'UPDATE_RECORD', worksheetNo, userEmail,
    `Updated fields: ${Object.keys(updates).join(', ')}`);

  return jsonResponse({ success: true, message: 'Record updated' });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get target spreadsheet and sheet name for formType
 */
function getTargetSheet(formType) {
  switch (formType) {
    case 'air-em':
      return { spreadsheetId: CONFIG.TARGET_AIR_ID, sheetName: CONFIG.TARGET_SHEETS.AIR_EM };
    case 'air-ca':
      return { spreadsheetId: CONFIG.TARGET_AIR_ID, sheetName: CONFIG.TARGET_SHEETS.AIR_CA };
    case 'water-prw':
      return { spreadsheetId: CONFIG.TARGET_WATER_ID, sheetName: CONFIG.TARGET_SHEETS.WATER_PRW_PW };
    case 'water-wfi':
      return { spreadsheetId: CONFIG.TARGET_WATER_ID, sheetName: CONFIG.TARGET_SHEETS.WATER_WFI };
    default:
      throw new Error(`Unknown formType: ${formType}`);
  }
}

/**
 * Return JSON response
 */
function jsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // Note: Apps Script Web Apps don't support custom status codes
  // But we return the status in the response for consistency
  data._statusCode = statusCode;

  return output;
}
