import { z } from "zod";
import type {
  AtLeastOne,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

// One wholly owned Category 5a CFC, individual shareholder, no section 962
// election. These are reported Schedule I / I-1 facts, not asserted inclusion.
const dollars = z.number().int().nonnegative();
const sourceReference = z.string().trim().min(1);

export enum FilingCategory {
  Category5a = "5a",
}

export const scheduleISchema = z.object({
  line1a: dollars,
  line1b: dollars,
  line1c: dollars,
  line1d: dollars,
  line1e: dollars,
  line1f: dollars,
  line1g: dollars,
  line1h: dollars,
  line2_us_property: dollars,
  // Factoring income has separate reporting treatment outside this route.
  line4_factoring: z.literal(0),
  worksheet_a_reference: sourceReference.optional(),
  worksheet_b_reference: sourceReference.optional(),
}).strict().superRefine((value, ctx) => {
  if (
    value.line1e + value.line1f + value.line1g + value.line1h > 0 &&
    !value.worksheet_a_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["worksheet_a_reference"],
      message: "Positive Schedule I lines 1e–1h need Worksheet A source",
    });
  }
  if (value.line2_us_property > 0 && !value.worksheet_b_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["worksheet_b_reference"],
      message: "Positive Schedule I line 2 needs Worksheet B source",
    });
  }
});

export const testedIncomeSchema = z.object({
  separate_category: z.enum(["GEN", "PAS"]),
  average_exchange_rate: z.string().regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  gross_income_functional: z.number().int(),
  effectively_connected_income_functional: z.number().int(),
  subpart_f_income_functional: z.number().int(),
  high_tax_exception_income_functional: z.number().int(),
  related_party_dividends_functional: z.number().int(),
  foreign_oil_gas_income_functional: z.number().int(),
  allocable_deductions_functional: z.number().int(),
  tested_foreign_taxes_functional: dollars,
  tested_foreign_taxes_usd: dollars,
  qbai_functional: dollars,
  interest_expense_functional: dollars,
  qualified_interest_expense_functional: dollars,
  tested_loss_qbai_functional: z.literal(0),
  tested_interest_expense_functional: dollars,
  interest_income_functional: dollars,
  qualified_interest_income_functional: dollars,
  tested_interest_income_functional: dollars,
  tested_income: dollars,
  pro_rata_tested_income: dollars,
  pro_rata_qbai: dollars,
  pro_rata_tested_interest_income: dollars,
  pro_rata_tested_interest_expense: dollars,
  schedule_i1_source_reference: sourceReference,
}).strict().superRefine((v, ctx) => {
  const rate = Number(v.average_exchange_rate);
  const exclusions = v.effectively_connected_income_functional +
    v.subpart_f_income_functional +
    v.high_tax_exception_income_functional +
    v.related_party_dividends_functional +
    v.foreign_oil_gas_income_functional;
  const testedFunctional = v.gross_income_functional - exclusions -
    v.allocable_deductions_functional;
  const issue = (path: string, message: string) =>
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message,
    });
  if (
    testedFunctional < 0 ||
    Math.round(testedFunctional / rate) !== v.tested_income
  ) {
    issue(
      "tested_income",
      "Schedule I-1 line 6 USD must reconcile to functional-currency lines 1–5 and the reviewed exchange rate",
    );
  }
  if (v.tested_income !== v.pro_rata_tested_income) {
    issue(
      "pro_rata_tested_income",
      "Wholly owned CFC tested income must equal the shareholder pro rata amount",
    );
  }
  if (
    Math.round(v.tested_foreign_taxes_functional / rate) !==
      v.tested_foreign_taxes_usd
  ) {
    issue(
      "tested_foreign_taxes_usd",
      "Schedule I-1 line 7 USD must reconcile to functional currency",
    );
  }
  if (Math.round(v.qbai_functional / rate) !== v.pro_rata_qbai) {
    issue(
      "pro_rata_qbai",
      "Schedule I-1 line 8 USD must reconcile to functional currency",
    );
  }
  if (
    v.tested_interest_expense_functional !==
      Math.max(
        0,
        v.interest_expense_functional -
          v.qualified_interest_expense_functional -
          v.tested_loss_qbai_functional,
      ) ||
    Math.round(v.tested_interest_expense_functional / rate) !==
      v.pro_rata_tested_interest_expense
  ) {
    issue(
      "pro_rata_tested_interest_expense",
      "Schedule I-1 line 9d must reconcile to lines 9a–9c and USD conversion",
    );
  }
  if (
    v.tested_interest_income_functional !==
      Math.max(
        0,
        v.interest_income_functional - v.qualified_interest_income_functional,
      ) ||
    Math.round(v.tested_interest_income_functional / rate) !==
      v.pro_rata_tested_interest_income
  ) {
    issue(
      "pro_rata_tested_interest_income",
      "Schedule I-1 line 10c must reconcile to lines 10a–10b and USD conversion",
    );
  }
});

