/**
 * ============================================
 * WATER RECORD APP - Sync Module
 * Google Apps Script Integration
 * ============================================
 */

// ============================================
// Sync Configuration
// ============================================
const SYNC_CONFIG = {
  // Google Apps Script Web App URL (Water)
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxC1ZjkZsgOWIvTGXdJleJQFoEV_nFpe1qwZoEW8BwXLBqyL3pDN22ZTKRmlm2TybnL/exec',
  
  // Google Apps Script Web App URL (Air)
  AIR_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbytoaWepwl0RJLilSvShVBIMIJZ3kYpN4UEynRbdeNTEAlfOHWWkNXJTwe62-Ry_TeB/exec',

  // Cleaning Validation uses a separately deployed/configured endpoint.
  // Keep it separate from Water even though CV rinse samples use PW/PRW or WFI/PUS.
  CV_SCRIPT_URL: '',
  
  // Sync interval in milliseconds (5 minutes)
  AUTO_SYNC_INTERVAL: 5 * 60 * 1000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000
};

// Load Air Script URL from localStorage if available
(function() {
  const savedAirUrl = localStorage.getItem('air_script_url');
  if (savedAirUrl) {
    SYNC_CONFIG.AIR_SCRIPT_URL = savedAirUrl;
  }
  const savedCvUrl = localStorage.getItem('waterapp_cv_script_url');
  if (savedCvUrl) {
    try {
      SYNC_CONFIG.CV_SCRIPT_URL = JSON.parse(savedCvUrl);
    } catch (_) {
      SYNC_CONFIG.CV_SCRIPT_URL = savedCvUrl;
    }
  }
})();

// ============================================
// Sync Status Management
// ============================================
let syncInProgress = false;
let lastSyncTime = null;

// ============================================
// Check Pending Sync Items
// ============================================
async function checkPendingSync() {
  try {
    // Check if database is ready
    if (!waterDB || !waterDB.isReady) {
      console.log('Database not ready, skipping pending sync check');
      return 0;
    }
    
    const pendingItems = await waterDB.getPendingSync();
    const count = pendingItems.length;
    
    // Update UI
    const syncBar = document.getElementById('syncBar');
    const pendingCount = document.getElementById('pendingCount');
    
    if (syncBar && pendingCount) {
      if (count > 0) {
        syncBar.style.display = 'flex';
        pendingCount.textContent = `${count} รายการ`;
        
        // NOTE: Modal popup disabled to prevent sync conflicts when using multiple devices
        // Users can manually sync via the Sync Bar button if needed
        console.log(`[SYNC] ${count} pending items - use Sync Bar to sync manually`);
      } else {
        syncBar.style.display = 'none';
      }
    }
    
    return count;
  } catch (error) {
    console.error('Error checking pending sync:', error);
    return 0;
  }
}

// ============================================
// Sync Now (Manual Trigger)
// ============================================
function inferSyncDomain(item) {
  const explicit = String(item.domain || item.data?.domain || '').toLowerCase();
  if (explicit === 'cv') return 'cv';
  if (explicit === 'air') return 'air';

  const formType = String(item.data?.formType || '').toLowerCase();
  if (formType.includes('air')) return 'air';
  if (formType.includes('cleaning') || formType === 'cv') return 'cv';
  return 'water';
}

function getSyncEndpoint(domain) {
  if (domain === 'cv') return SYNC_CONFIG.CV_SCRIPT_URL;
  if (domain === 'air') return SYNC_CONFIG.AIR_SCRIPT_URL;
  return SYNC_CONFIG.SCRIPT_URL;
}

