# TY2026 ATS Form 1040 scenario 2 fixture contract

Source: pinned [13-page IRS draft scenario 2 packet](corpus/ats/1040-scenario-02.pdf),
SHA-256 `b2d58c490b489294cb80137c5755e28f2bba806aa9329248311b81e58d932915`.
The statutory-employee route is supported by final [2026 Publication 15-A](corpus/authorities/p15a--2026.pdf)
(`3486cf0ad83401494aa57c688ffb411346ef399bd8202317c1eb3e6d41575c2e`)
and the pinned [draft 2026 Schedule SE instructions](corpus/draft/i1040sse.pdf).
The packet's December 2025 revision of [Form 8283](corpus/authorities/f8283--2025.pdf)
(`389ab1b7c01b542724092f82a55dd43ab00792770b5254a87c4cd4082d8d4c69`)
and [instructions](corpus/authorities/i8283--2025.pdf)
(`2de015f75bcf2fa9222f8ce6f5ab394d1845ec64ec6cb53ce4e60a4c88150073`)
are also pinned. OCR was used to read the packet's encoded cover text, and
checked boxes were verified against rendered pages. Keep printed facts,
derived expectations, and application output distinct.

| PDF page | Printed source facts | Fixture route and verification |
| --- | --- | --- |
| 1 | James Brown SSN 400-00-1038, DOB August 2, 1978; June Brown DOB March 19, 1979; both U.S. citizens. Jonah born July 20, 2010 and a full-time high-school student. June's IP PIN is 876543. All Schedule C line 44a mileage occurred before July 1. $300 of 2025 overpayment was applied to 2026. Cover says the taxpayers are specified-agricultural-cooperative patrons and “therefore” do not qualify for QBI. | Capture filer/dependent identities, payment origin, mileage period, and cooperative status. The cover's QBI conclusion is **not** a calculation or source statement: evaluate business-level QBI and patron Form 8995-A rules, and preserve missing cooperative documents. |
| 2–3 | Joint return; CT address; digital-assets **No**; Jonah lives with them for over half the year and in the U.S., full-time-student box checked. His child-tax-credit/other-dependent-credit boxes are both blank. Presidential election box for James checked. Main-home and both citizenship/work-authorization answers are blank despite cover's citizenship claim. EIC opt-out box **27c checked**; June's IP PIN printed. All monetary 1040 lines are blank. | Preserve checked answers and unanswered boxes separately. Reconcile the cover's citizenship statement to the form answer, Jonah's credit eligibility, and main-home/EIC facts. Do not generate EIC because 27c is an explicit election. Route $300 to 1040 line 26, not W-2 withholding. |
| 4 | James W-2, Coca-Cola Beverages Northeast, EIN 00-1111111: box 1/3/5 $29,623; box 2 withholding $923; box 4 $1,837, box 6 $430; box 13 **statutory employee checked**; CT box 17 tax $930. | Statutory income belongs on a Schedule C line 1 with its own activity and is **excluded from 1040 line 1a**. Box 2 still reaches line 25a. Statutory Schedule C net is excluded from Schedule SE line 2; W-2 Social Security wages may still enter the Schedule SE wage-base worksheet if other SE income exists. The positive income-tax withholding is printed even though Pub. 15-A says employers generally do not withhold it from statutory wages; preserve it and flag source reconciliation. |
| 5 | June W-2, Extra Space Storage, EIN 00-0000013: box 1/3/5 $8,645; box 2 withholding $170; box 4 $536, box 6 $125. | Ordinary wages $8,645 → 1040 line 1a; federal W-2 withholding totals **$1,093**. Do not send June's wages to James's Schedule C. |
| 6–7 | Schedule 1 Part I and II monetary lines blank. | Schedule C line 31 → Schedule 1 line 3 → 1040 line 8 once. No Schedule SE or half-SE deduction merely from statutory employee income; determine any other SE activity from source evidence. |
| 8–9 | Schedule A: line 5a state income tax $1,045; 5b property tax $8,955; 8a mortgage interest $11,150; 8c points $260; 8d mortgage insurance premiums $2,316; line 11 cash gift $250. Line 12 noncash and computed lines blank; line 18 **No** checked for the overall itemized limit; line 19 elective itemization box blank. | SALT subtotal $10,000; interest/insurance source subtotal $13,726; raw cash plus Form 8283 FMV $980 if all eligible. The resulting **upper bound** before the 2026 0.5%-of-AGI charity floor is $24,706, below the $32,200 joint standard deduction. Schedule A attachment and the blank election therefore cannot alone justify choosing itemization. If the standard deduction wins, evaluate the $250 cash gift under 1040 line 12f; noncash gifts never enter 12f. |
| 10–11 | James Schedule C: landscaper, business code 541320, cash method, material participation **Yes**, Form 1099 payments **No**; line 1 statutory-W-2 checkbox checked but gross receipts blank. Expenses: line 8 $865, line 9 $470, line 19 $560, line 22 $600, line 23 $60; line 30 **printed $0**. Vehicle placed in service August 23, 2025; business miles 648, commuting 710, other 15,150; personal availability, second vehicle, evidence, and written-evidence answers all **Yes**. | 648 pre-July miles × $0.725 = $469.80, rounded to **$470**, matching line 9. Printed expenses sum **$2,555**. The statutory W-2 suggests at least $29,623 on a statutory Schedule C line 1, but the gross-receipts cell is blank, and the W-2 beverage employer does not obviously match the landscaping activity. Reconcile activity identity and any other receipts before claiming an exact line 31. Under an explicit ATS-only assumption that this W-2 is the sole receipt of this activity, line 31 would be **$27,068**. Build 2026 Schedule C line 16b vehicle-loan and 16c other-interest slots distinctly even though both are blank in this packet. |
| 12–13 | Form 8283 Section A: Goodwill, 2709 Main Street, Glastonbury CT 06033; clothes and toys donated November 15, 2026; acquired on various dates by purchase; basis $3,490, FMV **$730**, method “Thrift Store Value.” Section B and page 2 are blank. | Record donor, donee, item category/condition, basis, acquisition and valuation facts. $730 exceeds the Form 8283 noncash filing threshold, but it is not a printed Schedule A line 12 deduction. Verify FMV, item condition, acknowledgment, charitable percentage/floor, and whether any noncash deduction is actually claimed after standard-vs-itemized resolution. If no noncash deduction is claimed, Form 8283 attachment status must be reconciled rather than blindly copied from the ATS cover. |

