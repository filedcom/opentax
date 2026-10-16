# Investment sources and return graph on current main

Checked October 15, 2026, on `codex/ty2026-readiness`. This supersedes the
executable-state claims in the historical interest and dividend graph notes.

`calculateInvestmentIncome2026` reconciles issued 1099-INT and 1099-DIV copies
through the existing interest, dividend and Schedule B calculators. The new
source validation lives under `forms/f1040/2026/inputs`; shared algorithms stay
in their current domain folders. Dividend and NIIT calculations now also accept
explicit configurations, while their 2025 entry points still select 2025 config.

The `investment_income` singleton is now in the incremental source catalog.
`sourceRegistry2026` connects the existing wage/deduction/ISO routes and these
investment sources through tax and settlement. This registry is not a complete
FormDefinition, supported filing catalog entry, or claim of IRS acceptance.

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
  result and reaches Schedule A as identified 1099 withholding, separately from
  W-2 sources. PAB sources require eligibility and expense evidence; Form 6251
  recomputes their combined preference from retained copies.
- Unsupported foreign-tax, QBI, special-rate gains, nondividend/liquidation and
  dividend-nominee branches fail strict source parsing. Foreign-trust reporting,
  foreign statement income without issued 1099 copies, and OID remain pending.
  Source review does not establish every
  required attachment or tax treatment for an entire brokerage account.

Schedule B keeps below-threshold dividend rows informational when already
routed by the dividend calculator. If interest independently requires Schedule
B, the dividends appear on its workpaper without reaching income twice. The
workpaper compares shared 1040, AGI, qualified-dividend and NIIT income outputs.
It preserves early-withdrawal penalties separately from gross interest.

## Connected routes and output

```text
General identity + issued investment copies + scope/holding/election reviews
    |
    +-- shared INT/DIV/Schedule B workpaper -> income, withholding -> 1040
    +-- early penalty -> Schedule 1 and AGI -> deduction resolution
    +-- qualified dividends + reviewed distributions -> income tax
    +-- original PAB copies -> Form 6251 -> Schedule 2 line 2 -> 1040 line 17
    +-- state withholding -> Schedule A -> chosen deduction and tax allocation
    +-- sources + AGI + chosen deduction -> Form 8960
                                              |
                                     Schedule 2 line 6 -> 1040 line 23
```

The public source accepts records and inventory reviews, not computed tax,
MAGI, preference adjustments or NIIT deductions. Direct gain-distribution
reporting requires a review excluding other dispositions, loss carryovers and
other Schedule D items. Qualified dividends remain part of ordinary dividends;
they do not become a second NIIT income item. Source/AGI amounts must agree in
Form 8960, and preference amounts must agree in Form 6251. Returns without
wages no longer require an invented W-2.

Form 8960 uses the non-indexed $200,000/$250,000/$125,000 status thresholds.
An above-threshold individual calculation retains the attachment decision even
when NII or the rounded tax is zero. The shared 2025 calculator keeps its cents
rounder; 2026 explicitly selects direct whole-dollar rounding, avoiding the
$3.496 -> $3.50 -> $4 double-rounding error.

Itemized income-tax allocation requires a retained reasonable-method review.
The current method allocates the allowed SALT deduction proportionally to
income taxes, then applies gross NII/AGI (capped at one). Personal-use property
taxes are not investment expenses. Standard deduction and sales-tax elections
produce no income-tax NIIT deduction. The amount is capped by the selected
itemized deduction after §68; early-withdrawal penalties remain separately on
line 10. Other methods and positive unsupported expense/activity/MAGI branches
need their source owners and currently fail explicitly.

The new Form 8960 PDF component validates the 38 canonical fields/widgets,
recomputes its source calculation, checks receiving return/Schedule 1/A/2
amounts, removes the IRS cover and produces one static draft page. Form 6251's
PDF now fills line 2g and reconciles exempt/preferential return lines when
investment copies are present. The source graph's Schedule B workpaper retains
its filing decision, payer rows and adjustments. The new Schedule B PDF
recomputes those retained sources, checks Form 1040 totals and includes complete
payer/adjustment continuations and seller-financed buyer details. See the
[Schedule B component map](../pdf/PDF-SCHEDULEB-MAP.md) for scope and validation.

## Remaining work

- Broader foreign-account/trust disclosures,
  nominee-dividend, foreign credit, investment interest, QBI, nondividend/basis,
  OID and other disposition sources still need their full receiver paths.
