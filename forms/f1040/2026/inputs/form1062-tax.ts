import {
  calculateForm5329Sources2026,
  form5329Source2026Schema,
} from "./form5329-source.ts";
import {
  calculateSaversCredit2026,
  saversCreditSource2026Schema,
} from "./savers-credit-source.ts";
import {
  calculateScheduleR2026,
  scheduleRSource2026Schema,
} from "./schedule-r-source.ts";
import { z } from "zod";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { form1062Election2026Schema } from "./form1062-source.ts";
import { refigureForm1062Gain2026 } from "./form1062-gain-replay.ts";
import {
  calculateIncomeTax2026,
  inputSchema as incomeSchema,
} from "../nodes/income-tax.ts";
import {
  calculateForm6251_2026,
  inputSchema as amtSchema,
  refigureForm6251For1062_2026,
} from "../nodes/form6251.ts";
import {
  calculateCareCredit2026,
  inputSchema as careSchema,
} from "../nodes/f2441.ts";
import {
  calculateEducationCredit2026,
  inputSchema as educationSchema,
} from "../nodes/f8863.ts";
import {
  calculateChildCredit2026,
  inputSchema as childSchema,
} from "../nodes/f8812.ts";
import { inputSchema as registeredSchedule2Schema } from "../nodes/schedule2.ts";
import { calculateSchedule2_2026 } from "../schedule2.ts";

const whole = z.number().int().nonnegative();
// Explicit audited exclusions: expanding Schedule 2 must not silently classify
// a newly enabled regular-tax addition as nondeferrable.
const schedule2Schema = registeredSchedule2Schema.pick({
  line2_amt: true,
  line17a_household_employment_tax: true,
  line4_self_employment_tax: true,
  line5_form5329_early_tax: true,
  line13c_hsa_distribution_tax: true,
  line13d_hsa_eligibility_tax: true,
  line18_form5329_excess_tax: true,
  line6_niit: true,
  line16a_form4137_tip_tax: true,
  line16b_form8919_wage_tax: true,
  line17b_medicare_wage_tax: true,
  line11_medicare_self_employment_tax: true,
  line17c_w2_uncollected_fica: true,
  line13k_golden_parachute_tax: true,
}).extend({ line1a_excess_advance_premium: z.literal(0).optional() }).strict();
/** Internal retained calculation sources; this is not a public tax-amount input. */
export const form1062TaxSource2026Schema = z.object({
  election: form1062Election2026Schema,
  income_tax: incomeSchema,
  amt: amtSchema,
  care: careSchema,
  education: educationSchema,
  child: childSchema,
  schedule_r: scheduleRSource2026Schema.optional(),
  savers: saversCreditSource2026Schema.optional(),
  schedule2: schedule2Schema,
  form5329: form5329Source2026Schema.optional(),
  return_lines: z.object({
    line11b_agi: z.number().int(),
    line15_taxable_income: whole,
    line16_income_tax: whole,
    line17_additional_taxes: whole,
    line19_child_tax_credit: whole,
    line20_nonrefundable_credits: whole,
    line23_other_taxes: whole,
    line28_actc: whole,
    line29_refundable_aotc: whole,
  }).strict(),
  review: z.object({
    record_reference: z.string().trim().min(1),
    no_other_regular_tax_additions_or_tax_methods: z.literal(true),
    savers_inventory_reference: z.string().trim().min(1).optional(),
    no_credits_other_than_reviewed_sources: z.literal(true).optional(),
    no_credits_other_than_care_education_child_and_energy: z.literal(true)
      .optional(),
    no_credits_other_than_care_education_child_energy_and_schedule_r: z.literal(
      true,
    ).optional(),
  }).strict(),
}).strict();
export type Form1062TaxSource2026 = z.input<typeof form1062TaxSource2026Schema>;

