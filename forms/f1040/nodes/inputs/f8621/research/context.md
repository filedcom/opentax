# TY2025 Form 8621 implementation notes

This is a build-pass note, not a declaration of complete PFIC support. Use the
[2025 Form 8621](https://www.irs.gov/pub/irs-pdf/f8621.pdf), its
[instructions](https://www.irs.gov/instructions/i8621), and the local
TY2025v5.4 IRS XSD as the source of truth.

## Current source and routing

Each `f8621s` item is one PFIC/QEF holding. The old
`excess_distribution_amount` and free-form `mtm_gain_loss` inputs were removed.
The item schema is strict so those unsupported shapes cannot be silently
ignored. Each item requires a PFIC EIN or alphanumeric foreign-entity
reference ID, and identifiers cannot repeat across the filing.

For each section 1291 excess distribution or disposition, `excess_events`
contains the sourced excess amount or disposition gain in USD, the stock-block
holding start date, the distribution or disposition date, and the first PFIC
tax year. The engine derives each calendar year's allocation from the number
of days held, including leap years, and balances cents across the years. Prior PFIC-year portions
use that year's highest individual rate from the IRS instructions. Creditable
foreign tax is capped within each affected year. The source must supply a
supported section 6621 interest charge for every prior year with net tax.
Current-year and pre-PFIC portions go to Schedule 1 line 8z. Form 8621 line
16e goes to Form 1040 line 16, with the `1291TAX` indicator. Line 16f goes to
Schedule 2 line 17p. A native `IRS8621` document and holding-period statement
are emitted for each applicable holding.

For mark-to-market year-end stock, gain is fair market value less adjusted
basis. A loss is limited to unreversed prior inclusions under Form 8621 lines
10 through 12 and routed to Schedule 1 line 8z. Dispositions and special
first-year election rules still need source facts and calculations.

For QEF holdings, ordinary earnings route to Schedule 1 line 8z. Net capital
gain routes to Schedule D as long-term gain instead of being mixed into
ordinary income. Separate section 951/1293(g) reductions apply to both lines.
The QEF source model still needs capital-gain category detail, distributions,
and election B.

## Open correctness and acceptance work

- Calculate the section 1291 excess amount from dated distributions,
  per-share prior-year history, and the 125% threshold. Day-level allocation
  of an already-sourced excess amount is now derived; annual distribution
  history and the threshold are not yet modeled.
- Verify historical interest calculations against section 6621 rates and due
  dates rather than relying on a supplied charge.
- Add section 1248 dividend attribution for foreign tax credits on PFIC stock
  dispositions; the current path rejects those credits explicitly. Historical
  individual-rate lookup starts at 1987; earlier holding years are classified
  as pre-PFIC for this computation.
- Complete all Form 8621 top fields, Part I, Part II elections, Parts III-IV,
  Part VI, foreign-entity identification, and supporting statements.
- Reconcile multiple holdings and Form 1040 / Schedules 1, 2, and D to native
  MeF XML and local TY2025v5.4 XSD, then IRS business rules and ATS acceptance.
- Review all cases in the requested full test batch. Written tests in this
  build pass have not yet run.
