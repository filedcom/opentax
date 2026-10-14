import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { schedule2 } from "../../../../intermediate/aggregation/taxes/other/schedule2/index.ts";

const dollars = z.number().int().safe().nonnegative();
const reference = z.string().trim().min(1);
const maxRateByCharacter = {
  ordinary: 0.37,
  long_term_capital_gain: 0.20,
  unrecaptured_section_1250: 0.25,
  collectibles_gain: 0.28,
} as const;

const obligationSchema = z.object({
  obligation_id: reference,
  transaction_id: reference,
  origin_year: z.number().int().min(1988).max(2025),
  transaction_sale_price: dollars,
  property_kind: z.enum([
    "nonfarm_real_property",
    "nonfarm_business_or_investment_personal_property",
    "farm_property",
    "individual_personal_use",
  ]),
  seller_is_dealer: z.boolean(),
  origin_year_end_face_amount: dollars.positive(),
  year_end_unpaid_face_amount: dollars,
  gross_profit_percentage: z.number().positive().max(1),
  year_end_unrecognized_gain: dollars,
  gain_character: z.enum([
    "ordinary",
    "long_term_capital_gain",
    "unrecaptured_section_1250",
    "collectibles_gain",
  ]),
  sale_source_reference: reference,
  obligation_source_reference: reference,
  year_end_balance_source_reference: reference,
}).strict();

const originSchema = z.object({
  origin_year: z.number().int().min(1988).max(2025),
  aggregate_qualifying_face_amount: dollars.positive(),
  applicable_percentage: z.number().min(0).max(1),
  origin_year_inventory_reference: reference,
}).strict();

export const inputSchema = z.object({
  seller_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  tax_year_end: z.literal("2025-12-31"),
  underpayment_rate: z.literal(0.07),
  underpayment_rate_source_reference: reference,
  origin_year_workpapers: z.array(originSchema).min(1),
  obligations: z.array(obligationSchema).min(1),
}).strict();

export type F453AInterestInput = z.infer<typeof inputSchema>;

function qualifying(row: F453AInterestInput["obligations"][number]): boolean {
  return !row.seller_is_dealer &&
    (row.property_kind === "nonfarm_real_property" ||
      (row.property_kind ===
          "nonfarm_business_or_investment_personal_property" &&
        row.origin_year >= 1989)) &&
    row.transaction_sale_price > 150_000;
}

/** Section 453A(c), using each origin year's fixed percentage. */
export function calculateSection453aInterest(raw: unknown): number {
  const input = inputSchema.parse(raw);
  const ids = new Set<string>();
  const salePriceByTransaction = new Map<string, number>();
  for (const row of input.obligations) {
    if (ids.has(row.obligation_id)) {
      throw new Error("Section 453A workpaper has duplicate obligation IDs");
    }
    ids.add(row.obligation_id);
    const earlierPrice = salePriceByTransaction.get(row.transaction_id);
    if (
      earlierPrice !== undefined &&
      earlierPrice !== row.transaction_sale_price
    ) {
      throw new Error("Section 453A transaction has conflicting sale prices");
    }
    salePriceByTransaction.set(row.transaction_id, row.transaction_sale_price);
    if (row.year_end_unpaid_face_amount > row.origin_year_end_face_amount) {
      throw new Error("Section 453A unpaid face exceeds the origin obligation");
    }
    if (
      row.origin_year === 2025 &&
      row.year_end_unpaid_face_amount !== row.origin_year_end_face_amount
    ) {
      throw new Error(
        "Section 453A 2025 origin face must equal its 2025 year-end unpaid face",
      );
    }
    if (
      row.year_end_unrecognized_gain !==
        Math.round(
          row.year_end_unpaid_face_amount * row.gross_profit_percentage,
        )
    ) {
      throw new Error(
        "Section 453A unrecognized gain differs from unpaid face and gross profit percentage",
      );
    }
  }

  const groups = new Map<
    number,
    F453AInterestInput["origin_year_workpapers"][number]
  >();
  for (const group of input.origin_year_workpapers) {
    if (groups.has(group.origin_year)) {
      throw new Error("Section 453A has duplicate origin-year workpapers");
    }
    groups.set(group.origin_year, group);
    const actualFace = input.obligations
      .filter((row) => row.origin_year === group.origin_year && qualifying(row))
      .reduce((sum, row) => sum + row.origin_year_end_face_amount, 0);
    if (actualFace !== group.aggregate_qualifying_face_amount) {
      throw new Error(
        "Section 453A origin-year aggregate face differs from its qualifying obligation inventory",
      );
    }
    const percentage = actualFace > 5_000_000
      ? (actualFace - 5_000_000) / actualFace
      : 0;
    if (Math.abs(group.applicable_percentage - percentage) > 0.000001) {
      throw new Error(
        "Section 453A origin-year applicable percentage differs from aggregate face",
      );
    }
  }
  const qualifyingRows = input.obligations.filter(qualifying);
  if (
    qualifyingRows.some((row) => !groups.has(row.origin_year))
  ) {
    throw new Error(
      "Section 453A qualifying obligation lacks its origin-year workpaper",
    );
  }
  const interest = qualifyingRows.reduce((sum, row) => {
    const percentage = groups.get(row.origin_year)!.applicable_percentage;
    return sum + row.year_end_unrecognized_gain *
        maxRateByCharacter[row.gain_character] * percentage *
        input.underpayment_rate;
  }, 0);
  if (!Number.isSafeInteger(Math.round(interest))) {
    throw new Error("Section 453A interest exceeds safe whole dollars");
  }
  return Math.round(interest);
}

class F453AInterestNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f453a_interest";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: F453AInterestInput): NodeResult {
    const amount = calculateSection453aInterest(rawInput);
    return {
      outputs: amount > 0
        ? [output(schedule2, { line15_section453a_interest: amount })]
        : [],
    };
  }
}

export const f453a_interest = new F453AInterestNode();
