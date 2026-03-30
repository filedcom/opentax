import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
  AtLeastOne,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// ─── Per-item schema ──────────────────────────────────────────────────────────
// One Form 2439 issued by a single RIC or REIT. All boxes are optional because
// a shareholder may receive a form with only some boxes populated.

export const itemSchema = z.object({
  // Box 1a: Total undistributed long-term capital gains (Schedule D line 11)
  box1a: z.number().nonnegative().optional(),
  // Box 1b: Unrecaptured section 1250 gain (Unrecaptured §1250 Gain Worksheet line 11)
  box1b: z.number().nonnegative().optional(),
  // Box 1c: Section 1202 gain (QSB stock exclusion — not routed; no downstream node yet)
  box1c: z.number().nonnegative().optional(),
  // Box 1d: Collectibles (28%) gain (28% Rate Gain Worksheet line 4)
  box1d: z.number().nonnegative().optional(),
  // Box 2: Tax paid by RIC/REIT on undistributed gains (Schedule 3 line 13a → f1040 line 31)
  box2: z.number().nonnegative().optional(),
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

function totalBox2(items: F2439Item[]): number {
  return items.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
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

// Build the f1040 output for box 2 tax credit. Returns null when box2 is zero.
function f1040Output(items: F2439Item[]): NodeOutput | null {
  const box2 = totalBox2(items);
  if (box2 <= 0) return null;
  return output(f1040, { line31_additional_payments: box2 });
}

// ─── Node class ────────────────────────────────────────────────────────────────

class F2439Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2439";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, f1040]);

  compute(rawInput: F2439Input): NodeResult {
    const { f2439s } = inputSchema.parse(rawInput);

    if (f2439s.length === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [];

    const schedD = scheduleDOutput(f2439s);
    if (schedD !== null) outputs.push(schedD);

    const f1040out = f1040Output(f2439s);
    if (f1040out !== null) outputs.push(f1040out);

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f2439 = new F2439Node();
