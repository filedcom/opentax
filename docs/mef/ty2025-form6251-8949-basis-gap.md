# TY2025 Form 6251 line 2k: Form 8949 AMT basis

Build status: bounded source-to-return, native MeF, and PDF mappings are
written. Tests are written but have not been run in the agreed full batch. IRS
XSD validation, filled-PDF visual review, business-rule checks, and ATS
acceptance are still pending.

The native and PDF Form 6251 exporters now replay every line 2k basis row
against the retained raw Form 8949 input. The row set must be exact, with
distinct source IDs and matching part, proceeds, regular/AMT bases, and gains;
adjusted or extra source rows reject. The direct replay fixture is authored but
awaits the agreed bulk validation. This binds the two in-memory form routes, not
the underlying broker document bytes.

One qualifying full-lot sale of a 2024 ISO exercise is now linked to this replay
through a distinct reviewed prior-year Form 3921/Form 6251 source, 2025 broker
transaction reference, and the exact regular and AMT share bases. It can coexist
with a separate retained 2025 Form 3921 line 2i adjustment. See the
[ISO source note](ty2025-form6251-iso-source-gap.md) for that bounded route and
its unauthenticated prior-filing limitation.

The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require refiguring Form 8949 and Schedule D for AMT when a disposition has a
different AMT basis. The difference between the AMT and regular-tax gain or loss
belongs on Form 6251 line 2k. A higher AMT basis therefore creates a
**negative** line 2k adjustment, not a positive one.

The bounded path starts with identified Form 8949 Part II rows (boxes D, E, or
F) that have `amt_cost_basis` and positive, unadjusted whole-dollar long-term
gains under both bases. Each row carries its source transaction ID, Form 8949
part, proceeds, regular basis and gain, and AMT basis and gain to Form 6251.
Schedule D supplies a source audit of every Form 8949 row and the presence of
other capital inputs, including offsetting positive and negative entries. Form
6251 rejects duplicate IDs, verifies both gains against the bases, matches the
full Schedule D source rows, and requires the sum of those regular gains to
equal regular Schedule D net capital gain. It uses the AMT-refigured gain for
Part III lines 13 and 15, but retains the regular-tax worksheet values for lines
20 and 27. The signed line 2k total maps to the TY2025
`IRS6251/PropertyDispositionAmt` element and the page-1 line 2k PDF widget
`f1_15`.

A separate short-term-only route accepts identified, unadjusted Form 8949 Part I
rows (boxes A, B, or C) with positive whole-dollar gains under both bases. The
same full Schedule D audit must contain exactly those rows, with matching part,
source ID, proceeds, regular basis, and regular gain, and no other capital
activity. Regular Schedule D net capital gain must be zero. With no qualified
dividends, the AMT-minus-regular short-term gain difference adjusts line 2k and
AMTI without creating preferential gain or Part III. With qualified dividends,
the audited short-term difference still adjusts only line 2k, while the
dividends require Part III under
[2025 Form 6251 line 7](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf). The
bounded branch requires the dividend amount to fit within both regular taxable
income and AMT taxable excess, with no Form 4952 election, special-rate gain, or
Form 2555. Part III lines 13 and 15 contain only qualified dividends; lines 20
and 27 retain the regular worksheet's taxable ordinary base. The calculated
signed line 2k and Part III amounts use the existing native MeF and PDF
mappings, whose `PropertyDispositionAmt` and `CapitalGainsWorksheetAmt` elements
appear in the checked-in TY2025 v5.4 XSD. Focused positive, bounded-rejection,
XML, and PDF projection cases are written but unrun.

