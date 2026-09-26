import { assertEquals, assertThrows } from "@std/assert";
import { computeAccrualIncome, inputSchema, schedule_f } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_f.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Minimal valid farm item ───────────────────────────────────────────────────

function minimalItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100",
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
  assertEquals(s1?.fields.line6_schedule_f, 40_000);
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
  assertEquals(se?.fields.net_profit_schedule_f, 40_000);
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
  assertEquals(qbi?.fields.qbi_from_schedule_f, 25_000);
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
  assertEquals(s1?.fields.line6_schedule_f, -15_000);
  assertEquals(se, undefined);
});

// ── Small profit below SE threshold ($400) ───────────────────────────────────

Deno.test("schedule_f: profit below $400 SE threshold — no schedule_se output", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 500,
        line16_feed: 200, // profit = 300 < 400
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
  assertEquals(passive?.fields.passive_schedule_f, -10_000);
});

// ── At-risk box 36b + loss ────────────────────────────────────────────────────

Deno.test("schedule_f: at-risk loss is limited before Schedule 1", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 5_000,
        line16_feed: 15_000,
        line36_at_risk: "b",
        at_risk_simplified: {
          opening_adjusted_basis: 4000,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      }),
    ],
  });
  assertEquals(findOutput(result, "schedule1")?.fields.line6_schedule_f, -4000);
  assertEquals(result.carryforwards?.schedule_f_at_risk_suspended_1, 6000);
  assertEquals(findOutput(result, "form6198"), undefined);
});

Deno.test("schedule_f: zero at-risk amount still carries the full farm loss", () => {
  const result = compute({
    schedule_fs: [minimalItem({
      line16_feed: 1000,
      line36_at_risk: "b",
      at_risk_simplified: {
        opening_adjusted_basis: 0,
        current_year_increases: 0,
        line9_decreases_and_exclusions: 0,
      },
    })],
  });
  assertEquals(result.carryforwards?.schedule_f_at_risk_suspended_1, 1000);
  assertEquals(findOutput(result, "schedule1")?.fields.line6_schedule_f, 0);
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
      minimalItem({
        line1_sales_livestock_resale: 40_000,
        line16_feed: 10_000,
      }), // profit 30k
      minimalItem({
        line1_sales_livestock_resale: 20_000,
        line17_fertilizers: 5_000,
      }), // profit 15k
    ],
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line6_schedule_f, 45_000);
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
  assertEquals(s1?.fields.line6_schedule_f, 15_000);
});

// ── CCC loan / cooperative distribution income ────────────────────────────────

Deno.test("schedule_f: cooperative distributions and CCC loans are included in gross income", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line3b_cooperative_distributions_taxable: 5_000,
        line5a_ccc_loans_election: 3_000,
        line5a_ccc_loan_details: [{
          description: "2025 CORN LOAN",
          amount: 3_000,
        }],
        line4b_ag_program_payments_taxable: 2_000,
      }),
    ],
  });
  // gross = 0 + 5000 + 3000 + 2000 = 10,000; no expenses → net = 10,000
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line6_schedule_f, 10_000);
});

Deno.test("schedule_f: raised-product sales and line 5c taxable CCC amount enter gross income", () => {
  const result = compute({
    schedule_fs: [minimalItem({
      line2_sales_products_raised: 7_000,
      line5b_ccc_loans_forfeited: 4_000,
      line5c_ccc_loans_forfeited_taxable: 1_500,
    })],
  });
  assertEquals(findOutput(result, "schedule1")?.fields.line6_schedule_f, 8_500);
});

Deno.test("schedule_f: accrual farm is not calculated using cash-method lines", () => {
  assertThrows(
    () =>
      compute({ schedule_fs: [minimalItem({ accounting_method: "accrual" })] }),
    Error,
    "Part III",
  );
});

Deno.test("schedule_f: accrual Part III flows through inventory, expenses, and Schedule 1", () => {
  const result = compute({
    schedule_fs: [{
      line_a_principal_crop_activity: "GRAIN FARMING",
      line_b_agricultural_activity_code: "111100",
      line_e_material_participation: true,
      accounting_method: "accrual",
      part_iii: {
        line37_sales_products: 20_000,
        line38b_cooperative_distributions_taxable: 1_000,
        line45_beginning_inventory: 5_000,
        line46_products_purchased: 2_000,
        line48_ending_inventory: 3_000,
        inventory_method: "cost",
      },
      line16_feed: 1_500,
    }],
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line6_schedule_f,
    15_500,
  );
});

Deno.test("schedule_f: inventory valuation method determines line 49 sign", () => {
  const base = {
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100",
    line_e_material_participation: true,
    accounting_method: "accrual",
    part_iii: {
      line37_sales_products: 10_000,
      line45_beginning_inventory: 1_000,
      line46_products_purchased: 0,
      line48_ending_inventory: 2_000,
      inventory_method: "unit_livestock_price",
    },
  };
  const result = compute({ schedule_fs: [base] });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line6_schedule_f,
    11_000,
  );
  const special = inputSchema.parse({ schedule_fs: [base] }).schedule_fs[0];
  assertEquals(computeAccrualIncome(special).costOfProductsSold, 1_000);
  const cost = inputSchema.parse({
    schedule_fs: [{
      ...base,
      part_iii: { ...base.part_iii, inventory_method: "cost" },
    }],
  }).schedule_fs[0];
  assertEquals(computeAccrualIncome(cost).costOfProductsSold, -1_000);
  assertThrows(
    () =>
      compute({ schedule_fs: [{ ...base, line1_sales_livestock_resale: 0 }] }),
    Error,
    "cash-method income",
  );
  assertThrows(
    () =>
      compute({
        schedule_fs: [{
          ...base,
          part_iii: {
            ...base.part_iii,
            line37_sales_products: 0,
            line43_other_income: -1,
          },
        }],
      }),
    Error,
    "line 44 cannot be negative",
  );
});

// ── Livestock resale — net (line 1 − line 2) ─────────────────────────────────

Deno.test("schedule_f: line 1b cost basis of livestock resale is subtracted from line 1a sales", () => {
  const result = compute({
    schedule_fs: [
      minimalItem({
        line1_sales_livestock_resale: 50_000,
        line1b_cost_livestock_resale: 30_000,
      }),
    ],
  });
  // gross from resale = 50k - 30k = 20k; net = 20k
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line6_schedule_f, 20_000);
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
  assertEquals(ebl?.fields.excess_business_loss, 87_000);
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
