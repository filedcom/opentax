import { adoptionGraphFixture2026 } from "./adoption-graph.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { monthlyCareFixture2026 } from "./dependent-care-earned.fixture.ts";
export function adoptionCareFixture2026(
  wages = 50000,
  benefits = 4000,
  special = false,
  careBenefits = 0,
) {
  const a = adoptionGraphFixture2026(wages, benefits, special),
    c = dependentCareFixture2026(wages, careBenefits);
  a.general.dependents[0].dob = c.general.dependents[0].dob;
  a.form8839.claim.children[0].date_of_birth = c.general.dependents[0].dob;
  c.form2441.claim.adoption_inventory_reference =
    a.form8839.claim.record_reference;
  return {
    ...a,
    w2s: a.w2s.map((w) => ({
      ...w,
      tax_year: 2026 as const,
      box10_dep_care: careBenefits,
    })),
    form2441: c.form2441,
  };
}
export function jointAdoptionCareFixture2026() {
  const a = adoptionCareFixture2026(50000, 0, true),
    joint = monthlyCareFixture2026();
  const spouse = {
    ...a.w2s[0],
    employee_ssn: joint.general.spouse_ssn,
    source_document_reference: "spouse-adoption-w2",
    box1_wages: 20000,
    box2_fed_withheld: 0,
  };
  a.form8839.claim.programs[0].owner_tin = spouse.employee_ssn;
  a.form8839.claim.programs[0].wage_source_reference =
    spouse.source_document_reference;
  return {
    ...a,
    general: { ...joint.general, dependents: a.general.dependents },
    w2s: [...a.w2s, spouse],
  };
}

export function phasedAdoptionCareFixture2026(primaryWages = 250000) {
  const a = jointAdoptionCareFixture2026(),
    c = adoptionCareFixture2026(primaryWages, 0, true, 7500);
  a.w2s[0].box1_wages = primaryWages;
  a.w2s[0].box10_dep_care = 7500;
  a.form2441.claim.benefits = c.form2441.claim.benefits;
  return a;
}
