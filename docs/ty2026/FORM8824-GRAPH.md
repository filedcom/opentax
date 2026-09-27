# TY2026 Form 8824 like-kind exchange and §1043 contract

Source snapshot: [draft 2026 Form 8824](corpus/draft/f8824.pdf), SHA-256
`631b24c2dc686e2a9b5c2df9a65b800a79e6a64a0bc611f32b376c1b6e17dc2f`,
and the [2025 instructions](corpus/authorities/i8824--2025.pdf), SHA-256
`a7a45184306e15249a415f24b0fe16f678c92491e0923fc0d7b4b4931ae6e562`,
plus [Publication 544 (2025)](corpus/authorities/p544--2025.pdf), SHA-256
`b8282a22f637e147b6435787bf9e20db6c24d08d8124386cce75eaab05de0cfd`,
both **prior-year comparators**. The draft `i8824--dft.pdf` URL still serves
2025. Obtain the final 2026 form/instructions and current MeF rules before
filing. The pinned draft itself has cross-form line conflicts: Part III line
21 says Form 4797 **line 16** for ordinary exchange recapture, while the
[2026 Form 4797 draft](FORM4797-GRAPH.md) labels its exchange ordinary line
**17**. Part IV line 35 says Form 4797 line 10, while the 2026 Form 4797
ordinary property rows are on line 11. Resolve both from final authority;
do not copy the printed cross-references into code unchecked.

## Exchange and basis ledger

One record per exchange, with every relinquished and received **real
property** component identified separately: address/country and real-property
eligibility; owner and activity/asset IDs; acquisition, transfer, written
identification and receipt dates; fair market value, adjusted basis and
depreciation/recapture history; cash and other (non-like-kind) property
given/received; liabilities each party assumes; exchange expenses; and
qualified intermediary or accommodation-arrangement evidence. Carry the
replacement asset's allocated basis, deferred gain/loss, character and
potential future recapture into later years. The 2025 instructions emphasize
that §1031 applies only to real property and has detailed intangible/fixture
classification; do not treat all `section_1245` property as nonqualifying or
all land swaps as automatically eligible. Foreign location and U.S./foreign
like-kind treatment need explicit validation.

For a deferred exchange, validate **written identification within 45 days**
and receipt by the earlier of **180 days** after relinquishment or the
return due date with extensions, subject to the final instruction's special
facts. A replacement received within the 45-day period has the instruction's
identification-date treatment. Preserve signed notice, QI/EAT identity,
dates and properties so PDF and MeF can explain the result.

Related-party exchange IDs, party identity, intermediary relationship,
last transfer date and each party's subsequent disposition must persist for
the **two-year** reporting window. The direct/indirect related-party branch
may disqualify nonrecognition at exchange or trigger deferred gain/loss on
a later disposition; lines 11a–c represent specific exceptions requiring
facts and sometimes an attached explanation. A current-year `related_party`
boolean cannot represent that cross-year state.

## Printed sections and destinations

| Part / lines | Calculation and filing handoff |
| --- | --- |
| I, 1–7 | Describe **every** piece given and received, locations/countries, acquisition/transfer/identification/receipt dates and direct or indirect related-party status. A non-real-property component goes to Part III's other-property/boot calculation or a separate sale result. Failure of eligibility/timing requires taxable disposition treatment. |
| II, 8–11 | Related-party identity/address and each side's disposition before the two-year anniversary. A later line 9/10 Yes generally releases line 24 deferred gain/loss in that year unless line 11a–c exception applies. Keep later-year Form 8824 instance even without a new exchange where the instructions require it; link to the original exchange and updated deferred balance. |
| III, 12–14 | Other property **given up**: FMV, basis and independently recognized gain/loss as though sold. Do not silently include its gain in the like-kind real-property deferral. Mixed home/business property needs the instruction's §121 allocation worksheets. |
| III, 15–25c | Compute boot from cash, other property received, net liabilities and exchange expenses (15); like-kind property FMV (16), total received (17), adjusted basis/net payments/unused expenses (18), realized gain/loss (19), recognized boot gain (20), ordinary recapture (21), remaining recognized gain to Form 4797 or Schedule D/possibly Form 6252 (22), total recognized (23), deferred gain/loss (24), and replacement basis (25). Allocate basis across §1250, §§1245/1252/1254/1255 and intangible property at 25a–c where required. Use the [Form 4797 asset ledger](FORM4797-GRAPH.md) for depreciation recapture and later basis; do not hardcode line 21 to zero. |
| IV, 26–38 | Distinct §1043 conflict-of-interest **sale** and replacement-purchase election for an eligible federal officer/employee or covered person with a certificate of divestiture. Require certificate number, properties, sale/purchase dates, 60-day replacement test, proceeds/basis, ordinary recapture, recognized and deferred gain, and replacement basis. This is not a §1031 real-property exchange; route recognized gain by asset character and carry deferred basis forward. |

