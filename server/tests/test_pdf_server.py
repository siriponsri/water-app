import json
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pdf_server


@pytest.fixture()
def client(tmp_path, monkeypatch):
    template_dir = tmp_path / 'templates'
    words_dir = tmp_path / 'words'
    pdfs_dir = tmp_path / 'pdfs'
    template_dir.mkdir()
    words_dir.mkdir()
    pdfs_dir.mkdir()
    desktop_dir = tmp_path / 'home' / 'Desktop'
    desktop_dir.mkdir(parents=True)
    for template_name in pdf_server.WORKFLOW_TEMPLATES.values():
        (template_dir / template_name).write_bytes(b'template-' + template_name.encode())

    monkeypatch.setattr(pdf_server, 'TEMPLATE_DIR', str(template_dir))
    monkeypatch.setattr(pdf_server, 'WORDS_DIR', str(words_dir))
    monkeypatch.setattr(pdf_server, 'PDFS_DIR', str(pdfs_dir))
    monkeypatch.setattr(pdf_server.os.path, 'expanduser', lambda _value: str(tmp_path / 'home'))

    def fake_word(_template_path, output_path, _data):
        with zipfile.ZipFile(output_path, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>filled</w:t></w:r></w:p></w:body></w:document>')
        return 1

    def fake_multipage(_template_path, output_path, pages):
        with zipfile.ZipFile(output_path, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>filled</w:t></w:r></w:p></w:body></w:document>')
        return len(pages)

    def fake_convert(_word_path, pdf_path):
        Path(pdf_path).write_bytes(b'%PDF-1.4 test')
        return True, 'test converter', None

    monkeypatch.setattr(pdf_server, 'replace_placeholders_in_file', fake_word)
    monkeypatch.setattr(pdf_server, 'build_multipage_docx', fake_multipage)
    monkeypatch.setattr(pdf_server, 'convert_to_pdf', fake_convert)
    pdf_server.app.config.update(TESTING=True)
    return pdf_server.app.test_client()


def test_pdf_id_lifecycle_and_content_template_cache(client, monkeypatch):
    payload = {
        'workflow': 'pw-prw',
        'worksheetNo': 'PW-26-0001',
        'templateName': '../../untrusted.docx',
        'data': {'analyst': 'A'}
    }
    first = client.post('/api/pdfs', json=payload)
    assert first.status_code == 201
    created = first.get_json()
    assert len(created['pdfId']) == 64
    assert created['cached'] is False

    second = client.post('/api/pdfs', json=payload)
    assert second.status_code == 200
    assert second.get_json() == {**created, 'cached': True}

    metadata = client.get(f"/api/pdfs/{created['pdfId']}")
    assert metadata.status_code == 200
    assert metadata.get_json()['filename'] == 'PW-26-0001.pdf'
    assert str(pdf_server.PDFS_DIR) not in metadata.get_data(as_text=True)

    download = client.get(f"/api/pdfs/{created['pdfId']}/download")
    assert download.status_code == 200
    assert download.mimetype == 'application/pdf'

    inline = client.get(f"/api/pdfs/{created['pdfId']}/download?inline=1")
    assert inline.status_code == 200
    assert 'inline' in inline.headers['Content-Disposition']

    saved = client.post(f"/api/pdfs/{created['pdfId']}/save-desktop", json={})
    assert saved.status_code == 200
    conflict = client.post(f"/api/pdfs/{created['pdfId']}/save-desktop", json={})
    assert conflict.status_code == 409
    overwrite = client.post(f"/api/pdfs/{created['pdfId']}/save-desktop", json={'overwrite': True})
    assert overwrite.status_code == 200


def test_rejects_unknown_workflow_paths_and_validates_cv_routes(client):
    unknown = client.post('/api/pdfs', json={'workflow': '../pdfs', 'data': {}})
    assert unknown.status_code == 400

    missing_method = client.post('/api/pdfs', json={
        'workflow': 'cleaning-validation-rinse-pour',
        'worksheetNo': 'CVR-1',
        'data': {'sampleMatrix': 'Rinse'}
    })
    assert missing_method.status_code == 422

    valid_rinse = client.post('/api/pdfs', json={
        'workflow': 'cleaning-validation-rinse-pour',
        'worksheetNo': 'CVR-1',
        'cvContext': {'samplingFamily': 'Rinse', 'testMethod': 'Pour Plate'},
        'data': {'sampleMatrix': 'Rinse'}
    })
    assert valid_rinse.status_code == 201
    assert valid_rinse.get_json()['pdfId']

    wrong_family = client.post('/api/pdfs', json={
        'workflow': 'cleaning-validation-contact',
        'worksheetNo': 'CV-1',
        'data': {'sampleMatrix': 'Rinse'}
    })
    assert wrong_family.status_code == 422

    assert client.get('/api/pdfs/../../templates/a').status_code == 404
    assert client.get('/server/pdf_server.py').status_code == 404
    assert client.get('/C:/Windows/win.ini').status_code == 404
    assert client.post('/api/pdfs', json={
        'workflow': 'pw-prw', 'worksheetNo': 'CON', 'data': {}
    }).status_code == 400


def test_pdf_capabilities_keep_cv_routes_explicit_and_safe(client):
    response = client.get('/api/pdf-capabilities')
    assert response.status_code == 200
    capabilities = {item['workflow']: item for item in response.get_json()['capabilities']}
    assert capabilities['cleaning-validation-rinse-pour']['owner'] == 'cv'
    assert capabilities['cleaning-validation-rinse-pour']['sourceWorkflow'] == 'pw-prw'
    assert capabilities['cleaning-validation-rinse-membrane']['sourceWorkflow'] == 'wfi-pus'
    assert 'path' not in response.get_data(as_text=True).lower()


def test_legacy_path_apis_are_gone(client):
    assert client.post('/api/convert-word-to-pdf', json={
        'wordPath': 'C:/secret.docx'
    }).status_code == 410
    assert client.get('/api/list-files').status_code == 410


def test_request_limit_and_catalog(client):
    response = client.post(
        '/api/pdfs',
        data=json.dumps({'workflow': 'pw-prw', 'data': {'value': 'x' * (2 * 1024 * 1024)}}),
        content_type='application/json'
    )
    assert response.status_code == 413

    catalog = client.get('/api/catalog/status').get_json()
    assert catalog['pdfUrl'] == '/inventory_catalog.pdf'
    assert catalog['indexUrl'] == '/catalog/inventory-index.json'
    assert catalog['hashMatches'] is True
    assert catalog['indexAvailable'] is True
    assert catalog['rowCount'] == 95
    assert client.get(catalog['indexUrl']).status_code == 200


def test_forged_sidecar_cannot_control_download_or_desktop_path(client):
    created = client.post('/api/pdfs', json={
        'workflow': 'pw-prw', 'worksheetNo': 'PW-1', 'data': {}
    }).get_json()
    _, metadata_path = pdf_server._pdf_paths('pw-prw', created['pdfId'])
    metadata = json.loads(Path(metadata_path).read_text(encoding='utf-8'))
    metadata['filename'] = '../outside.pdf'
    Path(metadata_path).write_text(json.dumps(metadata), encoding='utf-8')

    assert client.get(f"/api/pdfs/{created['pdfId']}").status_code == 404
    assert client.post(f"/api/pdfs/{created['pdfId']}/save-desktop").status_code == 404


def test_malformed_catalog_manifest_fails_closed(client, tmp_path, monkeypatch):
    malformed = tmp_path / 'inventory-index.json'
    malformed.write_text('{broken', encoding='utf-8')
    monkeypatch.setattr(pdf_server, 'INVENTORY_INDEX_PATHS', (str(malformed),))

    response = client.get('/api/catalog/status')
    assert response.status_code == 200
    assert response.get_json()['indexAvailable'] is False


def test_word_timeout_only_targets_recorded_winword_pid(tmp_path, monkeypatch):
    word_path = tmp_path / 'input.docx'
    pdf_path = tmp_path / 'output.pdf'
    word_path.write_bytes(b'word')
    calls = []

    def fake_run(command, **_kwargs):
        calls.append(command)
        if '-File' in command:
            Path(str(word_path) + '.word.pid').write_text('1234', encoding='ascii')
            raise subprocess.TimeoutExpired(command, 60)
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(pdf_server.subprocess, 'run', fake_run)
    success, error = pdf_server.convert_with_word(str(word_path), str(pdf_path))

    assert success is False
    assert 'timeout' in error.lower()
    cleanup = ' '.join(calls[-1])
    assert '1234' in cleanup
    assert 'WINWORD' in cleanup
    assert 'taskkill' not in cleanup.lower()
