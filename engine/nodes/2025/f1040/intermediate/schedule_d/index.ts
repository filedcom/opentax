import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { rate_28_gain_worksheet } from "../rate_28_gain_worksheet/index.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

// IRC §1211(b) — annual capital loss deduction limits
const CAPITAL_LOSS_LIMIT = -3_000;
const CAPITAL_LOSS_LIMIT_MFS = -1_500;

// Form 8949 adjustment codes that trigger 28% Rate Gain Worksheet
// C = collectibles gain (IRC §1(h)(5)); Q = QOF gain (IRC §1400Z-2)
const RATE_28_CODES = new Set(["C", "Q"]);

// Short-term parts: A/G aggregate to Sch D Line 1b, B/H → Line 2, C/I → Line 3
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);
// Long-term parts: D/J aggregate to Sch D Line 8b, E/K → Line 9, F/L → Line 10
const LONG_TERM_PARTS = new Set(["D", "E", "F", "J", "K", "L"]);

// ─── Schemas ─────────────────────────────────────────────────────────────────

// f8949 transaction schema — gain_loss and is_long_term pre-computed by the f8949 input node
const transactionSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  gain_loss: z.number(),
  is_long_term: z.boolean(),
});

// d_screen transaction schema — gain_loss is computed from proceeds/cost/adjustment_amount
export const dScreenTransactionSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
});

// Executor accumulation pattern: when multiple f8949 NodeOutputs deposit the
// `transaction` key to this node, it accumulates from a scalar to an array.
// Same applies to cod_property_fmv / cod_debt_cancelled from f1099c.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = z.object({
  // f8949 transactions — accumulates to array via executor merge
  transaction: accumulable(transactionSchema).optional(),
  // Line 13: capital gain distributions from f1099div (box 2a)
  line13_cap_gain_distrib: z.number().nonnegative().optional(),
  // QSBS amount from f1099div (box 2c) — informational subset of line13; not additive
  box2c_qsbs: z.number().nonnegative().optional(),
  // COD property dispositions from f1099c — parallel arrays; gain = fmv - debt per pair
  cod_property_fmv: accumulable(z.number().nonnegative()).optional(),
  cod_debt_cancelled: accumulable(z.number().nonnegative()).optional(),
  // Computed carryforward from prior year — informational; not used in current-year calc
  capital_loss_carryover: z.number().nonnegative().optional(),
  // Filing status — determines loss deduction limit; defaults to standard when absent
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // ── D-screen aggregate lines ──────────────────────────────────────────────
  // Line 1a — Short-term, basis reported to IRS, no adjustments (aggregate)
  line_1a_proceeds: z.number().optional(),
  line_1a_cost: z.number().optional(),
  // Line 8a — Long-term, basis reported to IRS, no adjustments (aggregate)
  line_8a_proceeds: z.number().optional(),
  line_8a_cost: z.number().optional(),
  // Carryovers from prior year (entered as positive; treated as loss in computation)
  line_6_carryover: z.number().nonnegative().optional(),
  line_14_carryover: z.number().nonnegative().optional(),
  // Capital gain distributions from d_screen (Line 13 of Schedule D — same line as line13_cap_gain_distrib)
  line_12_cap_gain_dist: z.number().nonnegative().optional(),
  // Undistributed LT gains (Form 2439, Form 4797 Part I, etc.) — Line 11
  line_11_form2439: z.number().optional(),
  // Other short-term gains/losses (Form 6252, 4684, 6781, 8824) — Line 4
  line_4_other_st: z.number().optional(),
  // K-1 short-term capital gains/losses — Line 5
  line_5_k1_st: z.number().optional(),
  // K-1 long-term capital gains/losses — Line 12
  line_12_k1_lt: z.number().optional(),
  // d_screen-style individual transactions (proceeds/cost/adjustment; gain_loss computed here)
  transactions: z.array(dScreenTransactionSchema).optional(),
  // Unrecaptured §1250 Gain Worksheet line 19 — from unrecaptured_1250_worksheet node
  line19_unrecaptured_1250: z.number().nonnegative().optional(),
  // 28% Rate Gain Worksheet line 18 — from rate_28_gain_worksheet node
  line18_28pct_gain: z.number().nonnegative().optional(),
});

