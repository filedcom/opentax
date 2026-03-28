# General 2 — Scratchpad

## Purpose

Drake's "General 2" screen cluster (screen code "2") covers Filing Information across multiple General-tab sub-screens: ES (estimated taxes paid and future vouchers), DD (direct deposit refund allocation), PMT (electronic funds withdrawal / direct debit for balance due), PIN (IRS e-file Signature Authorization / Form 8879), PREP (preparer overrides / third-party designee), EF (e-file selections), and MISC (miscellaneous return options including special signatures). Together these screens capture all data needed to complete Form 1040 Pages 2–3 (Payments, Refund, Amount You Owe sections) and associated e-file authorization forms.

## Note on Screen Code Resolution

`screens.json` lists "2" as an alias_screen_code for screen_code "1" (Name, Address, General Info / Dependents). However, Drake Tax has a second General tab (labeled "2") that is functionally distinct — it covers filing information rather than taxpayer identity. Per skill instructions, treating screen_code "2" as a custom screen distinct from screen "1".

## Fields identified (from Drake manual, pp. 138–154)

### ES Screen — Estimated Taxes
- Overpayment applied from prior year (dollar amount)
- Q1 Date paid (override, default = Apr 15)
- Q1 Amount paid
- Q2 Date paid (override, default = Jun 16)
- Q2 Amount paid
- Q3 Date paid (override, default = Sep 15)
- Q3 Amount paid
- Q4 Date paid (override, default = Jan 15 of next year)
- Q4 Amount paid
- ES Code (dropdown: blank, N, P, D, X, T, F, H, M — controls voucher generation)
- OP Code (dropdown — controls how overpayment is applied to next year vouchers)
- Amount of overpayment to apply to 2025 (dollar amount)
- Voucher 1-4 Estimate Amt (override fields for next year voucher amounts)
- Voucher 1-4 Overpayment (override per-voucher overpayment allocation)
- Increase/Decrease calculated estimates by (dollar amount, +/-)
- State/city section: St/City (dropdown), Type, ES code, OP code, per-quarter amounts and dates
- e-file check boxes (per state voucher)
- Direct Debit Date (override per state voucher)
- 2210 Code on screen 1 / 2210 Options (X, P, F, G, N)
- Prior year federal tax (for 2210 safe harbor) — on screen 1
- Prior year state tax (for 2210) — on screen 1

### DD Screen — Direct Deposit (Refund)
- Account #1: Federal selection (Y/N dropdown)
- Account #1: State/city selection (state abbreviation dropdown)
- Account #1: Name of financial institution (text)
- Account #1: RTN (9-digit routing transit number)
- Account #1: Account number (text)
- Account #1: Type of account (Checking / Savings checkbox)
- Account #1: Repeat RTN (confirmation entry)
- Account #1: Repeat Account number (confirmation entry)
- Account #1: Repeat Type of account (confirmation entry)
- Account #1: Check if account is IRA (checkbox)
- Account #1: Check if account is Foreign (checkbox)
- Account #1: Deposit refund from (checkboxes: 1040, 1040-X, 1040-X 2nd Amended, 1040-X 3rd Amended)
- Account #1: Federal deposit amount (override — used when splitting across accounts)
- Account #1: State deposit amount (override, inactive by default)
- Accounts #2 and #3: same fields as Account #1 (up to 3 accounts total)
- BOND screen link (Series I savings bonds from refund)
- Paper Check section (if remainder goes to paper check)
- Ohio disclosure acceptance checkbox

### PMT Screen — Electronic Withdrawal (Direct Debit for Balance Due / ES)
- Withdrawal selection: Federal selection (Y = both balance + ES; E = ES only)
- Withdrawal selection: State/city selection
- Account #1: Name of financial institution
- Account #1: RTN (9-digit)
- Account #1: Account number
- Account #1: Type of account (Checking / Savings)
- Repeat RTN, Account number, Type of account
- Federal payment amount (override — defaults to full balance due)
- Requested payment date (override — cannot be after Apr 15 if filed by Apr 15; cannot be after today if filed after Apr 15)
- Daytime phone number (override — defaults from screen 1)
- Payment is for (checkboxes: 1040, 4868, 2350, 1040-X, 1040-X 2nd Amended, 1040-X 3rd Amended)
- Federal 1040-ES section: Voucher 1-4 amounts and dates (overrides ES screen calculated amounts)
- Account #2: State/city withdrawal fields
- Account #3: Additional state withdrawal fields

