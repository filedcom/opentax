# 1099-K — Scratchpad

## Purpose

Capture all fields from Form 1099-K (Payment Card and Third Party Network Transactions) received by a taxpayer from a payment settlement entity (PSE), and route each field to the correct downstream node for federal and state tax reporting.

## Fields identified (from Drake)

### 99K Screen (State Use Only — States Tab)

The Drake 99K screen is used exclusively for **state e-file purposes**. States that require the source document for e-file use this screen to generate a copy of Form 1099-K. No data from the 99K screen flows to a federal form.

Fields on the 99K screen (state only):
- **Filer checkbox: PSE** — Check if filer is a Payment Settlement Entity
- **Filer checkbox: EPF** — Check if filer is an Electronic Payment Facilitator / Other Third Party
- **PSE Name** — Name of Payment Settlement Entity (only complete if EPF box is checked)
- **PSE Phone** — Phone of PSE (only complete if EPF box is checked; do NOT complete if PSE box is checked)
- **Transaction type checkboxes** — Payment card transactions / Third party network transactions
- **Account Number** — Payee account number
- **2nd TIN Notification checkbox**
- **Box 1a** — Gross amount of payment card / third party network transactions
- **Box 1b** — Card not present transactions
- **Box 2** — Merchant category code (MCC)
- **Box 3** — Number of payment transactions
- **Box 4** — Federal income tax withheld (for state record only — actual federal withholding entered on Screen 5, Line 25c)
- **Boxes 5a–5l** — Monthly gross transaction amounts (January–December)
- **Box 6** — State abbreviation
- **Box 7** — State ID number of filer
- **Box 8** — State income tax withheld ← ONLY field that flows to a state return

### Other Drake Screens for 1099-K Federal Reporting

Drake routes 1099-K federal income to other screens based on income type:

| Income Type | Drake Screen | Where It Goes |
|---|---|---|
| Business/self-employment income (sole proprietor/gig) | Screen C (Schedule C) | Schedule C, Line 1 (Gross Receipts) |
| Partnership income | Screen E | Schedule E |
| Rental income | Screen E | Schedule E |
| Farm income | Screen F | Schedule F |
| Personal item sold at loss / erroneous 1099-K (2024+) | Screen 3 (top entry space, T or S) | Schedule 1, entry space at top |
| Federal tax withheld (Box 4) | Screen 5, Line 25c | Form 1040, Line 25b |

## Open Questions

- [x] Q: What fields does Drake show for this screen?
  **A:** 99K screen has filer info (PSE/EPF checkboxes), transaction type checkboxes, account number, 2nd TIN notice, Boxes 1a, 1b, 2, 3, 4, 5a–5l, 6, 7, 8. Screen is state use only; only Box 8 flows to state return.
  Source: Drake KB 10520 — https://kb.drakesoftware.com/kb/Drake-Tax/10520.htm

- [x] Q: Where does each box flow on the 1040?
  **A:**
  - Box 1a gross amount → depends on income type: Schedule C Line 1, Schedule E, Schedule F, or Schedule 1 entry space (personal items)
  - Box 4 federal withholding → Screen 5 Line 25c → Form 1040 Line 25b
  - Box 8 state withholding → state return
  Source: Drake KB 10520, IRS 1099-K FAQs

- [x] Q: What are the TY2025 reporting thresholds for 1099-K?
  **A:** Due to the One Big Beautiful Bill (enacted 2025), TY2025 threshold for TPSOs is $20,000 AND 200+ transactions. Payment card transactions (credit/debit cards): NO minimum threshold — 1099-K always issued. TPSOs may still issue below threshold voluntarily.
  Source: IRS Fact Sheet 2025-08 (IR-2025-107, October 23, 2025) — https://www.irs.gov/pub/taxpros/fs-2025-08.pdf
  Also: IRS FAQ — https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000

- [x] Q: Does 1099-K income flow to Schedule C, Schedule 1, or directly to 1040?
  **A:** It depends on the income type. Business income → Schedule C Line 1. Hobby/other income → Schedule 1. Personal item sold at loss → Schedule 1 entry space at top. Personal item sold at gain → Form 8949 + Schedule D.
  Source: IRS "What to do with Form 1099-K" — https://www.irs.gov/businesses/what-to-do-with-form-1099-k

- [x] Q: What are the de minimis reporting thresholds for 2025?
  **A:** TPSOs: >$20,000 AND >200 transactions (reinstated by OBBB). Payment card processors: no de minimis threshold.
  Source: IRS IR-2025-107

