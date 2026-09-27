# TY2026 public MeF inventory crosswalk

The [crosswalk](mef-public-crosswalk.csv) joins all 84 TY2025 Form 1040 MeF
serializer modules in [`mef-coverage.csv`](mef-coverage.csv) to the IRS
September 24, 2026 [accepted-forms](corpus/mef/accepted-forms.xlsx) and
[forms/attachments](corpus/mef/forms-attachments.xlsx) workbooks. Workbook
row numbers are one-based Excel row numbers. `form_1040_max` is the published
**1040 column** value, including the literal `unbounded` where printed.
`attachment_workbook_rows` lists every exact XML-document-name occurrence
in the forms/attachments workbook; an occurrence can be under a different
parent or dependency route and must be checked in context before coding.
The runtime `ALL_MEF_FORMS` array contains **85 descriptors**;
[`mef-descriptor-coverage.csv`](mef-descriptor-coverage.csv) records their
order, symbols, pending keys and source modules. The extra descriptor is
in `foreign_employer_wages.ts`, which emits both `FECRecord` and
`WagesNotShownSchedule`.
Four of these descriptors also generate PDF `BinaryAttachment` documents.
Their conditions, reference links and TY2026 disposition are in the
[binary attachment handoff](MEF-BINARY-ATTACHMENTS.md); caller-supplied PDFs
are a separate input to the bundle.

The 84 module rows split into 74 entries matched to an accepted-form row and
10 statement/dependency serializers that have no one-to-one accepted-form
label. Of the 74 matched entries, 66 have an exact XML-document-name row;
one is the Form 1040 return root; seven have no exact attachment row. The
seven are `f1099r`, `f7206`, `f7217`, `f8862`, `f8911_schedule_a`, `f8990`,
and `schedule_a`. The `f4835_at_risk` serializer is counted among the 66:
it emits another `IRS6198`, sharing the Form 6198 document with `f6198`.
It does not represent a separate Form 4835 attachment.

An accepted-form row establishes public inventory availability and a
published maximum, not that the TY2025 serializer matches TY2026 element
names, cardinality, attachment placement, or business rules. A missing
attachment row is a review item, not evidence that the form cannot be filed.
For each entry, inspect the selected TY2026 1040 XSD and business rules,
update the serializer and its owner graph, then run XSD validation and ATS
fixtures. The current package acquisition gate and known 1040 drift are in
[`MEF-V1-DRIFT.md`](MEF-V1-DRIFT.md).

The crosswalk intentionally covers the **existing TY2025 serializer surface**.
It cannot show TY2026 additions. The same accepted workbook separately lists
Form 1040 Schedule 1A (row 4), Schedule 3A (row 7), Form 1062 (row 30), and
Form 4562-B (row 62), none of which has a TY2025 serializer in the CSV.
Form 3903 (row 56) and Form 8938 (row 199) are also listed but have no
TY2025 serializer in this inventory. Form 172 (row 43) is likewise listed
without a TY2025 serializer; it has a distinct [NOL contract](FORM172-NOL-GRAPH.md)
and a public `IRS172` attachment row. Their graph/PDF/MeF work is tracked in
the [parity queue](PARITY-QUEUE.md) and their own contracts. Form 4852 and
U.S. RRB-1099/RRB-1099-R statements have no matching public rows; their
submission path still needs the current schema and filing guidance.

The ten statement/dependency modules need a separate pass against active
XSD dependency names and attachment rules. A form row for their parent does
not prove the statement shape. The foreign-employer module is **two** of
those documents: the public attachment workbook lists `FECRecord` at form
level (row 191) and `WagesNotShownSchedule` under line 1h (row 804).
The TY2025 builder derives both from Form 2555 filing details, which is too
narrow a source owner for foreign wages that do not claim an exclusion;
verify the TY2026 document requirements and preserve each employer/source
record independently of the §911 election. In particular, the `f1099r`
**form** row in
the accepted workbook says nothing about RRB-1099-R, whose U.S. source
statement is absent from this public inventory.
