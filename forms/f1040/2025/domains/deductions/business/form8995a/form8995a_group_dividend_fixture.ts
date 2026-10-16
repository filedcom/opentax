import {
  type groupLossCases,
  groupLossFixture,
} from "./form8995a_group_loss_fixture.ts";
type Row = Record<string, any>;

/** Shared synthetic sources; no issuer or taxpayer authentication is claimed. */
export function groupDividendFixture(c: typeof groupLossCases[number]) {
  const { input, filer } = groupLossFixture(c);
  const employers = input.schedule_c.filter((b: Row) =>
    b.qbi_wotc_filing_review
  ) as Row[];
  for (const b of employers) {
    b.qbi_wotc_filing_review.qualified_dividends_zero_confirmed = false;
  }
  input.schedule_b_part_iii = {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  };
  input.f1099int = [1000, 700].map((amount, i) => ({
    payer_name: `Example Bank ${i + 1}`,
    payer_tin: String(234567890 + i),
    recipient_tin: filer.primarySSN,
    account_number: `GROUP-INT-${i}`,
    source_document_reference: `Synthetic group interest ${i}`,
    box1: amount,
  }));
  input.f1099div = [2000, 1000].map((amount, i) => ({
    payerName: `Example Fund ${i + 1}`,
    payerTin: String(345678901 + i),
    recipient_tin: filer.primarySSN,
    account_number: `GROUP-DIV-${i}`,
    source_document_reference: `Synthetic group dividend ${i}`,
    isNominee: false,
    box11: false,
    box1a: amount,
    box1b: [1000, 500][i],
    box2a: [1000, 800][i],
    qualified_dividend_filing_review: {
      ex_dividend_date: "2025-06-15",
      qualified_held_days_in_121_day_window: 90,
      diminished_risk_days_excluded: 0,
      eligible_issuer_and_no_disqualified_dividend_confirmed: true,
      ordinary_stock_rule_confirmed: true,
      no_related_payment_obligation_confirmed: true,
      review_reference: `Synthetic group holding review ${i}`,
      reviewed_on: "2026-02-01",
    },
  }));
  return { input, filer, employers };
}
