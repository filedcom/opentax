# TY2025 Form 8621 printable-return gap

Static source, native, and blank-PDF review on 2026-09-28. No PDF descriptor or
test was added; no test, typecheck, XSD, filled-PDF render, business-rule, or
ATS run occurred. The current
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

**Decision for this build slice:** no positive PDF projection is reliable even
for one QEF or MTM item without inventing or leaving blank material page-1 facts
and potentially mislabeling a Part II election. Keep the print route open. To
unblock a narrow path, add typed foreign-corporation/address/year and
share-class records, dated acquisition/joint-ownership answers, explicit
current-versus-prior election status and supporting QEF/MTM evidence, then
reconcile each calculated line and required Part V/VI attachment to the native
document and finalized return before mapping widgets. Absence of current income
does not by itself establish that an annual Form 8621 is not required.
