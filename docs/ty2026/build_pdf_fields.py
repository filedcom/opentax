"""Record the AcroForm fields in the pinned TY2026 draft Form 1040."""

import csv
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "corpus/draft/f1040.pdf"
TARGET = ROOT / "pdf-fields-f1040.csv"


def full_name(annotation):
    parts = []
    field = annotation
    while field is not None:
        field = field.get_object()
        if field.get("/T") is not None:
            parts.append(str(field["/T"]))
        field = field.get("/Parent")
    return ".".join(reversed(parts))


reader = PdfReader(SOURCE)
fields = reader.get_fields() or {}
widgets = {}
for page_number, page in enumerate(reader.pages, start=1):
    annotations = page.get("/Annots")
    if annotations is None:
        continue
    for ref in annotations.get_object():
        annotation = ref.get_object()
        if annotation.get("/Subtype") != "/Widget":
            continue
        name = full_name(annotation)
        rectangle = annotation.get("/Rect")
        widgets[name] = (page_number, rectangle)

rows = []
for name, field in fields.items():
    if field.get("/FT") is None:
        continue
    page_number, rectangle = widgets.get(name, (None, None))
    rows.append({
        "field": name,
        "type": str(field.get("/FT")),
        "tooltip": str(field.get("/TU", "")),
        "pdf_page": page_number or "",
        "rect": " ".join(str(value) for value in rectangle) if rectangle else "",
    })

with TARGET.open("w", newline="") as output:
    writer = csv.DictWriter(output, fieldnames=rows[0].keys(), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)

print(f"{len(rows)} fields, {sum(bool(row['pdf_page']) for row in rows)} widgets: {TARGET}")