## Independent bridge and contradictions to resolve

- The two W-2 box 1 values total $38,268, but only June's **$8,645** is an
  ordinary 1040 line 1a source. James's $29,623 belongs to the checked
  statutory Schedule C line 1. A graph that sends both W-2s to line 1a and
  also fills Schedule C will duplicate his income.
- The printed Schedule C expenses total **$2,555**; its line 1 is blank.
  With the explicit sole-statutory-receipt assumption, Schedule C line 31 and
  Schedule 1 line 3 would be $27,068, making provisional 1040 total income
  **$35,713** ($8,645 + $27,068), before any other sources or adjustments.
  This is a fixture hypothesis, not a packet-printed amount.
- The itemized-deduction upper bound from the printed Schedule A and Form
  8283 amounts is **$24,706**, before the charity floor. On known facts,
  $32,200 standard deduction wins. If the $250 cash gift qualifies for the
  nonitemizer deduction, 1040 lines 12e/12f would provisionally be
  $32,200/$250. The packet includes Schedule A and Form 8283 anyway. Preserve
  this as an ATS attachment/deduction-choice conflict, not an instruction to
  itemize or to discard the source forms.
- A child born in 2010 is under 17 at year-end 2026, but the credit boxes and
  Schedule 8812 are absent. Derive credit eligibility from the dependent's
  SSN, relationship, residency, taxpayer SSNs, and current law; do not infer
  a zero credit from a blank checkbox. The main-home box is also blank.
- Cooperative patron status selects the Form 8995-A analysis path. The packet
  contains no Form 1099-PATR, qualified-payment allocation, patron reduction,
  or 199A(g) notice. A patron is not categorically ineligible for QBI just
  because of patron status; the cover's conclusion requires independent
  reconciliation with the [cooperative QBI contract](QBI-COOPERATIVE-GRAPH.md).

## Current graph and build order

1. Extend the W-2/2026 source route to honor box 13 statutory-employee status:
   attach the W-2 to the correct Schedule C activity, direct box 1 there once,
   preserve box 2 withholding, and exclude that activity's net from Schedule
   SE. The shared [Schedule C node](../../forms/f1040/nodes/inputs/schedule_c/index.ts)
   has a `statutory_employee` flag but requires explicit gross receipts and
   still names line 16b as other interest; audit its output edges and add the
   2026 line 16b/16c split before registration.
2. Supply source-backed business receipts, expense classification, vehicle
   election, and Part IV facts. Confirm the W-2/landscaping activity link. The
   existing [business-mileage function](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/nodes/shared/business-mileage.ts)
   has the correct two 2026 periods; test this packet's $470 against its
   actual Schedule C route and PDF field.
3. Build the joint [Schedule A/standard/QBI resolver](DEDUCTION-GRAPH.md),
   including 2026 cash-charity line 12f and Form 8283's separate source and
   attachment model. Evaluate both deduction choices from finalized AGI,
   charity floor, credit, and QBI facts. Resolve the ATS form-list conflict
   explicitly; do not force an inferior deduction to match an attachment.
4. Complete 1040 line 19/28 Schedule 8812 eligibility and line 27c opt-out,
   1040 line 25a $1,093, line 26 $300, IP PIN, final tax/settlement, and the
   answer boxes. Print and inspect all required attachments. Generate XML
   from the same calculation and validate against current TY2026 MeF XSD,
   business rules, and ATS, then run TY2025 statutory-W-2 regressions.

The [May v1 MeF drift review](MEF-V1-DRIFT.md) remains a release gate; it
cannot prove current 2026 XML or business-rule conformance.
