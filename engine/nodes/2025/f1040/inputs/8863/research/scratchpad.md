# Form 8863 — Scratchpad

## Purpose

Captures all data needed to compute Education Credits — American Opportunity Credit (AOC) and Lifetime Learning Credit (LLC) — for eligible students on Form 8863, then routes the refundable portion to Form 1040 Line 29 and the nonrefundable portion to Schedule 3 Line 3.

## Fields identified (from Drake KB + IRS Form 8863 TY2025)

### Per-Student Fields (Part III — entered once per student)
- Line 20: Student name
- Line 21: Student SSN/TIN
- Line 22(a/b): Educational institution info (name, address, 1098-T checkbox, EIN) — up to 2 institutions; additional institutions require extra page 2
- Line 23: Has AOC been claimed for 4+ prior tax years? (Yes/No checkbox)
- Line 24: Was student enrolled at least half-time in a degree program in 2025? (Yes/No)
- Line 25: Did student complete first 4 years of postsecondary ed before 2025? (Yes/No)
- Line 26: Was student convicted of federal/state felony for controlled substance by end of 2025? (Yes/No)
- Line 27: AOC — adjusted qualified education expenses (max $4,000 cap on entry)
- Line 28: AOC — subtract $2,000 from line 27 (computed)
- Line 29: AOC — line 28 × 25% (computed)
- Line 30: AOC per-student tentative credit = if line 28=0 then line 27; else $2,000 + line 29 (computed, feeds Part I Line 1)
- Line 31: LLC — adjusted qualified education expenses (feeds Part II Line 10; no per-student cap at this point)

### Per-Return Fields (Parts I and II)
**Part I — Refundable AOC**
- Line 1: Sum of all Part III Line 30 values
- Line 2: MAGI ceiling ($180,000 MFJ / $90,000 other) — form pre-fills
- Line 3: Taxpayer MAGI (from Form 1040 line 11b or adjusted for foreign exclusions)
- Line 4: Line 2 minus Line 3 (if zero or less, stop — no credit)
- Line 5: Phase-out range ($20,000 MFJ / $10,000 other) — form pre-fills
- Line 6: Phase-out ratio = Line 4 ÷ Line 5, capped at 1.000 (3 decimal places)
- Line 7: Line 1 × Line 6 = reduced tentative AOC credit
- Line 7 checkbox: Under age 24 and "kiddie tax" conditions apply — treat entire as nonrefundable
- Line 8: Refundable AOC = Line 7 × 40%; goes to Form 1040 Line 29
- Line 9: Nonrefundable AOC portion = Line 7 − Line 8; enters Credit Limit Worksheet Line 2

**Part II — Nonrefundable LLC**
- Line 10: Sum of all Part III Line 31 values
- Line 11: Lesser of Line 10 or $10,000
- Line 12: Line 11 × 20% = tentative LLC
- Line 13: MAGI ceiling ($180,000 MFJ / $90,000 other) — form pre-fills
- Line 14: Taxpayer MAGI (same as Line 3)
- Line 15: Line 13 minus Line 14 (if zero or less, enter -0- on line 18, go to line 19)
- Line 16: Phase-out range ($20,000 MFJ / $10,000 other) — form pre-fills
- Line 17: Phase-out ratio = Line 15 ÷ Line 16, capped at 1.000
- Line 18: Line 12 × Line 17 = reduced LLC; enters Credit Limit Worksheet Line 1
- Line 19: Nonrefundable education credits from Credit Limit Worksheet Line 7; goes to Schedule 3 Line 3

**Credit Limit Worksheet (within instructions)**
- Line 1: Form 8863 Line 18 (LLC)
- Line 2: Form 8863 Line 9 (nonrefundable AOC portion)
- Line 3: Lines 1 + 2
- Line 4: Form 1040 Line 18 (regular tax)
- Line 5: Schedule 3 Lines 1 + 2 + 6d + 6l (prior nonrefundable credits)
- Line 6: Line 4 − Line 5
- Line 7: Lesser of Lines 3 or 6 → flows to Form 8863 Line 19

## Open Questions

- [x] Q: What fields does Drake show for this screen?
  → Drake combines all Form 8863 Part III fields per student plus Parts I/II calculations. Key data entry: student SSN, institution info, EIN, 1098-T received checkbox, adjusted qualified education expenses (for AOC and LLC separately), and the 4 eligibility Yes/No questions.
  Source: Drake KB article #12153, https://kb.drakesoftware.com/kb/Drake-Tax/12153.htm

- [x] Q: Where does each field flow on the 1040?
  → Refundable AOC (Form 8863 Line 8) → Form 1040 Line 29
  → Nonrefundable credits (Form 8863 Line 19) → Schedule 3 Line 3
  Source: Form 8863 (2025) face; Schedule 3 (2025) Line 3; Form 1040 (2025) Line 29

- [x] Q: What are the TY2025 constants (phase-out ranges, credit amounts, MAGI limits)?
  → AOC: max $2,500/student; phase-out $80,000–$90,000 single, $160,000–$180,000 MFJ (statutory — not in Rev Proc 2024-40 because not inflation-adjusted)
  → LLC: max $2,000/return; same phase-out range
  → These thresholds are the same as TY2024 (statutory, IRC §25A(d))
  Source: Form 8863 (2025) face; IRS i8863 (2025) pp.2–3, 7; p970 (2025) pp.10–11, 29

