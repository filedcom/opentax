import { assertEquals } from "@std/assert";
import { eitc } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function compute(input: Record<string, unknown>) {
  return eitc.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function getCredit(input: Record<string, unknown>): number {
  const result = compute(input);
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  return (out?.fields.line27_eitc as number) ?? 0;
}

function noCredit(input: Record<string, unknown>): void {
  const result = compute(input);
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(out, undefined);
}

// ─── No Income ────────────────────────────────────────────────────────────────

Deno.test("no_earned_income_no_credit — earned_income=0 → no output", () => {
  noCredit({ earned_income: 0, qualifying_children: 1, filing_status: FilingStatus.Single });
});

Deno.test("no_earned_income_no_credit — empty input → no output", () => {
  noCredit({});
});

// ─── Investment Income Disqualifier ──────────────────────────────────────────

Deno.test("investment_income_disqualifier_at_limit — $11,950 → still eligible", () => {
  // At exactly the limit: still qualifies. Credit = 4328 (at max for 1 child).
  const credit = getCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_950,
  });
  assertEquals(credit, 4_328);
});

Deno.test("investment_income_disqualifier_over_limit — $11,951 → no credit", () => {
  noCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_951,
  });
});

// ─── Zero Children (Single) ───────────────────────────────────────────────────
// Phase-in rate: 7.65% | Phase-in end: $8,490 | Max credit: $649
// Phase-out start (single): $10,620 | Phase-out rate: 7.65% | Income limit: $18,591

Deno.test("0 children single — phase-in midpoint ($5,000) → $383", () => {
  // 5000 × 0.0765 = 382.5 → Math.round → 383
  assertEquals(getCredit({
    earned_income: 5_000,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  }), 383);
});

Deno.test("0 children single — at phase-in end ($8,490) → max $649", () => {
  // 8490 × 0.0765 = 649.485 ≥ 649 → clamped to max $649
  assertEquals(getCredit({
    earned_income: 8_490,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  }), 649);
});

Deno.test("0 children single — at phase-out start ($10,620) → $649 (no reduction yet)", () => {
  assertEquals(getCredit({
    earned_income: 10_620,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  }), 649);
});

Deno.test("0 children single — phase-out midpoint ($14,606) → $344", () => {
  // credit = 649; reduction = 0.0765 × (14606 - 10620) = 0.0765 × 3986 = 304.929
  // final = Math.round(649 - 304.929) = Math.round(344.071) = 344
  assertEquals(getCredit({
    earned_income: 14_606,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  }), 344);
});

