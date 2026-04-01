# PPP Forgiveness — Scratchpad

## Purpose
Capture PPP (Paycheck Protection Program) loan forgiveness amounts for federal tax purposes.
PPP forgiveness is excluded from gross income under CARES Act §1106(i) (codified at 15 U.S.C. §636m(i))
and Consolidated Appropriations Act 2021 (CAA 2021) §276.
Under current law (post-CAA 2021), deductions for expenses paid with forgiven PPP funds ARE ALLOWED —
reversing the original IRS position under Notice 2020-32.
This is primarily an informational/passthrough node: no federal income is added to the 1040,
no deductions are disallowed.

## Fields identified
- forgiven_amount: number — the PPP loan amount forgiven (required, nonnegative)
- loan_number: string — SBA loan number / reference (optional, for recordkeeping)
- forgiveness_year: number — tax year when forgiveness was received/accrued (optional, for Rev. Proc. 2021-48 election tracking)

## Open Questions
- [x] Q: What fields does this node capture or receive?
  → forgiven_amount (required), loan_number (optional ref), forgiveness_year (optional, timing election)
- [x] Q: Where does each field flow on the 1040?
  → Does NOT appear on federal 1040 as income (excluded by statute).
  → No output routing needed for federal purposes.
  → Node is informational only (returns empty outputs[]).
- [x] Q: What are the TY2025 constants?
  → No dollar thresholds for federal exclusion — full forgiven amount is excluded, no cap.
  → First PPP round: loans originated March 27 – June 30, 2020; Second PPP round: Jan 11 – May 31, 2021.
  → Maximum PPP loan: $10M (first round), $2M (second round). Not needed as node constants.
- [x] Q: What edge cases exist?
  → forgiven_amount = 0: no tax effect, still valid.
  → Partial forgiveness: only the forgiven portion is excluded; remaining loan is debt (not captured here).
  → Rev. Proc. 2021-48: three timing election options for when to exclude — node captures year to support this.
  → State tax: many states do NOT conform — but that's handled by state engine, not this node.
- [x] Q: What upstream nodes feed into this node? (N/A — input node)

## Sources checked
- [x] Drake KB: No dedicated PPP2 article found in public search (NO_DRAKE_MATCH)
- [x] CARES Act §1106(i): Excludes forgiven PPP amounts from gross income
- [x] IRS Notice 2020-32: Original position — disallowed deductions for expenses paid with forgiven PPP funds (REVERSED)
- [x] CAA 2021 §276: Reversed Notice 2020-32 — deductions ARE allowed; forgiveness exclusion preserved
- [x] IRS Notice 2021-06: Clarified CAA 2021 §276 application
- [x] Rev. Proc. 2021-48: Three elections for timing of exclusion (year of forgiveness vs. year of application)
- [x] Rev. Proc. 2021-49: Partnerships/S-corps basis adjustment rules (not relevant for individual 1040)
