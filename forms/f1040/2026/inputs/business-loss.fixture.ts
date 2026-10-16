import { business, fixture, payment } from "./business.fixture.ts";
import { capitalFixture2026 } from "./capital.fixture.ts";
import type { BusinessLossSource2026 } from "./business-loss-source.ts";

export function businessLossFixture2026(
  amounts = [-400000, 50000],
): BusinessLossSource2026 {
  const source = fixture();
  source.w2s = [];
  source.businesses = amounts.map((amount, i) => {
    const b = business(`business-${i + 1}`);
    b.receipts = amount > 0
      ? [{ ...payment(`income-${i}`, amount), kind: "service_receipt" }]
      : [];
    b.expenses = amount < 0
      ? [{
        ...payment(`expense-${i}`, -amount),
        category: "professional_services",
      }]
      : [];
    return b;
  });
  const capital = capitalFixture2026().capital_gains.claim;
  capital.sales = [];
  return {
    filing_status: source.filing_status,
    taxpayer_ssn: source.taxpayer_tin,
    record_reference: "synthetic-2026-business-loss-workpaper",
    business_sources: source,
    capital_sources: {
      filing_status: source.filing_status,
      taxpayer_ssn: source.taxpayer_tin,
      digital_assets_answer: false,
      claim: capital,
    },
    review: {
      record_reference: "synthetic-all-business-review",
      all_business_sources_included: true,
      no_schedule_e_f_k1_or_other_business_sources: true,
      no_other_business_adjustments_or_released_suspended_losses: true,
      basis_at_risk_and_passive_limits_resolved: true,
      employee_service_classification_reviewed: true,
    },
  };
}
