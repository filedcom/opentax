import type { RentedHomeSource } from "./index.ts";
import { expenseCategories, rentedHomeEvidenceSchema } from "./source.ts";

/** Synthetic reviewed records for fixtures only; never used to supply filing facts. */
export function withRentedHomeEvidence(
  source: RentedHomeSource,
  ownerTin = "123456789",
): RentedHomeSource {
  return {
    ...source,
    source_evidence: rentedHomeEvidenceSchema.parse({
      home_identifier: source.home_identifier,
      business_reference: source.business_reference,
      recipient_tin: ownerTin,
      lease_reference: "Synthetic reviewed 2025 lease",
      home_use_record: {
        source_reference: "Synthetic reviewed room plan and business-use diary",
        business_area_sqft: source.business_area_sqft,
        total_area_sqft: source.total_area_sqft,
        use_started_on: "2025-01-01",
        use_ended_on: "2025-12-31",
        qualifying_use: "principal_place_of_business",
        regular_and_exclusive_use_confirmed: true,
      },
      expenses: expenseCategories.flatMap((category) =>
        source[category] > 0
          ? [{
            record_reference: `Synthetic ledger ${category}`,
            bill_reference: `Synthetic bill ${category}`,
            payment_reference: `Synthetic payment ${category}`,
            category,
            amount: source[category],
            covered_from: "2025-01-01",
            covered_through: "2025-12-31",
            paid_on: "2025-12-31",
            not_claimed_elsewhere_confirmed: true,
            no_reimbursement_or_tax_exempt_allocation_confirmed: true,
            direct_repairs_business_area_only_confirmed:
              category === "repairs_direct",
          }]
          : []
      ),
      carryover: source.prior_operating_carryover === 0
        ? {
          kind: "none",
          no_prior_unallowed_operating_expenses_confirmed: true,
        }
        : {
          kind: "prior_actual_return",
          tax_year: 2024,
          return_reference: "Synthetic reviewed 2024 return",
          form8829_reference: "Synthetic reviewed 2024 Form8829",
          home_identifier: source.home_identifier,
          business_reference: source.business_reference,
          recipient_tin: ownerTin,
          line43_operating_carryover: source.prior_operating_carryover,
        },
    }),
  };
}
