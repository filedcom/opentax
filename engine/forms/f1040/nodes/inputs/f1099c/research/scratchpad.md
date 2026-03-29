# 1099-C Cancellation of Debt — Scratchpad

## Purpose

Capture data from Form 1099-C (Cancellation of Debt) issued by a lender when a
debt of $600 or more is cancelled/forgiven, so the cancelled amount can be
reported as ordinary income on Schedule 1 line 8c (nonbusiness) or the
appropriate business schedule — or excluded from income via Form 982 when one of
six exclusions applies.

## Fields identified (from Drake + IRS 1099-C form)

From Form 1099-C (IRS Instructions, April 2025 revision):

- Box 1: Date of identifiable event (date — MM/DD/YYYY)
- Box 2: Amount of debt discharged (dollar amount — primary income field,
  required)
- Box 3: Interest included in Box 2 (optional dollar amount — informational,
  included in Box 2 total)
- Box 4: Debt description (text — e.g., "mortgage", "credit card")
- Box 5: Debtor was personally liable (checkbox — recourse vs. nonrecourse debt)
- Box 6: Identifiable event code (enum A–H)
- Box 7: Fair market value of property (dollar amount — used for
  foreclosures/short sales)

Drake-specific fields:

- "For" field: routing selector (blank = taxable income; "982" = excluded,
  triggers Form 982 requirement)

## Open Questions — All Resolved

- [x] Q: What fields does Drake show for the 99C screen? ANSWER: Box 1–7 from
      Form 1099-C plus Drake "For" field. Confirmed via IRS 1099-C Instructions
      (April 2025) and Drake KB #11715. Source:
      https://www.irs.gov/instructions/i1099ac;
      https://kb.drakesoftware.com/kb/Drake-Tax/11715.htm

- [x] Q: Where does each box flow on the 1040? ANSWER: Box 2 flows to Schedule 1
      line 8c (nonbusiness), Schedule C line 6 (sole prop), Schedule E line 3
      (rental), Form 4835 line 6 (farm rental), Schedule F line 8 (farm). If
      excluded: Form 982 line 2. Box 7 → Schedule D or Form 4797 for gain/loss.
      Source: Pub 4681 (2025) https://www.irs.gov/publications/p4681

- [x] Q: What are the TY2025 constants/thresholds? ANSWER: $600 reporting
      threshold; QPRI limit $750k MFJ / $375k MFS (STATUTORY FIXED, not
      inflation-adjusted); QPRI expires after 12/31/2025; farm test = 50%+
      receipts for each of 2022/2023/2024; credits reduced at 33⅓ cents per
      dollar on Form 982. Source: Pub 4681 (2025); Form 982 Instructions
      (Dec 2021)

- [x] Q: What edge cases exist? ANSWER: Multiple 1099-Cs (one Form 982 per
      return in Drake), MFS joint debt (proportionate share, independent
      insolvency test), recourse vs. nonrecourse (different gain/loss
      treatment), 1099-A + 1099-C coordination (avoid double-counting), QPRI
      expiration after 12/31/2025, student loan exclusion changes (2021-2025
      temporary expansion ends), Section 108(i) election (legacy 2009-2010
      only), bankruptcy priority rule (stops all other exclusion testing), Line
      5 election (depreciable property basis first). Source: Pub 4681 (2025);
      Drake KB #11374

- [x] Q: Does 99C flow through Form 982? ANSWER: Yes, when "For" = "982" in
      Drake. Form 982 Part I lines 1a–1e (exclusion type), line 2 (excluded
      amount), Part II lines 4, 5, 6–13 (tax attribute reductions), line 10b
      (QPRI basis reduction). Source: Form 982 Instructions (Dec 2021); Drake KB
      #11374

- [x] Q: Is Schedule B or any other schedule involved? ANSWER: Schedule B is NOT
      involved. COD income flows to Schedule 1 line 8c (nonbusiness) or directly
      to Schedule C/E/F (business). Form 4797 for business property gain/loss.
      Schedule D for personal property gain/loss.

- [x] Q: What is the relationship between 1099-C and 1099-A? ANSWER: 1099-A may
      be issued in a prior year for the same property transaction. 1099-C then
      triggers COD income in a later year. Coordinate amounts to avoid
      double-counting. Drake 99A screen handles 1099-A separately. Source: Pub
      4681 (2025); Drake KB #10908