const scheduleHAdjustmentsSchema = z.object({
  capital_gain_add: z.literal(0),
  capital_gain_subtract: z.literal(0),
  depreciation_add: z.literal(0),
  depreciation_subtract: z.literal(0),
  depletion_add: z.literal(0),
  depletion_subtract: z.literal(0),
  investment_allowance_add: z.literal(0),
  investment_allowance_subtract: z.literal(0),
  statutory_reserves_add: z.literal(0),
  statutory_reserves_subtract: z.literal(0),
  inventory_add: z.literal(0),
  inventory_subtract: z.literal(0),
  income_taxes_add: z.literal(0),
  income_taxes_subtract: z.literal(0),
  foreign_currency_add: z.literal(0),
  foreign_currency_subtract: z.literal(0),
  other_add: z.literal(0),
  other_subtract: z.literal(0),
}).strict();

export const scheduleHSchema = z.object({
  book_net_income_functional: z.number().int(),
  adjustments: scheduleHAdjustmentsSchema,
  dastm_gain_or_loss: z.literal(0),
  passive_category_ep: z.literal(0),
  section901j_category_ep: z.literal(0),
  current_ep_usd: z.number().int(),
  average_exchange_rate: z.string().regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  source_workpaper_reference: sourceReference,
}).strict().refine(
  (value) =>
    Math.round(
      value.book_net_income_functional / Number(value.average_exchange_rate),
    ) === value.current_ep_usd,
  "Schedule H general-category E&P must reconcile from functional currency to U.S. dollars",
);

export const itemSchema = z.object({
  foreign_corp_name: z.string().trim().min(1).max(75)
    .regex(/^([A-Za-z0-9#&'()-] ?)*[A-Za-z0-9#&'()-]$/),
  foreign_corp_ein: z.string().regex(/^\d{9}$/).optional(),
  foreign_corp_reference_id: z.string().trim().regex(/^[A-Za-z0-9]+$/)
    .max(50).optional(),
  country_of_incorporation: z.string().trim().min(1),
  functional_currency: z.string().trim().min(1),
  filing_category: z.literal(FilingCategory.Category5a),
  shareholder_tin: z.string().regex(/^\d{9}$/),
  ownership_percent: z.literal(100),
  section_962_election: z.literal(false),
  reviewed_form5471_source_reference: sourceReference,
  schedule_i: scheduleISchema,
  schedule_i1: testedIncomeSchema,
  schedule_h: scheduleHSchema,
}).strict().refine(
  (value) =>
    (value.foreign_corp_ein === undefined) !==
      (value.foreign_corp_reference_id === undefined),
  "CFC needs exactly one EIN or foreign reference ID",
);

export const inputSchema = z.object({
  f5471s: z.tuple([itemSchema]),
}).strict();

export type F5471Item = z.infer<typeof itemSchema>;

export function calculateCategory5Inclusions(item: F5471Item) {
  const scheduleI = item.schedule_i;
  const section951a = scheduleI.line1a + scheduleI.line1b +
    scheduleI.line1c + scheduleI.line1d + scheduleI.line1e +
    scheduleI.line1f + scheduleI.line1g + scheduleI.line1h +
    scheduleI.line2_us_property;
  // The 2025 Schedule 1 instruction cites Schedule I lines 1a–1h and 2;
  // line 4 factoring does not enter line 8n.
  const tested = item.schedule_i1;
  const netTestedIncome = tested.pro_rata_tested_income;
  const dtir = Math.round(tested.pro_rata_qbai * 0.1);
  const specifiedInterestExpense = Math.max(
    0,
    tested.pro_rata_tested_interest_expense -
      tested.pro_rata_tested_interest_income,
  );
  const netDtir = Math.max(0, dtir - specifiedInterestExpense);
  const gilti = Math.max(0, netTestedIncome - netDtir);
  return {
    section951a,
    gilti,
    form8992: {
      part_i_line1: netTestedIncome,
      part_i_line2: 0,
      part_i_line3: netTestedIncome,
      part_ii_line1: netTestedIncome,
      part_ii_line2: dtir,
      part_ii_line3a: tested.pro_rata_tested_interest_expense,
      part_ii_line3b: tested.pro_rata_tested_interest_income,
      part_ii_line3c: specifiedInterestExpense,
      part_ii_line4: netDtir,
      part_ii_line5: gilti,
    },
  };
}

class F5471Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5471";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const { f5471s: [item] } = inputSchema.parse(rawInput);
    const { section951a, gilti } = calculateCategory5Inclusions(item);
    const fields = {
      ...(section951a > 0 ? { line8n_section951a_inclusion: section951a } : {}),
      ...(gilti > 0 ? { line8o_section951aa_inclusion: gilti } : {}),
    };
    if (Object.keys(fields).length === 0) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(
          schedule1,
          fields as AtLeastOne<z.infer<typeof schedule1.inputSchema>>,
        ),
        this.outputNodes.output(
          agi_aggregator,
          fields as AtLeastOne<z.infer<typeof agi_aggregator.inputSchema>>,
        ),
      ],
    };
  }
}

export const f5471 = new F5471Node();
