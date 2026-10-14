# TY2025 submission batch isolation — October10

The existing assembly and finalized-graph tasks require return XML, generated
attachments, submission manifests and A2A containers to stay associated with the
correct filer. This checkpoint verifies three complete public-entry Form5695
returns with distinct synthetic taxpayers and4/5/6 door QMIDs. Each produces
`AdditionalQMIDStatement.pdf`; the identical filename is valid inside separate
submission ZIPs and must not cause cross-return substitution.

The new checked-in `submission-batch-isolation.test.ts` exercises the public
graph, prepared bundle, generated attachment, submission archive and A2A
container. Both forward and reversed submission order preserve exact inner ZIP
bytes and request IDs. Each return retains its original XML, filer SSN and
statement bytes. Three distinct attachment digests are observed.

Eighteen alterations reject: for each return, replacing its archived statement,
XML, manifest, filer, prepared bundle or residency review with another return's
value. The focused test passes; the existing submission-archive and attachment
coverage modules pass40 additional tests. All41 checks pass without production
logic changes. The first synthetic fixture attempt used invalid QMID formatting;
correcting it to the existing letter-digit-letter-digit contract resolved that
test setup error.

Independent Python ZIP extraction verifies the two containers and exact archived
XML. `xmllint` validates all three full Return1040 documents and all three
submission manifests against the retained TY2025v5.4 schemas. These are structural
and archive checks, not independent tax calculations, visual PDF approval,
authenticated manufacturer evidence, signed-source validation or IRS acceptance.
The source fixtures, XML, manifests, statements and ZIPs are retained privately
in `.state/research/submission-batch-isolation-2026-10-10/`.

## Qualification: recomputed attachment digests

A separate deeper probe changes both the archived statement and the prepared
bundle's statement bytes to another return's generated PDF, then recomputes the
stored attachment digest. The original source, native XML and their digests
remain unchanged. All three altered batches are accepted locally. Their
same-name statement metadata still matches the XML, and the current source
projection does not regenerate and compare the generated statement contents.

This is deferred148 in the product board. The checked-in regression establishes
ordinary cross-return isolation only; it does not prove resistance to this
consistent alteration of bytes and digest. The private probe retains each
changed ZIP, original/replacement digest metadata and terminal outcome. No
repair is implemented and no submitted or accepted filing is claimed.

## Remaining assembly scope

The original task remains open for every other retained route, repeated owner
copies, signed Form8283/source-issued acknowledgments, required descriptions,
AcroForm failures, business rules and service/acceptance evidence. The existing
A2A evidence-ledger taxpayer lookup issue remains separately deferred. No prior
complete-return or reviewed-page totals are increased by this archive checkpoint.
