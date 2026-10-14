import { remarriedFamily } from "./form8863-remarried-mfj-parent.fixture.ts";
import { separateFamily } from "./form8863-remarried-mfs-parent.fixture.ts";

export function preferentialFamily(mfs: boolean): any {
  const copies = [
    {
      payerName: "Pat Domestic Equity Fund",
      payerTin: "761234567",
      recipient_tin: "999887777",
      box1a: 4000,
      box1b: 2500,
      box2a: 2000,
    },
    {
      payerName: "Owned Domestic Growth Fund",
      payerTin: "821234567",
      recipient_tin: mfs ? "999887777" : "111223333",
      box1a: 2000,
      box1b: 1500,
      box2a: 1000,
    },
  ].map((d, i) => ({
    ...d,
    account_number: `OWNED-2025-${i + 1}`,
    source_document_reference: `2025-${
      mfs ? "MFS" : "MFJ"
    }-${d.recipient_tin}-issued-dividend-${i + 1}`,
    isNominee: false,
    box11: false,
    qualified_dividend_filing_review: {
      ex_dividend_date: i ? "2025-07-15" : "2025-06-15",
      qualified_held_days_in_121_day_window: 90,
      diminished_risk_days_excluded: 0,
      ordinary_stock_rule_confirmed: true,
      eligible_issuer_and_no_disqualified_dividend_confirmed: true,
      no_related_payment_obligation_confirmed: true,
      review_reference: `2025-owned-account-${
        i + 1
      }-position-and-issuer-review`,
      reviewed_on: "2026-03-01",
    },
  }));
  return mfs ? separateFamily(true, copies) : remarriedFamily(true, copies);
}