- [x] Q: What edge cases exist?
  → Felony drug conviction disqualifies AOC but not LLC
  → MFS filing status disqualifies both credits entirely
  → Nonresident alien disqualifies both credits
  → Under-age-24 "kiddie" rule converts AOC to all-nonrefundable
  → AOC limited to 4 tax years per student
  → 4-years-of-postsecondary-ed rule disqualifies AOC
  → Half-time enrollment required for AOC; any enrollment suffices for LLC
  → TIN deadline: filer and student must have TIN by return due date (incl. extensions)
  → MFJ only filers can claim if any spouse was nonresident alien only if they elect resident treatment
  Source: i8863 (2025) p.1–3; p970 (2025) ch.2–3

- [x] Q: How does the AOC 40% refundable portion work?
  → After phase-out, Line 7 = reduced tentative credit. Line 8 = Line 7 × 0.40 = refundable portion → Form 1040 Line 29. Line 9 = Line 7 − Line 8 = nonrefundable portion → Credit Limit Worksheet.
  → Exception: If taxpayer was under 24 at end of 2025 AND (a) under 18, OR (b) age 18 with earned income < half support, OR (c) age 18–24 full-time student with earned income < half support AND at least one parent alive AND not filing MFJ → entire credit is nonrefundable (check box on Line 7, skip Line 8, put Line 7 amount on Line 9).
  Source: i8863 (2025) pp.6–7; p970 (2025) pp.20–21

- [x] Q: What is the difference between AOC and LLC, and how does the engine choose?
  → Engine does NOT auto-choose. Taxpayer must indicate (via Drake checkbox) which credit to claim per student. Only one credit allowed per student per year. Both can be claimed on same return for different students.
  Source: i8863 (2025) p.2; Drake KB #12153

- [x] Q: How does the credit phase out by MAGI?
  → Phase-out ratio = (ceiling − MAGI) ÷ range, capped at 1.000
  → AOC: ceiling = $90,000 (single) or $180,000 (MFJ), range = $10,000 (single) or $20,000 (MFJ)
  → LLC: same ceilings and range
  → If MAGI ≥ ceiling → credit = $0 (stop — no credit)
  Source: Form 8863 (2025) Lines 2–7 and 13–18; p970 (2025) Worksheets 2-1, 3-1

- [x] Q: What information is needed per student vs. per return?
  → Per student (Part III): student ID, institution info, eligibility answers, adjusted expenses
  → Per return (Parts I/II): sum of per-student amounts, filer MAGI, phase-out calculation
  Source: i8863 (2025) specific instructions

- [x] Q: Does the taxpayer need Form 1098-T to claim the credit?
  → Generally yes, but exceptions exist: institution not required to issue (nonresident alien students, expenses paid entirely by scholarships, formal billing arrangement, no academic credit courses)
  → Can also claim if institution required but failed to provide and taxpayer requested it
  Source: i8863 (2025) pp.1–2 (Form 1098-T requirement section)

- [x] Q: What are the academic period requirements?
  → Expenses paid in 2025 for periods beginning in 2025 OR in first 3 months of 2026 qualify
  → Expenses paid in 2024 or 2026 (for 2026 periods after March) do NOT qualify
  Source: i8863 (2025) p.4 (Prepaid Expenses)

- [x] Q: How does the "first four years" rule for AOC work?
  → Check Form 8863 Line 25 (Yes/No). "Yes" = completed 4 years before 2025 = skip to Line 31 (LLC only). Educational institution determines year count. Credit for academic performance (proficiency exams) doesn't count toward 4 years.
  Source: i8863 (2025) pp.8–9

- [x] Q: What triggers Schedule 3 vs. refundable credit routing?
  → Refundable AOC (Line 8) → Form 1040 Line 29 (refundable credits section)
  → Nonrefundable portion (Line 19, from Credit Limit Worksheet) → Schedule 3 Line 3
  → LLC is entirely nonrefundable → Schedule 3 Line 3 only
  Source: Form 8863 (2025) Lines 8 and 19; Form 1040 (2025) Line 29; Schedule 3 (2025) Line 3

## Sources to check

- [x] Drake KB article #12153 — https://kb.drakesoftware.com/kb/Drake-Tax/12153.htm
- [x] IRS Form 8863 instructions (i8863.pdf) — https://www.irs.gov/pub/irs-pdf/i8863.pdf
- [x] IRS Form 8863 (f8863.pdf) — https://www.irs.gov/pub/irs-pdf/f8863.pdf
- [x] IRS Publication 970 (p970.pdf) — https://www.irs.gov/pub/irs-pdf/p970.pdf
- [x] Rev Proc 2024-40 — confirmed education credit phase-out thresholds NOT in Rev Proc (statutory, not inflation-adjusted)
- [x] Schedule 3 (f1040s3.pdf) — confirmed Line 3 receives education credits from Form 8863 Line 19
- [x] Form 1040 (f1040.pdf) — confirmed Line 29 receives refundable AOC from Form 8863 Line 8

## Notes on Line 11b vs 11a

Form 8863 (2025) references "Form 1040 or 1040-SR, line 11b" for MAGI. On the 2025 Form 1040, Line 11a = AGI, and Line 11b is a restatement of Line 11a in the standard deduction computation section. Both = AGI. Form 8863's reference to 11b is consistent with the MAGI being AGI (plus foreign income add-backs if applicable). Pub 970 Worksheets 2-1/3-1 say "line 11a." The engine should use AGI from Form 1040 Line 11a (the authoritative AGI line) before foreign income add-backs.
