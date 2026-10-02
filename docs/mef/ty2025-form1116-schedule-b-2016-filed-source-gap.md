# TY2025 Form 1116 Schedule B: 2016 filed-source identity

The existing passive-category 2016 vintage calculation already uses the
ninth-preceding-year column on the 2025 Schedule B, oldest first, and carries
its remaining amount to the following year. A structured filed 2024 Form 1040
and Schedule B reference now supports that calculation at full-return native and
PDF export. The 2024 Schedule B's **eighth-preceding-year** line 8 amount must
equal the retained 2016 vintage; its line 8 total, passive category, taxpayer
SSN, and two distinct filed document IDs must also reconcile to the 2025 intake
and embedded attachment. Both IDs must appear in the retained source references.
Existing 2015 checks apply independently when that vintage is also present.

The
[2025 Form 1116 line 10 instructions](https://www.irs.gov/instructions/i1116)
allow a 10-year foreign-tax carryforward and require Schedule B for a prior-year
carryover. The
[Schedule B instructions](https://www.irs.gov/instructions/i1116sb) direct use
of the earliest eligible vintage; the 2024 eighth-preceding amount becomes the
2025 ninth-preceding amount. The new positive fixture covers the 2016 source
through Form 1116, Schedule 3, Form 1040, native Form 1116 and Schedule B, and
both PDFs. Changed filed amount, owner, document identity, and missing filed
source are rejection fixtures for the deferred bulk gate.

The source references are reviewed transcriptions, not authenticated filed
return bytes. The
[other supported vintages](ty2025-form1116-schedule-b-all-vintages-filed-source-gap.md)
now use the same structured join. Carrybacks, foreign-tax redeterminations,
mixed categories, and pre-2018 general-category allocations remain guarded. XSD,
filled-PDF appearance, full tests, and IRS acceptance are pending the shared
bulk validation pass.