type ScheduleDInput = z.infer<typeof inputSchema>;
type Transaction = z.infer<typeof transactionSchema>;
type DScreenTransaction = z.infer<typeof dScreenTransactionSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

// Returns true if the input has any capital activity worth computing
function hasCapitalActivity(input: ScheduleDInput): boolean {
  const txs = normalizeArray(input.transaction);
  const fmvs = normalizeArray(input.cod_property_fmv);
  const debts = normalizeArray(input.cod_debt_cancelled);
  const codGain = computeCodGain(fmvs, debts);
  const dScreenTxs = input.transactions ?? [];

  // Aggregate d_screen lines (any non-zero value means activity)
  const hasAggregateLines =
    (input.line_1a_proceeds ?? 0) !== 0 ||
    (input.line_1a_cost ?? 0) !== 0 ||
    (input.line_8a_proceeds ?? 0) !== 0 ||
    (input.line_8a_cost ?? 0) !== 0 ||
    (input.line_6_carryover ?? 0) !== 0 ||
    (input.line_14_carryover ?? 0) !== 0 ||
    (input.line_12_cap_gain_dist ?? 0) !== 0 ||
    (input.line_11_form2439 ?? 0) !== 0 ||
    (input.line_4_other_st ?? 0) !== 0 ||
    (input.line_5_k1_st ?? 0) !== 0 ||
    (input.line_12_k1_lt ?? 0) !== 0;

  return (
    txs.length > 0 ||
    (input.line13_cap_gain_distrib ?? 0) > 0 ||
    codGain !== 0 ||
    dScreenTxs.length > 0 ||
    hasAggregateLines
  );
}

function computeTransactionGains(transactions: Transaction[]): {
  stGain: number;
  ltGain: number;
} {
  let stGain = 0;
  let ltGain = 0;
  for (const tx of transactions) {
    if (tx.is_long_term) {
      ltGain += tx.gain_loss;
    } else {
      stGain += tx.gain_loss;
    }
  }
  return { stGain, ltGain };
}

// Compute col(h) = col(d) - col(e) + col(g) for a d_screen transaction
function dScreenGainLoss(tx: DScreenTransaction): number {
  return tx.proceeds - tx.cost_basis + (tx.adjustment_amount ?? 0);
}

function computeDScreenTransactionGains(transactions: DScreenTransaction[]): {
  stGain: number;
  ltGain: number;
} {
  let stGain = 0;
  let ltGain = 0;
  for (const tx of transactions) {
    const gl = dScreenGainLoss(tx);
    if (LONG_TERM_PARTS.has(tx.part)) {
      ltGain += gl;
    } else {
      stGain += gl;
    }
  }
  return { stGain, ltGain };
}

// Per-item COD property LT gain: amount realized (FMV) minus cancelled debt.
// Each pair (fmvs[i], debts[i]) is one property disposition event.
function computeCodGain(fmvs: number[], debts: number[]): number {
  const count = Math.min(fmvs.length, debts.length);
  let gain = 0;
  for (let i = 0; i < count; i++) {
    gain += fmvs[i] - debts[i];
  }
  return gain;
}

// Compute d_screen aggregate short-term net (contribution to line 7)
function computeDScreenStNet(input: ScheduleDInput): number {
  return (
    (input.line_1a_proceeds ?? 0) -
    (input.line_1a_cost ?? 0) +
    (input.line_4_other_st ?? 0) +
    (input.line_5_k1_st ?? 0) -
    (input.line_6_carryover ?? 0)
  );
}

