import { adoptionSource2026 } from "./adoption.fixture.ts";
import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
/** Synthetic filed-copy references and identities; public claim has no return amounts. */
export function adoptionGraphFixture2026(
  wages = 50000,
  benefits = 4000,
  special = false,
) {
  const base = childCreditGraphFixture2026(wages), a = adoptionSource2026();
  const w = {
      ...base.w2s![0],
      box12_entries: [{ code: Box12Code.T, amount: benefits }],
    },
    d = base.general.dependents[0],
    ch = a.claim.children[0];
  a.claim.programs[0].wage_source_reference = w.source_document_reference;
  a.claim.programs[0].owner_tin = base.general.taxpayer_ssn.replaceAll("-", "");
  ch.expenses[0].owner_tin = a.claim.programs[0].owner_tin;
  Object.assign(ch, {
    identifying_number: d.ssn,
    first_name: d.first_name,
    last_name: d.last_name,
    date_of_birth: d.dob,
  });
  ch.current_benefits[0].amount = benefits;
  ch.current_benefits[0].expense_allocations[0].amount = benefits;
  if (benefits === 0) ch.current_benefits = [];
  if (special) {
    ch.special_needs = {
      record_reference: "state-special-needs",
      authority: "state",
      determined_on: "2026-06-01",
      cannot_or_should_not_return_to_birth_parents_verified: true,
      cannot_be_placed_without_assistance_verified: true,
    };
    ch.special_needs_program_reference = a.claim.programs[0].record_reference;
  }
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _old,
    ...review
  } = base.f8812;
  return {
    ...base,
    w2s: [w],
    form8839: { claim: a.claim },
    f8812: {
      ...review,
      adoption_inventory_reference: a.claim.record_reference,
      no_nonrefundable_credits_other_than_reviewed_sources: true as const,
    },
  };
}
