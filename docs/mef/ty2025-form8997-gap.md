# TY2025 Form 8997: staged annual ledger, filing still blocked

Status: fail-closed. The loose public Part I-IV arrays were directly replaced
with a strict investment-lot ledger. It captures an explicit prior-year Form
8997 closing ledger, current-year code-Z deferrals, inclusion/exception/transfer
events, original short/long character and code-Y row references, special gain
codes A-H, foreign/treaty and no-1099-B answers, and source/workpaper
references. It checks dates, unique IDs, opening continuity, event balance
rollforward, treaty/no-1099-B answers, and derives the four parts and totals.
Current-year Part II/III source still rejects at graph calculation rather than
altering tax without a completed Form 8949/4797 join. Holding-only source has
no tax output, and every populated `f8997` pending record is blocked at both
exports. Computed Form 8949 code-Z/Y rows also block both exports even when
no `f8997` source was supplied, so a QOF row cannot silently omit its annual
attachment. The duplicate legacy `form8997` input also rejects.

An unregistered [MeF projection](../../forms/f1040/2025/mef/forms/f8997.staged.ts)
and [PDF projection](../../forms/f1040/2025/pdf/forms/f8997.staged.ts) derive
from the same ledger after a staged
[executor-pending reconciliation](../../forms/f1040/nodes/inputs/f8997/reconciliation.ts).
That reconciliation requires each ordinary, single-character code-Z deferral
and code-Y sale ID to identify exactly one computed Form 8949 row and the same
Schedule D transaction. It verifies the original eligible-gain row, available
gain across investments, QOF EIN, dates, reporting box, adjustment sign,
proceeds/basis on sales, and arithmetic. It also rejects unlinked Z/Y rows.
It does not accept caller-supplied Form 8949 snapshots. Mixed-character sales,
non-sale inclusions, section 1231, and other special events remain outside
this bounded join. The MeF field order follows the local TY2025 v5.4
`Shared/IRS8997/IRS8997.xsd`; PDF fields and checkboxes were inspected
read-only in the official 2025 AcroForm. They are staging code only, not proof
of a valid filed return. Cases were written but not run pending the agreed
full batch. No PDF was filled or rendered.

## Remaining activation blockers

| Join | Current state | Needed for filing |
| --- | --- | --- |
| Prior-year continuity | Exact prior closing to 2025 opening match is required by lot ID, EIN, date and deferred character. Reorganizations can identify a former EIN. | Support and attach a reviewed explanation when opening differs from the filed prior year; verify that the referenced prior return and lot source documents exist and match. |
| Part IV uninvested deferred gain | The field is captured but a positive amount rejects because an identifiable IRS row treatment has not been established. | Resolve the official Part IV instruction for gain held during the year but not invested, with a source-backed EIN/date/description treatment. |
| Form 8949 and Schedule D | A staged narrow join verifies actual executor Z/Y and eligible-gain transactions, plus corresponding Schedule D rows; no tax output is emitted. Native/PDF Form 8949 code-Z blank-column projection is written but unrun. | Source-byte validation and final tax-line reconciliation remain. Mixed-character allocations and section 1231 Form 4797/code-O rows need separate source-backed joins. Verify code-Y sale rows and all Form 8949 output with XSD and filled-PDF review before activation. |
| Special events and elections | Codes F/G/H, exception citations, transfers, basis adjustment amounts, and a 10-year FMV election have typed source fields and ledger rollforward checks. | Verify regulation-specific eligibility, 5/7-year basis calculations, noninclusion-transfer ownership, 10-year sale gain and basis against source records. The local older v3 business-rule text lists A-G even though the 2025 form and v5.4 XSD allow H. Resolve final rule compatibility. |
| Annual filing and attachments | Staged MeF covers four groups/totals and answers. Staged PDF maps five rows per part on pages 1-2 and rejects additional rows. | Add native descriptors and any required prior-year explanation and labeled continuation sheets; validate complete row counts, document links, final filer identity, all three export layers and visual PDF output. |

The [official 2025 Form 8997 with instructions](https://www.irs.gov/pub/irs-prior/f8997--2025.pdf)
requires the annual statement even for a holding-only year. The [2025 Form
8949 instructions, "How To Report an Election To Defer Tax on Eligible Gain
Invested in a Qualified Opportunity Fund (QOF)"](https://www.irs.gov/pub/irs-prior/i8949--2025.pdf)
require a separate code-Z row with the QOF EIN, investment date, blank sale
date/proceeds/basis, and a negative adjustment. Their "How To Report Gain
Previously Deferred" section uses code Y for inclusion; the section 1231
subsection additionally requires paired code-O rows. Neither
the old code-Q zero-basis sale nor the duplicate Form 2439 route is valid.

Do not register either staged descriptor or relax
`forms/f1040/2025/attachment-coverage.ts` until the source and return-wide
joins above are built, then run the full test batch, TY2025 XSD/business
rules, visual PDF checks, and ATS cases.
