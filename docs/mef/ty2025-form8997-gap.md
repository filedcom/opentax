# TY2025 Form 8997: staged annual ledger, filing still blocked

Status: fail-closed. The loose public Part I-IV arrays were directly replaced
with a strict investment-lot ledger. It captures an explicit prior-year Form
8997 closing ledger, current-year code-Z deferrals, inclusion/exception/transfer
events, original short/long character and code-Y row references, special gain
codes A-H, foreign/treaty and no-1099-B answers, and source/workpaper
references. It checks dates, unique IDs, opening continuity, event balance
rollforward, treaty/no-1099-B answers, and derives the four parts and totals.
Current-year Part II/III source still rejects at graph calculation rather than
altering tax without a completed Form 8949/4797 join. Holding-only source has no
tax output, and every populated `f8997` pending record is blocked at both
exports. Computed Form 8949 code-Z/Y rows also block both exports even when no
`f8997` source was supplied, so a QOF row cannot silently omit its annual
attachment. The duplicate legacy `form8997` input also rejects.

An unregistered
[MeF projection](../../forms/f1040/2025/mef/forms/f8997.staged.ts) and
[PDF projection](../../forms/f1040/2025/pdf/forms/f8997.staged.ts) derive from
the same ledger after a staged
[executor-pending reconciliation](../../forms/f1040/nodes/inputs/f8997/reconciliation.ts).
That reconciliation requires each ordinary, single-character code-Z deferral and
code-Y sale ID to identify exactly one computed Form 8949 row and the same
Schedule D transaction. It verifies the original eligible-gain row, available
gain across investments, QOF EIN, dates, reporting box, adjustment sign,
proceeds/basis on sales, and arithmetic. It also rejects unlinked Z/Y rows. It
does not accept caller-supplied Form 8949 snapshots. Mixed-character sales,
non-sale inclusions, section 1231, and other special events remain outside this
bounded join. The MeF field order follows the local TY2025 v5.4
`Shared/IRS8997/IRS8997.xsd`; PDF fields and checkboxes were inspected read-only
in the official 2025 AcroForm. They are staging code only, not proof of a valid
filed return. Cases were written but not run pending the agreed full batch. No
PDF was filled or rendered.

A separate staged
[one-lot holding-only source review](../../forms/f1040/nodes/inputs/f8997/holding_only_source.ts)
now requires distinct, exact SHA-256-bound copies of the reviewed 2024 Form 8997
PDF and 2025 QOF issuer statement. It matches the reviewed lot ID, QOF EIN,
acquisition date, description, short/long deferred gain, filed-form reference,
and annual workpaper to the unchanged opening and closing ledger. Current-year
additions, sales, inclusion events, EIN changes and multiple funds reject.
Positive and tampered-source cases are written for the deferred test batch. A
digest and parsed PDF structure bind the review to bytes: the prior Form 8997
copy must have at least two pages and the issuer statement at least one. This
rejects forged PDF headers and incomplete prior form copies, but cannot
authenticate IRS filing, issuer origin, or the printed PDF fields. The verifier
is not connected to the public exporters, which remain guarded.

## Remaining activation blockers

