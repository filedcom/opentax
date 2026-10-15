import type { CapitalGainInput2026 } from "../nodes/capital-gains.ts";
import { calculateCapitalGains2026 } from "../nodes/capital-gains.ts";
import type { Form8960Input2026 } from "../nodes/form8960.ts";
import { capitalFixture2026, capitalSale2026 } from "./capital.fixture.ts";
import { landDispositionFixture2026 } from "./land-disposition.fixture.ts";

export function landCapitalFixture2026(): CapitalGainInput2026 {
  const land = landDispositionFixture2026();
  const capital = capitalFixture2026().capital_gains.claim;
  capital.sales = [capitalSale2026("security-1")];
  capital.land_disposition_inventory_reference = land.claim.record_reference;
  return {
    filing_status: land.filing_status,
    taxpayer_ssn: land.taxpayer_ssn,
    digital_assets_answer: false,
    claim: capital,
    land_sources_2026: {
      source: land,
      reconciliation: {
        record_reference: "synthetic-land-capital-review",
        capital_inventory_reference: capital.record_reference,
        regular_and_amt_basis_and_history_identical: true,
      },
      niit_review: {
        record_reference: "synthetic-land-niit-review",
        no_prior_niit_capital_loss_carryover_adjustment: true,
        activities: [{
          activity_reference: "farm-1",
          owner_tin: "123456789",
          business_name: "Synthetic Farm",
          record_reference: "synthetic-activity-review",
          section162_trade_or_business: true,
          nonpassive_throughout_property_ownership: true,
          participation_history_reference: "synthetic-participation-ledger",
          not_trading_financial_instruments_or_commodities: true,
          no_former_passive_or_suspended_loss_adjustments: true,
        }],
      },
    },
  };
}
export function landNiitFixture2026(
  capitalInput = landCapitalFixture2026(),
): Form8960Input2026 {
  const c = calculateCapitalGains2026(capitalInput);
  return {
    filing_status: capitalInput.filing_status,
    taxpayer_ssn: capitalInput.taxpayer_ssn,
    spouse_ssn: capitalInput.spouse_ssn,
    tax_residency: "full_year_citizen_or_resident",
    magi: 300000,
    foreign_earned_income_exclusion_from_agi: 0,
    other_niit_income_pending: false,
    early_withdrawal_penalty_from_agi: 0,
    taxable_interest_from_agi: 0,
    ordinary_dividends_from_agi: 0,
    capital_gain_from_agi: c.return_gain,
    ordinary_disposition_gain_from_agi: c.ordinary_disposition_gain_loss,
    taking_standard_deduction: true,
    itemized_before_overall_limit: 0,
    itemized_after_overall_limit: 0,
    capital_sources_2026: capitalInput,
  };
}
