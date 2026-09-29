# TY2025 Form 1040 native/PDF registry parity audit

Static comparison on 2026-09-28 of the descriptors actually registered in
`forms/f1040/2025/mef/forms/index.ts` and `forms/f1040/2025/pdf/forms/index.ts`,
checked against `forms/f1040/2025/attachment-coverage.ts`. This is a
printable-return coverage audit, not an IRS rule, passed test, or new product
exclusion. No test, XSD, filled PDF, or ATS run was performed.

## Priority 1: native taxpayer forms with no PDF descriptor

These registered native routes can emit an in-scope taxpayer form but have no
corresponding registered PDF descriptor. The PDF preflight now stops the active
native-only forms listed below instead of silently omitting them from a
printable packet. That stop is a temporary safety boundary, not a completed PDF
path or evidence that the native XML is invalid. The Form 8826 source audit
found expenditure-level evidence and no-double-benefit checks still missing.

| Native pending key      | Native root(s)              | Current PDF gap / decision                                                                                                                                 |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f965`                  | `IRS965A`                   | No Form 965-A PDF. Source includes prior-year liability/payment and transfer history that still needs independent review.                                  |
| `form8582cr`            | `IRS8582CR`                 | No passive-credit limitation PDF, including when its native document is linked to Form 3800.                                                               |
| `form8621`              | `IRS8621`                   | No PFIC Form 8621 PDF or Part V excess-distribution statement print route.                                                                                 |
| `f4255`                 | `IRS4255`                   | No investment-credit recapture PDF.                                                                                                                        |
| `f8611`                 | `IRS8611`                   | No low-income-housing-credit recapture PDF.                                                                                                                |
| `f8826`                 | `IRS8826`                   | No direct-claim disabled-access-credit PDF. Pass-through-only credits are a separate Form 3800 route and do **not** require the recipient's own Form 8826. |
| `f8854`, `f8854_annual` | `IRS8854` initial or annual | Neither filed variant has a Form 8854 PDF descriptor. The native initial/annual statements do not substitute for the parent printed form.                  |

Native-only supporting statements, payer-issued documents (`w2`, `f1099r`,
`w2g`, K-1), and `f4835_at_risk` (which shares the `IRS6198` root with a
registered Form 6198 PDF) are not automatically missing taxpayer-form PDFs. They
require their own packet/attachment decision; they are not included in the
priority-1 count. The table is an exact list of the _parent taxpayer-form_
parity gaps found in this comparison, not every difference between pending-key
lists.

Form 3800 was on the initial parity list. Its nine-page parent descriptor now
uses the native prepared parts; one- and two-facility geothermal returns have
local XSD and filled-PDF evidence. Transfer, passive, carryover, and mixed
credit-source routes remain coverage gates. See `ty2025-form3800-pdf-gap.md`.
Form 8911 and Schedule A were on the initial parity list. They now have
registered, bounded PDF descriptors for one personal-use charger. Their fields
and cross-return checks are written but unrun, and broader business or
multi-property situations remain unsupported. See `ty2025-form8911-pdf-gap.md`.
Form 8835 now has a bounded three-page PDF for one fully used geothermal
facility; transfer, bonus, passive, and multi-facility situations remain open.
See `ty2025-form8835-pdf-gap.md`. Its credit-bearing return still needs the Form
3800 parent PDF before the printable packet is complete. Form 8874 now has a
bounded PDF for up to six identified investments and a reconciled pass-through
line 2; wider rows still stop. See `ty2025-form8874-pdf-gap.md`. A
pass-through-only K-1 recipient does not create its own Form 8874, but still
needs the Form 3800 parent in the print packet.

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