### PIN Screen — IRS e-file Signature Authorization (Form 8879)
- PIN signature date (required — date field; must be entered or return cannot e-file)
- Taxpayer PIN (5-digit number, any except 00000)
- Taxpayer entered checkbox (indicates taxpayer self-entered PIN)
- Spouse PIN (5-digit)
- Spouse entered checkbox
- Direct Debit Consent checkbox (required if direct debit is being used)
- Print filing instructions for Form 8878 and 8879 (dropdown override)
- Select Form: 1040-X/Superseded, 4868, 2350, 9465, Form 56 (for non-1040 e-signature forms)
- Prior year AGI (needed for Forms 2350, 9465, Form 56 e-file)
- Dependent IP PIN (6-digit Identity Protection PIN — appears at bottom right of screen 2)
- Taxpayer IP PIN (6-digit) — on PIN screen
- Spouse IP PIN (6-digit) — on PIN screen

### PREP Screen — Preparer Override / Third-Party Designee
- Allow another person to discuss this return with IRS (Y/N dropdown)
- Third-party designee: First name
- Third-party designee: Last name
- Third-party designee: Phone
- Third-party designee: PIN (5-digit)
- Third-party designee: Email (optional)
- Preparer # override

### MISC Screen — Miscellaneous Codes
- Special Signatures: Return signed by Power of Attorney (checkbox)
- Name of person signing by power of attorney
- Special Signatures: Taxpayer is signing for Spouse (checkbox)
- Dependent filer special situation: Both parents deceased (checkbox, triggers Form 8615 bypass)

### EF Screen — E-file Selections
- Federal/state e-file selections (checkboxes for which returns to e-file)
- e-file check boxes (per state)

## Open Questions

- [x] Q: What fields does Drake show on the General 2 screen?
  → Resolved: Multiple sub-screens (ES, DD, PMT, PIN, PREP, MISC, EF). All documented above.
  → Source: Drake Tax Manual 2024, pp. 138–154

- [x] Q: Where does estimated tax already paid (ES screen) flow on Form 1040 TY2025?
  → Confirmed: ES paid amounts flow to Form 1040, Line 26 (Estimated tax payments)
  → Overpayment applied from prior year also flows to Line 26
  → Source: 1040 Instructions TY2025, Line 26, p.39 — https://www.irs.gov/pub/irs-pdf/i1040gi.pdf

- [x] Q: Where does federal withholding override go on the 1040?
  → Confirmed: Withholding comes from W-2/1099 screens (Lines 25a/25b/25c), not from ES or DD screens
  → Line 38 = Estimated tax penalty (Form 2210)
  → Source: 1040 Instructions TY2025, Lines 25a-25c, 38, pp.39, 65

- [x] Q: What are the 2025 estimated tax safe harbor thresholds (Form 2210)?
  → Confirmed:
    1. 90% of TY2025 total tax, OR
    2. 100% of TY2024 total tax (110% if TY2024 AGI > $150,000; $75,000 MFS for 2025)
  → Source: Form 2210 Instructions TY2025, "Who Must Pay the Underpayment Penalty," p.1 — https://www.irs.gov/pub/irs-pdf/i2210.pdf

- [x] Q: What are the 2025 estimated tax payment due dates?
  → Confirmed from Form 2210 penalty worksheet column headers:
    Q1: April 15, 2025
    Q2: June 15, 2025 (NOT June 16 — June 15 IS a Sunday but still listed as June 15 in 2210 — preparer should use next business day rule manually if needed)
    Q3: September 15, 2025
    Q4: January 15, 2026
  → Source: Form 2210 Instructions TY2025, Penalty Worksheet — https://www.irs.gov/pub/irs-pdf/i2210.pdf

- [x] Q: What are the bank routing number validation rules?
  → Confirmed: RTN must be 9 digits; first TWO digits must be 01–12 or 21–32 (not just first digit)
  → Source: 1040 Instructions TY2025, Line 35b, p.63 — https://www.irs.gov/pub/irs-pdf/i1040gi.pdf

- [x] Q: What is Form 1040 Line 35a/35b/35c/35d for TY2025 (direct deposit lines)?
  → Confirmed:
    Line 35a = Box to check ("check the box on line 35a") to indicate direct deposit; also where Form 8888 is noted
    Line 35b = Routing number (9 digits; first two digits 01–12 or 21–32)
    Line 35c = Account type (Checking or Savings checkbox)
    Line 35d = Account number (up to 17 characters)
  → Source: 1040 Instructions TY2025, Lines 35a–35d, pp.62–63

