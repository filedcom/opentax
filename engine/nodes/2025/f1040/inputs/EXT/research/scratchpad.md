# Form 4868 (EXT) — Scratchpad

## Purpose

Captures the taxpayer's request for an automatic 6-month extension of time to
file Form 1040 (or 1040-SR, 1040-NR, 1040-SS), including an estimate of total
tax liability, total payments already made, the resulting balance due, and any
payment remitted with the extension. The engine uses these inputs to generate
Form 4868 and to credit any extension payment on Schedule 3, Line 10 of the
final return.

## Fields identified (from Drake EXT screen + Form 4868 instructions)

**Drake EXT screen software controls:**

1. produce_4868 — dropdown ("X" to produce Form 4868)
2. extension_previously_filed — checkbox (Drake flag; switches EF mode from 4868
   to 1040)
3. produce_1040v — checkbox (generates 1040-V voucher)
4. amount_on_1040v — dollar override for voucher amount

**Part I — Identification (pulled automatically from Screen 1):**

- Line 1: Name(s)
- Line 2: Taxpayer SSN (or EIN for estate/trust)
- Line 3: Spouse SSN (MFJ)
- Address / city / state / ZIP

**Part II — Individual Income Tax (data-entry fields on EXT screen):** 5.
line_4_total_tax — estimated total tax liability for 2025 6.
line_5_total_payments — estimated total payments for 2025 (excluding amount
paying with this form) 7. line_6_balance_due — COMPUTED (Max(0, Line 4 - Line
5)); display only, not data entry 8. line_7_amount_paying — dollar amount
remitted with extension 9. line_8_out_of_country — boolean checkbox 10.
line_9_1040nr_no_wages — boolean checkbox

**Payment method details (captured in PMT / IFP screens, not on EXT):**

- Direct debit: RTN, account number, account type, requested payment date (PMT
  screen)
- Credit/debit card: IFP screen
- Check/money order: produces paper Form 4868 or 1040-V voucher

## Open Questions — ALL RESOLVED

- [x] Q: What fields does Drake show for the EXT screen? → Resolved: See "Fields
      identified" section above. Drake KB 11761.

- [x] Q: Where does each field flow on the 1040? → Resolved:
      line_7_amount_paying flows to Schedule 3 Line 10 → Sch 3 Line 15 → 1040
      Line 31 → 1040 Line 32 → 1040 Line 33. Verified against 2025 Schedule 3
      (f1040s3.pdf) and Form 1040 (f1040.pdf).

- [x] Q: What are the TY2025 constants (extension deadline, payment rules)? →
      Resolved: Original due date April 15, 2026. Extended due date October
      15, 2026. Out-of-country automatic to June 15 (2 extra months), then 4
      months more to October 15 via Form 4868. Additional discretionary 2-month
      extension to December 15 by letter only. Minimum late-filing penalty $525
      (Rev. Proc. 2024-40 §.53).

- [x] Q: Does Form 4868 affect any 1040 line directly? → Resolved: Not directly.
      Form 4868 is a standalone filing. The amount paid (Line 7) credits on
      Schedule 3 Line 10 when the actual return is filed.

- [x] Q: What triggers Form 8878? → Resolved: Required when (a) Practitioner PIN
      method for 4868 e-file, or (b) ERO authorized to enter/generate taxpayer
      PIN for direct debit. Not required if no direct debit or if taxpayer
      enters own PIN. See Form 8878 (2025) decision chart.

- [x] Q: Are there special rules for taxpayers abroad? → Resolved: U.S.
      citizens/residents living/working outside U.S. get automatic 2-month
      extension (no Form 4868 needed) to file AND pay by June 15, 2026. Interest
      still accrues from April 15. Late-payment penalty starts June 15 (not
      April 15) for 2-month auto-extension users. File Form 4868 by June 15 for
      4 additional months (to October 15). Check Line 8. If need more than 6
      months: use Form 2350. If still can't file by October 15: send letter to
      IRS by October 15 for 2 more months (to December 15).

- [x] Q: How does the EXT screen interact with STEX? → Resolved: STEX is a
      separate Drake screen that handles state/city extensions. EXT handles the
      federal Form 4868 only. The EF screen can be configured to control state
      e-file options.