- [x] Q: What edge cases exist (personal sales vs. business income)?
  **A:** Personal items sold at loss → non-deductible but must zero out on Schedule 1 entry space. Personal items sold at gain → Form 8949 / Schedule D. Erroneous/incorrect 1099-K → Schedule 1 entry space at top (matching income + offset = $0 net). Gifts/reimbursements from friends/family → not taxable, 1099-K received in error.
  Source: IRS 1099-K FAQs, TaxAdvocate guide

- [x] Q: How does Drake handle 1099-K when income is non-business (e.g., personal item sale)?
  **A:** Top of Screen 3, taxpayer (T) or spouse (S) field: enter amount reported on 1099-K that was included in error or for personal items sold at a loss. This flows to the entry space at the top of Schedule 1. Drake also allows Line 8z dropdown on Screen 3 with description "Form 1099-K Personal Item Sold at a Loss" or "Incorrect Form 1099-K" — Drake then auto-completes Line 24z with matching offset.
  Source: Drake KB 10520

- [x] Q: What is the interaction with Schedule C, Schedule E, Schedule 1?
  **A:**
  - Schedule C: Box 1a gross receipts included in Line 1 gross receipts for business income
  - Schedule E: rental or partnership income from 1099-K included
  - Schedule 1: personal item sales (entry space at top) or 1099-K errors
  Source: Drake KB 10520, IRS Instructions for Schedule C (2025)

- [x] Q: Are there any TY2025 threshold changes from prior years?
  **A:** Yes — significant. Originally, $600 threshold (from ARPA 2021) was being phased in. IRS issued transition relief in Notice 2024-85 setting $2,500 for TY2025. Then the One Big Beautiful Bill retroactively reinstated the pre-ARPA $20,000 / 200 transaction threshold. So the effective TY2025 threshold is $20,000 AND 200+ transactions for TPSOs.
  Source: IRS IR-2025-107, https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000

- [x] Q: How does multiple 1099-K handling work (multiple payers)?
  **A:** Multiple 1099-K forms received from different PSEs are aggregated when reporting. For Schedule C, all 1099-K gross amounts are summed in gross receipts. For personal items at loss, combined amounts are reported together in Schedule 1 entry space. For state withholding, each 99K screen entry captures state withholding per payer.
  Source: IRS 1099-K FAQs

## Sources to check

- [x] Drake KB article for 99K screen — https://kb.drakesoftware.com/kb/Drake-Tax/10520.htm
- [x] IRS Form 1099-K instructions (i1099k.pdf) — https://www.irs.gov/instructions/i1099k
- [x] IRS "What to do with Form 1099-K" — https://www.irs.gov/businesses/what-to-do-with-form-1099-k
- [x] IRS 1099-K FAQs — https://www.irs.gov/newsroom/form-1099-k-faqs
- [x] IRS 1099-K common situations — https://www.irs.gov/newsroom/form-1099-k-faqs-common-situations
- [x] IRS "Understanding your Form 1099-K" — https://www.irs.gov/businesses/understanding-your-form-1099-k
- [x] IRS Taxpayer Advocate 1099-K page — https://www.taxpayeradvocate.irs.gov/get-help/filing-returns/i-received-a-form-1099-k/
- [x] IRS Fact Sheet 2025-08 (OBBB threshold change) — https://www.irs.gov/pub/taxpros/fs-2025-08.pdf
- [x] IRS FAQ on OBBB threshold — https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000
- [x] IRS Schedule C instructions (2025) — https://www.irs.gov/instructions/i1040sc
- [x] IRS Topic 307 backup withholding — https://www.irs.gov/taxtopics/tc307
- [x] Drake 2025 changes KB — https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm
- [x] IRS actions for erroneous 1099-K — https://www.irs.gov/newsroom/actions-to-take-if-a-form-1099-k-is-received-in-error-or-with-incorrect-information

## Notes on Threshold History (Important for Context)

| Tax Year | Threshold | Authority |
|---|---|---|
| Pre-2022 | $20,000 + 200 transactions | Pre-ARPA law |
| 2022 | $600 (per ARPA 2021) — IRS delayed enforcement | Notice 2023-10 |
| 2023 | $600 — IRS delayed again; $20K still applied | Notice 2023-74 |
| 2024 | $5,000 transitional | Notice 2024-85 |
| 2025 | $2,500 transitional (under Notice 2024-85) — THEN retroactively changed to $20,000 + 200 by OBBB | IRS IR-2025-107, IRS Fact Sheet 2025-08 |
| 2026+ | $20,000 + 200 transactions | OBBB |
