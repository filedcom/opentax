# Form 9465 — Installment Agreement Request — Scratchpad

## Purpose
Form 9465 is filed by taxpayers who cannot pay the full amount owed on their return and wish to establish a monthly installment agreement with the IRS. Purely administrative — no tax computation outputs.

## Fields identified
- amount_owed: balance due on return (Form 1040 Line 37 / amount due)
- monthly_payment: proposed monthly payment amount
- payment_day: proposed day of month (1–28 per IRS instructions)
- bank_routing_number: 9-digit ABA routing number (DDIA only)
- bank_account_number: bank account number (DDIA only)
- direct_debit: DDIA flag (lower user fee)
- prior_installment_agreement: prior IA in past 5 years (affects user fee category)
- low_income: at/below 250% federal poverty level (reduced/waived user fee)

## Open Questions
- [x] Q: What fields does this node capture or receive?
  A: 8 optional fields from user data entry. All are from the Form 9465 itself.
- [x] Q: Where does each field flow on the 1040?
  A: Nowhere — Form 9465 is a standalone IRS request. No 1040 line is affected.
- [x] Q: What are the TY2025 constants?
  A: payment_day: 1–28. User fees: $130 non-DDIA, $31 DDIA, $0 low-income DDIA,
     $43 low-income non-DDIA (Rev Proc 2024-1). Min payment = balance ÷ 72.
- [x] Q: What edge cases exist?
  A: payment_day must be 1–28 (not 29–31). Negative amounts rejected by schema.
     DDIA needs routing+account fields (cross-field rule not enforced — intentional).
     No outputs regardless of input combination.
- [x] Q: What upstream nodes feed into this node? (intermediate only)
  A: N/A — INPUT node. All data from user entry.

## Sources checked
- [x] Drake KB — screen code "9465" confirmed
- [x] IRS Form 9465 instructions (i9465.pdf)
- [x] Rev Proc 2024-1, Appendix A — user fee schedule
- [x] Notice 2017-72 — low-income waiver rules
