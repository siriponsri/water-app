/** Cleaning Validation print controller with method-aware template routing. */

const CV_PRINT_ROUTES = Object.freeze({
  CONTACT_PLATE: Object.freeze({
    family: 'contact-plate',
    method: 'contact-plate',
    label: 'Contact Plate',
    template: 'cv-contact-template.docx',
    workflow: 'cleaning-validation-contact',
    samplesPerPage: 10
  }),
  PW_PRW: Object.freeze({
    family: 'rinse',
    method: 'pour-plate',
    label: 'Rinse - Pour Plate',
    template: 'pw-prw-template.docx',
    workflow: 'cleaning-validation-rinse-pour',
    samplesPerPage: 30
  }),
  WFI_PUS: Object.freeze({
    family: 'rinse',
    method: 'membrane-filtration',
    label: 'Rinse - Membrane Filtration',
    template: 'wfi-pus-template.docx',
    workflow: 'cleaning-validation-rinse-membrane',
    samplesPerPage: 30
  })
});

let cvPrintRecords = [];
let selectedCvPrintRecord = null;
let selectedCvPrintMethod = '';
let selectedCvPrintRoute = null;
let currentCvPdf = null;

document.addEventListener('DOMContentLoaded', initializeCvPrint);

async function initializeCvPrint() {
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('usernameDisplay').textContent = username;
  ['Comment', 'IncNo', 'Temp'].forEach(name => {
    const el = document.getElementById('cvOverride' + name);
    if (el) el.value = sessionStorage.getItem('cvOverride' + name) || '';
    el?.addEventListener('input', () => sessionStorage.setItem('cvOverride' + name, el.value));
  });
  await waterDB.init();
  cvPrintRecords = await waterDB.getAllCvRecords();
  cvPrintRecords.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  renderCvPrintList();

  const requestedId = new URLSearchParams(window.location.search).get('recordId');
  if (requestedId) {
    const index = cvPrintRecords.findIndex(record => record.recordId === requestedId);
    if (index >= 0) selectCvPrintRecord(index);
  }
}

function renderCvPrintList() {
  const query = document.getElementById('cvPrintSearch').value.trim().toLowerCase();
  const list = document.getElementById('cvPrintList');
  const visible = cvPrintRecords
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => !query || [record.worksheetNo, record.productName, record.productLotNo, record.building]
      .join(' ').toLowerCase().includes(query));

  if (!visible.length) {
    list.innerHTML = '<div class="cv-empty-state"><strong>No local CV records</strong><p>Create and save a CV record before opening print preview.</p></div>';
    return;
  }

  list.innerHTML = visible.map(({ record, index }) => `
    <button type="button" class="cv-print-item ${selectedCvPrintRecord?.recordId === record.recordId ? 'is-active' : ''}" onclick="selectCvPrintRecord(${index})">
      <span>${escapeCvHtml(record.worksheetNo || 'Local draft')}</span>
      <strong>${escapeCvHtml(record.productName || '-')}</strong>
      <small>${escapeCvHtml(cvMatrixLabel(record))} | ${escapeCvHtml(cvDisplayDate(record.samplingDate))}</small>
    </button>`).join('');
}

function selectCvPrintRecord(index) {
  selectedCvPrintRecord = cvPrintRecords[index];
  selectedCvPrintMethod = cvMethodForRecord(selectedCvPrintRecord);
  currentCvPdf = null;
  renderCvPrintList();
  document.getElementById('selectedCvWorksheet').textContent = selectedCvPrintRecord.worksheetNo || 'Local draft';
  document.getElementById('selectedCvMeta').textContent =
    `${selectedCvPrintRecord.productName || '-'} | ${cvMatrixLabel(selectedCvPrintRecord)} | Building ${selectedCvPrintRecord.building || '-'}`;
  previewCvData();
  updateCvPrintRoute();
}

