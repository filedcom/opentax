import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { calculateMultiSource8995A } from "./multi-source.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";

const cfg = CONFIG_BY_YEAR[2025];
const row = (
  business_name: string,
  qbi: number,
  w2_wages = 0,
  ubia = 0,
  sstb = false,
) => ({ business_name, qbi, w2_wages, ubia, sstb });
const base = {
  qbiLossCarryforward: 0,
  reitPtp: 0,
  reitPtpLossCarryforward: 0,
  netCapitalGain: 0,
  filingStatus: FilingStatus.MFJ,
};

// 2025 Form 8995-A: MFJ threshold 394,600, phase-in range 100,000.
// Taxable income 400,000 → line 24 phase-in 5,400 / 100,000 = 5.4%.
// Schedule C: the K-1 loss of 20,000 reduces the Schedule C QBI to 130,000.
// Part II/III: 20% = 26,000, W-2/UBIA limit 0, reduction 26,000 × 5.4% =
// 1,404 → 24,596. Part IV: REIT 1,000 × 20% = 200; line 36 = 80,000.
test("8995-A multi-source: Schedule C, K-1 loss and REIT dividends in the phase-in range", () => {
  const result = calculateMultiSource8995A({
    ...base,
    businesses: [row("Schedule C", 150_000), row("K-1", -20_000)],
    reitPtp: 1_000,
    taxableIncome: 400_000,
  }, cfg);
  assertEquals(result.businesses.map((b) => b.qbi), [130_000, 0]);
  assertEquals(result.line27, 24_596);
  assertEquals(result.line31, 200);
  assertEquals(result.line39, 24_796);
  assertEquals(result.qbiLossCarryforward, 0);
});

test("8995-A multi-source: wage limit applies per business above the range", () => {
  // Fully above the range: each business takes the smaller of 20% of QBI and
  // the greater of 50% of wages or 25% of wages plus 2.5% of UBIA.
  const result = calculateMultiSource8995A({
    ...base,
    businesses: [
      row("A", 100_000, 30_000), // 20,000 vs 15,000 → 15,000
      row("B", 100_000, 0, 400_000), // 20,000 vs 10,000 → 10,000
      row("C", 50_000, 0, 0, true), // SSTB above the range → excluded
    ],
    taxableIncome: 600_000,
  }, cfg);
  assertEquals(result.line27, 25_000);
});

test("8995-A multi-source: a net loss and a REIT loss carry forward", () => {
  const result = calculateMultiSource8995A({
    ...base,
    businesses: [row("A", 10_000), row("B", -25_000)],
    qbiLossCarryforward: -1_000,
    reitPtp: 500,
    reitPtpLossCarryforward: -800,
    taxableIncome: 200_000,
  }, cfg);
  assertEquals(result.line39, 0);
  assertEquals(result.qbiLossCarryforward, 16_000);
  assertEquals(result.reitPtpLossCarryforward, 300);
});
