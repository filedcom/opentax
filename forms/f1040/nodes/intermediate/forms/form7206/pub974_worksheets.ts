import { z } from "zod";
import { FPL_BASE_2025, FPL_INCREMENT_2025 } from "../../../config/2025.ts";
import { FilingStatus } from "../../../types.ts";
import {
  form8962,
  inputSchema as form8962InputSchema,
} from "../form8962/index.ts";
import { attributableSpecifiedPtc } from "./pub974_attribution.ts";

// Publication 974 (2025), pp. 49-51. These are record-only calculations.
// They do not route a deduction or an assumed MAGI into the tax graph.
const money = z.number().finite().nonnegative();

export const worksheetWSourceSchema = z.object({
  // One row per Form 1095-A policy/month after any Part IV allocation and
  // coverage-family split. The policy identity prevents a pooled APTC amount
  // from being presented as if it came from the specified-premium months.
  specified_policy_months: z.array(
    z.object({
      form1095a_policy_number: z.string().min(1),
      month: z.number().int().min(1).max(12),
      specified_premium: money,
      attributable_aptc: money,
    }).strict(),
  ).min(1),
  nonspecified_premium_deduction: money,
  business: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("self_employed"),
      establishing_business_earned_income: money,
      all_profitable_business_earned_income: money.positive(),
      schedule1_line15_se_tax_deduction: money,
      establishing_business_schedule1_line16_retirement_deduction: money,
      form2555_attributable_exclusion: money,
    }).strict(),
    z.object({
      kind: z.literal("s_corporation"),
      establishing_s_corporation_medicare_wages: money,
      form2555_attributable_exclusion: money,
    }).strict(),
  ]),
  one_establishing_business_verified: z.literal(true),
}).strict();

export type WorksheetWSource = z.infer<typeof worksheetWSourceSchema>;

export interface WorksheetWResult {
  line1_specified_premiums: number;
  line2_attributable_aptc: number;
  line3_premiums_net_of_aptc: number;
  line13_business_earnings_limit: number;
  line14_nonspecified_deduction: number;
  line15_remaining_earnings_limit: number;
  line16_initial_specified_deduction: number;
  line17_initial_total_deduction: number;
  line19_remaining_limit_for_worksheet_x: number | null;
}

function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateWorksheetW(raw: WorksheetWSource): WorksheetWResult {
  const source = worksheetWSourceSchema.parse(raw);
  const seenPolicyMonths = new Set<string>();
  for (const row of source.specified_policy_months) {
    const key = `${row.form1095a_policy_number}:${row.month}`;
    if (seenPolicyMonths.has(key)) {
      throw new Error(
        "Publication 974 Worksheet W repeats a Form 1095-A policy month",
      );
    }
    seenPolicyMonths.add(key);
    if (row.attributable_aptc > row.specified_premium) {
      throw new Error(
        "Publication 974 Worksheet W APTC exceeds specified premiums",
      );
    }
  }
  const business = source.business;
  let line13: number;
  if (business.kind === "self_employed") {
    if (
      business.establishing_business_earned_income >
        business.all_profitable_business_earned_income
    ) {
      throw new Error(
        "Publication 974 Worksheet W business income exceeds all profitable business income",
      );
    }
    const line6 = business.establishing_business_earned_income /
      business.all_profitable_business_earned_income;
    const line7 = cents(business.schedule1_line15_se_tax_deduction * line6);
    const line10 = cents(
      business.establishing_business_earned_income - line7 -
        business.establishing_business_schedule1_line16_retirement_deduction,
    );
    line13 = cents(line10 - business.form2555_attributable_exclusion);
  } else {
    line13 = cents(
      business.establishing_s_corporation_medicare_wages -
        business.form2555_attributable_exclusion,
    );
  }
  if (line13 < 0 || source.nonspecified_premium_deduction > line13) {
    throw new Error(
      "Publication 974 Worksheet W needs nonnegative business earnings after other deductions",
    );
  }
  const line1 = cents(source.specified_policy_months.reduce(
    (sum, row) => sum + row.specified_premium,
    0,
  ));
  const line2 = cents(source.specified_policy_months.reduce(
    (sum, row) => sum + row.attributable_aptc,
    0,
  ));
  const line3 = cents(line1 - line2);
  const line14 = cents(source.nonspecified_premium_deduction);
  const line15 = cents(line13 - line14);
  const line16 = Math.min(line3, line15);
  return {
    line1_specified_premiums: line1,
    line2_attributable_aptc: line2,
    line3_premiums_net_of_aptc: line3,
    line13_business_earnings_limit: line13,
    line14_nonspecified_deduction: line14,
    line15_remaining_earnings_limit: line15,
    line16_initial_specified_deduction: line16,
    line17_initial_total_deduction: cents(line14 + line16),
    line19_remaining_limit_for_worksheet_x: line2 > 0
      ? cents(line15 - line16)
      : null,
  };
}

