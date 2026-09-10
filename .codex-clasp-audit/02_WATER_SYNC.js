/**
 * ============================================
 * ANF3 QC Auto Sync - Water Sync Functions
 * ============================================
 */

/**
 * Sync Water PRW/PW data: prw-pw → records_pw_prw
 * Only inserts NEW groups (samplingDate + building + waterType not in RPP2)
 */
function syncWaterPRW(batchId) {
  Logger.log('Starting Water PRW/PW sync...');

  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SOURCE_WATER_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(CONFIG.SOURCE_SHEETS.WATER_PRW_PW);
  const targetSpreadsheet = SpreadsheetApp.openById(CONFIG.TARGET_WATER_ID);
  const targetSheet = targetSpreadsheet.getSheetByName(CONFIG.TARGET_SHEETS.WATER_PRW_PW);

  if (!sourceSheet) {
    throw new Error(`Source sheet not found: ${CONFIG.SOURCE_SHEETS.WATER_PRW_PW}`);
  }
  if (!targetSheet) {
    throw new Error(`Target sheet not found: ${CONFIG.TARGET_SHEETS.WATER_PRW_PW}`);
  }

  // ⭐ Step 1: Read existing records from RPP2
  const existingRecords = readExistingRecords(targetSheet, ['samplingDate', 'building', 'waterType']);
  Logger.log(`Found ${Object.keys(existingRecords).length} existing groups in RPP2`);

  // ⭐ Step 2: Read source data
  const sourceData = readSheetAsObjects(sourceSheet);
  Logger.log(`Read ${sourceData.length} rows from ${CONFIG.SOURCE_SHEETS.WATER_PRW_PW}`);

  const validRows = sourceData.filter(row => isValidWaterRow(row));
  Logger.log(`Filtered to ${validRows.length} valid rows`);

  // Water groups by: samplingDate + building + waterType
  const groups = groupRows(validRows, ['samplingDate', 'building', 'waterType']);
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
      const needsMapping = rowsInGroup.some(r => !r['worksheet No.'] || r['worksheet No.'] !== existingWorksheetNo);

      if (needsMapping && CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, existingWorksheetNo, 'water-prw');
        Logger.log(`Mapped existing worksheetNo ${existingWorksheetNo} to source sheet`);
      }

      skipCount++;
      continue;
    }

    // ⭐ Step 4: Generate new worksheetNo for NEW group
    const worksheetNo = generateWorksheetNo('water-prw');
    Logger.log(`Generated NEW worksheetNo: ${worksheetNo} for group ${groupKey}`);

    const samplingDate = normalizeDate(rowsInGroup[0].samplingDate);
    const building = rowsInGroup[0].building;
    const waterType = rowsInGroup[0].waterType;

    const targetRecord = {
      worksheetNo: worksheetNo,
      formType: mapWaterTypeToFormType(waterType),
      recordStatus: rowsInGroup[0].recordStatus || 'Routine',
      building: building,
      samplingDate: samplingDate,
      performedDate: normalizeDate(rowsInGroup[0].performedDate) || samplingDate,
      temp: null,
      incNo: null,
      rightEM: null,
      leftEM: null,
      negativeValue: null,
      lotTSA: null,
      lotPCA: null,
      lotPlate: null,
      lotPipette: null,
      determinedDate: normalizeDate(rowsInGroup[0].determinedDate),
      concludedDate: null,
      approvedDate: null,
      docNo: null,
      comment: null,
      samplesJson: buildWaterPRWSamplesJson(rowsInGroup),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: Session.getActiveUser().getEmail()
    };

    // ⭐ Step 5: Insert only (never update)
    const result = insertTargetRow(targetSheet, targetRecord);

    if (result === 'INSERT') {
      insertCount++;
      appendLog(CONFIG.TARGET_WATER_ID, 'INSERT_WATER_PRW', worksheetNo,
        Session.getActiveUser().getEmail(), `Inserted ${rowsInGroup.length} samples (NEW)`);

      // ⭐ Step 6: Map worksheetNo back to source sheet
      if (CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, worksheetNo, 'water-prw');
      }
    }
  }

  Logger.log(`Water PRW/PW sync complete: ${insertCount} inserted (NEW), ${skipCount} skipped (exists)`);
  return { inserted: insertCount, updated: 0, skipped: skipCount };
}

