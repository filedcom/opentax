import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { form8959 } from "../../intermediate/forms/form8959/index.ts";

const ADDITIONAL_MEDICARE_RATE = 0.009;
const CT2_WITHHOLDING_THRESHOLD = 200_000;

export const itemSchema = z.object({
  recipient: z.enum(["taxpayer", "spouse"]),
  recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  tax_year: z.literal(2025),
  quarter: z.number().int().min(1).max(4),
  line2_tier1_medicare_compensation: z.number().nonnegative(),
  line3_additional_medicare_compensation: z.number().nonnegative(),
  line3_additional_medicare_tax_paid: z.number().nonnegative(),
  payment_reference: z.string().min(1).optional(),
}).strict();

export const inputSchema = z.object({
  ct2s: z.array(itemSchema).min(4).max(8),
});

type CT2Item = z.infer<typeof itemSchema>;

function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function validateRecipientYear(
  items: CT2Item[],
  recipient: CT2Item["recipient"],
): void {
  if (items.length !== 4) {
    throw new Error(`CT-2 ${recipient} needs all four quarterly records`);
  }
  const ordered = [...items].sort((a, b) => a.quarter - b.quarter);
  const recipientSsn = ordered[0].recipient_ssn.replaceAll("-", "");
  if (
    ordered.some((item) =>
      item.recipient_ssn.replaceAll("-", "") !== recipientSsn
    )
  ) {
    throw new Error(`CT-2 ${recipient} quarterly SSNs do not match`);
  }
  let compensationToDate = 0;
  for (let quarter = 1; quarter <= 4; quarter++) {
    const item = ordered[quarter - 1];
    if (item.quarter !== quarter) {
      throw new Error(`CT-2 ${recipient} quarters must be unique and complete`);
    }
    const priorExcess = Math.max(
      0,
      compensationToDate - CT2_WITHHOLDING_THRESHOLD,
    );
    compensationToDate += item.line2_tier1_medicare_compensation;
    const currentExcess = Math.max(
      0,
      compensationToDate - CT2_WITHHOLDING_THRESHOLD,
    );
    const expectedLine3Compensation = toCents(currentExcess - priorExcess);
    if (
      toCents(item.line3_additional_medicare_compensation) !==
        expectedLine3Compensation
    ) {
      throw new Error(
        `CT-2 ${recipient} quarter ${quarter} line 3 compensation does not match the annual $200,000 threshold`,
      );
    }
    const line3Tax = toCents(
      item.line3_additional_medicare_compensation * ADDITIONAL_MEDICARE_RATE,
    );
    const paid = toCents(item.line3_additional_medicare_tax_paid);
    if (paid > 0 && !item.payment_reference) {
      throw new Error(
        `CT-2 ${recipient} quarter ${quarter} line 3 payment needs a reference`,
      );
    }
    if (paid > 0 && paid !== line3Tax) {
      throw new Error(
        `CT-2 ${recipient} quarter ${quarter} line 3 payment must match the calculated tax; partial payments need separate allocation evidence`,
      );
    }
  }
}

class CT2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ct2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8959]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2025) {
      throw new Error("CT-2 source currently requires tax year 2025");
    }
    const { ct2s } = inputSchema.parse(rawInput);
    for (const recipient of ["taxpayer", "spouse"] as const) {
      const records = ct2s.filter((item) => item.recipient === recipient);
      if (records.length > 0) validateRecipientYear(records, recipient);
    }
    const wages = ct2s.reduce(
      (sum, item) => sum + item.line2_tier1_medicare_compensation,
      0,
    );
    const paid = toCents(
      ct2s.reduce(
        (sum, item) => sum + item.line3_additional_medicare_tax_paid,
        0,
      ),
    );
    const taxpayer = ct2s.find((item) => item.recipient === "taxpayer");
    const spouse = ct2s.find((item) => item.recipient === "spouse");
    return {
      outputs: [output(form8959, {
        ct2_rrta_wages: wages,
        ct2_rrta_medicare_tax_paid: paid,
        ...(taxpayer && { ct2_taxpayer_ssn: taxpayer.recipient_ssn }),
        ...(spouse && { ct2_spouse_ssn: spouse.recipient_ssn }),
      })],
    };
  }
}

export const ct2 = new CT2Node();
