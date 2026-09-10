/**
 * ============================================
 * ANF3 QC Auto Sync - Trigger Management
 * ============================================
 */

// ============================================================================
// TRIGGER MANAGEMENT
// ============================================================================

/**
 * Create daily trigger for sync at 06:15
 * Run this function once to set up automatic daily sync
 */
function createDailyTrigger() {
  // Delete existing triggers first
  deleteExistingTriggers();

  // Create new trigger at configured time
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .atHour(CONFIG.TRIGGER_HOUR)
    .nearMinute(CONFIG.TRIGGER_MINUTE)
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  Logger.log(`Daily trigger created successfully at ${CONFIG.TRIGGER_HOUR}:${CONFIG.TRIGGER_MINUTE} ${CONFIG.TIMEZONE}`);
}

/**
 * Delete all existing triggers for this script
 * Use this to clean up before creating new triggers
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'syncAll') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`Deleted trigger: ${trigger.getUniqueId()}`);
    }
  }
  Logger.log('All existing syncAll triggers deleted');
}

/**
 * List all triggers for this script
 * Use this to check what triggers are active
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`Found ${triggers.length} triggers:`);

  for (const trigger of triggers) {
    Logger.log(`- Function: ${trigger.getHandlerFunction()}`);
    Logger.log(`  Type: ${trigger.getEventType()}`);
    Logger.log(`  ID: ${trigger.getUniqueId()}`);
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test function - sync only Air EM
 * Use this to test Air EM sync without running full sync
 */
function testSyncAirEM() {
  const result = syncAirEM('test-batch-' + Date.now());
  Logger.log(`Test Air EM sync result: ${JSON.stringify(result)}`);
}

/**
 * Test function - sync only Air CA
 */
function testSyncAirCA() {
  const result = syncAirCA('test-batch-' + Date.now());
  Logger.log(`Test Air CA sync result: ${JSON.stringify(result)}`);
}

/**
 * Test function - sync only Water PRW/PW
 */
function testSyncWaterPRW() {
  const result = syncWaterPRW('test-batch-' + Date.now());
  Logger.log(`Test Water PRW/PW sync result: ${JSON.stringify(result)}`);
}

/**
 * Test function - sync only Water WFI
 */
function testSyncWaterWFI() {
  const result = syncWaterWFI('test-batch-' + Date.now());
  Logger.log(`Test Water WFI sync result: ${JSON.stringify(result)}`);
}

/**
 * Test worksheetNo generation
 */
function testWorksheetNoGeneration() {
  Logger.log('=== Testing worksheetNo generation ===');

  const testTypes = ['air-em', 'air-ca', 'water-prw', 'water-wfi'];

  for (const type of testTypes) {
    const worksheetNo = generateWorksheetNo(type);
    Logger.log(`${type}: ${worksheetNo}`);
  }

  Logger.log('\n=== Current counters ===');
  viewAllWorksheetNoCounters();
}

/**
 * Test mapping worksheetNo back to source
 */
function testMapWorksheetNoBack() {
  Logger.log('=== Testing mapWorksheetNoBack ===');

  // This is a dry-run test - doesn't actually write to sheets
  // You need to run actual sync to test the real mapping

  Logger.log('Run testSyncAirEM() or testSyncWaterPRW() to test actual mapping');
}