- The direct distribution review does not implement general Schedule D.
  Pass-throughs, annuities, foreign elections, §1411 NOL and other MAGI/expense
  branches remain separate work. The current AGI receiver flags potentially
  relevant unsupported activity instead of silently classifying it as zero.
- Final 2026 instructions, complete PDF attachment selection, the public product
  catalog, CLI, current MeF and ATS acceptance remain release gates.

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
- [26 CFR §1.1411-4(f)(7), (g)(1)](https://www.govinfo.gov/link/cfr/26/1?link-type=pdf&sectionnum=1411-4&year=mostrecent),
  pages 80–81: lesser-of itemized-deduction limit and reasonable NII/AGI
  allocation. [P.L. 119-21 §70111](https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf),
  pages 164–165, replaces §68 effective 2026 and removes its former subsection
  (c) exceptions. Applying the regulation's lesser-of rule to the entire new
  §68 itemized total is the current implementation's interpretation of these
  primary authorities; recheck final 2026 guidance before release. The selected
  itemized total itself uses the reviewed 2026 Pub. 505 worksheet.

## Verification

The combined current-2026, shared investment and existing W-2 suites passed
**604 tests**. The repository unit gate and its module-graph preflight also
passed. Eight source graph scenarios cover wages plus investments,
investment-only returns, PAB AMT, state-tax allocation, SALT/overall limits,
standard/sales elections, rejected claims and joint ownership. NIIT tests cover
all five status thresholds and direct whole-dollar rounding. The PDF tests
verify receiving amounts, identities, zero-tax attachment and field removal.

A synthetic source graph with AGI $304,800, regular income tax $63,849, PAB AMT
$18,662 and NIIT $1,874 produced consistent Form 6251/8960 draft components.
All three pages were rendered with Poppler and visually inspected; PAB line 2g,
preferential AMT and NIIT deductions/tax are legible, draft markings remain,
and the outputs have no widgets or AcroForm tree. This is component QA, not a
complete filing bundle or IRS acceptance.

Schedule B printing subsequently passed four focused tests and a 480-test
current-2026/shared-investment regression run. Six synthetic QA pages were
rendered and visually inspected for payer completeness, adjustments, buyer
details, cents-to-whole-dollar totals and static draft output.

## Reviewed foreign accounts and Schedule B Part III

The October 16 increment accepts a complete 2026 foreign account/signature
inventory with actual filer TINs, relationship dates, institution/account identity,
country names, source document references and SHA-256 evidence. Each joint filer
needs a separate reviewed FBAR determination, including the spouse without any
accounts. These are retained specialist determinations with explanations and
reviewed values/exceptions, not an implemented FBAR threshold calculator or
proof that an FBAR was filed. An account relationship must overlap 2026; a
signature-only relationship can trigger Schedule B even without taxable income.

An account's income must either be reviewed as not reportable by that subject
or bind to the actual owner's issued 1099 source copies and account number.
Bindings add no amounts: the shared INT/DIV arithmetic remains the sole income
route, and duplicate/missing/wrong-owner source references fail. Standalone
foreign bank statements still need a native source contract; no fake 1099 is
created for an account-only disclosure.

The shared Schedule B calculator now has a paper entry point that accepts names
without implying validation against the 2025 native MeF country codes. Its
existing native entry point still requires those codes. A reviewed foreign
account triggers attachment below the income thresholds, including zero-income
accounts. The 2026 draft PDF fills line 7a's two independent answers, leaves
line 7b blank when FBAR is not required, and prints all countries in the two
available lines or a complete continuation statement. Bundle selection includes
this account-only attachment. Line 8 remains explicitly No; foreign trusts and
Form 8938 return binding remain separate unfinished work.

Authority: [2026 draft Schedule B instructions, August 10, Part III](https://www.irs.gov/pub/irs-dft/i1040sb--dft.pdf).
The instructions distinguish line 7a's account question from the FBAR filing
question and permit a line 7b country continuation. FBAR is filed separately;
this increment neither files it nor establishes compliance with Form 8938.

Validation covers source/owner/date/hash rejection, no-income and issued-copy
bindings, joint/MFS reviews, preservation of the 2025 country-code contract,
unchanged 1040/AGI/NIIT/tax, draft-bundle selection, rendered checkbox interiors,
country overflow, and static PDF structure.
