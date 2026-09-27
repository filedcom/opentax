#!/usr/bin/env python3
"""Download the public IRS TY2026 research snapshot and record provenance.

Run from the repository root. Draft PDFs can be replaced by the IRS, so every
snapshot records SHA-256 and retrieval time. MeF SOR packages are not public.
"""

import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent
IRS = "https://www.irs.gov"
ATS_PAGE = IRS + "/e-file-providers/tax-year-2026-form-1040-series-and-extensions-modernized-e-file-mef-assurance-testing-system-ats-information"
MEF_PAGE = IRS + "/tax-professionals/tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions"
FORM_SLUGS = [
    "f1040", "f1040s1", "f1040s1a", "f1040s2", "f1040s3", "f1040s3a",
    "f1040sa", "f1040sb", "f1040sc", "f1040sd", "f1040se",
    "f1040sei", "f1040sse", "f1040sh", "f1040sf", "f1040s8",
    "f2441", "f4562", "f4562b", "f6251", "f8839", "f8889", "f8962", "f8995",
    "f8995a", "f8995aa", "f1062",
    # Remaining IRS slugs represented by the TY2025 PDF descriptors.
    "f1116", "f2555", "f4136", "f4136sa", "f4137", "f461", "f4684",
    "f4797", "f4835", "f4952", "f4972", "f5329", "f5695", "f6198", "f6252",
    "f6781", "f7206", "f8396", "f8582", "f8606", "f8615", "f8814",
    "f8815", "f8824", "f8829", "f8834", "f8853", "f8859", "f8880",
    "f8912", "f8919", "f8936", "f8936sa", "f8949", "f8959", "f8960",
    "f8990", "f982", "f172",
]


def fetch(url: str) -> bytes:
    return subprocess.check_output(
        ["curl", "--fail", "--location", "--silent", "--show-error", "--max-time", "45", url],
        timeout=50,
    )


class Links(HTMLParser):
    def __init__(self, base: str):
        super().__init__()
        self.base = base
        self.href = None
        self.label = ""
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.label = ""

    def handle_data(self, data):
        if self.href is not None:
            self.label += data

    def handle_endtag(self, tag):
        if tag == "a" and self.href:
            self.links.append((" ".join(self.label.split()), urljoin(self.base, self.href)))
            self.href = None


def page_links(url: str):
    parser = Links(url)
    parser.feed(fetch(url).decode("utf-8"))
    return parser.links


sources = []
for slug in FORM_SLUGS:
    sources.append(("draft/" + slug + ".pdf", IRS + "/pub/irs-dft/" + slug + "--dft.pdf", "draft-form"))

for slug in (
    "i1040sb", "i1040s8", "i1040sh", "i1040se", "i1040sf",
    "i1040sse", "i1040sr", "i2106", "i2441", "i2555", "i4835",
    "i5329", "i5695", "i7206", "i8606", "i8615", "i8814",
    "i8815", "i8829", "i8853", "i8863", "i8889", "i8936",
    "i8959", "i8995",
):
    sources.append(("draft/" + slug + ".pdf", IRS + "/pub/irs-dft/" + slug + "--dft.pdf", "draft-instructions"))

for label, url in page_links(ATS_PAGE):
    match = re.search(r"scenario\s+(\d+)", label, re.I)
    if not match or not url.lower().endswith(".pdf"):
        continue
    number = int(match.group(1))
    name = "1040nr" if "1040nr" in url.lower() or "1040-nr" in url.lower() else "1040ss" if "1040-ss" in url.lower() else "1040"
    if number == 7:
        name = "4868"
    sources.append((f"ats/{name}-scenario-{number:02d}.pdf", url, "draft-ats"))

for label, url in page_links(MEF_PAGE):
    if label.startswith("Tax year 2026") and url.endswith(".xlsx"):
        name = "accepted-forms.xlsx" if "accepted forms" in label.lower() else "forms-attachments.xlsx"
        sources.append(("mef/" + name, url, "mef-inventory"))

