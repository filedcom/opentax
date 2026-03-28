import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/rate_28_gain_worksheet/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/unrecaptured_1250_worksheet/index.ts";

// Annual capital loss deduction limit (standard)
const CAPITAL_LOSS_LIMIT_STANDARD = -3_000;
// Married Filing Separately limit
const CAPITAL_LOSS_LIMIT_MFS = -1_500;

// Short-term parts: A/G aggregate to Sch D Line 1b, B/H → Line 2, C/I → Line 3
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);
// Long-term parts: D/J aggregate to Sch D Line 8b, E/K → Line 9, F/L → Line 10
const LONG_TERM_PARTS = new Set(["D", "E", "F", "J", "K", "L"]);

// Adjustment codes that trigger the 28% Rate Gain Worksheet (on LT transactions)
const RATE_28_CODES = new Set(["C", "Q"]);

const transactionSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
});

type Transaction = z.infer<typeof transactionSchema>;

export const inputSchema = z.object({
  // Surface 2: Schedule D / D2 Screen (aggregate and carryover entries)
  // Line 1a — Short-term, basis reported to IRS, no adjustments (aggregate)
  line_1a_proceeds: z.number().optional(),
  line_1a_cost: z.number().optional(),
  // Line 8a — Long-term, basis reported to IRS, no adjustments (aggregate)
  line_8a_proceeds: z.number().optional(),
  line_8a_cost: z.number().optional(),
  // Carryovers from prior year (entered as positive; treated as loss in computation)
  line_6_carryover: z.number().nonnegative().optional(),
  line_14_carryover: z.number().nonnegative().optional(),
  // Capital gain distributions from mutual funds/REITs (always LT, Line 13)
  line_12_cap_gain_dist: z.number().nonnegative().optional(),
  // Undistributed LT gains (Form 2439, Form 4797 Part I, etc.) — Line 11
  line_11_form2439: z.number().optional(),
  // Other short-term gains/losses (Form 6252, 4684, 6781, 8824) — Line 4
  line_4_other_st: z.number().optional(),
  // K-1 short-term capital gains/losses — Line 5
  line_5_k1_st: z.number().optional(),
  // K-1 long-term capital gains/losses — Line 12
  line_12_k1_lt: z.number().optional(),
  // Surface 1: Form 8949 individual transactions
  transactions: z.array(transactionSchema).optional(),
  // Filing status — affects capital loss deduction limit
  filing_status: z.string().optional(),
});

type ScheduleDInput = z.infer<typeof inputSchema>;

// Compute col(h) = col(d) - col(e) + col(g)
function gainLoss(tx: Transaction): number {
  return tx.proceeds - tx.cost_basis + (tx.adjustment_amount ?? 0);
}

function isLongTerm(tx: Transaction): boolean {
  return LONG_TERM_PARTS.has(tx.part);
}

function computeShortTermNet(input: ScheduleDInput, txGains: number): number {
  return (input.line_1a_proceeds ?? 0) -
    (input.line_1a_cost ?? 0) +
    (input.line_4_other_st ?? 0) +
    (input.line_5_k1_st ?? 0) -
    (input.line_6_carryover ?? 0) +
    txGains;
}

function computeLongTermNet(input: ScheduleDInput, txGains: number): number {
  return (input.line_8a_proceeds ?? 0) -
    (input.line_8a_cost ?? 0) +
    (input.line_11_form2439 ?? 0) +
    (input.line_12_cap_gain_dist ?? 0) +
    (input.line_12_k1_lt ?? 0) -
    (input.line_14_carryover ?? 0) +
    txGains;
}

function capitalLossLimit(filingStatus: string | undefined): number {
  return filingStatus === "MFS" ? CAPITAL_LOSS_LIMIT_MFS : CAPITAL_LOSS_LIMIT_STANDARD;
}

// Returns true if any LT transaction has adjustment code C or Q
function has28PctGainTransaction(transactions: Transaction[]): boolean {
  return transactions.some((tx) => {
    if (!isLongTerm(tx)) return false;
    const codes = tx.adjustment_codes ?? "";
    return [...codes].some((ch) => RATE_28_CODES.has(ch));
  });
}

class ScheduleDNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "d_screen";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule_d,
    rate_28_gain_worksheet,
    unrecaptured_1250_worksheet,
  ]);

  compute(rawInput: ScheduleDInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const transactions = input.transactions ?? [];

    // Aggregate 8949 transactions by long-term vs short-term
    const stTxGains = transactions
      .filter((tx) => SHORT_TERM_PARTS.has(tx.part))
      .reduce((sum, tx) => sum + gainLoss(tx), 0);

    const ltTxGains = transactions
      .filter((tx) => LONG_TERM_PARTS.has(tx.part))
      .reduce((sum, tx) => sum + gainLoss(tx), 0);

    // Compute net short-term (Line 7) and long-term (Line 15)
    const stNet = computeShortTermNet(input, stTxGains);
    const ltNet = computeLongTermNet(input, ltTxGains);
    const totalNet = stNet + ltNet; // Line 16

    // Apply capital loss limitation (Line 21)
    const lossLimit = capitalLossLimit(input.filing_status);
    const capitalGainForReturn = totalNet >= 0
      ? totalNet
      : Math.max(lossLimit, totalNet);

    // Line 17 gate: both LT net > 0 AND combined net > 0 → preferential LTCG rates apply
    const line17Yes = ltNet > 0 && totalNet > 0;

    // Compute 28% rate gain from LT transactions with codes C or Q (Schedule D Line 18)
    const line18Gain = line17Yes
      ? transactions
          .filter((tx) => isLongTerm(tx) && [...(tx.adjustment_codes ?? "")].some((c) => RATE_28_CODES.has(c)))
          .reduce((sum, tx) => sum + gainLoss(tx), 0)
      : 0;

    // Build f1040 output — always emitted
    const f1040Fields: Record<string, number> = {
      line7_capital_gain: capitalGainForReturn,
    };
    if (line18Gain > 0) {
      f1040Fields.line18_28pct_gain = line18Gain;
    }

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, input: f1040Fields },
    ];

    // If total loss exceeds annual limit, the excess carries forward (Line 21 excess)
    if (totalNet < lossLimit) {
      const carryforward = -(totalNet - lossLimit);
      outputs.push({
        nodeType: schedule_d.nodeType,
        input: { capital_loss_carryover: carryforward },
      });
    }

    // Route 28% rate gain to worksheet node when line 17 = Yes and gain exists
    if (line18Gain > 0) {
      outputs.push({
        nodeType: rate_28_gain_worksheet.nodeType,
        input: { collectibles_gain_from_8949: line18Gain },
      });
    }

    return { outputs };
  }
}

export const scheduleD = new ScheduleDNode();
