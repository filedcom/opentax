# TY2025 Form 1040 native/PDF registry parity audit

Static comparison updated 2026-10-01 of the descriptors actually registered in
`forms/f1040/2025/mef/forms/index.ts` and `forms/f1040/2025/pdf/forms/index.ts`,
checked against `forms/f1040/2025/attachment-coverage.ts`. This is a
printable-return coverage audit, not an IRS rule, passed test, or new product
exclusion. The indexes currently hold **138 native descriptors and 107 PDF
descriptors**. No test, XSD, filled PDF, or ATS run was performed for this
inventory update.

## Priority 1: native taxpayer forms with no PDF descriptor

These registered native routes can emit an in-scope taxpayer form but have no
corresponding registered PDF descriptor. The PDF preflight now stops the active
native-only forms listed below instead of silently omitting them from a
printable packet. That stop is a temporary safety boundary, not a completed PDF
path or evidence that the native XML is invalid. Form 8826 now has a bounded
interpreter-expense and Schedule C reduction route; wider sources remain open.

| Native pending key      | Native root(s)              | Current PDF gap / decision                                                                                                                                 |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form8621`              | `IRS8621`                   | No PFIC parent Form 8621 PDF; a bounded Part V supporting statement can now print from checked source events.                                             |
| `f8854`                 | `IRS8854` initial           | No initial Form 8854 PDF descriptor. Its native statements do not substitute for the parent printed form.                                                   |

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

Form 8611 now has a registered, bounded one-page-per-building PDF descriptor
that reconciles native recapture totals with Schedule 2 line 16. Positive
printable export stays closed until the historical Forms 8586/8609/8609-A/8611
or issuer K-1 credit and interest records can be verified. Its authored
source/native/PDF fixtures await the implementation-first bulk gate.

Form 965-A now has a registered PDF projection for one original installment
liability, its eight historical payments, and the current Schedule 2 line 20
amount. Positive printable export stays closed until prior filed liability and
payment records are independently verified; transfers and adjustments remain
open. Its source/native/PDF fixtures await the bulk gate.

Form 4255 now has a registered five-page PDF descriptor for one
excessive-payment-only Part I row on line 1d and/or 2a. Its native/PDF
reconciliation reaches Schedule 2 line 16, but both exports remain closed
until the prior-return and IRS determination bytes are authenticated. Other
recapture classes and Parts II/III remain open.

Annual Form 8854 now has a guarded five-page PDF projection for a former-citizen
no-event carryforward of up to seven prior deferred properties. Prior Form 8854
bytes and acceptance remain unauthenticated, so positive print stays closed.
The initial variant and annual dispositions/distributions remain open.

Form 3468's bounded trust-owned Part V route now has both registered
descriptors. Form 8992, its Schedule A, and Form 5471 page 1/A/B/C/F/G/I plus
separate Schedules E/E-1, H, I-1, J, M, P, Q and R also have native and PDF descriptors for
one wholly owned Category 5a CFC. Their source/return checks and fixtures are
written but unrun. The Schedule H route requires explicit zero book-to-tax
adjustments and general-category E&P only; Schedule J has a bounded reviewed
opening E&P/PTEP history; Schedule P has the sole shareholder's functional
PTEP and U.S.-dollar basis. Schedule R has a reviewed empty distribution
ledger and a header-only projection; its all-zero instruction/business-rule
status remains unverified. Schedule Q has reviewed general-category sales and
tested income groups, with authored native/PDF fixtures unrun. The parent now
includes Category 4, Schedule A, B Part I, and GAAP Schedules C/F. Schedule M has
reviewed $11,000 related-party inventory sale proceeds, $1,000 cost of goods
sold on C, and a two-page PDF, unrun. Applicable conditional attachments and
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
and cross-return checks are written but unrun, and broader business or
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
precise list is in `ty2025-form8582cr-pdf-gap.md`. Full-return fixtures are
authored but unrun.

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
Schedule A also gained bounded PDF descriptors after this audit began. These
remain unrun and do not establish full-form or visual coverage. Complete parity
review should compare each accepted native positive variant with its required
printed parent, schedules, statements, and source attachments, then join the
agreed full test/XSD/filled-PDF/business-rule/ATS gates.
