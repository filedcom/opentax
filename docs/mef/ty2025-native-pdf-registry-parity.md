# TY2025 Form 1040 native/PDF registry parity audit

Static comparison replayed 2026-10-05 of the descriptors actually registered in
`forms/f1040/2025/mef/forms/index.ts` and `forms/f1040/2025/pdf/forms/index.ts`,
checked against `forms/f1040/2025/attachment-coverage.ts`. This is a
printable-return coverage audit, not an IRS rule, passed test, or new product
exclusion. The indexes currently hold **151 native descriptors and 117 PDF
descriptors**. The newly registered Form 9000 has focused local XML/XSD and filled-page
evidence; that does not establish the remaining route, business-rule, or ATS
coverage.

The three native additions since the preceding census are Schedule A
supporting statements for line 6 other deductible taxes, line 8b
seller-financed interest recipient identity, and line 16 federal estate tax.
They are native statement roots linked from Schedule A, not three additional
parent taxpayer forms. Their reviewed source rows print through the registered
Schedule A PDF and its continuation where applicable; the wider filled-packet
review remains open.

The current registered-key comparison includes the source-reconciled `form8621` parent PDF, with five fullXSD packets/38 reviewed pages and main36/0+56/0. Its wider source, QEF refigure and IRS boundaries remain open. Most other native-only keys are supporting statements or
issuer records. Form 8911 Schedule A uses the `f8911` pending slot on the
native side and its own `f8911_schedule_a` pending key on the PDF side; this
key difference does not imply a missing attachment. The native builder
allocates document IDs for every discovered instance, then rejects references
to IDs absent from the final document set. The PDF builder expands descriptor
instances and retains the declared source pages per instance. These structural
checks do not verify that every conditional native attachment is printable;
that still needs a source-by-source packet review.

Prepared PDF rendering and A2A transmission packaging now replay the same
`BinaryAttachment` filename, description, and order against the retained PDF
inventory. The packaging check closes a post-preparation gap where a changed
description could survive unchanged source/XML/PDF digests and ZIP-byte checks.
One focused archive regression passes for a valid prepared attachment and
rejects its changed retained description; the full-batch and per-route
printable review remain open.

