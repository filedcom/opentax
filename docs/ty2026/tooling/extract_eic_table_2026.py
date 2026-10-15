"""Extract published 2026 EIC cells and footnotes, never a continuous formula.
Usage: python3 docs/ty2026/tooling/extract_eic_table_2026.py /path/to/p1040.pdf
Requires PyMuPDF. Writes the evidence CSV and runtime table from pinned bytes.
"""
import csv
import hashlib
from pathlib import Path
import re
import sys
import subprocess
import fitz

pdf = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(pdf).hexdigest() == "407bc35ab09aaf034689341d7469b9b082cd2ceaa652e38ca5874c1dd1c3f12e"
doc = fitz.open(stream=pdf, filetype="pdf")
rows = []
for page_index in range(16, 28):
    page = doc[page_index]
    assert "2026" in page.get_text() and "Earned Income Credit" in page.get_text()
    for block in page.get_text("blocks"):
        # Ignore the miniature example above the real first-page table.
        if page_index == 16 and block[1] < 238:
            continue
        words = block[4].split()
        if len(words) < 10 or not all(re.fullmatch(r"[\d,]+|\*{1,2}", w) for w in words):
            continue
        assert len(words) % 10 == 0, (page_index, words)
        for index in range(0, len(words), 10):
            row = words[index:index + 10]
            low, high = [int(w.replace(",", "")) for w in row[:2]]
            assert low < high <= 70250 and high - low in (49, 50), row
            rows.append([low, high, *row[2:], page_index + 1])
rows.sort()
assert len(rows) == 1405, len(rows)
assert rows[0][:2] == [1, 50] and rows[-1][:2] == [70200, 70250]
for previous, following in zip(rows, rows[1:]):
    assert previous[1] == following[0], (previous, following)
# (column, exact cutoff, credit below cutoff, printed PDF page). These values
# are the eight printed footnotes, independently checked against page text.
terminal = [
    (0, 19540, 2, 20), (4, 26820, 1, 21),
    (1, 51593, 3, 25), (2, 58629, 3, 26),
    (5, 58863, 1, 26), (3, 62974, 2, 27),
    (6, 65899, 5, 27), (7, 70244, 5, 28),
]
for column, cutoff, credit, page in terminal:
    row = rows[cutoff // 50]
    assert row[column + 2] in ("*", "**") and row[-1] == page
    text = doc[page - 1].get_text()
    assert f"${cutoff:,}" in text and f"your credit is ${credit}." in text
assert sum(cell in ("*", "**") for row in rows for cell in row[2:10]) == len(terminal)
root = Path(__file__).resolve().parents[1]
with (root / "evidence/eic-table-2026.csv").open("w", newline="") as f:
    writer = csv.writer(f, lineterminator="\n")
    writer.writerow(["at_least", "less_than", *[f"{status}_{children}" for status in ("other", "joint") for children in range(4)], "pdf_page"])
    writer.writerows([[*row[:2], *[cell.replace(",", "") for cell in row[2:10]], row[-1]] for row in rows])
# Runtime keeps footnote cells as zero; lookup applies the exact printed split.
values = [[0 if cell.startswith("*") else int(cell.replace(",", "")) for cell in row[2:10]] for row in rows]
output = root.parents[1] / "forms/f1040/nodes/intermediate/forms/credits/earned-income/eitc/table_2026.ts"
header = '''// Generated from the IRS 2026 draft Publication 1040, printed pages 16-27.
// https://www.irs.gov/pub/irs-dft/p1040--dft.pdf
// SHA-256: 407bc35ab09aaf034689341d7469b9b082cd2ceaa652e38ca5874c1dd1c3f12e
// Reproduce with docs/ty2026/tooling/extract_eic_table_2026.py.
// Columns: 0-3 children for other eligible statuses, then MFJ.
const CREDIT_BY_INCOME_BAND: ReadonlyArray<readonly number[]> = [
'''
text = header + "".join("  [" + ", ".join(map(str, row)) + "],\n" for row in values) + "];\n\n"
text += "const TERMINAL_BANDS: Record<number, readonly [number, number, number]> = {\n"
text += "".join(f"  {cutoff // 50}: [{col}, {cutoff}, {credit}],\n" for col, cutoff, credit, _ in terminal) + "};\n"
text += '''
/** Published table, including exact-dollar footnotes, for a whole-dollar amount. */
export function lookupEic2026(amount: number, children: number, joint: boolean): number {
  if (!Number.isSafeInteger(amount) || !Number.isInteger(children) || children < 0) {
    throw new Error("EIC lookup needs whole-dollar income and a nonnegative child count");
  }
  if (amount < 1 || amount >= 70_250) return 0;
  const column = Math.min(children, 3) + (joint ? 4 : 0);
  const band = Math.floor(amount / 50);
  const split = TERMINAL_BANDS[band];
  if (split && split[0] === column) return amount < split[1] ? split[2] : 0;
  return CREDIT_BY_INCOME_BAND[band][column];
}
'''
output.write_text(text)
subprocess.run(["deno", "fmt", str(output)], check=True)
print(f"Extracted {len(rows)} rows, {len(rows) * 8} cells and {len(terminal)} footnotes")
