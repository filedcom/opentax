# TY2025 lump-sum Social Security benefits

The `lump_sum_ss` node records benefits received in 2025, including a payment
attributable to earlier years. [Publication 915 (2025)](https://www.irs.gov/publications/p915)
says Form 1040 line 6a uses the total reported benefit, including the earlier-year
payment. An election can lower **taxable benefits on line 6b** after Worksheets
1–4 establish that Worksheet 4 line 21 is less than Worksheet 1 line 19. An
election also requires the Form 1040 line 6c checkbox.

| Input | Current use | Limit |
| --- | --- | --- |
| `total_ss_benefits_this_year` | Full reported benefit routed to line 6a | This is a supplied amount, not reconciled to retained SSA-1099/RRB-1099 copies in this node. |
| `lump_sum_amount` | Validated not to exceed the reported total | Its deduction from line 6a was incorrect and has been removed. |
| `prior_year_benefits` | Retained as informational source splits | Amounts and years alone cannot calculate each earlier year's taxable benefit. |
| `is_lump_sum_election_beneficial` | A true assertion rejects export | A boolean does not supply Worksheet 1–4 figures or line 6b. |

The election remains unsupported. A true election assertion now fails before
output, so the node cannot omit a taxable earlier-year portion or leave line 6c
blank while claiming the election. A false or absent assertion keeps the full
reported total on line 6a. This node does not independently calculate line 6b,
and the Form 1040 PDF line 6c checkbox remains unmapped. A complete route needs
verified prior-year income and previously taxed benefits, 2025 taxable benefit
facts, Worksheet 1/4 comparison, and a reconciled final line 6b/line 6c claim.

No amendment to an earlier-year return is made for the election: the taxable
earlier-year payment is included in the year received, as Publication 915 says.
