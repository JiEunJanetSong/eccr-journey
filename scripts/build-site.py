"""Build the self-contained ECCR manual and walkthrough with the Python standard library."""
from pathlib import Path
import json
import re
import html
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def read_json(name):
    return json.loads((ROOT / 'src/content' / name).read_text())


def build():
    archive = (ROOT / 'archive.html').read_text()
    history = json.loads(re.search(r'<script id="journeyData" type="application/json">(.*?)</script>', archive, re.S)[1])
    data = {
        'tech': read_json('technical.json'),
        'tutorial': read_json('tutorial.json'),
        'documents': read_json('documents.json'),
        'history': {'messages': history['messages'], 'counts': history['counts']},
    }
    output = (ROOT / 'src/index.template.html').read_text()
    for placeholder, value in {
        '__STYLE__': (ROOT / 'src/style.css').read_text(),
        '__RUNTIME__': (ROOT / 'src/app.js').read_text(),
        '__DATA__': json.dumps(data, ensure_ascii=False).replace('<', '\\u003c'),
    }.items():
        output = output.replace(placeholder, value)
    (ROOT / 'index.html').write_text(output)
    build_print_manual(data['tech'])
    build_starter_zip()
    print(f'Built index.html: {len(output.encode()):,} bytes; 10 manual sections / 8 tutorial steps.')


def build_starter_zip():
    """Package exactly the maintained starter files, excluding local machine debris."""
    with zipfile.ZipFile(ROOT / 'downloads/eccr-starter-kit.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted((ROOT / 'starter').rglob('*')):
            relative = path.relative_to(ROOT / 'starter')
            if path.is_file() and not any(part.startswith('.') or part == '__pycache__' for part in relative.parts):
                info = zipfile.ZipInfo('eccr-starter-kit/' + relative.as_posix(), (2026, 10, 21, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                bundle.writestr(info, path.read_bytes())


def build_print_manual(tech):
    """Export both languages for printing, with source links back to the workspace."""
    for lang in ('en', 'ko'):
        def text(value):
            return html.escape(value if isinstance(value, str) else value.get(lang, value.get('en', '')))
        sections = []
        for index, section in enumerate(tech['sections'], 1):
            blocks = [f'<section><h2>{index:02} · {text(section["title"])}</h2><p>{text(section["intro"])}</p>']
            for field, title in [('points', ('Components', '구성요소')), ('recipe', ('Procedure', '제작 절차')), ('checks', ('Verification', '검증'))]:
                blocks.append(f'<h3>{title[lang == "ko"]}</h3><ul>' + ''.join('<li>' + text(v) + '</li>' for v in section[field]) + '</ul>')
            if section.get('caveat'):
                blocks.append('<aside>' + text(section['caveat']) + '</aside>')
            if section.get('code'):
                blocks.append('<pre>' + html.escape(section['code']['text']) + '</pre>')
            blocks.append(f'<p><a href="../#technical/{section["id"]}">' + ('Open original evidence' if lang == 'en' else '원문 근거 열기') + '</a></p></section>')
            sections.append(''.join(blocks))
        title = 'ECCR · Technical manual' if lang == 'en' else 'ECCR · 기술문서'
        body = '<!doctype html><html lang="' + lang + '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>body{max-width:850px;margin:40px auto;padding:0 24px;font:15px/1.8 system-ui;color:#193832}h1,h2{line-height:1.3}h2{margin-top:45px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 monospace;background:#eef1e8;padding:20px}aside{padding:15px;border-left:3px solid #b27d45;background:#fff5df}a{color:inherit}section{border-top:1px solid #ddd;margin-top:25px}li{margin-bottom:8px}@media print{body{margin:0;font-size:11pt}h2,h3{break-after:avoid}pre{font-size:9pt}section{break-before:page}}</style><body><h1>' + title + '</h1><p>Source audit: 2026-10-21 · production revision 3b87245</p><p>' + text(tech['verifiedSnapshot']['note']) + '</p>' + ''.join(sections) + '</body></html>'
        (ROOT / f'downloads/technical-manual-{lang}.html').write_text(body)


if __name__ == '__main__':
    build()
