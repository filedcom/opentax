import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form6251 } from "../form6251/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { F1040Config } from "../../../config/index.ts";
import {
  applicableFigure,
  qsehraAffordabilityRate,
  repaymentCap,
} from "./year-rules.ts";

const MONTH_CODES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const below100FplStatusSchema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("marketplace_estimate"),
    no_one_can_claim_taxpayer: z.literal(true),
    marketplace_coverage: z.literal(true),
    marketplace_estimated_at_least_100_fpl: z.literal(true),
    marketplace_information_provided_in_good_faith: z.literal(true),
    otherwise_applicable_taxpayer: z.literal(true),
  }).strict(),
  z.object({
    basis: z.literal("lawfully_present"),
    no_one_can_claim_taxpayer: z.literal(true),
    marketplace_coverage: z.literal(true),
    enrolled_individual_lawfully_present: z.literal(true),
    medicaid_ineligible_due_to_immigration_status: z.literal(true),
    otherwise_applicable_taxpayer: z.literal(true),
  }).strict(),
  z.object({
    basis: z.literal("not_applicable"),
    exception_routes_reviewed: z.literal(true),
    no_one_can_claim_taxpayer: z.literal(true),
    all_covered_individuals_lawfully_present: z.literal(true),
    no_shared_policy: z.literal(true),
    no_self_employed_health_insurance_deduction: z.literal(true),
    no_alternative_marriage_calculation: z.literal(true),
  }).strict(),
]);

const mfsExceptionFactsSchema = z.object({
  living_apart_at_filing: z.literal(true),
  unable_to_file_joint_due_to_exception: z.literal(true),
  prior_consecutive_exception_years: z.number().int().min(0).max(2),
  no_one_can_claim_taxpayer: z.literal(true),
  policy_scope: z.enum(["family_only", "shared_with_spouse"]),
});

export const mfsPtcStatusSchema = z.discriminatedUnion("basis", [
  mfsExceptionFactsSchema.extend({ basis: z.literal("domestic_abuse") })
    .strict(),
  mfsExceptionFactsSchema.extend({ basis: z.literal("spousal_abandonment") })
    .strict(),
  z.object({
    basis: z.literal("no_exception"),
    exception_reviewed: z.literal(true),
    no_one_can_claim_taxpayer: z.literal(true),
    policy_scope: z.enum(["family_only", "shared_with_spouse"]),
    all_covered_individuals_lawfully_present: z.literal(true),
    no_self_employed_health_insurance_deduction: z.literal(true),
  }).strict(),
]);

export const allocationPctSchema = z.number().min(0).max(1).refine(
  (pct) => Math.abs(pct * 100 - Math.round(pct * 100)) < 1e-9,
  "Allocation percentage must have at most two decimal places",
);

export const sharedPolicyAllocationSchema = z.object({
  basis: z.enum([
    "mfs_exception",
    "mfs_no_exception",
    "divorce_agreed",
    "divorce_no_agreement",
    "other_agreed",
    "other_no_agreement",
    "no_aptc",
  ]),
  policy_number: z.string().regex(/^[A-Za-z0-9 \-:_]{1,15}$/),
  other_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  start_month: z.number().int().min(1).max(12),
  end_month: z.number().int().min(1).max(12),
  premium_pct: allocationPctSchema.optional(),
  slcsp_pct: allocationPctSchema.optional(),
  aptc_pct: allocationPctSchema.optional(),
}).strict();

export const inputSchema = z.object({
  // Household size for FPL calculation
  household_size: z.number().int().positive().optional(),
  fpl_region: z.enum(["contiguous", "alaska", "hawaii"]).optional(),

  // Form 8962 lines 2a, 2b, and 3 are distinct amounts.
  taxpayer_modified_agi: z.number().optional(),
  dependents_modified_agi: z.number().optional(),
  form8814_expected_ssns: z.array(z.string()).optional(),
  form8814_children: z.array(z.object({
    ssn: z.string().regex(/^\d{9}$/),
    magi: z.number().nonnegative(),
  })).optional(),
  dependent_income_complete: z.boolean().optional(),
  below_100_fpl_status: below100FplStatusSchema.optional(),
  mfs_ptc_status: mfsPtcStatusSchema.optional(),
  shared_policy_allocations: z.array(sharedPolicyAllocationSchema).max(99)
    .optional(),

  // Annual totals (used when no monthly detail provided)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),
  // Form 8962 line 10: derived from twelve full-year, unchanged monthly rows.
  annual_line11_eligible: z.boolean().optional(),

  // Monthly detail arrays (12 elements each, indexed 0=Jan … 11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),

  // Box 12 code FF or the QSEHRA source gives the annual permitted benefit.
  // Monthly notice facts are needed separately for Pub. 974 Worksheets N/Q.
  qsehra_amount_offered: z.number().nonnegative().optional(),
  qsehra_w2_reported_benefit: z.number().nonnegative().optional(),
  qsehra_monthly_facts: z.array(
    z.object({
      self_only_slcsp: z.number().nonnegative(),
      self_only_permitted_benefit: z.number().nonnegative(),
      permitted_benefit: z.number().nonnegative(),
    }).strict().nullable(),
  ).length(12).optional(),

  // Filing status — Table 5 has a Single cap and a cap for every other status.
  filing_status: filingStatusSchema.optional(),
});

