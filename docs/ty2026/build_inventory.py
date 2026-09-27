#!/usr/bin/env python3
"""Regenerate the TY2025 surface inventory used by the TY2026 plan."""

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PDF = ROOT / "forms/f1040/2025/pdf/forms"
MEF = ROOT / "forms/f1040/2025/mef/forms"
NODES = ROOT / "forms/f1040/nodes"

manifest = json.loads((OUT / "corpus/manifest.json").read_text())
drafts = {Path(f["path"]).stem for f in manifest["files"]
          if f["kind"] == "draft-form" and f["status"] == "downloaded"}
pdf_rows = []
for path in sorted(PDF.glob("*.ts")):
    if path.name.endswith(".test.ts") or path.name == "index.ts":
        continue
    content = path.read_text()
    match = re.search(r'pdfUrl:\s*"([^"]+)"', content)
    if not match:
        continue
    slug = re.search(r"/([a-z0-9]+)(?:--\d{4})?\.pdf", match.group(1))
    pdf_rows.append({"component": path.stem, "pdf_descriptor": str(path.relative_to(ROOT)),
                     "ty2025_pdf_url": match.group(1), "irs_slug": slug.group(1) if slug else "",
                     "ty2026_draft_snapshot": "yes" if slug and slug.group(1) in drafts else "no"})

with (OUT / "pdf-coverage.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(pdf_rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(pdf_rows)

mef_index = (MEF / "index.ts").read_text()
mef_names = sorted(set(re.findall(r'from "\./([^"/]+)\.ts"', mef_index)))
with (OUT / "mef-coverage.csv").open("w", newline="") as handle:
    writer = csv.writer(handle, lineterminator="\n")
    writer.writerow(["component", "ty2025_serializer"])
    writer.writerows((name, str((MEF / (name + ".ts")).relative_to(ROOT))) for name in mef_names)

year_literals = []
for path in sorted(NODES.rglob("*.ts")):
    if path.name.endswith(".test.ts") or "/config/" in str(path):
        continue
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if "2025" in line:
            year_literals.append((str(path.relative_to(ROOT)), number, line.strip()[:180]))
with (OUT / "year-literals.csv").open("w", newline="") as handle:
    writer = csv.writer(handle, lineterminator="\n")
    writer.writerow(["file", "line", "source_excerpt"])
    writer.writerows(year_literals)

print(f"PDF descriptors: {len(pdf_rows)}, MeF modules: {len(mef_names)}, node 2025 mentions: {len(year_literals)}")