For a multi-asset exchange or exchange with boot, the 2025 instructions require
a [realized/recognized-gain statement](corpus/authorities/i8824--2025.pdf)
and direct lines 19–25 rather than a naive single-property lines 12–18
calculation. Group assets under the applicable like-kind classes and allocate
basis, expenses, liabilities, recognized gain and recapture per asset. This
also determines the correct number of Form 8824 instances, statement pages,
[Form 6252](FORM6252-GRAPH.md) installment gain, Form 4797 ordinary/§1231
gain and [Schedule D](CAPITAL-GAIN-GRAPH.md) capital gain. Ensure no boot or
recapture is counted twice.

## Current code boundary

- Shared `form8824` handles one simple exchange. It explicitly rejects
  related-party, recapture, multi-property, installment and home-use cases;
  `calculateLikeKindExchange` fixes line 21 ordinary recapture at **zero**,
  and the node retains only one aggregate `replacement_property_basis_8824`
  carryforward without asset IDs or character. Its capital gain path always
  uses long-term Schedule D `line_11_form2439`, even though the asset's
  actual holding period controls classification.
- TY2025 MeF supports only unrelated-party, determinable, nondepreciable
  replacement land and a long-term recognized gain; it rejects a realized
  loss because of the 2025 schema amount type. Its custom PDF gain statement
  is labeled **2025** and uses a single-property calculation even for a
  boot/multi-asset case. Select the 2026 schema and statement requirements
  instead of carrying that artifact forward.
- The TY2025 PDF descriptor covers only a subset of Part I and Part III and
  assumes 2025 widget names. The [draft 2026 inventory](pdf-fields-f8824.csv)
  has **68 terminal widgets**, all in the field tree, across two printed
  pages plus the draft cover. Part II, 25a–c, Part IV and attachments need
  a full map and rendered inspection. `form8824` is absent from the TY2026
  registry/PDF builder and has no current MeF/validation route.

## Build order and acceptance

1. Obtain final 2026 instructions and reconcile the Form 4797 line-16/17
   and line-10/11 conflicts; confirm current MeF XSD/rules, related-party
   disclosure cardinality and multi-asset statement format. Pin any
   superseding Publication 544 and revise this draft-based contract.
2. Create the multi-property exchange/asset ledger, eligibility and timing
   decision, related-party two-year state and replacement-basis allocation.
   Calculate §1031 Parts I–III and §1043 Part IV independently. Have Form
   4797 recapture/property basis feed Form 8824's recognized/deferred gain,
   then persist the resulting basis in the replacement asset ledger.
3. Route each recognized item by property character and holding period to
   Form 4797, Schedule D or Form 6252. Produce all Form 8824 copies and
   required statements; fill and visually inspect the 68 widgets; emit
   TY2026 MeF from the same calculated lines. Reconcile every asset's
   adjusted basis, deferred gain, current gain and next-year history.
4. Test simultaneous and delayed exchanges, the 45/180-day boundaries,
   U.S./foreign property, QI and reverse-exchange evidence, cash/liability
   boot, other property both given and received, multi-asset allocation,
   §1245/1250 recapture, mixed home/business use, related-party sale in
   year 1/2 and exceptions, §1043 sale, recognized loss and installment
   gain. Run TY2025 regressions and complete TY2026 return fixtures.

This is the source-backed plan, not filed TY2026 Form 8824 support.