export const worksheetXSourceSchema = z.object({
  // Pub. 974 has separate ordering rules for Form 8582 losses, Form 8814,
  // Form 8815, covered-by-plan IRA deductions, and student-loan interest.
  // This provisional arithmetic cannot silently apply to those cases.
  special_adjustment_cases_reviewed_absent: z.literal(true),
  form1040_line9_total_income: z.number().finite(),
  form1040_line2a_tax_exempt_interest: money,
  form1040_nontaxable_social_security: money,
  form2555_lines45_and_50: money,
  schedule1_adjustments_except_line17: money,
  required_filing_dependents_modified_agi: money,
  household_size: z.number().int().positive(),
  fpl_region: z.enum(["contiguous", "alaska", "hawaii"]),
  filing_status: z.enum([FilingStatus.Single, FilingStatus.MFJ]),
}).strict();

export type WorksheetXSource = z.infer<typeof worksheetXSourceSchema>;

export interface WorksheetXResult {
  line8_taxpayer_modified_agi: number;
  line14_household_income: number;
  line17b_federal_poverty_line: number;
  line25_repayment_limit: number;
  line30_max_specified_deduction: number;
  line31_max_total_deduction: number;
}

function povertyLine(
  size: number,
  region: WorksheetXSource["fpl_region"],
): number {
  const [base, increment] = region === "alaska"
    ? [18_810, 6_730]
    : region === "hawaii"
    ? [17_310, 6_190]
    : [FPL_BASE_2025, FPL_INCREMENT_2025];
  return base + increment * (size - 1);
}

export function calculateWorksheetX(
  raw: WorksheetXSource,
  worksheetW: WorksheetWResult,
): WorksheetXResult {
  const source = worksheetXSourceSchema.parse(raw);
  const line19 = worksheetW.line19_remaining_limit_for_worksheet_x;
  if (line19 === null) {
    throw new Error(
      "Publication 974 Worksheet X applies only when specified-premium APTC was paid",
    );
  }
  const line3 = cents(
    source.form1040_line9_total_income +
      source.form1040_line2a_tax_exempt_interest +
      source.form1040_nontaxable_social_security +
      source.form2555_lines45_and_50,
  );
  const line8 = cents(
    line3 - source.schedule1_adjustments_except_line17 -
      worksheetW.line14_nonspecified_deduction -
      worksheetW.line16_initial_specified_deduction,
  );
  const line14 = cents(
    line8 + source.required_filing_dependents_modified_agi,
  );
  const fpl = povertyLine(source.household_size, source.fpl_region);
  const single = source.filing_status === FilingStatus.Single;
  const caps = single ? [375, 975, 1_625] : [750, 1_950, 3_250];
  const percentage = (income: number) =>
    Math.floor(Math.max(0, income) / fpl * 100);
  let line25: number;
  if (percentage(line14 - Math.min(line19, caps[0])) < 200) {
    line25 = caps[0];
  } else if (percentage(line14 - Math.min(line19, caps[1])) < 300) {
    line25 = caps[1];
  } else if (percentage(line14 - Math.min(line19, caps[2])) < 400) {
    line25 = caps[2];
  } else {
    line25 = worksheetW.line2_attributable_aptc;
  }
  const line30 = Math.min(
    worksheetW.line1_specified_premiums,
    cents(worksheetW.line16_initial_specified_deduction + line25),
    worksheetW.line15_remaining_earnings_limit,
  );
  return {
    line8_taxpayer_modified_agi: line8,
    line14_household_income: line14,
    line17b_federal_poverty_line: fpl,
    line25_repayment_limit: line25,
    line30_max_specified_deduction: line30,
    line31_max_total_deduction: cents(
      worksheetW.line14_nonspecified_deduction + line30,
    ),
  };
}