| Join                             | Current state                                                                                                                                                                                                             | Needed for filing                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prior-year continuity            | Exact prior closing to 2025 opening match is required by lot ID, EIN, date and deferred character. Reorganizations can identify a former EIN.                                                                             | Support and attach a reviewed explanation when opening differs from the filed prior year; verify that the referenced prior return and lot source documents exist and match.                                                                                                                 |
| Part IV uninvested deferred gain | The field is captured but a positive amount rejects because an identifiable IRS row treatment has not been established.                                                                                                   | Resolve the official Part IV instruction for gain held during the year but not invested, with a source-backed EIN/date/description treatment.                                                                                                                                               |
| Form 8949 and Schedule D         | A staged narrow join verifies actual executor Z/Y and eligible-gain transactions, plus corresponding Schedule D rows; no tax output is emitted. Native/PDF Form 8949 code-Z blank-column projection is written but unrun. | Source-byte validation and final tax-line reconciliation remain. Mixed-character allocations and section 1231 Form 4797/code-O rows need separate source-backed joins. Verify code-Y sale rows and all Form 8949 output with XSD and filled-PDF review before activation.                   |
| Special events and elections     | Codes F/G/H, exception citations, transfers, basis adjustment amounts, and a 10-year FMV election have typed source fields and ledger rollforward checks.                                                                 | Verify regulation-specific eligibility, 5/7-year basis calculations, noninclusion-transfer ownership, 10-year sale gain and basis against source records. The local older v3 business-rule text lists A-G even though the 2025 form and v5.4 XSD allow H. Resolve final rule compatibility. |
| Annual filing and attachments    | Staged MeF covers four groups/totals and answers. Staged PDF maps five rows per part on pages 1-2 and rejects additional rows.                                                                                            | Add native descriptors and any required prior-year explanation and labeled continuation sheets; validate complete row counts, document links, final filer identity, all three export layers and visual PDF output.                                                                          |