/** Replays the supported source owners in their actual credit dependency order. */
function replayCredits(
  input: z.output<typeof form1062TaxSource2026Schema>,
  regular: number,
  amt: number,
) {
  const care = calculateCareCredit2026({
    ...input.care,
    regular_tax: regular,
    schedule2_part1_tax: amt,
  });
  const scheduleR = input.schedule_r
    ? calculateScheduleR2026({
      ...input.schedule_r,
      regular_tax: regular,
      schedule2_part1_tax: amt,
      finalized_dependent_care_credit: care.lines?.line11 ?? 0,
    })
    : undefined;
  const scheduleRCredit = scheduleR?.lines?.line22 ?? 0;
  const education = calculateEducationCredit2026({
    ...input.education,
    regular_tax: regular,
    schedule2_part1_tax: amt,
    finalized_dependent_care_credit: care.lines?.line11 ?? 0,
    finalized_schedule_r_credit: scheduleRCredit,
  });
  const savers = input.savers
    ? calculateSaversCredit2026({
      ...input.savers,
      finalized_tax: {
        line18: regular + amt,
        schedule3_line1: 0,
        schedule3_line6l: 0,
        schedule3_line2: care.lines?.line11 ?? 0,
        schedule3_line3: education.lines?.line19 ?? 0,
        schedule3_line6d: scheduleRCredit,
      },
    })
    : undefined;
  const child = calculateChildCredit2026({
    ...input.child,
    finalized_savers_credit: savers?.lines.line12 ?? 0,
    auto_income_tax_liability: regular,
    schedule2_part1_tax: amt,
    finalized_dependent_care_credit: care.lines?.line11 ?? 0,
    finalized_schedule_r_credit: scheduleRCredit,
    finalized_education_credit: education.lines?.line19 ?? 0,
  });
  const personal = (savers?.lines.line12 ?? 0) + scheduleRCredit +
    (care.lines?.line11 ?? 0) +
    (education.lines?.line19 ?? 0) +
    (child.energy_credit?.lines.line3 ?? 0);
  const other = child.lines?.line14 ?? 0;
  return {
    care,
    scheduleR,
    savers,
    education,
    child,
    personal,
    other,
    total: personal + other,
  };
}

