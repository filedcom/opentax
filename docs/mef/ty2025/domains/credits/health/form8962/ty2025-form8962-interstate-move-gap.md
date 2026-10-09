# TY2025 Form 8962 interstate-move poverty table

> **October9 verification:** Ten public-entry interstate returns now pass full XSD with60 observed pages;25 focused tests pass. See the complete-return checkpoint below. Historical staged/unrun statements are superseded for these named cases, with authentication, broader combinations and IRS acceptance still open.

The
[2025 Form 8962 instructions, line 4](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
say that a taxpayer who lived in Alaska and/or Hawaii during a 2025 move uses
the highest federal poverty line table among the states lived in. The selected
table does not necessarily match the year-end mailing address or the last
Marketplace policy.

The bounded route takes distinct `general.ptc_residence_states_2025` and twelve
`general.ptc_residence_months_2025`, January through December. It requires two
through twelve states with one chronological residence switch per move, each state
occupying one contiguous period, and a year-end state matching the Form 1040
filing address. General derives the highest poverty region, prioritizing Alaska
over Hawaii over the contiguous states. MeF independently checks that region,
the TY2025 poverty dollar amount, the 401% indicator, and the full PTC/repayment
arithmetic.

For three states, the bounded route requires three distinct nonoverlapping Form
1095-A policies, one for the single filer in each residence state. Each arrival
policy must have its own existing Marketplace `move` review, marked reported,
with dates exactly covering that state's policy interval. An unreviewed arrival,
conflicting policy state, corrected SLCSP, extra review, policy overlap, or
return mismatch rejects. A January-April Alaska, May-August Hawaii,
September-December Texas case uses Alaska's $18,810 one-person poverty line;
twelve $500 premiums, $600 SLCSPs, and $200 APTC months produce $804 PTC and
$1,596 repayment on Schedule 2 line 1a and Form 1040 line 17. Source
calculation, native MeF, PDF, and tamper fixtures are authored for the deferred
batch. The
[2025 Form 8962 line 4 instructions](https://www.irs.gov/instructions/i8962)
select the higher Alaska/Hawaii poverty table for a mover. The existing
two-state reported and unreported routes remain separately scoped.

The same reported-move route now accepts four distinct residence states and four
sequential Form 1095-A policies, each of the three arrival policies with its own
exact-period Marketplace move review. A January-March Alaska, April-June Hawaii,
July-September California, October-December Texas case retains Alaska's $18,810
poverty line and reconciles twelve $500 premium, $600 SLCSP, and $200 APTC
months to $804 credit and $1,596 repayment. Native and PDF paths reject a
missing arrival review, duplicate policy state, unreported move, or final-return
tax drift. Source calculation, native/PDF, and tamper fixtures are authored for
the deferred test batch.

## Five through twelve reported residence states (implementation staged)

The reported-move monthly route now accepts five through twelve distinct
chronological residence states for a single filer. Each state must own one
identified, nonoverlapping Form 1095-A policy covering the filer alone. Every
arrival policy needs a reported Marketplace `move` review whose dates exactly
match that state's contiguous residence interval. Each policy supplies all
twelve monthly columns and its annual totals, when present, must equal the
covered-month sums. The native guard checks each month's policy state against
the sourced residence state and replays the premium, SLCSP, APTC, contribution,
credit, Schedule 2, and final Form 1040; PDF projection invokes the same guard.
The highest Alaska/Hawaii poverty table among the residence states still governs
Form 8962 line 4 under the
[2025 instructions](https://www.irs.gov/instructions/i8962). The twelve-month
year bounds this route: more than twelve distinct states cannot each own a
covered month. Five-state and twelve-state source, calculation, native, PDF,
missing-review, and final-tax fixtures are authored for the deferred bulk test.
Unreported moves, corrected SLCSP, overlapping policies, returning to an earlier
residence state, other covered people, Marketplace source-byte authentication,
IRS XSD, filled-PDF, and ATS verification remain open.

For monthly credit, the route requires a single filer and one-person tax family,
one identified Form 1095-A policy for each residence state, distinct policy
numbers, all twelve monthly source columns, at most one active policy each
month, and one chronological policy switch per residence change. An uncovered
month must have zero premium, SLCSP, APTC, assistance, and credit; its Form 8962
monthly row is omitted from MeF and left blank on the PDF, including
contribution. The active policy's `coverage_state` must equal the sourced
residence state for that month. Each arrival policy must carry one Form 1095-A
`slcsp_review_periods` move review covering its arrival residence period and
marking the move as reported to the Marketplace. Annual Form 1095-A totals, when
present, must equal their monthly columns. Source premiums, SLCSP, and APTC are
checked month-by-month against Form 8962, then against Schedule 2/3 and the
completed Form 1040. The PDF path invokes that same native reconciliation before
returning the filled projection. Focused positive and tampering cases include an
interior uncovered month and are written but unrun. The
[2025 monthly instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct a blank contribution column when both premium and SLCSP are blank.

An additional bounded route handles an **unreported** interstate move when the
arrival policy's Form 1095-A column B is wrong. The arrival policy must have one
unreported `move` review from the first arrival month through December and one
independently determined `move` SLCSP correction for every covered arrival
month. Each correction records a Marketplace tool/contact method, nonempty
determination reference, reviewed source-record SHA-256, and determination date
between the coverage month and April 15, 2026. The original annual column B must
still total the original twelve monthly statement amounts; the corrected series
feeds Form 8962 monthly calculation, native MeF, and PDF. Native/PDF projection
rejects an omitted or altered arrival correction, another policy's correction, a
reported move paired with corrections, or an unreported move without
corrections. Source/calculation, MeF/PDF, and tampering fixtures are authored
but unrun. The
[2025 Form 8962 instructions, line 10](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
direct taxpayers who moved without notifying the Marketplace to determine the
applicable SLCSP when column B may be wrong;
[2025 Publication 974](https://www.irs.gov/publications/p974) identifies the
Marketplace tool or Marketplace contact as determination channels.

This does not authorize an annual line 11 for a move, multiple household
members, shared policies, corrections on the departure policy, partially
determined arrival months, overlapping policies, or switching back to a prior
state. The three-through-twelve-state routes also exclude any unreported move or
corrected SLCSP. The residence and determination metadata identify the intended
calculation but their underlying record bytes remain subject to external review.
The full test batch, XSD validation, filled-page review, IRS business rules, and
ATS acknowledgments remain pending.


## October 9: complete interstate return checkpoint

Ten synthetic source cases now run through public `executeReturn`, finalized
Form1040 identity, `prepareReturn`, complete native XML and the PDF builder.
Reported routes cover2,3,4,5 and12 distinct residence states; the two-state routes
also cover Hawaii without Alaska, an unreported move with all arrival SLCSP
corrections, an uncovered June, and below400% repayment limits in both regions.
Every return ends in Texas; Form8962 uses the highest applicable residence table.

The [2025 Form8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
provide the18,810 Alaska and17,310 Hawaii single-person poverty amounts, Worksheet2
401 indicator, Table2 contributions and Table5 Single repayment limits. The
[2025 Tax Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) supplies regular tax
8,021 for taxable59,550 and2,195 for taxable20,250. Withholding is8,000 for75,300
wages and3,000 for36,000 wages.

| Case | Wages | Poverty amount | Monthly contribution | PTC | APTC | Cap | Repay | Tax | Refund / owed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Reported2/3/4/5/12 states (five returns) | 75,300 | 18,810 | 533 | 804 | 2,400 | none | 1,596 | 9,617 | 0 / 1,617 |
| Hawaii–Texas | 75,300 | 17,310 | 533 | 804 | 2,400 | none | 1,596 | 9,617 | 0 / 1,617 |
| Unreported Alaska–Texas, corrected arrival | 75,300 | 18,810 | 533 | 1,104 | 2,400 | none | 1,296 | 9,317 | 0 / 1,317 |
| Alaska–Texas, June uncovered | 75,300 | 18,810 | 533 | 737 | 2,200 | none | 1,463 | 9,484 | 0 / 1,484 |
| Alaska–Texas,191% FPL | 36,000 | 18,810 | 49 | 6,612 | 9,600 | 375 | 375 | 2,570 | 430 / 0 |
| Hawaii–Texas,207% FPL | 36,000 | 17,310 | 68 | 6,384 | 9,600 | 975 | 975 | 3,170 | 0 / 170 |

The corrected route preserves the reported600 SLCSP while using650 for each
July–December calculation. Uncovered June is absent from native monthly groups
and all its PDF columns are blank. Reported moves do not use annual line11.
All ten native returns pass the configured TY2025 v5.4 XSD. All60 PDF pages were
rendered and observed:20 distinct pages plus40 exact matching pages, with no live
fields/widgets in the final flattened packets. Amounts, identities, poverty-region
boxes and page order reconcile; no new visual discrepancy was found.

The new ordinary typed regression has ten positive full-return cases and one
negative test covering25 edited variants through both native and PDF gates.
It rejects missing arrival reviews/corrections, wrong covered person, changed
APTC, poverty amount, repayment and final tax joins. Together with five existing
interstate/gap modules, the focused run passes25 tests, zero failures.
An independent Python Decimal source replay also passes all ten monthly/native
and final-return comparisons. Its initial Worksheet2 checker was corrected to
use income above four times poverty before truncation, as the instructions
require; the committed expectations and engine already used401 correctly.

Private evidence: `.state/research/form8962-interstate-2026-10-09/` retains
source, prepared values, expected amounts, XML/PDF, render hashes, oracle and logs.
The fixture's residence/policy/payroll records are synthetic; repeated correction
digests do not authenticate Marketplace records. No runtime calculation, export
logic or deferred item changed. Mixed families, return moves, more complex
coverage and authentication remain outside this proof; the Form8962 parent and
full-suite deferred78 blocker remain open.
