import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  isQualifiedTipsOccupationCode,
  seniorZeroExclusionsReviewSchema,
} from "../../nodes/intermediate/forms/deductions/additional/schedule1a/calculation.ts";
import {
  seniorDeductionPerPerson,
  steppedDeductionPhaseout,
} from "../../nodes/intermediate/forms/deductions/additional/schedule1a/amounts.ts";
import { standard_deduction_2026 } from "./standard_deduction.ts";

const reference = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const dollars = money.int();
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const normalize = (value: string) => value.replaceAll("-", "");

// The published occupation codes were rechecked against IRS.gov/TippedOccupations
// on October 15, 2026; they match the shared list. TP alone is not qualification.
const tipReviewSchema = z.object({
  source_document_reference: reference,
  employee_ssn: ssn,
  employer_ein: ein,
  allocations: z.array(
    z.object({
      occupation_code: z.string().refine(
        isQualifiedTipsOccupationCode,
        "Occupation is not on the reviewed IRS tipped-occupation list",
      ),
      qualified_cash_tips: money.positive(),
      occupation_and_tip_records_reference: reference,
    }).strict(),
  ),
  excluded_cash_tips: money,
  qualification_review_reference: reference,
  voluntary_customer_tips_not_service_charges: z.literal(true),
  no_recharacterized_wages_or_related_payor_tips: z.literal(true),
  services_not_illegal_under_applicable_law: z.literal(true),
  // Notice 2025-69 SSTB relief remains applicable for calendar 2026; the
  // April 2026 final regulations reserve the SSTB rule for later guidance.
  sstb_treatment: z.enum(["not_sstb", "notice_2025_69_transition_relief"]),
}).strict();

/** Public evidence, not calculated AGI, deduction amounts or W-2 copies. */
export const claimInputSchema = z.object({
  tax_year: z.literal(2026),
  part1_zero_exclusions_review: seniorZeroExclusionsReviewSchema.optional(),
  employee_tip_reviews: z.array(tipReviewSchema).optional(),
  source_scope_review: z.object({
    record_reference: reference,
    has_form4137_tips: z.boolean(),
    has_business_tips: z.boolean(),
    has_non_w2_overtime: z.boolean(),
    has_vehicle_loan_interest: z.boolean(),
  }).strict(),
}).strict();

const w2SourceSchema = z.object({
  employee_ssn: ssn,
  employer_ein: ein,
  employer_name: reference,
  source_document_reference: reference,
  box1_wages: money,
  statutory_employee: z.boolean(),
  cash_tips: money,
  qualified_overtime: money,
  occupation_codes: z.array(z.string().regex(/^\d{3}$/)).max(2),
}).strict();

// Positive Part I values belong to upstream exclusion calculators, not public
// intake. Each printed source amount includes its source document reference.
const addback = z.object({ amount: dollars, source_reference: reference })
  .strict();
export const inputSchema = claimInputSchema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  taxpayer_has_valid_ssn: z.boolean(),
  taxpayer_ssn_review_complete: z.boolean().optional(),
  spouse_ssn_review_complete: z.boolean().optional(),
  spouse_has_valid_ssn: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean(),
  spouse_age_65_or_older: z.boolean().optional(),
  // Existing AGI handoff uses the name magi for unmodified Form 1040 AGI.
  magi: z.number().int().safe(),
  form2555_line45_from_agi: dollars.optional(),
  w2_2026_sources: z.array(w2SourceSchema).default([]),
  magi_addbacks_2026: z.object({
    puerto_rico_excluded_income: addback,
    form2555_line45: addback,
    form2555_line50: addback,
    form4563_line15: addback,
  }).strict().optional(),
}).strict();
export type Schedule1A2026Input = z.input<typeof inputSchema>;

