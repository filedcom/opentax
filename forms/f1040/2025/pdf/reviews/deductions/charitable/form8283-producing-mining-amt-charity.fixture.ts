import { reviewedNaturalResourceGift } from "./form8283-natural-resource.fixture.ts";

export const producingMiningAmtCharityCases = [
  "partly_limited_amt",
  "fully_allowed_amt",
] as const;
export async function reviewedProducingMiningAmtCharityGift(
  kind: typeof producingMiningAmtCharityCases[number],
) {
  const source = await reviewedNaturalResourceGift("producing_exploration");
  const inputs: any = structuredClone(source.inputs);
  inputs.schedule_c[0].line_d_ein = "34-5678901";
  // Retain every mine/gift/paid development/production amount. The additional
  // independently issued employment record changes actual AGI/SE/Medicare.
  const wages = kind === "partly_limited_amt" ? 895536 : 897536;
  inputs.w2.push({
    ...inputs.w2[0],
    source_document_reference: `2025 second employer issued W2 ${kind}`,
    employer_ein: "98-7654321",
    employer_name: "Second Issued Employer",
    box1_wages: wages,
    box2_fed_withheld: 230000,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.20,
    box5_medicare_wages: wages,
    box6_medicare_withheld:
      Math.round((wages * .0145 + Math.max(0, wages - 200000) * .009) * 100) /
      100,
  });
  inputs.f3921 = [{
    source_document_reference:
      `2025 second employer issued3921 exercise ${kind}`,
    corporation_name: "Second Issued Employer",
    corporation_ein: "98-7654321",
    employee_tin: inputs.general.taxpayer_ssn,
    box1_date_option_granted: "2022-06-01",
    box2_date_option_exercised: "2025-06-02",
    box3_exercise_price_per_share: 10,
    box4_fmv_per_share: 510,
    box5_shares_transferred: 1000,
    rights_transferable_and_not_subject_to_substantial_risk_on_exercise: true,
    shares_disposed_during_exercise_year: 0,
    amount_paid_for_option: 0,
  }];
  return { ...source, inputs };
}
