import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  itemSchema,
  validateRecipientYear,
} from "../../nodes/inputs/taxes/employment/ct2/index.ts";
import { form8959_2026 } from "../nodes/form8959.ts";
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
export const ct2Item2026Schema = itemSchema.extend({
  tax_year: z.literal(2026),
  source_document_reference: z.string().trim().min(1),
  line2_tier1_medicare_compensation: money,
  line3_additional_medicare_compensation: money,
  line3_additional_medicare_tax_paid: money,
}).strict();
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
export const inputSchema = z.object({
  ct2s: z.array(ct2Item2026Schema).default([]),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
}).strict();
class CT2Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ct2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8959_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("CT-2 needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.ct2s.length) return { outputs: [] };
    if (
      new Set(input.ct2s.map((r) => r.source_document_reference)).size !==
        input.ct2s.length
    ) throw new Error("Duplicate CT-2 source document");
    const rows = [];
    for (const recipient of ["taxpayer", "spouse"] as const) {
      const sources = input.ct2s.filter((r) => r.recipient === recipient);
      if (!sources.length) continue;
      const expected = recipient === "taxpayer"
        ? input.taxpayer_ssn
        : input.spouse_ssn;
      if (
        !expected ||
        (recipient === "spouse" && input.filing_status !== FilingStatus.MFJ) ||
        sources.some((r) =>
          r.recipient_ssn.replaceAll("-", "") !== expected.replaceAll("-", "")
        )
      ) throw new Error("CT-2 source owner does not belong to this return");
      validateRecipientYear(sources, recipient);
      rows.push({
        employee_ssn: expected,
        source_reference: `ct2:2026:${recipient}`,
        compensation: sources.reduce(
          (n, r) => n + r.line2_tier1_medicare_compensation,
          0,
        ),
        additional_tax_paid: Math.round(
          sources.reduce(
            (n, r) => n + r.line3_additional_medicare_tax_paid,
            0,
          ) * 100,
        ) / 100,
      });
    }
    return {
      outputs: [
        { nodeType: "ct2", fields: { reviewed_sources_2026: input.ct2s } },
        { nodeType: "form8959", fields: { ct2_medicare_sources_2026: rows } },
      ],
    };
  }
}
export const ct2_2026 = new CT2Node2026();
