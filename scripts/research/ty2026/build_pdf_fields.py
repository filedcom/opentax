"""Record fields and widgets in pinned TY2026 draft PDFs."""

import csv
from pathlib import Path

from pypdf import PdfReader


CORPUS = Path(__file__).resolve().parents[3] / "docs/ty2026/corpus"
OUT = CORPUS.parent / "inventories/pdf-fields"
SLUGS = (
    "f1040", "f1040s1", "f1040s2", "f1040s3a", "f1040sb", "f1040sse",
    "f6251", "f8995", "f8995a", "f8995aa",
)


def full_name(annotation):
    parts = []
    field = annotation
    while field is not None:
        field = field.get_object()
        if field.get("/T") is not None:
            parts.append(str(field["/T"]))
        field = field.get("/Parent")
    return ".".join(reversed(parts))


def inventory(slug, source=None):
    source = source or CORPUS / f"draft/{slug}.pdf"
    target = OUT / f"pdf-fields-{slug}.csv"
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

inventory("f1040sei", CORPUS / "draft/f1040sei.pdf")
inventory("f8862", CORPUS / "authorities/f8862--2025.pdf")
inventory("f8863", CORPUS / "draft/f8863.pdf")
inventory("f3800", CORPUS / "draft/f3800.pdf")
inventory("f4562b", CORPUS / "draft/f4562b.pdf")
inventory("f4562", CORPUS / "draft/f4562.pdf")
inventory("f461", CORPUS / "draft/f461.pdf")
inventory("f8582", CORPUS / "draft/f8582.pdf")
inventory("f6198", CORPUS / "authorities/f6198--2025.pdf")
inventory("f4684", CORPUS / "draft/f4684.pdf")
inventory("f4797", CORPUS / "draft/f4797.pdf")
inventory("f6252", CORPUS / "draft/f6252.pdf")
inventory("f8824", CORPUS / "draft/f8824.pdf")
inventory("f8990", CORPUS / "draft/f8990.pdf")
inventory("f4952", CORPUS / "draft/f4952.pdf")
inventory("f4972", CORPUS / "draft/f4972.pdf")
inventory("f6781", CORPUS / "draft/f6781.pdf")
inventory("f8615", CORPUS / "draft/f8615.pdf")
inventory("f8814", CORPUS / "draft/f8814.pdf")
inventory("f8815", CORPUS / "draft/f8815.pdf")
inventory("f8915f", CORPUS / "draft/f8915f.pdf")
inventory("f8912", CORPUS / "authorities/f8912--2024.pdf")
inventory("f4136", CORPUS / "draft/f4136.pdf")
inventory("f4136sa", CORPUS / "authorities/f4136sa--2025.pdf")
inventory("f8960", CORPUS / "draft/f8960.pdf")
inventory("f4137", CORPUS / "draft/f4137.pdf")
inventory("f8919", CORPUS / "draft/f8919.pdf")
inventory("f8839", CORPUS / "draft/f8839.pdf")
inventory("f8396", CORPUS / "draft/f8396.pdf")
inventory("f8859", CORPUS / "draft/f8859.pdf")
inventory("f8880", CORPUS / "draft/f8880.pdf")
inventory("f7217", CORPUS / "authorities/f7217--2024.pdf")
inventory("f8826", CORPUS / "authorities/f8826--2017.pdf")
inventory("f8835", CORPUS / "authorities/f8835--2025.pdf")
inventory("f8911", CORPUS / "authorities/f8911--2025.pdf")
inventory("f8911sa", CORPUS / "authorities/f8911sa--2025.pdf")
inventory("f8978", CORPUS / "authorities/f8978--2023.pdf")
inventory("f8978sa", CORPUS / "authorities/f8978sa--2023.pdf")
inventory("f8994", CORPUS / "authorities/f8994--2021.pdf")
inventory("f5884", CORPUS / "authorities/f5884--2021.pdf")
inventory("f6765", CORPUS / "authorities/f6765--2024.pdf")
inventory("f3468", CORPUS / "authorities/f3468--2025.pdf")
inventory("f4255", CORPUS / "authorities/f4255--2025.pdf")
inventory("f965a", CORPUS / "authorities/f965a--2021.pdf")
inventory("f1040sr", CORPUS / "draft/f1040sr.pdf")
inventory("f1040sj", CORPUS / "draft/f1040sj.pdf")
inventory("f982", CORPUS / "authorities/f982--2018.pdf")
inventory("f172", CORPUS / "authorities/f172--2024.pdf")
inventory("f8834", CORPUS / "authorities/f8834--2024.pdf")
inventory("f8997", CORPUS / "draft/f8997.pdf")
inventory("f8621", CORPUS / "authorities/f8621--2025.pdf")
inventory("f8962", CORPUS / "draft/f8962.pdf")
inventory("f1116", CORPUS / "draft/f1116.pdf")
inventory("f1116sb", CORPUS / "authorities/f1116sb--2022.pdf")
inventory("f1116sc", CORPUS / "authorities/f1116sc--2025.pdf")
inventory("f2555", CORPUS / "draft/f2555.pdf")
inventory("f8936", CORPUS / "draft/f8936.pdf")
inventory("f8936sa", CORPUS / "draft/f8936sa.pdf")
inventory("f8889", CORPUS / "draft/f8889.pdf")
inventory("f8959", CORPUS / "draft/f8959.pdf")
inventory("f7206", CORPUS / "draft/f7206.pdf")
inventory("f8853", CORPUS / "draft/f8853.pdf")
inventory("f8829", CORPUS / "draft/f8829.pdf")
inventory("f3903", CORPUS / "draft/f3903.pdf")
inventory("f8938", CORPUS / "draft/f8938.pdf")
inventory("f4852", CORPUS / "authorities/f4852--2020.pdf")
for slug, revision in (
    ("f3800a", "2025"), ("f7205", "2023"),
    ("f7207", "2025"), ("f7220", "2025"),
):
    inventory(slug, CORPUS / f"authorities/{slug}--{revision}.pdf")
