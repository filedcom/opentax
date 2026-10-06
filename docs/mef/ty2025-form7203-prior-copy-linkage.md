# Form 7203 retained prior-form copy linkage

This advances the existing reduced-debt/prior-history prerequisite. It does not
open the prior reduced-note filing route.

## Source and calculation scope

The existing ten-document byte-bound executor reads the retained 2024 return,
submission manifest, acknowledgment and separate Form7203. It compares filer,
corporation and closing stock/debt balances, stages the reduced-note repayment
workpaper and Form8949/ScheduleD/1040 gain candidate, and leaves the actual graph,
native export and PDF route rejected. The IRS [Form7203 instructions](https://www.irs.gov/instructions/i7203)
require prior-year closing basis to carry into the next year, separate formal-note
tracking, and capital-gain treatment for repayment of a formal note. The complete
copy linkage here is an archive-consistency requirement; it does not authenticate
that filing or establish the note's source contents.

## Corrected retained-copy boundary

A separate Form7203 previously passed inspection whenever its closing balances
matched the embedded prior return. Other prior basis activity could differ. The
inspector now compares complete parsed form content, including debt groups,
nonclosing basis fields and attributes. Namespace declarations are excluded from
content comparison because the separate root declares its own namespace; all
nodes are separately checked against the supported unprefixed MeF namespace
profile. Foreign namespace rebinding and unsupported prefixed content fail.

Controls change a nonclosing opening-stock field while keeping closing balances
unchanged, rebind a debt indicator to a foreign namespace, and rebind an Accepted
acknowledgment element to a foreign namespace. Changed document digests are
recalculated, so these controls test content rather than ordinary hash mismatch.
The inspector explicitly returns `separateFormMatchesEmbeddedContent: true` only
after comparison and retains `issuerAuthenticated: false`.

## Verification and remaining work

Before-control evidence at unchanged2fef4f068 is retained in
`/tmp/opentax-7203-prior-history-before-control-oct6.log`: the changed separate
copy is accepted and the new rejection assertion fails0/1. This is the expected
before failure, not a regression pass. Final candidate runtime control (`deno test --no-check` with the retained
prior-reduced test filter) is terminal **1passed/0failed/8filtered**. It verifies
byte retention, candidate $200 gain, the three synchronized-content controls,
and continuing public/direct/native/PDF rejection. Log
`/tmp/opentax-7203-prior-history-runtime-oct6.log`. Typechecked focused and
ordinary two-module gates are still running and have no terminal claims.

Trusted acquisition of the actual submitted return and acknowledgment, exact
submission linkage, prior basis/election activity, signed loan and principal
records, holding-period/character proof, restoration, broader owners/debts and
final source-to-Form1040/native/PDF/XSD/IRS validation remain open. Neither
matching local XML nor caller-uploaded Accepted text or digests supplies those
facts. No original current debt source/PDF/XML archive is rewritten, and this
work does not create a positive prior-history filing packet.
