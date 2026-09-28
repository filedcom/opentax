# TY2025 Form 8962 interstate-move poverty table

The [2025 Form 8962 instructions, line 4](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
say that a taxpayer who lived in Alaska and/or Hawaii during a 2025 move uses
the highest federal poverty line table among the states lived in. The selected
table does not necessarily match the year-end mailing address or the last
Marketplace policy.

The bounded route takes distinct `general.ptc_residence_states_2025` and
twelve `general.ptc_residence_months_2025`, January through December. It
requires exactly two states, one chronological residence switch, and a
year-end state matching the Form 1040 filing address. General derives the
highest poverty region, prioritizing Alaska over Hawaii over the contiguous
states. MeF independently checks that region, the TY2025 poverty dollar amount,
the 401% indicator, and the full PTC/repayment arithmetic.

For monthly credit, the route requires a single filer and one-person tax family,
two identified Form 1095-A policies with distinct policy numbers, all twelve
monthly source columns, at most one active policy each month, and exactly one
chronological policy switch among covered months. An uncovered month must have
zero premium, SLCSP, APTC, assistance, and credit; its Form 8962 monthly row is
omitted from MeF and left blank on the PDF, including contribution. The active
policy's `coverage_state` must equal the sourced residence state for that month.
The arrival policy must carry one Form 1095-A
`slcsp_review_periods` move review covering the arrival month through December
and marking the move as reported to the Marketplace. Annual Form 1095-A totals, when present, must
equal their monthly columns. Source premiums, SLCSP, and APTC are checked
month-by-month against Form 8962, then against Schedule 2/3 and the completed
Form 1040. The PDF path invokes that same native reconciliation before
returning the filled projection. Focused positive and tampering cases include
an interior uncovered month and are written but unrun. The
[2025 monthly instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct a blank contribution column when both premium and SLCSP are blank.

This does not authorize an annual line 11 for a move, multiple household
members, shared policies, move-related SLCSP corrections, unreported moves,
overlapping policies, more than two states, or switching back to a prior
state. The residence facts identify the intended calculation but are not
independently authenticated. The full test batch, XSD validation, filled-page
review, IRS business rules, and ATS acknowledgments remain pending.