export const pub974SingleBusinessSourceSchema = z.object({
  worksheet_w: worksheetWSourceSchema,
  worksheet_x: worksheetXSourceSchema,
  // Every Form 1095-A covered policy/month, including months that are not
  // specified SEHI premiums. This bounded path allows one policy and only
  // whole-month specified premiums, with no other SEHI premium deduction.
  form1095a_policy_months: z.array(z.object({
    form1095a_policy_number: z.string().trim().min(1),
    month: z.number().int().min(1).max(12),
    premium: money.positive(),
    aptc: money,
  }).strict()).min(1).max(12),
  no_other_se_income_sources_verified: z.literal(true),
  form8962_source: form8962InputSchema,
}).strict();

export type Pub974SingleBusinessSource = z.infer<
  typeof pub974SingleBusinessSourceSchema
>;

export interface Pub974IterativeResult {
  worksheet_w: WorksheetWResult;
  worksheet_x: WorksheetXResult;
  schedule1_line17_deduction: number;
  form8962_fields: Record<string, unknown>;
  attributable_specified_ptc: number;
  iterations: number;
}

// Publication 974 (2025), pp. 52-53, Steps 1-6. This pure calculation keeps
// trial Form 8962 results inside the call. The ordinary AGI -> 8962 graph must
// not be used to feed PTC backward into a premium deduction.
export function calculatePub974SingleBusinessIterative(
  raw: Pub974SingleBusinessSource,
): Pub974IterativeResult {
  const source = pub974SingleBusinessSourceSchema.parse(raw);
  if (
    source.worksheet_w.nonspecified_premium_deduction !== 0 ||
    source.worksheet_w.business.kind !== "self_employed" ||
    source.worksheet_w.business.form2555_attributable_exclusion !== 0 ||
    source.worksheet_w.business.establishing_business_earned_income !==
      source.worksheet_w.business.all_profitable_business_earned_income ||
    source.worksheet_x.form2555_lines45_and_50 !== 0
  ) {
    throw new Error(
      "Publication 974 filed route requires one SE income source, no Form 2555, and no nonspecified premiums",
    );
  }
  const w = calculateWorksheetW(source.worksheet_w);
  if (w.line19_remaining_limit_for_worksheet_x === null) {
    throw new Error(
      "Publication 974 single-business iterative route requires attributable APTC",
    );
  }
  const x = calculateWorksheetX(source.worksheet_x, w);
  const f = source.form8962_source;
  const premiums = f.monthly_premiums;
  const aptcs = f.monthly_aptcs;
  const policyMonths = source.form1095a_policy_months;
  const coverageMonths = new Set(policyMonths.map((row) => row.month));
  const policyNumbers = new Set(policyMonths.map((row) => row.form1095a_policy_number));
  if (
    coverageMonths.size !== policyMonths.length || policyNumbers.size !== 1 ||
    policyMonths.some((row) => row.aptc > row.premium)
  ) {
    throw new Error(
      "Publication 974 bounded route needs one identified policy, unique coverage months, and APTC within premium",
    );
  }
  if (
    !premiums || !f.monthly_slcsps || !aptcs ||
    f.annual_premium !== undefined || f.annual_slcsp !== undefined ||
    f.annual_aptc !== undefined || f.shared_policy_allocations?.length ||
    f.alternative_marriage || f.alternative_marriage_policies ||
    f.alternative_marriage_source_month !== undefined ||
    f.qsehra_monthly_facts ||
    f.pub974_reconciliation || f.pub974_form1095a_policy_months ||
    f.pub974_income_audit ||
    f.qsehra_amount_offered !== undefined ||
    f.qsehra_w2_reported_benefit !== undefined ||
    f.below_100_fpl_status || f.mfs_ptc_status ||
    f.form8814_children?.length || f.form8814_expected_ssns?.length ||
    f.taxpayer_modified_agi !== undefined ||
    f.dependents_modified_agi !== undefined ||
    f.household_size !== undefined || f.fpl_region !== undefined ||
    f.filing_status !== undefined || f.dependent_income_complete !== undefined
  ) {
    throw new Error(
      "Publication 974 single-business route needs monthly Form 8962 policy facts without other special branches or prefilled income",
    );
  }
  const specifiedMonths = new Set(source.worksheet_w.specified_policy_months.map((row) => row.month));
  const policyByMonth = new Map(policyMonths.map((row) => [row.month, row]));
  const specifiedMatch = source.worksheet_w.specified_policy_months.every((row) => {
    const policy = policyByMonth.get(row.month);
    return policy !== undefined &&
      policy.form1095a_policy_number === row.form1095a_policy_number &&
      cents(policy.premium) === cents(row.specified_premium) &&
      cents(policy.aptc) === cents(row.attributable_aptc);
  });
  if (
    !specifiedMatch || specifiedMonths.size !== source.worksheet_w.specified_policy_months.length ||
    Array.from({ length: 12 }, (_, index) => {
      const row = policyByMonth.get(index + 1);
      return row
        ? cents(row.premium) !== cents(premiums[index]) ||
          cents(row.aptc) !== cents(aptcs[index]) || f.monthly_slcsps![index] <= 0
        : premiums[index] !== 0 || aptcs[index] !== 0 || f.monthly_slcsps![index] !== 0;
    }).some(Boolean)
  ) {
    throw new Error(
      "Publication 974 policy and specified months must reconcile to Form 1095-A coverage, enrollment premium, SLCSP, and APTC month",
    );
  }
  const baselineTaxpayerMagi = cents(
    source.worksheet_x.form1040_line9_total_income +
      source.worksheet_x.form1040_line2a_tax_exempt_interest +
      source.worksheet_x.form1040_nontaxable_social_security +
      source.worksheet_x.form2555_lines45_and_50 -
      source.worksheet_x.schedule1_adjustments_except_line17,
  );
  const maxSpecifiedDeduction = x.line30_max_specified_deduction;
  function trial(totalDeduction: number): {
    ptc: number;
    specifiedPtc: number;
    fields: Record<string, unknown>;
  } {
    const result = form8962.compute({ taxYear: 2025, formType: "f1040" }, {
      ...f,
      taxpayer_modified_agi: cents(baselineTaxpayerMagi - totalDeduction),
      dependents_modified_agi:
        source.worksheet_x.required_filing_dependents_modified_agi,
      dependent_income_complete: true,
      household_size: source.worksheet_x.household_size,
      fpl_region: source.worksheet_x.fpl_region,
      filing_status: source.worksheet_x.filing_status,
    });
    const fields = result.outputs.find((row) => row.nodeType === "form8962")
      ?.fields;
    if (!fields || typeof fields.total_premium_tax_credit !== "number") {
      throw new Error(
        "Publication 974 iteration could not compute Form 8962 PTC",
      );
    }
    const monthlyRows = fields.monthly_ptc_rows as
      { month_code: string; allowed_credit: number }[] | undefined;
    if (!monthlyRows) {
      throw new Error("Publication 974 needs monthly Form 8962 PTC rows");
    }
    return {
      ptc: fields.total_premium_tax_credit,
      specifiedPtc: attributableSpecifiedPtc(monthlyRows, specifiedMonths, coverageMonths),
      fields,
    };
  }
  let previous = trial(x.line31_max_total_deduction);
  if (previous.ptc === 0) {
    throw new Error(
      "Publication 974 iterative method stops when no PTC is allowable",
    );
  }
  for (let iteration = 1; iteration <= 100; iteration++) {
    // Pub. 974 Step 3/5 uses only PTC attributable to specified-premium months.
    const specified = cents(Math.min(
      w.line1_specified_premiums - previous.specifiedPtc,
      maxSpecifiedDeduction,
    ));
    if (specified < 0) {
      throw new Error("Publication 974 PTC exceeds specified premiums");
    }
    const next = trial(cents(w.line14_nonspecified_deduction + specified));
    const refiguredSpecified = cents(Math.min(
      w.line1_specified_premiums - next.specifiedPtc,
      maxSpecifiedDeduction,
    ));
    if (refiguredSpecified < 0) {
      throw new Error("Publication 974 PTC exceeds specified premiums");
    }
    if (
      Math.abs(refiguredSpecified - specified) < 1 &&
      Math.abs(next.ptc - previous.ptc) < 1
    ) {
      const finalDeduction = cents(
        w.line14_nonspecified_deduction + refiguredSpecified,
      );
      const final = trial(finalDeduction);
      const finalSpecified = cents(Math.min(
        w.line1_specified_premiums - final.specifiedPtc,
        maxSpecifiedDeduction,
      ));
      if (
        Math.abs(final.ptc - next.ptc) < 1 &&
        Math.abs(finalSpecified - refiguredSpecified) < 1
      ) {
        return {
          worksheet_w: w,
          worksheet_x: x,
          schedule1_line17_deduction: finalDeduction,
          form8962_fields: final.fields,
          attributable_specified_ptc: final.specifiedPtc,
          iterations: iteration,
        };
      }
      previous = final;
      continue;
    }
    previous = next;
  }
  throw new Error(
    "Publication 974 iteration did not converge within 100 steps",
  );
}
