/**
 * ============================================
 * ANF3 QC Auto Sync - Samples JSON Builders
 * ============================================
 */

/**
 * Build samplesJson for Air EM records
 * @param {Array} rows - Array of row objects in the same group
 * @return {String} JSON string of samples array
 */
function buildAirEMSamplesJson(rows) {
  const samples = rows.map((row, index) => {
    return {
      index: index + 1,
      samplingPoint: row.roomNo || '',
      noLocation: row.roomNo || '',
      location: row.roomName || '',
      floor: row.floor || '',
      grade: row.Class || row.class || '',
      tempRoom: row.temp || null,
      rhRoom: row['%rh'] || row.rh || null,
      timeIn: row.timeIn || '',
      timeOut: row.timeOut || '',
      occurResult: row.ColonyCount || row.colonyCount || null,
      remark: row.remark || ''
    };
  });

  return JSON.stringify(samples);
}

/**
 * Build samplesJson for Air CA records
 * @param {Array} rows - Array of row objects in the same group
 * @param {Object} caDatabase - CA database for grade lookup
 * @return {String} JSON string of samples array
 */
function buildAirCASamplesJson(rows, caDatabase) {
  const samples = rows.map((row, index) => {
    // Lookup grade from CA database
    const roomNo = row.roomNo;
    const grade = caDatabase[roomNo] ? caDatabase[roomNo].grade : 'D';

    return {
      index: index + 1,
      samplingPoint: row.roomNo || '',
      noLocation: row.roomNo || '',
      location: row.roomName || '',
      samplingTag: row.Tag || row.tag || '',
      grade: grade,
      airType: row['Gass Type'] || row.gassType || '',
      temp: row.temp || null,
      rh: row['%rh'] || row.rh || null,
      occResult: row.ColonyCount || row.colonyCount || null,
      remark: row.remark || ''
    };
  });

  return JSON.stringify(samples);
}

/**
 * Build samplesJson for Water PRW/PW records
 * @param {Array} rows - Array of row objects in the same group
 * @return {String} JSON string of samples array
 */
function buildWaterPRWSamplesJson(rows) {
  const samples = rows.map((row, index) => {
    return {
      index: index + 1,
      samplingPoint: row.samplingPoint || '',
      samplingTag: row.samplingTag || '',
      location: row.location || '',
      noLocation: row.noLocation || '',
      waterType: row.waterType || '',
      result1: row.result1 || null,
      result2: row.result2 || null,
      resultAvg: row.resultAvg || null,
      remark: row.comment || ''
    };
  });

  return JSON.stringify(samples);
}

/**
 * Build samplesJson for Water WFI records
 * @param {Array} rows - Array of row objects in the same group
 * @return {String} JSON string of samples array
 */
function buildWaterWFISamplesJson(rows) {
  const samples = rows.map((row, index) => {
    return {
      index: index + 1,
      samplingPoint: row.samplingPoint || '',
      samplingTag: row.samplingTag || '',
      location: row.location || '',
      noLocation: row.noLocation || '',
      waterType: row.waterType || '',
      result1: row.result1 || null,
      resultAvg: row.resultAvg || null,
      remark: row.comment || ''
    };
  });

  return JSON.stringify(samples);
}
