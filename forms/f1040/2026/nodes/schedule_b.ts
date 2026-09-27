import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { inputSchema as sharedInputSchema } from "../../nodes/intermediate/aggregation/schedule_b/index.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { form8960 } from "../../nodes/intermediate/forms/form8960/index.ts";
import { f1040_2026_node } from "./f1040.ts";

const adjustmentSchema = z.object({
  label: z.enum([
    "Nominee Distribution",
    "Accrued Interest",
    "OID Adjustment",
    "ABP Adjustment",
    "Treasury ABP Adjustment",
  ]),
  amount: z.number().finite().positive(),
});
const interestDetailSchema = z.object({
  payerName: z.string().min(1),
  gross: z.number().finite().nonnegative(),
  adjustments: z.array(adjustmentSchema),
  net: z.number().finite(),
  sellerFinanced: z.boolean(),
  buyerSsn: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerCityStateZip: z.string().optional(),
});

const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = sharedInputSchema.extend({
  interest_detail: accumulable(interestDetailSchema).optional(),
  foreign_account: z.boolean().optional(),
  fbar_required: z.boolean().optional(),
  foreign_countries: z.array(z.string().min(1)).optional(),
  foreign_trust: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Detail = z.infer<typeof interestDetailSchema>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function interestRows(details: Detail[]) {
  return details.flatMap((detail) => [
    { payerName: detail.payerName, amount: detail.gross },
    ...detail.adjustments.map((adjustment) => ({
      payerName: adjustment.label,
      amount: -adjustment.amount,
    })),
  ]);
}

class ScheduleB2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    agi_aggregator,
    form8960,
  ]);

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule B requires f1040:2026 context");
    }
    const input: Input = inputSchema.parse(rawInput);
    const netAmounts = asArray(input.taxable_interest_net);
    const details = asArray(input.interest_detail);
    if (
      netAmounts.length !== details.length ||
      details.some((detail, index) =>
        detail.net !== detail.gross -
            sum(detail.adjustments.map((adjustment) => adjustment.amount)) ||
        detail.net !== netAmounts[index]
      )
    ) {
      throw new Error(
        "TY2026 Schedule B needs reconciled gross interest and adjustment rows for every payer",
      );
    }
    const line2 = sum(netAmounts);
    const line3 = input.ee_bond_exclusion ?? 0;
    if (line2 < 0 || line3 > line2) {
      throw new Error(
        "TY2026 Schedule B interest and exclusion do not reconcile",
      );
    }
    const line4 = line2 - line3;
    const directDividends = sum(asArray(input.ordinaryDividends));
    const dividendRows = [
      ...asArray(input.ordinaryDividends).map((amount, index) => ({
        payerName: asArray(input.payerName)[index] ?? "",
        amount,
      })),
      ...(input.dividend_info ?? []),
      ...(input.form8814_dividends
        ? [{ payerName: "Form 8814", amount: input.form8814_dividends }]
        : []),
    ];
    const line6 = sum(dividendRows.map((row) => row.amount));
    const requiresPartIII = line4 > 1_500 || line6 > 1_500 ||
      input.foreign_account === true || input.foreign_trust === true;
    const mustFile = requiresPartIII || line3 > 0 ||
      details.some((detail) =>
        detail.sellerFinanced || detail.adjustments.length > 0
      );
    if (requiresPartIII) {
      if (
        input.foreign_account === undefined ||
        input.foreign_trust === undefined
      ) {
        throw new Error(
          "TY2026 Schedule B Part III needs account and trust answers",
        );
      }
    }
    if (input.fbar_required === true && input.foreign_account !== true) {
      throw new Error("Schedule B FBAR answer requires a foreign account");
    }
    if (input.foreign_account === true && input.fbar_required === undefined) {
      throw new Error("Schedule B foreign account needs an FBAR answer");
    }
    if (
      input.fbar_required === true &&
      (input.foreign_countries?.length ?? 0) === 0
    ) {
      throw new Error("Schedule B FBAR filing needs foreign countries");
    }
    if (mustFile && dividendRows.some((row) => !row.payerName.trim())) {
      throw new Error("TY2026 Schedule B needs every dividend payer name");
    }

    const outputs = [];
    if (line4 > 0) {
      outputs.push(
        this.outputNodes.output(f1040_2026_node, {
          line2b_taxable_interest: line4,
        }),
      );
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line2b_taxable_interest: line4,
        }),
      );
      outputs.push(
        this.outputNodes.output(form8960, { line1_taxable_interest: line4 }),
      );
    }
    if (directDividends > 0) {
      outputs.push(
        this.outputNodes.output(f1040_2026_node, {
          line3b_ordinary_dividends: directDividends,
        }),
      );
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line3b_ordinary_dividends: directDividends,
        }),
      );
    }
    const rows = interestRows(details);
    if (rows.length > 0 || dividendRows.length > 0 || mustFile) {
      const printFields: Record<string, unknown> = {
        file_schedule_b: mustFile,
        interest_rows: rows,
        interest_details: details,
        dividend_rows: dividendRows,
        print_line2_total: line2,
        ee_bond_exclusion: line3,
        print_line4_total: line4,
        print_line6_total: line6,
        foreign_account: input.foreign_account,
        fbar_required: input.fbar_required,
        foreign_countries: input.foreign_countries,
        foreign_trust: input.foreign_trust,
        needs_interest_statement: rows.length > 14,
        needs_dividend_statement: dividendRows.length > 15,
      };
      for (const [index, row] of rows.slice(0, 14).entries()) {
        printFields[`print_int_payer_${index + 1}`] = row.payerName;
        printFields[`print_int_amount_${index + 1}`] = row.amount;
      }
      for (const [index, row] of dividendRows.slice(0, 15).entries()) {
        printFields[`print_div_payer_${index + 1}`] = row.payerName;
        printFields[`print_div_amount_${index + 1}`] = row.amount;
      }
      outputs.push({ nodeType: this.nodeType, fields: printFields });
    }
    return { outputs };
  }
}

export const schedule_b_2026 = new ScheduleB2026Node();
