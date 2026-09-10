/**
 * ============================================
 * WATER RECORD APP - RPP2 Reader Module
 * Read-only access to RPP2 data via Apps Script API
 * ============================================
 */

class RPP2Reader {
  constructor() {
    // Apps Script Web App URL (will be set after deploying script)
    this.SCRIPT_URL = localStorage.getItem('rpp2_script_url') || '';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Set Apps Script URL
   */
  setScriptURL(url) {
    this.SCRIPT_URL = url;
    localStorage.setItem('rpp2_script_url', url);
  }

  /**
   * Fetch records from RPP2 by date range
   * @param {String} formType - 'air-em', 'air-ca', 'water-prw', 'water-wfi'
   * @param {String} startDate - YYYY-MM-DD
   * @param {String} endDate - YYYY-MM-DD
   * @return {Promise<Array>} Array of records
   */
  async fetchRecords(formType, startDate, endDate) {
    const cacheKey = `fetch_${formType}_${startDate}_${endDate}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`[RPP2Reader] Cache hit: ${cacheKey}`);
        return cached.data;
      }
    }

    try {
      const url = `${this.SCRIPT_URL}?action=fetch&formType=${formType}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });

        return result.data;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[RPP2Reader] Fetch error:', error);
      throw error;
    }
  }

  /**
   * Get single record by worksheetNo
   * @param {String} worksheetNo
   * @return {Promise<Object>} Record object
   */
  async getRecord(worksheetNo) {
    try {
      const url = `${this.SCRIPT_URL}?action=get&worksheetNo=${encodeURIComponent(worksheetNo)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Record not found');
      }
    } catch (error) {
      console.error('[RPP2Reader] Get error:', error);
      throw error;
    }
  }

  /**
   * Search records by query
   * @param {String} query - Search query
   * @param {Object} filters - Additional filters {building, formType, startDate, endDate}
   * @return {Promise<Array>} Array of matching records
   */
  async search(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        action: 'search',
        q: query,
        ...filters
      });

      const url = `${this.SCRIPT_URL}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('[RPP2Reader] Search error:', error);
      throw error;
    }
  }

  /**
   * Update record fields (for fill-in values, control values)
   * @param {String} worksheetNo
   * @param {Object} updates - Fields to update
   * @return {Promise<Object>} Updated record
   */
  async updateRecord(worksheetNo, updates) {
    try {
      const response = await fetch(this.SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          worksheetNo: worksheetNo,
          updates: updates
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Invalidate cache
        this.clearCache();
        return result.data;
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('[RPP2Reader] Update error:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[RPP2Reader] Cache cleared');
  }

  /**
   * Check if API is configured
   */
  isConfigured() {
    return this.SCRIPT_URL && this.SCRIPT_URL.length > 0;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const url = `${this.SCRIPT_URL}?action=ping`;
      const response = await fetch(url);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('[RPP2Reader] Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const rpp2Reader = new RPP2Reader();