- [x] Q: What are the specific Form 982 Part II lines for each tax attribute
      (verify exact line numbers for 2025 form)? ANSWER: Lines 6 (NOL), 7
      (general business credit, 33⅓ rate), 8 (min tax credit, 33⅓ rate), 9 (net
      capital loss), 10a (property basis), 10b (principal residence only when 1e
      checked), 11a (farm depreciable), 11b (farm land), 11c (farm other), 12
      (passive activity loss/credit), 13 (foreign tax credit, 33⅓ rate). Form
      982 Rev. March 2018 is current form. Source: Form 982 Instructions (Rev.
      Dec 2021); taxinstructions.net; search results confirming lines

- [x] Q: Does the insolvency worksheet have a specific Drake screen or is it
      manual? ANSWER: The insolvency worksheet is a Pub 4681 worksheet — it is
      NOT a separate Drake screen. Taxpayer completes the worksheet manually (or
      on a supporting worksheet), then the result (insolvency amount) is used to
      determine the exclusion entered on the Drake 982 screen, line 1b and
      line 2. Drake does not have a dedicated WKSI insolvency worksheet screen
      confirmed in the KB articles. Source: Drake KB #11374; Pub 4681 (2025)
      Insolvency Worksheet (38-line worksheet embedded in publication)

- [x] Q: What is the exact Drake screen name / code for Form 982? ANSWER: Drake
      screen is named "982". Accessed from the 99C screen by a link "beneath
      line 7 on the right side of the 99C screen." The 982 screen has Part I
      General Information with checkboxes A–E, and tax attribute reduction
      fields. Source: Drake KB #11715; Drake KB #11374

- [x] Q: For business debt routing (Schedule C/E/F) — does Drake handle this
      automatically or does the user manually select the business schedule?
      ANSWER: The "For" field on the 99C screen only controls taxable vs.
      excluded routing. For taxable business COD income, the user must manually
      route to the appropriate business schedule based on Box 4 (debt
      description) and the nature of the business. Pub 4681 provides the routing
      rules by debt type. The coding agent must implement this routing logic
      based on the debt type determination. Source: Pub 4681 (2025); Drake KB
      #11715

- [x] Q: Are there any TY2025-specific changes to the student loan exclusion
      rules? ANSWER: The 2021–2025 temporary expansion ends after 12/31/2025.
      After 2025: SSN required for death/disability student loan discharge
      exclusion. These are the key TY2025 changes. No new expansion provisions
      for 2025. Source: Pub 4681 (2025) Student Loans exception; 1099-C
      Instructions (April 2025)

- [x] Q: Does Rev Proc 2024-40 include any COD-specific inflation adjustments?
      ANSWER: No. The $600 reporting threshold and $750k/$375k QPRI limits are
      statutory fixed amounts under IRC §108, not inflation-adjusted. Rev Proc
      2024-40 does not include Section 108 adjustments. Source: Search results
      confirming QPRI = statutory fixed; IRC §108(h)(2)

## Sources Used

1. Drake KB #11715 — 1099-C: Cancellation of Debt and Form 982 —
   https://kb.drakesoftware.com/kb/Drake-Tax/11715.htm
2. Drake KB #11374 — Form 982 FAQ —
   https://kb.drakesoftware.com/kb/Drake-Tax/11374.htm
3. Drake KB #10908 — 1099-A Data Entry —
   https://kb.drakesoftware.com/kb/Drake-Tax/10908.htm
4. IRS Instructions for Forms 1099-A and 1099-C (April 2025) —
   https://www.irs.gov/instructions/i1099ac
5. IRS Publication 4681 (2025) — https://www.irs.gov/publications/p4681
6. IRS Form 982 Instructions (Rev. December 2021) —
   https://www.irs.gov/instructions/i982
7. Form 982 (Rev. March 2018, current) —
   https://www.irs.gov/pub/irs-pdf/f982.pdf
8. Schedule 1 (Form 1040) 2025 — https://www.irs.gov/pub/irs-pdf/f1040s1.pdf
9. taxinstructions.net Form 982 (2025-2026 summary) —
   https://taxinstructions.net/form-982/

## Downloaded PDFs

- i1099ac.pdf — IRS Instructions for Forms 1099-A and 1099-C
- i982.pdf — IRS Form 982 Instructions
- p4681.pdf — IRS Publication 4681
- f982.pdf — IRS Form 982
- f1040s1.pdf — Schedule 1 (Form 1040)
