import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { schedule2_2026 } from "../nodes/schedule2.ts";
import { schedule1a_2026 } from "../nodes/schedule1a.ts";
import { form8959 } from "../../nodes/intermediate/forms/taxes/employment/form8959/index.ts";
import { form8919 } from "../../nodes/intermediate/forms/taxes/employment/form8919/index.ts";
import { eitc } from "../../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import { schedule_se } from "../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import {
  calculateForm4137,
  form4137SchemaForYear,
  inputSchema as sharedInputSchema,
} from "../../nodes/intermediate/forms/taxes/employment/form4137/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";
import { form4137TipRowSchema, tipReviewSchema } from "./tip-qualification.ts";

const reference = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const normalize = (value: string) => value.replaceAll("-", "");
const pair = (owner: string, employer: string) =>
  `${normalize(owner)}:${normalize(employer)}`;
const sharedForm = form4137SchemaForYear(2026);
const employerSchema = z.object({
  name: reference,
  ein,
  tips_received: money,
  tips_reported: money,
  tip_records_reference: reference,
  // Qualification covers all line 1(c) tips, not only its unreported remainder.
  qualification_review: tipReviewSchema.optional(),
}).strict().refine((row) => row.tips_reported <= row.tips_received, {
  message: "Form 4137 reported tips exceed received tips",
});
const formSchema = sharedForm.omit({
  ss_wages_from_w2: true,
  government_employee_tips: true,
}).extend({
  employers: z.array(employerSchema).min(1),
  government_employee_review: z.object({
    tips_not_covered_by_social_security: money,
    coverage_record_reference: reference,
  }).strict().optional(),
}).strict();
export const claimInputSchema = z.object({
  tax_year: z.literal(2026),
  forms: z.array(formSchema).min(1).max(2),
}).strict();
const w2SourceSchema = sharedInputSchema.shape.w2_tip_sources.unwrap().element
  .extend({
    employee_ssn: ssn,
    employer_name: reference,
    employer_ein: ein,
    source_document_reference: reference,
  }).strict();
export const inputSchema = claimInputSchema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  w2_tip_sources: z.array(w2SourceSchema).default([]),
}).strict();
export type Form4137Input2026 = z.input<typeof inputSchema>;

