import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { schedule_b } from "../../aggregation/schedule_b/index.ts";

const amount = z.number().int().nonnegative();

export const eligibleStudentSchema = z.object({
  person_name: z.string().trim().min(1).max(35),
  institution_name: z.string().trim().min(1).max(75),
  institution_address: z.object({
    line1: z.string().trim().min(1).max(35),
    line2: z.string().trim().max(35).optional(),
    city: z.string().trim().min(1).max(22),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }),
});

// Bounded 2025 path: domestic tuition/fees, not Coverdell or QTP deposits.
// The two worksheet objects preserve the source lines used for Form 8815
// lines 6 and 9. Callers must not provide a guessed exclusion or MAGI.
export const inputSchema = z.object({
  eligible_students: z.array(eligibleStudentSchema).min(1).max(3),
  qualified_bond_facts: z.object({
    series_ee_or_i: z.literal(true),
    issued_after_1989: z.literal(true),
    owned_by_taxpayer_or_spouse: z.literal(true),
    owner_age_at_issue_at_least_24: z.literal(true),
    redemption_records_retained: z.literal(true),
  }),
  education_facts: z.object({
    all_students_are_taxpayer_spouse_or_claimed_dependents: z.literal(true),
    all_institutions_eligible: z.literal(true),
    expenses_are_eligible_2025_tuition_or_fees: z.literal(true),
    expenses_not_used_for_education_credit_or_tax_free_distribution: z.literal(
      true,
    ),
    no_coverdell_or_qtp_contributions_in_claim: z.literal(true),
    nontaxable_benefits_paid_directly_by_institution_excluded: z.literal(true),
  }),
  line2_qualified_education_expenses: amount,
  line3_nontaxable_education_benefits: amount,
  bond_proceeds: amount.positive(),
  line6_worksheet: z.object({
    paper_ee_face_value: amount,
    electronic_ee_and_i_face_value: amount,
    interest_reported_in_prior_years: amount,
  }),
  line9_worksheet: z.object({
    schedule_b_line2_interest: amount,
    other_1040_and_schedule1_income: z.number().int(),
    schedule1_adjustments: amount,
    foreign_adoption_and_puerto_rico_addbacks: amount,
    finalized_2025_income_lines_reviewed: z.literal(true),
    no_royalty_interest_special_computation: z.literal(true),
  }),
  filing_status: filingStatusSchema,
}).strict();

export type Form8815Input = z.infer<typeof inputSchema>;

function line6Interest(input: Form8815Input): number {
  const worksheet = input.line6_worksheet;
  const basis = worksheet.paper_ee_face_value / 2 +
    worksheet.electronic_ee_and_i_face_value;
  const interest = input.bond_proceeds - basis -
    worksheet.interest_reported_in_prior_years;
  if (interest <= 0 || !Number.isInteger(interest)) {
    throw new Error(
      "Form 8815 line 6 needs positive whole-dollar current-year bond interest",
    );
  }
  return interest;
}

function line9ModifiedAgi(input: Form8815Input): number {
  const worksheet = input.line9_worksheet;
  const magi = worksheet.schedule_b_line2_interest +
    worksheet.other_1040_and_schedule1_income -
    worksheet.schedule1_adjustments +
    worksheet.foreign_adoption_and_puerto_rico_addbacks;
  if (magi < 0) {
    throw new Error(
      "Form 8815 line 9 worksheet cannot be negative in this bounded path",
    );
  }
  return magi;
}

function phaseoutRange(
  status: FilingStatus,
  cfg: NonNullable<(typeof CONFIG_BY_YEAR)[number]>,
): { start: number; end: number } {
  return status === FilingStatus.MFJ
    ? {
      start: cfg.savingsBondPhaseoutStartMfj,
      end: cfg.savingsBondPhaseoutEndMfj,
    }
    : {
      start: cfg.savingsBondPhaseoutStartSingle,
      end: cfg.savingsBondPhaseoutEndSingle,
    };
}

export function calculateForm8815(
  input: Form8815Input,
  cfg: NonNullable<(typeof CONFIG_BY_YEAR)[number]>,
) {
  if (input.filing_status === FilingStatus.MFS) {
    throw new Error(
      "Form 8815 exclusion is not available to married filing separately",
    );
  }
  const line2 = input.line2_qualified_education_expenses;
  const line3 = input.line3_nontaxable_education_benefits;
  const line4 = line2 - line3;
  if (line4 <= 0) {
    throw new Error(
      "Form 8815 line 4 must be positive after nontaxable benefits",
    );
  }
  const line5 = input.bond_proceeds;
  const line6 = line6Interest(input);
  const line7 = Math.min(1, Number((line4 / line5).toFixed(3)));
  const line8 = Math.round(line6 * line7);
  const line9 = line9ModifiedAgi(input);
  const { start: line10, end } = phaseoutRange(input.filing_status, cfg);
  if (line9 >= end) {
    throw new Error("Form 8815 MAGI is at or above the 2025 exclusion ceiling");
  }
  const line11 = Math.max(0, line9 - line10);
  const line12 = Number((line11 / (end - line10)).toFixed(3));
  const line13 = Math.round(line8 * line12);
  const line14 = line8 - line13;
  if (line14 <= 0) {
    throw new Error("Form 8815 has no positive exclusion to claim");
  }
  return {
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
  };
}

export type Form8815Lines = ReturnType<typeof calculateForm8815>;

class Form8815Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8815";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b]);

  compute(ctx: NodeContext, rawInput: Form8815Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    if (ctx.taxYear !== 2025) {
      throw new Error("Form 8815 source-backed path supports TY2025 only");
    }
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm8815(input, cfg);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: lines },
        output(schedule_b, { ee_bond_exclusion: lines.line14 }),
      ],
    };
  }
}

export const form8815 = new Form8815Node();
