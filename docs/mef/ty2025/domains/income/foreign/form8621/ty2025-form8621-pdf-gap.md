# TY2025 Form 8621 printable-return gap

## Current verified parent packet checkpoint (October6)

The source-bound parent PDF is registered. [Current proof](../../../../../../../forms/f1040/2025/domains/income/foreign/form8621/form8621_parent_source_proof.md) records main36/0+56/0 and five fullXSD packets/38 reviewed pages byte-identical to reviewed originals. QEF ElectionB, accepted-record contract for section1294 status/interest and seven-election overflow, multiple MTM dispositions and line14c Form8949 are verified within the stated source contract. Synthetic issuer/ACK bytes do not authenticate external records. Broader QEF AGI-sensitive refigure and IRS acceptance remain open. Historical staged sections below are superseded only for these proved routes.


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
writer prints source-checked explanations for each positive PFIC event, adding
continuation pages when needed. Its positive foreign-currency fixture retains
the dated EUR/USD spot quote and source; changed computed interest and missing
filer identity are rejected. These fixtures are written but unrun. The
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

The staged section 1291 parent projection now takes the final filer identity and
address, recomputes page 1 line 5 from source-checked excess events for both
native and PDF fields, and produces a distinct Part V field set for each
positive distribution or disposition event. It includes the same rederived
holding-period explanation used by the native and printable statements. A
zero/nonexcess distribution is explicitly outside that bounded Part V path. Part
VI fields are empty only when the typed source declares that no prior section
1294 election is outstanding. Positive two-event and calculated-value-tamper
fixtures are written but unrun.

The staged packet projector now requires every holding to use the bounded
section 1291 route and reconciles source-derived line 16b income, line 16e tax,
and line 16f interest with Schedule 1, Form 1040 line 16's Form 8621 component,
and Schedule 2. It rejects changed return totals. Printable line 16a attachments
now make a separate statement page for each positive Part V event, with its own
holding period, year allocations, and spot quote when foreign currency applies.
The packet projector and parent form remain outside the registered PDF packet.

The staged section 1291 packet now requires a reviewed prior-distribution
record for every year used in each distribution block's Form 8621 line 15b
history, including a zero-distribution year. Typed records identify the source
event, holding year, currency, amount, document ID, and SHA-256. The packet
reconciles these values to the original event before projecting any parent
pages, rejecting omitted, duplicated, wrong-year, wrong-currency, changed
amount, and malformed-digest records. The
[2025 instructions for lines 15b–15c](https://www.irs.gov/instructions/i8621)
use the prior holding years to determine the 125% threshold. Positive and
tamper fixtures are authored but unrun. These records remain evidence
locators: neither their bytes nor the issuer's bytes are authenticated, and
the PDF descriptor remains unregistered. Prior election status, share value,
first PFIC year, and any foreign tax credit still need independent historical
proof before a positive printable route can open.

The issuer record is a locator and declared digest; the product does not yet
fetch or authenticate its bytes. The current source does not prove historical
section 1294 status, QEF Annual Information Statement amounts, marketability and
adjusted basis for section 1296, or prior distribution and tax records for
section 1291. The parent PDF descriptor remains unregistered and its export gate
stays active. Before positive PDF export, bind and verify the source document
bytes and historical records, reconcile the conditional pages and statements,
and verify the completed filing against the final return.

**Decision for this build slice:** the staged projection covers only source
records under section 1291 with positive Part V events or no events. It does not
authenticate the underlying issuer/prior-year records and does not print a
complete return packet. QEF and MTM need their distinct income, basis, and
election evidence before either has a positive parent PDF route. Absence of
current income does not by itself establish that an annual Form 8621 is not
required.

## October 4 focused verification

The current [IRS December 2025 Form 8621](https://www.irs.gov/pub/irs-pdf/f8621.pdf)
was fetched into the private source cache as a four-page XFA/AcroForm PDF
(SHA-256 `9c063d71a970eff604d9c3f05449422f86fbe29d99407282a87d94fc6c10a2d0`).
The staged page-1 widget names and locations for shareholder identity,
corporation identity, share descriptions/count/value, line 5, and election
boxes were compared with its AcroForm annotations. This is a field-position
check, not a filled-page visual review.

`deno test --allow-read --allow-write --allow-run=xmllint` over
`f8621_parent_source.test.ts`, `f8621_excess_statement.test.ts`,
`f8621.fx.test.ts`, and `f8621.xsd.test.ts` passed **11/11** with no ignored
tests. It exercises the staged parent projection, distinct Part V events and
statements, source tamper checks, foreign-currency amounts, and one local
TY2025v5.4 XSD case. These checks do not authenticate the referenced issuer,
historical election, prior-distribution, value, or tax records and do not
establish a printable registered parent packet. The parent parity gap stays
open; a current-worktree full suite is running separately.

Both final exporters now separately replay QEF, mark-to-market, and section
1291 Schedule 1 income from retained holding inputs before return assembly.
The three regime examples and no-source export guards passed with 79 nearby
tests on October 4. This guards the line 8z join; the parent PDF, issuer
authentication, historical records, and ATS gates above remain open.

The staged section 1291 parent projection now omits a zero-excess distribution
from Part V pages and their line 16a statements while retaining all original
source events for the return reconciliation. A mixed holding with a nonexcess
distribution followed by an excess distribution prints only the latter Part V
and preserves its source event number in the statement. The Form 8621 local
PDF/MeF/XSD group passed 12 tests on October 4. The XSD fixture also now
supplies the source-replayed Schedule 1 line 8z amount required by the final
export guard. The parent form remains unregistered pending authenticated issuer
and historical evidence and a complete printable-return review.