export function calculateForm1062Tax2026(raw: Form1062TaxSource2026) {
  const input = form1062TaxSource2026Schema.parse(raw);
  if (
    input.savers || input.review.savers_inventory_reference ||
    input.review.no_credits_other_than_reviewed_sources
  ) {
    if (
      !input.savers ||
      input.review.savers_inventory_reference !==
        input.savers.claim.record_reference ||
      input.review.no_credits_other_than_reviewed_sources !== true ||
      input.review.no_credits_other_than_care_education_child_and_energy !==
        undefined ||
      input.review
          .no_credits_other_than_care_education_child_energy_and_schedule_r !==
        undefined
    ) {
      throw Error("Form 1062 needs its reviewed saver credit inventory");
    }
  } else if (input.schedule_r?.claim) {
    if (
      input.review
          .no_credits_other_than_care_education_child_energy_and_schedule_r !==
        true ||
      input.review.no_credits_other_than_care_education_child_and_energy !==
        undefined
    ) {
      throw new Error(
        "Form 1062 needs its reviewed Schedule R credit inventory",
      );
    }
  } else if (
    input.review.no_credits_other_than_care_education_child_and_energy !==
      true ||
    input.review
        .no_credits_other_than_care_education_child_energy_and_schedule_r !==
      undefined
  ) {
    throw new Error("Form 1062 credit review needs actual Schedule R sources");
  }
  const income = calculateIncomeTax2026(input.income_tax);
  const amt = calculateForm6251_2026(input.amt);
  const schedule2 = calculateSchedule2_2026(input.schedule2);
  if (!input.amt.capital_sources_2026) {
    throw new Error("Form 1062 tax needs the actual land/capital inventory");
  }
  const gain = refigureForm1062Gain2026(
    input.amt.capital_sources_2026,
    input.election,
  );
  const owner = gain.actual.source_input;
  const additional5329 = input.form5329
    ? calculateForm5329Sources2026(input.form5329)
    : undefined;
  if (
    (additional5329?.schedule2_line18 ?? 0) !==
      (input.schedule2.line18_form5329_excess_tax ?? 0) ||
    (additional5329?.hsa?.schedule2_line13c ?? 0) !==
      (input.schedule2.line13c_hsa_distribution_tax ?? 0) ||
    (additional5329?.hsa?.schedule2_line13d ?? 0) !==
      (input.schedule2.line13d_hsa_eligibility_tax ?? 0) ||
    (additional5329?.schedule2_line5 ?? 0) !==
      (input.schedule2.line5_form5329_early_tax ?? 0) ||
    input.form5329 &&
      (input.form5329.filing_status !== owner.filing_status ||
        input.form5329.taxpayer_ssn !== owner.taxpayer_ssn ||
        input.form5329.spouse_ssn !== owner.spouse_ssn ||
        input.form5329.taxpayer_dob !==
          input.care.benefit_source.taxpayer_dob ||
        input.form5329.spouse_dob !== input.care.benefit_source.spouse_dob)
  ) {
    throw Error(
      "Form 1062 additional tax needs reconciled Form 5329 sources and return owners",
    );
  }
  if (
    input.savers &&
    JSON.stringify(input.savers.able_sources_2026) !==
      JSON.stringify(input.form5329?.able_sources_2026)
  ) {
    throw Error(
      "Form 1062 saver and additional tax must retain the same ABLE inventory",
    );
  }
  const ssn = (s: string | undefined) => s?.replaceAll("-", "");
  const students = input.education.education_context.students;
  if (
    input.income_tax.filing_status !== owner.filing_status ||
    input.care.benefit_source.filing_status !== owner.filing_status ||
    ssn(input.care.benefit_source.taxpayer_ssn) !== owner.taxpayer_ssn ||
    ssn(input.care.benefit_source.spouse_ssn) !== owner.spouse_ssn ||
    input.education.education_context.filing_status !== owner.filing_status ||
    ssn(students.find((s) => s.owner === "taxpayer")?.tin) !==
      owner.taxpayer_ssn ||
    ssn(students.find((s) => s.owner === "spouse")?.tin) !== owner.spouse_ssn ||
    input.child.auto_filing_status !== owner.filing_status ||
    ssn(input.child.taxpayer_ssn) !== owner.taxpayer_ssn ||
    ssn(input.child.spouse_ssn) !== owner.spouse_ssn
  ) {
    throw new Error(
      "Form 1062 tax and credit sources must share the return owners",
    );
  }
  if (
    income.form8615 || input.income_tax.child_tax_source_2026?.claim ||
    (input.income_tax.unrecaptured_1250_gain ?? 0) !== 0 ||
    (input.income_tax.rate_28_gain ?? 0) !== 0 ||
    (input.income_tax.form4952_election ?? 0) !== 0 ||
    (input.income_tax.form4952_elected_capital_gain ?? 0) !== 0 ||
    (input.income_tax.foreign_earned_income_exclusion ?? 0) !== 0 ||
    (input.amt.unrecaptured_1250_gain ?? 0) !== 0 ||
    (input.amt.rate_28_gain ?? 0) !== 0
  ) {
    throw new Error(
      "Form 1062 needs the corresponding child-tax, special-rate, election or foreign source replay",
    );
  }
  const ret = input.return_lines,
    regular = income.line16IncomeTax,
    additional = amt.lines.line11;
  if (
    ret.line15_taxable_income !== income.source_input.taxable_income ||
    ret.line16_income_tax !== regular ||
    ret.line17_additional_taxes !== schedule2.line3_part1_tax ||
    ret.line23_other_taxes !== schedule2.line21_total_additional_taxes ||
    (input.schedule2.line2_amt ?? 0) !== additional ||
    input.amt.regular_tax !== regular ||
    input.amt.regular_taxable_income !== ret.line15_taxable_income ||
    input.amt.regular_tax_income !== input.income_tax.form6251_line1b ||
    input.amt.line1a_deductions_without_senior !==
      input.income_tax.form6251_line1a ||
    input.amt.line2a_taxes_paid !== input.income_tax.form6251_line2a ||
    input.amt.taking_standard_deduction !==
      input.income_tax.taking_standard_deduction ||
    income.source_input.qualified_dividends !==
      gain.actual.qualified_dividends ||
    input.amt.qualified_dividends !== income.source_input.qualified_dividends ||
    JSON.stringify(input.amt.investment_sources_2026) !==
      JSON.stringify(gain.actual.source_input.investment_sources_2026) ||
    (input.income_tax.net_capital_gain ?? 0) !==
      gain.actual.preferential_gain ||
    input.care.regular_tax !== regular ||
    input.education.regular_tax !== regular ||
    input.child.auto_income_tax_liability !== regular ||
    input.care.schedule2_part1_tax !== additional ||
    input.education.schedule2_part1_tax !== additional ||
    input.child.schedule2_part1_tax !== additional ||
    input.care.agi !== ret.line11b_agi ||
    input.education.agi !== ret.line11b_agi ||
    input.child.auto_agi !== ret.line11b_agi
  ) {
    throw new Error(
      "Form 1062 actual tax sources do not reconcile to the return",
    );
  }
  if (
    input.care.wage_income_from_agi !== input.child.wage_income_from_agi ||
    input.education.earned_income_from_agi !==
      input.child.wage_income_from_agi ||
    input.care.benefit_source.taxpayer_dob !==
      input.education.education_context.taxpayer_dob ||
    JSON.stringify(input.care.business_sources_2026) !==
      JSON.stringify(input.child.business_sources_2026) ||
    JSON.stringify(input.education.business_sources_2026) !==
      JSON.stringify(input.child.business_sources_2026)
  ) {
    throw new Error(
      "Form 1062 credit replay needs consistent earned-income and filer sources",
    );
  }
  if (
    input.schedule_r &&
    (input.schedule_r.filing_status !== owner.filing_status ||
      ssn(input.schedule_r.taxpayer_ssn) !== owner.taxpayer_ssn ||
      ssn(input.schedule_r.spouse_ssn) !== owner.spouse_ssn ||
      input.schedule_r.taxpayer_dob !==
        input.care.benefit_source.taxpayer_dob ||
      input.schedule_r.spouse_dob !== input.care.benefit_source.spouse_dob ||
      input.schedule_r.agi !== ret.line11b_agi ||
      input.schedule_r.regular_tax !== regular ||
      input.schedule_r.schedule2_part1_tax !== additional)
  ) {
    throw Error(
      "Form 1062 Schedule R must match actual return owners, AGI and tax",
    );
  }
  if (
    input.savers && (input.savers.filing_status !== owner.filing_status ||
      input.savers.taxpayer_ssn !== owner.taxpayer_ssn ||
      input.savers.spouse_ssn !== owner.spouse_ssn ||
      input.savers.taxpayer_dob !== input.care.benefit_source.taxpayer_dob ||
      input.savers.spouse_dob !== input.care.benefit_source.spouse_dob ||
      input.savers.agi !== ret.line11b_agi ||
      input.savers.finalized_tax.line18 !== regular + additional)
  ) {
    throw Error(
      "Form 1062 saver credit must match actual return owners, AGI and tax",
    );
  }
  if (input.savers) {
    const orderedWages = (wages: typeof input.savers.wage_sources) =>
      [...wages].sort((a, b) =>
        a.source_document_reference.localeCompare(b.source_document_reference)
      );
    if (
      JSON.stringify(orderedWages(input.savers.wage_sources)) !==
        JSON.stringify(orderedWages(input.care.benefit_source.wage_sources))
    ) {
      throw Error("Form 1062 saver credit needs the actual wage inventory");
    }
  }
  const actualCredits = replayCredits(input, regular, additional);
  if (
    input.child.finalized_savers_credit !==
      (actualCredits.savers?.lines.line12 ?? 0) ||
    input.child.savers_inventory_reference_from_source !==
      input.savers?.claim.record_reference ||
    (input.savers &&
      (input.savers.finalized_tax.schedule3_line1 !== 0 ||
        input.savers.finalized_tax.schedule3_line6l !== 0 ||
        input.savers.finalized_tax.schedule3_line2 !==
          (actualCredits.care.lines?.line11 ?? 0) ||
        input.savers.finalized_tax.schedule3_line3 !==
          (actualCredits.education.lines?.line19 ?? 0) ||
        input.savers.finalized_tax.schedule3_line6d !==
          (actualCredits.scheduleR?.lines?.line22 ?? 0))) ||
    (input.schedule_r &&
      input.schedule_r.finalized_dependent_care_credit !==
        (actualCredits.care.lines?.line11 ?? 0)) ||
    input.education.finalized_schedule_r_credit !==
      (actualCredits.scheduleR?.lines?.line22 ?? 0) ||
    input.child.finalized_schedule_r_credit !==
      (actualCredits.scheduleR?.lines?.line22 ?? 0) ||
    input.child.schedule_r_inventory_reference_from_source !==
      input.schedule_r?.claim?.record_reference ||
    input.education.finalized_dependent_care_credit !==
      (actualCredits.care.lines?.line11 ?? 0) ||
    input.child.finalized_dependent_care_credit !==
      (actualCredits.care.lines?.line11 ?? 0) ||
    input.child.finalized_education_credit !==
      (actualCredits.education.lines?.line19 ?? 0) ||
    ret.line19_child_tax_credit !== actualCredits.other ||
    ret.line20_nonrefundable_credits !== actualCredits.personal ||
    ret.line28_actc !== (actualCredits.child.lines?.line27 ?? 0) ||
    ret.line29_refundable_aotc !== (actualCredits.education.lines?.line8 ?? 0)
  ) throw new Error("Form 1062 actual credits do not reconcile to the return");
  const electedGain = gain.qualification.elected_gain;
  const taxableWithout = Math.max(0, ret.line15_taxable_income - electedGain);
  const withoutIncome = calculateIncomeTax2026({
    ...input.income_tax,
    taxable_income: taxableWithout,
    net_capital_gain: gain.without_elected_gain.preferential_gain,
  });
  const withoutAmt = refigureForm6251For1062_2026(
    input.amt,
    input.election,
    withoutIncome.line16IncomeTax,
  );
  const withoutCredits = replayCredits(
    input,
    withoutIncome.line16IncomeTax,
    withoutAmt.lines.line11,
  );
  // AMT (26(b)(2)(A)) and the connected section 72(t) early tax (26(b)(2)(C))
  // and section 529A(c)(3)(A) ABLE tax (26(b)(2)(Y)) are excluded from regular
  // tax. The other connected taxes are outside
  // chapter 1 (NIIT, SE, FICA, household and section 4999); none is line 2.
  // Refundable ACTC and AOTC are treated as subpart C, and are not lines 4/12.
  const line1 = regular, line2 = 0, line3 = line1 + line2;
  const line4a = 0,
    line4b = actualCredits.personal,
    line4c = 0,
    line4d = actualCredits.other;
  const line4z = line4a + line4b + line4c + line4d, line5 = line3 - line4z;
  const line9 = withoutIncome.line16IncomeTax,
    line10 = 0,
    line11 = line9 + line10;
  const line12a = 0,
    line12b = withoutCredits.personal,
    line12c = 0,
    line12d = withoutCredits.other;
  // The 2026 draft explicitly caps line 12z, but does not print a cap on 4z.
  const line12z = Math.min(line11, line12a + line12b + line12c + line12d);
  const line13 = line11 - line12z, line14 = Math.max(0, line5 - line13);
  return {
    source_input: input,
    qualification: gain.qualification,
    gain_replay: gain,
    actual: { income, amt, credits: actualCredits },
    without_elected_gain: {
      income: withoutIncome,
      amt: withoutAmt,
      credits: withoutCredits,
    },
    unchanged_return_facts: {
      agi: ret.line11b_agi,
      deductions_and_qbi_recomputed: false as const,
      actual_amt: additional,
      other_taxes: ret.line23_other_taxes,
      refundable_actc: ret.line28_actc,
      refundable_aotc: ret.line29_refundable_aotc,
    },
    lines: {
      line1,
      line2,
      line3,
      line4a,
      line4b,
      line4c,
      line4d,
      line4z,
      line5,
      line6: ret.line15_taxable_income,
      line7: electedGain,
      line8: taxableWithout,
      line9,
      line10,
      line11,
      line12a,
      line12b,
      line12c,
      line12d,
      line12z,
      line13,
      line14,
      line15: roundWholeDollars(line14 * .25),
    },
    filing_ready: false as const,
  };
}
