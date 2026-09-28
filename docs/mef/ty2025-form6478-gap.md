# TY2025 Form 6478 source and filing boundary

Status: the invalid production-gallons route is blocked in the Form 6478 input
node. Negative cases are written but unrun. No MeF, PDF, XSD, IRS business-rule
or ATS validation is claimed.

The
[IRS TY2025 update](https://www.irs.gov/forms-pubs/completing-form-6478-for-tax-years-beginning-after-2024)
says the second-generation biofuel production credit expired on December 31,
2024. Form 6478 lines 1 and 2 cannot be used for a tax year beginning after
2024. Line 3 can still receive a 2025 allocation from a fiscal-year pass-through
entity. The earlier local `f6478` node computed a fresh credit from gallons and
hardcoded fuel rates, then sent it directly to Schedule 3. That did not match
the TY2025 form or its source rule. All nonempty `fuel_entries` now reject,
including zero-gallon and overridden-rate entries; an empty source makes no
claim. There is no compatibility credit or inferred pass-through allocation.

The [Form 6478 instructions](https://www.irs.gov/instructions/i6478) say an
individual whose only source is a pass-through allocation reports it directly on
Form 3800 Part III line 4c and does not file Form 6478. The 2025 K-1 sources
identify the allocation as
[partnership Form 1065 box 15 code I](https://www.irs.gov/instructions/i1065sk1),
[S corporation Form 1120-S box 13 code I](https://www.irs.gov/instructions/i1120ssk),
or
[estate/trust Form 1041 box 13 code H](https://www.irs.gov/instructions/i1041sk1).
Form 6478 instructions also name Form 1099-PATR box 12 or another allocation
notice. These are source-specific credits, not an arbitrary amount entered into
Schedule 3 or the legacy `f3800s.total_gbc` aggregate.

The current K-1 input schemas have neither these biofuel credit fields nor the
allocating entity's tax-year start/end dates. They therefore cannot establish
the exceptional fiscal-year allocation allowed in 2025. The Form 3800 source
input has no Form 6478/line 4c entry, and its source-backed total, limitation,
MeF Part III, Part V, and Schedule 3 join cannot include one. The MeF Form 3800
tag map recognizes line 4c, but a tag alone is not a source or a filed route.
The `f6478` input is strict so a caller-provided unmodeled
`line3_pass_through_credit` is rejected instead of silently stripped. This does
**not** make the K-1 or generic Form 3800 inputs a supported biofuel route.

To open the native route, each K-1/1099-PATR allocation must carry its exact
source document and code/box, source EIN and document reference, entity tax-year
dates, allocated amount, and passive-activity classification. Form 3800 must
then preserve each source through line 4c, apply Form 8582-CR where required,
handle multiple entities in Part V, apply the Part II tax-use limit, and join
the allowed amount to Schedule 3 line 6a. The
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800) require
the allocating EIN and a Part V source breakdown for multiple pass-through
entities. Build positive and negative source-level cases, including an
ineligible calendar-year allocation, duplicate documents, passive credit,
multiple sources, and tax limitation, before claiming this path supported. Keep
it open; do not treat Form 6478 as an approved whole-root exclusion.