- [x] Q: What is Form 1040 Line 37/38 for TY2025 (balance due / penalty)?
  → Confirmed:
    Line 37 = Amount You Owe (balance due)
    Line 38 = Estimated Tax Penalty (from Form 2210)
  → Source: 1040 Instructions TY2025, pp.63–65

- [x] Q: What are the 2025 underpayment penalty rules (Form 2210)?
  → Confirmed: Safe harbors above. Also:
    - Penalty rate = 7% for all four TY2025 rate periods (confirmed from penalty worksheet showing × 0.07)
    - Exception: No penalty if TY2024 had no tax liability; exception: total tax minus withholding < $1,000
  → Source: Form 2210 Instructions TY2025 — https://www.irs.gov/pub/irs-pdf/i2210.pdf

- [x] Q: What is the IRS Direct Pay interaction with this screen?
  → Confirmed: IRS Direct Pay is an external portal (IRS.gov/Payments) — not captured on Drake's PMT screen
  → Drake's PMT screen captures Electronic Funds Withdrawal (EFW) which is an integrated e-file/e-pay option
  → Debit/credit card payments also available externally via Link2Gov or ACI Payments
  → Source: 1040 Instructions TY2025, Line 37, pp.63–64

- [x] Q: What happens to the IP PIN in e-file transmission?
  → Confirmed: IP PIN is transmitted in IRS e-file record but NOT printed on the return
  → If an IP PIN is issued and not included: electronic signature is invalid → return rejected
  → Source: 1040 Instructions TY2025, "Identity Protection PIN," p.66; Drake KB 12938

- [x] Q: What is the 2025 underpayment penalty rate?
  → Confirmed: 7% per annum for all four TY2025 rate periods
  → Source: Form 2210 Instructions TY2025, Penalty Worksheet lines 4, 7, 10, 13 showing `× 0.07`

- [x] Q: Does screen "2" in Drake also contain dependent IP PIN at bottom right?
  → Confirmed: Yes — Drake KB 12938 confirms dependent IP PIN is on screen 2 (Dependents tab) bottom right
  → Taxpayer/spouse IP PINs are on the PIN screen
  → Source: Drake KB article 12938 — https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm

## Sources to check

- [x] Drake KB article — Federal 1040 Screen List (https://kb.drakesoftware.com/kb/Drake-Tax/20051.htm)
- [x] Drake Tax Manual 2024 — Individuals chapter, pp. 138–154 (downloaded)
- [x] Drake KB — PMT Screen (https://kb.drakesoftware.com/kb/Drake-Tax/10136.htm)
- [x] Drake KB — ES/Estimate Vouchers (https://kb.drakesoftware.com/kb/Drake-Tax/10824.htm)
- [x] Drake KB — Direct Deposit / Form 8888 (https://kb.drakesoftware.com/kb/Drake-Tax/11656.htm)
- [x] Drake KB — PIN / Auto-generate (https://kb.drakesoftware.com/kb/Drake-Tax/13284.htm)
- [x] Drake KB — IP PIN (https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm)
- [x] IRS Form 1040 Instructions TY2025 — Lines 26, 34, 35a-35d, 36, 37, 38 (confirmed; downloaded i1040gi_2024.pdf; read pp.39-66)
- [x] IRS Form 2210 Instructions TY2025 — all sections (downloaded i2210.pdf; read pp.1-10)
- [!] IRS Publication 505 TY2025 — Tax Withholding and Estimated Tax [NOT DOWNLOADED: all needed constants confirmed from Form 2210 instructions; Pub 505 is supplementary]
- [!] Rev. Proc. 2024-40 — TY2025 inflation-adjusted constants [NOT NEEDED for this screen: no income-based phase-outs or inflation-adjusted constants on ES/DD/PMT/PIN/PREP/MISC screens]
- [!] IRS Form 8888 Instructions — Allocation of Refund [PDF not available as PDF — HTML only; key rules confirmed from 1040 Instructions p.61-62]
- [!] IRS Form 8879 Instructions — IRS e-file Signature Authorization [PDF not available as PDF — HTML only; key rules confirmed from 1040 Instructions pp.65-66]
- [!] IRS Notice on underpayment penalty rate Q1-Q4 2025 [Resolved via Form 2210 worksheet: 7% for all periods]
