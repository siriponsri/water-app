from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from html import unescape
from xml.etree import ElementTree
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def controlled_root() -> Path | None:
    parser = argparse.ArgumentParser(description="Validate public CV source or controlled CV assets")
    parser.add_argument(
        "--controlled-dir",
        type=Path,
        help="external release directory containing the controlled CV template",
    )
    args = parser.parse_args()
    if args.controlled_dir is None:
        return None
    candidate = args.controlled_dir.expanduser().resolve()
    assert candidate.is_dir(), f"Controlled release directory does not exist: {candidate}"
    return candidate


class ResourceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.resources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get('id'):
            self.ids.append(values['id'])
        key = 'href' if tag in {'a', 'link'} else 'src' if tag in {'script', 'img'} else None
        if key and values.get(key):
            self.resources.append(values[key])


def validate_html() -> None:
    for html_path in sorted((ROOT / 'cv').glob('*.html')):
        parser = ResourceParser()
        parser.feed(html_path.read_text(encoding='utf-8'))
        duplicates = {value for value in parser.ids if parser.ids.count(value) > 1}
        assert not duplicates, f'{html_path}: duplicate IDs {duplicates}'
        for resource in parser.resources:
            parsed = urlparse(resource)
            if parsed.scheme or resource.startswith('#'):
                continue
            target = (html_path.parent / parsed.path).resolve()
            assert target.exists(), f'{html_path}: missing resource {resource}'


def validate_template(controlled: Path | None) -> None:
    if controlled is None:
        print('Public source mode: controlled CV template check skipped; use --controlled-dir for the share package')
        return
    template = controlled / 'templates' / 'cv-contact-template.docx'
    assert template.exists(), 'Missing controlled cv-contact-template.docx'
    with zipfile.ZipFile(template) as archive:
        xml = archive.read('word/document.xml')
    document = ElementTree.fromstring(xml)
    namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = []
    for paragraph in document.findall('.//w:p', namespace):
        text = ''.join(node.text or '' for node in paragraph.findall('.//w:t', namespace))
        paragraphs.append(unescape(text))
    placeholders = set(re.findall(r'<\s*([A-Za-z][A-Za-z0-9]*)\s*>', '\n'.join(paragraphs)))
    required = {
        'performedDate', 'approvedDate', 'determinedDate', 'sectionName', 'samplingDate',
        'docNo', 'lotNo', 'building', 'samplingTime', 'ProductName', 'lotContact',
        'lotTSA', 'gradeControl', 'samplingPoint01', 'Grade01', 'result01',
        'samplingPoint10', 'Grade10', 'result10'
    }
    missing = required - placeholders
    assert not missing, f'CV template missing placeholders: {sorted(missing)}'


def validate_contract_markers() -> None:
    db_text = (ROOT / 'js' / 'db.js').read_text(encoding='utf-8')
    sync_text = (ROOT / 'js' / 'sync.js').read_text(encoding='utf-8')
    api_text = (ROOT / 'google' / 'app-scripts' / 'RPP2-cv-record.gs').read_text(encoding='utf-8')
    assert "CV_RECORDS: 'cv_records'" in db_text
    assert 'dedupeKey: `cv:${stored.recordId}:upsert`' in db_text
    assert "if (domain === 'cv') return SYNC_CONFIG.CV_SCRIPT_URL" in sync_text
    assert 'upsertCvObject_(' in api_text


if __name__ == '__main__':
    controlled = controlled_root()
    validate_html()
    validate_template(controlled)
    validate_contract_markers()
    mode = 'controlled release' if controlled else 'public source'
    print(f'{mode.capitalize()} CV package structural checks passed')