// Compute d_screen aggregate long-term net (contribution to line 15)
function computeDScreenLtNet(input: ScheduleDInput): number {
  return (
    (input.line_8a_proceeds ?? 0) -
    (input.line_8a_cost ?? 0) +
    (input.line_11_form2439 ?? 0) +
    (input.line_12_cap_gain_dist ?? 0) +
    (input.line_12_k1_lt ?? 0) -
    (input.line_14_carryover ?? 0)
  );
}

function is28PctF8949Transaction(tx: Transaction): boolean {
  if (!tx.is_long_term) return false;
  const codes = tx.adjustment_codes ?? "";
  return [...codes].some((c) => RATE_28_CODES.has(c));
}

function is28PctDScreenTransaction(tx: DScreenTransaction): boolean {
  if (!LONG_TERM_PARTS.has(tx.part)) return false;
  const codes = tx.adjustment_codes ?? "";
  return [...codes].some((c) => RATE_28_CODES.has(c));
}

function compute28PctGain(
  f8949Txs: Transaction[],
  dScreenTxs: DScreenTransaction[],
): number {
  const f8949Gain = f8949Txs
    .filter(is28PctF8949Transaction)
    .reduce((sum, tx) => sum + tx.gain_loss, 0);
  const dScreenGain = dScreenTxs
    .filter(is28PctDScreenTransaction)
    .reduce((sum, tx) => sum + dScreenGainLoss(tx), 0);
  return f8949Gain + dScreenGain;
}

function lossLimit(filingStatus: FilingStatus | undefined): number {
  return filingStatus === FilingStatus.MFS ? CAPITAL_LOSS_LIMIT_MFS : CAPITAL_LOSS_LIMIT;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleDIntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_d";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, rate_28_gain_worksheet]);

  compute(rawInput: ScheduleDInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasCapitalActivity(input)) {
      return { outputs: [] };
    }

    // f8949 transactions (pre-computed gain_loss + is_long_term)
    const f8949Txs = normalizeArray(input.transaction);
    const { stGain: stTxGain, ltGain: ltTxGain } = computeTransactionGains(f8949Txs);

    // d_screen transactions (gain_loss computed here from proceeds/cost/adjustment)
    const dScreenTxs = input.transactions ?? [];
    const { stGain: dScreenStTxGain, ltGain: dScreenLtTxGain } = computeDScreenTransactionGains(dScreenTxs);

    // COD property gains (always LT)
    const fmvs = normalizeArray(input.cod_property_fmv);
    const debts = normalizeArray(input.cod_debt_cancelled);
    const ltCodGain = computeCodGain(fmvs, debts);

    // d_screen aggregate line contributions
    const dScreenStAgg = computeDScreenStNet(input);
    const dScreenLtAgg = computeDScreenLtNet(input);

    // f1099div cap gain distributions
    const line13F1099div = input.line13_cap_gain_distrib ?? 0;

    // Schedule D line 7 (net short-term) and line 15 (net long-term)
    const line7 = stTxGain + dScreenStTxGain + dScreenStAgg;
    const line15 = ltTxGain + dScreenLtTxGain + dScreenLtAgg + ltCodGain + line13F1099div;

    // Line 16: combined net capital gain or loss
    const line16 = line7 + line15;

    // Line 17: are lines 15 and 16 both gains?
    const line17Yes = line15 > 0 && line16 > 0;

    // Line 21: apply capital loss deduction limit
    const limit = lossLimit(input.filing_status);
    const capitalGainForReturn = line16 >= 0 ? line16 : Math.max(limit, line16);

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, input: { line7_capital_gain: capitalGainForReturn } },
    ];

    // Line 18: 28% Rate Gain Worksheet — only when line 17 = Yes
    if (line17Yes) {
      const gain28Pct = compute28PctGain(f8949Txs, dScreenTxs);
      if (gain28Pct > 0) {
        outputs.push({
          nodeType: rate_28_gain_worksheet.nodeType,
          input: { collectibles_gain_from_8949: gain28Pct },
        });
      }
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_d = new ScheduleDIntermediateNode();
