# TY2025 entity-issued roots in a Form 1040 packet

Static, source-backed disposition of three `No` rows in the checked-in
[`ReturnData1040.xsd` root census](ty2025-xsd-document-root-census.md),
2026-09-28. This classifies the **individual's filed packet**, not whether the
underlying partnership, S corporation, estate, or trust has met its own filing
obligation. It does not approve a product exclusion, prove IRS MeF business-rule
acceptance, or close the wider K-1/source reconciliation audit.

| Root | IRS filing rule and 1040 disposition | Current source and exact open boundary |
| --- | --- | --- |
| `IRS1065ScheduleD` | [2025 Schedule D (Form 1065) instructions](https://www.irs.gov/instructions/i1065sd) place the capital-gain schedule on the **partnership's Form 1065**. The [2025 Form 1065 instructions](https://www.irs.gov/instructions/i1065) put it in the partnership's return assembly and carry partner shares to Schedule K-1 boxes 8 and 9a. For an individual who only receives a partnership K-1, that Schedule D is an **other-filer document**, not a personal Schedule D or a required copy in their 1040 packet. | `k1_partnership` is public source input. Its capital-gain boxes must still reconcile to the individual's Schedule D and any special-rate worksheets. No `IRS1065ScheduleD` serializer is registered. Proposed product boundary: accept the entity's schedule only as source evidence in this Form 1040 workflow. If the taxpayer is instead filing the partnership return, route it to a separate Form 1065 workflow. This is not permission to ignore a partner's capital-gain source or any individually required attachment. |
| `IRS8825` | [2025 Form 8825 instructions](https://www.irs.gov/instructions/i8825) state that **partnerships and S corporations** use it to report rental real estate income and expenses, with activity detail passed to owners on their Schedule K-1 statements. A K-1-only individual does not file the entity's Form 8825 as their own 1040 attachment. | `k1_partnership` and `k1_s_corp` are public inputs, and the individual's rental/passive results still require Schedule E/Form 8582 reconciliation. No personal `IRS8825` serializer exists. Proposed product boundary: retain the entity form and statement as source evidence, with entity filing in a separate workflow. A directly owned individual rental uses Schedule E, not Form 8825. Do not use this classification to treat K-1 rental loss as automatically deductible. |
| `IRS1041ScheduleK1` | [2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1) say to keep the trust/estate K-1 as source and **not file it with Form 1040**, **unless box 13 code B backup withholding is reported**. In that exception the beneficiary reports the withholding on Form 1040 line 25c and attaches a copy of the K-1. Thus this root is **source-only for ordinary beneficiary items but a required current-return attachment for code B**. | Public `k1_trust` carries income/credit/foreign-tax items but has no box 13 code B backup-withholding field or claim route, and no `IRS1041ScheduleK1` serializer is registered. A truthful fail-closed trigger requires typed source for the beneficiary's code B amount and K-1 identity: if code B is present/positive, stop both MeF and PDF export until line 25c is reconciled and the K-1 attachment is produced and validated. An arbitrary trust K-1, generic federal withholding amount, or the absence of a code B field cannot prove the exception is absent. |

The first two **other-filer** classifications are proposed scope decisions for
the Form 1040 product, not approved exclusions from the census. The trust K-1
exception remains an in-scope unsupported attachment path and must not be
silently dropped. The existing public inputs cannot activate its precise guard
today; intake needs the code B fact before the product can make that decision.

## Box 13 code B build feasibility

The [2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1)
explicitly require a copy of the K-1 when box 13 code B backup withholding is
reported, and send that amount to Form 1040 line 25c. The [issued two-page
2025 K-1](https://www.irs.gov/pub/irs-pdf/f1041sk1.pdf) also includes estate or
trust EIN/name, fiduciary identity/address, beneficiary identity/address,
tax-year and final/amended indicators, and all applicable boxes and statements.
The source copy, not just the withholding number, is the attachment.

The checked-in TY2025 v5.4 `ReturnData1040.xsd` accepts unbounded
`IRS1041ScheduleK1` documents. Its `IRS1041ScheduleK1.xsd` allows a
`BenefCrAndCreditRecaptureGrp` with code `B` and an amount, but also requires
`BeneficiaryDetail` with identifying number, name, and address. This establishes
an XML shape, **not** that the public `k1_trust` record is a complete copy of
the fiduciary-issued K-1. The existing source schema has no code B amount,
fiduciary identity/address, complete box-code ledger, issued-copy PDF, or
affirmation that other boxes/attached statements are absent. Its estate/trust
EIN is optional. Current Form 1040 `line25c_other_withheld` is a generic
accumulator, so a line 25c value alone cannot establish which trust K-1 must
be attached or prevent duplicate withholding.

**Decision:** no `IRS1041ScheduleK1` native serializer, PDF descriptor, line
25c deposit, or always-on trust-K-1 attachment guard is added from the partial
source. The exact next build slice needs an immutable issued-K-1 reference (or
full faithfully transcribed fields and statements), estate/trust and beneficiary
identities, box 13 code B amount, and a per-K-1 reconciliation to Form 1040
line 25c. Once intake identifies a positive code B claim, both exports must
fail closed until the native document and the issued-copy PDF/print packet are
present and the amount matches. Ordinary trust K-1 income remains source-only;
attaching every trust K-1 would contradict the beneficiary instructions.
