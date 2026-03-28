import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

// TY2025 thresholds from IRS Form 1099-G instructions
const UNEMPLOYMENT_MIN_THRESHOLD = 10;
const STATE_REFUND_MIN_THRESHOLD = 10;
const RTAA_MIN_THRESHOLD = 600;
const GRANTS_MIN_THRESHOLD = 600;

export const itemSchema = z.object({
  box_1_unemployment: z.number().nonnegative().optional(),
  box_1_repaid: z.number().nonnegative().optional(),
  box_1_railroad: z.boolean().optional(),
  box_2_state_refund: z.number().nonnegative().optional(),
  box_2_prior_year_itemized: z.boolean().optional(),
  box_3_tax_year: z.number().int().optional(),
  box_4_federal_withheld: z.number().nonnegative().optional(),
  box_5_rtaa: z.number().nonnegative().optional(),
  box_6_taxable_grants: z.number().nonnegative().optional(),
  box_7_agriculture: z.number().nonnegative().optional(),
  box_8_trade_or_business: z.boolean().optional(),
  box_9_market_gain: z.number().nonnegative().optional(),
  box_10a_state: z.string().optional(),
  box_10b_state_id: z.string().optional(),
  box_11_state_withheld: z.number().nonnegative().optional(),
  payer_name: z.string().optional(),
  payer_tin: z.string().optional(),
  account_number: z.string().optional(),
});

export const inputSchema = z.object({
  f1099gs: z.array(itemSchema),
});

type G99Items = z.infer<typeof itemSchema>[];

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
  return g99s.reduce((sum, item) => {
    const refund = item.box_2_state_refund ?? 0;
    return sum + (item.box_2_prior_year_itemized === true ? refund : 0);
  }, 0);
}

function totalFederalWithheld(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_4_federal_withheld ?? 0), 0);
}

function totalRtaa(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_5_rtaa ?? 0), 0);
}

function totalTaxableGrants(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_6_taxable_grants ?? 0), 0);
}

function totalAgriculture(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_7_agriculture ?? 0), 0);
}

function totalMarketGain(g99s: G99Items): number {
  return g99s.reduce((sum, item) => sum + (item.box_9_market_gain ?? 0), 0);
}

function schedule1Output(g99s: G99Items): NodeOutput[] {
  const unemploymentNet = netUnemployment(g99s);
  const stateRefund = totalStateRefundTaxable(g99s);
  const rtaa = totalRtaa(g99s);
  const grants = totalTaxableGrants(g99s);

  const fields: Record<string, number> = {};
  if (unemploymentNet >= UNEMPLOYMENT_MIN_THRESHOLD) {
    fields.line7_unemployment = unemploymentNet;
  }
  if (stateRefund >= STATE_REFUND_MIN_THRESHOLD) {
    fields.line1_state_refund = stateRefund;
  }
  if (rtaa >= RTAA_MIN_THRESHOLD) {
    fields.line8z_rtaa = rtaa;
  }
  if (grants >= GRANTS_MIN_THRESHOLD) {
    fields.line8z_taxable_grants = grants;
  }

  if (Object.keys(fields).length === 0) return [];
  return [{ nodeType: schedule1.nodeType, input: fields }];
}

function f1040Output(g99s: G99Items): NodeOutput[] {
  const withheld = totalFederalWithheld(g99s);
  if (withheld === 0) return [];
  return [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: withheld } }];
}

function scheduleFOutput(g99s: G99Items): NodeOutput[] {
  const agriculture = totalAgriculture(g99s);
  const marketGain = totalMarketGain(g99s);

  const fields: Record<string, number> = {};
  if (agriculture > 0) fields.line4a_gov_payments = agriculture;
  if (marketGain > 0) fields.line5_ccc_gain = marketGain;

  if (Object.keys(fields).length === 0) return [];
  return [{ nodeType: schedule_f.nodeType, input: fields }];
}

class F1099gNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099g";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040, schedule_f]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099gs: g99s } = parsed;

    if (g99s.length === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      ...schedule1Output(g99s),
      ...f1040Output(g99s),
      ...scheduleFOutput(g99s),
    ];

    return { outputs };
  }
}

export const f1099g = new F1099gNode();
