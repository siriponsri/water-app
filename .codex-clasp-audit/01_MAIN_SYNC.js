/**
 * ============================================
 * ANF3 QC Auto Sync - Main Sync Functions
 * ============================================
 */

/**
 * Main sync function - call this manually or via trigger
 * Syncs all data from source to target sheets with bidirectional mapping
 */
function syncAll() {
  const lock = LockService.getScriptLock();
  try {
    // Try to acquire lock for 30 seconds
    if (!lock.tryLock(30000)) {
      Logger.log('Could not acquire lock - another sync may be running');
      return { success: false, message: 'Another sync is already running' };
    }

    const batchId = Utilities.getUuid();
    const startTime = new Date();
    Logger.log(`Starting sync batch: ${batchId} at ${startTime}`);

    const results = {
      batchId: batchId,
      startTime: startTime,
      airEM: null,
      airCA: null,
      waterPRW: null,
      waterWFI: null,
      errors: []
    };

    // Sync Air EM
    try {
      results.airEM = syncAirEM(batchId);
    } catch (e) {
      results.errors.push({ system: 'Air EM', error: e.toString() });
      Logger.log(`Error syncing Air EM: ${e}`);
    }

    // Sync Air CA
    try {
      results.airCA = syncAirCA(batchId);
    } catch (e) {
      results.errors.push({ system: 'Air CA', error: e.toString() });
      Logger.log(`Error syncing Air CA: ${e}`);
    }

    // Sync Water PRW/PW
    try {
      results.waterPRW = syncWaterPRW(batchId);
    } catch (e) {
      results.errors.push({ system: 'Water PRW/PW', error: e.toString() });
      Logger.log(`Error syncing Water PRW/PW: ${e}`);
    }

    // Sync Water WFI
    try {
      results.waterWFI = syncWaterWFI(batchId);
    } catch (e) {
      results.errors.push({ system: 'Water WFI', error: e.toString() });
      Logger.log(`Error syncing Water WFI: ${e}`);
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    // Log batch completion
    appendLog(CONFIG.TARGET_AIR_ID, 'SYNC_BATCH_DONE', null, Session.getActiveUser().getEmail(),
      `Batch ${batchId} completed in ${duration}s. Errors: ${results.errors.length}`);

    Logger.log(`Sync completed in ${duration} seconds`);
    Logger.log(`Results: ${JSON.stringify(results, null, 2)}`);

    return { success: results.errors.length === 0, results: results };

  } catch (e) {
    Logger.log(`Fatal error in syncAll: ${e}`);
    appendLog(CONFIG.TARGET_AIR_ID, 'SYNC_BATCH_ERROR', null, Session.getActiveUser().getEmail(),
      `Fatal error: ${e.toString()}`);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sync Air EM data: recordAir → records_em
 * Only inserts NEW groups (samplingDate + building not in RPP2)
 * With bidirectional worksheetNo mapping
 */
function syncAirEM(batchId) {
  Logger.log('Starting Air EM sync...');

  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SOURCE_AIR_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(CONFIG.SOURCE_SHEETS.AIR_EM);
  const targetSpreadsheet = SpreadsheetApp.openById(CONFIG.TARGET_AIR_ID);
  const targetSheet = targetSpreadsheet.getSheetByName(CONFIG.TARGET_SHEETS.AIR_EM);

  if (!sourceSheet) {
    throw new Error(`Source sheet not found: ${CONFIG.SOURCE_SHEETS.AIR_EM}`);
  }
  if (!targetSheet) {
    throw new Error(`Target sheet not found: ${CONFIG.TARGET_SHEETS.AIR_EM}`);
  }

  // ⭐ Step 1: Read existing records from RPP2
  const existingRecords = readExistingRecords(targetSheet, ['samplingDate', 'building']);
  Logger.log(`Found ${Object.keys(existingRecords).length} existing groups in RPP2`);

  // ⭐ Step 2: Read source data
  const sourceData = readSheetAsObjects(sourceSheet);
  Logger.log(`Read ${sourceData.length} rows from ${CONFIG.SOURCE_SHEETS.AIR_EM}`);

  const validRows = sourceData.filter(row => isValidAirEMRow(row));
  Logger.log(`Filtered to ${validRows.length} valid rows`);

  const groups = groupRows(validRows, ['samplingDate', 'building']);
  Logger.log(`Grouped into ${Object.keys(groups).length} groups`);

  let insertCount = 0;
  let skipCount = 0;

  for (const groupKey in groups) {
    const rowsInGroup = groups[groupKey];

    // ⭐ Step 3: Check if this group already exists in RPP2
    if (existingRecords[groupKey]) {
      Logger.log(`Skipping group ${groupKey} - already exists in RPP2 with worksheetNo: ${existingRecords[groupKey]}`);

      // Map existing worksheetNo back to source (if not already mapped)
      const existingWorksheetNo = existingRecords[groupKey];
      const needsMapping = rowsInGroup.some(r => !r.worksheetNo || r.worksheetNo !== existingWorksheetNo);

      if (needsMapping && CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, existingWorksheetNo, 'air-em');
        Logger.log(`Mapped existing worksheetNo ${existingWorksheetNo} to source sheet`);
      }

      skipCount++;
      continue;
    }

    // ⭐ Step 4: Generate new worksheetNo for NEW group
    const worksheetNo = generateWorksheetNo('air-em');
    Logger.log(`Generated NEW worksheetNo: ${worksheetNo} for group ${groupKey}`);

    const samplingDate = normalizeDate(rowsInGroup[0].samplingDate);
    const building = rowsInGroup[0].building;

    const targetRecord = {
      worksheetNo: worksheetNo,
      recordStatus: rowsInGroup[0].group || rowsInGroup[0].type || 'Routine',
      building: building,
      samplingDate: samplingDate,
      performedDate: samplingDate,
      temp: rowsInGroup[0].temp || null,
      incNo: null,
      lotMedia: rowsInGroup[0].lotTSA || null,
      mfgMedia: rowsInGroup[0].mfgDate || null,
      expMedia: rowsInGroup[0].expDate || null,
      determinedDate: null,
      concludedDate: null,
      approvedDate: null,
      docNo: null,
      samplesJson: buildAirEMSamplesJson(rowsInGroup),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: Session.getActiveUser().getEmail()
    };

    // ⭐ Step 5: Insert only (never update)
    const result = insertTargetRow(targetSheet, targetRecord);

    if (result === 'INSERT') {
      insertCount++;
      appendLog(CONFIG.TARGET_AIR_ID, 'INSERT_AIR_EM', worksheetNo,
        Session.getActiveUser().getEmail(), `Inserted ${rowsInGroup.length} samples (NEW)`);

      // ⭐ Step 6: Map worksheetNo back to source sheet
      if (CONFIG.MAP_WORKSHEET_NO_BACK) {
        const mapped = mapWorksheetNoBack(sourceSheet, rowsInGroup, worksheetNo, 'air-em');
        Logger.log(`Mapped ${worksheetNo} back to ${mapped} rows in source sheet`);
      }
    }
  }

  Logger.log(`Air EM sync complete: ${insertCount} inserted (NEW), ${skipCount} skipped (exists)`);
  return { inserted: insertCount, updated: 0, skipped: skipCount };
}

/**
 * Sync Air CA data: recordCA → records_ca
 * Only inserts NEW groups (samplingDate + building not in RPP2)
 */
function syncAirCA(batchId) {
  Logger.log('Starting Air CA sync...');

  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SOURCE_AIR_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(CONFIG.SOURCE_SHEETS.AIR_CA);
  const targetSpreadsheet = SpreadsheetApp.openById(CONFIG.TARGET_AIR_ID);
  const targetSheet = targetSpreadsheet.getSheetByName(CONFIG.TARGET_SHEETS.AIR_CA);

  const caDatabase = loadCADatabase();

  if (!sourceSheet) {
    throw new Error(`Source sheet not found: ${CONFIG.SOURCE_SHEETS.AIR_CA}`);
  }
  if (!targetSheet) {
    throw new Error(`Target sheet not found: ${CONFIG.TARGET_SHEETS.AIR_CA}`);
  }

  // ⭐ Step 1: Read existing records from RPP2
  const existingRecords = readExistingRecords(targetSheet, ['samplingDate', 'building']);
  Logger.log(`Found ${Object.keys(existingRecords).length} existing groups in RPP2`);

  // ⭐ Step 2: Read source data
  const sourceData = readSheetAsObjects(sourceSheet);
  Logger.log(`Read ${sourceData.length} rows from ${CONFIG.SOURCE_SHEETS.AIR_CA}`);

  const validRows = sourceData.filter(row => isValidAirCARow(row));
  Logger.log(`Filtered to ${validRows.length} valid rows`);

  const groups = groupRows(validRows, ['samplingDate', 'building']);
  Logger.log(`Grouped into ${Object.keys(groups).length} groups`);

  let insertCount = 0;
  let skipCount = 0;

  for (const groupKey in groups) {
    const rowsInGroup = groups[groupKey];

    // ⭐ Step 3: Check if this group already exists in RPP2
    if (existingRecords[groupKey]) {
      Logger.log(`Skipping group ${groupKey} - already exists in RPP2 with worksheetNo: ${existingRecords[groupKey]}`);

      // Map existing worksheetNo back to source (if needed)
      const existingWorksheetNo = existingRecords[groupKey];
      const needsMapping = rowsInGroup.some(r => !r.worksheetNo || r.worksheetNo !== existingWorksheetNo);

      if (needsMapping && CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, existingWorksheetNo, 'air-ca');
        Logger.log(`Mapped existing worksheetNo ${existingWorksheetNo} to source sheet`);
      }

      skipCount++;
      continue;
    }

    // ⭐ Step 4: Generate new worksheetNo for NEW group
    const worksheetNo = generateWorksheetNo('air-ca');
    Logger.log(`Generated NEW worksheetNo: ${worksheetNo} for group ${groupKey}`);

    const samplingDate = normalizeDate(rowsInGroup[0].samplingDate);
    const building = rowsInGroup[0].building;

    const targetRecord = {
      worksheetNo: worksheetNo,
      recordStatus: rowsInGroup[0].gassType || rowsInGroup[0].monthYear || 'Routine',
      building: building,
      samplingDate: samplingDate,
      performedDate: samplingDate,
      temp: rowsInGroup[0].temp || null,
      incNo: null,
      lotTSA: rowsInGroup[0].lotTSA || null,
      lotMedia: null,
      lotOther: null,
      mfgMedia: rowsInGroup[0].mfgDate || null,
      expMedia: rowsInGroup[0].expDate || null,
      determinedDate: null,
      concludedDate: null,
      approvedDate: null,
      docNo: null,
      samplesJson: buildAirCASamplesJson(rowsInGroup, caDatabase),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: Session.getActiveUser().getEmail()
    };

    // ⭐ Step 5: Insert only (never update)
    const result = insertTargetRow(targetSheet, targetRecord);

    if (result === 'INSERT') {
      insertCount++;
      appendLog(CONFIG.TARGET_AIR_ID, 'INSERT_AIR_CA', worksheetNo,
        Session.getActiveUser().getEmail(), `Inserted ${rowsInGroup.length} samples (NEW)`);

      // ⭐ Step 6: Map worksheetNo back to source sheet
      if (CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, worksheetNo, 'air-ca');
      }
    }
  }

  Logger.log(`Air CA sync complete: ${insertCount} inserted (NEW), ${skipCount} skipped (exists)`);
  return { inserted: insertCount, updated: 0, skipped: skipCount };
}
