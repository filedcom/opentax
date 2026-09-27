import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { schedule1a } from "../schedule1a/index.ts";
import { schedule2_2026 } from "../../../../2026/nodes/schedule2.ts";

const employerSchema = z.object({
  name: z.string().min(1),
  ein: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
  applied_for_ein: z.literal(true).optional(),
  tips_received: z.number().nonnegative(),
  tips_reported: z.number().nonnegative(),
  tipped_occupation_codes: z.array(z.string().regex(/^\d{3}$/)).max(2)
    .optional(),
  qualified_tip_amount: z.number().nonnegative().optional(),
}).strict().superRefine((employer, ctx) => {
  if ((employer.ein === undefined) === (employer.applied_for_ein !== true)) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 employer needs EIN or APPLIED FOR",
    });
  }
  if (employer.tips_reported > employer.tips_received) {
    ctx.addIssue({
      code: "custom",
      message: "Form 4137 reported tips exceed received tips",
    });
  }
  if (
    employer.qualified_tip_amount !== undefined &&
    employer.qualified_tip_amount > employer.tips_received
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Qualified tips exceed Form 4137 line 1(c)",
    });
  }
});

const recipientSchema = z.enum(["taxpayer", "spouse"]);

const formSchema = z.object({
  recipient: recipientSchema,
  employers: z.array(employerSchema).min(1),
  sub_20_tips: z.number().nonnegative().optional(),
  government_employee_tips: z.number().nonnegative().optional(),
  ss_wages_from_w2: z.number().nonnegative().optional(),
  records_support_lower_tips: z.boolean().optional(),
}).strict();

const w2TipSourceSchema = z.object({
  recipient: recipientSchema,
  allocated_tips: z.number().nonnegative(),
  ss_wages_and_tips: z.number().nonnegative().optional(),
}).strict();

export const inputSchema = z.object({
  forms: z.array(formSchema).optional(),
  w2_tip_sources: z.array(w2TipSourceSchema).optional(),
}).strict();

export type Form4137Input = z.infer<typeof inputSchema>;
export type Form4137Calculation = {
  recipient: "taxpayer" | "spouse";
  employers: z.infer<typeof employerSchema>[];
  totalTipsReceived: number;
  totalTipsReported: number;
  unreportedTips: number;
  incidentalTips: number;
  medicareTips: number;
  ssWagesAndTips: number;
  ssWageBaseRoom: number;
  governmentEmployeeTips: number;
  ssTips: number;
  ssTax: number;
  medicareTax: number;
  totalTax: number;
};

export function calculateForm4137(
  input: Form4137Input,
  ssWageBase: number,
): Form4137Calculation[] {
  const forms = input.forms ?? [];
  const sources = input.w2_tip_sources ?? [];
  const recipients = new Set(forms.map((form) => form.recipient));
  if (recipients.size !== forms.length) {
    throw new Error("Form 4137 needs one form per tip recipient");
  }
  for (const source of sources) {
    if (source.allocated_tips > 0 && !recipients.has(source.recipient)) {
      throw new Error(
        `Form 4137 ${source.recipient} allocated tips need employer tip records`,
      );
    }
  }
  return forms.map((form) => {
    const related = sources.filter((source) =>
      source.recipient === form.recipient
    );
    const allocated = related.reduce(
      (sum, source) => sum + source.allocated_tips,
      0,
    );
    const totalTipsReceived = form.employers.reduce(
      (sum, employer) => sum + employer.tips_received,
      0,
    );
    const totalTipsReported = form.employers.reduce(
      (sum, employer) => sum + employer.tips_reported,
      0,
    );
    const unreportedTips = totalTipsReceived - totalTipsReported;
    if (
      allocated > unreportedTips && form.records_support_lower_tips !== true
    ) {
      throw new Error(
        `Form 4137 ${form.recipient} unreported tips are below W-2 allocated tips without supporting records`,
      );
    }
    const incidentalTips = form.sub_20_tips ?? 0;
    if (incidentalTips > unreportedTips) {
      throw new Error("Form 4137 line 5 exceeds unreported tips");
    }
    const medicareTips = unreportedTips - incidentalTips;
    const governmentEmployeeTips = form.government_employee_tips ?? 0;
    if (governmentEmployeeTips > medicareTips) {
      throw new Error(
        "Form 4137 government employee tips exceed Medicare tips",
      );
    }
    const allW2WagesKnown = related.length > 0 &&
      related.every((source) => source.ss_wages_and_tips !== undefined);
    const sourcedWages = allW2WagesKnown
      ? related.reduce(
        (sum, source) => sum + (source.ss_wages_and_tips ?? 0),
        0,
      )
      : undefined;
    if (
      sourcedWages !== undefined && form.ss_wages_from_w2 !== undefined &&
      sourcedWages !== form.ss_wages_from_w2
    ) {
      throw new Error("Form 4137 line 8 disagrees with W-2 wages and tips");
    }
    const ssWagesAndTips = form.ss_wages_from_w2 ?? sourcedWages;
    if (ssWagesAndTips === undefined) {
      throw new Error(
        "Form 4137 line 8 needs all W-2 social security wages and tips",
      );
    }
    const ssWageBaseRoom = Math.max(0, ssWageBase - ssWagesAndTips);
    const ssTips = Math.min(
      Math.max(0, medicareTips - governmentEmployeeTips),
      ssWageBaseRoom,
    );
    const ssTax = Math.round(ssTips * 0.062);
    const medicareTax = Math.round(medicareTips * 0.0145);
    return {
      recipient: form.recipient,
      employers: form.employers,
      totalTipsReceived,
      totalTipsReported,
      unreportedTips,
      incidentalTips,
      medicareTips,
      ssWagesAndTips,
      ssWageBaseRoom,
      governmentEmployeeTips,
      ssTips,
      ssTax,
      medicareTax,
      totalTax: ssTax + medicareTax,
    };
  });
}

class Form4137Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4137";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule2,
    schedule2_2026,
    agi_aggregator,
    schedule1a,
  ]);

  compute(ctx: NodeContext, rawInput: Form4137Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No form4137 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    const forms = calculateForm4137(input, cfg.ssWageBase);
    const tipIncome = forms.reduce((sum, form) => sum + form.unreportedTips, 0);
    const tipTax = forms.reduce((sum, form) => sum + form.totalTax, 0);
    return {
      outputs: [
        ...(tipIncome > 0
          ? [output(f1040, { line1c_unreported_tips: tipIncome })]
          : []),
        ...(tipIncome > 0
          ? [output(agi_aggregator, { line1c_unreported_tips: tipIncome })]
          : []),
        ...(tipTax > 0
          ? [
            ctx.taxYear === 2026
              ? output(schedule2_2026, { line16a_form4137_tip_tax: tipTax })
              : output(schedule2, { line5_unreported_tip_tax: tipTax }),
          ]
          : []),
        ...(ctx.taxYear === 2026
          ? [output(schedule1a, {
            qualified_employee_tip_sources_2026: forms.flatMap((form) =>
              form.employers.map((employer) => ({
                source: "form4137" as const,
                employer_name: employer.name,
                ...(employer.ein && { employer_ein: employer.ein }),
                recipient: form.recipient,
                amount: employer.tips_received,
                ...(employer.tipped_occupation_codes &&
                  { occupation_codes: employer.tipped_occupation_codes }),
                ...(employer.qualified_tip_amount !== undefined &&
                  { qualified_amount: employer.qualified_tip_amount }),
              }))
            ),
          })]
          : []),
      ],
    };
  }
}

export const form4137 = new Form4137Node();
