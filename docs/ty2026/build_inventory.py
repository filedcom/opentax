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
REGISTRY = ROOT / "forms/f1040/2025/registry.ts"

# A node stays unverified until its 2026 behavior, outputs, and form route are
# checked. These notes identify work already started without marking it done.
NODE_PROGRESS = {
    "general": "2026 ages, relative limit, and no-dependent identity graph updated; audit credits",
    "w2": "2026 SIMPLE, TP/TT, and Schedule 2 box12 updated; ATS 2 statutory box13 must route to Schedule C once, not 1040 wages; see ATS-SCENARIO-02.md",
    "auto_expense": "2026 business mileage periods updated; audit remaining rules",
    "f2106": "2026 business mileage and AGI limit updated; audit remaining rules",
    "f8621": "2026 event-year allocation updated; audit remaining rules",
    "form8962": "2026 percentage and repayment paths updated; verify final instructions",
    "form_1116": "2026 line 18 adds Schedule 1-A line 43 and line 20 needs Schedule 2 line 1z; shared node omits full category/carryover and new PDF/MeF route; see FORM1116-GRAPH.md",
    "form2555": "2026 form/instructions and Notice 2026-25 pinned; structured filing rejects 2026 and housing route uses legacy Schedule 1 key; see FORM2555-GRAPH.md",
    "f8936": "2026 form/combined instructions pinned; shared node rejects eligible 2026 service and lacks commercial/dealer/business routes; see FORM8936-GRAPH.md",
    "form2441": "2026 benefit and credit rules updated; verify final instructions",
    "form982": "2026 qualified-residence debt date gate updated; audit remaining rules",
    "form8839": "2025/2026 refundable split, indexed caps, and origin-year carryforward updated; add full credit-limit worksheet",
    "form4562": "2026 caps configured; choose passenger-auto cap by placed-in-service year",
    "f1040": "dedicated 2026 node begun; expand upstream surface and finalizations",
    "schedule1a": "2026 line 13a, TP/4137 employer reconciliation, TT updated; audit remaining sources",
    "form4137": "2026 tips reach Schedule 1-A, income, Schedule 2 tax; audit other cases",
    "schedule2": "dedicated 2026 line calculator/node routes tip and W-2 taxes; split other sources",
    "f8812": "2026 Part II-B uses Schedule 2 lines 16c/17c; Worksheets A/B use 2026 Schedule 3 lines; finish credit graph",
    "f1099div": "2026 ordinary/qualified/exempt dividends, direct box2a gain, PAB/AMT, and withholding; add special gains, QBI, foreign credit, and MeF",
    "schedule_d": "2026 box2a, carryover, and 1099-B/DA transaction PDF routes verified; add other capital sources, QOF, and MeF",
    "f1099b": "dedicated 2026 1099-B input registered with Form 8949/Schedule D PDF; add unsupported broker branches and MeF",
    "form8949": "2026 broker and digital-asset transactions reach category PDF pages and Schedule D; add direct public trades and MeF",
    "schedule_e": "2026 draft adds vehicle-interest line 13a; build activity-level Part I-V graph, PDF, MeF, and ATS 3/6; see SCHEDULEE-GRAPH.md",
    "f1099r": "final 2026 form/instructions pinned; fully and partially taxable normal pensions, code1 early tax, early SIMPLE Form5329 Part I, and pension code G rollover reach AGI/1040/PDF; add other codes, 8606/4972, current MeF; see FORM1099R-GRAPH.md",
    "f2441": "2026 form/instructions pinned; monthly deemed-income and provider continuation built; finish eligibility, prior-year expense, self-employed benefit, PDF and MeF; see FORM2441-GRAPH.md",
    "ssa1099": "dedicated 2026 SSA/RRB source registered through AGI and PDF; add net-repayment deduction, lump-sum election, MeF, and current-year instruction check",
    "form5329": "dedicated 2026 Part I early SIMPLE 25% graph and PDF route; add exceptions, other parts, separate spouse forms, MeF; see FORM5329-GRAPH.md",
    "form8606": "2026 form and instructions pinned; dedicated per-owner basis and Roth calculation needed before registry; see FORM8606-GRAPH.md",
    "form8889": "2026 form/instructions pinned; shared node lacks month-by-month eligibility/spouse allocation, routes income/tax to wrong lines, and omits PDF/MeF parts; see FORM8889-GRAPH.md",
    "form8959": "2026 form/instructions pinned; shared node sends combined old line 18 tax to Schedule 2 line 11, but 2026 splits line 12/18 to 17b/11 and changes PDF positions; see FORM8959-GRAPH.md",
    "form7206": "2026 form/instructions pinned; shared node uses aggregate profit/PTC shortcut, lacks per-business earnings and Form 2555, PDF fields mis-map; see FORM7206-GRAPH.md",
    "form8853": "2026 form/instructions pinned; shared node routes penalty to old Schedule 2 keys, omits MSA prior-year worksheet and LTC multi-payee statements; see FORM8853-GRAPH.md",
    "schedule_f": "2026 draft makes line 21b vehicle interest and 21c other interest; build dedicated farm input, PDF/MeF, ATS 3; see SCHEDULEF-GRAPH.md",
    "f4835": "2026 form/instructions pinned; line 19b vehicle interest and farm-rent Schedule E route need PDF/MeF and ATS 3; see FORM4835-GRAPH.md",
    "schedule_se": "ATS 3 elects 2026 farm optional method; current Schedule F suppresses low-profit/loss SE route and 2025 PDF map puts profit in 2026 name field; see SCHEDULESE-GRAPH.md",
    "f1099patr": "continuous-use source pinned; shared box 6/8/9 labels are wrong and boxes 10-13 missing; rebuild cooperative QBI route; see QBI-COOPERATIVE-GRAPH.md",
    "form8995": "2026 simplified form and $400 minimum pinned; patron status requires Form 8995-A; remove estimated-income path for 2026; see QBI-COOPERATIVE-GRAPH.md",
    "form8995a": "2026 form/schedule A and continuous-use schedules B/C/D pinned; add patron reduction, 199A(g), $400 minimum, per-business PDF/MeF; see QBI-COOPERATIVE-GRAPH.md",
    "qbi_aggregation": "Schedule B 8995-A pinned; shared input captures groups but emits no filing/calculation route; see QBI-COOPERATIVE-GRAPH.md",
    "w2g": "final Jan 2026 form/instructions pinned; shared box 2/3/7 labels stale and winnings route to 8z, not 2026 Schedule 1 line 8b; see ATS-SCENARIO-06.md",
    "k1_partnership": "ATS 6 Part II row needs activity, allowed-loss evidence, Schedule E line 41 route, PDF and MeF; packet lacks K-1; see ATS-SCENARIO-06.md",
    "schedule_c": "ATS 2 statutory W-2 output is unused by shared node; line 16b/16c, 44a-c, 109-widget PDF and current MeF needed; see SCHEDULEC-GRAPH.md",
    "f8283": "Dec 2025 continuous-use form/instructions pinned; ATS 2 source record and Schedule A deduction/attachment choice need 2026 routing; see ATS-SCENARIO-02.md",
    "f8888": "Nov 2026 form/instructions pinned; ATS 5 split depends on final refund, shared node metadata-only and savings-bond fields obsolete; add PDF/current MeF; see ATS-SCENARIO-05.md",
}

