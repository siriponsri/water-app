/** Cleaning Validation print controller. Contact Plate template only. */

const CV_TEMPLATE_NAME = 'cv-contact-template.docx';
const CV_FOLDER_NAME = 'cleaning-validation';
let cvPrintRecords = [];
let selectedCvPrintRecord = null;
let currentCvPdfFiles = [];

document.addEventListener('DOMContentLoaded', initializeCvPrint);

async function initializeCvPrint() {
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('usernameDisplay').textContent = username;
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
    .filter(({ record }) => !query || [record.worksheetNo, record.productName, record.productLotNo]
      .join(' ').toLowerCase().includes(query));

  if (!visible.length) {
    list.innerHTML = '<div class="cv-empty-state"><strong>No local CV records</strong><p>สร้างและบันทึก CV record ก่อน</p></div>';
    return;
  }

  list.innerHTML = visible.map(({ record, index }) => `
    <button type="button" class="cv-print-item ${selectedCvPrintRecord?.recordId === record.recordId ? 'is-active' : ''}" onclick="selectCvPrintRecord(${index})">
      <span>${escapeCvHtml(record.worksheetNo || 'Local draft')}</span>
      <strong>${escapeCvHtml(record.productName || '-')}</strong>
      <small>${escapeCvHtml(CV_CONFIG.matrices[record.sampleMatrix]?.label || record.sampleMatrix)} · ${escapeCvHtml(cvDisplayDate(record.samplingDate))}</small>
    </button>`).join('');
}

function selectCvPrintRecord(index) {
  selectedCvPrintRecord = cvPrintRecords[index];
  renderCvPrintList();
  document.getElementById('selectedCvWorksheet').textContent = selectedCvPrintRecord.worksheetNo || 'Local draft';
  document.getElementById('selectedCvMeta').textContent =
    `${selectedCvPrintRecord.productName || '-'} · ${CV_CONFIG.matrices[selectedCvPrintRecord.sampleMatrix]?.label || '-'}`;

  const contactPlate = selectedCvPrintRecord.sampleMatrix === 'CONTACT_PLATE';
  document.getElementById('btnCvPdf').disabled = !contactPlate;
  document.getElementById('btnCvSavePdf').disabled = !contactPlate;
  document.getElementById('cvPrintGuardrail').hidden = contactPlate;
  previewCvData();
}

