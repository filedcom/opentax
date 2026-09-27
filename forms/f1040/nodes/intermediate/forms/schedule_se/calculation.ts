// One TY2025 calculation for the Part II farm optional method, shared by the
// tax node and both filing representations. The election has no separate MeF
// checkbox: Part II line 15, repeated on Part I line 4b, conveys it.
export const NET_EARNINGS_MULTIPLIER = 0.9235;

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
