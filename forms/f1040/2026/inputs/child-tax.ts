import {
  calculateGambling2026,
  gamblingSource2026Schema,
} from "./gambling-source.ts";
import { adoptionIncomeBridge2026Schema } from "./adoption-settlement.ts";
import { adoptionSupportWages2026 } from "./adoption-support.ts";
import { businessReturnSource2026Schema } from "./business-qbi.ts";
import { businessChildIncome2026 } from "./business-child-income.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { standardDeduction2026 as deductionConfig } from "../../nodes/config/2026-income.ts";
import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  childTaxFamily2026Schema,
  resolveChildTaxFamily2026,
} from "./child-tax-family.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).transform((s) =>
  s.replaceAll("-", "")
);
const whole = z.number().int().nonnegative();
export const childTaxClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    child_tin: tin,
    business_inventory_reference: ref.optional(),
    adoption_inventory_reference: ref.optional(),
    parent_form8814_election_for_this_child: z.literal(false),
    all_child_income_sources_included: z.literal(true),
    no_nonw2_scholarship_or_qualified_disability_trust_income: z.literal(true),
    school_record_reference: ref,
    full_time_student_months: z.array(z.number().int().min(1).max(12)).max(12),
    complete_support_inventory: z.literal(true),
    all_parents_included: z.literal(true),
    support_records: z.array(
      z.object({
        record_reference: ref,
        amount: z.number().finite().nonnegative(),
        kind: z.enum(["ordinary_support", "scholarship"]),
      }).strict(),
    ).max(200),
    parent_life_records: z.array(
      z.object({
        record_reference: ref,
        parent_tin: tin,
        alive_on_2026_12_31: z.boolean(),
      }).strict(),
    ).min(1).max(3),
    // Full cross-return evidence is unnecessary when the child fails an
    // age/student/support/living-parent test. It is required when tax applies.
    family: childTaxFamily2026Schema.optional(),
    no_directly_connected_itemized_deductions: z.literal(true).optional(),
    no_directly_connected_itemized_deductions_except_gambling: z.literal(true)
      .optional(),
  }).strict(),
}).strict();
export const childTaxInput2026Schema = childTaxClaim2026Schema.partial().extend(
  {
    gambling_sources_2026: gamblingSource2026Schema.optional(),
    business_sources_2026: businessReturnSource2026Schema.optional(),
    adoption_income_2026: adoptionIncomeBridge2026Schema.optional(),
    child_context: z.object({
      taxpayer_ssn: tin,
      spouse_ssn: tin.optional(),
      taxpayer_dob: z.string().date(),
      filing_status: z.nativeEnum(FilingStatus),
      taxpayer_can_be_claimed_as_dependent: z.boolean(),
      taxpayer_blind: z.boolean(),
      tax_residency: z.string().optional(),
    }).strict(),
    income_context: z.object({
      agi: z.number().int(),
      total_income: z.number().int(),
      wages: z.number().int(),
      early_withdrawal_penalty: whole,
      unsupported_child_income_activity: z.boolean(),
    }).strict(),
  },
).strict();
export type ChildTaxInput2026 = z.input<typeof childTaxInput2026Schema>;