async function syncDomainBatch(domain, items) {
  const endpoint = getSyncEndpoint(domain);
  if (!endpoint) {
    throw new Error(domain === 'cv'
      ? 'ยังไม่ได้ตั้งค่า CV Apps Script URL ข้อมูล CV จะคงอยู่ใน Pending Sync'
      : `ยังไม่ได้ตั้งค่า ${domain} Apps Script URL`);
  }

  const payloadItems = items.map(item => ({
    id: item.id,
    recordId: item.recordId || item.data?.recordId || '',
    worksheetNo: item.worksheetNo || item.data?.worksheetNo || '',
    action: item.action,
    domain,
    data: prepareDataForGoogleSheets(item.data)
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      action: 'sync',
      domain,
      items: payloadItems,
      username: Storage.get('username') || 'Unknown'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || `Sync ${domain} ไม่สำเร็จ`);
  }

  const mappings = Array.isArray(result.mappings) ? result.mappings : [];
  const mappingByRecordId = new Map(mappings.map(item => [item.recordId, item]));

  for (const item of items) {
    if (domain === 'cv') {
      const recordId = item.recordId || item.data?.recordId;
      const mapping = mappingByRecordId.get(recordId) || {};
      if (recordId) await waterDB.updateCvSyncResult(recordId, mapping);
    }
    await waterDB.removePendingSync(item.id);
  }

  return { count: items.length, result };
}

async function syncNow() {
  if (syncInProgress) {
    UI.showToast('กำลัง Sync อยู่ กรุณารอสักครู่', 'warning');
    return;
  }
  
  if (!Network.isOnline()) {
    UI.showToast('ไม่สามารถ Sync ได้ - ไม่มีการเชื่อมต่อ Internet', 'error');
    return;
  }
  
  syncInProgress = true;
  UI.showLoading('กำลัง Sync ข้อมูล...');
  
  try {
    const pendingItems = await waterDB.getPendingSync();
    
    if (pendingItems.length === 0) {
      UI.showToast('ไม่มีข้อมูลที่ต้อง Sync', 'info');
      return;
    }
    
    const grouped = pendingItems.reduce((map, item) => {
      const domain = inferSyncDomain(item);
      if (!map[domain]) map[domain] = [];
      map[domain].push(item);
      return map;
    }, {});

    let syncedCount = 0;
    const failures = [];

    for (const [domain, items] of Object.entries(grouped)) {
      try {
        const batchResult = await syncDomainBatch(domain, items);
        syncedCount += batchResult.count;
      } catch (error) {
        failures.push(`${domain}: ${error.message}`);
        await waterDB.addLog('SYNC_DOMAIN_ERROR', `${domain}: ${error.message}`);
      }
    }

    if (syncedCount > 0) {
      lastSyncTime = new Date();
      Storage.set('lastSyncTime', lastSyncTime.toISOString());
      await waterDB.addLog('SYNC_SUCCESS', `Synced ${syncedCount} items`);
    }

    if (failures.length > 0) {
      UI.showToast(`Sync สำเร็จ ${syncedCount} รายการ; คงค้าง ${pendingItems.length - syncedCount} รายการ`, 'warning', 6000);
      console.warn('[SYNC] Partial failure:', failures);
    } else {
      UI.showToast(`Sync สำเร็จ ${syncedCount} รายการ`, 'success');
    }

    await checkPendingSync();
    
  } catch (error) {
    console.error('Sync error:', error);
    await waterDB.addLog('SYNC_ERROR', error.message);
    
    // Check for conflict
    if (error.message.includes('conflict')) {
      UI.showModal({
        title: 'ข้อมูลขัดแย้ง',
        message: 'มีการแก้ไขข้อมูลจากที่อื่น คุณต้องการใช้ข้อมูลใหม่จาก Server หรือข้อมูลของคุณ?',
        type: 'warning',
        confirmText: 'ใช้ของฉัน',
        cancelText: 'ใช้ของ Server',
        onConfirm: () => forceSync(),
        onCancel: () => pullFromServer()
      });
    } else {
      UI.showToast('Sync ไม่สำเร็จ: ' + error.message, 'error');
    }
  } finally {
    syncInProgress = false;
    UI.hideLoading();
  }
}

// ============================================
// Export Pending Items to File (Fallback)
// ============================================
async function exportPendingToFile() {
  try {
    const pendingItems = await waterDB.getPendingSync();
    
    if (pendingItems.length === 0) {
      UI.showToast('ไม่มีข้อมูลที่ต้อง Export', 'info');
      return;
    }
    
    // Create export data
    const exportData = {
      exportedAt: DateUtils.timestamp(),
      exportedBy: Storage.get('username') || 'Unknown',
      items: pendingItems.map(item => item.data)
    };
    
    // Download as JSON
    const filename = `water-records-export-${DateUtils.today()}.json`;
    FileExport.toJSON(exportData, filename);
    
    UI.showToast(`Export สำเร็จ ${pendingItems.length} รายการ`, 'success');
    
    // Optionally clear pending after export
    // await waterDB.clearPendingSync();
    
  } catch (error) {
    console.error('Export error:', error);
    UI.showToast('Export ไม่สำเร็จ: ' + error.message, 'error');
  }
}

// ============================================
// Force Sync (Override Server)
// ============================================
async function forceSync() {
  // Legacy "force" mode used to send every pending item to the Water endpoint
  // and then clear the entire queue. That is unsafe now that Water, Air and CV
  // share a queue but must remain separate systems. Re-run the guarded,
  // domain-aware path instead; it removes only items confirmed by their own
  // endpoint and leaves failed domains pending.
  UI.showToast('กำลัง Sync ใหม่แบบแยกตามระบบ', 'info');
  return syncNow();
}

// ============================================
// Pull from Server
// ============================================
async function pullFromServer() {
  if (!SYNC_CONFIG.SCRIPT_URL) {
    UI.showToast('ยังไม่ได้ตั้งค่า Google Apps Script URL', 'warning');
    return;
  }
  
  UI.showLoading('กำลังดึงข้อมูลจาก Server...');
  
  try {
    const statuses = ['Routine', 'PQ1-2/OLD', 'PQ1-2/OCL', 'RAMA6'];
    let totalRecords = 0;
    
    // Pull from all 4 sheets
    for (const status of statuses) {
      const response = await fetch(`${SYNC_CONFIG.SCRIPT_URL}?action=pull&status=${encodeURIComponent(status)}`, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        for (const record of result.data) {
          await waterDB.saveRecord(record);
          totalRecords++;
        }
      }
    }
    
    // Clear pending sync
    await waterDB.clearPendingSync();
    
    UI.showToast(`ดึงข้อมูลสำเร็จ ${totalRecords} รายการ`, 'success');
    
  } catch (error) {
    console.error('Pull error:', error);
    UI.showToast('ดึงข้อมูลไม่สำเร็จ: ' + error.message, 'error');
  } finally {
    UI.hideLoading();
  }
}

// ============================================
// Sync Running Numbers from Google Sheets
// ============================================
async function syncRunningNumbersFromSheet() {
  console.log('Syncing running numbers from Google Sheets...');
  
  if (!Network.isOnline() || !SYNC_CONFIG.SCRIPT_URL) {
    console.log('Skip running number sync - offline or no script URL');
    return;
  }
  
  try {
    // Pull records for all 4 statuses
    const statuses = ['Routine', 'PQ1-2/OLD', 'PQ1-2/OCL', 'RAMA6'];
    const currentYear = DateUtils.getCurrentYear2Digit();
    
    for (const status of statuses) {
      const url = `${SYNC_CONFIG.SCRIPT_URL}?action=getRecords&status=${encodeURIComponent(status)}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        // Find max sequence number from worksheetNo
        let maxSeq = 0;
        
        result.data.forEach(record => {
          const parsed = WorksheetNo.parse(record.worksheetNo);
          if (parsed && parsed.sequence > maxSeq) {
            // For Routine status, only count records from current year
            // This ensures running number resets to 0001 when year changes
            if (status === 'Routine') {
              if (parsed.year === currentYear) {
                maxSeq = parsed.sequence;
              }
            } else {
              // For PQ/RAMA6 statuses, count all records (no year reset)
              maxSeq = parsed.sequence;
            }
          }
        });
        
        // Update local sequence
        let formatKey;
        switch(status) {
          case 'PQ1-2/OLD':
            formatKey = 'PQ_OLD';
            break;
          case 'PQ1-2/OCL':
            formatKey = 'PQ_OCL';
            break;
          case 'RAMA6':
            formatKey = 'RA6';
            break;
          case 'Routine':
          default:
            formatKey = `WT_${currentYear}`;
            break;
        }
        
        const key = `lastSeq_${formatKey}`;
        const currentSeq = Storage.get(key) || 0;
        
        if (maxSeq > currentSeq) {
          Storage.set(key, maxSeq);
          console.log(`Updated ${status} running number to ${maxSeq} (year: ${currentYear})`);
        }
      }
    }
    
    console.log('Running numbers synced successfully');
  } catch (error) {
    console.error('Error syncing running numbers:', error);
  }
}

// ============================================
// Pull Master Data from Server
// ============================================
async function pullMasterData() {
  if (!SYNC_CONFIG.SCRIPT_URL) {
    console.log('No script URL configured');
    UI.showToast('ยังไม่ได้ตั้งค่า Google Apps Script URL', 'warning');
    return false;
  }
  
  UI.showLoading('กำลังดึงข้อมูล Master Data...');
  
  try {
    // Simple fetch - let browser handle CORS redirect automatically
    const response = await fetch(SYNC_CONFIG.SCRIPT_URL + '?action=getMasterData');
    const result = await response.json();
    
    if (result.success && result.data) {
      await waterDB.loadMasterData(result.data);
      console.log('Master data pulled from server:', result.data.length, 'records');
      UI.showToast(`✅ โหลด Master Data สำเร็จ (${result.data.length} รายการ)`, 'success');
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Pull master data error:', error);
    UI.showToast('ไม่สามารถดึง Master Data ได้: ' + error.message, 'error');
  } finally {
    UI.hideLoading();
  }
  
  return false;
}

// ============================================
// Auto Sync Setup
// ============================================
function startKeepAlive() {
  setInterval(() => {
    fetch('http://localhost:8000/api/status').catch(() => {});
  }, 4 * 60 * 1000);
}

function setupAutoSync() {
  startKeepAlive();
  if (SYNC_CONFIG.SCRIPT_URL) {
    setInterval(async () => {
      if (Network.isOnline() && !syncInProgress) {
        const pendingCount = await checkPendingSync();
        if (pendingCount > 0) {
          console.log('Auto-syncing pending items...');
          await syncNow();
        }
      }
    }, SYNC_CONFIG.AUTO_SYNC_INTERVAL);
    
    console.log('Auto-sync enabled');
  }
}

// ============================================
// Configure Google Script URL
// ============================================
function configureScriptUrl(url) {
  Storage.set('google_script_url', url);
  SYNC_CONFIG.SCRIPT_URL = url;
  setupAutoSync();
  UI.showToast('Google Apps Script URL saved', 'success');
}

function configureCvScriptUrl(url) {
  const normalized = String(url || '').trim();
  Storage.set('cv_script_url', normalized);
  SYNC_CONFIG.CV_SCRIPT_URL = normalized;
  UI.showToast(normalized ? 'CV Apps Script URL saved' : 'CV Apps Script URL cleared', 'success');
}

// ============================================
// Initialize Sync Module
// ============================================
async function initSync() {
  // Check if user is logged in first
  const username = Storage.get('username');
  if (!username) {
    console.log('[SYNC] No username set, skipping sync init');
    return;
  }
  
  // Load saved URL
  const savedUrl = Storage.get('google_script_url');
  if (savedUrl) {
    SYNC_CONFIG.SCRIPT_URL = savedUrl;
    setupAutoSync();
  }
  
  // Wait for database to be ready before checking pending items
  if (typeof waterDB !== 'undefined') {
    // Wait a bit for DB init, then check
    const maxWait = 5000; // 5 seconds max
    const checkInterval = 200;
    let waited = 0;
    
    while (!waterDB.isReady && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    if (waterDB.isReady) {
      checkPendingSync();
    } else {
      console.warn('Database not ready after waiting, skipping sync check');
    }
  }
}

// ============================================
// Clear All Cache
// ============================================

/**
 * Reset running numbers for current year
 * Use when starting a new year and want to reset to 0001
 */
async function resetYearlyRunningNumbers() {
  const year = DateUtils.getCurrentYear2Digit();
  
  const confirmed = confirm(
    `🔄 Reset Running Number ปี ${year}?\n\n` +
    'การกระทำนี้จะ:\n' +
    `• ล้าง lastSeq_WT_${year} (PW-PRW)\n` +
    `• ล้าง lastSeq_WP_${year} (WFI-PUS)\n\n` +
    'เลขที่ถัดไปจะเริ่มจาก 0001\n' +
    '(เฉพาะ local - ไม่ลบข้อมูลใน Google Sheet)'
  );
  
  if (!confirmed) {
    console.log('[RESET] Cancelled by user');
    return;
  }
  
  // Clear WT running number for current year
  Storage.remove(`lastSeq_WT_${year}`);
  // Clear WP running number for current year  
  Storage.remove(`lastSeq_WP_${year}`);
  
  // Also clear old dash-style keys (for backward compatibility)
  Storage.remove(`lastSeq_WT-${year}`);
  Storage.remove(`lastSeq_WP-${year}`);
  
  console.log(`[RESET] Cleared running numbers for year ${year}`);
  UI.showToast(`✅ Reset Running Number ปี ${year} สำเร็จ`, 'success');
  
  // Reload page
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function clearAllCache() {
  // Confirm before clearing
  const confirmed = confirm(
    '⚠️ ล้าง Cache ทั้งหมด?\n\n' +
    'การกระทำนี้จะ:\n' +
    '• ลบข้อมูลที่ยังไม่ได้ Sync\n' +
    '• ล้าง IndexedDB ทั้งหมด\n' +
    '• ล้าง LocalStorage\n\n' +
    'ข้อมูลที่ Sync ไปยัง Google Sheet แล้วจะไม่ถูกลบ'
  );
  
  if (!confirmed) {
    console.log('[CACHE] Clear cancelled by user');
    return;
  }
  
  try {
    UI.showLoading('กำลังล้าง Cache...');
    
    // 1. Clear IndexedDB
    if (waterDB && waterDB.isReady) {
      try {
        // Delete the database entirely
        const dbName = 'WaterRecordDB';
        
        // Close connection first
        if (waterDB.db) {
          waterDB.db.close();
        }
        
        // Delete database
        await new Promise((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log('[CACHE] IndexedDB deleted');
            resolve();
          };
          deleteRequest.onerror = () => {
            console.error('[CACHE] Failed to delete IndexedDB');
            reject(deleteRequest.error);
          };
          deleteRequest.onblocked = () => {
            console.warn('[CACHE] IndexedDB delete blocked, forcing...');
            resolve();
          };
        });
      } catch (e) {
        console.warn('[CACHE] IndexedDB clear error:', e);
      }
    }
    
    // 2. Clear LocalStorage
    try {
      localStorage.clear();
      console.log('[CACHE] LocalStorage cleared');
    } catch (e) {
      console.warn('[CACHE] LocalStorage clear error:', e);
    }
    
    // 3. Clear SessionStorage
    try {
      sessionStorage.clear();
      console.log('[CACHE] SessionStorage cleared');
    } catch (e) {
      console.warn('[CACHE] SessionStorage clear error:', e);
    }
    
    UI.hideLoading();
    UI.showToast('✅ ล้าง Cache สำเร็จ! กำลัง Reload...', 'success');
    
    // Reload page after short delay
    setTimeout(() => {
      window.location.reload(true);
    }, 1500);
    
  } catch (error) {
    console.error('[CACHE] Clear error:', error);
    UI.hideLoading();
    UI.showToast('❌ เกิดข้อผิดพลาดในการล้าง Cache', 'error');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initSync);