export function calculateForm4137_2026(raw: Form4137Input2026) {
  const input = inputSchema.parse(raw);
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn ||
      normalize(input.spouse_ssn) === normalize(input.taxpayer_ssn))
  ) {
    throw new Error("Joint Form 4137 needs distinct filer identities");
  }
  const ids = new Set<string>();
  const employers = new Map<string, z.infer<typeof w2SourceSchema>>();
  for (const source of input.w2_tip_sources) {
    if (
      normalize(source.employee_ssn) !== normalize(input.taxpayer_ssn) &&
      !(joint &&
        normalize(source.employee_ssn) === normalize(input.spouse_ssn!))
    ) {
      throw new Error(
        "Form 4137 W-2 source owner does not belong to this return",
      );
    }
    const key = pair(source.employee_ssn, source.employer_ein);
    if (ids.has(source.source_document_reference) || employers.has(key)) {
      throw new Error(
        "Duplicate Form 4137 W-2 source or owner/employer needs reconciliation",
      );
    }
    ids.add(source.source_document_reference);
    employers.set(key, source);
    for (
      const value of [
        source.allocated_tips,
        source.ss_wages_and_tips,
        source.rrta_compensation,
      ]
    ) {
      if (
        value !== undefined &&
        (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER / 100)
      ) {
        throw new Error("Form 4137 source amount exceeds supported range");
      }
    }
  }
  const rows: z.infer<
    typeof form4137TipRowSchema
  >[] = [];
  const sourceForms = input.forms ?? [];
  for (const form of sourceForms) {
    if (form.recipient === "spouse" && !joint) {
      throw new Error("Spouse Form 4137 requires a joint return");
    }
    const owner = form.recipient === "taxpayer"
      ? input.taxpayer_ssn
      : input.spouse_ssn!;
    const seen = new Set<string>();
    for (const employer of form.employers) {
      const key = pair(owner, employer.ein);
      if (seen.has(key)) {
        throw new Error("Form 4137 needs one row per owner/employer");
      }
      seen.add(key);
      const source = employers.get(key);
      if (!source || source.employer_name !== employer.name) {
        throw new Error("Form 4137 employer must match its issued W-2");
      }
      if (source.statutory_employee) {
        throw new Error(
          "Statutory employee tips need business-source coordination",
        );
      }
      const review = employer.qualification_review;
      if (
        !review && employer.tips_received > 0 &&
        input.filing_status !== FilingStatus.MFS
      ) {
        throw new Error(
          "Form 4137 line 1(c) tips need a qualification review, including excluded tips",
        );
      }
      let qualified = 0;
      if (review) {
        if (
          review.source_document_reference !==
            source.source_document_reference ||
          pair(review.employee_ssn, review.employer_ein) !== key
        ) {
          throw new Error(
            "Form 4137 qualification review must match W-2 source and owner/employer",
          );
        }
        const codes = review.allocations.map((row) => row.occupation_code);
        if (new Set(codes).size !== codes.length) {
          throw new Error("Duplicate Form 4137 occupation allocation");
        }
        qualified = review.allocations.reduce(
          (sum, row) => sum + row.qualified_cash_tips,
          0,
        );
        if (
          Math.abs(
            qualified + review.excluded_cash_tips - employer.tips_received,
          ) > 0.000001
        ) {
          throw new Error(
            "Form 4137 qualified and excluded tips must reconcile to all line 1(c) tips",
          );
        }
      }
      rows.push({
        employee_ssn: owner,
        employer_ein: employer.ein,
        employer_name: employer.name,
        source_document_reference: source.source_document_reference,
        tip_records_reference: employer.tip_records_reference,
        total_received: employer.tips_received,
        qualified_tips: Math.round(qualified),
      });
    }
  }
  const forms = calculateForm4137(
    {
      taxpayer_ssn: input.taxpayer_ssn,
      spouse_ssn: joint ? input.spouse_ssn : undefined,
      w2_tip_sources: input.w2_tip_sources,
      forms: sourceForms.map((form) => ({
        recipient: form.recipient,
        employers: form.employers.map((
          { name, ein, tips_received, tips_reported },
        ) => ({ name, ein, tips_received, tips_reported })),
        below_20_tip_months: form.below_20_tip_months,
        allocated_tip_records: form.allocated_tip_records,
        government_employee_tips: form.government_employee_review
          ?.tips_not_covered_by_social_security,
      })),
    },
    wages2026.ssWageBase,
    { taxYear: 2026, roundPrintedLines: true },
  );
  return { source_input: input, forms, tip_rows: rows };
}

class Form4137Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4137";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    agi_2026,
    schedule2_2026,
    schedule1a_2026,
    form8959,
    form8919,
    eitc,
    f8812,
    schedule_se,
  ]);
  compute(ctx: NodeContext, raw: Form4137Input2026): NodeResult {
    if (ctx.formType !== "f1040" || ctx.taxYear !== 2026) {
      throw new Error("Form 4137 needs f1040:2026 context");
    }
    const calculation = calculateForm4137_2026(raw);
    if (!calculation.forms.length) return { outputs: [] };
    const income = calculation.forms.reduce(
      (sum, form) => sum + form.unreportedTips,
      0,
    );
    const tax = calculation.forms.reduce((sum, form) => sum + form.totalTax, 0);
    const medicareTips = calculation.forms.reduce(
      (sum, form) => sum + form.medicareTips,
      0,
    );
    return {
      outputs: [
        { nodeType: "form4137", fields: { calculation_2026: calculation } },
        { nodeType: "eitc", fields: { earned_income: income } },
        { nodeType: "f8812", fields: { auto_earned_income: income } },
        {
          nodeType: "schedule_se",
          fields: {
            form4137_sources_2026: calculation.forms.map((form) => ({
              employee_ssn: form.recipient === "taxpayer"
                ? calculation.source_input.taxpayer_ssn
                : calculation.source_input.spouse_ssn!,
              line10_ss_tips: form.ssTips,
            })),
          },
        },
        { nodeType: "f1040", fields: { line1c_unreported_tips: income } },
        {
          nodeType: "agi_aggregator",
          fields: { line1c_unreported_tips: income },
        },
        { nodeType: "schedule2", fields: { line16a_form4137_tip_tax: tax } },
        {
          nodeType: "schedule1a",
          fields: { form4137_tips_2026: calculation.tip_rows },
        },
        { nodeType: "form8959", fields: { unreported_tips: medicareTips } },
        {
          nodeType: "form8919",
          fields: {
            form4137_sources: calculation.forms.map((form) => ({
              recipient: form.recipient,
              line10_ss_tips: form.ssTips,
            })),
          },
        },
      ],
    };
  }
}
export const form4137_2026 = new Form4137Node2026();
