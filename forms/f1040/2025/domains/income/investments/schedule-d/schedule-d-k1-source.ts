import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { box11CodeSSourceRows } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_s.ts";
import { inputSchema as sCorpSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { inputSchema as trustSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";

const cents = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Schedule D K-1 capital amounts need numeric source");
  }
  const rounded = Math.round(value * 100);
  if (
    !Number.isSafeInteger(rounded) ||
    Math.abs(value * 100 - rounded) > 0.000001
  ) {
    throw new Error("Schedule D K-1 capital amounts need cent precision");
  }
  return rounded;
};

/** Reconcile the individual's Schedule D lines 5/12, not the entity's Schedule D. */
export function assertScheduleDK1Source(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (
    !pending || !(
      "f1040" in pending || "k1_partnership" in pending ||
      "k1_s_corp" in pending || "k1_trust" in pending
    )
  ) return;
  const partnerships = pending.k1_partnership === undefined
    ? []
    : partnershipSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorps = pending.k1_s_corp === undefined
    ? []
    : sCorpSchema.parse(pending.k1_s_corp).k1_s_corps;
  const trusts = pending.k1_trust === undefined
    ? []
    : trustSchema.parse(pending.k1_trust).k1_trusts;
  const codeS = box11CodeSSourceRows(partnerships);
  const expectedSt = partnerships.reduce(
    (total, row) => total + cents(row.box8_net_st_cap_gain),
    0,
  ) + codeS.reduce((total, row) => total + cents(row.short_term_gain_loss), 0) +
    sCorps.reduce(
      (total, row) => total + cents(row.box7_net_st_cap_gain),
      0,
    ) + trusts.reduce(
      (total, row) =>
        total + cents(row.box3_net_st_cap_gain) -
        cents(row.box11_code_c_short_term_capital_loss_carryover),
      0,
    );
  const expectedLt = partnerships.reduce(
    (total, row) => total + cents(row.box9a_net_lt_cap_gain),
    0,
  ) + codeS.reduce((total, row) => total + cents(row.long_term_gain_loss), 0) +
    sCorps.reduce(
      (total, row) => total + cents(row.box8a_net_lt_cap_gain),
      0,
    ) + trusts.reduce(
      (total, row) =>
        total + cents(row.box4a_net_lt_cap_gain) -
        cents(row.box11_code_d_long_term_capital_loss_carryover),
      0,
    );
  if (
    cents(fields.line_5_k1_st) !== expectedSt ||
    cents(fields.line_12_k1_lt) !== expectedLt
  ) {
    throw new Error(
      "Schedule D lines 5/12 must match issued K-1 capital source",
    );
  }
}
