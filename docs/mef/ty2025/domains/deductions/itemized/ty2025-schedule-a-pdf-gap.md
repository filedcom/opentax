# TY2025 Schedule A PDF field audit

The canonical [2025 Schedule A](https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf) has an election checkbox beside line 5a for deducting general sales taxes instead of state and local income taxes. Its AcroForm field is `form1[0].Page1[0].c1_1[0]` (export value `1`). The existing descriptor printed the sales-tax amount in `f1_7` but left that checkbox blank.

The descriptor now derives the mark from a positive `line_5a_sales_tax` result. A source-to-PDF test runs the sales-tax input through the return graph, confirms the Schedule A output and election value, checks the field on the canonical PDF, fills and reloads the one-page form, and confirms the income-tax route leaves the election off. All five focused Schedule A PDF tests pass.

This closes the line 5a election mapping only. The full descriptor audit and prepared filled-PDF visual queue remain open. The canonical form also has line 8 use-of-proceeds and line 18 election checkboxes, which need source-backed review before they can be projected.