function previewCvData() {
  if (!selectedCvPrintRecord) return;
  const record = selectedCvPrintRecord;
  const samples = cvSamplesForRecord(record);
  document.getElementById('pdfViewerContent').classList.remove('preview-pdf-mode');
  document.getElementById('pdfViewerContent').innerHTML = `
    <div class="cv-data-preview">
      <div class="cv-preview-header"><span>${escapeCvHtml(record.worksheetNo || 'LOCAL DRAFT')}</span><strong>${escapeCvHtml(record.productName || '-')}</strong><small>Lot ${escapeCvHtml(record.productLotNo || '-')} | Building ${escapeCvHtml(record.building || '-')}</small></div>
      <div class="cv-preview-grid">
        <div><span>Matrix</span><strong>${escapeCvHtml(cvMatrixLabel(record))}</strong></div>
        <div><span>Sampling</span><strong>${escapeCvHtml(cvDisplayDate(record.samplingDate))}</strong></div>
        <div><span>Test method</span><strong>${escapeCvHtml(cvMethodLabel(cvMethodForRecord(record)) || 'Needs review')}</strong></div>
        <div><span>Overall</span><strong>${escapeCvHtml(record.overallResult || 'REVIEW_REQUIRED')}</strong></div>
      </div>
      <div class="cv-table-wrap"><table class="cv-record-table"><thead><tr><th>#</th><th>Point</th><th>Grade</th><th>Method</th><th>Result</th><th>Spec</th><th>Status</th></tr></thead><tbody>
        ${samples.map((sample, index) => `<tr><td>${index + 1}</td><td>${escapeCvHtml(cvPointLabel(sample))}</td><td>${escapeCvHtml(sample.grade)}</td><td>${escapeCvHtml(sample.testMethod)}</td><td>${escapeCvHtml(cvSampleResult(sample))}</td><td>${escapeCvHtml(sample.specText)}</td><td>${escapeCvHtml(sample.resultStatus)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  document.querySelector('.pdf-viewer__title').textContent = 'Data preview';
}

function onCvPrintMethodChange(value) {
  selectedCvPrintMethod = String(value || '');
  currentCvPdf = null;
  updateCvPrintRoute();
}

function updateCvPrintRoute() {
  const route = selectedCvPrintRecord ? cvRouteForRecord(selectedCvPrintRecord, selectedCvPrintMethod) : null;
  selectedCvPrintRoute = route;
  const family = selectedCvPrintRecord ? cvSamplingFamily(selectedCvPrintRecord) : '';
  const methodPicker = document.getElementById('cvMethodPicker');
  const routeLabel = document.getElementById('cvTemplateRoute');
  const routeDetail = document.getElementById('cvTemplateRouteDetail');
  const guardrail = document.getElementById('cvPrintGuardrail');
  const pdfButton = document.getElementById('btnCvPdf');
  const saveButton = document.getElementById('btnCvSavePdf');

  if (methodPicker) {
    methodPicker.hidden = family !== 'rinse';
    methodPicker.querySelectorAll('input[type="radio"]').forEach(input => {
      input.checked = input.value === selectedCvPrintMethod;
      input.disabled = family === 'rinse' && selectedCvPrintRecord &&
        ((cvMatrix(selectedCvPrintRecord) === 'PW_PRW' && input.value !== 'pour-plate') ||
         (cvMatrix(selectedCvPrintRecord) === 'WFI_PUS' && input.value !== 'membrane-filtration'));
    });
  }

  if (route) {
    routeLabel.textContent = `${route.label} | ${route.template}`;
    routeDetail.textContent = `Server route: ${route.workflow}. The source template family is reused through a CV-owned adapter.`;
    guardrail.hidden = true;
    pdfButton.disabled = false;
    saveButton.disabled = false;
    return;
  }

  routeLabel.textContent = selectedCvPrintRecord ? 'Route requires review' : 'Select a record';
  routeDetail.textContent = selectedCvPrintRecord ? 'Choose the method that matches the recorded matrix before generating a document.' : 'The selected CV record determines the controlled route.';
  guardrail.hidden = !selectedCvPrintRecord;
  if (selectedCvPrintRecord) {
    guardrail.innerHTML = '<strong>Document route is unavailable.</strong> This record has a missing, unknown, or conflicting Rinse method. Correct the record before generating a PDF.';
  }
  pdfButton.disabled = true;
  saveButton.disabled = true;
}

function cvPointLabel(sample) {
  return [sample.room, sample.item, sample.equipment, sample.location].filter(Boolean).join(' / ');
}

function cvSampleResult(sample) {
  if (sample.excluded) return 'Excluded';
  if (sample.resultDisplay !== undefined && sample.resultDisplay !== '') return sample.resultDisplay;
  if (sample.resultValue !== undefined && sample.resultValue !== null && sample.resultValue !== '') return String(sample.resultValue);
  return '';
}

function cvSamplesForRecord(record) {
  return Array.isArray(record.samples) ? record.samples : parseSamples(record);
}

function cvMatrix(value) {
  const token = String(value || '').trim().toUpperCase().replace(/[\s_.:,;\-/]+/g, '');
  if (token.includes('CONTACT') || token === 'CV' || token === 'CEHT') return 'CONTACT_PLATE';
  if (token.includes('PRW') || token.includes('PW')) return 'PW_PRW';
  if (token.includes('WFI') || token.includes('PUS')) return 'WFI_PUS';
  return '';
}

function cvSamplingFamily(record) {
  const matrix = cvMatrix(record.sampleMatrix || record.samplingFamily);
  if (matrix === 'CONTACT_PLATE') return 'contact-plate';
  if (matrix === 'PW_PRW' || matrix === 'WFI_PUS') return 'rinse';
  const token = String(record.samplingFamily || '').toUpperCase();
  return token.includes('RINSE') ? 'rinse' : '';
}

function cvMethod(value) {
  const token = String(value || '').trim().toUpperCase().replace(/[\s_.\-/]+/g, '');
  if (!token) return '';
  if (token.includes('POURPLATE') || token === 'POUR') return 'pour-plate';
  if (token.includes('MEMBRANE') || token.includes('MEMB')) return 'membrane-filtration';
  if (token.includes('CONTACTPLATE') || token === 'CONTACT') return 'contact-plate';
  return 'unknown';
}

function cvMethodForRecord(record) {
  const matrix = cvMatrix(record.sampleMatrix || record.samplingFamily);
  const expected = matrix === 'PW_PRW' ? 'pour-plate' : matrix === 'WFI_PUS' ? 'membrane-filtration' : matrix === 'CONTACT_PLATE' ? 'contact-plate' : '';
  const supplied = [record.testMethod, record.method]
    .concat(cvSamplesForRecord(record).map(sample => sample.testMethod || sample.method))
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(cvMethod);
  if (supplied.includes('unknown') || new Set(supplied).size > 1) return '';
  if (supplied[0] && expected && supplied[0] !== expected) return '';
  return supplied[0] || expected;
}

function cvRouteForRecord(record, selectedMethod) {
  const matrix = cvMatrix(record.sampleMatrix || record.samplingFamily);
  const method = selectedMethod || cvMethodForRecord(record);
  if (matrix === 'CONTACT_PLATE' && (!method || method === 'contact-plate')) return CV_PRINT_ROUTES.CONTACT_PLATE;
  if (matrix === 'PW_PRW' && method === 'pour-plate') return CV_PRINT_ROUTES.PW_PRW;
  if (matrix === 'WFI_PUS' && method === 'membrane-filtration') return CV_PRINT_ROUTES.WFI_PUS;
  return null;
}

function cvMatrixLabel(record) {
  const matrix = cvMatrix(record.sampleMatrix || record.samplingFamily);
  return CV_CONFIG.matrices[matrix]?.label || record.sampleMatrix || 'Unknown matrix';
}

function cvMethodLabel(method) {
  const labels = { 'contact-plate': 'Contact Plate', 'pour-plate': 'Pour Plate', 'membrane-filtration': 'Membrane Filtration' };
  return labels[method] || '';
}

function cvCommonTags(record, worksheetNo) {
  return {
    docNo: record.docNo || worksheetNo,
    building: record.building || '',
    samplingDate: formatDateDMY(record.samplingDate) || '',
    performedDate: formatDateDMY(record.performedDate) || '',
    determinedDate: formatDateDMY(record.determinedDate) || '',
    approvedDate: formatDateDMY(record.approvedDate) || '',
    gradeControl: record.gradeControl || '',
    temp: record.temp || '',
    incNo: record.incNo || '',
    rightEM: record.rightEM || '',
    leftEM: record.leftEM || '',
    rightHand: record.rightHand || '',
    leftHand: record.leftHand || '',
    rightEm: record.rightEm || '',
    leftEm: record.leftEm || '',
    negativeValue: record.negativeValue || '',
    lotTSA: stripApostrophe(record.lotTSA || ''),
    lotPCA: stripApostrophe(record.lotPCA || ''),
    lotPlate: stripApostrophe(record.lotPlate || ''),
    lotPipette: stripApostrophe(record.lotPipette || ''),
    lotMembrane: stripApostrophe(record.lotMembrane || ''),
    lotForceps: stripApostrophe(record.lotForceps || ''),
    lotBuffer: stripApostrophe(record.lotBuffer || ''),
    comment: record.comment || ''
  };
}

function mapCvTags(record, route, pageSamples, worksheetNo) {
  const tags = cvCommonTags(record, worksheetNo);
  for (let index = 1; index <= route.samplesPerPage; index += 1) {
    const suffix = String(index).padStart(2, '0');
    const sample = pageSamples[index - 1];
    const point = sample ? cvPointLabel(sample) : '';
    const result = sample ? cvSampleResult(sample) : '';
    const sampleId = sample ? String(sample.sampleId || '') : '';
    // Rinse templates use tagNo for the sampling point label. Keep the
    // samplingPoint placeholders blank to match the authoritative DOCX.
    const isRinse = route !== CV_PRINT_ROUTES.CONTACT_PLATE;
    tags[`samplingPoint${suffix}`] = isRinse ? '' : point;
    tags[`tagNo${suffix}`] = isRinse ? point : sampleId;
    if (route === CV_PRINT_ROUTES.CONTACT_PLATE) {
      tags[`Grade${suffix}`] = sample?.grade || '';
      tags[`result${suffix}`] = result;
    } else if (route === CV_PRINT_ROUTES.PW_PRW) {
      tags[`result1${suffix}`] = '';
      tags[`result2${suffix}`] = '';
      tags[`resultAvg${suffix}`] = '';
    } else {
      tags[`result${suffix}`] = '';
    }
  }
  return tags;
}

function cvPrintKey(record) {
  return record.worksheetNo || `CV-DRAFT-${String(record.recordId || 'LOCAL').slice(-8)}`;
}

async function createCvPdf() {
  if (!selectedCvPrintRecord) {
    UI.showToast('Select a CV record before generating a PDF.', 'warning');
    return null;
  }
  const route = cvRouteForRecord(selectedCvPrintRecord, selectedCvPrintMethod);
  if (!route) {
    updateCvPrintRoute();
    UI.showToast('The selected CV record has no valid document route. Check its matrix and test method.', 'warning');
    return null;
  }

  await ensureConverterOrThrow();
  const worksheetNo = cvPrintKey(selectedCvPrintRecord);
  const samples = cvSamplesForRecord(selectedCvPrintRecord);
  if (!samples.length) throw new Error('This CV record has no sample rows to print.');
  const pages = [];
  const overrides = {};
  const comment = document.getElementById('cvOverrideComment')?.value || '';
  const incNo = document.getElementById('cvOverrideIncNo')?.value || '';
  const temp = document.getElementById('cvOverrideTemp')?.value || '';
  if (comment) overrides.comment = comment;
  if (incNo) overrides.incNo = incNo;
  if (temp && !Number.isNaN(Number(temp))) overrides.temp = String(Math.round(Number(temp)));
  for (let offset = 0; offset < samples.length; offset += route.samplesPerPage) {
    pages.push({
      worksheetNo,
      ...mapCvTags(selectedCvPrintRecord, route, samples.slice(offset, offset + route.samplesPerPage), worksheetNo),
      ...overrides
    });
  }

  const response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/pdfs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow: route.workflow,
      worksheetNo,
      cvContext: { samplingFamily: route.family, testMethod: route.method },
      data: {
        sampleMatrix: selectedCvPrintRecord.sampleMatrix,
        testMethod: route.method,
        samples: samples
      },
      pages
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.pdfId) throw new Error(result.error || 'PDF generation failed.');
  return { pdfId: result.pdfId, key: worksheetNo, url: `${PRINT_CONFIG.SERVER_URL}/api/pdfs/${result.pdfId}/download?inline=1`, route, recordId: selectedCvPrintRecord.recordId };
}

