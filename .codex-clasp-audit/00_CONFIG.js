/**
 * ============================================
 * ANF3 QC Auto Sync - Configuration
 * ============================================
 *
 * Purpose: Bidirectional sync between source sheets and RPP2 archive
 *
 * Flow:
 * 1. User fills data in air-test-form / water-test-form
 * 2. Script syncs to RPP2 daily (06:00-07:00)
 * 3. Script auto-generates worksheetNo if missing
 * 4. Script maps worksheetNo back to source sheets
 *
 * Version: 2.0 - Bidirectional Sync
 * Last Updated: 2026-06-05
 */

// ============================================================================
// SPREADSHEET IDS - แก้ตรงนี้
// ============================================================================

const CONFIG = {
  // Source Spreadsheet IDs (User fills data here)
  SOURCE_AIR_ID: '1O1lkXwUJes8Mia3t-7tQ0NVAdGPz1Hh3SVcUD0bFAp8',      // air-test-form
  SOURCE_WATER_ID: '1SegflBr6ieYguGhksvAo116Y6thV1QyIuMZ9fEojYQg',  // water-test-form

  // Target Spreadsheet IDs (RPP2 Archive)
  TARGET_AIR_ID: '1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono',    // RPP2-air-record
  TARGET_WATER_ID: '1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0',   // RPP2-water-record

  // ============================================================================
  // SHEET NAMES
  // ============================================================================

  // Source Sheet Names
  SOURCE_SHEETS: {
    AIR_EM: 'recordAir',
    AIR_CA: 'recordCA',
    WATER_PRW_PW: 'prw-pw',
    WATER_WFI: 'wfi-pus',
    AIR_CA_DATABASE: 'dCAGass',
    WATER_DATABASE: 'database'
  },

  // Target Sheet Names (RPP2)
  TARGET_SHEETS: {
    AIR_EM: 'records_em',
    AIR_CA: 'records_ca',
    WATER_PRW_PW: 'records_pw_prw',
    WATER_WFI: 'records_wfi',
    LOGS: 'logs'
  },

  // ============================================================================
  // WORKSHEET NUMBER SETTINGS
  // ============================================================================

  // Auto-generate worksheetNo if missing in source
  AUTO_GENERATE_WORKSHEET_NO: true,

  // Map worksheetNo back to source sheets after sync
  MAP_WORKSHEET_NO_BACK: true,

  // Worksheet number prefixes
  WORKSHEET_NO_PREFIXES: {
    'air-em': 'AT',      // Air EM: AT-26-0001
    'air-ca': 'AC',      // Air CA: AC-26-0001
    'water-prw': 'WT',   // Water PRW/PW: WT-26-0001
    'water-wfi': 'WP'    // Water WFI: WP-26-0001
  },

  // Column name for worksheetNo in source sheets
  SOURCE_WORKSHEET_NO_COLUMN: {
    'air-em': 'worksheetNo',
    'air-ca': 'worksheetNo',
    'water-prw': 'worksheet No.',  // Note: has space
    'water-wfi': 'workSheet  No.'  // Note: different spelling + double space
  },

  // ============================================================================
  // SYNC SETTINGS
  // ============================================================================

  // Timezone
  TIMEZONE: 'Asia/Bangkok',

  // Trigger time (06:15 to avoid :00 congestion)
  TRIGGER_HOUR: 6,
  TRIGGER_MINUTE: 15,

  // Validation settings
  REQUIRE_WORKSHEET_NO: false,  // Changed to false - will auto-generate if missing
  SKIP_EXCLUDED_ROWS: true,     // Skip rows with Exclude = X or TRUE

  // Composite key for grouping
  // Air: samplingDate + building
  // Water: samplingDate + building + waterType

  // ============================================================================
  // RUNNING NUMBER STORAGE
  // ============================================================================

  // Use PropertiesService for running numbers
  // Keys: 'lastWorksheetNo_AT', 'lastWorksheetNo_AC', 'lastWorksheetNo_WT', 'lastWorksheetNo_WP'
  USE_PROPERTIES_STORE: true,

  // Alternative: use a sheet (if USE_PROPERTIES_STORE = false)
  RUNNING_NUMBERS_SHEET: 'running_numbers'
};

/**
 * Get current year in Buddhist Era (short form)
 * @return {String} e.g., "26" for 2026
 */
function getCurrentYear() {
  const now = new Date();
  const buddhistYear = now.getFullYear() + 543;
  return String(buddhistYear).slice(-2); // Last 2 digits
}
