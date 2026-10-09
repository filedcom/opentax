# TY2025 Schedule J fishing and mixed farm source checkpoint

## October 9 owned nonfarm wages and fishing

The retained nonfarm employer record now accepts either filed spouse and checks
its EIN against every retained Schedule C/F business, including fishing-only
returns. The source remains limited to one matching W-2 with retained employer
bytes and SHA-256, nonagricultural corporate employment and distinct filed owner
identities. Nonfarm wages stay outside elected farm/fishing income. The
[2025 Schedule J instructions](https://www.irs.gov/pub/irs-prior/i1040sj--2025.pdf)
and [2025 Schedule SE instructions](https://www.irs.gov/pub/irs-prior/i1040sse--2025.pdf)
provide the qualifying-income and owner wage-base rules used here.

Four complete joint returns retain 120,000 fishing profit, 200,000 farm profit,
100,000 nonfarm wages and 20,000 withholding. Both business-owner arrangements
are tested with each spouse receiving the wages. Independent decimal arithmetic
recomputes each owner's 92.35% SE base, remaining 176,100 Social Security wage
base, Medicare tax, half-SE deduction, QBI, Schedule J and final tax.

| Wage recipient | Total SE / half-SE | AGI | QBI deduction | Taxable income | No-election regular tax / Schedule J tax | Total tax / owed |
|---|---:|---:|---:|---:|---:|---:|
| Fishing owner, either spouse | 39,842 / 19,921 | 400,079 | 60,016 | 306,963 | 59,365 / 57,265 | 98,417 / 78,417 |
| Farm owner, either spouse | 31,748 / 15,874 | 404,126 | 60,825 | 310,201 | 60,142 / 58,042 | 91,100 / 71,100 |

The election remains 15,000, Additional Medicare Tax is 1,310 and AMT is zero
in all four complete returns. Each retains 19 PDF pages: **four XSD-valid XML
returns and 76 reviewed pages**, represented by 37 unique rendered images on
10 inspected contact sheets. Independent XML/PDF-text comparisons agree with
source arithmetic, and native W-2 names/SSNs and both Schedule SE owners agree.
Existing joint-name (68), skipped-zero (76) and attachment-order (86)
qualifications remain; this is not a claim of flawless packet presentation.

Two original single-filer cases (fishing alone and fishing with two farms)
retain their pension and ISO facts and remain blocked in native and fresh PDF
export. AMTI 685,997 gives normalized Form 6251 exemption 73,188 and taxable
excess 612,809, but Form 4972's reconciliation expects 73,189/612,808. This
newly observed rounding conflict is **future_todo 120**, deferred without a fix;
the source facts were not reduced or removed to evade it.

The final typed focused run passes **6/0**, including both explicit boundary
rejections; the combined Schedule J domain, input, calculation, native, PDF and
e2e gate passes **105/0**. Four positive cases reject 12 public-source mutations
and 16 native/16 fresh-PDF mutations; the blocked originals add two native/two
fresh-PDF rejections. No benchmark rerun was needed for this source guard;
the latest historical run remains 46/133 at `f9627ea8b`.

Private evidence is retained under
`.state/research/schedule-j-fishing-wages-2026-10-09/`: all six source/pending
JSONs, four XML/PDF pairs, focused/group logs, render manifest, independent
text/native arithmetic, environment and visual-review records. The XSD hash is
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
Synthetic employer/catch bytes establish reproducibility, not source authenticity
or prior IRS acceptance. Broader qualifying-income attribution remains open.


## October 9 paid fishing expenses and complete packets

The retained cash fishing ledger now supports Schedule C business insurance
(line 15), incidental repairs (line 21), and business utilities (line 25), in
addition to supplies. Each paid row identifies its supplier, receipt, amount,
valid 2025 payment date and business/service-year qualification. Insurance is
limited to property/liability coverage; capital improvements, owner labor,
personal/home-office utilities and residential telephone expenses remain outside
this route. These limits follow the [Schedule C instructions](https://www.irs.gov/instructions/i1040sc).
The retained SHA-256 bytes must reconcile each category to Schedule C, with
unique paid-receipt references across supplies and the new categories. This
extends the existing source inventory; it does not implement deferred work.

Six synthetic returns cover fishing alone, fishing with one or two farms,
higher repairs reducing profit, and separately owned joint fishing/farming in
both owner directions. Five cases retain 5,000 supplies, 3,000 insurance,
7,000 repairs and 5,000 utilities (20,000 total). The lower-profit case has
47,000 repairs (60,000 total), reducing fishing profit from 120,000 to 80,000.
The other three single cases retain 320,000 combined business profit; the two
joint cases split 120,000 fishing and 200,000 farm profit across spouses.

| Return group | Half-SE | AGI | QBI deduction | Taxable income | Schedule J tax | Total tax / amount owed | Pages |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fishing only / one farm / two farms | 15,203 | 339,797 | 0 | 322,047 | 72,757 | 158,912 | 18 / 20 / 22 |
| Higher repairs / lower profit | 14,668 | 300,332 | 0 | 282,582 | 59,332 | 146,846 | 20 |
| Joint taxpayer / spouse fishing owner | 22,074 | 297,926 | 52,965 | 211,861 | 34,637 | 79,195 | 19 / 19 |

Single returns retain 35,000 dividends (30,000 qualified), the 240,000 ISO
adjustment and 830 Form 4972 tax from the prior reviewed fixtures. AMT uses
AGI plus ISO less the 88,100 exemption, the 26%/28% ordinary rates at 239,100,
and 15% on qualified dividends: tentative tax 128,993 or 117,943, less the
separate no-election regular tax 76,264 or 62,451, gives AMT 52,729 or 55,492.
SE tax is 30,406 or 29,335; additional Medicare tax is 860 or 527 and NIIT
is 1,330. Joint returns retain separately rounded SE components totaling
44,148 (fishing 16,956; farm 27,192), additional Medicare 410, and no AMT or
NIIT. These sums reconcile to Form 1040 lines 24 and 37; payments are zero.

The new focused gate passes 7/0, including 37 public-source rejections and
24 native/24 fresh-PDF rejections. Thirteen public mutations rehash the ledger
with missing/mismatched expense rows, unsupported qualifications, impossible or
wrong-year dates, duplicate receipts or a wrong owner; 24 further mutations
change filed categories or introduce an unsupported office deduction. Native
and PDF rejection counts cover those 24 filed-input mutations only.
The grouped Schedule J domain, native, PDF and end-to-end regression passes
62/0, with normal type checking. The focused final-tax replay passes 7/0.
The fixture and checks are in
`forms/f1040/2025/domains/taxes/income-averaging/schedule-j/schedule_j_fishing_expenses.test.ts`;
set `OPENTAX_SCHEDULE_J_EXPENSE_PROOF_DIR` to retain its six packets.

All six full returns pass the local IRS 2025v5.4 XSD. Native Schedule C
categories/profit/owner, Schedule SE copy counts, and Form 1040 tax/owed values
were also checked independently of XSD. The 118 flattened PDF pages contain no
editable fields/widgets; 58 distinct page images were inspected on 15 contact
sheets, with SHA-256 equality covering repeated pages. The new expense lines,
profit, owner-specific C/F/SE copies, QBI, Schedule J, AMT and final amounts
reconcile. Existing joint-name presentation (68), skipped/zero presentation
(76), Form 6251 native line 1a (84) and attachment-order (86) qualifications
remain deferred; schema success does not resolve them.

Evidence: `.state/research/schedule-j-expense-packets-2026-10-09/` retains
source/pending/origin JSON, XML, PDFs, XSD logs, image hashes and the visual/native
review manifests. XSD SHA-256:
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The benchmark remains 46/133 passing (87 existing failures, deferred item 96).
Supplier/buyer issuance and prior IRS returns remain synthetic evidence;
crew/shareholder compensation, payroll/property, other expenses and attribution,
loss/NOL and broader credit combinations remain existing parent scope. This is
not IRS business-rule acceptance or general filing readiness.

## Historical October 6 catch-sales and supplies checkpoint

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
require line 2a to combine all income, gains, losses, and deductions
attributable to the taxpayer's farming and fishing businesses. The existing
ordinary-rate Schedule C fishing and Schedule F routes had positive graph cases;
the preferential source replay rejected fishing, and the catch evidence was only
a reference. This checkpoint adds a retained operator catch-sales and
paid-supplies ledger to the reviewed cash Schedule C source. Its SHA-256 byte
digest, owner SSN, business reference, commercial vessel status, sales and
expenses must match the filed C and computed at-risk profit before the source
replay accepts fishing. The actual no-election return derives dividend
preferential operands. The elected graph must then reconcile Schedule C/F
profit, half-SE, AGI, the zero-limited QBI result, line 15, Schedule J and the
no-election 6251 regular tax. Native and PDF exporters replay that complete
public source.

The filed examples retain Ada's earlier reviewed $200,000 Schedule F grain
income and issued $35,000 dividend source with $30,000 qualified; one example
has fishing only, another has one farm, and a third has two farms. The retained
catch book has a single commercial buyer sale and one paid marine-supply
receipt, netting $320,000 in the fishing-only example or $120,000 in each mixed
example. The buyer and supplier references are reviewed operator-book records;
this proof does not authenticate buyer- or supplier-issued documents. The
prior-year Schedule J references in the underlying public fixture also remain
synthetic, so externally accepted prior returns are not claimed.

For each of the three actual source combinations, independently checking the
2025 Social Security wage cap and Schedule SE rates yields half-SE $15,203.
$320,000 combined business profit plus $35,000 ordinary dividends minus that
half-SE gives AGI $339,797 and line 15 $322,047 after the $17,750 standard
deduction. With no business W-2 wages or UBIA, this exceeds the $197,300
single-filer QBI threshold plus the full $50,000 single-filer phase-in range, so
no current QBI deduction or Form 8995-A is filed. The $15,000 election produces
Schedule J lines 3/4/23 of $307,047/$71,014/$72,757; Form 1040 line 16 is
$73,587 including the retained $830 Form 4972 tax. Form 6251 uses the separate
$76,264 no-election regular tax. Mutation cases reject a missing or altered
ledger, wrong owner/business, mismatched sale/expense, another Schedule C
expense and changed final pending before native/PDF output.

The [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
set the single-filer phase-in at $197,300–$247,300. The fourth public source
case has $200,000 of farm profit and $80,000 of fishing profit, giving AGI
$300,332 and taxable income before QBI $282,582. Its elected and no-election
packets correctly omit Form 8995-A. The $15,000 election produces Schedule J
lines 3/4/23 of $267,582/$57,589/$59,332; Form 1040 line 16 is $60,162,
including the retained $830 Form 4972 tax. The separate no-election Form 6251
regular tax is $62,451. A changed fishing sale puts pre-QBI taxable income at
$233,252 inside the actual single-filer phase-in; native output rejects the
unsupported per-business Form 8995-A source rather than silently filing it.

Focused corrected source tests pass 4/0 at
`/tmp/opentax-schedulej-fishing-corrected-source-oct6.log`; all eight packets
pass native full-v5.4-XSD and real PDF generation. All 152 pages were visually
reviewed, including the new 20- and 18-page packets on four contact sheets.
The exact copy/page inventory and source/pending/XML/PDF/origin SHA-256 digests
are in `/tmp/opentax-schedulej-fishing-corrected-rendered-oct6/visual-review-manifest.json`.
The original six packets remain byte equal for source/pending/PDF/origins, with
XML differing only at ReturnTs, to their prior 114-page visual review in
`/tmp/opentax-schedulej-fishing-rendered-oct6/visual-review-manifest.json`. The
directly rerun earlier W-2 and ordinary fishing/farm tests pass 15/0
(`/tmp/opentax-schedulej-fishing-preservation-oct6.log`). The prior W-2 2/38
packet source/pending/PDF/origin files remain byte equal, with XML differing
only at ReturnTs, against `/tmp/opentax-schedulej-w2-after6251-final-v2-oct6`.

This does not cover phase-in positive mixed C/F QBI, fishing crew wages or
lease, disposition income/loss, capital allocations, itemization/NOL, and other
income source classes. The bounded current route continues to guard those cases.
It is local schema and rendering proof, not IRS business-rule or accepted filing
evidence.

The original isolated source rerun passed 3/0 at
`/tmp/opentax-schedulej-fishing-source-final3-oct6.log`; four related QBI
modules pass 52/0 at `/tmp/opentax-schedulej-fishing-qbi-preservation-oct6.log`.
The separate checkout-independent script
`/tmp/opentax-schedulej-fishing-corrected-raw-replay-oct6.ts` reads each of the eight
immutable reviewed `source-pending.json` inputs rather than invoking a case
factory, verifies each retained ledger digest, and runs the actual return,
native XML/full XSD, PDF and page origins. Its isolated selfcheck reports 8/152
with source/pending/PDF/origins exact and XML only ReturnTs in
`/tmp/opentax-schedulej-fishing-corrected-raw-selfcheck-oct6.log`. The prior Ada J/no-J
2/36 source/pending/PDF/origins and prior staged QEF/adoption/education 3/49
source/pending/PDF/origins are also byte exact against their separately retained
reviewed originals, with XML only ReturnTs.

## Integrated main preservation and interaction repair

Main d0f1c29d1/cccc2bd7f includes both source attribution and corrected single-filer full phase-out247300. Root b2c90ce1d restricts the newly introduced zero-limited omission to actual retained fishing catch-ledger sources. Before that restriction, strict actual retained mining replay failed pending reconciliation and would lose its required zero-deduction Form8995A; `/tmp/opentax-mining-before-fishing-scope-fix-oct6.log` remains diagnostic evidence, not a passing gate. The standard task now permits exactly the two optional fishing evidence/schema environment variables.

Fresh main combined fishing4/mining2/nonfarmW2three source tests pass **9/0** (1m32s), and related QBI calculation, multiple-C, zero-source, mixed-WOTC and positive8995A tests pass **86/0** (1m0s). Typed fishing/mining checks and formatter pass. Logs: `/tmp/opentax-fishing-mining-w2-scope-source-oct6.log`, `/tmp/opentax-fishing-qbi-scope-related-oct6.log`, `/tmp/opentax-fishing-mining-scope-typecheck-oct6.log`.

Actual immutable fishing source replay passes **8 packets/152 pages**, full local XSD, exact pending/PDF/origins and XML differing only at ReturnTs: `/tmp/opentax-fishing-after-qbi-scope-fix-oct6.log`. The retained visual manifest SHA256 is d434c7bb64fc48a23d969d5b62bcf2dd23cc53fddc12cee2b3f2c19261c5378d; exact PDF comparisons preserve all reviewed occurrences. Strict original mining replay passes **2 packets/32 files** with no derived JSON allowances, preserving filled zero8995A: `/tmp/opentax-mining-after-fishing-scope-fix-oct6.log`. Actual nonfarmW2 **2/38** full-XSD packet replay remains exact: `/tmp/opentax-schedulej-w2-after-fishing-scope-main-held-oct6.log`.

True positive mixed-business QBI phase-in, broader attribution/owner/source combinations, prior accepted returns, authenticity, IRS business rules and acceptance remain open. No broad parent is closed by these bounded proofs.
