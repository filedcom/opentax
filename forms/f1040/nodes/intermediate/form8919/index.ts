import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { schedule_se } from "../../intermediate/schedule_se/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Constants — mathematical rates, unchanged across years ──────────────────

// IRC §3101(a); Form 8919 line 11 — employee SS rate
const SS_RATE = 0.062;
// IRC §3101(b); Form 8919 line 12 — employee Medicare rate
const MEDICARE_RATE = 0.0145;

// ─── Enums ────────────────────────────────────────────────────────────────────

// Form 8919 Part I — Reason Code for filing
// IRC §3101; Form 8919 instructions Part I
export enum ReasonCode {
  A = "A", // Firm refused to withhold; IRS accepted Form SS-8
  B = "B", // Firm refused to withhold; no SS-8 filed
  C = "C", // Worker filed SS-8; determination pending
  D = "D", // Worker received IRS notice of employee status
  E = "E", // Wages subject to SS/Medicare (not covered by class determination)
  F = "F", // Worker is employee of religious organization
  G = "G", // Worker filed Form SS-8; IRS issued determination
  H = "H", // Worker received IRS notice that wages are subject to FICA
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Form 8919 lines 1–5: total wages from misclassifying employer(s)
  wages: z.number().nonnegative(),

  // Form 8919 Part I: reason code for filing (A–H)
  reason_code: z.nativeEnum(ReasonCode),

  // Form 8919 line 8: prior SS wages (W-2 boxes 3+7) — offsets wage base
  prior_ss_wages: z.number().nonnegative().optional(),
});

type Form8919Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Form 8919 line 9: remaining SS wage base after prior wages
function remainingSsWageBase(ssWageBase: number, priorSsWages: number): number {
  return Math.max(0, ssWageBase - priorSsWages);
}

// Form 8919 line 10: wages subject to SS tax (capped at remaining wage base)
function ssSubjectWages(wages: number, remainingBase: number): number {
  return Math.min(wages, remainingBase);
}

// Form 8919 line 11: SS tax on wages subject to SS
function ssTax(ssWages: number): number {
  return ssWages * SS_RATE;
}

// Form 8919 line 12: Medicare tax on all wages (no cap)
function medicareTax(wages: number): number {
  return wages * MEDICARE_RATE;
}

// Form 8919 line 13: total uncollected FICA tax → Schedule 2 line 6
function totalFicaTax(ss: number, medicare: number): number {
  return ss + medicare;
}

// Route wages to Form 1040 line 1g when > 0
function f1040Output(wages: number): NodeOutput[] {
  if (wages <= 0) return [];
  return [output(f1040, { line1g_wages_8919: wages })];
}

// Route total FICA tax to Schedule 2 line 6 when > 0
function schedule2Output(line13: number): NodeOutput[] {
  if (line13 <= 0) return [];
  return [output(schedule2, { line6_uncollected_8919: line13 })];
}

// Route wages to Schedule SE line 8c to offset SS wage base
function scheduleSEOutput(wages: number): NodeOutput[] {
  if (wages <= 0) return [];
  return [output(schedule_se, { wages_8919: wages })];
}

// ─── Node ─────────────────────────────────────────────────────────────────────

class Form8919Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8919";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule2, schedule_se]);

  // Rev Proc 2024-40 §3.28; Form 8919 line 9 — SS wage base (TY2025)
  protected readonly ssWageBase = 176_100;

  compute(_ctx: NodeContext, rawInput: Form8919Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const { wages } = input;

    if (wages <= 0) return { outputs: [] };

    const priorSsWages = input.prior_ss_wages ?? 0;
    const line9 = remainingSsWageBase(this.ssWageBase, priorSsWages);
    const line10 = ssSubjectWages(wages, line9);
    const line11 = ssTax(line10);
    const line12 = medicareTax(wages);
    const line13 = totalFicaTax(line11, line12);

    const outputs: NodeOutput[] = [
      ...f1040Output(wages),
      ...schedule2Output(line13),
      ...scheduleSEOutput(wages),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8919 = new Form8919Node();