- [x] Q: What are the interest and penalty rates? → Resolved: Late payment:
      0.5%/month, max 25%. Late filing: 5%/month, max 25%. Minimum late filing
      if >60 days: $525 (TY2025, Rev. Proc. 2024-40 §.53). 90% safe harbor: if
      90% of tax paid by due date + balance with return, late-payment penalty
      waived. Interest always accrues from original due date (April 15, 2026)
      regardless of extension or safe harbor.

- [x] Q: What is the e-file schema element structure for Form 4868? → Resolved
      partially: MeF schema for Form 4868 v4.0 exists (release memo
      November 2025) but actual XML schema elements require registered
      e-Services access via Secure Object Repository. The key fields are the
      ones from the form: total tax, total payments, balance due, amount paying,
      and the checkboxes. The engine should map to these fields.

- [x] Q: Does filing 4868 affect underpayment penalty (Form 2210)? → Resolved: A
      payment made with Form 4868 by April 15, 2026 counts in Form 2210 Part III
      Section A Line 11 column (a) — the "payments made through April 15"
      column. This means the extension payment helps satisfy the Form 2210
      installment requirement. The Form 2210 underpayment penalty is separate
      from the 4868 late-payment penalty and uses different safe-harbor rules
      (90% of current year OR 100%/110% of prior year tax, whichever is
      smaller).

- [x] Q: MFJ vs separate returns for extension payments? → Resolved: See
      Calculation Logic Step 6. Joint 4868 then separate returns: allocate
      payment in any agreed amounts. Separate 4868s then joint return: sum both
      payments, enter total on Schedule 3 Line 10.

- [x] Q: What is the fiscal year extension rule? → Resolved: Fiscal year
      taxpayers must file paper Form 4868. Due date = 15th day of 4th month
      after fiscal year end. Extension = 6 months from that due date.

- [x] Q: Does the extension cover only the filing deadline, not the payment
      deadline? → Confirmed: Extension is ONLY for filing. Tax payment due by
      original due date (April 15, 2026 for most filers). Exception:
      out-of-country filers with 2-month automatic extension have until June 15
      to pay without late-payment penalty (but interest starts April 15).

- [x] Q: What is Form 8892 and when does it apply? → Resolved: Form 8892 handles
      payment of gift/GST tax. Filing Form 4868 extends the FILING deadline for
      Form 709/709-NA but NOT the payment deadline. If gift/GST tax is owed,
      file Form 8892 separately.

- [x] Q: What is Form 2350 and how does it differ from 4868? → Resolved: Form
      2350 is for overseas filers who need time to meet bona fide residence or
      physical presence tests (to qualify for foreign earned income exclusion
      via Form 2555). Form 2350 can extend beyond 6 months. Form 4868 is capped
      at 6 months from original due date. Use 2350 when the taxpayer expects to
      qualify for FEIE but won't meet the test by October 15.

## Sources checked

- [x] Drake KB article — https://kb.drakesoftware.com/kb/Drake-Tax/11761.htm
- [x] Form 4868 (2025) — https://www.irs.gov/pub/irs-pdf/f4868.pdf (saved as
      f4868.pdf)
- [x] Form 8878 (2025) — https://www.irs.gov/pub/irs-pdf/f8878.pdf (saved as
      f8878.pdf)
- [x] Schedule 3 (Form 1040) (2025) —
      https://www.irs.gov/pub/irs-pdf/f1040s3.pdf (saved)
- [x] Form 1040 (2025) — https://www.irs.gov/pub/irs-pdf/f1040.pdf (saved)
- [x] 1040 General Instructions (2025) —
      https://www.irs.gov/pub/irs-pdf/i1040gi.pdf (saved)
- [x] Form 2210 Instructions (2025) — https://www.irs.gov/pub/irs-pdf/i2210.pdf
      (saved)
- [x] Publication 54 (12-2025) — https://www.irs.gov/pub/irs-pdf/p54.pdf (saved)
- [x] Rev. Proc. 2024-40 — §.53 minimum late-filing penalty $525 (saved as
      rp-24-40.pdf)
- [x] IRS Topic 304 — https://www.irs.gov/taxtopics/tc304
- [x] MeF release memo for Form 4868 v4.0 —
      https://www.irs.gov/e-file-providers/release-memo-for-tax-year-2025-modernized-e-file-schema-and-business-rules-for-form-4868-version-4-point-0
