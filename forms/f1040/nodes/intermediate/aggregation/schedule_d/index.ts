import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../../types.ts";
import { normalizeArray } from "../../../utils.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../agi_aggregator/index.ts";
import { schedule_d_final } from "../schedule_d_final/index.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { rate_28_gain_worksheet } from "../../worksheets/rate_28_gain_worksheet/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { form8995 } from "../../forms/form8995/index.ts";
import { form6251 } from "../../forms/form6251/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

// IRC §1211(b) — annual capital loss deduction limits
const CAPITAL_LOSS_LIMIT = -3_000;
const CAPITAL_LOSS_LIMIT_MFS = -1_500;

// Form 8949 adjustment codes that trigger 28% Rate Gain Worksheet
// C = collectibles gain (IRC §1(h)(5))
// Section 1202 code Q needs its own exclusion and 28% worksheet refigure,
// and is rejected below until those amounts are source-linked.
const RATE_28_CODES = new Set(["C"]);

// Long-term parts: D/J aggregate to Sch D Line 8b, E/K → Line 9, F/L → Line 10
const LONG_TERM_PARTS = new Set(["D", "E", "F", "J", "K", "L"]);

// ─── Schemas ─────────────────────────────────────────────────────────────────

// f8949 transaction schema — gain_loss and is_long_term pre-computed by the f8949 input node
const transactionSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]),
  description: z.string(),
  source_transaction_id: z.string().trim().min(1).optional(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  gain_loss: z.number(),
  is_long_term: z.boolean(),
  qsbs_code: z.enum(["Q1", "Q2", "Q3"]).optional(),
  qsbs_amount: z.number().nonnegative().optional(),
  from_form4797_investment_1245: z.literal(true).optional(),
  form4797_property_id: z.string().trim().min(1).optional(),
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
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = z.object({
  // f8949 transactions — accumulates to array via executor merge
  transaction: accumulable(transactionSchema).optional(),
  // Line 13: capital gain distributions from f1099div (box 2a)
  line13_cap_gain_distrib: z.number().nonnegative().optional(),
  line13_form8814: z.number().nonnegative().optional(),
  // QSBS amount from f1099div (box 2c) — informational subset of line13; not additive
  box2c_qsbs: z.number().nonnegative().optional(),
  // Legacy Form 1099-C property fields remain recognized only so direct use
  // fails explicitly. Box 7 FMV and canceled debt cannot establish a capital
  // disposition, proceeds, basis, character, or holding period.
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
  line_11_form2439: accumulable(z.number()).optional(),
  // Gross Part I gain is held here until Form 8582 allocates an active-rental PAL.
  pending_active_4797: z.boolean().optional(),
  // Source audit fields for Form 6252; included in the aggregate lines above.
  gain_form6252_lt: z.number().nonnegative().optional(),
  gain_form8824_lt: z.number().nonnegative().optional(),
  // Other short-term gains/losses (Form 6252, 4684, 6781, 8824) — Line 4
  line_4_other_st: accumulable(z.number()).optional(),
  gain_form6252_st: z.number().nonnegative().optional(),
  // K-1 short-term capital gains/losses — Line 5
  line_5_k1_st: z.number().optional(),
  // K-1 long-term capital gains/losses — Line 12
  line_12_k1_lt: z.number().optional(),
  // Form 8621 QEF net capital gain is long-term gain, not Schedule 1 income.
  line_11_qef_lt: z.number().nonnegative().optional(),
  // d_screen-style individual transactions (proceeds/cost/adjustment; gain_loss computed here)
  transactions: z.array(dScreenTransactionSchema).optional(),
  // Unrecaptured §1250 Gain Worksheet line 19 — from unrecaptured_1250_worksheet node
  // (informational; consumed by the Schedule D Tax Worksheet, not by Schedule D itself)
  line19_unrecaptured_1250: z.number().nonnegative().optional(),
  // Collectibles gain from Form 2439 — flows to 28% Rate Gain Worksheet line 4
  // IRC §1(h)(5); max 28% tax rate applies
  collectibles_gain_form2439: z.number().nonnegative().optional(),
});

type ScheduleDInput = z.infer<typeof inputSchema>;
type Transaction = z.infer<typeof transactionSchema>;
type DScreenTransaction = z.infer<typeof dScreenTransactionSchema>;

function sumAmounts(value: number | number[] | undefined): number {
  return normalizeArray(value).reduce((sum, amount) => sum + amount, 0);
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns true if the input has any capital activity worth computing
function hasCapitalActivity(input: ScheduleDInput): boolean {
  const txs = normalizeArray(input.transaction);
  const dScreenTxs = input.transactions ?? [];

  // Aggregate d_screen lines (any non-zero value means activity)
  const hasAggregateLines = (input.line_1a_proceeds ?? 0) !== 0 ||
    (input.line_1a_cost ?? 0) !== 0 ||
    (input.line_8a_proceeds ?? 0) !== 0 ||
    (input.line_8a_cost ?? 0) !== 0 ||
    (input.line_6_carryover ?? 0) !== 0 ||
    (input.line_14_carryover ?? 0) !== 0 ||
    (input.line_12_cap_gain_dist ?? 0) !== 0 ||
    sumAmounts(input.line_11_form2439) !== 0 ||
    sumAmounts(input.line_4_other_st) !== 0 ||
    (input.line_5_k1_st ?? 0) !== 0 ||
    (input.line_12_k1_lt ?? 0) !== 0 ||
    (input.line_11_qef_lt ?? 0) !== 0;

  return (
    txs.length > 0 ||
    (input.line13_cap_gain_distrib ?? 0) > 0 ||
    (input.line13_form8814 ?? 0) > 0 ||
    dScreenTxs.length > 0 ||
    hasAggregateLines
  );
}

// An AMT-basis Form 8949 line 2k refigure is supported only when its
// identified rows are the complete capital-activity source. Check source
// presence, not a net amount that unrelated rows could cancel to zero.
function hasOtherAmtBasisCapitalActivity(input: ScheduleDInput): boolean {
  return (input.transactions?.length ?? 0) > 0 ||
    input.pending_active_4797 === true ||
    [
      input.line13_cap_gain_distrib,
      input.line13_form8814,
      input.box2c_qsbs,
      input.capital_loss_carryover,
      input.line_1a_proceeds,
      input.line_1a_cost,
      input.line_8a_proceeds,
      input.line_8a_cost,
      input.line_6_carryover,
      input.line_14_carryover,
      input.line_12_cap_gain_dist,
      input.line_5_k1_st,
      input.line_12_k1_lt,
      input.line_11_qef_lt,
      input.gain_form6252_lt,
      input.gain_form8824_lt,
      input.gain_form6252_st,
      input.line19_unrecaptured_1250,
      input.collectibles_gain_form2439,
    ].some((amount) => amount !== undefined && amount !== 0) ||
    normalizeArray(input.line_11_form2439).some((amount) => amount !== 0) ||
    normalizeArray(input.line_4_other_st).some((amount) => amount !== 0);
}

// Form 1040 line 7a may report capital gain distributions directly when they
// are the only capital activity. In that case Schedule D is not filed.
function hasOnlyCapitalGainDistributions(input: ScheduleDInput): boolean {
  const distributions = (input.line13_cap_gain_distrib ?? 0) +
    (input.line13_form8814 ?? 0) +
    (input.line_12_cap_gain_dist ?? 0);
  if (distributions <= 0) return false;
  if (normalizeArray(input.transaction).length > 0) return false;
  if ((input.transactions ?? []).length > 0) return false;
  return [
    input.box2c_qsbs,
    input.capital_loss_carryover,
    input.line_1a_proceeds,
    input.line_1a_cost,
    input.line_8a_proceeds,
    input.line_8a_cost,
    input.line_6_carryover,
    input.line_14_carryover,
    sumAmounts(input.line_11_form2439),
    sumAmounts(input.line_4_other_st),
    input.line_5_k1_st,
    input.line_12_k1_lt,
    input.line_11_qef_lt,
    input.line19_unrecaptured_1250,
    input.collectibles_gain_form2439,
  ].every((value) => (value ?? 0) === 0);
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

// Compute d_screen aggregate short-term net (contribution to line 7)
function computeDScreenStNet(input: ScheduleDInput): number {
  return (
    (input.line_1a_proceeds ?? 0) -
    (input.line_1a_cost ?? 0) +
    sumAmounts(input.line_4_other_st) +
    (input.line_5_k1_st ?? 0) -
    (input.line_6_carryover ?? 0)
  );
}

// Compute d_screen aggregate long-term net (contribution to line 15)
function computeDScreenLtNet(input: ScheduleDInput): number {
  return (
    (input.line_8a_proceeds ?? 0) -
    (input.line_8a_cost ?? 0) +
    sumAmounts(input.line_11_form2439) +
    (input.line_11_qef_lt ?? 0) +
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
  return filingStatus === FilingStatus.MFS
    ? CAPITAL_LOSS_LIMIT_MFS
    : CAPITAL_LOSS_LIMIT;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleDIntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_d";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      f1040,
      agi_aggregator,
      income_tax_calculation,
      rate_28_gain_worksheet,
      form8960,
      form8995,
      form6251,
      schedule_d_final,
    ]);
  }

  compute(_ctx: NodeContext, rawInput: ScheduleDInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (
      (input.box2c_qsbs ?? 0) > 0 ||
      normalizeArray(input.transaction).some((tx) =>
        tx.qsbs_code !== undefined ||
        tx.qsbs_amount !== undefined ||
        tx.adjustment_codes?.includes("Q")
      ) ||
      (input.transactions ?? []).some((tx) =>
        tx.adjustment_codes?.includes("Q")
      )
    ) {
      throw new Error(
        "Schedule D section 1202 gain needs a sourced Form 8949 exclusion, 28% Rate Gain Worksheet refigure, and Form 6251 line 2h preference before filing",
      );
    }

    if (
      input.cod_property_fmv !== undefined ||
      input.cod_debt_cancelled !== undefined
    ) {
      throw new Error(
        "Schedule D cannot derive property gain from Form 1099-C box 7 FMV and canceled debt; report a sourced disposition with transfer, recourse, basis, and holding facts",
      );
    }

    if (!hasCapitalActivity(input)) {
      return {
        outputs: input.pending_active_4797 === true
          ? [this.outputNodes.output(schedule_d_final, {
            provisional_input: input,
          })]
          : [],
      };
    }

    if (hasOnlyCapitalGainDistributions(input)) {
      const distributions = (input.line13_cap_gain_distrib ?? 0) +
        (input.line13_form8814 ?? 0) +
        (input.line_12_cap_gain_dist ?? 0);
      const outputs: NodeOutput[] = [
        this.outputNodes.output(f1040, {
          line7a_cap_gain_distrib: distributions,
        }),
        this.outputNodes.output(agi_aggregator, {
          line7a_cap_gain_distrib: distributions,
        }),
        this.outputNodes.output(income_tax_calculation, {
          net_capital_gain: distributions,
        }),
        this.outputNodes.output(form8995, {
          net_capital_gain: distributions,
        }),
        this.outputNodes.output(form8960, { line5a_net_gain: distributions }),
      ];
      return input.pending_active_4797 === true
        ? {
          outputs: [
            ...outputs.filter((row) => row.nodeType === "agi_aggregator"),
            this.outputNodes.output(schedule_d_final, {
              provisional_input: input,
            }),
          ],
        }
        : { outputs };
    }

    // f8949 transactions (pre-computed gain_loss + is_long_term)
    const f8949Txs = normalizeArray(input.transaction);
    const { stGain: stTxGain, ltGain: ltTxGain } = computeTransactionGains(
      f8949Txs,
    );

    // d_screen transactions (gain_loss computed here from proceeds/cost/adjustment)
    const dScreenTxs = input.transactions ?? [];
    const { stGain: dScreenStTxGain, ltGain: dScreenLtTxGain } =
      computeDScreenTransactionGains(dScreenTxs);

    // d_screen aggregate line contributions
    const dScreenStAgg = computeDScreenStNet(input);
    const dScreenLtAgg = computeDScreenLtNet(input);

    // f1099div cap gain distributions
    const line13F1099div = input.line13_cap_gain_distrib ?? 0;
    const line13Form8814 = input.line13_form8814 ?? 0;

    // Schedule D line 7 (net short-term) and line 15 (net long-term)
    const line7 = stTxGain + dScreenStTxGain + dScreenStAgg;
    const line15 = ltTxGain + dScreenLtTxGain + dScreenLtAgg +
      line13F1099div + line13Form8814;

    // Line 16: combined net capital gain or loss
    const line16 = line7 + line15;

    // Line 17: are lines 15 and 16 both gains?
    const line17Yes = line15 > 0 && line16 > 0;

    // Line 21: apply capital loss deduction limit
    const limit = lossLimit(input.filing_status);
    const capitalGainForReturn = line16 >= 0 ? line16 : Math.max(limit, line16);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, {
        line7_capital_gain: capitalGainForReturn,
      }),
      this.outputNodes.output(agi_aggregator, {
        line7_capital_gain: capitalGainForReturn,
      }),
    ];
    outputs.push(this.outputNodes.output(form6251, {
      line2k_8949_capital_audit: {
        transactions: f8949Txs.map((tx) => ({
          source_transaction_id: tx.source_transaction_id ?? "",
          part: tx.part,
          proceeds: tx.proceeds,
          cost_basis: tx.cost_basis,
          adjustment_codes: tx.adjustment_codes,
          adjustment_amount: tx.adjustment_amount,
          gain_loss: tx.gain_loss,
        })),
        has_other_capital_activity: hasOtherAmtBasisCapitalActivity(input),
      },
    }));

    // NII: net capital gain (not loss) is subject to NIIT (IRC §1411(c)(1)(A)(iii))
    if (capitalGainForReturn > 0) {
      outputs.push(
        this.outputNodes.output(form8960, {
          line5a_net_gain: capitalGainForReturn,
        }),
      );
    }

    // Line 17 = Yes: both line 15 and line 16 are gains.
    // Route net_capital_gain (= min(line15, line16)) to income_tax_calculation
    // for the QDCGT / Schedule D Tax Worksheet (IRC §1(h)).
    if (line17Yes) {
      const netCapGain = Math.min(line15, line16);

      // Line 19: unrecaptured §1250 gain — include for 25% tier when present
      const unrecaptured1250 = input.line19_unrecaptured_1250 ?? 0;
      if (unrecaptured1250 > 0) {
        outputs.push(this.outputNodes.output(income_tax_calculation, {
          net_capital_gain: netCapGain,
          unrecaptured_1250_gain: unrecaptured1250,
        }));
      } else {
        outputs.push(
          this.outputNodes.output(income_tax_calculation, {
            net_capital_gain: netCapGain,
          }),
        );
      }

      // Form 8995 line 12 is Form 1040 line 3a plus net capital gain, and i8995 Line 12
      // defines that gain as the smaller of Schedule D line 15 or 16.
      outputs.push(
        this.outputNodes.output(form8995, { net_capital_gain: netCapGain }),
      );

      // Line 18: 28% Rate Gain Worksheet (collectibles/1202 gains from f8949 + Form 2439)
      const gain28Pct = compute28PctGain(f8949Txs, dScreenTxs);
      const form2439Collectibles = input.collectibles_gain_form2439 ?? 0;
      const total28Pct = gain28Pct + form2439Collectibles;
      if (total28Pct > 0) {
        outputs.push(
          this.outputNodes.output(rate_28_gain_worksheet, {
            collectibles_gain_from_8949: total28Pct,
          }),
        );
      }
    }

    // ── Self-emit print-layer line values for the PDF/MeF builders ───────────
    // (same pattern as the f1040 output node; keys are distinct from
    // inputSchema keys to avoid executor merge-accumulation).
    //
    // Covered transactions with basis reported and no adjustments (Parts A/D)
    // qualify for direct reporting on lines 1a/8a without Form 8949
    // (Schedule D instructions, "Exception 1"). All other transactions remain
    // on the Form 8949 path and aggregate into lines 1b/2/3 and 8b/9/10.
    const isDirect = (part: string, codes: string | undefined): boolean =>
      (part === "A" || part === "D") && !(codes ?? "").length;

    const direct = { stP: 0, stC: 0, stG: 0, ltP: 0, ltC: 0, ltG: 0 };
    for (const tx of dScreenTxs) {
      if (!isDirect(tx.part, tx.adjustment_codes)) continue;
      const gl = dScreenGainLoss(tx);
      if (LONG_TERM_PARTS.has(tx.part)) {
        direct.ltP += tx.proceeds;
        direct.ltC += tx.cost_basis;
        direct.ltG += gl;
      } else {
        direct.stP += tx.proceeds;
        direct.stC += tx.cost_basis;
        direct.stG += gl;
      }
    }
    for (const tx of f8949Txs) {
      if (!isDirect(tx.part, tx.adjustment_codes)) continue;
      if (tx.is_long_term) {
        direct.ltP += tx.proceeds;
        direct.ltC += tx.cost_basis;
        direct.ltG += tx.gain_loss;
      } else {
        direct.stP += tx.proceeds;
        direct.stC += tx.cost_basis;
        direct.stG += tx.gain_loss;
      }
    }

    const printFields: Record<string, number | boolean> = {
      print_line7_st_total: line7,
      print_line15_lt_total: line15,
      print_line16_combined: line16,
      // QOF disposition question at the top of Schedule D — not modeled by the
      // engine, so it is always answered "No".
      print_qof_disposition: false,
    };
    // Multiple source nodes can contribute to these Form 6252/4797 lines.
    // Replace the executor's accumulated array with the exact line total for
    // both the pending MeF document and the calculation above.
    if (Array.isArray(input.line_11_form2439)) {
      printFields.line_11_form2439 = sumAmounts(input.line_11_form2439);
    }
    if (Array.isArray(input.line_4_other_st)) {
      printFields.line_4_other_st = sumAmounts(input.line_4_other_st);
    }
    // Line 17 is only answered when line 16 is a gain (a loss skips to
    // line 21; zero skips to line 22 — both leave lines 17–20 blank).
    if (line16 > 0) {
      printFields.print_line17_both_gains = line17Yes;
    }
    if (direct.stP > 0 || direct.stC > 0) {
      printFields.print_line1a_proceeds = direct.stP;
      printFields.print_line1a_cost = direct.stC;
      printFields.print_line1a_gain = direct.stG;
    }
    if (direct.ltP > 0 || direct.ltC > 0) {
      printFields.print_line8a_proceeds = direct.ltP;
      printFields.print_line8a_cost = direct.ltC;
      printFields.print_line8a_gain = direct.ltG;
    }
    if (
      line13F1099div > 0 || line13Form8814 > 0 ||
      (input.line_12_cap_gain_dist ?? 0) > 0
    ) {
      printFields.print_line13_cap_gain_distrib = line13F1099div +
        line13Form8814 +
        (input.line_12_cap_gain_dist ?? 0);
    }
    if (line17Yes) {
      const unrecaptured1250 = input.line19_unrecaptured_1250 ?? 0;
      const gain28Pct = compute28PctGain(f8949Txs, dScreenTxs) +
        (input.collectibles_gain_form2439 ?? 0);
      printFields.print_line18_28pct = gain28Pct;
      printFields.print_line19_unrecaptured_1250 = unrecaptured1250;
      // Line 20: both 18 and 19 zero/blank → use the QDCGT worksheet.
      printFields.print_line20_qdcgt = gain28Pct === 0 &&
        unrecaptured1250 === 0;
    }
    if (line16 < 0) {
      printFields.print_line21_loss = capitalGainForReturn;
    }
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    return input.pending_active_4797 === true
      ? {
        outputs: [
          ...outputs.filter((row) => row.nodeType === "agi_aggregator"),
          this.outputNodes.output(schedule_d_final, {
            provisional_input: input,
          }),
        ],
      }
      : { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_d = new ScheduleDIntermediateNode();
