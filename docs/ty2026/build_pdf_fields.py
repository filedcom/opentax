"""Record fields and widgets in pinned TY2026 draft PDFs."""

import csv
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent
SLUGS = ("f1040", "f1040s3a", "f1040sb")


def full_name(annotation):
    parts = []
    field = annotation
    while field is not None:
        field = field.get_object()
        if field.get("/T") is not None:
            parts.append(str(field["/T"]))
        field = field.get("/Parent")
    return ".".join(reversed(parts))


def inventory(slug):
    source = ROOT / f"corpus/draft/{slug}.pdf"
    target = ROOT / f"pdf-fields-{slug}.csv"
    reader = PdfReader(source)
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
            widgets[name] = (page_number, annotation)

    rows = []
    for name in dict.fromkeys([*fields.keys(), *widgets.keys()]):
        field = fields.get(name)
        widget = widgets.get(name)
        annotation = widget[1] if widget else None
        field_type = (field or {}).get("/FT") or (annotation or {}).get("/FT")
        if field_type is None:
            continue
        rectangle = annotation.get("/Rect") if annotation else None
        rows.append({
            "field": name,
            "type": str(field_type),
            "tooltip": str((field or {}).get("/TU") or (annotation or {}).get("/TU", "")),
            "pdf_page": widget[0] if widget else "",
            "rect": " ".join(str(value) for value in rectangle) if rectangle else "",
            "in_field_tree": "yes" if field is not None else "no",
        })

    with target.open("w", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys(), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    attached = sum(row["in_field_tree"] == "yes" for row in rows)
    print(f"{slug}: {len(rows)} widgets/fields, {attached} in field tree: {target}")


for slug in SLUGS:
    inventory(slug)