P0_NODES = {
    "f1040", "general", "schedule_a", "schedule1a", "schedule1", "schedule2",
    "schedule3", "form8839", "form8962", "form5695", "f8936", "f8812",
    "eitc", "income_tax_calculation", "agi_aggregator", "standard_deduction",
    "form4562", "f1099patr", "form8995", "form8995a", "form_8829", "schedule_h",
    "f8835", "form1062",
}
P1_NODES = {"form_1116"}

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
mef_components = set(mef_names)
pdf_components = {row["component"]: row for row in pdf_rows}
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

# Map every registered TY2025 node to its implementing module. This is the
# graph review worklist, separate from PDF and MeF serializer inventories.
registry_source = REGISTRY.read_text()
bindings: dict[str, Path] = {}
for names, module in re.findall(
    r'import\s*\{(.*?)\}\s*from\s*"([^"]+)";', registry_source, re.S
):
    if not module.startswith("../nodes/"):
        continue
    resolved = (REGISTRY.parent / module).resolve()
    for name in names.split(","):
        parts = name.strip().split(" as ")
        if parts[0]:
            bindings[parts[-1].strip()] = resolved

body = registry_source.split("export const registry: NodeRegistry = {", 1)[1]
body = body.split("\n};", 1)[0]
node_rows = []
for line in body.splitlines():
    code = line.split("//", 1)[0].strip().rstrip(",")
    match = re.fullmatch(r"([A-Za-z][A-Za-z0-9_]*)(?:\s*:\s*([A-Za-z][A-Za-z0-9_]*))?", code)
    if not match:
        continue
    node_type, binding = match.group(1), match.group(2) or match.group(1)
    if node_type == "start":
        source = REGISTRY.parent / "start.ts"
    else:
        source = bindings.get(binding)
        if source is None or not source.exists():
            raise RuntimeError(f"Cannot locate registry binding {node_type}: {binding}")
    relative = str(source.relative_to(ROOT))
    source_text = source.read_text()
    mentions = sum("2025" in source_line for source_line in source_text.splitlines())
    group = "start" if node_type == "start" else relative.split("/nodes/", 1)[1].split("/", 1)[0]
    component = re.sub(r"^form_?", "f", node_type)
    if node_type == "f8812":
        component = "schedule_8812"
    pdf = pdf_components.get(component)
    node_rows.append({
        "node_type": node_type,
        "ty2025_source": relative,
        "group": group,
        "2025_mentions_in_module": mentions,
        "uses_ctx_tax_year": "yes" if "ctx.taxYear" in source_text else "no",
        "ty2025_mef_module": "yes" if component in mef_components else "no",
        "ty2025_pdf_descriptor": "yes" if pdf else "no",
        "ty2026_draft_snapshot": pdf["ty2026_draft_snapshot"] if pdf else "n/a",
        "priority": "P0" if node_type in P0_NODES else "P1" if mentions or node_type in P1_NODES else "P2",
        "2026_disposition": "audit-required",
        "progress_or_next_action": NODE_PROGRESS.get(
            node_type, "verify 2026 law, node outputs, and graph route"
        ),
    })
if len({row["node_type"] for row in node_rows}) != len(node_rows):
    raise RuntimeError("Duplicate node in TY2025 registry inventory")
with (OUT / "node-coverage.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(node_rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(node_rows)

print(f"PDF descriptors: {len(pdf_rows)}, MeF modules: {len(mef_names)}, registry nodes: {len(node_rows)}, node 2025 mentions: {len(year_literals)}")
