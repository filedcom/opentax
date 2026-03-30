# Form 4852 Research Scratchpad

## Sources
- IRS About Form 4852: https://www.irs.gov/forms-pubs/about-form-4852
- IRS Form PDF: https://www.irs.gov/pub/irs-pdf/f4852.pdf
- Drake Software KB: https://kb.drakesoftware.com/kb/Drake-Tax/11094.htm
- TeachMePersonalFinance instructions: https://www.teachmepersonalfinance.com/irs-form-4852-instructions/

## Raw Notes

### What is Form 4852?
- Substitute for Form W-2, Form W-2c, OR Form 1099-R (original or corrected)
- Filed when employer/payer fails to issue or issues an incorrect W-2 or 1099-R
- Taxpayer must try to get the original form first; contact IRS if not received by end of February
- One Form 4852 per employer/payer (like W-2/1099-R, can have multiple)
- IRS may delay refund until February 15 to allow time to receive W-2

### Form Structure
Lines 1-3: Taxpayer identifying info (name, SSN, address)
Line 4: Tax year + checkbox for which form this substitutes (W-2 or 1099-R)
Lines 5-6: Employer/payer name, address, TIN

Line 7: W-2 SUBSTITUTE (if box checked on line 4)
  - 7a: Wages, tips, other compensation (W-2 box 1)
  - 7b: Federal income tax withheld (W-2 box 2)
  - 7c: Social security wages (W-2 box 3)
  - 7d: Social security tax withheld (W-2 box 4)
  - 7e: Medicare wages and tips (W-2 box 5)
  - 7f: Medicare tax withheld (W-2 box 6)
  - 7g: Social security tips (W-2 box 7)
  - 7h: Allocated tips (W-2 box 8)
  - Additional state/local fields (informational)

Line 8: 1099-R SUBSTITUTE (if box checked on line 4)
  - 8a: Gross distribution (1099-R box 1)
  - 8b: Taxable amount (1099-R box 2a)
  - 8c: Federal income tax withheld (1099-R box 4)
  - 8d: Distribution code (1099-R box 7)
  - 8e: IRA/SEP/SIMPLE checkbox (1099-R box 7 IRA flag)
  - Additional state fields

Line 9: How were amounts determined (narrative)
Line 10: Efforts to obtain original form (narrative)

### How 4852 flows to 1040
- Part I (W-2 substitute): flows EXACTLY like a regular W-2
  - Wages → 1040 line 1a
  - Federal withheld → 1040 line 25a (W-2 withholding)
  - SS/Medicare → Schedule 2 etc. (same as W-2)
- Part II (1099-R substitute): flows EXACTLY like a regular 1099-R
  - Gross/taxable pension → 1040 line 5a/5b
  - IRA distribution → 1040 line 4a/4b
  - Federal withheld → 1040 line 25b (1099-R withholding)

### TY2025 Notes
- Form 4852 was last revised September 2020 — no structural changes for 2025
- The IRS allows e-filing with Form 4852 if EIN is known; otherwise paper only
- Drake implements by linking to W-2 or 1099-R screen first, then 4852 screen adds the two narrative fields

### Design Decision: Scope for Tax Engine
For the tax engine, we care about the NUMERIC fields that affect tax computation:
- W-2 substitute: wages + fed withheld (SS/Medicare handled by separate payroll calculations if needed)
- 1099-R substitute: gross distribution, taxable amount (optional), fed withheld, distribution code, IRA checkbox

For simplicity vs. the full W-2 node complexity (SS/Medicare/tips/etc.), Form 4852 in the engine should:
1. Support Part I (W-2 substitute): wages + federal withheld → same f1040 lines as W-2
2. Support Part II (1099-R substitute): gross dist, taxable amount, fed withheld, distribution code, IRA flag → same f1040 lines as 1099-R
3. NOT duplicate the full W-2 SS/Medicare complexity (4852 is a substitute; the simplified method is appropriate)
4. Each 4852 item specifies which form it substitutes via `form_type` enum
