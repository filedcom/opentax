# TY2025 sparse-map forms: static filing audit

Status: source/XSD inspection on 2026-09-28. No test, XSD validation, filled-PDF
render, business-rule, or ATS run is claimed here. This is a disposition for the
six registered forms singled out in the [source-only and sparse-map crosswalk](ty2025-source-only-and-sparse-map-gap.md), not a declaration of full filing
support.

The locally available v5.4 IRS schema files are under
`.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/`.
The form files inspected are `IndividualIncomeTax/Common/IRS8880`,
`IndividualIncomeTax/Common/IRS8862`, `IndividualIncomeTax/Common/IRS8863`,
`Shared/IRS7217`, `CorporateIncomeTax/Common/IRS6198`, and
`CorporateIncomeTax/Common/IRS6252`. A required element inside an optional
group is required **when that group is emitted**. Static inspection found no
demonstrated unconditional required-element omission in these six serializers;
that does not establish that all emitted variants validate or satisfy IRS
business rules. An empty `FIELD_MAP` is not a missing serializer: five of the
six descriptors construct native XML directly from parsed source or calculated
lines.

**Disposition:** all six are registered with at least one bounded source-to-XML
route, but **zero of six are whole-form complete**. Form 8880's mapped print
lines are a bounded retirement-credit route, not proof of independently sourced
eligibility or tax capacity. Forms 6198, 7217, 6252, 8862, and 8863 build
native XML without a static field map, and each has the source and conditional
branches listed below. This classification is based on serializer, source,
and local XSD inspection only. No tests were run for this audit.

| Form | Current native and schema disposition | PDF disposition | Missing source or explicit boundary |
| --- | --- | --- | --- |
| 8880 | The nonempty `FIELD_MAP` emits calculated lines 1a–6b and 7–12 in the XSD's annotated order. The serializer requires the positive line 12, core print lines, spouse lines when applicable, a valid line 9 rate, and a credit no greater than lines 10/11. It rejects unsupported manual keys; reviewed zero-credit source emits no document. | Registered descriptor uses the same print lines plus filer identity. Filled output remains unreviewed. | The supplied tax-liability limit is not independently rebuilt from the finalized return; IRA, deferral, distribution, age, dependent and student evidence needs reconciliation. A positive credit without calculated lines/limit rejects. [Detailed gap](ty2025-form8880-gap.md). |
| 6198 | `FIELD_MAP` is empty because `f6198.ts` builds one simplified `IRS6198` per negative Schedule C line 32b or Schedule F line 36b activity. It writes activity, loss, basis, increases/decreases, amount at risk and deductible loss. The XSD has conditional choice branches for detailed basis dates/increases/decreases; the simplified source does not establish those branches. | The registered descriptor projects the same C/F source and prints lines 1, 5, 6–10b, 20 and 21 per activity. Focused cases are written; filled appearance is unreviewed. | Nonempty aggregate `form6198` source and missing simplified activity facts reject. Form 4835, Schedule E, pass-through activity, detailed basis, prior losses and downstream loss reconciliation remain open. [PDF gap](ty2025-form6198-pdf-gap.md). |
| 7217 | Direct XML includes the XSD's partner identity choice, distributing partnership identity/date, Part I basis and Part II property description and totals. Source validation requires a real 2025 date, one record per partnership/date, property basis/FMV, and equality of Part I line 10 with Part II basis total. | Registered December 2024 form maps identity, Part I and up to 30 Part II rows; a 31st row rejects PDF export. Filled appearance is unreviewed. | Gain and section 751(b) routes without linked downstream reporting reject; nonzero section 731(c) reduction rejects. K-1 identity/basis history, section 737 and continuation rows need work. [Crosswalk](ty2025-source-only-and-sparse-map-gap.md). |
| 6252 | Direct XML emits property, acquisition/sale dates, explicit unrelated-party and determinable-price answers, and calculated lines 5–26. The XSD's related-party address/ID choice is conditional on that unsupported path, not an omission on the unrelated-party route. The serializer checks Schedule D/Form 4797 destinations when pending data is available. | Registered 2025 descriptor uses the same filing validator, maps one PDF per sale and all Part I/II calculated lines. Widget positions were inspected; filled appearance is unreviewed. | Missing identity/dates/answers, unsourced recapture or depreciation, related-party sale, short-term business property and missing prior payment history reject. Interest, later-year and gain-character reconciliation remain open. [Crosswalk](ty2025-source-only-and-sparse-map-gap.md). |
| 8862 | Direct XML emits `TaxYr`, selected claim indicators and nested Part II–IV detail. The XSD requires child/dependent/student fields within emitted groups; `validateDetail` requires the relevant eligibility answers and detail before serialization. Conditional XSD variants still need a validation pass. | Registered three-page descriptor joins active claims to finalized EITC/CTC/AOTC credits and Form 8863 student names. More than four CTC children, four other dependents or three AOTC students reject until a statement route exists. Filled appearance is unreviewed. | Prior disallowance and ban facts are assertions rather than independently sourced IRS-notice facts. Unknown active-ban status blocks export; an active ban blocks MeF on the paper-only appeal route. [Crosswalk](ty2025-source-only-and-sparse-map-gap.md). |
| 8863 | Direct XML writes calculated Parts I/II and each student's Part III. The XSD requires the student group and its name, name control, SSN, prior-credit answer, institution name/address/1098-T answers, and AOTC or LLC expense branch when emitted; the serializer writes these from structured filing detail. It caps the native document at 25 students. | Registered descriptor prints one summary and a Part III page per student, with return and Schedule 3 reconciliation. It rejects foreign/overlong institution addresses, more than two institutions per student, and ambiguous prior-year 1098-T facts. Filled appearance is unreviewed. | Receipt of 1098-T or a valid exception, paid expenses, prior AOTC/disallowance/TIN facts and final tax capacity need source verification. The older [PDF gap](ty2025-form8863-pdf-gap.md) describes a pre-descriptor checkpoint and is superseded for descriptor presence by current code. |

Form 6252 now has an additional written, unrun source-to-XML case in
`forms/f1040/2025/mef/forms/f6252.test.ts`: two individually calculated
long-term sales emit two documents and must sum to the Schedule D source amount;
a one-dollar mismatch rejects. This tests the bounded multi-sale destination
guard, not payer evidence, gain character outside this route, XSD validity, or
the full return graph.

## Closeout evidence

Keep `GAP-MAP` open. For each accepted filing variant, validate generated XML
against the local v5.4 XSD and conditional branches, compare native amounts to
the finalized return, inspect actual filled 2025 PDF values/appearances, and
exercise the listed negative boundaries. Source eligibility and any required
statements must then be checked against IRS instructions and business rules;
ATS acknowledgment is a separate gate. The existing focused cases are written
evidence only until the deferred full batch is run.
