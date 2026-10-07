import {
  fullShareCentCases,
  fullShareCentInputs,
} from "./form4972_full_share_cents.fixture.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
export { fullShareCentCases as preferentialAmtCases };
export function preferentialAmtInputs(
  entry: typeof fullShareCentCases[number],
) {
  const src: any = fullShareCentInputs(entry);
  const id = entry[0],
    iso: any = pdfReviewFixtures.find((f) => f.id === "single-iso-amt")!.inputs;
  src.w2 = structuredClone(iso.w2);
  src.w2[0].employee_ssn = src.general.taxpayer_ssn;
  src.w2[0].source_document_reference = "2025 reviewed issued employment W2";
  src.f3921 = structuredClone(iso.f3921);
  src.f3921[0].employee_tin = src.general.taxpayer_ssn;
  src.f3921[0].box4_fmv_per_share = id === "paired"
    ? 1075
    : id === "fifty-rounding"
    ? 550
    : 250;
  src.f3921[0].source_document_reference =
    `2025 reviewed issued ISO exercise ${id}`;
  src.f1099div = [{
    payerName: "Reviewed Investment Issuer",
    payerTin: "123456780",
    recipient_tin: src.general.taxpayer_ssn,
    account_number: `2025-investment-${id}`,
    source_document_reference: `2025-issued-investment-dividend-${id}`,
    isNominee: false,
    box11: false,
    box1a: id === "fifty-rounding" ? 35002 : 35000,
    box1b: 30000,
    box2a: ["three", "seven", "part3", "beneficiary"].includes(id) ? 10000 : 0,
    qualified_dividend_filing_review: {
      ex_dividend_date: "2025-06-15",
      qualified_held_days_in_121_day_window: 121,
      diminished_risk_days_excluded: 0,
      ordinary_stock_rule_confirmed: true,
      eligible_issuer_and_no_disqualified_dividend_confirmed: true,
      no_related_payment_obligation_confirmed: true,
      review_reference:
        `2025 complete issued dividend and stock-holding ledger ${id}`,
      reviewed_on: "2026-02-10",
    },
  }];
  src.schedule_b_part_iii = {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  };
  return src;
}