type Form8962Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function federalPovertyLevel(
  householdSize: number,
  region: NonNullable<Form8962Input["fpl_region"]>,
  cfg: F1040Config,
): number {
  const [base, increment] = region === "alaska"
    ? [cfg.fplAlaskaBase, cfg.fplAlaskaIncrement]
    : region === "hawaii"
    ? [cfg.fplHawaiiBase, cfg.fplHawaiiIncrement]
    : [cfg.fplBase, cfg.fplIncrement];
  return base + increment * (householdSize - 1);
}

function totalPremium(input: Form8962Input): number {
  if (input.monthly_premiums) {
    return input.monthly_premiums.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_premium ?? 0;
}

function totalSlcsp(input: Form8962Input): number {
  if (input.monthly_slcsps) {
    return input.monthly_slcsps.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_slcsp ?? 0;
}

function totalAptc(input: Form8962Input): number {
  if (input.monthly_aptcs) {
    return input.monthly_aptcs.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_aptc ?? 0;
}

// Allowed PTC = min(enrollment premium, max(0, SLCSP - contribution)).
// IRS Form 8962 line 11: max premium assistance = SLCSP - required contribution;
// allowed = lesser of enrollment premium or max premium assistance (IRC §36B(b)(2)(A))
function allowedPtc(
  slcsp: number,
  actualPremium: number,
  applicable: number,
): number {
  return Math.min(actualPremium, Math.max(0, slcsp - applicable));
}

function qsehraMonthlyCredit(
  tentativeCredit: number,
  householdIncome: number,
  facts: NonNullable<Form8962Input["qsehra_monthly_facts"]>[number],
  taxYear: number,
): number {
  if (facts === null) return tentativeCredit;
  // Pub. 974 Worksheet N, lines 4 and 8. Equality is affordable.
  const affordabilityThreshold = householdIncome *
    qsehraAffordabilityRate(taxYear) / 12;
  const employeeCost = facts.self_only_slcsp -
    facts.self_only_permitted_benefit;
  if (affordabilityThreshold >= employeeCost) return 0;
  // Worksheet Q, Part III, columns A-C.
  return Math.max(0, tentativeCredit - facts.permitted_benefit);
}

function buildOutputs(
  line26: number,
  line29: number,
  formFields: Record<string, unknown>,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  if (line26 > 0) {
    outputs.push(output(schedule3, { line9_premium_tax_credit: line26 }));
  }
  if (line29 > 0) {
    outputs.push(output(schedule2, { line1a_excess_advance_premium: line29 }));
    outputs.push(output(form6251, { schedule2_line1z_tax: line29 }));
  }
  outputs.push({ nodeType: "form8962", fields: formFields });
  return outputs;
}

function noForm8962Required(): NodeResult {
  // A self-output replaces source-only pending fields. Without it, a 1095-A
  // premium can be mistaken for a completed Form 8962 at export time.
  return {
    outputs: [{
      nodeType: "form8962",
      fields: { filing_required: false },
    }],
  };
}

interface Form8962BaseFields {
  household_size: number;
  taxpayer_modified_agi: number;
  dependents_modified_agi: number;
  household_income: number;
  federal_poverty_line: number;
  fpl_region: NonNullable<Form8962Input["fpl_region"]>;
  federal_poverty_pct: number;
}

function aptcOnlyRepayment(
  input: Form8962Input,
  aptc: number,
  baseFields: Form8962BaseFields,
  taxYear: number,
): NodeResult {
  if (aptc === 0) return noForm8962Required();
  const monthlyAptc = input.monthly_aptcs;
  const monthly = monthlyAptc !== undefined &&
    input.annual_line11_eligible !== true;
  if (!monthly && input.annual_line11_eligible !== true) {
    throw new Error(
      "Form 8962 APTC-only annual line 11 needs verified full-year unchanged coverage or monthly APTC",
    );
  }
  const line25 = Math.round(aptc);
  const cap = repaymentCap(
    baseFields.federal_poverty_pct,
    input.filing_status,
    taxYear,
  );
  const line29 = cap === null ? line25 : Math.min(line25, cap);
  return {
    outputs: buildOutputs(0, line29, {
      ...baseFields,
      ...(input.shared_policy_allocations?.length
        ? { shared_policy_allocations: input.shared_policy_allocations }
        : {}),
      total_premium_tax_credit: 0,
      total_advance_ptc: line25,
      ...(monthlyAptc !== undefined &&
          input.annual_line11_eligible !== true
        ? {
          monthly_ptc_rows: monthlyAptc.map((amount, index) => ({
            month_code: MONTH_CODES[index],
            aptc: amount,
          })),
        }
        : { annual_aptc: aptc }),
      excess_advance_payment: line25,
      ...(cap !== null ? { repayment_limitation: cap } : {}),
      ...(taxYear === 2025 ? { excess_advance_premium: line29 } : {}),
    }),
  };
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8962Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8962";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, schedule2, form6251]);

  compute(ctx: NodeContext, rawInput: Form8962Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const premium = totalPremium(input);
    const slcsp = totalSlcsp(input);
    const aptc = totalAptc(input);
    if (
      premium === 0 && slcsp === 0 && aptc === 0 &&
      !input.shared_policy_allocations?.length
    ) {
      return input.annual_premium !== undefined ||
          input.annual_slcsp !== undefined ||
          input.annual_aptc !== undefined ||
          input.monthly_premiums !== undefined ||
          input.monthly_slcsps !== undefined ||
          input.monthly_aptcs !== undefined
        ? noForm8962Required()
        : { outputs: [] };
    }
    if (
      input.taxpayer_modified_agi === undefined ||
      input.household_size === undefined ||
      input.fpl_region === undefined || input.filing_status === undefined
    ) {
      throw new Error(
        "Form 8962 requires taxpayer modified AGI, family size, FPL region, and filing status",
      );
    }
    if (input.dependent_income_complete !== true) {
      throw new Error(
        "Form 8962 needs verified dependent filing and modified-AGI facts",
      );
    }
    const taxpayerMagi = input.taxpayer_modified_agi;
    const expected8814 = input.form8814_expected_ssns ?? [];
    const reported8814 = input.form8814_children ?? [];
    const reportedBySsn = new Map(
      reported8814.map((child) => [child.ssn, child.magi]),
    );
    if (
      new Set(expected8814).size !== expected8814.length ||
      reportedBySsn.size !== reported8814.length ||
      expected8814.some((ssn) => !ssn || !reportedBySsn.has(ssn))
    ) {
      throw new Error(
        "Form 8962 needs a matching Form 8814 for each elected dependent",
      );
    }
    const dependentsMagi = (input.dependents_modified_agi ?? 0) +
      expected8814.reduce((sum, ssn) => sum + (reportedBySsn.get(ssn) ?? 0), 0);
    const income = Math.max(0, taxpayerMagi + dependentsMagi);
    const fpl = federalPovertyLevel(
      input.household_size,
      input.fpl_region,
      cfg,
    );
    const incomePct = income > 4 * fpl ? 401 : Math.floor(income / fpl * 100);
    const baseFields = {
      household_size: input.household_size,
      taxpayer_modified_agi: taxpayerMagi,
      dependents_modified_agi: dependentsMagi,
      household_income: income,
      federal_poverty_line: fpl,
      fpl_region: input.fpl_region,
      federal_poverty_pct: incomePct,
    };
    const mfsStatus = input.filing_status === FilingStatus.MFS
      ? input.mfs_ptc_status
      : undefined;
    if (input.filing_status === FilingStatus.MFS && !mfsStatus) {
      throw new Error(
        "Form 8962 MFS needs verified exception and policy-allocation facts before filing",
      );
    }
    const allocations = input.shared_policy_allocations ?? [];
    const hasMfsAllocation = allocations.some((row) =>
      row.basis === "mfs_exception" || row.basis === "mfs_no_exception"
    );
    if (hasMfsAllocation && !mfsStatus) {
      throw new Error("Form 8962 shared MFS policy needs MFS filing status");
    }
    if (mfsStatus && allocations.length > 0 && !hasMfsAllocation) {
      throw new Error("Form 8962 MFS status requires Situation 2 allocation");
    }
    if (
      mfsStatus?.policy_scope === "shared_with_spouse" &&
      allocations.length === 0
    ) {
      throw new Error("Form 8962 MFS shared policy allocation is missing");
    }
    if (
      mfsStatus?.policy_scope === "family_only" && allocations.length > 0
    ) {
      throw new Error(
        "Form 8962 family-only MFS status conflicts with shared policy allocation",
      );
    }
    for (const row of allocations) {
      if (row.start_month > row.end_month) {
        throw new Error("Form 8962 shared policy months are reversed");
      }
      if (mfsStatus) {
        const expectedBasis = mfsStatus.basis === "no_exception"
          ? "mfs_no_exception"
          : "mfs_exception";
        if (
          row.basis !== expectedBasis || row.aptc_pct !== 0.5 ||
          row.slcsp_pct !== undefined ||
          (row.basis === "mfs_exception" && row.premium_pct !== 0.5) ||
          (row.basis === "mfs_no_exception" &&
            row.premium_pct !== undefined)
        ) {
          throw new Error(
            "Form 8962 MFS policy allocation does not match exception status",
          );
        }
      } else if (
        row.basis !== "divorce_agreed" &&
        row.basis !== "divorce_no_agreement" &&
        row.basis !== "other_agreed" &&
        row.basis !== "other_no_agreement" &&
        row.basis !== "no_aptc"
      ) {
        throw new Error("Form 8962 shared policy allocation basis is invalid");
      } else if (row.basis === "no_aptc") {
        if (
          row.premium_pct === undefined || row.slcsp_pct !== undefined ||
          row.aptc_pct !== undefined
        ) {
          throw new Error(
            "Form 8962 Situation 3 allocates premiums only and has no APTC",
          );
        }
      } else if (
        row.premium_pct === undefined || row.slcsp_pct === undefined ||
        row.aptc_pct === undefined ||
        row.premium_pct !== row.slcsp_pct ||
        row.premium_pct !== row.aptc_pct ||
        (row.basis === "divorce_no_agreement" && row.premium_pct !== 0.5)
      ) {
        throw new Error(
          "Form 8962 shared policy must allocate all three amounts equally",
        );
      }
    }
    if (allocations.length > 0 && input.annual_line11_eligible === true) {
      throw new Error("Form 8962 shared policy must use monthly calculation");
    }
    if (mfsStatus?.basis === "no_exception") {
      return aptcOnlyRepayment(input, aptc, baseFields, ctx.taxYear);
    }
    if (incomePct < 100) {
      const status = input.below_100_fpl_status;
      if (!status) {
        throw new Error(
          "Form 8962 below 100% FPL needs verified PTC exception facts before filing",
        );
      }
      if (status.basis === "marketplace_estimate" && aptc === 0) {
        throw new Error(
          "Form 8962 below 100% FPL marketplace-estimate route requires paid APTC",
        );
      }
      if (status.basis === "not_applicable") {
        return aptcOnlyRepayment(input, aptc, baseFields, ctx.taxYear);
      }
    }

    const hasMonthlyColumns = input.monthly_premiums !== undefined ||
      input.monthly_slcsps !== undefined || input.monthly_aptcs !== undefined;
    if (
      hasMonthlyColumns &&
      (!input.monthly_premiums || !input.monthly_slcsps || !input.monthly_aptcs)
    ) {
      throw new Error(
        "Form 8962 monthly calculation needs all three 1095-A columns for each month",
      );
    }
    if (!hasMonthlyColumns && input.annual_line11_eligible !== true) {
      throw new Error(
        "Form 8962 annual line 11 needs verified full-year unchanged monthly coverage",
      );
    }
    const monthly = hasMonthlyColumns && input.annual_line11_eligible !== true;
    const qsehraFacts = input.qsehra_monthly_facts;
    if (
      input.qsehra_amount_offered !== undefined &&
      input.qsehra_w2_reported_benefit !== undefined &&
      Math.abs(
          input.qsehra_amount_offered - input.qsehra_w2_reported_benefit,
        ) > 0.01
    ) {
      throw new Error(
        "Form 8962 QSEHRA benefit disagrees with W-2 code FF",
      );
    }
    const annualQsehraBenefit = input.qsehra_w2_reported_benefit ??
      input.qsehra_amount_offered;
    if ((annualQsehraBenefit ?? 0) > 0 && !qsehraFacts) {
      throw new Error(
        "Form 8962 QSEHRA needs monthly affordability and benefit facts before PTC can be filed",
      );
    }
    if (qsehraFacts) {
      const monthlyBenefit = qsehraFacts.reduce(
        (sum, facts) => sum + (facts?.permitted_benefit ?? 0),
        0,
      );
      if (
        annualQsehraBenefit === undefined ||
        Math.abs(monthlyBenefit - annualQsehraBenefit) > 0.01 ||
        !qsehraFacts.some((facts) => facts !== null)
      ) {
        throw new Error(
          "Form 8962 QSEHRA monthly benefits must reconcile to the annual permitted benefit",
        );
      }
    }
    const line7ApplicableFigure = applicableFigure(incomePct, ctx.taxYear);
    const annualContribution = line7ApplicableFigure === null
      ? undefined
      : Math.round(income * line7ApplicableFigure);
    const monthlyContribution = annualContribution === undefined
      ? undefined
      : Math.round(annualContribution / 12);
    const monthlyRows = monthly
      ? input.monthly_premiums!.map((monthPremium, index) => {
        const monthSlcsp = input.monthly_slcsps![index];
        const monthAptc = input.monthly_aptcs![index];
        const maxAssistance = annualContribution === undefined
          ? 0
          : Math.max(0, monthSlcsp - monthlyContribution!);
        return {
          month_code: MONTH_CODES[index],
          premium: monthPremium,
          slcsp: monthSlcsp,
          contribution: monthlyContribution,
          max_assistance: maxAssistance,
          allowed_credit: qsehraMonthlyCredit(
            Math.min(monthPremium, maxAssistance),
            income,
            qsehraFacts?.[index] ?? null,
            ctx.taxYear,
          ),
          aptc: monthAptc,
        };
      })
      : undefined;
    const annualMaxAssistance = annualContribution === undefined
      ? 0
      : Math.max(0, slcsp - annualContribution);
    const annualTentativeCredit = annualContribution === undefined
      ? 0
      : allowedPtc(slcsp, premium, annualContribution);
    const allowed = monthlyRows
      ? monthlyRows.reduce((sum, row) => sum + row.allowed_credit, 0)
      : qsehraFacts
      ? qsehraFacts.reduce(
        (sum, facts) =>
          sum + qsehraMonthlyCredit(
            annualTentativeCredit / 12,
            income,
            facts,
            ctx.taxYear,
          ),
        0,
      )
      : annualTentativeCredit;
    const line24 = Math.round(allowed);
    const line25 = Math.round(aptc);
    // Pub. 974 Worksheet N/Q: no Form 8962 when QSEHRA leaves no PTC and
    // no APTC was paid for anyone in the tax family.
    if (qsehraFacts && line24 === 0 && line25 === 0) {
      return noForm8962Required();
    }
    const line26 = Math.max(0, line24 - line25);
    const line27 = Math.max(0, line25 - line24);
    const cap = line27 > 0
      ? repaymentCap(incomePct, input.filing_status, ctx.taxYear)
      : null;
    const line29 = cap === null ? line27 : Math.min(line27, cap);

    const formFields: Record<string, unknown> = {
      ...baseFields,
      ...(mfsStatus ? { mfs_exception_ind: true } : {}),
      ...(qsehraFacts ? { qsehra_ind: true } : {}),
      ...(allocations.length > 0
        ? { shared_policy_allocations: allocations }
        : {}),
      total_premium_tax_credit: line24,
      total_advance_ptc: line25,
      ...(annualContribution !== undefined && {
        applicable_figure: line7ApplicableFigure,
        annual_applicable_contribution: annualContribution,
        monthly_applicable_contribution: monthlyContribution,
      }),
      ...(monthlyRows ? { monthly_ptc_rows: monthlyRows } : {
        annual_premium: premium,
        annual_slcsp: slcsp,
        annual_max_ptc: annualMaxAssistance,
        annual_ptc_allowed: line24,
        annual_aptc: aptc,
      }),
      ...(line26 > 0 && { net_premium_tax_credit: line26 }),
      ...(line27 > 0 && {
        excess_advance_payment: line27,
        ...(cap !== null && { repayment_limitation: cap }),
        ...(ctx.taxYear === 2025 ? { excess_advance_premium: line29 } : {}),
      }),
    };
    return { outputs: buildOutputs(line26, line29, formFields) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8962 = new Form8962Node();