async function previewCvPdf() {
  try {
    currentCvPdf = await createCvPdf();
    if (!currentCvPdf) return;
    renderPdfViewer([{ key: currentCvPdf.key, url: currentCvPdf.url }]);
    UI.showToast(`PDF ready: ${currentCvPdf.route.label}.`, 'success');
  } catch (error) {
    hideProgress();
    UI.showToast(error.message || 'PDF generation failed.', 'error');
  }
}

async function saveCvPdf() {
  try {
    if (!currentCvPdf || currentCvPdf.recordId !== selectedCvPrintRecord?.recordId || currentCvPdf.route !== selectedCvPrintRoute) {
      currentCvPdf = await createCvPdf();
    }
    if (!currentCvPdf) return;
    let response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/pdfs/${currentCvPdf.pdfId}/save-desktop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overwrite: false })
    });
    if (response.status === 409) {
      const conflict = await response.json().catch(() => ({}));
      if (!confirm(`A PDF named ${conflict.filename || `${currentCvPdf.key}.pdf`} already exists on Desktop. Replace it?`)) return;
      response = await fetch(`${PRINT_CONFIG.SERVER_URL}/api/pdfs/${currentCvPdf.pdfId}/save-desktop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite: true })
      });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not save PDF to Desktop.');
    UI.showToast(`Saved ${result.filename || `${currentCvPdf.key}.pdf`} to Desktop.`, 'success');
  } catch (error) {
    hideProgress();
    UI.showToast(error.message || 'PDF save failed.', 'error');
  }
}