sources += [
    ("authorities/hhs-2025-poverty-guidelines.pdf", "https://public-inspection.federalregister.gov/2025-01377.pdf", "final-authority"),
    ("authorities/iw2w3--2026.pdf", IRS + "/pub/irs-pdf/iw2w3.pdf", "final-authority"),
    ("authorities/fw2g--2026.pdf", IRS + "/pub/irs-prior/fw2g--2026.pdf", "final-authority"),
    ("authorities/iw2g--2026.pdf", IRS + "/pub/irs-prior/iw2g--2026.pdf", "final-authority"),
    ("authorities/f1099div--2024.pdf", IRS + "/pub/irs-prior/f1099div--2024.pdf", "final-authority"),
    ("authorities/i1099div--2024.pdf", IRS + "/pub/irs-prior/i1099div--2024.pdf", "final-authority"),
    ("authorities/f1099ptr--2025.pdf", IRS + "/pub/irs-pdf/f1099ptr.pdf", "final-authority"),
    ("authorities/i1099ptr--2025.pdf", IRS + "/pub/irs-pdf/i1099ptr.pdf", "final-authority"),
    ("authorities/f8995ab--2022.pdf", IRS + "/pub/irs-pdf/f8995ab.pdf", "final-authority"),
    ("authorities/f8995ac--2022.pdf", IRS + "/pub/irs-pdf/f8995ac.pdf", "final-authority"),
    ("authorities/f8995ad--2022.pdf", IRS + "/pub/irs-pdf/f8995ad.pdf", "final-authority"),
    ("authorities/i8995a--2025.pdf", IRS + "/pub/irs-pdf/i8995a.pdf", "prior-year-comparator"),
    ("authorities/i1040gi--2025.pdf", IRS + "/pub/irs-prior/i1040gi--2025.pdf", "prior-year-comparator"),
    ("authorities/f1099b--2026.pdf", IRS + "/pub/irs-prior/f1099b--2026.pdf", "final-authority"),
    ("authorities/i1099b--2026.pdf", IRS + "/pub/irs-prior/i1099b--2026.pdf", "final-authority"),
    ("authorities/f1099da--2026.pdf", IRS + "/pub/irs-prior/f1099da--2026.pdf", "final-authority"),
    ("authorities/i1099da--2026.pdf", IRS + "/pub/irs-prior/i1099da--2026.pdf", "final-authority"),
    ("authorities/f1099r--2026.pdf", IRS + "/pub/irs-prior/f1099r--2026.pdf", "final-authority"),
    ("authorities/i1099r--2026.pdf", IRS + "/pub/irs-prior/i1099r--2026.pdf", "final-authority"),
    ("authorities/i8949--2025.pdf", IRS + "/pub/irs-prior/i8949--2025.pdf", "prior-year-comparator"),
    ("authorities/p505--2026.pdf", IRS + "/pub/irs-prior/p505--2026.pdf", "final-authority"),
    ("authorities/rp-25-32.pdf", IRS + "/pub/irs-drop/rp-25-32.pdf", "final-authority"),
    ("authorities/rp-25-19.pdf", IRS + "/pub/irs-drop/rp-25-19.pdf", "final-authority"),
    ("authorities/rp-25-25.pdf", IRS + "/pub/irs-drop/rp-25-25.pdf", "final-authority"),
    ("authorities/n-25-67.pdf", IRS + "/pub/irs-drop/n-25-67.pdf", "final-authority"),
    ("authorities/n-26-10.pdf", IRS + "/pub/irs-drop/n-26-10.pdf", "final-authority"),
    ("authorities/irb26-29.pdf", IRS + "/pub/irs-irbs/irb26-29.pdf", "final-authority"),
]

records = []
for relative, url, kind in sources:
    try:
        data = fetch(url)
        signature = b"%PDF-" if relative.endswith(".pdf") else b"PK\x03\x04"
        if not data.startswith(signature):
            raise ValueError("unexpected file signature")
        target = ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        # A draft URL can still point to a 2025 document. Keep it for review,
        # but flag the tax-year uncertainty in the manifest.
        year_check = None
        if kind in {"draft-form", "draft-instructions"}:
            text = subprocess.run(["pdftotext", "-f", "1", "-l", "2", str(target), "-"],
                                  capture_output=True, text=True).stdout
            year_check = "2026-present" if "2026" in text else "2026-not-found"
            if year_check != "2026-present":
                target.unlink()
        status = "downloaded" if year_check != "2026-not-found" else "wrong-year"
        records.append({"path": relative, "url": url, "kind": kind, "status": status,
                        "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                        **({"year_check": year_check} if year_check else {})})
        print("OK" if status == "downloaded" else "WRONG YEAR", relative, len(data), year_check or "")
    except Exception as exc:
        records.append({"path": relative, "url": url, "kind": kind, "status": "unavailable", "error": str(exc)})
        print("MISSING", relative, str(exc))

manifest = {"snapshot_utc": datetime.now(timezone.utc).isoformat(),
            "source_pages": [ATS_PAGE, MEF_PAGE], "files": records}
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
