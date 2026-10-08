import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  inputSchema as scheduleDInputSchema,
} from "../../../../../nodes/intermediate/aggregation/income/investments/schedule_d/index.ts";

type Pending = Readonly<Record<string, unknown>>;

/** Compare the finalized Schedule D result with the amount filed on Form 1040. */
export function assertScheduleD1040Join(pending: Pending): void {
  const rawSchedule = pending.schedule_d;
  if (rawSchedule === undefined) return;
  if (rawSchedule === null || typeof rawSchedule !== "object") {
    throw new Error("Schedule D needs finalized calculation fields");
  }
  const schedule = rawSchedule as Record<string, unknown>;
  if (schedule.active_4797_final_no_schedule_d === true) return;
  const line16 = schedule.print_line16_combined;
  // Descriptor-only callers can submit an isolated Schedule D field. A
  // finalized return carries the calculated print total and Form 1040 join.
  if (line16 === undefined) return;
  const raw1040 = pending.f1040;
  if (raw1040 === null || typeof raw1040 !== "object") {
    throw new Error("Schedule D needs Form 1040 line 7");
  }
  const form1040 = raw1040 as Record<string, unknown>;
  if (typeof line16 !== "number" || !Number.isFinite(line16)) {
    throw new Error("Schedule D needs finalized line 16 before export");
  }
  // The graph folds direct box A/D transactions into lines 1a/8a for print.
  // Replay the retained aggregates and only the non-direct transaction rows
  // so that a changed print total cannot be carried through to Form 1040.
  const input = scheduleDInputSchema.parse(schedule);
  const sum = (value: number | number[] | undefined): number =>
    value === undefined
      ? 0
      : Array.isArray(value)
      ? value.reduce((total, amount) => total + amount, 0)
      : value;
  const direct = (
    part: string,
    codes: string | undefined,
    adjustment: number | undefined,
  ): boolean =>
    (part === "A" || part === "D") && !(codes ?? "").length &&
    adjustment === undefined;
  const shortParts = new Set(["A", "B", "C", "G", "H", "I"]);
  const directAmounts = {
    shortProceeds: 0,
    shortCost: 0,
    longProceeds: 0,
    longCost: 0,
  };
  const addDirect = (
    isLongTerm: boolean,
    proceeds: number,
    costBasis: number,
  ): void => {
    if (isLongTerm) {
      directAmounts.longProceeds += proceeds;
      directAmounts.longCost += costBasis;
    } else {
      directAmounts.shortProceeds += proceeds;
      directAmounts.shortCost += costBasis;
    }
  };
  let shortGain = (input.line_1a_proceeds ?? 0) -
    (input.line_1a_cost ?? 0) + sum(input.line_4_other_st) +
    sum(input.line_5_k1_st) - (input.line_6_carryover ?? 0);
  let longGain = (input.line_8a_proceeds ?? 0) -
    (input.line_8a_cost ?? 0) + sum(input.line_11_form2439) +
    (input.line_11_qef_lt ?? 0) + (input.line_12_cap_gain_dist ?? 0) +
    sum(input.line_12_k1_lt) - (input.line_14_carryover ?? 0) +
    (input.line13_cap_gain_distrib ?? 0) +
    (input.line13_form8814 ?? 0);
  const transactions = input.transaction === undefined
    ? []
    : Array.isArray(input.transaction)
    ? input.transaction
    : [input.transaction];
  for (const tx of transactions) {
    if (direct(tx.part, tx.adjustment_codes, tx.adjustment_amount)) {
      addDirect(tx.is_long_term, tx.proceeds, tx.cost_basis);
      continue;
    }
    if (tx.is_long_term) longGain += tx.gain_loss;
    else shortGain += tx.gain_loss;
  }
  for (const tx of input.transactions ?? []) {
    if (direct(tx.part, tx.adjustment_codes, tx.adjustment_amount)) {
      addDirect(tx.part === "D", tx.proceeds, tx.cost_basis);
      continue;
    }
    const gain = tx.proceeds - tx.cost_basis + (tx.adjustment_amount ?? 0);
    if (shortParts.has(tx.part)) shortGain += gain;
    else longGain += gain;
  }
  if (
    pending.general !== undefined && (
      Math.abs((input.line_1a_proceeds ?? 0) - directAmounts.shortProceeds) >=
        0.01 ||
      Math.abs((input.line_1a_cost ?? 0) - directAmounts.shortCost) >= 0.01 ||
      Math.abs((input.line_8a_proceeds ?? 0) - directAmounts.longProceeds) >=
        0.01 ||
      Math.abs((input.line_8a_cost ?? 0) - directAmounts.longCost) >= 0.01
    )
  ) {
    throw new Error(
      "Schedule D lines 1a and 8a must match retained direct-sale proceeds and basis",
    );
  }
  const printedShort = schedule.print_line7_st_total;
  const printedLong = schedule.print_line15_lt_total;
  if (
    typeof printedShort !== "number" || !Number.isFinite(printedShort) ||
    typeof printedLong !== "number" || !Number.isFinite(printedLong) ||
    Math.abs(printedShort - shortGain) >= 0.01 ||
    Math.abs(printedLong - longGain) >= 0.01 ||
    Math.abs(line16 - shortGain - longGain) >= 0.01
  ) {
    throw new Error(
      "Schedule D print lines 7, 15, and 16 differ from retained capital activity",
    );
  }
  const limit = form1040.filing_status === FilingStatus.MFS ? -1_500 : -3_000;
  const expected = line16 < 0 ? Math.max(line16, limit) : line16;
  const filed = form1040.line7_capital_gain;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    Math.abs(filed - expected) >= 0.01 ||
    (line16 < 0 && schedule.print_line21_loss !== expected)
  ) {
    throw new Error(
      "Form 1040 line 7 must match finalized Schedule D line 16 or limited line 21 loss",
    );
  }
}