function previewCvData() {
  if (!selectedCvPrintRecord) return;
  const record = selectedCvPrintRecord;
  const samples = Array.isArray(record.samples) ? record.samples : parseSamples(record);
  document.getElementById('pdfViewerContent').classList.remove('preview-pdf-mode');
  document.getElementById('pdfViewerContent').innerHTML = `
    <div class="cv-data-preview">
      <div class="cv-preview-header"><span>${escapeCvHtml(record.worksheetNo || 'LOCAL DRAFT')}</span><strong>${escapeCvHtml(record.productName)}</strong><small>Lot ${escapeCvHtml(record.productLotNo)} · Building ${escapeCvHtml(record.building)}</small></div>
      <div class="cv-preview-grid">
        <div><span>Matrix</span><strong>${escapeCvHtml(CV_CONFIG.matrices[record.sampleMatrix]?.label || record.sampleMatrix)}</strong></div>
        <div><span>Sampling</span><strong>${escapeCvHtml(cvDisplayDate(record.samplingDate))}</strong></div>
        <div><span>Section</span><strong>${escapeCvHtml(record.sectionName)}</strong></div>
        <div><span>Overall</span><strong>${escapeCvHtml(record.overallResult || 'REVIEW_REQUIRED')}</strong></div>
      </div>
      <div class="cv-table-wrap"><table class="cv-record-table"><thead><tr><th>#</th><th>Point</th><th>Grade</th><th>Method</th><th>Result</th><th>Spec</th><th>Status</th></tr></thead><tbody>
        ${samples.map((sample, index) => `<tr><td>${index + 1}</td><td>${escapeCvHtml(sample.location || sample.equipment || sample.item || sample.room)}</td><td>${escapeCvHtml(sample.grade)}</td><td>${escapeCvHtml(sample.testMethod)}</td><td>${escapeCvHtml(sample.resultDisplay)}</td><td>${escapeCvHtml(sample.specText)}</td><td>${escapeCvHtml(sample.resultStatus)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  document.querySelector('.pdf-viewer__title').textContent = 'Data preview';
}

function cvPointLabel(sample) {
  return [sample.room, sample.item, sample.equipment, sample.location].filter(Boolean).join(' / ');
}

function mapCvDataToTags(record, pageSamples) {
  const tags = {
    performedDate: formatDateDMY(record.performedDate),
    approvedDate: formatDateDMY(record.approvedDate),
    determinedDate: formatDateDMY(record.determinedDate),
    SectionName: record.sectionName || '',
    samplingDate: formatDateDMY(record.samplingDate),
    docNo: record.docNo || record.worksheetNo || '',
    lotNo: record.productLotNo || '',
    building: record.building || '',
    SamplingTime: record.samplingTime || '',
    ProductName: record.productName || '',
    lotContact: record.lotContact || '',
    lotTSA: record.lotTSA || '',
    GradeControl: pageSamples[0]?.grade || ''
  };

  for (let index = 0; index < CV_CONFIG.contactPlateRowsPerPage; index += 1) {
    const suffix = String(index + 1).padStart(2, '0');
    const sample = pageSamples[index] || {};
    tags[`samplingPoint${suffix}`] = cvPointLabel(sample);
    tags[`Grade${suffix}`] = sample.grade || '';
    tags[`result${suffix}`] = sample.excluded ? 'Excluded' : (sample.resultDisplay || '');
  }
  return tags;
}

function cvPrintKey(record) {
  return record.worksheetNo || `CV-DRAFT-${record.recordId.slice(-8)}`;
}

async function generateCvPdf() {
  if (!selectedCvPrintRecord) {
    UI.showToast('กรุณาเลือก CV record', 'warning');
    return [];
  }
  if (selectedCvPrintRecord.sampleMatrix !== 'CONTACT_PLATE') {
    UI.showToast('ไม่สร้าง PDF ด้วยแบบ Contact Plate ให้กับ Rinse record', 'warning');
    return [];
  }
  await ensureConverterOrThrow();
  const samples = Array.isArray(selectedCvPrintRecord.samples)
    ? selectedCvPrintRecord.samples
    : parseSamples(selectedCvPrintRecord);
  return generatePdfFiles(
    { worksheetNo: cvPrintKey(selectedCvPrintRecord), templateName: CV_TEMPLATE_NAME, formType: CV_FOLDER_NAME },
    samples,
    pageSamples => mapCvDataToTags(selectedCvPrintRecord, pageSamples),
    CV_CONFIG.contactPlateRowsPerPage
  );
}

async function previewCvPdf() {
  try {
    currentCvPdfFiles = await generateCvPdf();
    if (!currentCvPdfFiles.length) return;
    renderPdfViewer(currentCvPdfFiles);
    document.getElementById('pdfViewerContent').classList.add('preview-pdf-mode');
    UI.showToast(`สร้าง PDF สำเร็จ ${currentCvPdfFiles.length} ชุด`, 'success');
  } catch (error) {
    hideProgress();
    UI.showToast(error.message || 'สร้าง PDF ไม่สำเร็จ', 'error');
  }
}

async function saveCvPdf() {
  try {
    const files = await generateCvPdf();
    if (!files.length) return;
    const worksheetNo = cvPrintKey(selectedCvPrintRecord);
    const keys = files.map(file => file.key);
    const overwrite = await checkDesktopOverwrite(worksheetNo, CV_FOLDER_NAME, keys);
    if (!overwrite.proceed) return;
    for (const key of keys) {
      await savePdfToDesktop(key, CV_FOLDER_NAME);
    }
    UI.showToast(`บันทึก PDF ลง Desktop แล้ว ${keys.length} ชุด`, 'success');
  } catch (error) {
    hideProgress();
    UI.showToast(error.message || 'บันทึก PDF ไม่สำเร็จ', 'error');
  }
}

