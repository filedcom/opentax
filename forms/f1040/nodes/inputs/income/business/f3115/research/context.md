# Form 3115 section 481(a) source, TY2025 Form 1040

Form 3115 identifies a change in accounting method and a net section 481(a)
adjustment. It does not make every adjustment Schedule 1 other income. The
affected business schedule and method determine the return destination.

## Bounded Schedule C route

For a sole-proprietor Schedule C activity, the
[TY2025 Schedule C instructions](https://www.irs.gov/instructions/i1040sc)
say to report a net positive section 481(a) adjustment on line 6 and a net
negative one in Part V. The
[Form 3115 instructions](https://www.irs.gov/instructions/i3115) state the
ordinary spread is four years for a positive adjustment and the year of change
for a negative adjustment. They permit a one-year election for a positive
adjustment under $50,000. A special two-year examination period and other
method-specific periods exist, so a nonstandard period is not guessed here.

Each nonzero source item must identify `reporting_schedule: "schedule_c"`,
`business_reference`, and `year_of_change`. The source emits a
`schedule_c.section481a_adjustments` array. Each row has
`business_reference`, `designated_change_number`, `year_of_change`, and the
signed `amount` included in TY2025. The business reference must match exactly
one Schedule C item. Preserve each row until that match and the final line 6
or Part V projection are verified. Do not combine unrelated business or method
changes into Schedule 1 line 8z.
The MeF and printable Schedule C projections independently recompute the
current-year rows from the pending Form 3115 source and reject a missing,
changed, or suppressed adjustment.

Ordinary positive amount: include one-fourth in each of the four tax years
starting with `year_of_change`. A verified one-year positive election includes
the entire amount only in the year of change, subject to the under-$50,000
limit. The current bounded path requires one method-change item for that
election, rather than assuming how multiple changes combine. Negative amount:
include the entire amount only in the year of change.
Zero or absent adjustment yields no output.
Source amounts are whole dollars. When a positive amount is not divisible by
four, the first three whole-dollar installments round down and the fourth
includes the remaining dollars, preserving the source total. The Schedule C
projection rejects an unreviewed direct line 6 or line 27b amount alongside
an adjustment of the same sign, rather than silently double counting it.

## Still unsupported

- Non-Schedule-C destinations, including farming, rental, and partnership
  activities, need their own source character and return routing.
- Special adjustment periods, except for the small positive one-year election,
  need documented eligibility and period-specific computation.
- The current source row does not independently substantiate Form 3115 filing,
  designated-change eligibility, or the detailed section 481(a) statement.

These paths reject a nonzero adjustment instead of silently using Schedule 1.