Canonical PDF revision audit: registered Forms 8881 and 8864 now use the
immutable [IRS 2025 Form 8881](https://www.irs.gov/pub/irs-prior/f8881--2025.pdf)
and [IRS 2025 Form 8864](https://www.irs.gov/pub/irs-prior/f8864--2025.pdf)
archives. Both are one-page fillable revisions; their mapped field paths were
compared with the archived AcroForm fields. Forms 8844, 8882, and 8994 use
the applicable current IRS PDFs because the IRS lists their latest form
revisions as [March 2020](https://www.irs.gov/pub/irs-pdf/f8844.pdf),
[December 2017](https://www.irs.gov/pub/irs-pdf/f8882.pdf), and
[January 2021](https://www.irs.gov/pub/irs-pdf/f8994.pdf), respectively. The
second page of Form 8882 contains instructions, so its descriptor retains only
page 1. The other four audited PDFs each contain one page. The
registry URL check now expects these exact current URLs and checks all mapped
`extraPdfFields` against the official AcroForm, in addition to primary fields.

Form 2106 now has one bounded registered native/PDF pair for a sourced
taxpayer fee-basis state/local official job. Other Form 2106 shapes remain
blocked by attachment coverage; its source and tamper fixtures passed in the full regression at `a268f60c`.

## October 5 inventory and regression replay

At code `a268f60c` (unchanged by the subsequent board compaction), live imports
contain 149 native and 116 PDF descriptors. The source-only review planner
reports 187 fixtures, 113 unique registered PDF keys, 85 expected keys, and 28
uncovered keys. The additional fixture is the MFS mortgage case. These figures
describe inventory, not support or inspected pages.

Commands: `deno run --allow-read scripts/plan-ty2025-pdf-review.ts` and a
`deno eval` import of `ALL_MEF_FORMS`. The full regression log
`/tmp/opentax-deno-task-test-a268f60c.log` records the native/PDF suites for
Forms 5471 and companions, 8992, 8611, 965-A, 8911, 8978, 982, and 8582-CR,
among others; its final result is 11,233 passed, zero failed or ignored. The
[validation batch](ty2025-form1040-validation-batch.md) retains its digest and
scope. Historical “unrun” statements below have been updated; authentication,
full positive-route, visual, business-rule and ATS limitations continue to
apply.

## Priority 1: native taxpayer forms with no PDF descriptor

These registered native routes can emit an in-scope taxpayer form but have no
corresponding registered PDF descriptor. The PDF preflight now stops the active
native-only forms listed below instead of silently omitting them from a
printable packet. That stop is a temporary safety boundary, not a completed PDF
path or evidence that the native XML is invalid. Form 8826 now has a bounded
interpreter-expense and Schedule C reduction route; wider sources remain open.

| Native pending key      | Native root(s)              | Current PDF gap / decision                                                                                                                                 |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form8621`              | `IRS8621`                   | Registered source-bound PFIC parent PDF with ElectionB/PartVI continuation/MTM/14c and checked supporting statements; main36/0+56/0, five packets/38 reviewed pages; broader parent remains open.                                             |

Native-only supporting statements, payer-issued documents (`w2`, `f1099r`,
`w2g`, K-1), and `f4835_at_risk` (which shares the `IRS6198` root with a
registered Form 6198 PDF) are not automatically missing taxpayer-form PDFs. They
require their own packet/attachment decision; they are not included in the
priority-1 count. The table is an exact list of the _parent taxpayer-form_
parity gaps found in this comparison, not every difference between pending-key
lists.

The registered Form 8826 PDF covers one sourced self-earned nonpassive
interpreter-service claim, alone or combined with one nonpassive S-corporation
K-1 box 13 code K credit on lines 7/8. Pass-through-only credits remain on
Form 3800 without a recipient Form 8826. Other mixed, passive, and
controlled-group variants remain open in the [Form 8826 PDF gap](ty2025-form8826-pdf-gap.md).

The later W-2G route now has a registered recipient Copy B PDF descriptor and
an inspected five-page synthetic packet. It reproduces reviewed source facts;
the issued-copy bytes and any required signature remain separate evidence
gates. This does not change the parent taxpayer-form priority-1 list.

Form8611 has verified Single and MFJ spouse section42(j)(5) issued partnership K1 codeF recapture through source replay, native XML and one-page-per-building PDF. Main97/0 checks and held replay of two full-XSD packets/all12 reviewed pages pass; see [issued K1 review](ty2025-form8611-issued-k1-review.md). Own-credit history, unused-credit, bond and wider issuer branches remain guarded pending evidence. External issuer-byte authenticity and IRS acceptance are unproven.

Form 965-A now has a registered PDF projection for one original installment
liability, its eight historical payments, and the current Schedule 2 line 20
amount. Positive printable export stays closed until prior filed liability and
payment records are independently verified; transfers and adjustments remain
open. Its source/native/PDF fixtures ran in the passing full regression at `a268f60c`; historical filings remain unauthenticated.

Form 4255 now has a registered five-page PDF descriptor for one
excessive-payment-only Part I row on line 1d and/or 2a. Its native/PDF
reconciliation reaches Schedule 2 line 16, but both exports remain closed
until the prior-return and IRS determination bytes are authenticated. Other
recapture classes and Parts II/III remain open.

Annual Form 8854 now has a guarded five-page PDF projection for a former-citizen
no-event carryforward of up to seven prior deferred properties. Prior Form 8854
bytes and acceptance remain unauthenticated, so positive print stays closed.
Initial filing and annual dispositions/distributions remain open beyond the
bounded projections.

Initial Form 8854 now has a guarded five-page PDF projection for one noncovered
former citizen with cash-only assets and five reviewed prior-return tax amounts.
Prior filing, compliance, and cash valuation evidence remain unauthenticated,
so positive print stays closed. Covered and noncash variants remain open.

Form 3468's bounded trust-owned Part V route now has both registered
descriptors. Form 8992, its Schedule A, and Form 5471 page 1/A/B/C/F/G/I plus
separate Schedules E/E-1, H, I-1, J, M, P, Q and R also have native and PDF descriptors for
one wholly owned Category 5a CFC. Their source/return checks and fixtures ran in the passing full regression at `a268f60c`. The Schedule H route requires explicit zero book-to-tax
adjustments and general-category E&P only; Schedule J has a bounded reviewed
opening E&P/PTEP history; Schedule P has the sole shareholder's functional
PTEP and U.S.-dollar basis. Schedule R has a reviewed empty distribution
ledger and a header-only projection; its all-zero instruction/business-rule
status remains unverified. Schedule Q has reviewed general-category sales and
tested income groups, with native/PDF fixtures included in the passing full regression. The parent now
includes Category 4, Schedule A, B Part I, and GAAP Schedules C/F. Schedule M has
reviewed $11,000 related-party inventory sale proceeds, $1,000 cost of goods
sold on C, and a two-page PDF exercised by the full regression. Applicable conditional attachments and
Schedule R business-rule treatment remain, so the
attachment-coverage and Schedule 1 export guards continue to reject positive
filing. Registry parity for these documents does not imply a complete
foreign corporation filing packet.

Form 3800 was on the initial parity list. Its nine-page parent descriptor now
uses the native prepared parts; one- and two-facility geothermal returns and a
mixed wind/geothermal return have local XSD and filled-PDF evidence. Transfer,
passive, carryover, and other mixed credit-source routes remain coverage gates.
See `ty2025-form3800-pdf-gap.md`.
Form 8911 and Schedule A were on the initial parity list. They now have
registered, bounded PDF descriptors for one personal-use charger. Their fields
and cross-return checks ran in the passing full regression, and broader business or
multi-property situations remain unsupported. See `ty2025-form8911-pdf-gap.md`.
Form 8835 now has a bounded three-page PDF per fully used wind or geothermal
facility; one- and two-facility packets have local rendered evidence. Transfer,
bonus, passive, other energy sources, and broader multi-facility combinations
remain open. See `ty2025-form8835-pdf-gap.md`. The supported packets include
the registered Form 3800 parent PDF. Form 8874 now has a
bounded PDF with a six-column investment continuation statement and a
reconciled pass-through line 2; one, two, six, seven, and 24 nonpassive
investments now have reviewed filled Form 8874 and Form 3800 parent packets.
The seven- and 24-investment packets use the IRS-required last-row attachment
total; the latter has two continuation pages.
One schema-valid long CDE name/address also prints in full on a wrapped
statement page with a reconciled $500 parent credit.
See `ty2025-form8874-pdf-gap.md`. A
pass-through-only K-1 recipient does not create its own Form 8874, but still
needs the Form 3800 parent in the print packet.

Form 8582-CR now has a bounded two-page descriptor for one current-year
passive New Markets credit from self-earned Form 8874, a credit-only
partnership K-1 box 15 code AD, or a credit-only S corporation K-1 box 13
code AD, plus one separately sourced Schedule E
rental income activity with an ordinary-tax line 6 worksheet. Other native-only
source, category, carryover, and tax-method branches reject PDF export; the
precise list is in `ty2025-form8582cr-pdf-gap.md`. Source/native/PDF fixtures ran in the passing full regression; broader positive export remains open.

## Priority 2: conditional roots with no complete trigger-to-attachment route

`IRS8886` has no public reportable-transaction source, native descriptor, PDF
descriptor, or matching positive-source export guard. Its absence is not a
legitimate no-file decision: determine the disclosure trigger, per-transaction
facts and separate OTSA copy workflow before claiming coverage. Other positive
public inputs such as `f8938`, `f8833`, `f8801` and direct employer-credit forms
are already explicitly blocked by `attachment-coverage.ts`; their lack of
native/PDF documents is known fail-closed work, not a silent omission when
populated.

Keep no-file conditions separate from implementation gaps: a pass-through-only
Form 8826 or Form 8874 credit uses the recipient's Form 3800 route rather than a
self-created issuer form, and eligible unadjusted broker totals may go directly
to Schedule D instead of Form 8949. A zero current-year credit or deduction by
itself must not be used to dismiss a carryforward or other filing requirement.
These distinctions do not waive Form 3800 or another required parent attachment.

The older seventh conditional-root tranche is stale for three PDF-presence
claims: current registries include parent/Schedule A Form 8978 PDFs, a bounded
Form 982 QPRI PDF, and a bounded one-business Form 8995 PDF. Form 8911 and its
Schedule A also gained bounded PDF descriptors after this audit began. Their tests ran in the passing full regression; this does not establish full-form or visual coverage. Complete parity
review should compare each accepted native positive variant with its required
printed parent, schedules, statements, and source attachments, then join the
agreed full test/XSD/filled-PDF/business-rule/ATS gates.

## Both-holder Medicare statement parity (2026-10-06)

The registry replay now counts 150 native and 116 PDF descriptors. The added
`form8853MedicareStatements` emits the actual taxpayer/spouse Medicare MSA
statement roots after numbered forms and before Form 8854 supporting roots.
The existing `f8853` PDF descriptor produces the controlling form followed by
the two owner/SSN statement Form 8853 copies. No separate PDF key is needed;
this supporting descriptor shares the existing `form8853` source slot. Local
joint packet evidence and broader limits are recorded in the
[Form 8853 gap](ty2025-form8853-gap.md). Historical October 5 counts above remain
historical execution snapshots.

## October 6 Form8941 owned packet review

The existing Form8941 descriptor now has public owned SHOP/payroll full/partial/zero tax-use packets, full local2025v5.4XSD proof and all67pages visually reviewed. The held fixture `single-shop-health-premium-credit` covers `f8941`; no descriptor was added (150native/116PDF). The source planner now reports199fixtures,113unique registered PDF keys,91expected keys and22uncovered keys. See [the precise route, deduction rule and limits](ty2025-form8941-gap.md). Broader employer health credit and acceptance claims remain open.

## October 6 Form8941 part-year packet review

The additional held fixture `single-shop-part-year-enrollment` retains annual owned payroll and dated enrollment/invoice/payment months. Full/partial/zero tax-use packets have complete local2025v5.4XSD proof and all67 additional pages reviewed. Descriptors remain150 native/116 PDF. The actual planner at this base reports208 fixtures,113 unique registered PDF keys,92 expected keys and21 uncovered keys. See [the sourced month/rounding rule and precise limits](ty2025-form8941-gap.md). No family/common-control or authentication/acceptance branch is opened by this evidence.

## October 6 Form8941 family packet review

`single-shop-mixed-family-tiers` retains employee/dependent ownership and dated monthly composite-tier invoices/payments. Five actual family/mixed full-year/part-year packets have complete local TY2025 v5.4 XSD proof and all 113 additional pages reviewed. Descriptors remain 150 native/116 PDF. The planner reports 212 fixtures, 113 unique registered PDF keys, 92 expected keys and 21 uncovered keys. [The gap record](ty2025-form8941-gap.md) bounds this to one uniform-percentage composite plan with unchanged spouse/child membership; other family arrangements, common control, subsidies and acceptance remain open.

## October 6 Form8941 qualifying-arrangement packet review

`single-shop-list-computed-family-floor` adds monthly qualifying policy and insurer reference quote ownership to the existing descriptor. Composite different-tier percentages and equal/higher dollar exceptions, list uniform percentages, list computed employee contributions, employee-specific family floors and computed family contributions have actual public packet proof. Original full-year/part-year employee-only and family source profiles remain compatible. The source planner reports218 fixtures,150 native/116 PDF descriptors,113 unique registered PDF keys,92 expected keys and21 uncovered keys. See [the gap record](ty2025-form8941-gap.md#october-6-sourced-qualifying-arrangements) and retained PROOF.md for executed counts, complete localXSD and all-page evidence. One-QHP/Albany/unchanged spouse-child membership and no common-control/subsidy bounds remain; authentication and acceptance remain open.

The focused compatibility suite passed **47/47**; the final packet-order and held-scope gate passed **15/15** after the ordering repair. All **10 new full local TY2025 v5.4 XSD packets and all 242 final PDF pages** were retained and visually reviewed (seven 25-page full-use packets, 23-page partial-use, 21-page zero-use and 23-page part-year). Actual export negatives reject 33 prepared-source mutations and 27 public-source conflicts in both native and PDF exports. Final PDF hashes match the reviewed manifest; every packet is flattened. The relevant PDF registry order is now attachment 55 → 65 → 71 → 72.

## October 6 Form8941 multiple-QHP eligibility packet review

`single-shop-multiple-qhp-reference-eligibility` extends the existing Form8941 held source coverage to independent and reference QHP methods, changing monthly plan eligibility, plan switches and wholly unenrolled eligible workers. Original one-plan source profiles remain compatible. Annual payroll and enrolled counts reconcile separately; full determined credit reduces premiums before SE/QBI/1040. No descriptor is added. See [the source rules and precise scope](ty2025-form8941-gap.md#october-6-multiple-qhps-and-monthly-eligibility) and retained PROOF.md for final executed and all-page evidence. Common control, subsidies, excluded workers, source authentication and IRS acceptance remain open.


Final focused verification passed **55/55** with type checking, including all 47 previous one-QHP cases. Six new actual public/native packets validate against the complete local TY2025 v5.4 XSD; all **143 final PDF pages** (24/25/25/25/23/21) were rendered and visually inspected across 36 sheets. Final PDF hashes match the reviewed manifest and all six packets are flattened. Actual negative proof rejects **38 public-source conflicts and 46 prepared/native/PDF mutations**. The isolated planner reports 222 fixtures, 150 native/116 PDF descriptors, 113 unique PDF keys, 93 expected keys and 20 uncovered keys, including already integrated base coverage. The full/partial/zero list-reference determined credit is 9731 in every case, with current use 9731/5297/0 and the full 9731 premium reduction before SE/QBI. These are synthetic local source/filing proofs; broader branches and authentication/acceptance remain open.

## October 6 current registry and planner reconciliation

At code `2899d051b`, live imports contain **150 native descriptors (146 unique pending keys)** and **116 PDF descriptors (113 unique keys)**. Exact source-only planner: **365 fixtures, 96 expected keys, 17 uncovered keys**. Commands: `deno run --allow-read scripts/plan-ty2025-pdf-review.ts` and live `ALL_MEF_FORMS`/`ALL_PDF_FORMS` imports. Planner evidence `/tmp/opentax-pdf-planner-2899.json`, SHA-256 `95d99e58c4c2ed8e1895a9c1e1d0fc941dffdc4340a5e55452e549687d34e6ad`; key comparison `/tmp/opentax-registry-parity-2899.json`, SHA-256 `5f7b509b6b5d2f4bf101d902fdb6b9fb9934d72f4558ff9e6aea781bd73356d4`.

Uncovered keys: `f4255`, `f5471_parent`, `f5471_schedule_e`, `f5471_schedule_h`, `f5471_schedule_i1`, `f5471_schedule_j`, `f5471_schedule_m`, `f5471_schedule_p`, `f5471_schedule_q`, `f5471_schedule_r`, `f8854`, `f8854_annual`, `f965`, `form8582cr`, `form8990`, `form8992`, `form8992_schedule_a`. Key comparison still identifies `form8621` as a native parent without a matching PDF descriptor; statement/source keys require individual packet review. `f4835_at_risk` emits Form6198 using the existing PDF route, and native `f8911` has the separate PDF companion key `f8911_schedule_a`; key names alone are not absence/support decisions. These counts establish inventory only. Named-form parents are part of the current goal; none is deferred from execution or approved for exclusion.
