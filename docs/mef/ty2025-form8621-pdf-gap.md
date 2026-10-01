# TY2025 Form 8621 printable-return gap

Static source, native, and blank-PDF review on 2026-09-28, followed by a Part V
supporting-statement build slice. No parent Form 8621 PDF descriptor is
registered; no test, typecheck, XSD, filled-PDF render, business-rule, or ATS
run occurred in the later slice. The current
[IRS December 2025 four-page Form 8621](https://www.irs.gov/pub/irs-pdf/f8621.pdf)
and its [instructions](https://www.irs.gov/instructions/i8621) govern this
review.

`nodes/inputs/f8621/index.ts` accepts one record per identified PFIC and
computes QEF ordinary/capital amounts, section 1296 mark-to-market gain/loss,
and section 1291 excess events. It deposits `form8621.items` and amounts into
Schedule 1, Schedule B/D, Schedule 2, and tax calculation as applicable.
`mef/forms/f8621.ts` emits one `IRS8621` document per item and may link a native
holding-period statement. These are bounded native calculations, not a complete
source dossier for the printed return.

The blank PDF's page 1 requires shareholder identity/address/tax year, foreign
corporation name/address and tax year, Part I description of **each class of
shares**, shares and value, regime/inclusion amount, and separate Part II
election checkboxes. The public item has company name, EIN/reference, country,
aggregate shares/value and a `regime` enum, but no foreign corporation address
or tax year, share-class description, jointly-owned status, or acquisition date
when applicable. It also does not say whether a QEF or mark-to-market election
is being **made this year** versus continued from a prior year, and does not
bind the QEF income figures to a PFIC Annual Information Statement or MTM
marketability/basis evidence. A regime value cannot safely check a new-election
box. The native document's current header/Part I fields do not supply these
missing PDF facts.

Pages 2-4 add conditional obligations: QEF lines 6-7, MTM lines 10-14, a
separate Part V for each section 1291 excess distribution or disposition
(including the 2025 currency and USD line 15e(2)), and Part VI for
outstanding/terminated section 1294 deferral elections. The source has no Part
VI ledger or election status. Although `excessEvents` is calculated, multiple
events would need separate printed Part V pages and reconciled holding-period
statements. Printing one four-page copy per PFIC item would not cover those
cases.

The native holding-period statement now rederives every Part V event from its
original source before generating its explanation. A standalone PDF statement
writer prints that same source-checked explanation for each identified PFIC,
adding continuation pages when needed. Its positive foreign-currency fixture
retains the dated EUR/USD spot quote and source; changed computed interest and
missing filer identity are rejected. These fixtures are written but unrun. The
supporting page is a prerequisite for parent PDF parity and remains outside the
export packet while Form 8621 lacks material page-1 and election facts.

A later parent-source slice added `parent_source` per PFIC: foreign corporation
address and tax year, each share class with year-end shares/value, joint
ownership and 2025 acquisition answers, new-versus-continuing QEF/MTM election
status, an explicit no-outstanding-section-1294 answer, and a referenced issuer
record with a SHA-256 digest. The source projector refuses a share/value sum or
election status inconsistent with the calculation item. Native Form 8621 now
emits these page-1 facts when supplied, including only genuinely new election
boxes. A separate unregistered page-1 widget projection stages the same facts.
Its source/native/widget positive and changed-share/election/date fixtures are
written but unrun.

The issuer record is a locator and declared digest; the product does not yet
fetch or authenticate its bytes. The current source does not prove historical
section 1294 status, QEF Annual Information Statement amounts, marketability and
adjusted basis for section 1296, or prior distribution and tax records for
section 1291. Page 1 also needs the final filer identity/address and calculated
line 5 amounts, while Part V needs one separately printed page per excess event
and Part VI needs a proven ledger or absence. The parent PDF descriptor remains
unregistered and its export gate stays active. Before positive PDF export, bind
and verify the source document bytes, reconcile the conditional pages and
statements, then verify the completed filing against the final return.

**Decision for this build slice:** no positive PDF projection is reliable even
for one QEF or MTM item without inventing or leaving blank material page-1 facts
and potentially mislabeling a Part II election. Keep the print route open. To
unblock a narrow path, add typed foreign-corporation/address/year and
share-class records, dated acquisition/joint-ownership answers, explicit
current-versus-prior election status and supporting QEF/MTM evidence, then
reconcile each calculated line and required Part V/VI attachment to the native
document and finalized return before mapping widgets. Absence of current income
does not by itself establish that an annual Form 8621 is not required.
