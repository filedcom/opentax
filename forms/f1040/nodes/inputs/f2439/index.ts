import { z } from "zod";
import type {
  AtLeastOne,
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { TS, tsSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Per-item schema ──────────────────────────────────────────────────────────
// One Form 2439 issued by a single RIC or REIT. All boxes are optional because
// a shareholder may receive a form with only some boxes populated.

export const itemSchema = z.object({
  // Box 1a: Total undistributed long-term capital gains (Schedule D line 11)
  box1a: z.number().nonnegative().optional(),
  // Box 1b: Unrecaptured section 1250 gain (Unrecaptured §1250 Gain Worksheet line 11)
  box1b: z.number().nonnegative().optional(),
  // Box 1c: Section 1202 gain (QSB stock exclusion — fail closed until routed)
  box1c: z.number().nonnegative().optional(),
  // Box 1d: Collectibles (28%) gain (28% Rate Gain Worksheet line 4)
  box1d: z.number().nonnegative().optional(),
  // Box 2: tax paid by RIC/REIT on undistributed gains, routed only when the
  // payer-issued Copy B facts support a linked IRS2439 and Schedule 3 line 13a.
  box2: z.number().nonnegative().optional(),
  // Copy B may mask the first five SSN digits; its final four must still
  // match the selected taxpayer or spouse when the tax credit is claimed.
  shareholder: tsSchema.optional(),
  shareholder_name: z.string().trim().min(1).optional(),
  shareholder_ssn_last4: z.string().regex(/^\d{4}$/).optional(),
  payer_name: z.string().trim().min(1).optional(),
  payer_ein: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
  payer_address_line1: z.string().trim().min(1).optional(),
  payer_address_line2: z.string().trim().min(1).optional(),
  payer_address_city: z.string().trim().min(1).optional(),
  payer_address_state: z.string().regex(/^[A-Z]{2}$/).optional(),
  payer_address_zip: z.string().regex(/^\d{5}(?:-\d{4})?$/).optional(),
  tax_period_begin: z.string().date().optional(),
  tax_period_end: z.string().date().optional(),
  corrected: z.literal(false).optional(),
  void: z.literal(false).optional(),
});

// ─── Node input schema ────────────────────────────────────────────────────────
// Array of all Form 2439s received by this taxpayer for the year.

export const inputSchema = z.object({
  f2439s: z.array(itemSchema).min(0),
});

type F2439Item = z.infer<typeof itemSchema>;
type F2439Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function totalBox1a(items: F2439Item[]): number {
  return items.reduce((sum, item) => sum + (item.box1a ?? 0), 0);
}

function totalBox1b(items: F2439Item[]): number {
  return items.reduce((sum, item) => sum + (item.box1b ?? 0), 0);
}

function totalBox1d(items: F2439Item[]): number {
  return items.reduce((sum, item) => sum + (item.box1d ?? 0), 0);
}

export function assertSourcedForm2439(
  item: F2439Item,
  index: number,
): void {
  if ((item.box1c ?? 0) > 0) {
    throw new Error(
      "Form 2439 box 1c section 1202 gain cannot be filed until its Schedule D exclusion is modeled",
    );
  }
  if (
    (item.box1a ?? 0) <= 0 && (item.box1b ?? 0) <= 0 &&
    (item.box1d ?? 0) <= 0 && (item.box2 ?? 0) <= 0
  ) return;
  if (
    (item.box1a ?? 0) <= 0 ||
    (item.box1b ?? 0) + (item.box1d ?? 0) > (item.box1a ?? 0)
  ) {
    throw new Error(
      `Form 2439 ${index + 1} needs consistent box 1a gains`,
    );
  }
  if (
    [item.box1a, item.box1b, item.box1d, item.box2].some((amount) =>
      amount !== undefined && !Number.isInteger(amount)
    )
  ) {
    throw new Error(`Form 2439 ${index + 1} MeF amounts must be whole dollars`);
  }
  if (
    (item.shareholder !== TS.T && item.shareholder !== TS.S) ||
    !item.shareholder_name || !item.shareholder_ssn_last4 ||
    !item.payer_name || !item.payer_ein ||
    !item.payer_address_line1 || !item.payer_address_city ||
    !item.payer_address_state || !item.payer_address_zip ||
    !item.tax_period_begin || !item.tax_period_end
  ) {
    throw new Error(
      `Form 2439 ${
        index + 1
      } needs payer-issued Copy B identity and tax period`,
    );
  }
  if (
    item.tax_period_begin > item.tax_period_end ||
    !item.tax_period_end.startsWith("2025-")
  ) {
    throw new Error(`Form 2439 ${index + 1} tax period must end in 2025`);
  }
}

type ScheduleDFields = z.infer<typeof schedule_d.inputSchema>;

// Build the schedule_d output fields. Returns null when there is nothing to report.
function scheduleDOutput(items: F2439Item[]): NodeOutput | null {
  const box1a = totalBox1a(items);
  const box1b = totalBox1b(items);
  const box1d = totalBox1d(items);

  if (box1a <= 0 && box1b <= 0 && box1d <= 0) return null;

  const fields: Partial<ScheduleDFields> = {};

  if (box1a > 0) fields.line_11_form2439 = box1a;
  if (box1b > 0) fields.line19_unrecaptured_1250 = box1b;
  if (box1d > 0) fields.collectibles_gain_form2439 = box1d;

  return output(schedule_d, fields as AtLeastOne<ScheduleDFields>);
}

// ─── Node class ────────────────────────────────────────────────────────────────

class F2439Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2439";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, schedule3]);

  compute(_ctx: NodeContext, rawInput: F2439Input): NodeResult {
    const { f2439s } = inputSchema.parse(rawInput);

    if (f2439s.length === 0) return { outputs: [] };
    f2439s.forEach(assertSourcedForm2439);

    const outputs: NodeOutput[] = [];

    const schedD = scheduleDOutput(f2439s);
    if (schedD !== null) outputs.push(schedD);

    const taxPaid = f2439s.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
    if (taxPaid > 0) {
      outputs.push(
        output(schedule3, { line13a_tax_paid_by_ric_or_reit: taxPaid }),
      );
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f2439 = new F2439Node();
