import {
  type AllocationRoute,
  partialBeneficiaryMultipleAllocationInputs,
} from "./review-4972-partial-multiple-death-estate.fixture.ts";

const routes: AllocationRoute[] = [
  "death-estate-nua-annuity",
  "estate-nua-annuity-part3",
  "death-nua-part3",
  "estate-nua-part3",
  "death-nua",
  "estate-nua",
  "death-estate-nua",
  "death-annuity",
  "estate-annuity",
  "death-estate-annuity",
  "death",
  "estate",
  "death-estate",
];
export const fractionalBeneficiaryCases = [
  {
    id: "single-tax-half-33333",
    route: "death" as const,
    copies: 1,
    share: 33.333,
    annuityShare: 22.5,
  },
  ...routes.map((route, index) => ({
    id: `two-${route}`,
    route,
    copies: 2,
    share: [37.5, 62.5, 33.333][index % 3],
    annuityShare: 22.5,
  })),
  {
    id: "single-all-33333",
    route: "death-estate-nua-annuity" as const,
    copies: 1,
    share: 33.333,
    annuityShare: 17.125,
  },
  {
    id: "single-all-375",
    route: "death-estate-nua-annuity" as const,
    copies: 1,
    share: 37.5,
    annuityShare: 22.5,
  },
  {
    id: "three-all-625",
    route: "death-estate-nua-annuity" as const,
    copies: 3,
    share: 62.5,
    annuityShare: 41.375,
  },
];

/** Reviewed issued boxes and separate cent-valued administrator allocations.
 * Shares name the same full pool on every copy. Other recipients share the
 * remaining percentage; an annuity has its independently issued box 8 share.
 */
export function fractionalBeneficiaryInputs(
  spec: typeof fractionalBeneficiaryCases[number],
) {
  const input = partialBeneficiaryMultipleAllocationInputs(
    spec.copies === 3 ? 3 : 2,
    spec.route,
  );
  if (spec.copies === 1) input.f1099r.splice(0, 1);
  const cents = (amount: number) => Math.round(amount * 100) / 100;
  for (const [index, copy] of input.f1099r.entries()) {
    copy.source_document_reference = `issued-${spec.id}-${index + 1}`;
    copy.box9a_pct_total = spec.share;
    copy.box2a_taxable_amount = spec.id === "single-tax-half-33333"
      ? 82475.84
      : cents(10000.49 + index * 0.02);
    if (copy.box3_capital_gain > 0) {
      copy.box3_capital_gain = cents(2000.51 + index * 0.02);
    }
    if (copy.box6_nua > 0) copy.box6_nua = cents(2000.49 + index * 0.02);
    if (copy.box8_other > 0) {
      copy.box8_other = cents(1500.49 + index * 0.02);
      copy.box8_pct_total = spec.annuityShare;
    }
    copy.box1_gross_distribution = cents(
      copy.box2a_taxable_amount + copy.box6_nua,
    );
  }
  const election = input.form4972.elections[0];
  election.source_document_references = input.f1099r.map((copy) =>
    copy.source_document_reference
  );
  if (election.death_benefit_allocation) {
    election.death_benefit_exclusion = 4999.99;
    election.death_benefit_recipient_allocated_amount = cents(
      4999.99 * spec.share / 100,
    );
    election.death_benefit_allocation.recipients = [
      {
        recipient_ssn: input.general.taxpayer_ssn,
        share_pct: spec.share,
        excluded_amount: election.death_benefit_recipient_allocated_amount,
      },
      {
        recipient_ssn: "987654321",
        share_pct: 100 - spec.share,
        excluded_amount: cents(4999.99 * (100 - spec.share) / 100),
      },
    ];
  }
  if (election.partial_estate_tax_source) {
    election.federal_estate_tax = 2000.03;
    election.partial_estate_tax_source.full_distribution_federal_estate_tax =
      2000.03;
    election.partial_estate_tax_source.recipient_allocated_federal_estate_tax =
      cents(2000.03 * spec.share / 100);
    const amount = input.f1099r.reduce(
      (sum, copy) => sum + copy.box2a_taxable_amount + copy.box6_nua,
      0,
    );
    election.partial_estate_tax_source.full_distribution_taxable_amount = cents(
      amount * 100 / spec.share,
    );
  }
  if (spec.id === "single-tax-half-33333") {
    delete election.death_benefit_exclusion;
    delete election.death_benefit_recipient_allocated_amount;
    delete election.death_benefit_exclusion_source_reference;
    delete election.death_benefit_allocation;
    election.participant_died_before_1996_08_21 = false;
  }
  return input;
}
