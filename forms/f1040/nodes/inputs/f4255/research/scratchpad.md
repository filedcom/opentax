# Form 4255 — Recapture of Investment Credit — Research Scratchpad

## IRS Source
- Form 4255 PDF: https://www.irs.gov/pub/irs-pdf/f4255.pdf
- Instructions: https://www.irs.gov/instructions/i4255
- IRC §50(a) — recapture of investment credit on early disposition

## Drake Software KB
- Screen code: 4255
- Drake screen accepts one entry per qualifying property being recaptured

## Core Rule — IRC §50(a)
When property on which an investment credit (§46) was claimed is disposed of or
ceases to qualify before the end of a 5-year recapture period, a portion of the
credit is recaptured as additional tax on Schedule 2.

## Recapture Percentages (§50(a)(1))
| Year Disposed | % Recaptured |
|---------------|-------------|
| Year 1        | 100%        |
| Year 2        | 80%         |
| Year 3        | 60%         |
| Year 4        | 40%         |
| Year 5        | 20%         |
| After Year 5  | 0%          |

"Year 1" = disposed in the same year as placed in service or before the end of
the first full year. The year number is determined by the tax year of disposal
relative to the tax year the property was placed in service.

## Fields per Property (Form 4255 structure)
1. Description of property (column a)
2. Date placed in service (column b) — YYYY-MM-DD
3. Original credit amount taken (column e)
4. Year of recapture (1–5) (column f) — determines percentage
5. Recapture reason code — why the property ceased to qualify
6. Recapture amount = original_credit × recapture_percentage

## Recapture Amount Calculation
recapture_amount = original_credit_amount × recapture_percentage(year_of_recapture)

Taxpayer may override the computed recapture amount if they have a different basis.
The node always computes from original_credit × percentage unless an override is given.

## Output
- Routes to Schedule 2, Line 17a — Recapture of investment credit (Form 4255)
- All property recapture amounts aggregate before routing

## TY2025 Notes
- No changes to §50(a) recapture percentages for TY2025
- Investment credits subject to recapture include: ITC, rehabilitation credit (§47),
  energy credit (§48), qualifying advanced coal project credit (§48A), qualifying
  gasification project credit (§48B)
- If property is destroyed by casualty and replaced, no recapture required (§50(a)(2)(C))
