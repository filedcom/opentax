import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

const priorYearEvidenceSchema = z.object({
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().date(),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  form6251: z.object({
    tax_year: z.literal(2024),
    filed_document_reference: z.string().trim().min(1),
    filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
    filed_line1_amt: z.number().int().finite(),
    filed_line2e_amt: z.number().int().finite(),
    filed_line10_amt: z.number().int().finite().nonnegative(),
    filed_line11_amt: z.number().int().nonnegative(),
  }).strict().optional(),
  exclusion_part1_reconciliation: z.object({
    form8801_line1_amt: z.number().int().finite(),
    form8801_line14_amt: z.number().int().finite().nonnegative(),
  }).strict().optional(),
  form8801: z.object({
    tax_year: z.literal(2024),
    filed_document_reference: z.string().trim().min(1),
    filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
    filed_line26_credit_carryforward: z.number().int().nonnegative(),
  }).strict().optional(),
}).strict();

export const inputSchema = z.object({
  // Request the normal current Form 6251 workpaper without entering a credit.
  compute_credit_capacity: z.literal(true).optional(),
  // Reviewed prior Form 6251 line 11. This amount alone does not establish
  // the deferral-item credit computed on 2025 Form 8801 line 21.
  prior_year_amt_paid: z.number().nonnegative().optional(),

  // Reviewed prior Form 8801 line 26; actual filed-copy acceptance remains open.
  prior_year_carryforward: z.number().nonnegative().optional(),

  // Regular tax before credits — f1040 line 16 / Schedule 2
  // IRC §53(c)(1)
  current_year_regular_tax: z.number().nonnegative().optional(),

  // Tentative minimum tax from current year Form 6251
  // IRC §53(c)(1)
  current_year_tmt: z.number().nonnegative().optional(),
  prior_year_evidence: priorYearEvidenceSchema.optional(),
}).strict().superRefine((input, context) => {
  if (
    input.compute_credit_capacity === true &&
    Object.keys(input).some((key) => key !== "compute_credit_capacity")
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8801 capacity request cannot contain entered preview credit facts",
    });
  }
  const amt = input.prior_year_amt_paid ?? 0;
  const carryforward = input.prior_year_carryforward ?? 0;
  if (amt <= 0 && carryforward <= 0) return;
  const evidence = input.prior_year_evidence;
  if (
    !evidence ||
    (amt > 0 &&
      (!evidence.form6251 || !evidence.exclusion_part1_reconciliation)) ||
    (carryforward > 0 && !evidence.form8801) ||
    evidence.form6251?.filed_taxpayer_ssn !== undefined &&
      evidence.form6251.filed_taxpayer_ssn !== evidence.taxpayer_ssn ||
    evidence.form8801?.filed_taxpayer_ssn !== undefined &&
      evidence.form8801.filed_taxpayer_ssn !== evidence.taxpayer_ssn ||
    (evidence.form6251?.filed_line11_amt ?? 0) !== amt ||
    evidence.form6251 !== undefined &&
      (evidence.exclusion_part1_reconciliation?.form8801_line1_amt !==
          evidence.form6251.filed_line1_amt +
            evidence.form6251.filed_line2e_amt ||
        evidence.exclusion_part1_reconciliation?.form8801_line14_amt !==
          evidence.form6251.filed_line10_amt) ||
    (evidence.form8801?.filed_line26_credit_carryforward ?? 0) !==
      carryforward ||
    evidence.form6251?.filed_document_reference !== undefined &&
      evidence.form6251.filed_document_reference ===
        evidence.form8801?.filed_document_reference
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prior_year_evidence"],
      message:
        "Form 8801 prior AMT and carryforward need distinct reviewed 2024 Forms 6251/8801 for one taxpayer and reconciled source lines",
    });
  }
});

type F8801Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Staged preview only. The official line 21 also needs the 2024 exclusion-item
// computation, so this is not an exportable Form 8801 credit calculation.
function availableCredit(input: F8801Input): number {
  return (input.prior_year_amt_paid ?? 0) +
    (input.prior_year_carryforward ?? 0);
}

// IRC §53(c)(1) — limitation: excess of regular tax over tentative minimum tax
function excessRegularOverTmt(input: F8801Input): number {
  return Math.max(
    0,
    (input.current_year_regular_tax ?? 0) - (input.current_year_tmt ?? 0),
  );
}

// Preview of a possible credit only; not the official line 25 calculation.
function creditAllowed(input: F8801Input): number {
  return Math.min(availableCredit(input), excessRegularOverTmt(input));
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8801Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8801";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251]);

  compute(_ctx: NodeContext, rawInput: F8801Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (input.compute_credit_capacity === true) {
      return {
        outputs: [
          this.outputNodes.output(form6251, { must_file_for_credit: true }),
        ],
      };
    }

    const credit = creditAllowed(input);
    if (credit === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule3, {
        line6b_prior_year_min_tax_credit: credit,
      }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8801 = new F8801Node();