/** Employee TP/TT and senior path. Other sources are held for their own owners. */
export function calculateSchedule1A2026(raw: Schedule1A2026Input) {
  const input = inputSchema.parse(raw);
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint && (!input.spouse_ssn ||
      normalize(input.spouse_ssn) === normalize(input.taxpayer_ssn) ||
      input.spouse_has_valid_ssn === undefined ||
      input.spouse_age_65_or_older === undefined)
  ) {
    throw new Error(
      "Joint Schedule 1-A needs distinct spouse identity and eligibility facts",
    );
  }
  const ownerEligible = (owner: string) => {
    if (normalize(owner) === normalize(input.taxpayer_ssn)) {
      return input.taxpayer_has_valid_ssn;
    }
    if (joint && normalize(owner) === normalize(input.spouse_ssn!)) {
      return input.spouse_has_valid_ssn!;
    }
    throw new Error("Schedule 1-A source owner does not belong to this return");
  };
  if (input.filing_status !== FilingStatus.MFS) {
    const hasSource = (owner: string) =>
      input.w2_2026_sources.some((source) =>
        normalize(source.employee_ssn) === normalize(owner) &&
        (source.cash_tips > 0 || source.qualified_overtime > 0)
      );
    if (
      (input.taxpayer_age_65_or_older || hasSource(input.taxpayer_ssn)) &&
      input.taxpayer_ssn_review_complete !== true
    ) {
      throw new Error(
        "Schedule 1-A taxpayer SSN eligibility review is incomplete",
      );
    }
    if (
      joint && (input.spouse_age_65_or_older || hasSource(input.spouse_ssn!)) &&
      input.spouse_ssn_review_complete !== true
    ) {
      throw new Error(
        "Schedule 1-A spouse SSN eligibility review is incomplete",
      );
    }
  }
  const ids = new Set<string>();
  const employers = new Set<string>();
  for (const source of input.w2_2026_sources) {
    ownerEligible(source.employee_ssn);
    const key = `${normalize(source.employee_ssn)}:${
      normalize(source.employer_ein)
    }`;
    if (ids.has(source.source_document_reference) || employers.has(key)) {
      throw new Error(
        "Duplicate Schedule 1-A W-2 source or owner/employer needs reconciliation",
      );
    }
    ids.add(source.source_document_reference);
    employers.add(key);
    if (source.cash_tips + source.qualified_overtime > source.box1_wages) {
      throw new Error("Schedule 1-A tip and overtime sources exceed W-2 wages");
    }
    if (
      source.statutory_employee &&
      (source.cash_tips || source.qualified_overtime)
    ) {
      throw new Error(
        "Statutory employee Schedule 1-A needs business-source coordination",
      );
    }
  }
  const scope = input.source_scope_review;
  if (
    scope && (scope.has_form4137_tips || scope.has_business_tips ||
      scope.has_non_w2_overtime || scope.has_vehicle_loan_interest)
  ) {
    throw new Error(
      "2026 Schedule 1-A Form 4137, business, non-W-2 overtime and vehicle sources need their receiving calculators",
    );
  }
  const marriedSeparate = input.filing_status === FilingStatus.MFS;
  const taxpayerSenior = !marriedSeparate && input.taxpayer_has_valid_ssn &&
    input.taxpayer_age_65_or_older;
  const spouseSenior = joint && input.spouse_has_valid_ssn &&
    input.spouse_age_65_or_older;
  const eligibleSources = input.w2_2026_sources.filter((source) =>
    !marriedSeparate && ownerEligible(source.employee_ssn)
  );
  const active = taxpayerSenior || spouseSenior ||
    eligibleSources.some((s) => s.cash_tips > 0 || s.qualified_overtime > 0);
  if (active && !scope) {
    throw new Error(
      "Schedule 1-A needs a source scope review before deductions are resolved",
    );
  }
  const addbacks = input.magi_addbacks_2026;
  if (
    input.part1_zero_exclusions_review && addbacks &&
    Object.values(addbacks).some((source) => source.amount > 0)
  ) {
    throw new Error(
      "Schedule 1-A zero-exclusion review conflicts with sourced addbacks",
    );
  }
  if (active && !input.part1_zero_exclusions_review && !addbacks) {
    throw new Error(
      "Schedule 1-A needs sourced Part I exclusions, including reviewed zeros",
    );
  }
  const line2a = addbacks?.puerto_rico_excluded_income.amount ?? 0;
  const line2b = addbacks?.form2555_line45.amount ?? 0;
  const line2c = addbacks?.form2555_line50.amount ?? 0;
  const line2d = addbacks?.form4563_line15.amount ?? 0;
  if (
    input.form2555_line45_from_agi !== undefined &&
    line2b !== input.form2555_line45_from_agi
  ) {
    throw new Error(
      "Schedule 1-A Form 2555 addback must reconcile to the AGI exclusion",
    );
  }
  const line2e = line2a + line2b + line2c + line2d;
  const magi = input.magi + line2e;
  if (!Number.isSafeInteger(magi)) {
    throw new Error("Schedule 1-A MAGI exceeds whole-dollar range");
  }
  const reviews = new Map<string, z.infer<typeof tipReviewSchema>>();
  for (const review of input.employee_tip_reviews ?? []) {
    const source = input.w2_2026_sources.find((s) =>
      s.source_document_reference === review.source_document_reference
    );
    if (
      !source || source.cash_tips === 0 ||
      normalize(source.employee_ssn) !== normalize(review.employee_ssn) ||
      normalize(source.employer_ein) !== normalize(review.employer_ein)
    ) {
      throw new Error(
        "Tip review must match an issued W-2 source and owner/employer",
      );
    }
    if (reviews.has(review.source_document_reference)) {
      throw new Error("Duplicate employee tip review");
    }
    const codes = review.allocations.map((a) => a.occupation_code);
    if (new Set(codes).size !== codes.length) {
      throw new Error("Duplicate tip occupation allocation");
    }
    const total = review.excluded_cash_tips +
      review.allocations.reduce((n, a) => n + a.qualified_cash_tips, 0);
    if (Math.abs(total - source.cash_tips) > 0.000001) {
      throw new Error(
        "Qualified and excluded tip allocations must reconcile to issued TP cash tips",
      );
    }
    reviews.set(review.source_document_reference, review);
  }
  const employeeRows = eligibleSources.filter((s) => s.cash_tips > 0).map(
    (source) => {
      const review = reviews.get(source.source_document_reference);
      if (!review) {
        throw new Error(
          "TP cash tips require an occupation allocation and qualification review",
        );
      }
      const qualified = Math.round(
        review.allocations.reduce((n, a) => n + a.qualified_cash_tips, 0),
      );
      return {
        ...source,
        review,
        qualified_w2_tips: qualified,
        form4137_tips: 0,
        // Form 4137 is explicitly excluded by the current source-scope contract.
        line4_tips: qualified,
      };
    },
  );
  const overtimeRows = eligibleSources.filter((s) => s.qualified_overtime > 0)
    .map((source) => ({
      ...source,
      line16_overtime: Math.round(source.qualified_overtime),
    }));
  const line5 = employeeRows.reduce((n, r) => n + r.line4_tips, 0);
  const line17 = overtimeRows.reduce((n, r) => n + r.line16_overtime, 0);
  const threshold = joint ? 300_000 : 150_000;
  const phaseout = steppedDeductionPhaseout(magi, threshold, 100, "down");
  const line9 = Math.min(line5, 25_000);
  const line15 = Math.max(0, line9 - phaseout.reduction);
  const line21 = Math.min(line17, joint ? 25_000 : 12_500);
  const line27 = Math.max(0, line21 - phaseout.reduction);
  const seniorThreshold = joint ? 150_000 : 75_000;
  const senior = seniorDeductionPerPerson(magi, seniorThreshold, 6_000, 0.06);
  const line42a = taxpayerSenior ? senior.amount : 0;
  const line42b = spouseSenior ? senior.amount : 0;
  const line43 = line42a + line42b;
  return {
    source_input: input,
    employee_rows: employeeRows,
    overtime_rows: overtimeRows,
    // Eligibility and phaseout-zero results are retained even when no deduction remains.
    has_eligible_activity: Boolean(active),
    lines: {
      line1: input.magi,
      line2a,
      line2b,
      line2c,
      line2d,
      line2e,
      line3: magi,
      line5,
      line7: 0,
      line8: line5,
      line9,
      line10: magi,
      line11: threshold,
      line12: phaseout.excess,
      line13: phaseout.steps,
      line14: phaseout.reduction,
      line15,
      line17,
      line19: 0,
      line20: line17,
      line21,
      line22: magi,
      line23: threshold,
      line24: phaseout.excess,
      line25: phaseout.steps,
      line26: phaseout.reduction,
      line27,
      line36: 0,
      line37: magi,
      line38: seniorThreshold,
      line39: senior.excess,
      line40: senior.reduction,
      line41: senior.amount,
      line42a,
      line42b,
      line43,
      line44: line15 + line27 + line43,
    },
  };
}

class Schedule1A2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([standard_deduction_2026]);
  compute(ctx: NodeContext, raw: Schedule1A2026Input): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 1-A needs f1040:2026 context");
    }
    const calculation = calculateSchedule1A2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "standard_deduction",
          fields: {
            schedule1a_line44: calculation.lines.line44,
            schedule1a_line43: calculation.lines.line43,
          },
        },
      ],
    };
  }
}
export const schedule1a_2026 = new Schedule1A2026Node();
