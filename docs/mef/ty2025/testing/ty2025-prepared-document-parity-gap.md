# TY2025 prepared document identity parity

The native builder assigns each ReturnData document an ID from its XML tag
and zero-based document position. The prepared bundle manifest previously
checked document count, unique IDs, known references, and attachment count,
but did not replay that exact assignment. Two repeated supported W-2
documents could exchange IDs in prepared XML, have the XML digest recomputed,
and pass manifest validation. A PDF built from that prepared bundle would then
be paired with an XML document inventory whose copy IDs no longer matched the
builder's order.

The manifest now rejects any document whose ID differs from the builder's
tag-and-position rule. A focused return with Form 1040, two distinct W-2s,
and one PDF attachment verifies native IDs `IRS10400`, `IRSW21`, `IRSW22`,
and `BinaryAttachment3`. Its PDF builds from the unchanged bundle; a swapped
W-2 ID pair rejects at both manifest validation and prepared-PDF export, even
after the XML digest is updated.

The binary side also keeps attachment digests in document order. A prepared
bundle with two distinct PDF attachments could previously exchange both its
attachment array entries and XML BinaryAttachment bodies while retaining the
original digest map and recomputing the XML digest. All byte and description
checks passed, but the same BinaryAttachment IDs now named the opposite PDFs.
The manifest now requires the attachment array order to match the retained
digest key order. A focused two-PDF case builds the unchanged packet and
rejects the exchanged order at both manifest validation and PDF export.

This check binds document IDs to their prepared order. It does not prove
issued W-2 bytes, compare each PDF form page to every native document, or
authenticate a caller-supplied bundle. Those and wider repeated-owner forms,
full-suite tests, filled-page visual review, and IRS acceptance remain open.
