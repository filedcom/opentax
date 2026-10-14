// One TY2025 calculation for the Part II farm optional method, shared by the
// tax node and both filing representations. The election has no separate MeF
// checkbox: Part II line 15, repeated on Part I line 4b, conveys it.
export const NET_EARNINGS_MULTIPLIER = 0.9235;

export function scheduleSELines(input: {
  readonly net_profit_schedule_c?: number | null;
  readonly net_profit_schedule_f?: number | null;
  readonly farm_optional_method_elected?: boolean | null;
  readonly gross_farm_income?: number | null;
  readonly w2_ss_wages?: number | null;
  readonly unreported_tips_4137?: number | null;
  readonly wages_8919?: number | null;
}, ssWageBase: number) {
  const optional = farmOptionalMethodLines(input);
  const line3 = optional?.line3 ??
    ((input.net_profit_schedule_c ?? 0) + (input.net_profit_schedule_f ?? 0));
  const line4a = optional?.line4a ??
    (line3 > 0 ? line3 * NET_EARNINGS_MULTIPLIER : line3);
  const line4c = optional?.line4c ?? line4a;
  if (line4c < 400) return undefined;
  const line6 = optional?.line6 ?? line4c;
  const line8d = (input.w2_ss_wages ?? 0) +
    (input.unreported_tips_4137 ?? 0) + (input.wages_8919 ?? 0);
  const line9 = Math.max(0, ssWageBase - line8d);
  // The filed Schedule SE uses whole-dollar lines. Line 12 must add the
  // amounts actually entered on lines 10 and 11, not round their raw sum.
  const filedLine6 = Math.round(line6);
  const line10 = Math.round(Math.min(filedLine6, Math.round(line9)) * 0.124);
  const line11 = Math.round(filedLine6 * 0.029);
  const line12 = line10 + line11;
  // Line 13 is entered as whole dollars on the filed Schedule SE. Downstream
  // adjustments and QBI must use that entered amount so Form 1040 reconciles.
  const line13 = Math.round(line12 * 0.5);
  return {
    line3,
    line4a,
    ...(optional ? { line4b: optional.line4b } : {}),
    line4c,
    line6,
    line8d,
    line9,
    line10,
    line11,
    line12,
    line13,
    ...(optional ? { line15: optional.line15 } : {}),
  };
}

export function farmOptionalMethodLines(input: {
  readonly farm_optional_method_elected?: unknown;
  readonly gross_farm_income?: unknown;
  readonly net_profit_schedule_f?: unknown;
  readonly net_profit_schedule_c?: unknown;
}): {
  line3: number;
  line4a: number;
  line4b: number;
  line4c: number;
  line6: number;
  line15: number;
} | undefined {
  if (input.farm_optional_method_elected !== true) return undefined;

  const gross = input.gross_farm_income;
  const farmProfit = input.net_profit_schedule_f;
  const nonfarmProfit = input.net_profit_schedule_c ?? 0;
  if (
    typeof gross !== "number" || !Number.isFinite(gross) || gross < 0 ||
    typeof farmProfit !== "number" || !Number.isFinite(farmProfit) ||
    typeof nonfarmProfit !== "number" || !Number.isFinite(nonfarmProfit)
  ) {
    throw new Error(
      "Schedule SE farm optional method requires gross farm income and net farm profit as finite amounts",
    );
  }
  if (gross > 10_860 && farmProfit >= 7_840) {
    throw new Error(
      "Schedule SE farm optional method is unavailable when gross farm income exceeds $10,860 and net farm profit is at least $7,840",
    );
  }

  // Part I line 1a is skipped. Part II line 15 goes directly on Part I line
  // 4b, without the line 4a 92.35% multiplier.
  const line3 = nonfarmProfit;
  const line4a = line3 > 0 ? line3 * NET_EARNINGS_MULTIPLIER : line3;
  const line15 = Math.min(gross * 2 / 3, 7_240);
  const line4b = line15;
  const line4c = line4a + line4b;
  return { line3, line4a, line4b, line4c, line6: line4c, line15 };
}
