/** Cleaning Validation form controller. */

let currentCvRecordId = '';
let currentCvRecord = null;
let cvRowCounter = 0;

document.addEventListener('DOMContentLoaded', initializeCvForm);

async function initializeCvForm() {
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = username;
  await waterDB.init();

  const params = new URLSearchParams(window.location.search);
  currentCvRecordId = params.get('recordId') || '';

  if (currentCvRecordId) {
    currentCvRecord = await waterDB.getCvRecord(currentCvRecordId);
  }

  if (currentCvRecord) {
    populateCvForm(currentCvRecord);
  } else {
    setCvDefaultDates();
    addCvSampleRow();
    addCvSampleRow();
    addCvSampleRow();
  }

  onCvMatrixChange();
  updateCvDraftLabel();
  await checkPendingSync();
}

function setCvDefaultDates() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  document.getElementById('samplingDate').value = localDate;
}

function updateCvDraftLabel() {
  const label = currentCvRecord?.worksheetNo
    || (currentCvRecordId ? `Draft ${currentCvRecordId.slice(-8)}` : 'New local draft');
  document.getElementById('worksheetNoDisplay').textContent = label;
}

function matrixDefinition() {
  const matrix = document.getElementById('sampleMatrix').value;
  return CV_CONFIG.matrices[matrix] || CV_CONFIG.matrices.CONTACT_PLATE;
}

function onCvMatrixChange() {
  const matrix = document.getElementById('sampleMatrix').value;
  const definition = matrixDefinition();
  document.getElementById('matrixHelp').textContent =
    `${definition.label} • ${definition.samplingMethod} • Default ${definition.testMethod}`;

  document.querySelectorAll('#cvSamplesBody tr').forEach(row => {
    row.dataset.matrix = matrix;
    const samplingMethod = row.querySelector('[data-field="samplingMethod"]');
    const testMethod = row.querySelector('[data-field="testMethod"]');
    const unit = row.querySelector('[data-field="unit"]');
    if (samplingMethod) samplingMethod.value = definition.samplingMethod;
    if (testMethod && !testMethod.dataset.userChanged) testMethod.value = definition.testMethod;
    if (unit && !unit.dataset.userChanged) unit.value = definition.unit;
  });

  document.getElementById('contactPlateLots').hidden = matrix !== 'CONTACT_PLATE';
  document.getElementById('rinseNotice').hidden = matrix === 'CONTACT_PLATE';
}

