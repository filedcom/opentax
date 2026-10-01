# TY2025 Form 8962 interstate-move poverty table

The [2025 Form 8962 instructions, line 4](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
say that a taxpayer who lived in Alaska and/or Hawaii during a 2025 move uses
the highest federal poverty line table among the states lived in. The selected
table does not necessarily match the year-end mailing address or the last
Marketplace policy.

The bounded route takes distinct `general.ptc_residence_states_2025` and
twelve `general.ptc_residence_months_2025`, January through December. It
requires two states with one chronological residence switch or three states
with two chronological switches, each state occupying one contiguous period,
and a year-end state matching the Form 1040 filing address. General derives the
highest poverty region, prioritizing Alaska over Hawaii over the contiguous
states. MeF independently checks that region, the TY2025 poverty dollar amount,
the 401% indicator, and the full PTC/repayment arithmetic.

For three states, the bounded route requires three distinct nonoverlapping
Form 1095-A policies, one for the single filer in each residence state. Each
arrival policy must have its own existing Marketplace `move` review, marked
reported, with dates exactly covering that state's policy interval. An
unreviewed arrival, conflicting policy state, corrected SLCSP, extra review,
policy overlap, or return mismatch rejects. A January-April Alaska,
May-August Hawaii, September-December Texas case uses Alaska's $18,810
one-person poverty line; twelve $500 premiums, $600 SLCSPs, and $200 APTC
months produce $804 PTC and $1,596 repayment on Schedule 2 line 1a and Form
1040 line 17. Source calculation, native MeF, PDF, and tamper fixtures are
authored for the deferred batch. The [2025 Form 8962 line 4
instructions](https://www.irs.gov/instructions/i8962) select the higher
Alaska/Hawaii poverty table for a mover. The existing two-state reported and
unreported routes remain separately scoped.

For monthly credit, the route requires a single filer and one-person tax family,
one identified Form 1095-A policy for each residence state, distinct policy
numbers, all twelve monthly source columns, at most one active policy each
month, and one chronological policy switch per residence change. An uncovered month must have
zero premium, SLCSP, APTC, assistance, and credit; its Form 8962 monthly row is
omitted from MeF and left blank on the PDF, including contribution. The active
policy's `coverage_state` must equal the sourced residence state for that month.
Each arrival policy must carry one Form 1095-A `slcsp_review_periods` move
review covering its arrival residence period and marking the move as reported
to the Marketplace. Annual Form 1095-A totals, when present, must
equal their monthly columns. Source premiums, SLCSP, and APTC are checked
month-by-month against Form 8962, then against Schedule 2/3 and the completed
Form 1040. The PDF path invokes that same native reconciliation before
returning the filled projection. Focused positive and tampering cases include
an interior uncovered month and are written but unrun. The
[2025 monthly instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct a blank contribution column when both premium and SLCSP are blank.

An additional bounded route handles an **unreported** interstate move when
the arrival policy's Form 1095-A column B is wrong. The arrival policy must
have one unreported `move` review from the first arrival month through
December and one independently determined `move` SLCSP correction for every
covered arrival month. Each correction records a Marketplace tool/contact
method, nonempty determination reference, reviewed source-record SHA-256, and
determination date between the coverage month and April 15, 2026. The
original annual column B must still total the original twelve monthly
statement amounts; the corrected series feeds Form 8962 monthly calculation,
native MeF, and PDF. Native/PDF projection rejects an omitted or altered
arrival correction, another policy's correction, a reported move paired with
corrections, or an unreported move without corrections. Source/calculation,
MeF/PDF, and tampering fixtures are authored but unrun. The [2025 Form 8962
instructions, line 10](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct taxpayers who moved without notifying the Marketplace to determine
the applicable SLCSP when column B may be wrong; [2025 Publication
974](https://www.irs.gov/publications/p974) identifies the Marketplace tool
or Marketplace contact as determination channels.

This does not authorize an annual line 11 for a move, multiple household
members, shared policies, corrections on the departure policy, partially
determined arrival months, overlapping policies, or
switching back to a prior state. The three-state route also excludes any
unreported move or corrected SLCSP; more than three states remain outside the
bounded routes. The residence and determination metadata
identify the intended calculation but their underlying record bytes remain
subject to external review. The full test batch, XSD validation, filled-page
review, IRS business rules, and ATS acknowledgments remain pending.
