# TY2026 research handoff audit

Snapshot audit: 2026-09-27. This records whether the **research and coding
handoff** cover the current TY2025 Form 1040 architecture and identified
TY2026 additions. It is not a claim that `f1040:2026` is registered, that a
TY2026 return can be filed, or that IRS ATS has accepted an XML submission.

| Surface | Audit result | Coding entry point |
| --- | --- | --- |
| Source corpus | 256 manifest records: 250 downloaded files exist and match their recorded length and SHA-256; six draft URLs served the wrong tax year and are marked `wrong-year`. | [Manifest](corpus/manifest.json), [sources and gates](SOURCES.md) |
| TY2025 graph baseline | All 191 registry node types have a disposition and next action; 33 declared 2026 route gaps are inventoried. | [Node ledger](node-coverage.csv), [boundary audit](NODE-BOUNDARY-AUDIT.md), [route gaps](GRAPH-ROUTES.md) |
| TY2025 printable baseline | All 56 PDF descriptors have a 2026 snapshot classification; pinned form field inventories and specialist contracts cover the filed routes. | [PDF ledger](pdf-coverage.csv), [parity queue](PARITY-QUEUE.md) |
| TY2025 MeF baseline | All 84 serializer modules and 85 runtime descriptors are inventoried; the public 2026 accepted-form crosswalk classifies each module. Four generated PDF binary routes and the caller-supplied binary path have a separate handoff. | [Module ledger](mef-coverage.csv), [descriptor ledger](mef-descriptor-coverage.csv), [crosswalk](MEF-PUBLIC-CROSSWALK.md), [binary handoff](MEF-BINARY-ATTACHMENTS.md) |
| Form instructions | All 96 form/source rows name an instruction owner, publication status and next action. Drafts, combined booklets, embedded instructions and continuous-use forms are distinguished. | [Instruction ledger](instruction-coverage.csv), [availability notes](INSTRUCTION-COVERAGE.md) |
| New TY2026 surfaces | Schedule 1-A, Schedule 3-A, Form 1062, Form 4562-B and other identified additions have explicit routes or research gates outside the TY2025 inventories. | [Parity queue](PARITY-QUEUE.md), [form delta](FORM-DELTA.md), [implementation plan](IMPLEMENTATION.md) |
| Product assembly | Year-specific catalog, CLI summary, local/MeF validation, PDF selection, XML document order, binary references, submission ZIP and ATS acceptance steps are assigned. | [Product assembly](PRODUCT-ASSEMBLY.md), [2026 entry point](ENTRY-POINT.md) |
| Research navigation | The 110 Markdown files in this directory have no broken local links. | [Corpus index](README.md) |

The generated inventories were rebuilt from the current repository and
reported 56 PDF descriptors, 84 MeF modules, 85 MeF descriptors and 191
registry node types. The manifest hashes were checked against local bytes.
The CSV audit found no blank disposition/next action for nodes, no blank
snapshot for PDFs, no blank public status for MeF modules, and no blank owner,
status or next action for instruction rows.

## Evidence still needed for an accepted TY2026 filing build

1. Obtain the current restricted 1040 MeF XSD and business rules through the
   authorized IRS e-Services/SOR channel. The downloaded May v1 ZIP in the
   supplied Drive material is a baseline; it does not describe the September
   return topology. Pin the selected release/hash and diff it before coding
   XML, validation rules and binary references.
2. Refresh each draft or wrong-year IRS form/instruction when a final TY2026
   publication appears, especially the Form 1040 booklet, Schedule A
   instructions and Schedule A (Form 4136). Recheck source contracts against
   the final line and worksheet text.
3. Implement the [parity queue](PARITY-QUEUE.md), then prove complete cases
   through create/add/get/validate, rendered PDF, MeF XML, submission ZIP and
   the applicable [IRS ATS packets](ATS.md). Record acknowledgment/reject
   evidence. A complete corpus and local schema pass are preparation for
   those tests, not their result.

The research handoff is complete for the repository and public-source
snapshot above. Newly published IRS material requires a source refresh and
targeted plan update before its behavior is treated as final.
