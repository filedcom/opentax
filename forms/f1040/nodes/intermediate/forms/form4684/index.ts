import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { form4797 } from "../form4797/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── TY2025 Constants ─────────────────────────────────────────────────────────
// IRC §165(h)(1): $100 per-event floor (personal casualty losses)
const PER_EVENT_FLOOR = 100;

// IRC §165(h)(2): 10% of AGI limitation (personal casualty losses)
const AGI_FLOOR_PCT = 0.10;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Personal Property (Section A) ─────────────────────────────────────────
  // Fair market value before casualty/theft
  personal_fmv_before: z.number().nonnegative().optional(),

  // Fair market value after casualty/theft
  personal_fmv_after: z.number().nonnegative().optional(),

  // Adjusted cost basis of personal property
  personal_basis: z.number().nonnegative().optional(),

  // Insurance reimbursement received for personal property
  personal_insurance: z.number().nonnegative().optional(),

  // Whether the loss was from a federally declared disaster area
  // TY2025: Personal casualty losses ONLY deductible if federally declared disaster
  // IRC §165(h)(5) as amended by TCJA
  is_federal_disaster: z.boolean().optional(),

  // AGI — for 10% floor calculation on personal losses
  agi: z.number().nonnegative().optional(),

  // ── Business/Income-Producing Property (Section B) ────────────────────────
  // FMV before casualty/theft for business property
  business_fmv_before: z.number().nonnegative().optional(),

  // FMV after casualty/theft for business property
  business_fmv_after: z.number().nonnegative().optional(),

  // Adjusted basis of business property
  business_basis: z.number().nonnegative().optional(),

  // Insurance reimbursement received for business property
  business_insurance: z.number().nonnegative().optional(),

  // Whether business property is §1231 (held > 1 year)
  // true → routes to form4797; false → routes to schedule_d as capital loss
  business_is_section_1231: z.boolean().optional(),
});

type Form4684Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// The deductible loss amount before floors
// Loss = lesser of FMV decline or adjusted basis, minus insurance reimbursement
function rawLoss(
  fmvBefore: number,
  fmvAfter: number,
  basis: number,
  insurance: number,
): number {
  const fmvDecline = Math.max(0, fmvBefore - fmvAfter);
  const cappedLoss = Math.min(fmvDecline, basis);
  return Math.max(0, cappedLoss - insurance);
}

// Personal casualty loss after $100 per-event floor (IRC §165(h)(1))
function personalLossAfterFloor(loss: number): number {
  return Math.max(0, loss - PER_EVENT_FLOOR);
}

// Personal casualty net loss after 10% AGI floor (IRC §165(h)(2))
function personalLossAfterAgiFloor(lossAfterFloor: number, agi: number): number {
  return Math.max(0, lossAfterFloor - agi * AGI_FLOOR_PCT);
}

function buildPersonalOutput(input: Form4684Input): NodeOutput[] {
  // TY2025: Personal losses ONLY deductible for federally declared disasters
  if (!input.is_federal_disaster) return [];

  const fmvBefore = input.personal_fmv_before ?? 0;
  const fmvAfter = input.personal_fmv_after ?? 0;
  const basis = input.personal_basis ?? 0;
  const insurance = input.personal_insurance ?? 0;

  const loss = rawLoss(fmvBefore, fmvAfter, basis, insurance);
  if (loss <= 0) return [];

  const afterFloor = personalLossAfterFloor(loss);
  if (afterFloor <= 0) return [];

  const agi = input.agi ?? 0;
  const netLoss = personalLossAfterAgiFloor(afterFloor, agi);
  if (netLoss <= 0) return [];

  // Routes to Schedule A line 15 — casualty and theft losses
  return [output(scheduleA, { line_15_casualty_theft_loss: netLoss })];
}

function buildBusinessOutput(input: Form4684Input): NodeOutput[] {
  const fmvBefore = input.business_fmv_before ?? 0;
  const fmvAfter = input.business_fmv_after ?? 0;
  const basis = input.business_basis ?? 0;
  const insurance = input.business_insurance ?? 0;

  const loss = rawLoss(fmvBefore, fmvAfter, basis, insurance);
  if (loss <= 0) return [];

  if (input.business_is_section_1231) {
    // §1231 property held > 1 year → Form 4797 as ordinary loss
    return [output(form4797, { ordinary_gain: -loss })];
  }

  // Capital loss on investment/personal use property held for investment
  // Routes to Schedule D as a short-term capital loss
  return [output(schedule_d, { line_11_form2439: -loss })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form4684Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4684";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA, schedule_d, form4797]);

  compute(_ctx: NodeContext, rawInput: Form4684Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const personalOutputs = buildPersonalOutput(input);
    const businessOutputs = buildBusinessOutput(input);

    return { outputs: [...personalOutputs, ...businessOutputs] };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form4684 = new Form4684Node();
