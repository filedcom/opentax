# TY2025 Form 1040 business-credit routing audit

This is an implementation inventory, not an approval to claim any credit. The
authoritative tax map is
[2025 Form 3800](https://www.irs.gov/pub/irs-pdf/f3800.pdf) and its
[instructions](https://www.irs.gov/instructions/i3800). An individual's Form
3800 Part II line 38, after passive activity, special-limit, transfer,
carryover, and tax-liability rules, is the amount reported on Schedule 3 line
6a. A source form's computed credit is not automatically that allowed amount.

## Current direct deposits into Schedule 3 line 6a

The following source nodes currently deposit a positive amount into
`line6a_general_business_credit` without a common Form 3800 Part II calculation.
These are current-worktree observations, not claims that the source calculation
or Form 3800 line assignment is correct.

| Source node | Required classification before filing                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `f3468`     | Separate its Part II/III/IV/V/VI/VII credit lines, EPEs, transfers, and specified-credit parts.                                              |
| `f4136`     | Determine which fuel credits belong on Form 3800 and which are refundable or otherwise claimed.                                              |
| `f5884`     | Part III line 4b specified credit and any carryover classification.                                                                          |
| `f6478`     | Part III line 4c specified credit and applicable source year.                                                                                |
| `f6765`     | Ordinary line 1c versus eligible-small-business specified line 4i, plus payroll-tax election.                                                |
| `f7207`     | Part III line 1b, transfer/EPE, and facility breakdown.                                                                                      |
| `f8820`     | Part III line 1h and applicable source limits.                                                                                               |
| `f8826`     | Part III line 1e and passive-activity classification.                                                                                        |
| `f8834`     | Check whether only a historic carryover is eligible. Form 3800 Part IV lists its legacy credit; current-year line 6a must not be assumed.    |
| `f8844`     | Part III line 3 uses its own Part II section B limitation.                                                                                   |
| `f8859`     | Verify the current-year Form 3800 line and source eligibility before routing.                                                                |
| `f8864`     | Separate diesel line 1l and SAF line 1ff, including transfer eligibility.                                                                    |
| `f8874`     | Part III line 1i and pass-through/source limits.                                                                                             |
| `f8881`     | Separate Part I line 1j, Part II line 1dd, and Part III line 1ee.                                                                            |
| `f8882`     | Part III line 1k and source limits.                                                                                                          |
| `f8896`     | Part III line 1m and source limits.                                                                                                          |
| `f8908`     | Part III line 1p and source limits.                                                                                                          |
| `f8912`     | **Not Form 3800:** allowed Form 8912 line 12 belongs on Schedule 3 line 6k, not 6a. Its own Part II tax limit is required.                   |
| `f8941`     | Part III line 4h specified credit and source limits.                                                                                         |
| `f8994`     | Part III line 4j specified credit and source limits.                                                                                         |
| `f3800`     | Its legacy `f3800s` sums current credits and carryovers, or accepts `total_gbc`, then sends the result to line 6a without the Part II limit. |

Separate paths: `f8609` deposits low-income housing credit directly into the
other Schedule 3 line 6a accumulator; the Form 8586 specified-credit and
carryover path needs source reconciliation. `form8582cr` deposits its passive
activity allowed credit directly into line 6a, but that is only the passive
activity limit, not necessarily the Form 3800 tax-liability limit. `f8835`
instead forwards per-facility amounts to `f3800`; positive available credit
currently stops rather than claiming gross credit. Form 8936 business-use and
Form 8911 business-use paths also need the shared Form 3800 treatment.

## Required common flow

1. Each source produces identified current-year credit entries or carryover
   entries with Form 3800 line, source document, activity classification,
   transfer/EPE facts, and source-specific limits. Do not merge unlike lines.
2. Apply Form 8582-CR where relevant. Keep its allowed passive amount separate
   from the later Form 3800 tax limit.
3. Aggregate Parts III through VI, with Part V detail for multiple facilities or
   pass-through sources, and calculate Part I and all relevant Part II sections
   in the IRS ordering. Carryovers need originating-year identity.
4. Use finalized Form 1040, Schedule 2, Schedule 3 excluding the GBC itself, and
   Form 6251 amounts to determine Part II's allowed amount. Replace the
   tentative Schedule 3 line 6a and Form 1040 line 20 with that amount.
5. Reconcile the filed Form 3800 XML/PDF, every source document, Schedule 3,
   Form 1040, transfer statements, and any carryforward. Then run full-batch
   tests, local XSD, business rules, and ATS acceptance as separate gates.

The current pure Form 8835/Form 3800 helpers cover only a nonpassive slice of
steps 1, 3, and 4. They are not registered as a filed Form 3800 document.

Form 8912's routing is confirmed by
[Form 8912 line 12](https://www.irs.gov/pub/irs-pdf/f8912.pdf) and its
[instructions](https://www.irs.gov/instructions/i8912). It must be handled as a
separate tax-credit-bond limit and excluded from Form 3800 line 10b as specified
by the Form 3800 instructions.