/**
 * Sync Water WFI data: wfi-pus → records_wfi
 * Only inserts NEW groups (samplingDate + building + waterType not in RPP2)
 */
function syncWaterWFI(batchId) {
  Logger.log('Starting Water WFI sync...');

  const sourceSpreadsheet = SpreadsheetApp.openById(CONFIG.SOURCE_WATER_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(CONFIG.SOURCE_SHEETS.WATER_WFI);
  const targetSpreadsheet = SpreadsheetApp.openById(CONFIG.TARGET_WATER_ID);
  const targetSheet = targetSpreadsheet.getSheetByName(CONFIG.TARGET_SHEETS.WATER_WFI);

  if (!sourceSheet) {
    throw new Error(`Source sheet not found: ${CONFIG.SOURCE_SHEETS.WATER_WFI}`);
  }
  if (!targetSheet) {
    throw new Error(`Target sheet not found: ${CONFIG.TARGET_SHEETS.WATER_WFI}`);
  }

  // ⭐ Step 1: Read existing records from RPP2
  const existingRecords = readExistingRecords(targetSheet, ['samplingDate', 'building', 'waterType']);
  Logger.log(`Found ${Object.keys(existingRecords).length} existing groups in RPP2`);

  // ⭐ Step 2: Read source data
  const sourceData = readSheetAsObjects(sourceSheet);
  Logger.log(`Read ${sourceData.length} rows from ${CONFIG.SOURCE_SHEETS.WATER_WFI}`);

  const validRows = sourceData.filter(row => isValidWaterRow(row));
  Logger.log(`Filtered to ${validRows.length} valid rows`);

  const groups = groupRows(validRows, ['samplingDate', 'building', 'waterType']);
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
      const needsMapping = rowsInGroup.some(r => !r['workSheet  No.'] || r['workSheet  No.'] !== existingWorksheetNo);

      if (needsMapping && CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, existingWorksheetNo, 'water-wfi');
        Logger.log(`Mapped existing worksheetNo ${existingWorksheetNo} to source sheet`);
      }

      skipCount++;
      continue;
    }

    // ⭐ Step 4: Generate new worksheetNo for NEW group
    const worksheetNo = generateWorksheetNo('water-wfi');
    Logger.log(`Generated NEW worksheetNo: ${worksheetNo} for group ${groupKey}`);

    const samplingDate = normalizeDate(rowsInGroup[0].samplingDate);
    const building = rowsInGroup[0].building;
    const waterType = rowsInGroup[0].waterType;

    const targetRecord = {
      worksheetNo: worksheetNo,
      formType: mapWaterTypeToFormType(waterType),
      recordStatus: rowsInGroup[0].recordStatus || 'Routine',
      building: building,
      samplingDate: samplingDate,
      performedDate: normalizeDate(rowsInGroup[0].performedDate) || samplingDate,
      temp: null,
      incNo: null,
      rightHand: null,
      leftHand: null,
      rightEM: null,
      leftEM: null,
      negativeValue: null,
      lotBuffer: null,
      lotTSA: null,
      lotPCA: null,
      lotPMembrane: null,
      lotForceps: null,
      determinedDate: normalizeDate(rowsInGroup[0].determinedDate),
      concludedDate: null,
      approvedDate: null,
      docNo: null,
      comment: null,
      samplesJson: buildWaterWFISamplesJson(rowsInGroup),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: Session.getActiveUser().getEmail()
    };

    // ⭐ Step 5: Insert only (never update)
    const result = insertTargetRow(targetSheet, targetRecord);

    if (result === 'INSERT') {
      insertCount++;
      appendLog(CONFIG.TARGET_WATER_ID, 'INSERT_WATER_WFI', worksheetNo,
        Session.getActiveUser().getEmail(), `Inserted ${rowsInGroup.length} samples (NEW)`);

      // ⭐ Step 6: Map worksheetNo back to source sheet
      if (CONFIG.MAP_WORKSHEET_NO_BACK) {
        mapWorksheetNoBack(sourceSheet, rowsInGroup, worksheetNo, 'water-wfi');
      }
    }
  }

  Logger.log(`Water WFI sync complete: ${insertCount} inserted (NEW), ${skipCount} skipped (exists)`);
  return { inserted: insertCount, updated: 0, skipped: skipCount };
}
