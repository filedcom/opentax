# TY2025 Form 8853 coverage boundary

Sources:
[IRS 2025 Form 8853](https://www.irs.gov/pub/irs-prior/f8853--2025.pdf),
[2025 Instructions for Form 8853](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf),
and the checked-in TY2025 v5.4 `Common/IRS8853/IRS8853.xsd`.

## Bounded PDF correction

The 2025 PDF descriptor previously placed several Archer MSA, Medicare Advantage
MSA, and LTC source amounts on unrelated form lines, including the name/SSN
header. Its source-field positions now match the 2025 AcroForm: Archer lines 6a,
6b, and 7; Medicare lines 10 and 11; and LTC lines 17, 18, 19, 22, and 24. Raw
`ltc_period_days` was removed from the PDF map because printed line 21 is **$420
times the days**, not a day count. The bounded taxpayer-owned, fully qualified
Archer route now validates against the native source guard before printing,
fills the holder name/SSN and calculated lines 6a/6b/6c/7/8 (including zero
on 6b/8), and retains only the applicable first page. The one-page filled PDF
was rendered and visually inspected on 2026-10-05; its PDF and image are in
`.state/research/ty2025-filled-pdf-review/2026-10-05-form8853-bounded/`.
The focused native/PDF cases passed 25/25. Other Section A/B/C paths remain
guarded.

## Bounded taxable Archer extension (2026-10-06)

The TY2025 public input list now accepts `form8853` and routes its source record
through the existing calculator. Filing additionally supports a single
taxpayer-owned normal Form 1099-SA distribution (box 3 code 1 explicitly
confirmed) with partial or no medical use. Gross distributions and unreimbursed
qualified expenses must be explicit whole-dollar amounts, with expenses no
greater than the distribution, zero rollover, no additional-tax exception, and
no contribution, Medicare Advantage MSA, or LTC activity. Joint and spouse-owned
routes remain rejected. The earlier fully qualified route remains supported.

Form 8853 line 8 is reconciled against Schedule 1 line 8e and line 9b against
Schedule 2 line 17e, including rejection of absent or mismatched positive totals.
The native group emits `ArcherMSAAddnlDistriTaxAmt` after the taxable distribution
in XSD order. The PDF now fills calculated line 9b at `Page1.f1_13` and leaves the
line 9a exception checkbox unchecked.

The synthetic acceptance fixture uses $3,000 gross, $2,000 unreimbursed qualified
expenses, $1,000 taxable income, and $200 additional tax. It verifies retained
owner/source confirmations, both schedules, Form 1040 income/AGI and tax,
complete native return validation against local TY2025 v5.4 `Return1040.xsd`,
and filled PDF extraction. On 2026-10-06, 59 focused node/native/PDF/start/e2e
checks passed. The generated seven-page return was rendered with real Poppler;
Form 1040, both schedules' populated pages, and Form 8853 were visually inspected.
Ignored evidence is in the isolated worktree at
`.state/research/2026-10-06-form8853-partial/` (`return.xml`, `return.pdf`, PNGs,
`pending.json`, and `test.log`). These are synthetic local integration evidence,
not authentic taxpayer source documents or IRS acceptance/ATS/business-rule
certification. General Form 8853 support remains open.

## Sourced Archer distribution exceptions (2026-10-06)

The public `form8853.archer_distribution_ledger` source now retains each normal
Archer distribution's date, gross amount, allocated unreimbursed qualified
expenses, Form 1099-SA code/source, distribution-date source, medical sources,
and the holder's SSN and date of birth. Disability requires an onset date and
source plus confirmation of the IRS substantial-gainful-activity and duration
criteria. This accepts multiple distributions for the same taxpayer, including
partially excepted taxable distributions. Source amounts are retained rather
than replaced by a single inferred exception amount. Supplied legacy totals or
exception indicators must agree with the ledger.

Under the 2025 instructions, the age/disability exception applies **after** the
event date. A distribution on the event date remains subject to additional tax.
Line 9a checks only when some taxable amount qualifies; line 9b is 20% of the
remaining taxable amount. A bare `archer_msa_exception: true` now requires the
sourced ledger and cannot waive every distribution's tax. Normal birth dates
establish the 65th birthday; a leap-day birth with no calendar 65th birthday
requires a sourced age-attainment date. Holder SSN and retained return birth
facts reconcile before filing. Native line 9a is emitted in XSD order, and the
PDF fills the real line 9a checkbox alongside calculated line 9b.

Death has a separate FMV-transfer source, not an ordinary distribution code.
It records deceased holder identity, date/death evidence, beneficiary identity
and designation, date-of-death valuation, and exclusion of postdeath earnings.
For a nonspouse individual beneficiary, the ledger deducts only unreimbursed
qualified expenses incurred before death and paid within one year. The native
form uses the beneficiary SSN, `MSAHolderDeathInd`, and the additional-tax
exception; the PDF prints the required "Death of Archer MSA account holder"
annotation above its title. Estate-beneficiary FMV is calculated on the
matching deceased final return with no medical offset. That estate case has
node/native Form 8853 and PDF projection evidence, **but full native/PDF return
export remains blocked** by the existing deceased-Form-1040 signer,
representative, and refund source guard. This extension does not bypass it.

Four synthetic full return cases pass local TY2025 v5.4 `Return1040.xsd` and
filled PDF extraction: mixed age65, mixed disability, fully excepted age65, and
nonspouse death transfer. Each mixed case has $6,000 gross, $1,500 qualified
medical use, $4,500 taxable income, $1,500 excepted taxable income, and $600
additional tax. The death-beneficiary case has $6,000 FMV, $2,000 medical offset,
$4,000 income, and zero additional tax. The complete focused batch passes
66 checks, including the original partial-use route and public start routing.
All four filled Form 8853 pages were rendered using real Poppler and visually
inspected; the death annotation was positioned in the top margin to avoid
colliding with the IRS title. Ignored XML/PDF/PNG/pending/test evidence is in
`.state/research/2026-10-06-form8853-exceptions/` in the isolated worktree.
This is synthetic local evidence; no authentic-source or IRS acceptance,
business-rule, or ATS claim is made.

Joint/spouse aggregation, surviving-spouse inherited account handling,
multiple inherited/owned account statements, predeath normal distributions
combined with estate FMV transfer, rollovers/excess withdrawals, contributions,
Medicare Advantage MSA and LTC routes remain separate gaps. The ledger requires
reviewed absence of those other activities for its retained filing route.

## End-to-end blockers

### Bounded native Archer MSA path now written

The original narrow source-to-filing route is implemented: a single
taxpayer-owned Archer MSA distribution whose whole-dollar gross amount is
confirmed from Form 1099-SA and is fully matched by unreimbursed qualified
medical expenses. The source must explicitly confirm no rollover, no tax
exception, and no other Form 8853 activity. The node retains a Form 8853
pending record even when lines 8 and 9b are zero. The MeF descriptor emits
the native `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN` and
calculated lines 6a, 6b, 6c, 7, and 8 in XSD order. It rejects spouse/joint
ambiguity and Schedule 1/2 conflicts. It does not emit flat legacy tags.

This does not establish general Form 8853 support. The remaining paths below
are still blocked. The bounded partial-use route above has full local return XSD and PDF evidence.
The broader code awaits the current full batch; general complete return XSD,
business-rule, and ATS evidence remain open.

- Archer paths beyond the sourced taxpayer ledger and death transfer, Medicare, LTC, and
  contribution paths still lack a
  complete node print record and source model. The v5.4 XSD nests Section
  A/B in `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN`, and
  Section C in `SectCLTCInsuranceCntrctGrp` with required policyholder/insured
  identity and line 15/16 answers. Section C remains unsupported; for example,
  raw `ltc_period_days` is not the XSD's computed
  `LTCDaysMultiplyByPerDiemAmt`. Focused native XML cases are written but unrun.
- The Archer exception ledger above resolves per-distribution age/disability
  tax for its sourced taxpayer route and the single nonspouse death transfer.
  Medicare's boolean `medicare_advantage_exception` still removes the additional
  tax from all taxable distributions. Medicare Advantage line 13b needs its
  prior-year balance/HDHP deductible worksheet and distribution-level exception
  facts; general Medicare support remains open.
- The Section C source model lacks policyholder and insured identities,
  terminally ill status, line 15 other-payee answer, LTC period method, and
  separate periods. IRS instructions require separate Section C calculations for
  multiple LTC periods and a multiple-payee statement when line 15 is Yes. A
  single undifferentiated days/expenses/reimbursements tuple cannot safely
  represent those paths.
- Archer contributions need an account-holder and monthly eligibility/HDHP
  coverage worksheet. The current precomputed line 3 can support a bounded
  manually substantiated case, but it does not validate the 2025 chart, Medicare
  eligibility, married coverage allocation, or excess contribution reporting.
  The node defaults missing compensation to infinity, whereas the printed line 5
  is the smallest of lines 2, 3, and 4. Until compensation is known, a positive
  deduction is not source-complete.
- Joint returns can require separate statement forms for each spouse's self-only
  Archer MSA or Medicare Advantage MSA, followed by a controlling form. Multiple
  Section C copies can also be required. One pending `form8853` object cannot
  represent that repeatable attachment structure.

## Acceptance cases before enabling a filing claim

1. Model each MSA account holder and each LTC insured/policyholder/period
   explicitly. Require source facts for every elected path and reject incomplete
   mixed-exception, multiple-payee, or Medicare special-worksheet cases instead
   of treating them as zero tax.
2. Compute the printed lines and retain a native Form 8853 output even when tax
   is zero but the form is required. Verify the Schedule 1/2 totals against
   those same computed lines and cover positive/zero/partially excepted
   distributions.
3. Emit both XSD groups in sequence with required identities and indicators,
   then validate against the checked-in v5.4 schema. Fill both PDF pages,
   including calculated lines and checkboxes, and visually inspect the result.

No compatibility layer or provisional fallback is proposed. The PDF change is
bounded; the rest remains an explicit gap until its source model, calculation,
native XML, and validation gates are complete.
