/** Authored synthetic Form 8874-A facts for direct QEI test fixtures. */
export function withReviewedForm8874A<
  T extends {
    cde_name: string;
    cde_ein: string;
    initial_investment_date: string;
    qualified_equity_investment_amount: number;
    designation_notice_reference: string;
  },
>(investment: T, investorName: string, investorTin: string) {
  const amount = investment.qualified_equity_investment_amount;
  const annual = [5, 5, 5, 6, 6, 6, 6].map((rate) =>
    Math.round(amount * rate) / 100
  ) as [number, number, number, number, number, number, number];
  const initial = new Date(`${investment.initial_investment_date}T00:00:00Z`);
  const signed = new Date(initial.getTime() + 5 * 86_400_000)
    .toISOString().slice(0, 10);
  const provided = new Date(initial.getTime() + 15 * 86_400_000)
    .toISOString().slice(0, 10);
  return {
    ...investment,
    reviewed_form8874a: {
      notice_document_reference: investment.designation_notice_reference,
      cde_name: investment.cde_name,
      cde_ein: investment.cde_ein,
      investor_name: investorName,
      investor_tin: investorTin.replaceAll("-", ""),
      initial_investment_date: investment.initial_investment_date,
      qualified_equity_investment_amount: amount,
      total_allowable_credit: annual.reduce((sum, credit) => sum + credit, 0),
      annual_credit_amounts: annual,
      cde_official_signed_notice_confirmed: true,
      cde_signature_date: signed,
      notice_provided_to_investor_date: provided,
    },
  };
}
