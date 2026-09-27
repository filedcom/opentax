# TY2026 Form 2441 graph contract

Sources: pinned [2026 draft Form 2441](corpus/draft/f2441.pdf)
(SHA-256 `67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385`)
and [draft instructions](corpus/draft/i2441.pdf)
(SHA-256 `7fdecfe193df435542bb452ba108bee011bef7032fda8abe972d6fbd5de233e7`).
Recheck both against the final release before filing.

## Required data and order

Form 2441 has two calculation stages. Part III's taxable dependent-care
benefits feed Form 1040 line 1e and AGI. Only after AGI is settled can Part
II choose its 2026 percentage, calculate the credit, and send line 11 to
Schedule 3 line 2. The latter must enter the normal Schedule 3 and 1040
credit-limit resolution, without a cycle back through AGI.

| Source | Printed form and downstream result | Required check |
| --- | --- | --- |
| Care provider name, address, SSN/EIN, household-employee answer, amount paid | Part I line 1a–1e and supporting statements beyond printed rows | Preserve provider and payer facts; reconcile amounts with qualifying-person expenses and Schedule H when the provider is a household employee. |
| Qualifying-person identity, disability, and 2026 paid expenses | Part II line 2; line 3 capped at $3,000 for one person or $6,000 for two or more | Apply age-under-13 period and residency/dependent tests; do not count expenses covered by excluded benefits twice. |
| Each filer's earned income, elected combat pay, self-employment amounts, student/disability months | Lines 4–6 and 18–20 | The deemed $250/$500 income is monthly and uses the higher of deemed or actual earnings for each qualifying month; an annual Boolean is insufficient. |
| Calculated Form 1040 line 11a AGI | Lines 7–9a | 2026 rate is 50% through $15,000, then declines to 35%; the second decline starts above $150,000 MFJ or $75,000 for other statuses and bottoms at 20% above $206,000/$103,000. The existing year-rules helper matches the published table at its boundaries. |
| 2025 care expenses paid in 2026 | Line 9b and instruction Worksheet A | Compute separately using prior-year expense/credit facts; add to 9a on line 9c. |
| Form 1040 line 18 and Schedule 3 lines 1 and 6l | Credit Limit Worksheet and line 10 | Derive the limit from graph tax and earlier credits; do not accept an unverified user-supplied limit as final. Line 11 is the smaller of 9c and 10. |
| W-2 box 10, qualifying partnership/sole-proprietor benefits, prior-year grace-period use, forfeiture/carryforward, plan maximum | Part III lines 12–26 | Lines 12–15 determine available benefits; line 21 is at most $7,500 or $3,750 for applicable MFS and may be lower under the plan. Line 22 separates proprietor/partner benefits, line 24 is deductible, line 25 excluded, and line 26 taxable on 1040 line 1e. |
| Qualified expenses incurred in 2026 and paid credit expenses | Part III lines 16–17 and 27–31 | Excluded/deducted benefits consume the $3,000/$6,000 credit ceiling; line 31 feeds line 3. |

## Existing-code audit

- The TY2026 registry now has separate `form2441` and `f2441` nodes. W-2 box
  10 enters the first node before AGI; it rejects benefits without filing
  details and checks filing status against Form 1040. The second node receives
  calculated AGI, line 16 tax, and Schedule 2 line 3, derives the Credit Limit
  Worksheet amount, and sends line 11 to Schedule 3 line 2. Focused graph
  cases verify taxable line 1e, AGI, tax limitation, and a missing-detail
  diagnostic. The node is absent from the public start inputs while
  eligibility facts and MeF remain incomplete. The draft PDF builder fills
  one or two printed pages for employee cases and appends provider/person
  continuation statements when needed.
- The shared `form2441/year-rules.ts` already selects the 2026 50%–20%
  phaseout and $7,500/$3,750 exclusion ceiling. Retain its boundary tests
  and compare final instructions before using it in the public 2026 graph.
- The shared detailed calculation has a pre-AGI benefits stage and post-AGI
  credit stage. It accepts twelve monthly earned-income records, reconciles
  their actual earnings to each annual total, and applies the $250/$500 floor
  for qualifying student or disability months. Full-time student status needs
  five marked calendar months; when both spouses qualify in the same month,
  one deemed-income recipient must be identified. The calculated use flag
  drives Form 2441 box B. Part III lines 22/24 and Part II line 9b remain zero because
  proprietor/partnership benefits and prior-year paid expenses lack source
  facts; line 9c currently equals 9a. Its line 10 is
  supplied internally by the TY2026 graph, while TY2025 retains its existing
  input contract. The TY2026 graph has no producers for Schedule 3 lines 1
  and 6l yet; those earlier credits must route directly to `f2441` before
  their source forms can be added to the public registry.
- The older aggregate `f2441` route computes credit from total amounts and
  assumes 12 months of deemed student/disability income. It cannot print or
  validate the required provider/person rows and benefit
  worksheet. Do not register that aggregate input as the TY2026 filing path.
- The TY2025 PDF descriptor prints only one benefit field. The 2026
  [AcroForm inventory](PDF-FORM2441-MAP.md) now drives a one-page credit-only
  or two-page employee-benefit attachment. For more than three providers or
  qualifying people, it prints the three largest amounts on the form and
  appends statements for the remaining rows, as the 2026 instructions require.
  Complete unsupported tax branches before exposing the route publicly. The
  builder reconciles line 26 to
  Form 1040 line 1e and line 11 to Schedule 3 line 2.

## Build and acceptance sequence

1. Define one typed public filing input for providers, qualifying persons,
   month-level deemed income, care payments, benefit source, grace-period
   carryover, and plan limit. Reconcile W-2 box 10 and household employment
   facts; reject inconsistent duplicates.
2. Connect Part III before AGI, then AGI to Part II. Complete the prior-year
   Worksheet A and credit-limit worksheet from calculated Form 1040/Schedule
   3 amounts. Preserve taxable benefits even when no credit is allowed.
3. Test no-benefit credit, $7,500 benefit exclusion, excess taxable benefit,
   MFS considered-unmarried and regular MFS, student/disability partial
   months, prior-year paid expense, and provider household-employee cases.
   Check AGI, 1040 line 1e, Schedule 3 line 2, and credit limits.
4. Render and visually inspect the full two-page attachment and row
   continuations. Build its MeF serializer and business-rule checks against
   the current TY2026 package, then compare the same cases with ATS fixtures.
