import { multipleAnnuityInputs } from "./pdf/review-4972-multiple-annuity.fixture.ts";
export const fullShareCentCases = [
  ["single", 1, 0, true, true],
  ["three", 3, 0, true, true],
  ["paired", 2, 3, true, true],
  ["seven", 7, 0, true, true],
  ["part3", 3, 2, true, false],
  ["plain", 3, 0, false, true],
  ["fifty-rounding", 50, 0, true, true],
  ["beneficiary", 1, 0, true, true],
] as const;
export function fullShareCentInputs(
  [id, primary, spouse, nua, cap]: typeof fullShareCentCases[number],
) {
  const input: any = multipleAnnuityInputs(primary, spouse, nua);
  input.f1099r = input.f1099r.map((r: any) => ({
    ...r,
    box1_gross_distribution: nua ? 12000.74 : 10000.25,
    box2a_taxable_amount: 10000.25,
    box3_capital_gain: 1000.17,
    box6_nua: nua ? 2000.49 : 0,
    box8_other: 2000.49,
  }));
  if (id === "fifty-rounding") {
    input.f1099r = input.f1099r.map((r: any) => ({
      ...r,
      box1_gross_distribution: 2400.02,
      box2a_taxable_amount: 2000.01,
      box3_capital_gain: 200.01,
      box6_nua: 400.01,
      box8_other: 400.01,
    }));
  }
  input.form4972.elections = input.form4972.elections.map((e: any) => ({
    ...e,
    elect_capital_gain: cap,
  }));
  if (id === "beneficiary") {
    const copy = input.f1099r[0];
    Object.assign(copy, {
      box1_gross_distribution: 36000,
      box2a_taxable_amount: 30000,
      box3_capital_gain: 9999,
      box6_nua: 6000,
      box8_other: 5000,
    });
    Object.assign(copy.form4972_plan, {
      participant_name: "Pat Participant",
      participant_ssn: "444556666",
    });
    Object.assign(input.form4972.elections[0], {
      participant_name: "Pat Participant",
      participant_ssn: "444556666",
      beneficiary_distribution: true,
      participant_five_year_member: false,
      prior_beneficiary_election_after_1986: false,
      participant_died_before_1996_08_21: true,
      death_benefit_exclusion: 2000,
      federal_estate_tax: 1000,
    });
    delete input.form4972.elections[0].prior_election_after_1986;
  }
  return input;
}
