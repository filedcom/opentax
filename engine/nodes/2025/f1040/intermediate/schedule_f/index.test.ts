import { assertEquals, assertThrows } from "@std/assert";
import { schedule_f, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_f.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Minimal valid farm item ───────────────────────────────────────────────────

function minimalItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    line_b_agricultural_activity_code: "0111",
    line_e_material_participation: true,
    accounting_method: "cash",
    line1_sales_livestock_resale: 0,
    ...overrides,
  };
}

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("schedule_f: smoke test — empty farms array returns no outputs", () => {
  const result = compute({ schedule_fs: [] });
  assertEquals(result.outputs.length, 0);
});

// ── Zero income + zero expenses ───────────────────────────────────────────────

Deno.test("schedule_f: zero income and expenses — no outputs", () => {
  const result = compute({
    schedule_fs: [minimalItem()],
  });
  assertEquals(result.outputs.length, 0);
});

// ── Net profit routes to schedule1 and schedule_se ───────────────────────────

Deno.test("schedule_f: net profit routes to schedule1 line6", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 50_000,
        line16_feed: 10_000,
      }),
    ],
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line6_schedule_f, 40_000);
});

Deno.test("schedule_f: net profit >= $400 routes to schedule_se", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 50_000,
        line16_feed: 10_000,
      }),
    ],
  });
  const se = findOutput(result, "schedule_se");
  assertEquals(se?.input.net_profit_schedule_f, 40_000);
});

// ── Net profit routes to form8995 (QBI) ──────────────────────────────────────

Deno.test("schedule_f: net profit > 0 routes to form8995 as QBI", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 30_000,
        line16_feed: 5_000,
      }),
    ],
  });
  const qbi = findOutput(result, "form8995");
  assertEquals(qbi?.input.qbi_from_schedule_f, 25_000);
});

// ── Net loss routes to schedule1 but not schedule_se ─────────────────────────

Deno.test("schedule_f: net loss routes to schedule1 (negative line6) but not schedule_se", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 5_000,
        line16_feed: 20_000,
      }),
    ],
  });
  const s1 = findOutput(result, "schedule1");
  const se = findOutput(result, "schedule_se");
  assertEquals(s1?.input.line6_schedule_f, -15_000);
  assertEquals(se, undefined);
});

// ── Small profit below SE threshold ($400) ───────────────────────────────────

Deno.test("schedule_f: profit below $400 SE threshold — no schedule_se output", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 500,
        line16_feed: 200,   // profit = 300 < 400
      }),
    ],
  });
  const se = findOutput(result, "schedule_se");
  assertEquals(se, undefined);
});

// ── Material participation = false → form8582 ─────────────────────────────────

Deno.test("schedule_f: non-material participation routes to form8582", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line_e_material_participation: false,
        line1_sales_livestock_resale: 20_000,
        line16_feed: 30_000,
      }),
    ],
  });
  const passive = findOutput(result, "form8582");
  assertEquals(passive?.input.passive_schedule_f, -10_000);
});

// ── At-risk box 36b + loss → form6198 ────────────────────────────────────────

Deno.test("schedule_f: at-risk box 'b' with loss routes to form6198", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 5_000,
        line16_feed: 15_000,
        line36_at_risk: "b",
      }),
    ],
  });
  const atrisk = findOutput(result, "form6198");
  assertEquals(atrisk?.input.schedule_f_loss, -10_000);
});

Deno.test("schedule_f: at-risk box 'a' with loss does NOT route to form6198", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 5_000,
        line16_feed: 15_000,
        line36_at_risk: "a",
      }),
    ],
  });
  const atrisk = findOutput(result, "form6198");
  assertEquals(atrisk, undefined);
});

// ── Farm income aggregation across multiple farms ────────────────────────────

Deno.test("schedule_f: aggregates net profit across multiple farms to single schedule1 output", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({ line1_sales_livestock_resale: 40_000, line16_feed: 10_000 }),  // profit 30k
      minimalItem({ line1_sales_livestock_resale: 20_000, line17_fertilizers: 5_000 }),  // profit 15k
    ],
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line6_schedule_f, 45_000);
});

// ── Conservation expense limit (25% of gross) ────────────────────────────────

Deno.test("schedule_f: conservation expense is limited to 25% of gross farm income", () => {
  // Gross = 20,000; 25% limit = 5,000; actual conservation = 8,000 → capped at 5,000
  // net = 20,000 − 5,000 = 15,000
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 20_000,
        line12_conservation: 8_000,
      }),
    ],
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line6_schedule_f, 15_000);
});

// ── CCC loan / cooperative distribution income ────────────────────────────────

Deno.test("schedule_f: cooperative distributions and CCC loans are included in gross income", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line3b_cooperative_distributions_taxable: 5_000,
        line5a_ccc_loans_election: 3_000,
        line4b_ag_program_payments_taxable: 2_000,
      }),
    ],
  });
  // gross = 0 + 5000 + 3000 + 2000 = 10,000; no expenses → net = 10,000
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line6_schedule_f, 10_000);
});

// ── Livestock resale — net (line 1 − line 2) ─────────────────────────────────

Deno.test("schedule_f: cost basis of livestock resale is subtracted from sales (line 1 - line 2)", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 50_000,
        line2_cost_livestock_resale: 30_000,
      }),
    ],
  });
  // gross from resale = 50k - 30k = 20k; net = 20k
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line6_schedule_f, 20_000);
});

// ── Excess business loss (Form 461) ──────────────────────────────────────────

Deno.test("schedule_f: large loss exceeding EBL threshold single routes to form461", () => {
  // Single filer threshold = $313,000; loss = $400,000 → excess = $87,000
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 0,
        line16_feed: 400_000,
      }),
    ],
    filing_status: "single",
  });
  const ebl = findOutput(result, "form461");
  assertEquals(ebl?.input.excess_business_loss, 87_000);
});

Deno.test("schedule_f: loss below EBL threshold — no form461 output", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 0,
        line16_feed: 100_000,
      }),
    ],
    filing_status: "single",
  });
  const ebl = findOutput(result, "form461");
  assertEquals(ebl, undefined);
});

// ── Output routing completeness ───────────────────────────────────────────────

Deno.test("schedule_f: profit farm has schedule1, schedule_se, form8995 outputs", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 100_000,
        line16_feed: 20_000,
      }),
    ],
  });
  const nodeTypes = result.outputs.map((o) => o.nodeType);
  assertEquals(nodeTypes.includes("schedule1"), true);
  assertEquals(nodeTypes.includes("schedule_se"), true);
  assertEquals(nodeTypes.includes("form8995"), true);
});

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("schedule_f: invalid accounting_method throws", () => {
  assertThrows(() =>
    compute({
      schedule_fs: [
        minimalItem({ accounting_method: "invalid" }),
      ],
    })
  );
});

Deno.test("schedule_f: negative expense throws", () => {
  assertThrows(() =>
    compute({
      schedule_fs: [
        minimalItem({ line16_feed: -100 }),
      ],
    })
  );
});
