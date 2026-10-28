"""Extract the 词汇大纲 table (序号 | 等级 | 词语 | 拼音 | 词性) from the CLEC 2025 HSK syllabus PDF.

Usage: python -X utf8 scripts/extract-hsk3-vocabulary.py <pdf> <out.json>
Requires PyMuPDF (pip install pymupdf). Cells are assigned by column header x-position and
row anchor (序号) y-position, because plain text extraction misplaces the raised pinyin baseline.
"""
import json
import re
import sys

import fitz

HEADERS = ['序号', '等级', '词语', '拼音', '词性']
FIELDS = ['seq', 'level', 'word', 'pinyin', 'pos']


def table_spans(page):
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            # The 汉考国际 watermark is large and rotated; table text is horizontal 11.9pt.
            if tuple(round(x, 2) for x in line['dir']) != (1.0, 0.0):
                continue
            for span in line['spans']:
                if span['size'] < 20 and span['text'].strip():
                    yield span


def page_rows(page, page_number):
    spans = list(table_spans(page))
    header = {s['text'].strip(): s['bbox'][0] for s in spans if s['text'].strip() in HEADERS}
    if len(header) != len(HEADERS):
        return []
    starts = [header[name] for name in HEADERS]
    header_bottom = max(s['bbox'][3] for s in spans if s['text'].strip() in HEADERS)

    # 序号 and 等级 values are centred and can start left of their header, so split at midpoints.
    bounds = [(a + b) / 2 for a, b in zip(starts, starts[1:])]

    def column(x):
        return sum(1 for bound in bounds if x >= bound)

    def middle(span):
        return (span['bbox'][1] + span['bbox'][3]) / 2

    body = [s for s in spans if s['bbox'][1] > header_bottom]
    anchors = sorted((s for s in body if column(s['bbox'][0]) == 0 and re.fullmatch(r'\d{1,5}', s['text'].strip())), key=middle)
    rows = [{'seq': int(a['text']), 'page': page_number, 'cells': [[] for _ in HEADERS], 'y': middle(a)} for a in anchors]
    orphans = []
    for span in body:
        if span in anchors:
            continue
        candidates = [r for r in rows if abs(r['y'] - middle(span)) < 9]
        if len(candidates) != 1:
            orphans.append({'page': page_number, 'text': span['text'], 'x': round(span['bbox'][0]), 'y': round(middle(span))})
            continue
        candidates[0]['cells'][column(span['bbox'][0])].append(span)
    result = []
    for row in rows:
        values = {}
        for name, cell in zip(FIELDS[1:], row['cells'][1:]):
            text = ''
            last_x = None
            for span in sorted(cell, key=lambda s: s['bbox'][0]):
                if last_x is not None and span['bbox'][0] - last_x > 1.5 and not text.endswith(' '):
                    text += ' '
                text += span['text']
                last_x = span['bbox'][2]
            values[name] = re.sub(r'\s+', ' ', text).strip()
        result.append({'seq': row['seq'], 'page': row['page'], **values})
    return result, orphans


def main(pdf_path, out_path):
    doc = fitz.open(pdf_path)
    rows, orphans = [], []
    for index, page in enumerate(doc):
        if '词性' not in page.get_text():
            continue
        extracted = page_rows(page, index + 1)
        if extracted:
            rows.extend(extracted[0])
            orphans.extend(extracted[1])
    with open(out_path, 'w', encoding='utf-8') as handle:
        json.dump({'rows': rows, 'orphans': orphans}, handle, ensure_ascii=False)
    print(json.dumps({'rows': len(rows), 'orphans': len(orphans)}))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
