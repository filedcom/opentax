# TY2025 Form 7206 single-plan policy source checkpoint

## October 10 shared policy and payment reconciliation

Single-plan native and PDF export now require the same reviewed issuer policy
and twelve monthly premium/payment records as independent-owner plans, using
`issued_policy_record` and `issued_premium_records`. A shared
reconciler checks owner/payer, issuer, policy number, covered person, real 2025
payment dates, premium amounts and policy/payment references. Reused payment
references reject. Independent-owner plans retain their separate cross-plan
payment and business inventory checks.

Single-plan calculation can still stage the legacy reference-only input, but
export requires both structured record sets. If either is supplied during
calculation, missing or inconsistent companion records reject immediately.
The calculation formula, employer-eligibility exclusions and income limits are
unchanged. Taxpayer and spouse policy ownership remains tied to the actual
Schedule C and finalized filer. A covered spouse does not change who owns the
business or pays for the policy.

The record schema is shared without importing fixture helpers into production.
Existing synthetic baseline, spouse Medicare, tip-health, patron and section179
fixtures now explicitly supply consistent policy/payment records. A patron
fixture that changes the business owner also changes its synthetic policyholder
and payer. This is fixture preparation, not invented production evidence.
No insurer, bank, employer review or externally retained document was authenticated.

## Complete packet evidence and qualifications

The six original cases retain 72 monthly records. Each complete packet passes
local TY2025v5.4 Return1040 XSD and retains exact XML/manifest/submission archive
bytes. Twenty-four altered or missing XML/manifest package variants reject;
no package was transmitted. Local software, originator and citizenship-review
fields are explicitly synthetic.

| Case | Health deduction, raw | AGI, raw | QBI deduction | Total tax | Filed AGI check |
| --- | ---: | ---: | ---: | ---: | --- |
| single-variable | 3783 | 42684 | 5387 | 9410 | agrees |
| single-income-limited | 4646 | 0 | 0 | 707 | agrees |
| joint-spouse-owner | 2600 | 52046 | 409 | 2720 | agrees |
| joint-taxpayer-spouse-coverage | 5750 | 90717 | 8143 | 12717 | agrees |
| joint-changing-coverage | 5750 | 90717 | 8143 | 12717 | agrees |
| single-excluded-cents | 3252.50 | 43214.50 | 5493 | 9464 | fails by1; deferred104 |

Independent Python Decimal arithmetic reconstructs eligible premiums, separate
SE components, half-SE, income limitation, AGI, QBI and ordinary tax. It uses the
[2025 Form7206 instructions](https://www.irs.gov/pub/irs-prior/i7206--2025.pdf)
and [2025 Publication1040 tables](https://www.irs.gov/publications/p1040).
All six raw source calculations and final taxes agree. This does not make the
last case's filed whole-dollar arithmetic correct: native/PDF1040 show income
50000, adjustments6786 and AGI43215, while income minus adjustments is43214.
The original cents were preserved and the evidence appended to deferred104;
no rounding repair was implemented. Five cases reconcile the filed AGI check.

The seven new source tests pass, with14 public-source,108 native and108 freshly
rehashed full-PDF rejections. Mutations cover absent records, owners/payers,
issuer/policy, impossible dates, months, amounts, covered people, references,
filed health and Form1040 adjustments. The legacy no-record calculation remains
staging-only: deleting both record sets still rejects at native/PDF export.
The 21 existing calculator, single-route and spouse-Medicare tests pass too.
The related nine-module gate initially passed43 checks and failed two spouse
patron fixtures with stale policy ownership. Updating those synthetic records
produced a targeted four-test pass, verifying all45 related checks. Together
these gates verify73 unique tests across13 modules; the full suite was not rerun.

All 71 PDF pages were rendered at 1400px. Eleven contact sheets cover 43 unique
pages plus 28 exact pixel duplicates. Every Form7206 copy has the correct owner,
eligible premium, income limit and deduction. Existing Form8995 name68,
blank-zero76 and positive-ScheduleC at-risk86 qualifications repeat; the last
case additionally retains the visible/native derived-line rounding104 mismatch.
No deferred presentation fix was made. PDFs contain no AcroForm field tree or
widget annotations. No signature or IRS acceptance is claimed.

Private evidence: `.state/research/form7206-single-policy-2026-10-10/` contains
original probes, source/pending/XML/PDF, independent arithmetic, native line
comparison, archives, typed logs, renders and the qualified visual inventory.

## Remaining parent scope

External policy/payment authentication, dependent or child coverage, LTC,
multiple establishing businesses per owner, shareholder wages, optional-method
income, wider retirement/Marketplace/Form2555 ordering and IRS business-rule/ATS
acceptance remain open. The separately deferred single-primary fully excluded
health/QBI route remains unchanged. These checks do not close the Form7206 parent.
