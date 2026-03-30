import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-item schema — one 1099-OID from one payer
// IRS Form 1099-OID TY2025: Original Issue Discount
export const itemSchema = z.object({
  // Payer identification
  payer_name: z.string().min(1),
  payer_tin: z.string().optional(),

  // Box 1: Original issue discount for 2025
  box1_oid: z.number().nonnegative().optional(),

  // Box 2: Other periodic interest
  box2_other_interest: z.number().nonnegative().optional(),

  // Box 3: Early withdrawal penalty (deductible on Schedule 1 line 18)
  box3_early_withdrawal_penalty: z.number().nonnegative().optional(),

  // Box 4: Federal income tax withheld
  box4_federal_withheld: z.number().nonnegative().optional(),

  // Box 5: Market discount (informational; used in broker's statement)
  box5_market_discount: z.number().nonnegative().optional(),

  // Box 6: Acquisition premium (reduces OID reportable)
  box6_acquisition_premium: z.number().nonnegative().optional(),

  // Box 7: Description (CUSIP / instrument name)
  box7_description: z.string().optional(),

  // Box 8: Original issue discount on US Treasury obligations
  box8_oid_treasury: z.number().nonnegative().optional(),

  // Box 9: Investment expenses (deductible; IRC §212)
  box9_investment_expenses: z.number().nonnegative().optional(),

  // Box 10: Bond premium (reduces taxable OID)
  box10_bond_premium: z.number().nonnegative().optional(),

  // Box 11: Tax-exempt OID (from private activity bonds — AMT preference item)
  box11_tax_exempt_oid: z.number().nonnegative().optional(),

  // Box 12: State tax withheld (informational)
  box12_state_tax: z.number().nonnegative().optional(),

  // Box 13: FATCA filing requirement flag
  box13_fatca: z.boolean().optional(),

  // Nominee/adjustments
  nominee_oid: z.number().nonnegative().optional(),
});

// Node inputSchema
export const inputSchema = z.object({
  f1099oids: z.array(itemSchema).min(1),
});

type OIDItem = z.infer<typeof itemSchema>;
type OIDItems = OIDItem[];

// Net taxable OID for a single item after acquisition premium and nominee reduction
// Pub. 1212: net OID = box1 - box6 (acquisition premium) - nominee_oid
function netTaxableOid(item: OIDItem): number {
  const oid = item.box1_oid ?? 0;
  const premium = item.box6_acquisition_premium ?? 0;
  const nominee = item.nominee_oid ?? 0;
  return Math.max(0, oid - premium - nominee);
}

// Route each payer's net OID to Schedule B as interest income
function scheduleBOutputs(items: OIDItems): NodeOutput[] {
  return items.map((item) =>
    output(schedule_b, {
      payer_name: item.payer_name,
      taxable_interest_net: netTaxableOid(item) + (item.box2_other_interest ?? 0),
    })
  );
}

// Form 6251 AMT: tax-exempt OID from private activity bonds (box11)
function form6251Output(items: OIDItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box11_tax_exempt_oid ?? 0), 0);
  if (total <= 0) return [];
  return [output(form6251, { line2g_pab_interest: total })];
}

// f1040 line25b: federal withholding from box4
function withholdingOutput(items: OIDItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box4_federal_withheld ?? 0), 0);
  if (total <= 0) return [];
  return [output(f1040, { line25b_withheld_1099: total })];
}

class F1099oidNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099oid";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b, f1040, form6251]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f1099oids } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...scheduleBOutputs(f1099oids),
      ...form6251Output(f1099oids),
      ...withholdingOutput(f1099oids),
    ];

    return { outputs };
  }
}

export const f1099oid = new F1099oidNode();
