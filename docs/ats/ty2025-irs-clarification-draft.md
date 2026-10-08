# TY2025 Form 1040 ATS packet clarification draft

Prepared 2026-10-04 for the authorized ATS operator to send through the IRS
e-Help Desk or the assigned ATS contact. This is a draft question set, not an
IRS response, a transmitted test return, or permission to alter source facts.
It covers contradictions already tracked in the [ATS preparation](./ty2025.md)
and [product board](../../product_board.md).

**Subject:** TY2025 Form 1040 MeF ATS scenario packet clarifications

We are preparing the TY2025 Form 1040 ATS scenarios and need the intended
source facts or expected treatment for the following printed packet entries.
Please identify the corrected packet revision or give a scenario-specific
answer for each item. We will keep the printed values separate until then.

1. **Scenario 1, Form 5695 page 2:** Line 19a lists a $1,020 door. Line 19d
   lists two more doors for $920 and $800, totaling $1,720. Line 19e also
   prints $2,740 for *all other* doors, exactly the sum of those three listed
   doors. Is line 19e meant to be zero, or are there additional doors with
   separate costs and qualified manufacturer identification numbers? Form
   5695 page 3 also prints $400 for an additional central air conditioner on
   line 22b without its identification number or itemized statement. Please
   provide those facts if the $400 item is intended. [Scenario 1 PDF](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf).
2. **Scenario 8, Form 1040 page 1:** The line 4c QCD box is checked, while
   line 4a is blank. The attached $35,800 Form 1099-R carries code Q with zero
   taxable amount; the other $20,300 Form 1099-R carries code G. Is the QCD
   mark intentional? If so, please identify its IRA distribution, direct
   charitable payment, and amount, and clarify the intended line 4a value.
   If the mark is an error, please confirm that it should be clear.
   [Scenario 8 PDF](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf).
3. **Scenario 12, Form 7217 pages 1–2:** Part I line 10 prints $6,000 and
   says it must equal Part II line B column (e), which prints $4,000. Which
   basis amount and underlying property allocation should the ATS return
   carry? [Scenario 12 PDF](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf).
4. **Scenarios 12 and 13, Form 1040:** Scenario 12 prints a $15,000 single
   standard deduction, and Scenario 13 prints a $30,000 joint deduction.
   Those amounts differ from the TY2025 $15,750 and $31,500 amounts used by
   the current schema-era return calculation. Should ATS submissions recompute
   these scenarios under the current TY2025 amounts, including tax and
   downstream credits, or will corrected source packets provide new expected
   figures? Scenario 13's printed $162 Form 8911 credit depends on its $162
   regular tax, so an answer must cover that credit as well.
   [Scenario 12 PDF](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf),
   [Scenario 13 PDF](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf).

Record the IRS contact, response date, packet revision or case number, and
exact answer in the ATS preparation record before changing a fixture or
submitting a scenario. No answer is recorded here yet. The separate ATS
certificate, account, service-package, business-rule, and acknowledgment gates
remain open.

## Source packet checkpoint

The four official PDFs were fetched on 2026-10-04 into the ignored local
research cache. SHA-256 digests identify the exact revisions reviewed here:

| Scenario | PDF SHA-256 |
| --- | --- |
| 1 | `fb6054bf4417094f0c102bd47b7d021596143929d6789f1971912994e3738cd3` |
| 8 | `3016890611382ee3ae9876b7cd8c81260bcf8e1b611920aac82611fd52e02fae` |
| 12 | `f0bfcfda3c29e216687ba74c78a5c73f33d11487f82aab0808ee9cd128146c83` |
| 13 | `254ae93adb93791c3ac7257bf7de404d4b962bfa2e56da9d49d19c33fba265c1` |
