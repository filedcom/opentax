import { FilingStatus } from "../../nodes/types.ts";
import { syntheticInvestmentClaim2026 } from "../inputs/investment.fixture.ts";
import type { Form8960Input2026 } from "./form8960.ts";
export function niitFixture2026(): Form8960Input2026 {
  const sources = syntheticInvestmentClaim2026();
  Object.assign(sources.f1099ints[0], { box1: 30000, box2: 1000 });
  Object.assign(sources.f1099divs[0], { box1a: 20000, box2a: 5000 });
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    tax_residency: "full_year_citizen_or_resident",
    magi: 300000,
    foreign_earned_income_exclusion_from_agi: 0,
    other_niit_income_pending: false,
    early_withdrawal_penalty_from_agi: 1000,
    taxable_interest_from_agi: 30000,
    ordinary_dividends_from_agi: 20000,
    capital_gain_from_agi: 5000,
    taking_standard_deduction: false,
    itemized_before_overall_limit: 50400,
    itemized_after_overall_limit: 50400,
    investment_sources_2026: sources,
    schedule_a_tax_facts: {
      tax_election: "income",
      income_taxes: 30000,
      total_taxes_before_limit: 50000,
      allowed_taxes: 40400,
    },
  };
}
