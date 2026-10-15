import {
  investmentOwner,
  syntheticDividend2026,
  syntheticInterest2026,
  syntheticInvestmentClaim2026,
  syntheticPremiumReview2026,
} from "../inputs/investment.fixture.ts";
import type { InvestmentSource2026 } from "../inputs/investment-claim.ts";

export function scheduleBFixture2026(): InvestmentSource2026 {
  return {
    ...investmentOwner,
    ...syntheticInvestmentClaim2026(),
    f1099ints: Array.from({ length: 32 }, (_, i) => ({
      ...syntheticInterest2026(),
      payer_name: `SYNTHETIC BANK ${i + 1}`,
      source_document_reference: `int-${i}`,
      account_number: `int-${i}`,
      box1: 100.31,
      ...(i === 0
        ? {
          seller_financed: true,
          buyer_used_as_personal_residence: true,
          seller_financed_buyer: {
            name: "Synthetic Buyer",
            ssn: "999887777",
            address_type: "us" as const,
            address_line1: "100 Test Street",
            city: "Boston",
            state: "MA",
            zip: "02108",
          },
        }
        : {}),
      ...(i === 1
        ? {
          nominee_allocations: [{
            owner_tin: "888776666",
            amount: 10.11,
            source_record_reference: "nominee-ledger",
          }],
        }
        : {}),
      ...(i === 2
        ? {
          accrued_interest_purchases: [{
            purchase_date: "2026-02-01",
            settlement_reference: "bond-settlement",
            amount: 20.22,
          }],
        }
        : {}),
      ...(i === 3
        ? { box11: 30.33, premium_review: syntheticPremiumReview2026() }
        : {}),
    })),
    f1099divs: Array.from({ length: 16 }, (_, i) => ({
      ...syntheticDividend2026(),
      payerName: `SYNTHETIC FUND ${i + 1}`,
      source_document_reference: `div-${i}`,
      account_number: `div-${i}`,
      box1a: 100.31,
      box1b: 0,
      qualified_distribution_lots: [],
    })),
  };
}