The
[official 2025 Form 8997 with instructions](https://www.irs.gov/pub/irs-prior/f8997--2025.pdf)
requires the annual statement even for a holding-only year. The
[2025 Form
8949 instructions, "How To Report an Election To Defer Tax on Eligible Gain
Invested in a Qualified Opportunity Fund (QOF)"](https://www.irs.gov/pub/irs-prior/i8949--2025.pdf)
require a separate code-Z row with the QOF EIN, investment date, blank sale
date/proceeds/basis, and a negative adjustment. Their "How To Report Gain
Previously Deferred" section uses code Y for inclusion; the section 1231
subsection additionally requires paired code-O rows. Neither the old code-Q
zero-basis sale nor the duplicate Form 2439 route is valid.

Do not register either staged descriptor or relax
`forms/f1040/2025/attachment-coverage.ts` until the source and return-wide joins
above are built, then run the full test batch, TY2025 XSD/business rules, visual
PDF checks, and ATS cases.

## October 7: actual public-graph holding-only staged artifact

An actual `f1040_2025.executeReturn` calculation now supplies the pending data
for a one-lot holding-only staged projection. The synthetic opening and closing
lot both retain QOF EIN123456789, acquisition April15,2021, description “Five
percent QOF interest” and **50,000 long-term deferred gain**. There are no current
additions, sales, special codes or uninvested balances. These references are
explicitly labeled synthetic/unverified; no accepted prior return or issuer
origin is established.

The actual registered `single-w2-refund` source/filer supplies the surrounding
return: wages75,000, withholding11,000, standard deduction15,750, taxable
income59,250, tax7,955 and refund3,045. All Form1040 pending fields are exactly
unchanged by the holding-only source. The staged descriptor's actual field
projection and common `fillFormPdf` helper produce a flattened form; its
pageIndices0/1 yield **two real filled pages**, both rendered and visually
reviewed. PartI/IV lots and totals match the source and staged XML. PartsII/III
and the disposition checkbox are blank; foreign No is checked and the skipped
waiver question is blank, consistent with the [official2025 form](https://www.irs.gov/pub/irs-prior/f8997--2025.pdf).

The actual standalone `IRS8997` element, with required namespace/documentId,
passes `xmllint` against the locally cached TY2025v5.4 IRS8997 XSD and its
includes, exit0. This is **not** a full Return1040 XSD or business-rule result.
Both real full MeF and PDF exporters still reject with the annual-document
guard. No descriptor was registered and no source/authentication guard was
relaxed; activation prerequisites above remain open. Historical “no PDF filled
or rendered” wording is superseded only for this staged holding artifact.

Private artifacts are under
`.state/research/board-execution-2026-10-07/form8997-holding-artifact-v2-20261007/`:
source/pending/filer/projected values, XML, two-page PDF, both rendered images,
raw filled four-page template before declared page selection, canonical cached
IRS template and independent audit. PDFSHA256
`64ccee6917fbdfc17a22a3276d4915987c9b3c57cadcbd667071262c4be2544f`;
XMLSHA256 `83d0cffa8b6067407f77a78f3cd10733803d90d6655f3492b991cfd88624af21`;
templateSHA256 `97589000d39b67737c516763bc4b89a167a3c18b47163517e98490144f4f5a4b`.
All2,590 runtime hashes still match the green full-run manifest. First attempts
failed for missing umask permission and an incorrect assumption that the fill
helper itself selects form pages; v2 preserves the four-page intermediate and
applies the staged descriptor's declared selection. This is an artifact-review
prerequisite, **not a new positive filing packet**; passing aggregate75/267/2,706,
main52 and future31 remain unchanged. No new future task implemented or main
checkoff, complete Form8997 support, authentic prior history, IRSBR or ATS
acceptance is claimed.

## October 7: current deferral/inclusion staged artifact from actual graph rows

The existing staged test source was replayed through the actual public graph
alongside `single-w2-refund`. Original asserted calculated row values were
removed from its input array; the executor itself derives and deposits all
three Form8949 and ScheduleD transactions. They match exactly: eligible stock
sale30,000−10,000=20,000 short gain; separate QOF codeZ −20,000 short deferral;
QOF codeY sale20,000−10,000+10,000 inclusion=20,000 long gain. Conditional
ScheduleD totals are short0/long20,000; Form1040 carries capitalgain20,000,
AGI95,000, taxable79,250, tax10,955 and refund45. The public Form8997 node
still emits its expected blocking diagnostic. These are **conditional synthetic
source values, not verified issuer, prior filing, basis history or election
eligibility**; no broad legal/source approval follows from matching arithmetic.

The actual staged descriptor produces two flattened pages, both rendered and
visually inspected: PartI old-lot long50,000; PartII new-lot short20,000;
PartIII old-lot inclusion long10,000; PartIV old-lot long40,000 and new-lot
short20,000. Each date, EIN, description and total matches the staged XML.
ForeignNo is checked, waiver boxes skipped, no1099B disposition checked.
StandaloneIRS8997 validates against cached TY2025v5.4 XSD/includes, exit0;
this is not complete Return1040 validation or business-rule approval.

Actual full MeF export rejects QOF codeZ/Y without the registered annual
attachment. Actual full PDF export rejects the fixture's unadjusted PartA
eligible-sale row as also being a ScheduleD direct sale, **before** the QOF
attachment guard. This newly exposed fixture issue is recorded in
`product_board.md`'s separate future_todo and remains unworked; neither source
rows nor production guards were changed to make the replay pass. A standalone
staged projection does not substitute for the missing complete filing route.

Private artifact root
`.state/research/board-execution-2026-10-07/form8997-current-events-artifact-v4-20261007/`
retains actual inputs/filer/pending/projection, graph diagnostics, distinct full
export errors, XML/PDF/template, both viewed images, four-page intermediate and
independent audit. PDFSHA256
`2ebbbb77bff21121e42cd57b31b32bcb2498e4e7e08d49383342e67058149111`;
XMLSHA256 `d056d556acc17c0092dd8464a3da954cb28ade6e58cb89b87f320461d38ec49f`;
auditSHA256 `aa18dd1642ccd41c7655748769fb880c4c93a91c779c9059fcf23aa74f2600f2`.
Earlier private attempts incorrectly asserted the distribution field and then
the holding-only/same native-and-PDF guard; v4 uses the actual ScheduleD
capital-gain field and records the different real guards. Previous scripts and
intermediates remain retained. All2,590 runtime hashes unchanged. No production
change or redundant suite rerun; no descriptor registration, positive full
packet/pass aggregate increase or main checkoff. Main52/future32; current
passing aggregate75/267/2,706 unchanged. Form8997 activation prerequisites and
IRS/source gates remain open.