The same complete-audit rule now admits mixed positive, unadjusted Part I and
Part II Form 8949 basis rows when no other capital activity exists. In that
bounded case both regular and AMT Schedule D line 7 short-term totals remain
positive, so each net capital gain is its respective long-term total (the
smaller of Schedule D lines 15 and 16). The summed AMT-minus-regular gain
differences from both terms go to Form 6251 line 2k, but Part III lines 13 and
15 use only AMT long-term gains; lines 20 and 27 retain the regular-tax
worksheet values. This follows the
[2025 Form 6251 line 2k and Part III instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
and the
[2025 Schedule D net-capital-gain calculation](https://www.irs.gov/pub/irs-prior/i1040sd--2025.pdf).
Focused signed short-term and mixed-term source, native, and PDF projection
cases are written but unrun.

The gain routes fail closed for zero or negative gain under either basis,
adjusted Form 8949 rows, missing source IDs, digital-asset boxes G through L,
any unrelated Schedule D activity (even if it nets to zero), a mismatch with the
regular Schedule D source audit, Form 4952 elections on a short-term route, AMT
Form 4952 elections on any basis route, special-rate gains, and Form 2555. They
do not model AMT capital-loss limits or carryovers beyond the bounded loss route
below, prior-year AMT capital-loss carryovers, different AMT characterization,
Form 4797/4684 dispositions, or the AMT Schedule D refigure when other capital
activity changes its totals. The AMT Form 8949 and Schedule D workpapers are for
records and are not attached to the regular return under the IRS instructions.

A build-first, unrun short-term loss route now accepts identified, unadjusted
Part I Form 8949 rows when **every** row is a loss under both bases and the
combined regular and AMT losses are each fully deductible under the Schedule D
$3,000 limit ($1,500 for married filing separately). The complete source audit
must show no other capital activity, including carryovers. Because neither side
hits its deduction ceiling, the signed AMT-minus-regular difference is the line
2k adjustment. The route rejects mixed gains and losses, a limit crossing on
either side, qualified dividends, elections and special-rate gain. It does not
support losses that require an AMT capital-loss carryover or different Schedule
D line 21 limits. Source, calculation, native XML, PDF projection, and rejection
cases are written but await the agreed full batch. See the
[2025 Form 6251 line 2k instructions](https://www.irs.gov/instructions/i6251)
and
[2025 Schedule D capital-loss instructions](https://www.irs.gov/instructions/i1040sd).

The same fully deductible loss bound now admits **long-term-only** Part II rows
(boxes D, E, or F). Every identified Form 8949 row must be a whole-dollar loss
under both regular and AMT bases, the complete Schedule D audit must contain
exactly those rows with no other capital activity or carryovers, and each
aggregate loss must remain within its own $3,000 deduction ceiling ($1,500 if
married filing separately). Regular and AMT net capital gain are both zero; line
2k receives the signed difference in allowed losses, while Part III has no
preferential capital gain. The same no-qualified-dividend, no-election,
no-special-rate-gain, and no-Form-2555 bounds apply. Mixed short/long losses,
either ceiling crossed, or another capital row still reject. Source, node,
native XML, PDF projection, and negative cases are written but unrun. This does
not calculate an AMT capital-loss carryover or support long-term mixed-sign
rows.

A further short-term-only, mixed-sign net-gain slice is written but unrun. The
identified unadjusted Part I rows must have the same gain/loss sign under both
bases, exactly match the complete Schedule D source audit, and net to a positive
short-term amount for both regular tax and AMT. With no other capital activity,
both Schedule D net-capital-gain amounts for preferential-rate purposes are
zero. For example, regular gains of $3,000 less $1,000 of losses net to $2,000;
AMT gains of $3,500 less $1,200 of losses net to $2,300. Form 6251 line 2k is
the **$300 difference**, not the $2,300 AMT net amount, and Part III gets no
capital gain. A zero difference remains zero. Mixed terms, a zero or negative
net on either side, an item changing sign between bases, dividends, Form 4952,
Form 2555, special-rate gain, source-audit mismatch, and other capital activity
remain rejected. This does not calculate any carryover. The shared test, XSD,
filled-PDF and ATS gates remain open.

A parallel long-term-only mixed-sign net-gain slice is now staged. Every
identified Part II gain and loss must retain its sign under both regular and AMT
bases; the complete Schedule D audit contains exactly those rows and no other
capital activity. The regular and AMT long-term net totals must each be
positive. Form 6251 line 2k receives their signed difference, and Part III uses
the AMT net as preferential gain while retaining the regular net for its
regular-tax worksheet base. For $3,000 regular gain less $1,000 regular loss,
and $3,500 AMT gain less $1,200 AMT loss, the line 2k adjustment is $300 and
Part III lines 13/15 use $2,300. The source, calculation, native/PDF, and
rejection fixtures are authored for the deferred bulk pass. Mixed terms,
qualified dividends, special-rate gain, Form 4952 elections, Form 2555, net loss
or zero under either basis, and carryovers remain closed. See the
[2025 Schedule D instructions](https://www.irs.gov/pub/irs-prior/i1040sd--2025.pdf)
and [2025 Form 6251](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf).

## One long-term regular gain that becomes an AMT loss (staged, unrun)

A single audited, unadjusted 2025 Form 8949 Part II sale may have a positive
regular gain and a negative AMT gain when its AMT basis is higher. This route
requires the AMT loss to fit within the separate $3,000 Schedule D limit
($1,500 for married filing separately), no other capital activity or carryover,
and no qualified dividends, Form 4952 election, or special-rate gains. The
regular gain stays on Form 1040 line 7; the signed AMT-minus-regular difference
goes to Form 6251 line 2k. Because the AMT side has a loss, no preferential AMT
capital gain enters Part III. Native and PDF export replay the exact dated Form
8949 row and match Schedule 2 line 2, Form 1040 lines 7/15, and the Form 1040
line 17 tax total. The positive and changed-basis, tax, capital-gain, and limit
fixtures are authored for the deferred batch. The underlying broker-copy bytes
and basis workpaper are not independently authenticated. See the
[2025 Form 6251 line 2k instructions](https://www.irs.gov/instructions/i6251)
for the separate AMT Schedule D loss limitation.