Deno.test("0 children single — at income limit ($18,591) → $0", () => {
  noCredit({
    earned_income: 18_591,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
});

Deno.test("0 children single — one dollar over limit ($18,592) → $0", () => {
  noCredit({
    earned_income: 18_592,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });
});

// ─── One Child (Single) ───────────────────────────────────────────────────────
// Phase-in rate: 34% | Phase-in end: $12,730 | Max credit: $4,328
// Phase-out start (single): $23,511 | Phase-out rate: 15.98% | Income limit: $49,084

Deno.test("1 child single — phase-in midpoint ($6,365) → $2,164", () => {
  // 6365 × 0.34 = 2164.1 → Math.round → 2164
  assertEquals(getCredit({
    earned_income: 6_365,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 2_164);
});

Deno.test("1 child single — at phase-in end ($12,730) → max $4,328", () => {
  assertEquals(getCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 4_328);
});

Deno.test("1 child single — at phase-out start ($23,511) → $4,328 (no reduction yet)", () => {
  assertEquals(getCredit({
    earned_income: 23_511,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 4_328);
});

Deno.test("1 child single — phase-out midpoint ($36,298) → $2,285", () => {
  // credit = 4328; reduction = 0.1598 × (36298 - 23511) = 0.1598 × 12787 = 2043.4…
  // final = Math.round(4328 - 2043.4226) = Math.round(2284.577) = 2285
  assertEquals(getCredit({
    earned_income: 36_298,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 2_285);
});

Deno.test("1 child single — at income limit ($49,084) → $0", () => {
  noCredit({
    earned_income: 49_084,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
});

Deno.test("1 child single — one dollar over limit ($49,085) → $0", () => {
  noCredit({
    earned_income: 49_085,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
});

// ─── Two Children (Single) ────────────────────────────────────────────────────
// Phase-in rate: 40% | Phase-in end: $17,880 | Max credit: $7,152
// Phase-out start (single): $23,511 | Phase-out rate: 21.06% | Income limit: $55,768

Deno.test("2 children single — phase-in midpoint ($8,940) → $3,576", () => {
  // 8940 × 0.40 = 3576
  assertEquals(getCredit({
    earned_income: 8_940,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  }), 3_576);
});

Deno.test("2 children single — at phase-in end ($17,880) → max $7,152", () => {
  assertEquals(getCredit({
    earned_income: 17_880,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  }), 7_152);
});

Deno.test("2 children single — at phase-out start ($23,511) → $7,152 (no reduction yet)", () => {
  assertEquals(getCredit({
    earned_income: 23_511,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  }), 7_152);
});

Deno.test("2 children single — phase-out midpoint ($39,640) → $3,756", () => {
  // credit = 7152; reduction = 0.2106 × (39640 - 23511) = 0.2106 × 16129 = 3396.7674
  // final = Math.round(7152 - 3396.7674) = Math.round(3755.2326) = 3755
  assertEquals(getCredit({
    earned_income: 39_640,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  }), 3_755);
});

Deno.test("2 children single — at income limit ($55,768) → $0", () => {
  noCredit({
    earned_income: 55_768,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  });
});

Deno.test("2 children single — one dollar over limit ($55,769) → $0", () => {
  noCredit({
    earned_income: 55_769,
    qualifying_children: 2,
    filing_status: FilingStatus.Single,
  });
});

// ─── Three Children (Single) ──────────────────────────────────────────────────
// Phase-in rate: 40% (IRC §32(b)(1)(B)) | Phase-in end: $17,880 | Max credit: $8,046
// Phase-out start (single): $23,511 | Phase-out rate: 21.06% | Income limit: $59,899

Deno.test("3 children single — phase-in midpoint ($8,940) → $3,576", () => {
  // 8940 × 0.40 = 3576 (rate is 40%, not 45%)
  assertEquals(getCredit({
    earned_income: 8_940,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  }), 3_576);
});

Deno.test("3 children single — at phase-in end ($17,880) → max $8,046", () => {
  assertEquals(getCredit({
    earned_income: 17_880,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  }), 8_046);
});

Deno.test("3 children single — at phase-out start ($23,511) → $8,046 (no reduction yet)", () => {
  assertEquals(getCredit({
    earned_income: 23_511,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  }), 8_046);
});

Deno.test("3 children single — phase-out midpoint ($41,705) → $4,214", () => {
  // credit = 8046; reduction = 0.2106 × (41705 - 23511) = 0.2106 × 18194 = 3831.65…
  // final = Math.round(8046 - 3831.65) = Math.round(4214.35) = 4214
  assertEquals(getCredit({
    earned_income: 41_705,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  }), 4_214);
});

Deno.test("3 children single — at income limit ($59,899) → $0", () => {
  noCredit({
    earned_income: 59_899,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  });
});

Deno.test("3 children single — one dollar over limit ($59,900) → $0", () => {
  noCredit({
    earned_income: 59_900,
    qualifying_children: 3,
    filing_status: FilingStatus.Single,
  });
});

// ─── MFJ vs Single: Higher Phase-Out Threshold ───────────────────────────────

Deno.test("MFJ_vs_single_0_children — $19,000 income: single phased out, MFJ gets $561", () => {
  // Single: earned_income=$19,000 >= limit $18,591 → $0
  noCredit({
    earned_income: 19_000,
    qualifying_children: 0,
    filing_status: FilingStatus.Single,
  });

  // MFJ: limit=$25,511, phase-out start=$17,850
  // credit at max = $649; reduction = 0.0765 × (19000 - 17850) = 0.0765 × 1150 = 87.975
  // final = Math.round(649 - 87.975) = Math.round(561.025) = 561
  assertEquals(getCredit({
    earned_income: 19_000,
    qualifying_children: 0,
    filing_status: FilingStatus.MFJ,
  }), 561);
});

Deno.test("MFJ_vs_single_1_child — $45,000 income: single phased out, MFJ still has credit", () => {
  // Single: phase-out start=$23,511; reduction = 0.1598 × (45000-23511) = 0.1598 × 21489 = 3434.0…
  // credit = max(0, 4328 - 3434) = 894; earned_income < limit $49,084 so still eligible
  // 0.1598 × 21489 = 3434.0022; Math.round(4328 - 3434.0022) = Math.round(893.9978) = 894
  assertEquals(getCredit({
    earned_income: 45_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 894);

  // MFJ: phase-out start=$30,323; reduction = 0.1598 × (45000-30323) = 0.1598 × 14677 = 2345.38…
  // credit = Math.round(4328 - 2345.38) = Math.round(1982.62) = 1983
  assertEquals(getCredit({
    earned_income: 45_000,
    qualifying_children: 1,
    filing_status: FilingStatus.MFJ,
  }), 1_983);
});

// ─── AGI vs Earned Income ─────────────────────────────────────────────────────
// IRC §32(a)(2)(B): phaseout uses max(earned_income, AGI).
// When AGI > earned income (e.g. large capital gains), AGI controls.

Deno.test("agi_vs_earned_income — phaseout uses max(earned_income, AGI) per IRC §32(a)(2)(B)", () => {
  // earned_income=$25,000 (just above phase-out start $23,511), agi=$40,000
  // max(25000, 40000) = 40000 → phaseout base is AGI
  // reduction = 0.1598 × (40000 - 23511) = 0.1598 × 16489 ≈ 2634.94
  // Math.round(4328 - 2634.94) = Math.round(1693.06) = 1693
  assertEquals(getCredit({
    earned_income: 25_000,
    agi: 40_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 1_693);
});

// ─── SE Income Counts as Earned Income ───────────────────────────────────────

Deno.test("se_net_profit adds to earned income for phase-in", () => {
  // se_net_profit=$6,365 with no wages; 6365 × 0.34 = 2164.1 → 2164
  assertEquals(getCredit({
    se_net_profit: 6_365,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 2_164);
});

Deno.test("se_net_profit combined with wages reaches max credit", () => {
  // wages=$6,000 + se_profit=$6,730 = $12,730 total → max $4,328 for 1 child
  assertEquals(getCredit({
    earned_income: 6_000,
    se_net_profit: 6_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  }), 4_328);
});

// ─── MFS Disqualification ─────────────────────────────────────────────────────

Deno.test("MFS filing status — disqualified from EITC (IRC §32(d))", () => {
  // MFS filers are categorically ineligible regardless of income/children
  assertEquals(getCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.MFS,
  }), 0);
});

// ─── Output Routes to f1040 line27_eitc ──────────────────────────────────────

Deno.test("output routes to f1040 line27_eitc field", () => {
  const result = compute({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(out?.fields.line27_eitc, 4_328);
});
