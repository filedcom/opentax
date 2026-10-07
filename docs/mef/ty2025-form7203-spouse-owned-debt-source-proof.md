# TY2025 MFJ independently owned direct-note loss proof

## Authority and precise scope

[IRS Form7203 instructions](https://www.irs.gov/instructions/i7203), Name of
Shareholder, require separate Forms7203 for spouses receiving their own K-1s on
a joint return. A guarantee alone does not establish debt basis. This slice
retains the existing owned-current direct-loan, original stock cost, annual
zero-activity history, current cash-capital, corporate ordinary account, issued
K-1/199A statement and participation contracts. It accepts one separately owned
corporation per actual spouse. It does not combine their basis before applying
each owner's loss limitation.

The records are constructed retained source-contract specimens, not
authenticated outside issuer/bank/signature evidence or accepted prior filings.
The prior reduced-note accepted-history/export guard remains. Current notes have
zero opening debt face/basis and no prior debt reductions: restoration is
genuinely zero; principal repayments occur before current loss allocation and
have no taxable gain. Nonzero prior restoration/taxable prior repayment, shared
corporations, other K-1 items/businesses and wider limitation/source
combinations remain open.

## Actual public calculations and copies

All original loss economics remain $4,000 ordinary loss, $500 original stock
cost, $1,000 current capital, $2,000 directly funded note per owner. A $400
spouse principal repayment reduces only that spouse's debt capacity. Actual
primary W-2 wages are $50,000, withholding $8,000; joint standard deduction is
$31,500; QBI deduction is zero. Current allowed qualified loss and
basis-suspended qualified loss have distinct carry outputs. Family outputs
additionally identify each owner/corporation.

| Packet                     | Allowed loss | Basis suspended | Current QBI loss carry |     TI |   Tax | PDF pages |
| -------------------------- | -----------: | --------------: | ---------------------: | -----: | ----: | --------: |
| primary_mfj                |        3,500 |             500 |                  3,500 | 15,000 | 1,503 |         8 |
| spouse_mfj                 |        3,500 |             500 |                  3,500 | 15,000 | 1,503 |         8 |
| spouse_repaid_mfj          |        3,100 |             900 |                  3,100 | 15,400 | 1,543 |         8 |
| independent_spouses        |        7,000 |           1,000 |                  7,000 | 11,500 | 1,153 |        10 |
| independent_spouses_repaid |        6,600 |           1,400 |                  6,600 | 11,900 | 1,193 |        10 |
| independent_basis_capacity |        7,500 |             500 |                  7,500 | 11,000 | 1,103 |        10 |

The last additional case retains both $4,000 losses and the spouse's original
sources, but independently sources a $3,000 primary note. Primary allowed loss
is $4,000 with $500 ending debt basis; spouse allowed loss remains $3,500.
Pooling bases would incorrectly deduct $8,000. Tax uses the applicable 2025 MFJ
$50 Tax Table midpoint at 10%, rounded to whole dollars.

Native/PDF return ownership is explicit: each shareholder's Form7203 has its own
name/SSN/corporation; a joint ScheduleE has one or two nonpassive corporation
rows; a joint Form8995 has one or two qualified-loss business rows and the
allowed total carry. Two-owner native documents use the existing
additional-document mechanism, so each copy has a distinct canonical document ID
and participates in document counts/references. The family replay first binds
actual MFJ identities, complete K-1 inventory and independently computed joint
totals, then internally derives each singleton context for the existing strict
basis projector; caller-supplied scalar basis/selected-copy fields cannot
replace source inventory.

## Evidence and boundaries

Current public source and both export paths reject wrong/nonjoint claimants,
duplicate source/issuer, detached bank/loan principal, guarantee-only debt and
missing annual basis records. Native/PDF also reject missing shareholder copies,
replaced source copies, omitted QBI business rows, pooled loss, suspended loss
included in current carry, detached K-1, altered spouse identity, TI and QBI
deduction.

Final evidence, terminal logs, immutable raw replay, all-page review and exact
prior preservation are recorded below after execution. No original artifact is
regenerated or overwritten. The preceding single-owner proof's archived pending
qualification remains: eight old occurrences contain one identical seven-page
packet; their historical whole pending differs by an obsolete below-threshold
Form8960 entry, and their XML lacked a final newline, already on the clean prior
base. This slice does not claim those historical whole pending bytes unchanged.

### Terminal proof (isolated dec391d8b)

- Final source gate: **8 passed, 0 failed**
  (`/tmp/opentax-form7203-spouse-source-v9.log`,26s), six complete public
  XML/PDF positives and two negative suites.
- Existing eleven-module gate: **208 passed, 0 failed**
  (`/tmp/opentax-form7203-spouse-compat-v2.log`,41s). After the final owned
  PDF8995 header correction, affected prior source/PDF gate: **13 passed, 0
  failed** (`/tmp/opentax-form7203-spouse-header-compat-v2.log`,17s). The
  missing-file invocation in header-compat-v1 was not an executed pass.
- Originals: `/tmp/opentax-form7203-spouse-owned-debt-evidence-terminal-v9`: six
  packets,48 source/filer/expected/pending/carry/origins/XML/PDF files,54 pages.
  `/tmp/opentax-form7203-spouse-page-review-final` contains every rendered page
  and six contacts; all54 reviewed, selected shareholder7203, two-rowE and QBI
  detail pages reviewed at full size. Finalv9 PDFs are byte-identical to the
  independently rendered/reviewed final-header v7 PDFs. PDFs are static, with no
  AcroForm fields/widgets.
- Prior four current packets replayed exactly from original retained inputs
  through fullXSD: `/tmp/opentax-form7203-spouse-prior-held-v2.log` and
  `/tmp/opentax-form7203-spouse-prior-four-replay-v2/report.json`: source,
  pending,carry,origins,PDF exact; XML only ReturnTs. Original32 pages and older
  qualified archive remain unmodified.
- No main, shared research, board, catalog or PR edits. Pure schema cache path
  is read-only; calculations/evidence are isolated.

### Repeatable commands

Run from the integrated checkout with Poppler/Deno on PATH:

```sh
FORM7203_SPOUSE_DEBT_EVIDENCE_DIR=/tmp/NEW_UNIQUE_SOURCE_OUTPUT deno test -A forms/f1040/2025/form7203_spouse_owned_debt_source.test.ts
```

The optional evidence env is permission-aware; absence does not omit
source/XSD/PDF assertions. The exact compatibility module list is the preceding
owned-debt proof's eleven-module list (208 tests), including
`form7203_owned_debt_source.test.ts`.

Actual raw retained-input replayer outside checkout (no source
factory/regeneration):

```sh
deno run -A --config CHECKOUT/deno.json /tmp/opentax-form7203-spouse-retained-replay.ts CHECKOUT /tmp/opentax-form7203-spouse-owned-debt-evidence-terminal-v9 /tmp/NEW_UNIQUE_REPLAY_OUTPUT owned PRIVATE_PDF_CACHE
```

It retains actual filer/source bytes, recalculates pending/current carries,
validates fullReturn XSD, compares PDF/origins/JSON exactly and permits XML
ReturnTs only. It does not reinterpret recorded source facts or manufacture
authenticity.

Final raw replay is terminal and exact for all six packets/54 pages:
`/tmp/opentax-form7203-spouse-held-v1.log` and
`/tmp/opentax-form7203-spouse-retained-v9-replay-v1/report.json`. All original
source bytes remained unchanged; no synthetic expected-source regeneration or
arbitrary PDF/XML normalization was used.

Review manifest SHA-256:
`8af3d72a9efdc32405b38cb6ff8cd5c5e46dd938423d4e46392a6f229b0a0e89`. 48-file
packet manifest SHA-256:
`4170d4f78f16f0411b7a94810f5858baf2f187408e4e053a3245ee748d058290`. Private
canonical template cache retained outside checkout at
`/tmp/opentax-form7203-spouse-owned-debt-pdf-cache-final`.

## Main integration verification

Integrated production2f90ab34f passes the fresh standard-task twelve-module gate **216/0** (1m5s), `/tmp/opentax-form7203-spouse-main-combined-v2-oct6.log`, using installed Poppler tools on PATH. The preceding completed210/6 invocation records missing pdftotext in its shell PATH, not a tax/output mismatch. Raw replay from six actual original retained public sources/filer records reproduces whole pending, carry, PDF and page origins exactly, native XML only ReturnTs, with full v5.4 XSD validation: `/tmp/opentax-form7203-spouse-main-retained-oct6/report.json`. Four prior immutable owned-current packets also reproduce all32pages and wholepending/carry/PDF/origins exactly: `/tmp/opentax-form7203-spouse-prior-main-retained-oct6/report.json`. Root visually reviewed all54 new pages and shareholder/QBI details. Original48files copied independently into `.state/research/form7203-spouse-owned-debt-oct6-preserved`; reviewmanifest digest verified. Wider corporate/history/authentication/IRS gates remain open.
