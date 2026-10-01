import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import type { FarmSource } from "../../intermediate/forms/schedule_f/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { type RtaaSource, rtaaSourceSchema } from "./rtaa-source.ts";

// Form 1099-G issuer reporting thresholds do not create recipient-side
// taxable-income exclusions. Route any positive amount designated taxable.

export const itemSchema = z.object({
  box_1_unemployment: z.number().nonnegative().optional(),
  box_1_repaid: z.number().nonnegative().optional(),
  box_1_railroad: z.boolean().optional(),
  box_2_state_refund: z.number().nonnegative().optional(),
  box_2_prior_year_itemized: z.boolean().optional(),
  box_2_taxable_recovery_verified_amount: z.number().nonnegative().optional(),
  box_2_recovery_workpaper_reference: z.string().trim().min(1).optional(),
  box_3_tax_year: z.number().int().optional(),
  box_4_federal_withheld: z.number().nonnegative().optional(),
  box_5_rtaa: z.number().nonnegative().optional(),
  box_6_taxable_grants: z.number().nonnegative().optional(),
  box_7_agriculture: z.number().nonnegative().optional(),
  box_8_trade_or_business: z.boolean().optional(),
  box_9_market_gain: z.number().nonnegative().optional(),
  farm_id: z.string().min(1).optional(),
  box_10a_state: z.string().optional(),
  box_10b_state_id: z.string().optional(),
  box_11_state_withheld: z.number().nonnegative().optional(),
  payer_name: z.string().optional(),
  payer_tin: z.string().optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  recipient_tin: z.string().regex(/^\d{9}$/).optional(),
  account_number: z.string().optional(),
}).superRefine((item, ctx) => {
  if ((item.box_5_rtaa ?? 0) > 0) {
    if (!Number.isSafeInteger(item.box_5_rtaa)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box_5_rtaa"],
        message: "Form 1099-G box 5 RTAA needs a whole-dollar amount",
      });
    }
    if (
      !item.payer_name?.trim() ||
      !/^\d{9}$/.test(item.payer_tin?.replace(/\D/g, "") ?? "") ||
      !item.recipient_tin || !item.source_document_reference
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box_5_rtaa"],
        message:
          "Form 1099-G box 5 RTAA needs payer, recipient, and issued-copy identity",
      });
    }
  }
  const refund = item.box_2_state_refund ?? 0;
  const taxable = item.box_2_taxable_recovery_verified_amount;
  if (refund === 0) {
    if ((taxable ?? 0) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box_2_taxable_recovery_verified_amount"],
        message: "Form 1099-G taxable recovery cannot exceed zero box 2 refund",
      });
    }
    return;
  }
  if (
    taxable === undefined || taxable > refund ||
    (item.box_2_prior_year_itemized === false && (taxable ?? 0) > 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box_2_taxable_recovery_verified_amount"],
      message:
        "Form 1099-G box 2 needs a reviewed taxable recovery from zero through the refund, consistent with the prior-year deduction",
    });
  }
  if (!item.box_2_recovery_workpaper_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box_2_recovery_workpaper_reference"],
      message:
        "Form 1099-G box 2 needs a reviewed prior-year tax-benefit workpaper reference",
    });
  }
});

export const inputSchema = z.object({
  f1099gs: z.array(itemSchema),
});

type G99Items = z.infer<typeof itemSchema>[];

const issuedCopyFields = [
  "box_1_unemployment",
  "box_1_railroad",
  "box_2_state_refund",
  "box_3_tax_year",
  "box_4_federal_withheld",
  "box_5_rtaa",
  "box_6_taxable_grants",
  "box_7_agriculture",
  "box_8_trade_or_business",
  "box_9_market_gain",
  "box_10a_state",
  "box_10b_state_id",
  "box_11_state_withheld",
] as const satisfies readonly (keyof G99Items[number])[];

function assertDistinctIssuedCopies(items: G99Items): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (
      !item.source_document_reference || !item.payer_tin ||
      !item.recipient_tin || !item.account_number
    ) continue;
    const key = JSON.stringify([
      item.source_document_reference,
      item.payer_tin.replace(/\D/g, ""),
      item.recipient_tin,
      item.account_number,
      ...issuedCopyFields.map((field) => item[field] ?? null),
    ]);
    if (seen.has(key)) {
      throw new Error(
        "1099-G repeats the same identified payer-issued copy and box amounts",
      );
    }
    seen.add(key);
  }
}

// Pure helpers — one concern each

function netUnemployment(g99s: G99Items): number {
  const totalReceived = g99s.reduce(
    (sum, item) => sum + (item.box_1_unemployment ?? 0),
    0,
  );
  const totalRepaid = g99s.reduce(
    (sum, item) => sum + (item.box_1_repaid ?? 0),
    0,
  );
  return Math.max(0, totalReceived - totalRepaid);
}

function totalStateRefundTaxable(g99s: G99Items): number {
  return g99s.reduce(
    (sum, item) => sum + (item.box_2_taxable_recovery_verified_amount ?? 0),
    0,
  );
}

function totalFederalWithheld(g99s: G99Items): number {
  return g99s.reduce(
    (sum, item) => sum + (item.box_4_federal_withheld ?? 0),
    0,
  );
}

function totalRtaa(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_5_rtaa ?? 0), 0);
}

