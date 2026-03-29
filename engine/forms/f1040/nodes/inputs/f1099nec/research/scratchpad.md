# 1099-NEC — Scratchpad

## Purpose

Captures data from Form 1099-NEC (Nonemployee Compensation). Routes Box 1 income
to Schedule C (most common), Schedule F (farming), Form 8919 (misclassified
worker), or Schedule 1 Line 8z (non-business income). Drives Schedule SE for
self-employment tax when net profit > $400.

## Fields identified (from Drake KB + IRS Instructions)

1. payer_name — string, required
2. payer_tin — string (EIN/SSN), required
3. recipient_tin — string (SSN/EIN), required
4. account_number — string, optional
5. second_tin_notice — boolean, optional
6. box1_nec — number ($), required — Nonemployee compensation ≥$600
7. box2_direct_sales — boolean, optional — checkbox for direct sales ≥$5,000
8. box3_golden_parachute — number ($), optional — NEW TY2025: excess parachute
   payments (moved from 1099-MISC Box 13)
9. box4_federal_withheld — number ($), optional — backup withholding only (24%)
10. box5_state_withheld — number ($), optional
11. box6_state_id — string, optional
12. box7_state_income — number ($), optional
13. for_routing — enum (Drake-specific): schedule_c / schedule_f / form_8919 /
    schedule_1_line_8z
14. multi_form_code — string (Drake-specific), optional

## Open Questions

- [x] Q: What fields does Drake show for this screen? ANSWER: Boxes 1–7,
      payer/recipient info, "For" dropdown, multi-form code. Source: Drake KB
      16952 + i1099mec.

- [x] Q: Where does each box flow on the 1040? ANSWER: Box 1: Sch C Line 1 / Sch
      F Line 8 / Form 8919 Lines 1-5 / Sch1 L8z (routing-dependent). Box 3: Sch1
      L8z + §4999 excise. Box 4: F1040 L25b. Boxes 5–7: state only.

- [x] Q: SS wage base for TY2025 ANSWER: $176,100. Source: SSA official
      announcement (https://www.ssa.gov/oact/cola/cbb.html); confirmed via IRS
      Topic 751.

- [x] Q: QBI deduction phase-out thresholds for TY2025 ANSWER: Phase-out begins:
      $197,300 (Single/other) / $394,600 (MFJ). Phase-out complete: $247,300
      (Single/other) / $494,600 (MFJ). Source: Form 8995 instructions 2025
      (https://www.irs.gov/instructions/i8995).

- [x] Q: What edge cases exist? ANSWER: Multiple NECs → same Sch C via MFC; Form
      8919 misclassification (reason codes A/C/G/H); Box 2 informational only;
      Box 3 new TY2025; backup withholding rules; corporations not required to
      file 1099-NEC (with exceptions).

- [x] Q: Does Box 1 always go to Schedule C, or can it go elsewhere? ANSWER: No.
      Drake "For" dropdown: Schedule C, Schedule F, Form 8919, Schedule 1 Line
      8z.

- [x] Q: When does Box 4 (federal withholding) apply? ANSWER: Backup withholding
      only (24%) — missing/invalid TIN or IRS B-Notice. NOT regular withholding.

- [x] Q: How does Box 5 (state withholding) route? ANSWER: State return only;
      not on 1040.

- [x] Q: What triggers Schedule SE? ANSWER: Net profit from Schedule C or F
      exceeding $400 triggers Schedule SE filing requirement.

- [x] Q: Does NEC income interact with QBI deduction (Form 8995)? ANSWER: Yes.
      Schedule C/F net profit is generally QBI-eligible under §199A, unless SSTB
      income over phase-out thresholds. Use Form 8995 (simple) or 8995-A
      (complex).

- [x] Q: Form 8919 reason codes and line-by-line computation ANSWER: Codes
      A/C/G/H. Line 6 = total wages → Form 1040 Line 1g. Line 11 = SS tax
      (6.2%), Line 12 = Medicare (1.45%), Line 13 = total → Schedule 2 Line 6.
      Source: taxinstructions.net/form-8919 + IRS about-form-8919.

- [x] Q: What is Schedule 1 Line 8z? ANSWER: "Other income" — catch-all for
      non-categorized income. Flows through Schedule 1 Line 10 → Form 1040
      Line 8. Source: IRS i1040gi.

- [x] Q: SE deduction (one-half of SE tax)? ANSWER: Schedule 1 Line 15 =
      Schedule SE Line 4 × 50%. Above-the-line deduction reducing AGI.

- [x] Q: What is the exact TY2025 Schedule 2 line for IRC §4999 excise tax (Box
      3)? ANSWER: Schedule 2 Line 17k ("Tax on golden parachute payments").
      Source: taxinstructions.net/schedule-2-form-1040/ (verified against search
      confirming 2025 Schedule 2 structure). All Schedule 2 lines confirmed: SE
      tax → Line 4; Form 8919 uncollected FICA → Line 6; golden parachute excise
      → Line 17k.

## Resolved Summary

All questions resolved. No open items remain. Research complete.
