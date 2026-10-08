# TY2025 Form 8815: source-to-return gap

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **21 passed/0 failed/0 ignored across4 named modules**; all9 matching runtime paths still equal that tested snapshot. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


Status: a bounded TY2025 Series EE exclusion route has current-source local
XSD and filled-PDF evidence. The old calculation and MeF tags described below
were the starting point and have been replaced. Wider source, IRS business-rule,
and ATS acceptance remain open.

## Current selected evidence (2026-10-04)

The checked-in `single-form8815-series-ee-bond-exclusion` fixture generated a
four-page Form 1040, Schedule B, and Form 8815 packet. Each page was visually
checked against source and native XML: $2,000 bond interest is excluded in full
against $15,000 qualified expenses and $12,000 proceeds, leaving $70,000
Form 1040 wages/AGI. The selected-scope checker passed exact source replay,
PDF/XML hashes, page origins, and local TY2025v5.4 XSD. The packet location
and manifest digest are in the
[validation batch](../../../../testing/ty2025-form1040-validation-batch.md). Issued bond/tuition
records, other phaseout and ownership cases, IRS rules, and ATS remain open.

## Evidence and current behavior

- The [2025 IRS Form 8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
  places gross qualified higher education expenses on line 2, nontaxable
  educational benefits on line 3, their difference on line 4, bond proceeds on
  line 5, current-year eligible interest on line 6, modified AGI on line 9, the
  phaseout threshold on line 10, and the final Schedule B exclusion on line 14.
  The form's instructions require the education beneficiary and institution on
  line 1 and explain the source records for qualifying bonds, expenses, and
  prior-year interest reporting.
- The [2025 IRS phaseout guidance](https://www.irs.gov/irb/2024-45_IRB)
  specifies $99,500 to $114,500 for single, head of household, and qualifying
  surviving spouse; $149,250 to $179,250 for married filing jointly. Married
  filing separately cannot claim the exclusion. The checked-in
  `nodes/config/2025.ts` instead has $96,800 to $111,800 and $145,200 to
  $175,200. The node also puts qualifying surviving spouse in the joint band.
- `nodes/intermediate/forms/form8815/index.ts` treats `qualified_expenses` as
  already reduced by tax-free assistance, so the gross line 2 and benefit line 3
  cannot be reconstructed. It substitutes interest for missing proceeds and zero
  for missing modified AGI. Either substitution can overstate line 14. Missing
  filing status enters the single band. The `modified_agi` comment labels it
  line 11, though the 2025 form places MAGI on line 9.
- `2025/mef/forms/f8815.ts` emits `SavingsBondInterestAmt`, `TotalProceedsAmt`,
  `QualifiedExpensesAmt`, and `ModifiedAGIAmt`; none is a child of `IRS8815` in
  the checked-in TY2025 v5.4 `IRS8815.xsd`. When any number is present it
  produces an invalid form document, and it does not emit the calculated
  line 14. The existing unit cases assert the old phaseout thresholds; they do
  not establish correct 2025 results.

## Native XML fields needed for a bounded rebuild

The checked-in `IRS8815.xsd` sequence includes the following. Line 4 is required
by the XSD, while the other listed amount elements are optional. A filing
implementation should emit the supported form lines and reconcile line 14 with
Schedule B line 3, not use the optional flags to hide missing source facts.

| Form line | Native TY2025 v5.4 element                                                                        |
| --------- | ------------------------------------------------------------------------------------------------- |
| 1         | `EligibleEducationInstnGrp` with `EligiblePersonNm`, and institution name/address when applicable |
| 2         | `ExclBondIntTotQlfyEducExpnsAmt`                                                                  |
| 3         | `ExclBondIntTotNonTxEducBnftAmt`                                                                  |
| 4         | `ExclBondIntTxblEducBenefitAmt`                                                                   |
| 5         | `ExclBondTotPYBondProcAmt`                                                                        |
| 6         | `ExclBondIntTotPYBondIntAmt`                                                                      |
| 7         | `ExclBondIntTxblExpnsBondProcRt`                                                                  |
| 8         | `ExclBondIntTentativeBondIntAmt`                                                                  |
| 9         | `ExclBondIntModifiedAGIAmt`                                                                       |
| 10        | `ExclBondIntFilingStatusLmtAmt`                                                                   |
| 11        | `ExclBondIntExcessAGIAmt`                                                                         |
| 12        | `ExclBondIntExcessAGIRt`                                                                          |
| 13        | `ExclBondIntOffsetAmt`                                                                            |
| 14        | `ExcludableSavingsBondIntAmt`                                                                     |

## Rebuild boundary

The source model needs distinct, reviewed gross expense and nontaxable-benefit
amounts; the person/institution details; confirmed qualifying bond issue,
ownership, and age facts; proceeds and eligible current-year interest with the
prior-year interest worksheet where needed; explicit filing status; and MAGI
derived from the Form 8815 line 9 worksheet. The node should calculate and
preserve the filed line values, including the 2025 phaseout, and send exactly
the same line 14 amount to Schedule B. The MeF builder should serialize those
computed values in native XSD order. Its PDF descriptor also needs the same
line-level mapping and a filled visual check.

The bounded path now requires reviewed Series EE/I ownership, issue-year, age,
and redemption-record facts; one to three domestic tuition/fees beneficiaries;
distinct gross expenses and nontaxable benefits; bond principal and previously
reported interest for line 6; and the completed line 9 worksheet components. It
computes lines 2-14, emits line 14 to Schedule B, and uses the v5.4 native MeF
names and the inspected 2025 PDF field names. Missing facts or ineligible claims
raise diagnostics rather than assuming zero proceeds or MAGI. The legacy
ambiguous input fields are rejected, without a compatibility shim.

Still unsupported: Coverdell/QTP contributions, foreign institution addresses,
more than three line 1 entries, the special royalty-interest computation, and
any case where the complete line 9 worksheet cannot be supplied from finalized
return lines. These are explicit bounds, not whole-form completion. The two
generated MAGI business-rule implications have been corrected to the official
2025 filing-status ceilings, with focused cases written but unrun. Full
cross-return MAGI reconciliation remains for the later validation pass.

Focused cases written for the agreed single batch: each 2025 phaseout boundary
for single, HOH, QSS, and MFJ; MFS ineligibility; gross expenses and nontaxable
benefits producing line 4; line 4 below/equal/above bond proceeds; prior-year
interest adjustment; missing source facts causing a diagnostic; native XSD
serialization; Schedule B line 3 equality; and filled PDF line and
beneficiary/institution checks. No such pass is recorded here.

The PDF instance path now also checks the final filer's status and Schedule B
line 2 interest and line 3 exclusion against its Form 8815 source and printed
line 14, matching the native MeF gate. Positive and mismatch cases are authored
but unrun.

### Final-return MAGI reconciliation slice

Native MeF and PDF now replay the line 9 worksheet against finalized Schedule B
lines 2-4, Form 1040 taxable interest, total income, adjustments, and AGI.
The bounded route also requires one reviewed 1099-INT source with box 3 equal
to the form's current-year line 6 bond interest, and no unrelated taxable
interest or payer adjustment on that source.
The worksheet's other income must equal Form 1040 total income less taxable
interest; its Schedule 1 adjustment amount must equal the filed adjustment
total less line 21 student-loan interest, which is omitted by the Form 8815
worksheet. The gross-to-taxable interest difference must equal the calculated
line 14 exclusion. Positive foreign/adoption/Puerto Rico addbacks and filed
Form 2555/4563/8839 are rejected until their underlying sources can be
reconciled. A W-2 and 1099-INT full-return fixture plus native/PDF tamper
cases are authored but unrun pending the agreed bulk validation. Bond and
tuition document authentication beyond retained references, multiple interest
payers, any Form 8815 line 9 special royalty
computation, and the remaining bounded routes are still open.

## Multiple interest payer source reconciliation (2026-10-06)

The public Form8815 source may now declare distinct `bond_interest_source_references` identifying the eligible redeemed-bond1099-INT copies. Each reference must match exactly one current source; selected copies must have positive Box3 and no Box1. Their combined current interest must equal the independent line6 proceeds/face-value/prior-interest worksheet. All current1099-INT rows on this route require reviewed source references and taxpayer/spouse recipient identity; unselected bank or noneligible Treasury interest stays in ScheduleB line2 and Form1040 taxable interest. The complete source total must reconcile the finalized line9 MAGI worksheet. Missing/duplicate/unmatched references, conflicting owners/amounts and unsupported premium/nominee/accrual/OID adjustments remain rejected. The original one-copy path remains supported.

Two constructed complete public packets (single/MFJ) retain four distinct interest sources: eligible EE1200/I800, bank300 and noneligible Treasury500. Net education expenses6000/proceeds12000 gives tentative1000, MAGI102800/162800 and2025 exclusions780/548. Form1040 taxable interest2020/2252 andAGI102020/162252 reconcile to nativeXML/fullv5.4XSD and four-page packets. Main standard source/node/validation/existing-route gate21/0(8s), `/tmp/opentax-form8815-multiple-main-source-v2-oct6.log`; all eight pages rendered and visually reviewed with readable names, status, source rows, decimal ratios, amounts and order. Evidence `.state/research/form8815-multiple-interest-oct6/{single,joint}` retains original inputs/pending/native/PDF/origins/manifests; these are constructed source scenarios, not independently authenticated issuer or tuition records.

The actual October4 original rawsource still produces its exact four-pagePDF, `/tmp/opentax-form8815-held-original-main-v2-oct6.log` and matching manifest. Its sole prior-production pending difference is the added Form8995 `investment_interest_sources` array, checked exactly against the original1099-INT input; this is explicitly qualified rather than claiming whole-pending byte equality. Original bytes remain unchanged and replay uses a copied private template cache. Broader interest adjustments, royalty/addbacks, tuition/redemption authenticity, qualified institution/beneficiary evidence and IRS filing/acceptance gates remain open. Primary form line5 includes all qualifying redeemed bonds, line6 its interest, and line9 includes complete interest before exclusion: [2025 IRS Form8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf).
