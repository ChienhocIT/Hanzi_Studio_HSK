"""Extract the 词汇大纲 table (序号 | 等级 | 词语 | 拼音 | 词性) from the CLEC 2025 HSK syllabus PDF.

Usage: python -X utf8 scripts/extract-hsk3-vocabulary.py <pdf> <out.json>
Requires PyMuPDF (pip install pymupdf). Characters are assigned to cells by column header
x-position and row anchor (序号) y-position: plain text extraction misplaces the raised pinyin
baseline and sometimes merges the 等级 and 词语 cells into one span.
"""
import json
import re
import sys

import fitz

HEADERS = ['序号', '等级', '词语', '拼音', '词性']
FIELDS = ['seq', 'level', 'word', 'pinyin', 'pos']


def table_spans(page):
    for block in page.get_text('rawdict')['blocks']:
        for line in block.get('lines', []):
            # The 汉考国际 watermark is large and rotated; table text is horizontal.
            if tuple(round(x, 2) for x in line['dir']) != (1.0, 0.0):
                continue
            for span in line['spans']:
                if span['size'] < 20:
                    yield span


def text(span):
    return ''.join(c['c'] for c in span['chars'])


def middle(bbox):
    return (bbox[1] + bbox[3]) / 2


def page_rows(page, page_number):
    spans = list(table_spans(page))
    # Header cells are 13.3pt; body cells are 11.9pt (词语 is also a vocabulary entry).
    header = {text(s).strip(): s['bbox'] for s in spans if s['size'] > 13 and text(s).strip() in HEADERS}
    if len(header) != len(HEADERS):
        return [], []
    starts = [header[name][0] for name in HEADERS]
    header_bottom = max(bbox[3] for bbox in header.values())
    # 序号 and 等级 are centred, so split them at the midpoint. 词语, 拼音 and 词性 are
    # left-aligned: long pinyin runs far right, so those cells start just before their header.
    bounds = [(starts[0] + starts[1]) / 2, starts[2] - 6, starts[3] - 6, starts[4] - 6]

    def column(x):
        return sum(1 for bound in bounds if x >= bound)

    chars = [c for s in spans if s['size'] < 13 for c in s['chars'] if c['bbox'][1] > header_bottom]
    anchors = []
    for span in spans:
        value = text(span).strip()
        if span['size'] < 13 and span['bbox'][1] > header_bottom and column(span['bbox'][0]) == 0 and re.fullmatch(r'\d{1,5}', value):
            anchors.append({'seq': int(value), 'y': middle(span['bbox'])})
    rows = [{**a, 'cells': [[] for _ in HEADERS]} for a in anchors]
    orphans = []
    for char in chars:
        col = column(char['bbox'][0])
        if col == 0:
            continue
        candidates = [r for r in rows if abs(r['y'] - middle(char['bbox'])) < 8]
        if len(candidates) != 1:
            if char['c'].strip():
                orphans.append({'page': page_number, 'char': char['c'], 'x': round(char['bbox'][0]), 'y': round(middle(char['bbox']))})
            continue
        candidates[0]['cells'][col].append(char)
    result = []
    for row in rows:
        values = {}
        for name, cell in zip(FIELDS[1:], row['cells'][1:]):
            ordered = ''.join(c['c'] for c in sorted(cell, key=lambda c: c['bbox'][0]))
            values[name] = re.sub(r'\s+', ' ', ordered).strip()
        result.append({'seq': row['seq'], 'page': page_number, **values})
    return result, orphans


def main(pdf_path, out_path):
    doc = fitz.open(pdf_path)
    rows, orphans = [], []
    for index, page in enumerate(doc):
        page_result, page_orphans = page_rows(page, index + 1)
        rows.extend(page_result)
        orphans.extend(page_orphans)
    with open(out_path, 'w', encoding='utf-8') as handle:
        json.dump({'rows': rows, 'orphans': orphans}, handle, ensure_ascii=False)
    print(json.dumps({'rows': len(rows), 'orphans': len(orphans)}))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