function addCvSampleRow(seed = {}) {
  if (document.querySelectorAll('#cvSamplesBody tr').length >= CV_CONFIG.maxSampleRows) {
    UI.showToast(`เพิ่มได้สูงสุด ${CV_CONFIG.maxSampleRows} จุด`, 'warning');
    return;
  }

  cvRowCounter += 1;
  const rowId = seed.sampleId || createCvId('CVS');
  const definition = matrixDefinition();
  const tbody = document.getElementById('cvSamplesBody');
  const tr = document.createElement('tr');
  tr.dataset.sampleId = rowId;
  tr.dataset.matrix = document.getElementById('sampleMatrix').value;
  tr.innerHTML = `
    <td class="cv-row-number"></td>
    <td><input data-field="room" value="${escapeCvHtml(seed.room)}" placeholder="Room"></td>
    <td>
      <select data-field="grade">
        ${['A', 'C', 'D'].map(value => `<option value="${value}" ${(seed.grade || 'D') === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select>
    </td>
    <td><div class="cv-mini-stack">
      <input data-field="item" value="${escapeCvHtml(seed.item)}" placeholder="Item">
      <input data-field="equipment" value="${escapeCvHtml(seed.equipment)}" placeholder="Equipment">
    </div></td>
    <td><input data-field="location" value="${escapeCvHtml(seed.location)}" placeholder="Sampling location"></td>
    <td><input data-field="samplingMethod" value="${escapeCvHtml(seed.samplingMethod || definition.samplingMethod)}" readonly></td>
    <td>
      <select data-field="testMethod">
        ${['Contact plate', 'Memb. Filtration', 'Pour plate'].map(value => `<option value="${value}" ${(seed.testMethod || definition.testMethod) === value ? 'selected' : ''}>${value}</option>`).join('')}
      </select>
    </td>
    <td><input data-field="result" value="${escapeCvHtml(seed.resultDisplay)}" placeholder="0, &lt;1, TNTC"></td>
    <td><input data-field="specText" value="${escapeCvHtml(seed.specText)}" placeholder="e.g. ≤ 5"></td>
    <td><input data-field="unit" value="${escapeCvHtml(seed.unit || definition.unit)}" placeholder="Unit"></td>
    <td><div class="cv-mini-stack cv-mini-stack--compact">
      <input data-field="settlePlate" value="${escapeCvHtml(seed.settlePlate)}" placeholder="Settle plate">
      <input data-field="fingerDabLeft" value="${escapeCvHtml(seed.fingerDabLeft)}" placeholder="Finger L">
      <input data-field="fingerDabRight" value="${escapeCvHtml(seed.fingerDabRight)}" placeholder="Finger R">
    </div></td>
    <td><input data-field="note" value="${escapeCvHtml(seed.note)}" placeholder="Note"></td>
    <td class="cv-center"><input type="checkbox" data-field="excluded" ${seed.excluded ? 'checked' : ''} aria-label="Exclude row"></td>
    <td><button type="button" class="cv-icon-button" onclick="removeCvSampleRow(this)" aria-label="Remove row">×</button></td>`;

  const testMethod = tr.querySelector('[data-field="testMethod"]');
  const unit = tr.querySelector('[data-field="unit"]');
  if (seed.testMethod) testMethod.dataset.userChanged = 'true';
  if (seed.unit) unit.dataset.userChanged = 'true';
  testMethod.addEventListener('change', () => { testMethod.dataset.userChanged = 'true'; });
  unit.addEventListener('input', () => { unit.dataset.userChanged = 'true'; });

  tbody.appendChild(tr);
  renumberCvRows();
}

function removeCvSampleRow(button) {
  const rows = document.querySelectorAll('#cvSamplesBody tr');
  if (rows.length <= 1) {
    UI.showToast('ต้องมีอย่างน้อย 1 จุดเก็บตัวอย่าง', 'warning');
    return;
  }
  button.closest('tr').remove();
  renumberCvRows();
}

function renumberCvRows() {
  document.querySelectorAll('#cvSamplesBody tr').forEach((row, index) => {
    row.querySelector('.cv-row-number').textContent = index + 1;
  });
  document.getElementById('sampleCountBadge').textContent =
    `${document.querySelectorAll('#cvSamplesBody tr').length} points`;
}

function getCvField(row, field) {
  const input = row.querySelector(`[data-field="${field}"]`);
  if (!input) return '';
  if (input.type === 'checkbox') return input.checked;
  return input.value.trim();
}

function collectCvSamples() {
  const matrix = document.getElementById('sampleMatrix').value;
  const building = document.getElementById('building').value.trim();

  return [...document.querySelectorAll('#cvSamplesBody tr')].map((row, index) => {
    const result = normalizeCvResult(getCvField(row, 'result'));
    const spec = parseCvSpec(getCvField(row, 'specText'));
    const excluded = getCvField(row, 'excluded');

    return {
      sampleId: row.dataset.sampleId,
      rowNo: index + 1,
      sampleMatrix: matrix,
      building,
      room: getCvField(row, 'room'),
      grade: getCvField(row, 'grade'),
      item: getCvField(row, 'item'),
      equipment: getCvField(row, 'equipment'),
      location: getCvField(row, 'location'),
      samplingMethod: getCvField(row, 'samplingMethod'),
      testMethod: getCvField(row, 'testMethod'),
      iterationNo: Number(document.getElementById('cleaningRunNo').value || 1),
      countValue: result.resultValue,
      ...result,
      specOperator: spec.operator,
      specValue: spec.value,
      specText: spec.text,
      unit: getCvField(row, 'unit'),
      settlePlate: getCvField(row, 'settlePlate'),
      fingerDabLeft: getCvField(row, 'fingerDabLeft'),
      fingerDabRight: getCvField(row, 'fingerDabRight'),
      excluded,
      note: getCvField(row, 'note'),
      resultStatus: excluded ? 'EXCLUDED' : evaluateCvResult(result, spec)
    };
  });
}

function collectCvRecord() {
  const samples = collectCvSamples();
  const recordId = currentCvRecordId || createCvId();
  return {
    ...(currentCvRecord || {}),
    recordId,
    worksheetNo: currentCvRecord?.worksheetNo || '',
    domain: 'CV',
    recordStatus: document.getElementById('recordStatus').value,
    cvType: document.getElementById('cvType').value,
    sampleMatrix: document.getElementById('sampleMatrix').value,
    building: document.getElementById('building').value.trim(),
    sectionName: document.getElementById('sectionName').value.trim(),
    productName: document.getElementById('productName').value.trim(),
    productLotNo: document.getElementById('productLotNo').value.trim(),
    cleaningRunNo: Number(document.getElementById('cleaningRunNo').value || 1),
    samplingDate: document.getElementById('samplingDate').value,
    samplingTime: document.getElementById('samplingTime').value,
    performedDate: document.getElementById('performedDate').value,
    determinedDate: document.getElementById('determinedDate').value,
    approvedDate: document.getElementById('approvedDate').value,
    lotContact: document.getElementById('lotContact').value.trim(),
    lotTSA: document.getElementById('lotTSA').value.trim(),
    docNo: document.getElementById('docNo').value.trim(),
    reviewStatus: document.getElementById('reviewStatus').value,
    overallResult: calculateCvOverallResult(samples),
    syncStatus: 'PENDING',
    samples,
    samplesJson: JSON.stringify(samples),
    sampleCount: samples.length,
    sourceSystem: 'LOCAL_APP',
    sourceRecordKey: recordId,
    syncVersion: currentCvRecord?.syncVersion || 0
  };
}

function validateCvRecord(record) {
  const missing = [];
  if (!record.building) missing.push('Building');
  if (!record.sectionName) missing.push('Section');
  if (!record.productName) missing.push('Product');
  if (!record.productLotNo) missing.push('Product lot');
  if (!record.samplingDate) missing.push('Sampling date');

  const activeSamples = record.samples.filter(sample => !sample.excluded);
  if (!activeSamples.length) missing.push('Active sample point');
  if (activeSamples.some(sample => !sample.location && !sample.equipment && !sample.item)) {
    missing.push('Location / Equipment / Item in every active row');
  }
  if (record.reviewStatus !== 'DRAFT' && activeSamples.some(sample => sample.resultQualifier === 'NOT_TESTED')) {
    missing.push('Result in every active row before review');
  }

  if (missing.length) {
    UI.showToast(`กรุณาตรวจสอบ: ${missing.join(', ')}`, 'error', 7000);
    return false;
  }
  return true;
}

async function saveCvForm() {
  const record = collectCvRecord();
  if (!validateCvRecord(record)) return;

  UI.showLoading('กำลังบันทึก CV ลงเครื่อง...');
  try {
    currentCvRecord = await waterDB.saveCvRecord(record);
    currentCvRecordId = currentCvRecord.recordId;
    window.history.replaceState({}, '', `form.html?recordId=${encodeURIComponent(currentCvRecordId)}`);
    updateCvDraftLabel();
    await checkPendingSync();
    UI.showToast('บันทึก CV แล้ว — รอ Sync โดยไม่ส่งซ้ำ', 'success');
  } catch (error) {
    console.error(error);
    UI.showToast(`บันทึกไม่สำเร็จ: ${error.message}`, 'error');
  } finally {
    UI.hideLoading();
  }
}

function populateCvForm(record) {
  const fields = [
    'recordStatus', 'cvType', 'sampleMatrix', 'building', 'sectionName', 'productName',
    'productLotNo', 'cleaningRunNo', 'samplingDate', 'samplingTime', 'performedDate',
    'determinedDate', 'approvedDate', 'lotContact', 'lotTSA', 'docNo', 'reviewStatus'
  ];
  fields.forEach(field => {
    const input = document.getElementById(field);
    if (input && record[field] !== undefined && record[field] !== null) input.value = record[field];
  });

  document.getElementById('cvSamplesBody').innerHTML = '';
  const samples = Array.isArray(record.samples) ? record.samples : parseSamples(record);
  (samples.length ? samples : [{}]).forEach(addCvSampleRow);
}

function resetCvForm() {
  if (!confirm('ล้างข้อมูลบนหน้าจอและเริ่ม Draft ใหม่?')) return;
  currentCvRecordId = '';
  currentCvRecord = null;
  document.getElementById('cvForm').reset();
  document.getElementById('cvSamplesBody').innerHTML = '';
  window.history.replaceState({}, '', 'form.html');
  setCvDefaultDates();
  addCvSampleRow();
  addCvSampleRow();
  addCvSampleRow();
  onCvMatrixChange();
  updateCvDraftLabel();
}

function goToCvPrint() {
  if (!currentCvRecordId) {
    UI.showToast('กรุณาบันทึกก่อนเปิดหน้าพิมพ์', 'warning');
    return;
  }
  window.location.href = `print.html?recordId=${encodeURIComponent(currentCvRecordId)}`;
}
