import { iraBasisFixture2026 } from "./ira-basis.fixture.ts";
import type { IraBasisBinding2026 } from "./ira-basis-binding.ts";

export function iraBasisBindingFixture2026(): IraBasisBinding2026 {
  const original = iraBasisFixture2026();
  return {
    ...original,
    claim: {
      ...original.claim,
      owners: original.claim.owners.map((o) => {
        const { own_eligible_compensation: _entered, ...election } = o
          .nondeductible_election!;
        return {
          ...o,
          nondeductible_election: {
            ...election,
            wage_document_references: ["ira-compensation-w2"],
            personal_service_business_references: [],
            listed_businesses_personal_services_material_income_factor_verified:
              true,
            no_self_employed_retirement_plan_deduction: true,
            no_other_compensation_or_exclusions: true,
          },
        };
      }),
    },
    wage_sources: [{
      tax_year: 2026,
      source_document_reference: "ira-compensation-w2",
      employer_ein: "12-3456789",
      employer_name: "Synthetic Employer",
      employee_ssn: original.taxpayer_ssn,
      box1_wages: 40000,
      box2_fed_withheld: 0,
      box3_ss_wages: 0,
    }],
  };
}
