# TY2025 entity-issued roots in a Form 1040 packet

Static, source-backed disposition of three `No` rows in the checked-in
[`ReturnData1040.xsd` root census](./ty2025-xsd-document-root-census.md),
2026-09-28. This classifies the **individual's filed packet**, not whether the
underlying partnership, S corporation, estate, or trust has met its own filing
obligation. It does not approve a product exclusion, prove IRS MeF business-rule
acceptance, or close the wider K-1/source reconciliation audit.

| Root | IRS filing rule and 1040 disposition | Current source and exact open boundary |
| --- | --- | --- |
| `IRS1065ScheduleD` | [2025 Schedule D (Form 1065) instructions](https://www.irs.gov/instructions/i1065sd) place the capital-gain schedule on the **partnership's Form 1065**. The [2025 partner K-1 instructions](https://www.irs.gov/instructions/i1065sk1) send the individual's box 8/9a shares to personal Schedule D lines 5/12. For an individual who only receives a partnership K-1, the entity's Schedule D is an **other-filer document**, not a personal 1040 attachment. | `k1_partnership` boxes 8/9a deposit on the individual's Schedule D lines 5/12 and Form 1040 capital gain. The finalized native and PDF exporters now replay the issued K-1 capital totals, including ordinary partnership, S-corporation, trust, and reviewed partnership code S sources; omission or changed amounts fail at both final bundle entries. One source-to-graph-to-native/PDF/XSD case confirms the personal Schedule D attachment and absence of `IRS1065ScheduleD`. Proposed product boundary: retain the entity schedule only as source evidence here; a partnership filer needs a separate Form 1065 workflow. Source authenticity, recipient ownership for ordinary K-1 capital, special-rate components, and IRS business-rule acceptance are not established by this local replay. |
| `IRS8825` | [2025 Form 8825 instructions](https://www.irs.gov/instructions/i8825) state that **partnerships and S corporations** use it to report rental real estate income and expenses, with activity detail passed to owners on their Schedule K-1 statements. A K-1-only individual does not file the entity's Form 8825 as their own 1040 attachment. | `k1_partnership` and `k1_s_corp` are public inputs. The existing shared Schedule E Part II projection admits reviewed, identified positive box 2 rental income in both native and PDF; a source-to-graph-to-native/PDF/XSD test now confirms the individual attachment and absence of `IRS8825`. K-1 rental losses remain subject to basis, at-risk, and Form 8582 limits. No personal `IRS8825` serializer exists. Proposed product boundary: retain the entity form and statement as source evidence, with entity filing in a separate workflow. A directly owned individual rental uses Schedule E. Activity-statement completeness and loss-limit evidence remain open. |
| `IRS1041ScheduleK1` | [2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1) say to keep the trust/estate K-1 as source and **not file it with Form 1040**, **unless box 13 code B backup withholding is reported**. In that exception the beneficiary reports the withholding on Form 1040 line 25c and attaches a copy of the K-1. Thus this root is **source-only for ordinary beneficiary items but a required current-return attachment for code B**. | Public `k1_trust` retains a positive, cent-precision code B amount and both exporters block that source. An optional issued-copy review now ties a claimed PDF hash, estate EIN, beneficiary SSN, tax year, and amount to exact readable bytes and the current filer; it explicitly does **not** authenticate the PDF's printed contents. The graph does not deposit an unsupported line 25c claim. No `IRS1041ScheduleK1` serializer or issued-copy PDF route is registered; a generic line 25c amount cannot identify the trust K-1 that must be attached. |

The first two **other-filer** classifications are proposed scope decisions for
the Form 1040 product, not approved exclusions from the census. The trust K-1
exception remains an in-scope unsupported attachment path and must not be
silently dropped. The public code B fact activates the final-export guard.

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
the fiduciary-issued K-1. The source schema now retains the code B amount but
lacks complete fiduciary identity/address, box-code ledger, issued-copy PDF, or
affirmation that other boxes/attached statements are absent. Its estate/trust
EIN is optional. Current Form 1040 `line25c_other_withheld` is a generic
accumulator, so a line 25c value alone cannot establish which trust K-1 must
be attached or prevent duplicate withholding.

A reviewed code B row may now retain the claimed issued-copy PDF reference and
SHA-256, TY2025, estate EIN, beneficiary SSN, and exact code B amount. A
read-only preflight uses the shared `VerifiedSourceDocuments` byte verifier,
checks current-return ownership, distinct K-1 sources and readable PDF pages,
and reports `printedContentsVerified: false`. A blank but readable PDF can
pass this byte-integrity preflight if its hash and review metadata match; it
cannot establish the fiduciary's issuance, printed identity/box amount, other
K-1 boxes, or attached statements. No reviewed copy was supplied for a real
taxpayer in this task. The preflight therefore does not authorize a credit or
attachment, and both final exporters still reject the positive code B source
even when review metadata is present. Tests cover altered bytes, wrong
beneficiary, changed amount, and continued native/PDF export rejection.

**Decision:** no `IRS1041ScheduleK1` native serializer, PDF descriptor, line
25c deposit, or always-on trust-K-1 attachment rule is added from the partial
source. A positive typed code B claim now fails closed at both exports;
ordinary beneficiary K-1 items remain source-only. A focused graph case proves
the claim remains in pending while line 25c stays zero; native and PDF export
reject it, and an ordinary box 5 route passes local TY2025 XSD. The exact next
build slice needs an immutable issued-K-1 reference (or full faithfully
transcribed fields and statements), estate/trust and beneficiary
identities, box 13 code B amount, and a per-K-1 reconciliation to Form 1040
line 25c, with verified extraction or external fiduciary evidence of the
issued copy's printed facts. Both exports remain closed for positive code B
until the native document and the issued-copy PDF/print packet are present and
the amount matches. Ordinary trust K-1 income remains source-only;
attaching every trust K-1 would contradict the beneficiary instructions.


## October 7 isolated source-copy/native prerequisite

The isolated `codex/trust-k1-copy-20261007` branch now retains all74 canonical
fields and a read-only native projection of every scalar/coded amount,
indicator and structured beneficiary detail, checked against the actual
printed text fields and current owner. Focused29/0; four positive standalone
XSD shapes; three retained source-copy/XML artifact pairs and six viewed
pages. These are source projections, not a registered positive filing route.
The helper explicitly retains `filingReady:false`, `issuerVerified:false`
and `printedContentsVerified:false`; source/calculation joins, supplemental
statements, static-page/checkbox authenticity, line25c and prepared-copy packet
integration remain required. Both final exports remain guarded. See the
[execution record](../readiness/ty2025-readiness-execution-2026-10-07.md) for immutable
commit, artifact and test digests. The broader ownership/attachment task stays
open; no blanket entity-root exclusion is approved.


The subsequent isolated copy/source reconciliation compares all directly
modeled amounts and current codes, rejects printed unmodeled rows, and keeps
required statement references outstanding. Focused51/0; a retained public
ordinary-income graph case reconciles AGI644.56 while codeB125.25 remains
uncredited and both exports stay closed. Its standalone K1 XML and two viewed
source pages add source evidence, not filing approval. Four standalone
artifact pairs/eight viewed source pages are retained in total. Full graph
credit and prepared native/issued-copy packet integration remain open; see
the execution record for the exact revision and evidence digests.


The isolated follow-on calculation now routes entered codeB amounts into
line25c/payments/refund and replays all other-form withholding sources.
Focused111/0. The exact retained K1 source produces125.25 withholding/payments
and125 rounded refund; an individual Form1040 preview and standalone IRS1040
XSD were reviewed. Both full exporters remain guarded. This is unintegrated
calculation/preview evidence, not a prepared K1 filing packet or issuer proof;
the main runtime's earlier boundary remains unchanged during its live full
regression. See the execution record for commit and evidence digests.


The isolated checkbox verifier now verifies all six official positions/states
and original glyph/regenerated path normal appearances. Focused126/0; all
four unchanged retained source copies passed. This completes a printed-field
prerequisite; static page/overlay and issuer evidence, required statements
and prepared filing packet integration remain open. Full exporters are still
guarded; see the execution record for `f51fcdf8a` and immutable evidence.


The isolated source helper now also verifies the two canonical static pages,
resource trees and all74 field positions, rejecting overlays, added/duplicate
annotations, altered page resources/scripts and print controls. Focused140/0;
all four unchanged retained copies passed. Issuer authentication and required
statements/prepared filing packet integration remain unproved; exports remain
guarded. See `125a8e136` and evidence in the execution record.


The isolated immutable preparation step now binds reviewed copies/native
projections and exact retained PDF bytes to finalized source/filer/graph SHA256,
including top-level Form8949 rows. Focused147/0 and unchanged retained ordinary
source/native evidence passed. This is a preparation prerequisite, not a
registered complete packet; issuer/statement evidence and final export
integration remain open. The newly discovered backup-withholding statement
root is recorded future-only and unworked. See execution for commit/digests.


Fixed review-copy pages now project only verified normal appearances while
retaining original source bytes separately. Focused151/0; single checked/
unchecked and independent joint-owner copies were rendered/viewed with no
AcroForm collisions, and their standalone K1 XMLs passed XSD. These are source
reviews, not a registered full filing packet or issuer proof; full exports
remain guarded. See `496be0822` and the execution record.
