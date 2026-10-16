"""Extract published cells, never calculate expected tax. Requires PyMuPDF.
Usage: python3 docs/ty2026/tooling/extract_tax_table_2026.py /path/to/p1040.pdf
Writes the reviewed 2026 draft table CSV used by the calculation tests.
"""
import csv
import hashlib
from pathlib import Path
import re
import sys
import fitz

pdf = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(pdf).hexdigest() == "407bc35ab09aaf034689341d7469b9b082cd2ceaa652e38ca5874c1dd1c3f12e"
doc = fitz.open(stream=pdf, filetype="pdf")
rows = []
for page_index in range(2, 14):
    page = doc[page_index]
    assert "2026" in page.get_text() and "Tax Table" in page.get_text()
    for block in page.get_text("blocks"):
        # Actual table columns; exclude the miniature example on the first page.
        if page_index == 2 and block[1] < 230:
            continue
        words = block[4].split()
        if not words or not all(re.fullmatch(r"[\d,]+", word) for word in words):
            continue
        numbers = [int(word.replace(",", "")) for word in words]
        if len(numbers) == 1:  # repeated thousand-dollar heading or page number
            continue
        while numbers:
            if len(numbers) == 1:
                assert numbers[0] % 1000 == 0, numbers
                break
            if numbers[0] == numbers[1]:
                assert numbers[0] % 1000 == 0, numbers
                numbers = numbers[1:]
            assert len(numbers) >= 6, (page_index, block)
            row, numbers = numbers[:6], numbers[6:]
            assert row[0] < row[1] <= 100000, row
            rows.append([*row, page_index + 1])
rows.sort()
assert len(rows) == 2062, len(rows)
assert rows[0][:2] == [0, 5] and rows[-1][:2] == [99950, 100000]
for previous, following in zip(rows, rows[1:]):
    assert previous[1] == following[0], (previous, following)
output = Path(__file__).resolve().parents[1] / "evidence/tax-table-2026.csv"
with output.open("w", newline="") as f:
    writer = csv.writer(f, lineterminator="\n")
    writer.writerow(["at_least", "less_than", "single", "mfj", "mfs", "hoh", "pdf_page"])
    writer.writerows(rows)
print(f"Extracted {len(rows)} published rows / {len(rows) * 4} tax cells to {output}")
