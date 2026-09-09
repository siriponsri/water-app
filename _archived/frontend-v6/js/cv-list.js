/** Cleaning Validation local record list. */

let cvListRecords = [];

document.addEventListener('DOMContentLoaded', initializeCvList);

async function initializeCvList() {
  const username = Storage.get('username');
  if (!username) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('usernameDisplay').textContent = username;
  await waterDB.init();
  await reloadCvList();
  await checkPendingSync();

  ['cvSearch', 'cvMatrixFilter', 'cvSyncFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderFilteredCvList);
  });
}

async function reloadCvList() {
  cvListRecords = await waterDB.getAllCvRecords();
  cvListRecords.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  renderCvListStats();
  renderFilteredCvList();
}

function renderCvListStats() {
  document.getElementById('cvTotalCount').textContent = cvListRecords.length;
  document.getElementById('cvPendingCount').textContent =
    cvListRecords.filter(record => record.syncStatus === 'PENDING').length;
  document.getElementById('cvSyncedCount').textContent =
    cvListRecords.filter(record => record.syncStatus === 'SYNCED').length;
}

function cvStatusBadge(status) {
  if (status === 'SYNCED') return '<span class="cv-badge cv-badge--synced">Synced</span>';
  if (status === 'ERROR') return '<span class="cv-badge cv-badge--error">Error</span>';
  return '<span class="cv-badge cv-badge--pending">Pending</span>';
}

function matrixLabel(matrix) {
  return CV_CONFIG.matrices[matrix]?.label || matrix || '-';
}

function renderFilteredCvList() {
  const query = document.getElementById('cvSearch').value.trim().toLowerCase();
  const matrix = document.getElementById('cvMatrixFilter').value;
  const sync = document.getElementById('cvSyncFilter').value;
  const filtered = cvListRecords.filter(record => {
    const haystack = [record.worksheetNo, record.productName, record.productLotNo, record.building, record.sectionName]
      .join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (matrix && record.sampleMatrix !== matrix) return false;
    if (sync && record.syncStatus !== sync) return false;
    return true;
  });
  renderCvRecords(filtered);
}

function renderCvRecords(records) {
  const tbody = document.getElementById('cvRecordsBody');
  const empty = document.getElementById('cvEmptyState');
  if (!records.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = records.map(record => `
    <tr>
      <td><strong>${escapeCvHtml(record.worksheetNo || 'Local draft')}</strong><small>${escapeCvHtml(record.recordId.slice(-12))}</small></td>
      <td><span class="cv-matrix-label">${escapeCvHtml(matrixLabel(record.sampleMatrix))}</span></td>
      <td>${escapeCvHtml(record.productName)}<small>Lot ${escapeCvHtml(record.productLotNo)}</small></td>
      <td>${escapeCvHtml(record.building)}<small>${escapeCvHtml(record.sectionName)}</small></td>
      <td>${escapeCvHtml(cvDisplayDate(record.samplingDate))}</td>
      <td>${record.sampleCount || 0}</td>
      <td>${cvStatusBadge(record.syncStatus)}</td>
      <td><div class="cv-row-actions">
        <a class="cv-action-link" href="form.html?recordId=${encodeURIComponent(record.recordId)}">Edit</a>
        <a class="cv-action-link cv-action-link--primary" href="print.html?recordId=${encodeURIComponent(record.recordId)}">Print</a>
      </div></td>
    </tr>`).join('');
}

async function syncCvAndReload() {
  await syncNow();
  await reloadCvList();
}

