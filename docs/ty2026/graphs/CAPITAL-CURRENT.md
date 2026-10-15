# Current TY2026 capital disposition and carryover route

Implemented October 15, 2026 in the current source graph. `capital_gains` owns
ordinary investment sales and combines them with the independently reconciled
1099-DIV distribution inventory. The previous graph/map implementation notes
refer to the September prototype; this is the current contract.

## Reuse and authority

The new source adapter calls the shared Schedule D calculator for short/long
netting, the capital-loss limit and preferential gain. The shared reported-money
helper supplies Form 8949 whole-dollar columns. No 2025 source validator is
called with altered dates and no 2025 filing output is replaced.

The current [2026 Form 1099-B instructions](https://www.irs.gov/pub/irs-pdf/i1099b.pdf)
and [2026 Form 1099-DA instructions](https://www.irs.gov/pub/irs-pdf/i1099da.pdf)
were checked October 15. The draft Schedule D and Form 8949 are hash-pinned in
the corpus and their PDF field maps. Both draft instruction URLs still return
**2025** instructions, as does the current final Schedule D instruction URL.
Those remain prior-year comparators; they are not final 2026 filing authority.
The draft 2026 forms themselves specify the reporting categories, direct-sale
exception and $3,000/$1,500 loss limit. Current instruction/MeF refresh remains
an explicit release gate.

## Source contract

The public `capital_gains.claim` requires a complete inventory and reviews for
ordinary investment treatment, no special/QOF capital sources, no investment
interest election, no NIIT exclusions/AMT basis differences and no canceled-debt
attribute reduction. It accepts per-lot source facts, not Schedule D line totals.

- Each sale retains filer ownership, asset kind, purchase/disposition evidence,
  actual proceeds (net of expenses already included by the broker), tax basis,
  additional selling expenses, wash-sale review and either an
  issued 1099-B/1099-DA transaction or an unreported-disposition record.
- Reported basis and taxpayer tax basis remain distinct. Covered basis corrections
  derive code B; proceeds/expense corrections derive code E; reviewed disallowed
  security losses derive code W. The source ledger reconciles reported wash-sale
  amounts and caps disallowance at the realized loss. Cross-account, spouse and
  IRA review is explicit; replacement-lot basis records remain a separate scope.
- Dates determine short/long holding period. Conflicting broker terms stop for
  their correction owner; unknown terms require dated acquisition evidence.
  Only 2026 sales of purchased ordinary investment assets are supported here.
- Broker transaction identity is unique across current statements. Corrected
  copies list superseded documents, which cannot also remain active. Issuer,
  owner and account identity must agree across rows of one document.
- Categories A-L derive from term, asset kind and reported-basis status. Direct
  A/D/G/J rows with no adjustments retain cents until their Schedule D totals
  are aggregated. Other rows round printed columns before computing column (h).
  Digital dispositions require the Form 1040 digital-assets answer.
- Withholding joins the other information returns once, retaining cents until
  Form 1040 line 25b is rounded. The bundle checks the combined withholding.

When dividends and dispositions/carryovers coexist, the dividend inventory
references the capital claim's review ID. A distribution-only declaration cannot
coexist with those sources, and a reference to an absent capital claim fails.
The existing distribution-only route still omits Schedule D and checks line 7b.

## Carryovers and downstream calculation

Prior carryovers derive from the filed 2025 Schedule D lines 7/15/21 and Form
1040 AGI/deductions/taxable income. The source must reconcile, retain negative
pre-zero taxable income, and belong to the unchanged filing unit. Arbitrary
carryover totals are not public inputs. Changed filing units and attribute
reductions need their own owners.

The resulting gain or limited loss reaches AGI and Form 1040 line 7a. Net
preferential gain reaches regular tax and AMT; independently replayed capital
sources reconcile both AMT preferences and Form 8960 line 5a, including allowed
losses. Reviewed state-income-tax allocation remains necessary when applicable.

`capital_loss_carryover` runs after final Form 1040 income and deductions. It
checks Schedule D net gain/loss and taxable income against the return before
computing separate short/long carryforwards to 2027. A deduction printed on
Schedule D does not consume loss that could not reduce taxable income. This is
a retained workpaper, not an extra filed attachment or a 2027 registration.

## Draft forms and verification

The [Schedule D map](../pdf/PDF-SCHEDULED-MAP.md) and
[Form 8949 map](../pdf/PDF-FORM8949-MAP.md) supply the pinned widget inventory.
The current builder checks both templates and reconciles Form 1040 line 7a/7b,
qualified dividends and preferential gain before rendering. Schedule D is
attachment 12; Form 8949 is 12A. A single category appears on each Form 8949 page,
with eleven rows and a page total; direct sales do not reappear on that form.
Summary branches select lines 17/20/22 and the loss line from actual results.
The static development bundle excludes draft covers and has no annotations or
AcroForm tree. Every page retains its draft/incomplete markings.

Tests cover mixed short/long securities and digital assets, all twelve reporting
categories, direct-sale cents, B/E/W adjustments, combined dividends, ownership,
correction/duplicate rejection, holding-period boundaries, MFS loss limits,
prior and outgoing carryovers, tax/NIIT reconciliation, PDF destination mismatch
and continuation after eleven trades. Eighteen synthetic QA pages cover all
categories, continuation and negative net gain. They are not ATS acceptance.

## Staged business-land handoff

The internal calculator also accepts the source-backed business-land handoff
in [FARMLAND-CURRENT.md](FARMLAND-CURRENT.md). It reconciles inventory/owner
identity, adds the derived residual 4797 gain to Schedule D line 11 and retains
ordinary character separately. AMT, NIIT and standalone draft components replay
those sources. The source graph still rejects land until QBI, limitations,
ordinary-income routing and Form 4797 attachments are connected; this is not a
new public capital input. The existing investment-only source route remains
unchanged, including its narrower NIIT/AMT review assertions.

## Remaining scope

Other acquisition/basis histories and replacement-lot propagation; inherited,
gift, employee stock, options, short sales, collectibles and other special-rate
assets; market discount; term/type corrections; nominees, foreign and state
source treatment; optional digital aggregation; QOF and Form 8997; other capital
form/K-1 sources; changed filing-unit carryovers, AMT/NIIT differences and
canceled-debt reductions; final instructions/forms, current MeF, public product
registration and complete ATS cases. The graph rejects unimplemented input
fields and explicit conflicting source facts; review assertions are not proof
of those broader routes.
