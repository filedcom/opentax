# TY2025 Schedule R age-only filing routes

The [2025 Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf)
uses box 1 for a qualifying single, head-of-household, or surviving-spouse
taxpayer age 65 or older; box 3 for two older joint filers; box 7 for one
older joint filer whose spouse did not retire on disability; and box 8 for an
older separate filer who lived apart from the spouse throughout 2025. The
respective line 10 amounts are $5,000, $7,500, $5,000, and $3,750. The
[instructions](https://www.irs.gov/pub/irs-prior/i1040sr--2025.pdf) set the
line 15 AGI thresholds at $7,500, $10,000, $10,000, and $5,000.

The age-only native and PDF routes now select those distinct boxes and use
those amounts. A positive return requires reviewed age-source references for
each older owner, a filed Form 1040 age and filing-status match, and, for
separate filers, a source reference and filed all-year-apart fact. Nontaxable
Social Security reconciles to Form 1040 lines 6a/6b; positive line 13b
benefits need source references and explicit review that they are qualifying
nontaxable pensions or veterans' pensions, rather than excluded military
disability payments. Schedule R line 22 must equal the calculated credit after its line 21
tax-liability limit and match Schedule 3 line 6d. The final Form 1040 credit
guard now permits an older joint-filing spouse and rejects a separate-filer
credit without all-year separation. Whole-dollar rounding is applied to the
line 17 half-AGI amount and line 20 credit.

Focused calculation, native, and PDF cases for these age-only statuses are
written but unrun under the implementation-first workflow. A complete
source-backed full-return XSD/filled-PDF case for each new status, verified
underlying document bytes, disability boxes 2/4/5/6/9 and physician evidence,
all combinations of Schedule 3 priorities, business rules, and ATS remain
open. This route does not establish whole-form Schedule R support.