export function rtaaSources(g99s: G99Items): RtaaSource[] {
  return g99s.filter((item) => (item.box_5_rtaa ?? 0) > 0).map((item) =>
    rtaaSourceSchema.parse({
      payer_name: item.payer_name,
      payer_tin: item.payer_tin?.replace(/\D/g, ""),
      recipient_tin: item.recipient_tin,
      source_document_reference: item.source_document_reference,
      ...(item.account_number ? { account_number: item.account_number } : {}),
      amount: item.box_5_rtaa,
    })
  );
}

export function assertForm1099gRtaaSources(
  raw: unknown,
  retainedRows: unknown,
  expectedAmount: number,
  recipientSsns: readonly string[],
): void {
  const issued = raw === undefined
    ? []
    : rtaaSources(inputSchema.parse(raw).f1099gs);
  const retained = z.array(rtaaSourceSchema).parse(retainedRows ?? []);
  const owners = new Set(recipientSsns.map((ssn) => ssn.replace(/\D/g, "")));
  const identities = issued.map((row) =>
    JSON.stringify([
      row.source_document_reference,
      row.payer_tin,
      row.recipient_tin,
      row.account_number ?? "",
    ])
  );
  const sortRows = (rows: readonly RtaaSource[]) =>
    rows.map((row) => JSON.stringify(row)).sort();
  if (
    !Number.isSafeInteger(expectedAmount) || expectedAmount < 0 ||
    issued.reduce((sum, row) => sum + row.amount, 0) !== expectedAmount ||
    new Set(identities).size !== identities.length ||
    issued.some((row) => !owners.has(row.recipient_tin)) ||
    JSON.stringify(sortRows(issued)) !== JSON.stringify(sortRows(retained))
  ) {
    throw new Error(
      "Schedule 1 RTAA rows must match distinct issued Form 1099-G box 5 copies and filer owners",
    );
  }
}

function totalTaxableGrants(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_6_taxable_grants ?? 0), 0);
}

function schedule1Output(g99s: G99Items): NodeOutput[] {
  const unemploymentNet = netUnemployment(g99s);
  const stateRefund = totalStateRefundTaxable(g99s);
  const rtaa = totalRtaa(g99s);
  const grants = totalTaxableGrants(g99s);

  const fields: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (unemploymentNet > 0) {
    fields.line7_unemployment = unemploymentNet;
  }
  if (stateRefund > 0) {
    fields.line1_state_refund = stateRefund;
  }
  if (rtaa > 0) {
    fields.line8z_rtaa = rtaa;
    fields.f1099g_rtaa_sources = rtaaSources(g99s);
  }
  if (grants > 0) {
    fields.line8z_taxable_grants = grants;
  }

  if (Object.keys(fields).length === 0) return [];
  return [
    output(
      schedule1,
      fields as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>,
    ),
  ];
}

function f1040Output(g99s: G99Items): NodeOutput[] {
  const withheld = totalFederalWithheld(g99s);
  if (withheld === 0) return [];
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

function scheduleFOutput(g99s: G99Items): NodeOutput[] {
  const sources: FarmSource[] = [];
  for (const item of g99s) {
    const agriculture = item.box_7_agriculture ?? 0;
    const marketGain = item.box_9_market_gain ?? 0;
    if (agriculture === 0 && marketGain === 0) continue;
    if (!item.farm_id) {
      throw new Error(
        "1099-G agricultural payments and CCC market gain require farm_id",
      );
    }
    if (agriculture > 0) {
      sources.push({
        farm_id: item.farm_id,
        kind: "1099g_agriculture",
        amount: agriculture,
      });
    }
    if (marketGain > 0) {
      sources.push({
        farm_id: item.farm_id,
        kind: "1099g_ccc_market_gain",
        amount: marketGain,
      });
    }
  }
  return sources.length === 0
    ? []
    : [output(schedule_f, { farm_sources: sources })];
}

class F1099gNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099g";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    f1040,
    schedule_f,
    form6251,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099gs: g99s } = parsed;

    assertDistinctIssuedCopies(g99s);

    if (g99s.length === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      ...schedule1Output(g99s),
      ...f1040Output(g99s),
      ...scheduleFOutput(g99s),
    ];

    // Use the same taxable amount reported on Schedule 1 line 1. Form 6251
    // line 2b reverses that regular-tax income for AMT.
    const taxableStateRefund = totalStateRefundTaxable(g99s);
    if (taxableStateRefund > 0) {
      outputs.push(this.outputNodes.output(form6251, {
        line2b_tax_refund: taxableStateRefund,
      }));
    }

    // Route income items to AGI aggregator
    const unemploymentNet = netUnemployment(g99s);
    const stateRefund = totalStateRefundTaxable(g99s);
    const rtaa = totalRtaa(g99s);
    const grants = totalTaxableGrants(g99s);
    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> =
      {};
    if (unemploymentNet > 0) {
      agiFields.line7_unemployment = unemploymentNet;
    }
    if (stateRefund > 0) {
      agiFields.line1_state_refund = stateRefund;
    }
    if (rtaa > 0) agiFields.line8z_rtaa = rtaa;
    if (grants > 0) {
      agiFields.line8z_taxable_grants = grants;
    }
    if (Object.keys(agiFields).length > 0) {
      outputs.push(this.outputNodes.output(
        agi_aggregator,
        agiFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>,
      ));
    }

    return { outputs };
  }
}

export const f1099g = new F1099gNode();
