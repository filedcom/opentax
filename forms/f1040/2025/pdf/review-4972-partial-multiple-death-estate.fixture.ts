import { partialBeneficiaryMultipleInputs } from "./review-4972-partial-multiple.fixture.ts";

export type AllocationRoute =
  | "death-estate-nua-annuity"
  | "estate-nua-annuity-part3"
  | "death-nua-part3"
  | "estate-nua-part3"
  | "death-nua"
  | "estate-nua"
  | "death-estate-nua"
  | "death-annuity"
  | "estate-annuity"
  | "death-estate-annuity"
  | "death"
  | "estate"
  | "death-estate";

/** Issued copies plus separate reviewed administrator/estate allocation records. */
export function partialBeneficiaryMultipleAllocationInputs(
  copies: 2 | 3,
  route: AllocationRoute,
) {
  const input = structuredClone(partialBeneficiaryMultipleInputs(copies));
  const withNua = route.includes("nua");
  const capitalElection = withNua && !route.includes("part3");
  const withAnnuity = route.includes("annuity");
  const withDeath = route.includes("death");
  const withEstate = route.includes("estate");
  for (const copy of input.f1099r) {
    if (!capitalElection) {
      copy.box3_capital_gain = 0;
    }
    if (!withNua) copy.box6_nua = 0;
    if (!withAnnuity) {
      copy.box8_other = 0;
      delete (copy as { box8_pct_total?: number }).box8_pct_total;
    }
    copy.box1_gross_distribution = copy.box2a_taxable_amount + copy.box6_nua;
  }
  const recipient = input.general.taxpayer_ssn;
  const participant = input.f1099r[0].form4972_plan.participant_ssn;
  const taxable = input.f1099r.reduce(
    (total, copy) => total + copy.box2a_taxable_amount + copy.box6_nua,
    0,
  );
  const election = {
    ...input.form4972.elections[0],
    participant_died_before_1996_08_21: withDeath,
    elect_include_nua: withNua,
    elect_capital_gain: capitalElection,
    ...(withDeath
      ? {
        death_benefit_exclusion: 5000,
        death_benefit_recipient_allocated_amount: 2500,
        death_benefit_exclusion_source_reference:
          "2025-Pat-plan-death-benefit-allocation",
        death_benefit_allocation: {
          participant_ssn: participant,
          elected_recipient_ssn: recipient,
          recipients: [
            { recipient_ssn: recipient, share_pct: 50, excluded_amount: 2500 },
            {
              recipient_ssn: "987654321",
              share_pct: 50,
              excluded_amount: 2500,
            },
          ],
        },
      }
      : {}),
    ...(withEstate
      ? {
        federal_estate_tax: 2000,
        partial_estate_tax_source: {
          administrator_statement_reference:
            "2025-Pat-estate-administrator-tax-allocation",
          estate_tax_return_reference: "1996-Pat-filed-Form-706-workpaper",
          full_distribution_taxable_amount: taxable * 2,
          full_distribution_federal_estate_tax: 2000,
          recipient_allocated_federal_estate_tax: 1000,
        },
      }
      : {}),
  };
  return {
    ...input,
    form4972: { elections: [election] },
  };
}
