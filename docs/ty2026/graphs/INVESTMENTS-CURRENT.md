# Investment source workpaper on current main

Checked October 15, 2026, on `codex/ty2026-readiness`. This supersedes the
executable-state claims in the historical interest and dividend graph notes.

`calculateInvestmentIncome2026` reconciles issued 1099-INT and 1099-DIV copies
through the existing interest, dividend and Schedule B calculators. The new
source validation lives under `forms/f1040/2026/inputs`; shared algorithms stay
in their current domain folders. Dividend and NIIT calculations now also accept
explicit configurations, while their 2025 entry points still select 2025 config.

This is an **unregistered calculation workpaper**. It is not an added public
input, a complete return, a PDF attachment, or a claim of IRS acceptance.

## Source reconciliation

- Copies require tax year, payer, recipient, account and document identity.
  Corrected duplicates must be resolved to one current copy; joint-spouse
  ownership is checked separately from MFS ownership.
- Issued amounts remain in cents. Sources contributing to a single printed
  amount are added before rounding; original boxes and review records remain
  available alongside the normalized calculator inputs.
- Bond premium requires an election/reporting review and per-bond netting
  evidence. Gross boxes receive the reviewed reduction; already-net boxes do
  not receive it again. Taxable opt-out elections require gross statements.
  A PAB premium allocation must reconcile to both PAB and non-PAB portions;
  net interest can legitimately be smaller than its already-applied premium.
- Positive market discount requires a current-inclusion election. Nominee and
  accrued-interest adjustments require distinct ownership/allocation and
  settlement records. One record cannot be deducted on two copies. Nominee
  penalties, withholding, exempt income, market discount and premiums need
  further ownership allocations and currently fail explicitly.
- Each reported qualified dividend must reconcile to reviewed distribution
  lots. The calculation excludes acquisition and diminished-risk days, includes
  disposal days, and uses the 121-day ordinary or 181-day preferred window.
  Insufficient completed holding periods reclassify the dividend within box 1a;
  an unresolved open window fails instead of predicting future holding.
  December distributions can require holding records extending into 2027.
- State withholding requires state/payer identifiers and remains in the source
  result for the future Schedule A owner. PAB sources require eligibility and
  expense evidence; the workpaper computes their combined AMT preference.
- Unsupported foreign-tax, QBI, special-rate gains, nondividend/liquidation and
  dividend-nominee branches fail strict source parsing. Foreign account/trust
  reporting and OID are not enabled. Source review does not establish every
  required attachment or tax treatment for an entire brokerage account.

Schedule B keeps below-threshold dividend rows informational when already
routed by the dividend calculator. If interest independently requires Schedule
B, the dividends appear on its workpaper without reaching income twice. The
workpaper compares shared 1040, AGI, qualified-dividend and NIIT income outputs.
It preserves early-withdrawal penalties separately from gross interest.

## Required next integration

1. Wire source ownership and accumulated income into the 2026 runtime and
   maintain one owner for every amount. The workpaper is absent from the public
   input catalog until receiving branches are connected.
2. Deliver early-withdrawal penalties to both Schedule 1 and AGI, and to the
   NIIT deduction owner when applicable. Map NIIT to 2026 Schedule 2 **line 6**;
   the shared node still emits the legacy line-12 destination. Reconcile MAGI,
   expense allocations, itemization/2026 limitations and filing requirements.
3. Recompute retained PAB source records in Form 6251 and update its PDF
   reconciliation. Its current runtime contract only accepts the previously
   connected ordinary, deduction and ISO adjustments.
4. Add the complete Schedule D inventory before deciding whether capital-gain
   distributions may use the direct Form 1040 exception. Preserve state taxes
   through Schedule A rather than treating them as W-2 withholding.
5. Build and verify pinned 2026 Schedule B and Form 8960 PDF components and
   complete-bundle attachment decisions. Current MeF, CLI and ATS remain gates.

## Authorities rechecked

- [2026 draft Schedule B instructions](https://www.irs.gov/pub/irs-dft/i1040sb--dft.pdf),
  dated August 10, 2026: separate $1,500 filing triggers, labeled adjustments,
  net-reported premiums, exempt interest and PAB handoff.
- [Continuous-use 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int)
  and [1099-DIV instructions](https://www.irs.gov/instructions/i1099div), January
  2024 revisions: box definitions and dividend holding windows.
- [Rev. Proc. 2025-32 §4.26](https://www.irs.gov/irb/2025-45_IRB): 2026 QBI
  thresholds. Positive 199A dividends are rejected here; the distinct MFS
  threshold needs a year-aware QBI owner before enabling that source branch.
- [Form 8960 draft instructions](https://www.irs.gov/pub/irs-dft/i8960--dft.pdf)
  still identify **2025**, despite the 2026 form draft. Their early-withdrawal
  penalty and filing instructions inform the integration audit; they do not
  verify 2026 expense limitations or the new Schedule 2 destination.

## Verification

The combined current-2026 and shared 1099-INT, 1099-DIV, Schedule B and Form
8960 suites passed **490 tests**. All **16** investment workpaper tests passed
again after an additional fractional-dollar PAB allocation case. The repository
unit gate and its module-graph preflight passed. These results verify the
workpaper and preserve existing source behavior; they do not establish the
unfinished runtime or filing routes listed above.
