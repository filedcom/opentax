"""Record fields and widgets in pinned TY2026 draft PDFs."""

import csv
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent
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
    source = source or ROOT / f"corpus/draft/{slug}.pdf"
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

inventory("f1040sei", ROOT / "corpus/draft/f1040sei.pdf")
inventory("f8862", ROOT / "corpus/authorities/f8862--2025.pdf")
inventory("f8863", ROOT / "corpus/draft/f8863.pdf")
inventory("f3800", ROOT / "corpus/draft/f3800.pdf")
inventory("f4562b", ROOT / "corpus/draft/f4562b.pdf")
inventory("f4562", ROOT / "corpus/draft/f4562.pdf")
inventory("f461", ROOT / "corpus/draft/f461.pdf")
inventory("f8582", ROOT / "corpus/draft/f8582.pdf")
inventory("f6198", ROOT / "corpus/authorities/f6198--2025.pdf")
inventory("f4684", ROOT / "corpus/draft/f4684.pdf")
inventory("f4797", ROOT / "corpus/draft/f4797.pdf")
inventory("f6252", ROOT / "corpus/draft/f6252.pdf")
inventory("f8824", ROOT / "corpus/draft/f8824.pdf")
inventory("f8990", ROOT / "corpus/draft/f8990.pdf")
inventory("f4952", ROOT / "corpus/draft/f4952.pdf")
inventory("f4972", ROOT / "corpus/draft/f4972.pdf")
inventory("f6781", ROOT / "corpus/draft/f6781.pdf")
inventory("f8615", ROOT / "corpus/draft/f8615.pdf")
inventory("f8814", ROOT / "corpus/draft/f8814.pdf")
inventory("f8815", ROOT / "corpus/draft/f8815.pdf")
inventory("f8915f", ROOT / "corpus/draft/f8915f.pdf")
inventory("f8912", ROOT / "corpus/authorities/f8912--2024.pdf")
inventory("f4136", ROOT / "corpus/draft/f4136.pdf")
inventory("f4136sa", ROOT / "corpus/authorities/f4136sa--2025.pdf")
inventory("f8960", ROOT / "corpus/draft/f8960.pdf")
inventory("f4137", ROOT / "corpus/draft/f4137.pdf")
inventory("f8919", ROOT / "corpus/draft/f8919.pdf")
inventory("f8839", ROOT / "corpus/draft/f8839.pdf")
inventory("f8396", ROOT / "corpus/draft/f8396.pdf")
inventory("f8859", ROOT / "corpus/draft/f8859.pdf")
inventory("f8880", ROOT / "corpus/draft/f8880.pdf")
inventory("f7217", ROOT / "corpus/authorities/f7217--2024.pdf")
inventory("f8826", ROOT / "corpus/authorities/f8826--2017.pdf")
inventory("f8835", ROOT / "corpus/authorities/f8835--2025.pdf")
inventory("f8911", ROOT / "corpus/authorities/f8911--2025.pdf")
inventory("f8911sa", ROOT / "corpus/authorities/f8911sa--2025.pdf")
inventory("f8978", ROOT / "corpus/authorities/f8978--2023.pdf")
inventory("f8978sa", ROOT / "corpus/authorities/f8978sa--2023.pdf")
inventory("f8994", ROOT / "corpus/authorities/f8994--2021.pdf")
inventory("f5884", ROOT / "corpus/authorities/f5884--2021.pdf")
inventory("f6765", ROOT / "corpus/authorities/f6765--2024.pdf")
inventory("f3468", ROOT / "corpus/authorities/f3468--2025.pdf")
inventory("f4255", ROOT / "corpus/authorities/f4255--2025.pdf")
inventory("f965a", ROOT / "corpus/authorities/f965a--2021.pdf")
inventory("f1040sr", ROOT / "corpus/draft/f1040sr.pdf")
inventory("f1040sj", ROOT / "corpus/draft/f1040sj.pdf")
inventory("f982", ROOT / "corpus/authorities/f982--2018.pdf")
inventory("f172", ROOT / "corpus/authorities/f172--2024.pdf")
inventory("f8834", ROOT / "corpus/authorities/f8834--2024.pdf")
inventory("f8997", ROOT / "corpus/draft/f8997.pdf")
inventory("f8621", ROOT / "corpus/authorities/f8621--2025.pdf")
inventory("f8962", ROOT / "corpus/draft/f8962.pdf")
inventory("f1116", ROOT / "corpus/draft/f1116.pdf")
inventory("f1116sb", ROOT / "corpus/authorities/f1116sb--2022.pdf")
inventory("f1116sc", ROOT / "corpus/authorities/f1116sc--2025.pdf")
inventory("f2555", ROOT / "corpus/draft/f2555.pdf")
inventory("f8936", ROOT / "corpus/draft/f8936.pdf")
inventory("f8936sa", ROOT / "corpus/draft/f8936sa.pdf")
inventory("f8889", ROOT / "corpus/draft/f8889.pdf")
inventory("f8959", ROOT / "corpus/draft/f8959.pdf")
inventory("f7206", ROOT / "corpus/draft/f7206.pdf")
inventory("f8853", ROOT / "corpus/draft/f8853.pdf")
inventory("f8829", ROOT / "corpus/draft/f8829.pdf")
inventory("f3903", ROOT / "corpus/draft/f3903.pdf")
inventory("f8938", ROOT / "corpus/draft/f8938.pdf")
inventory("f4852", ROOT / "corpus/authorities/f4852--2020.pdf")
for slug, revision in (
    ("f3800a", "2025"), ("f7205", "2023"),
    ("f7207", "2025"), ("f7220", "2025"),
):
    inventory(slug, ROOT / f"corpus/authorities/{slug}--{revision}.pdf")
