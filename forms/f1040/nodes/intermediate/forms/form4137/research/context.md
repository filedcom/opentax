# Form 4137 (TY2025) implementation notes

The source input has one `forms` entry per tip recipient (`taxpayer` or
`spouse`). Each entry needs employer rows with a name, EIN or `Applied For`
status, total tips received, and tips reported. A W-2 contributes allocated tips
from box 8, social security wages and tips from boxes 3 and 7, and its employee
SSN when entered. The general return supplies taxpayer and spouse SSNs. Form
4137 matches explicit W-2 employee SSNs to those identities before assigning
wage-base or allocated-tip amounts. On a joint return with Form 4137 activity,
every W-2 needs its employee SSN for attribution; on a single return an omitted
W-2 SSN is assigned to the taxpayer. The calculation rejects allocated tips
without employer records, duplicate recipient forms, an unmatched W-2 SSN, and a
W-2 wage-base amount that disagrees with an explicit Form 4137 amount.

The calculation follows the numbered 2025 form:

| Line | Source or calculation                                                |
| ---- | -------------------------------------------------------------------- |
| 2    | Sum employer tips received                                           |
| 3    | Sum employer tips reported                                           |
| 4    | Line 2 minus line 3; Form 1040 line 1c and AGI                       |
| 5    | Unreported amounts from employer/month records below $20             |
| 6    | Line 4 minus line 5; Form 8959 line 2                                |
| 7    | 2025 social security wage base, $176,100                             |
| 8    | Recipient's W-2 boxes 3 and 7 total, or reconciled explicit amount   |
| 9    | Line 7 minus line 8, floored at zero                                 |
| 10   | Lesser of line 6 (less eligible government employee tips) and line 9 |
| 11   | Line 10 times 6.2%                                                   |
| 12   | Line 6 times 1.45%                                                   |
| 13   | Lines 11 and 12; Schedule 2 line 5                                   |

The MeF builder emits a separate `IRS4137` for each recipient. The PDF
descriptor makes a separate 2025 form copy per recipient, fills five employer
rows and lines 2-13, and appends a named, SSN-labeled continuation when there
are more than five employers. Those new joint-return and PDF cases are written
but remain unrun until the deferred full batch. Form 8959 receives the combined
Form 4137 line 6 amount, and its XML builder uses W-2 box 5 when box 5 differs
from box 1; source-to-XML cases are also unrun.

Line 5 now identifies the employer row and month, requires received tips below
$20, checks reported tips, rejects duplicate employer/month records, and
reconciles those records to annual employer totals. Those cases are written but
unrun.

Still open: employer names and EINs are not cross-checked against the filed
W-2s; railroad retirement compensation on line 8 is not modeled. The full test
batch, filled-PDF visual check, IRS business rules, and ATS acceptance are still
required.

Primary sources:
[2025 Form 4137 and instructions](https://www.irs.gov/pub/irs-pdf/f4137.pdf),
especially lines 1-13 and the separate-spouse/continuation instructions;
[2025 Form 8959](https://www.irs.gov/pub/irs-pdf/f8959.pdf), line 2.
