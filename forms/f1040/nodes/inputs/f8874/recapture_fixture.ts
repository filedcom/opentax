import { withReviewedForm8874A } from "./issuance_fixture.ts";

/** Authored synthetic CDE Form 8874-A/B pair for recapture test fixtures. */
export function withReviewedForm8874RecaptureEvidence<
  T extends {
    notice_reference: string;
    investment_reference: string;
    cde_name: string;
    cde_ein: string;
    notice_taxpayer_tin: string;
    initial_investment_date: string;
    qualified_equity_investment_amount: number;
    notice_credit_amount: number;
    recapture_event_date: string;
    recapture_event:
      | "cde_certification_revoked"
      | "substantially_all_requirement_failed"
      | "cde_redeemed_investment";
  },
>(source: T, investorName: string) {
  const issuance = withReviewedForm8874A(
    {
      designation_notice_reference: source.investment_reference,
      cde_name: source.cde_name,
      cde_ein: source.cde_ein,
      initial_investment_date: source.initial_investment_date,
      qualified_equity_investment_amount:
        source.qualified_equity_investment_amount,
    },
    investorName,
    source.notice_taxpayer_tin,
  ).reviewed_form8874a;
  const event = Date.parse(`${source.recapture_event_date}T00:00:00Z`);
  const after = (days: number) =>
    new Date(event + days * 86_400_000).toISOString().slice(0, 10);
  const creditYear = Number(source.recapture_event_date.slice(0, 4)) -
    Number(source.initial_investment_date.slice(0, 4)) + 1;
  const decreases = issuance.annual_credit_amounts.map((amount, index) =>
    index < creditYear ? amount : 0
  ) as [number, number, number, number, number, number, number];
  return {
    ...source,
    reviewed_form8874a: issuance,
    reviewed_form8874b: {
      notice_document_reference: source.notice_reference,
      cde_name: source.cde_name,
      cde_ein: source.cde_ein,
      investor_name: investorName,
      investor_tin: source.notice_taxpayer_tin,
      initial_investment_date: source.initial_investment_date,
      qualified_equity_investment_amount:
        source.qualified_equity_investment_amount,
      recapture_event_date: source.recapture_event_date,
      notice_credit_amount: source.notice_credit_amount,
      recapture_event: source.recapture_event,
      aggregate_decrease_by_credit_year: decreases,
      cde_official_signed_notice_confirmed: true,
      cde_awareness_date: after(1),
      cde_signature_date: after(2),
      notice_provided_to_investor_date: after(15),
    },
  };
}
