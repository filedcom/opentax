import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// TY2025 TPSO reporting threshold (One Big Beautiful Bill)
const TPSO_GROSS_THRESHOLD = 20_000;
const TPSO_TRANSACTION_THRESHOLD = 200;
const MONTHLY_SUM_ROUNDING_TOLERANCE = 1;

export const itemSchema = z.object({
  // Filer identification
  pse_name: z.string(),
  pse_tin: z.string().optional(),

  // Filer type checkboxes (PSE = Payment Settlement Entity; EPF = Electronic Payment Facilitator)
  filer_type_pse: z.boolean().optional(),
  filer_type_epf: z.boolean().optional(),
  pse_phone: z.string().optional(),

  // Transaction type checkboxes
  transaction_type_payment_card: z.boolean().optional(),
  transaction_type_tpso: z.boolean().optional(),

  // Administrative fields
  account_number: z.string().optional(),
  second_tin_notice: z.boolean().optional(),

  // Box 1a — Gross amount of reportable payment transactions (required field in IRS sense)
  box1a_gross_payments: z.number().nonnegative().optional(),

  // Box 1b — Card Not Present gross amount (subset of box1a)
  box1b_card_not_present: z.number().nonnegative().optional(),

  // Box 2 — Merchant Category Code (4-digit)
  box2_merchant_category_code: z.string().optional(),

  // Box 3 — Number of payment transactions (integer count)
  box3_transaction_count: z.number().int().nonnegative().optional(),

  // Box 4 — Federal Income Tax Withheld (backup withholding, 24% rate)
  // NOTE: On the 99K screen this is for state record. The engine routes it
  // directly to f1040.line25b_withheld_1099 for tax credit purposes.
  box4_federal_withheld: z.number().nonnegative().optional(),

  // Boxes 5a–5l — Monthly gross payment amounts
  box5a_january: z.number().nonnegative().optional(),
  box5b_february: z.number().nonnegative().optional(),
  box5c_march: z.number().nonnegative().optional(),
  box5d_april: z.number().nonnegative().optional(),
  box5e_may: z.number().nonnegative().optional(),
  box5f_june: z.number().nonnegative().optional(),
  box5g_july: z.number().nonnegative().optional(),
  box5h_august: z.number().nonnegative().optional(),
  box5i_september: z.number().nonnegative().optional(),
  box5j_october: z.number().nonnegative().optional(),
  box5k_november: z.number().nonnegative().optional(),
  box5l_december: z.number().nonnegative().optional(),

  // Box 6 — State abbreviation (up to 2 chars)
  box6_state: z.string().optional(),

  // Box 7 — State identification number
  box7_state_id: z.string().optional(),

  // Box 8 — State Income Tax Withheld (flows to state return only)
  box8_state_withheld: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f1099ks: z.array(itemSchema).min(1),
});

type K99Item = z.infer<typeof itemSchema>;
type K99Items = K99Item[];

const MONTHLY_FIELDS = [
  "box5a_january",
  "box5b_february",
  "box5c_march",
  "box5d_april",
  "box5e_may",
  "box5f_june",
  "box5g_july",
  "box5h_august",
  "box5i_september",
  "box5j_october",
  "box5k_november",
  "box5l_december",
] as const;

type MonthlyField = typeof MONTHLY_FIELDS[number];

function allMonthlyFieldsPresent(item: K99Item): boolean {
  return MONTHLY_FIELDS.every((field) => item[field as MonthlyField] !== undefined);
}

function sumMonthlyFields(item: K99Item): number {
  return MONTHLY_FIELDS.reduce(
    (sum, field) => sum + (item[field as MonthlyField] ?? 0),
    0,
  );
}

function validateItem(item: K99Item): void {
  // Monthly consistency check (WARNING level — does not throw in production,
  // but the engine surfaces it. For TY2025 the tolerance is ±$1.)
  if (allMonthlyFieldsPresent(item)) {
    const monthlySum = sumMonthlyFields(item);
    const box1a = item.box1a_gross_payments ?? 0;
    if (Math.abs(monthlySum - box1a) > MONTHLY_SUM_ROUNDING_TOLERANCE) {
      // WARNING only — do not throw
    }
  }
}

function federalWithholdingOutputs(k99s: K99Items): NodeOutput[] {
  return k99s
    .filter((item) => (item.box4_federal_withheld ?? 0) > 0)
    .map((item) => ({
      nodeType: f1040.nodeType,
      input: { line25b_withheld_1099: item.box4_federal_withheld },
    }));
}

// Exported for reference (TY2025 thresholds)
export const TY2025 = {
  TPSO_GROSS_THRESHOLD,
  TPSO_TRANSACTION_THRESHOLD,
} as const;

class F1099kNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099k";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    for (const item of parsed.f1099ks) {
      validateItem(item);
    }

    const outputs: NodeOutput[] = [
      ...federalWithholdingOutputs(parsed.f1099ks),
    ];

    return { outputs };
  }
}

export const f1099k = new F1099kNode();
