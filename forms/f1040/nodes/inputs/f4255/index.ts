import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

// TY2025 Form 4255 Part I row facts. The former original-credit × year
// shortcut could not distinguish carryover, gross EPE, net EPE, or an EP.
const dollars = z.number().int().nonnegative();

export const rowSchema = z.object({
  source_document_reference: z.string().trim().min(1),
  credit_line: z.enum(["1d", "2a"]),
  prior_credit_claimed: dollars, // column (a)
  gross_epe: dollars, // column (b)
  gross_epe_applied_regular_tax: dollars, // column (c)
  non_epe_applied_regular_tax: dollars, // column (e)
  recaptured_total: dollars, // column (h)
  recaptured_carryover: dollars, // column (i)
  recaptured_non_epe_applied: z.literal(0), // column (j): separate unsupported route
  recaptured_gross_epe_applied: z.literal(0), // column (k): separate unsupported route
  recaptured_net_epe: dollars, // column (l)
  excessive_payment_net_epe: dollars, // column (n)(1)
  excessive_payment_other: z.literal(0), // column (n)(2): separate line 1y route
  excessive_payment_20_percent: dollars, // column (n)(3)
}).superRefine((row, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (row.gross_epe > row.prior_credit_claimed) {
    fail("Form 4255 column (b) exceeds column (a)");
  }
  if (row.gross_epe_applied_regular_tax > row.gross_epe) {
    fail("Form 4255 column (c) exceeds column (b)");
  }
  const nonEpe = row.prior_credit_claimed - row.gross_epe;
  if (row.non_epe_applied_regular_tax > nonEpe) {
    fail("Form 4255 column (e) exceeds non-EPE credit");
  }
  const carryover = row.prior_credit_claimed - row.gross_epe -
    row.non_epe_applied_regular_tax;
  const netEpe = row.gross_epe - row.gross_epe_applied_regular_tax;
  if (row.recaptured_carryover > carryover) {
    fail("Form 4255 column (i) exceeds column (f) carryover");
  }
  if (row.recaptured_non_epe_applied > row.non_epe_applied_regular_tax) {
    fail("Form 4255 column (j) exceeds column (e)");
  }
  if (row.recaptured_gross_epe_applied > row.gross_epe_applied_regular_tax) {
    fail("Form 4255 column (k) exceeds column (c)");
  }
  if (row.recaptured_net_epe > netEpe) {
    fail("Form 4255 column (l) exceeds column (d)");
  }
  if (
    row.recaptured_total !== row.recaptured_carryover +
        row.recaptured_non_epe_applied + row.recaptured_gross_epe_applied +
        row.recaptured_net_epe
  ) {
    fail("Form 4255 column (h) must equal columns (i) through (l)");
  }
});

export const inputSchema = z.object({ rows: z.array(rowSchema).min(1) });
export type F4255Input = z.infer<typeof inputSchema>;
export type F4255Row = z.infer<typeof rowSchema>;

export function calculateForm4255Routes(raw: F4255Input) {
  const input = inputSchema.parse(raw);
  const sum = (
    line: F4255Row["credit_line"],
    key:
      | "recaptured_net_epe"
      | "excessive_payment_net_epe"
      | "excessive_payment_20_percent",
  ) =>
    input.rows.filter((row) => row.credit_line === line).reduce(
      (total, row) => total + row[key],
      0,
    );
  return {
    line1d: sum("2a", "recaptured_net_epe"),
    line1e_1d: sum("1d", "excessive_payment_net_epe"),
    line1e_2a: sum("2a", "excessive_payment_net_epe"),
    line1f_1d: sum("1d", "excessive_payment_20_percent"),
    line1f_2a: sum("2a", "excessive_payment_20_percent"),
    line19: sum("1d", "recaptured_net_epe"),
  };
}

class F4255Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4255";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-prior/f4255--2025.pdf";

  compute(_ctx: NodeContext, rawInput: F4255Input): NodeResult {
    const lines = calculateForm4255Routes(rawInput);
    const fields = {
      ...(lines.line1d > 0 ? { line1d_form4255_net_epe: lines.line1d } : {}),
      ...(lines.line1e_1d + lines.line1e_2a > 0
        ? {
          line1e_form4255_excessive_payment: lines.line1e_1d +
            lines.line1e_2a,
        }
        : {}),
      ...(lines.line1f_1d + lines.line1f_2a > 0
        ? {
          line1f_form4255_20_percent_ep: lines.line1f_1d +
            lines.line1f_2a,
        }
        : {}),
      ...(lines.line19 > 0 ? { line19_form4255_net_epe: lines.line19 } : {}),
    };
    if (lines.line1d > 0) {
      return {
        outputs: [this.outputNodes.output(schedule2, {
          ...fields,
          line1d_form4255_net_epe: lines.line1d,
        })],
      };
    }
    if (lines.line1e_1d + lines.line1e_2a > 0) {
      return {
        outputs: [this.outputNodes.output(schedule2, {
          ...fields,
          line1e_form4255_excessive_payment: lines.line1e_1d +
            lines.line1e_2a,
        })],
      };
    }
    if (lines.line1f_1d + lines.line1f_2a > 0) {
      return {
        outputs: [this.outputNodes.output(schedule2, {
          ...fields,
          line1f_form4255_20_percent_ep: lines.line1f_1d +
            lines.line1f_2a,
        })],
      };
    }
    if (lines.line19 > 0) {
      return {
        outputs: [this.outputNodes.output(schedule2, {
          line19_form4255_net_epe: lines.line19,
        })],
      };
    }
    return { outputs: [] };
  }
}

export const f4255 = new F4255Node();
