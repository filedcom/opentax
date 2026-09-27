# TY2026 Form 6781 contracts and straddles contract

Source snapshot: the pinned [2026 draft Form 6781](corpus/draft/f6781.pdf),
SHA-256 `4796657aa0fc3336740b5909701b6813219c9dadf466325d694780876e235a1a`.
Its printed pages 2–4 contain the **2026 instructions**. The separate
`i6781--dft.pdf` URL is not required for this draft. The pinned
[2025 Publication 550](corpus/authorities/p550--2025.pdf) is a prior-year
comparator for straddle basis and carryover rules. Confirm the final 2026
form/instructions, current Pub. 550, Schedule D/8949 instructions and MeF
XSD/rules before filing.

## Source records and ordering

Store each §1256 contract, account, broker Form 1099-B box 11, opening/closing
date, year-end fair market value, adjusted basis, hedge or §988 classification,
and realized or mark-to-market amount. Keep the contract and account IDs on
both the calculation and attachment. An account total alone cannot establish
whether a contract belongs to an identified mixed straddle or hedge.

Represent each straddle with stable position IDs, related-party ownership,
identification and election dates, offset links, gross proceeds, basis,
expenses, prior deferred losses, year-end unrecognized gains and character.
Preserve basis increases from an identified straddle and the deferred loss by
origin year. Classify hedge and foreign-currency ordinary items before the
capital-gain route, and apply Part II loss deferral before aggregating Part I.
Keep elections A/B/C/D explicit and their required statements; box C on the
2026 return establishes mixed-straddle accounts for **2027**.

## Printed lines and downstream graph

| Form area | Calculation and route |
| --- | --- |
| Part I, 1–5 | Produce separate account loss/gain rows; total line 2 and net line 3. Compute line 4 from documented Form 1099-B straddle/hedge adjustments and attach its listing. Line 5 combines 3/4. Do not use line 4 for QOF deferral. |
| Part I, 6–9 | Box D and line 6 elect a **current-year net §1256 loss carried back**, entered positively. Limit it using the instructions' loss-over-$3,000 ($1,500 MFS) and hypothetical 2027 capital-loss carryover tests, then prior-year gain/NOL limits. Line 7 combines 5/6; lines 8/9 split 40% short-term and 60% long-term. Normally route to Schedule D lines 4/11; an applicable QOF deferral uses Form 8949 and Form 8997. Keep Form 1045/amended-year work separate from the current-year return. |
| Part II, 10–11 | For each loss position, compute gross loss, offsetting unrecognized gain (including related-party positions), and recognized loss; carry disallowed loss/basis effects forward under the applicable straddle rule. Split recognized short/long amounts into lines 11a/11b, then Schedule D lines 4/11 or Form 8949 as instructed. |
| Part II, 12–13 | Compute each realized straddle gain from sales price and basis/expenses, split short/long lines 13a/13b, and route to Schedule D lines 4/11 or Form 8949/QOF. Preserve collectibles character for the Schedule D 28% Rate Gain Worksheet. |
| Part III, 14 | List qualifying year-end positions with unrecognized gain when a recognized position loss exists. This is a memo disclosure, not current taxable gain; retain it for Part II loss deferral and next-year basis reconciliation. |

The generic Schedule D `line_11_form2439` input currently carries the shared
node's 60% amount. Reconcile its ownership and aggregation with the other
line 11 sources rather than attributing the amount to Form 2439. A Form 6781
input also makes the 1040 direct-capital-distribution exception inapplicable.

## Current code boundary

- Shared `form6781` accepts only account IDs with signed net gain/loss (or a
  calculation-only aggregate), then emits 40%/60%. It correctly rejects an
  old prior-year-loss-on-line-6 field, but it has no boxes A–D, line 4 or
  elected line 6, Part II/III, source ledger, QOF, or future-year records.
  A zero net returns no output even when a required straddle disclosure or
  election exists.
- The TY2025 MeF serializer emits Part I account rows and derived totals
  only. The TY2025 PDF descriptor prints at most three accounts, omits
  elections, lines 4/6, and Parts II/III. Neither is a complete 2026 filed
  form; the draft has [71 terminal widgets](pdf-fields-f6781.csv), all in the
  field tree. Its five PDF pages are a draft cover, one form page and three
  instruction pages.
- `form6781` has no TY2026 graph registration, PDF builder or MeF descriptor.
  Its 2025 validator cannot establish the 2026 election, statement,
  carryback and straddle invariants.

## Build order and acceptance

1. Pin final 2026 Form 6781 and instructions, current Pub. 550 and the
   selected MeF XSD/rules. Resolve election timing, account/statement
   requirements and Form 8949 QOF cases against those sources.
2. Build contract and position ledgers. Classify hedge/§988/identified
   straddles, apply straddle deferral/basis rules, then compute Part I and
   Parts II/III with explicit row and election records. Store carryback and
   deferred-loss provenance for amended/prior and future-year returns.
3. Route 8/9 and 11/13 through Schedule D or Form 8949/8997 as applicable;
   update the return-wide Schedule D filing decision and tax worksheets.
   Validate line totals, nonnegative line 6, box D, character splits,
   recognized-versus-deferred losses and Part III disclosure trigger.
4. Fill/render all 71 widgets and attach continuation/adjustment/election
   statements. Serialize the same records using the selected current MeF
   package; compare the printed form, XML, Schedule D/8949, 1040 tax and
   carryforward ledger. Run TY2025 regressions for shared graph changes.
5. Cover simple gain and loss accounts, a net-zero form with an election,
   line 4 adjustment, Box D under each limiting test, a mixed straddle with
   Part II deferral and Part III memo, related-party position, QOF deferral,
   hedge/§988 exclusion, collectibles character and more than three accounts.

This records the TY2026 implementation contract; it does not register filing
support.
