/**
 * ============================================
 * WATER RECORD APP - Database Module
 * IndexedDB + Local Storage Management
 * ============================================
 */

let _masterDataCache = null;

const DB_NAME = 'WaterRecordDB';
const DB_VERSION = 4;  // v4: dedicated Cleaning Validation storage

// Store names
const STORES = {
  MASTER_DATA: 'masterData',
  RECORDS: 'records',              // Routine
  RECORDS_PQ_OLD: 'records_pq_old', // PQ1-2/OLD
  RECORDS_PQ_OCL: 'records_pq_ocl', // PQ1-2/OCL
  RECORDS_RA6: 'records_ra6',       // RAMA6
  CV_RECORDS: 'cv_records',         // Cleaning Validation only
  PENDING_SYNC: 'pendingSync',
  LOGS: 'logs'
};

// ============================================
// IndexedDB Setup
// ============================================
class WaterDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Master Data store (sampling points)
        if (!db.objectStoreNames.contains(STORES.MASTER_DATA)) {
          const masterStore = db.createObjectStore(STORES.MASTER_DATA, { keyPath: 'samplingPoint' });
          masterStore.createIndex('building', 'building', { unique: false });
          masterStore.createIndex('waterType', 'waterType', { unique: false });
        }

        // Records store (worksheet records - Routine)
        if (!db.objectStoreNames.contains(STORES.RECORDS)) {
          const recordsStore = db.createObjectStore(STORES.RECORDS, { keyPath: 'worksheetNo' });
          recordsStore.createIndex('building', 'building', { unique: false });
          recordsStore.createIndex('samplingDate', 'samplingDate', { unique: false });
          recordsStore.createIndex('createdAt', 'createdAt', { unique: false });
          recordsStore.createIndex('docNo', 'docNo', { unique: false });
        }

        // PQ-OLD Records store
        if (!db.objectStoreNames.contains(STORES.RECORDS_PQ_OLD)) {
          const pqOldStore = db.createObjectStore(STORES.RECORDS_PQ_OLD, { keyPath: 'worksheetNo' });
          pqOldStore.createIndex('building', 'building', { unique: false });
          pqOldStore.createIndex('samplingDate', 'samplingDate', { unique: false });
          pqOldStore.createIndex('createdAt', 'createdAt', { unique: false });
          pqOldStore.createIndex('docNo', 'docNo', { unique: false });
        }
        
        // PQ-OCL Records store
        if (!db.objectStoreNames.contains(STORES.RECORDS_PQ_OCL)) {
          const pqOclStore = db.createObjectStore(STORES.RECORDS_PQ_OCL, { keyPath: 'worksheetNo' });
          pqOclStore.createIndex('building', 'building', { unique: false });
          pqOclStore.createIndex('samplingDate', 'samplingDate', { unique: false });
          pqOclStore.createIndex('createdAt', 'createdAt', { unique: false });
          pqOclStore.createIndex('docNo', 'docNo', { unique: false });
        }
        
        // RAMA6 Records store
        if (!db.objectStoreNames.contains(STORES.RECORDS_RA6)) {
          const ra6Store = db.createObjectStore(STORES.RECORDS_RA6, { keyPath: 'worksheetNo' });
          ra6Store.createIndex('building', 'building', { unique: false });
          ra6Store.createIndex('samplingDate', 'samplingDate', { unique: false });
          ra6Store.createIndex('createdAt', 'createdAt', { unique: false });
          ra6Store.createIndex('docNo', 'docNo', { unique: false });
        }

        // Cleaning Validation records are intentionally isolated from Water Test.
        // recordId is stable across offline saves; worksheetNo is assigned by server sync.
        if (!db.objectStoreNames.contains(STORES.CV_RECORDS)) {
          const cvStore = db.createObjectStore(STORES.CV_RECORDS, { keyPath: 'recordId' });
          cvStore.createIndex('worksheetNo', 'worksheetNo', { unique: false });
          cvStore.createIndex('building', 'building', { unique: false });
          cvStore.createIndex('samplingDate', 'samplingDate', { unique: false });
          cvStore.createIndex('sampleMatrix', 'sampleMatrix', { unique: false });
          cvStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          cvStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Pending Sync store
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const syncStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('worksheetNo', 'worksheetNo', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('dedupeKey', 'dedupeKey', { unique: false });
        } else {
          const syncStore = event.target.transaction.objectStore(STORES.PENDING_SYNC);
          if (!syncStore.indexNames.contains('dedupeKey')) {
            syncStore.createIndex('dedupeKey', 'dedupeKey', { unique: false });
          }
        }

        // Logs store
        if (!db.objectStoreNames.contains(STORES.LOGS)) {
          const logsStore = db.createObjectStore(STORES.LOGS, { keyPath: 'id', autoIncrement: true });
          logsStore.createIndex('timestamp', 'timestamp', { unique: false });
          logsStore.createIndex('action', 'action', { unique: false });
        }

        console.log('Database schema created/upgraded');
      };
    });
  }

  // ============================================
  // Generic CRUD Operations
  // ============================================
  
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    if (storeName === STORES.MASTER_DATA) _masterDataCache = null;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // Master Data Operations
  // ============================================
  
  async loadMasterData(data) {
    // Clear existing data
    await this.clear(STORES.MASTER_DATA);
    _masterDataCache = null;

    // Add new data
    for (const item of data) {
      await this.put(STORES.MASTER_DATA, item);
    }

    _masterDataCache = await this.getAll(STORES.MASTER_DATA);
    console.log(`Loaded ${data.length} master data records`);
  }

  async getMasterDataByBuilding(building) {
    if (_masterDataCache) {
      return _masterDataCache.filter(item => item.building === building);
    }
    return this.getByIndex(STORES.MASTER_DATA, 'building', building);
  }

  // Get master data filtered by building AND waterType (for WFI/PUS)
  async getMasterDataByBuildingAndWaterType(building, waterTypes) {
    const allData = await this.getByIndex(STORES.MASTER_DATA, 'building', building);
    // Filter by waterType array (e.g., ['WFI', 'PUS'])
    return allData.filter(item => waterTypes.includes(item.waterType));
  }

  async getAllBuildings() {
    const allData = await this.getAll(STORES.MASTER_DATA);
    const buildings = [...new Set(allData.map(item => item.building))];
    return buildings.sort();
  }

  // ============================================
  // Record Operations
  // ============================================
  
  async saveRecord(record) {
    // Add metadata
    record.createdAt = record.createdAt || DateUtils.timestamp();
    record.updatedAt = DateUtils.timestamp();
    record.createdBy = Storage.get('username') || 'Unknown';
    
    // Determine which store to use based on recordStatus
    let storeName;
    switch(record.recordStatus) {
      case 'PQ1-2/OLD':
        storeName = STORES.RECORDS_PQ_OLD;
        break;
      case 'PQ1-2/OCL':
        storeName = STORES.RECORDS_PQ_OCL;
        break;
      case 'RAMA6':
        storeName = STORES.RECORDS_RA6;
        break;
      case 'Routine':
      default:
        storeName = STORES.RECORDS;
        break;
    }
    
    // Save to appropriate store
    await this.put(storeName, record);
    
    // Add to pending sync if online sync enabled
    record.domain = record.domain || 'water';
    await this.addToPendingSync({
      worksheetNo: record.worksheetNo,
      action: 'upsert',
      domain: record.domain,
      dedupeKey: `${record.domain}:${record.worksheetNo}:upsert`,
      data: record,
      timestamp: DateUtils.timestamp()
    });
    
    // Log action
    await this.addLog('SAVE_RECORD', record.worksheetNo);
    
    return record;
  }

  /**
   * Save a Cleaning Validation record locally and enqueue exactly one upsert.
   * CV never falls through to Water record stores.
   */
  async saveCvRecord(record) {
    if (!record || !record.recordId) {
      throw new Error('CV recordId is required');
    }

    const now = DateUtils.timestamp();
    const stored = {
      ...record,
      domain: 'CV',
      formType: 'cleaning-validation',
      createdAt: record.createdAt || now,
      updatedAt: now,
      createdBy: record.createdBy || Storage.get('username') || 'Unknown',
      updatedBy: Storage.get('username') || 'Unknown',
      syncStatus: 'PENDING'
    };

    stored.samples = Array.isArray(stored.samples) ? stored.samples : [];
    stored.samplesJson = JSON.stringify(stored.samples);
    stored.sampleCount = stored.samples.length;

    await this.put(STORES.CV_RECORDS, stored);
    await this.addToPendingSync({
      worksheetNo: stored.worksheetNo || '',
      recordId: stored.recordId,
      action: 'upsert',
      domain: 'cv',
      dedupeKey: `cv:${stored.recordId}:upsert`,
      data: stored,
      timestamp: now
    });
    await this.addLog('SAVE_CV_RECORD', stored.recordId);

    return stored;
  }

  async getCvRecord(recordIdOrWorksheetNo) {
    let record = await this.get(STORES.CV_RECORDS, recordIdOrWorksheetNo);
    if (record) return record;

    const matches = await this.getByIndex(STORES.CV_RECORDS, 'worksheetNo', recordIdOrWorksheetNo);
    return matches[0] || null;
  }

  async getAllCvRecords() {
    return this.getAll(STORES.CV_RECORDS);
  }

  async updateCvSyncResult(recordId, syncResult = {}) {
    const record = await this.get(STORES.CV_RECORDS, recordId);
    if (!record) return null;

    const updated = {
      ...record,
      worksheetNo: syncResult.worksheetNo || record.worksheetNo || '',
      docNo: syncResult.docNo || record.docNo || syncResult.worksheetNo || '',
      syncStatus: 'SYNCED',
      syncVersion: syncResult.syncVersion || record.syncVersion || 1,
      updatedAt: DateUtils.timestamp(),
      updatedBy: Storage.get('username') || record.updatedBy || 'Unknown'
    };

    await this.put(STORES.CV_RECORDS, updated);
    await this.addLog('SYNC_CV_RECORD', `${recordId}:${updated.worksheetNo}`);
    return updated;
  }

  // Get record by worksheetNo (search all stores)
  async getRecord(worksheetNo) {
    // Try each store
    let record = await this.get(STORES.RECORDS, worksheetNo);
    if (record) return record;
    
    record = await this.get(STORES.RECORDS_PQ_OLD, worksheetNo);
    if (record) return record;
    
    record = await this.get(STORES.RECORDS_PQ_OCL, worksheetNo);
    if (record) return record;
    
    record = await this.get(STORES.RECORDS_RA6, worksheetNo);
    return record;
  }

  // Get all records from specific store by status
  async getRecordsByStatus(status) {
    switch(status) {
      case 'PQ1-2/OLD':
        return this.getAll(STORES.RECORDS_PQ_OLD);
      case 'PQ1-2/OCL':
        return this.getAll(STORES.RECORDS_PQ_OCL);
      case 'RAMA6':
        return this.getAll(STORES.RECORDS_RA6);
      case 'Routine':
      default:
        return this.getAll(STORES.RECORDS);
    }
  }

  // Get all records from all stores
  async getAllRecords() {
    const routine = await this.getAll(STORES.RECORDS);
    const pqOld = await this.getAll(STORES.RECORDS_PQ_OLD);
    const pqOcl = await this.getAll(STORES.RECORDS_PQ_OCL);
    const ra6 = await this.getAll(STORES.RECORDS_RA6);
    return [...routine, ...pqOld, ...pqOcl, ...ra6];
  }

  async getRecordsByBuilding(building) {
    const routine = await this.getByIndex(STORES.RECORDS, 'building', building);
    const pqOld = await this.getByIndex(STORES.RECORDS_PQ_OLD, 'building', building);
    const pqOcl = await this.getByIndex(STORES.RECORDS_PQ_OCL, 'building', building);
    const ra6 = await this.getByIndex(STORES.RECORDS_RA6, 'building', building);
    return [...routine, ...pqOld, ...pqOcl, ...ra6];
  }

  // ============================================
  // Pending Sync Operations
  // ============================================
  
  async addToPendingSync(syncItem) {
    if (syncItem.dedupeKey) {
      const existing = await this.getByIndex(STORES.PENDING_SYNC, 'dedupeKey', syncItem.dedupeKey);
      for (const item of existing) {
        await this.delete(STORES.PENDING_SYNC, item.id);
      }
    }
    return this.add(STORES.PENDING_SYNC, syncItem);
  }

  async getPendingSync() {
    return this.getAll(STORES.PENDING_SYNC);
  }

  async clearPendingSync() {
    return this.clear(STORES.PENDING_SYNC);
  }

  async removePendingSync(id) {
    return this.delete(STORES.PENDING_SYNC, id);
  }

  // ============================================
  // Log Operations
  // ============================================
  
  async addLog(action, details = '') {
    const log = {
      timestamp: DateUtils.timestamp(),
      action: action,
      details: details,
      username: Storage.get('username') || 'Unknown'
    };
    return this.add(STORES.LOGS, log);
  }

  async getLogs(limit = 100) {
    const allLogs = await this.getAll(STORES.LOGS);
    return allLogs.slice(-limit).reverse();
  }
}

// ============================================
// Singleton Instance
// ============================================
const waterDB = new WaterDB();

// ============================================
// Initialize Database
// ============================================
async function initDatabase() {
  try {
    await waterDB.init();
    
    // Check if master data exists
    const existingData = await waterDB.getAll(STORES.MASTER_DATA);
    
    if (existingData.length === 0) {
      console.log('No master data found. Auto-pulling from Google Sheet...');
      // Master data will be loaded automatically via autoInitializeData()
      // Don't show warning - auto-pull will handle it
    } else {
      console.log(`Master data loaded: ${existingData.length} records`);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}