export function resolveChildTax2026(
  raw: ChildTaxInput2026,
  options: { requireFamilyTax?: boolean } = {},
) {
  const input = childTaxInput2026Schema.parse(raw),
    { claim, child_context: c, income_context: income } = input;
  if (!claim) {
    return {
      source_input: input,
      eligibility: null,
      family: null,
      source: null,
    };
  }
  if (claim.child_tin !== c.taxpayer_ssn) {
    throw new Error(
      "Child-tax review must belong to this return's primary filer",
    );
  }
  if (c.tax_residency !== "full_year_citizen_or_resident") {
    throw new Error("Child tax needs the citizen/resident return owner");
  }
  if (income.unsupported_child_income_activity) {
    throw new Error(
      "Child tax needs business, foreign, trust and special earned-income worksheets before using these sources",
    );
  }
  if (
    new Set(claim.full_time_student_months).size !==
      claim.full_time_student_months.length ||
    new Set(claim.support_records.map((r) => r.record_reference)).size !==
      claim.support_records.length ||
    new Set(claim.parent_life_records.map((r) => r.parent_tin)).size !==
      claim.parent_life_records.length
  ) {
    throw new Error(
      "Child-tax school, support and parent records must be unique",
    );
  }
  if (claim.parent_life_records.some((p) => p.parent_tin === c.taxpayer_ssn)) {
    throw new Error(
      "Child cannot be their own parent in child-tax eligibility",
    );
  }
  if (
    Boolean(input.business_sources_2026) !==
      Boolean(claim.business_inventory_reference) ||
    input.business_sources_2026 &&
      (claim.business_inventory_reference !==
          input.business_sources_2026.record_reference ||
        input.business_sources_2026.taxpayer_tin !== c.taxpayer_ssn ||
        input.business_sources_2026.filing_status !== c.filing_status)
  ) {
    throw new Error(
      "Child-tax business inventory must bind this filer and the actual business sources",
    );
  }
  const gambling = input.gambling_sources_2026
    ? calculateGambling2026(input.gambling_sources_2026)
    : undefined;
  if (
    gambling &&
    (gambling.source_input.taxpayer_ssn !== c.taxpayer_ssn ||
      gambling.source_input.filing_status !== c.filing_status)
  ) throw new Error("Child gambling sources belong to another filer");
  const connectedGambling = gambling?.schedule_a_line17a ?? 0;
  if (
    connectedGambling > 0
      ? !claim.no_directly_connected_itemized_deductions_except_gambling ||
        claim.no_directly_connected_itemized_deductions
      : !claim.no_directly_connected_itemized_deductions ||
        claim.no_directly_connected_itemized_deductions_except_gambling
  ) {
    throw new Error(
      "Child connected-deduction review disagrees with gambling sources",
    );
  }
  const business = input.business_sources_2026
    ? businessChildIncome2026(input.business_sources_2026)
    : null;
  const adoption = input.adoption_income_2026
    ? adoptionSupportWages2026(
      input.adoption_income_2026,
      c,
      income.wages,
      claim.adoption_inventory_reference,
    )
    : undefined;
  if (!adoption && claim.adoption_inventory_reference) {
    throw Error("Child-tax adoption review needs actual adoption sources");
  }
  const supportEarned = (adoption?.wages_for_support ?? income.wages) +
    (business?.earned_income_for_support ?? 0);
  const age = 2026 - Number(c.taxpayer_dob.slice(0, 4)) +
    (c.taxpayer_dob.endsWith("-01-01") ? 1 : 0);
  const fullTimeStudent = claim.full_time_student_months.length >= 5;
  const support = claim.support_records.reduce(
    (n, r) => n + (fullTimeStudent && r.kind === "scholarship" ? 0 : r.amount),
    0,
  );
  const parentAlive = claim.parent_life_records.some((r) =>
    r.alive_on_2026_12_31
  );
  const ageApplies = age < 18 ||
    (age === 18 || age < 24 && fullTimeStudent) && supportEarned * 2 <= support;
  // The filing/age tests use gross unearned income; line 1 has its own
  // deduction worksheet and can be lower, requiring a stop-after-line-3 form.
  const grossUnearned = Math.max(
    0,
    roundWholeDollars(
      income.total_income - income.wages - (business?.schedule1_line3 ?? 0) +
        (business?.unearned_business_income ?? 0),
    ),
  );
  const line1 = Math.max(
    0,
    roundWholeDollars(
      business && (supportEarned > 0 || business.loss_addback > 0)
        ? income.total_income + business.loss_addback - income.wages -
          business.earned_income_for_line1 - income.early_withdrawal_penalty
        : income.wages === 0
        ? income.agi
        : income.total_income - income.wages - income.early_withdrawal_penalty,
    ),
  );
  const baseThreshold = deductionConfig.standardDeductionBase[c.filing_status];
  const blindAddition = c.taxpayer_blind
    ? deductionConfig.standardDeductionAdditional[c.filing_status]
    : 0;
  const basicThreshold = c.filing_status === FilingStatus.MFS
    ? 5
    : baseThreshold;
  const deductionEarned = Math.max(
    0,
    income.wages +
      (business?.rows.reduce(
        (n, b) => n + b.net_profit - b.allocated_se_deduction,
        0,
      ) ?? 0),
  );
  const grossIncomeForFiling = income.total_income -
    (business?.schedule1_line3 ?? 0) +
    (business?.rows.reduce((n, b) => n + b.gross_income, 0) ?? 0);
  const incomeFilingRequired = c.taxpayer_can_be_claimed_as_dependent
    ? grossUnearned > deductionConfig.dependentMinimum + blindAddition ||
      deductionEarned > baseThreshold + blindAddition ||
      grossIncomeForFiling >
        Math.max(
            deductionConfig.dependentMinimum,
            Math.min(
              deductionEarned,
              baseThreshold - deductionConfig.dependentEarnedIncomeAddition,
            ) + deductionConfig.dependentEarnedIncomeAddition,
          ) + blindAddition
    : grossIncomeForFiling >= basicThreshold +
        (c.filing_status === FilingStatus.MFS ? 0 : blindAddition);
  const filingRequiredProven = incomeFilingRequired ||
    Boolean(business?.self_employment_filing_required);
  const meetsOtherTests = grossUnearned > 2700 && ageApplies && parentAlive &&
    c.filing_status !== FilingStatus.MFJ;
  if (meetsOtherTests && !filingRequiredProven) {
    throw new Error(
      "Child filing requirement needs remaining gross-income and special-filing sources",
    );
  }
  const applies = meetsOtherTests && filingRequiredProven;
  const eligibility = {
    age,
    full_time_student: fullTimeStudent,
    support,
    earned_income_for_support: supportEarned,
    business_workpaper: business,
    adoption_workpaper: adoption,
    parent_alive: parentAlive,
    gross_unearned_income: grossUnearned,
    line1_unearned_income: line1,
    filing_required_proven: filingRequiredProven,
    gross_income_for_filing: grossIncomeForFiling,
    applies,
  };
  if (!applies) {
    return { source_input: input, eligibility, family: null, source: null };
  }
  if (!claim.family) {
    throw new Error(
      "Child tax requires the selected parent and complete sibling return records",
    );
  }
  const family = resolveChildTaxFamily2026(claim.family, c.taxpayer_ssn, {
    requireFamilyTax: options.requireFamilyTax ?? false,
  });
  const s = family.family.selection;
  const naturalParents = s.kind === "surviving_parent"
    ? [s.parent_tin, s.deceased_parent_tin]
    : s.parent_tins;
  if (
    naturalParents.some((t) =>
      !claim.parent_life_records.some((p) => p.parent_tin === t)
    ) || claim.parent_life_records.some((p) =>
      !family.candidate_tins.includes(p.parent_tin)
    )
  ) {
    throw new Error(
      "Child-tax living-parent evidence must bind the selected family",
    );
  }
  if (
    s.kind === "surviving_parent" &&
    (!claim.parent_life_records.find((p) => p.parent_tin === s.parent_tin)
      ?.alive_on_2026_12_31 ||
      claim.parent_life_records.find((p) =>
        p.parent_tin === s.deceased_parent_tin
      )?.alive_on_2026_12_31)
  ) {
    throw new Error(
      "Surviving-parent selection conflicts with the parent's life records",
    );
  }
  return {
    source_input: input,
    eligibility,
    family,
    source: {
      ...family.source,
      child_unearned_income: line1,
      itemized_deductions_directly_connected: connectedGambling,
      itemized_deductions_directly_connected_to_preferential_income: 0,
    },
  };
}

class ChildTax2026Node extends TaxNode<typeof childTaxInput2026Schema> {
  readonly nodeType = "f8615";
  readonly inputSchema = childTaxInput2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["standard_deduction"];
  }
  compute(ctx: NodeContext, raw: ChildTaxInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Child tax requires f1040:2026 context");
    }
    const calculation = resolveChildTax2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        ...(calculation.source_input.claim
          ? [{
            nodeType: "standard_deduction",
            fields: { child_tax_source_2026: calculation.source_input },
          }]
          : []),
      ],
    };
  }
}
export const f8615_2026 = new ChildTax2026Node();
