import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import type { z } from "zod";
import { sep_retirement, PlanType, itemSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";

function minimalItem(overrides: Partial<z.infer<typeof itemSchema>> = {}) {
  return {
    plan_type: PlanType.SEP,
    ...(overrides.plan_type === PlanType.SOLO_401K
      ? { net_self_employment_compensation: 500_000 }
      : {}),
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return sep_retirement.compute({ taxYear: 2025, formType: "f1040" }, { sep_retirements: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: { nodeType: string }) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

test("sep_retirement.inputSchema: empty array fails (min 1)", () => {
  const parsed = sep_retirement.inputSchema.safeParse({ sep_retirements: [] });
  assertEquals(parsed.success, false);
});

test("sep_retirement.inputSchema: invalid plan_type fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: "INVALID_PLAN" }],
  });
  assertEquals(parsed.success, false);
});

test("sep_retirement.inputSchema: negative sep_contribution fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SEP, sep_contribution: -100 }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. SEP-IRA Routing and Calculation
// =============================================================================

test("sep_retirement.compute: SEP contribution within 25% limit routes to schedule1 line16", () => {
  // 25% of 100000 = 25000; contribution 20000 < 25000 → passes through unchanged
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 20000,
    net_self_employment_compensation: 100000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

test("sep_retirement.compute: SEP contribution capped at 25% of net SE compensation", () => {
  // 25% of 80000 = 20000; contribution 30000 exceeds limit → capped at 20000
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 30000,
    net_self_employment_compensation: 80000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

test("sep_retirement.compute: SEP contribution capped at $70,000 annual limit", () => {
  // 25% of 400000 = 100000 — hard cap at 70000 applies
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 80000,
    net_self_employment_compensation: 400000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 70000);
});

test("sep_retirement.compute: SEP contribution exactly at 25% boundary passes through unchanged", () => {
  // 25% of 80000 = 20000; contribution = 20000 exactly
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 20000,
    net_self_employment_compensation: 80000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

test("sep_retirement.compute: SEP contribution without SE compensation — only $70,000 cap applies", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 50000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 50000);
});

test("sep_retirement.compute: SEP no contribution supplies zero Form 7206 source", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    net_self_employment_compensation: 100000,
  })]);
  assertEquals(result.outputs.map((entry) => entry.nodeType), ["form7206"]);
  assertEquals(findOutput(result, "form7206")?.fields.schedule1_line16_source, 0);
});

test("sep_retirement.compute: SEP zero contribution supplies zero Form 7206 source", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 0,
    net_self_employment_compensation: 100000,
  })]);
  assertEquals(result.outputs.map((entry) => entry.nodeType), ["form7206"]);
  assertEquals(findOutput(result, "form7206")?.fields.schedule1_line16_source, 0);
});

// =============================================================================
// 3. SIMPLE IRA Routing and Calculation
// =============================================================================

test("sep_retirement.compute: SIMPLE employee + employer contributions summed to schedule1", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 10000,
    simple_employer_contribution: 3000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 13000);
});

test("sep_retirement.compute: SIMPLE employee contribution capped at $16,500 when under age 50", () => {
  // Employee 20000 capped at 16500; employer 2000 → total 18500
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 20000,
    simple_employer_contribution: 2000,
    age_50_or_over: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 18500);
});

test("sep_retirement.compute: SIMPLE employee catch-up limit $20,000 when age 50+", () => {
  // TY2025: age 50+ cap = 20000 (16500 + 3500 catch-up per Rev Proc 2024-40)
  // employee 21000 capped at 20000; employer 1000 → total 21000
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 21000,
    simple_employer_contribution: 1000,
    age_50_or_over: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 21000);
});

test("sep_retirement.compute: SIMPLE age_50_or_over omitted — uses under-50 limit of $16,500", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 18000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16500);
});

test("sep_retirement.compute: SIMPLE employee exactly at $16,500 limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 16500,
    age_50_or_over: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16500);
});

test("sep_retirement.compute: SIMPLE employee exactly at $19,500 age-50+ limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 19500,
    age_50_or_over: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 19500);
});

test("sep_retirement.compute: SIMPLE with only employer contribution routes correctly", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employer_contribution: 5000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 5000);
});

test("sep_retirement.compute: SIMPLE zero contributions supply zero Form 7206 source", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 0,
    simple_employer_contribution: 0,
  })]);
  assertEquals(result.outputs.map((entry) => entry.nodeType), ["form7206"]);
  assertEquals(findOutput(result, "form7206")?.fields.schedule1_line16_source, 0);
});

// =============================================================================
// 4. Solo 401(k) Routing and Calculation
// =============================================================================

test("sep_retirement.compute: Solo 401k employee + employer contributions route to schedule1", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 20000,
    solo401k_employer_contribution: 10000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 30000);
});

test("sep_retirement.compute: Solo 401k rejects an excessive actual employee deferral", () => {
  assertThrows(() => compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 30000,
    solo401k_employer_contribution: 5000,
  })]), Error, "employee deferral exceeds");
});

test("sep_retirement.compute: Solo 401k rejects actual contributions above the annual limit", () => {
  assertThrows(() => compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
    solo401k_employer_contribution: 50000,
  })]), Error, "employer contribution exceeds");
});

test("sep_retirement.compute: Solo 401k exactly at $70,000 combined — passes through unchanged", () => {
  // employee 23500 + employer 46500 = 70000 exactly (at the combined cap)
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
    solo401k_employer_contribution: 46500,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 70000);
});

test("sep_retirement.compute: Solo 401k with only employee deferral", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 15000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 15000);
});

test("sep_retirement.compute: Solo 401k exactly at $23,500 employee limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 23500);
});

test("sep_retirement.compute: Solo 401k zero contributions supply zero Form 7206 source", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 0,
    solo401k_employer_contribution: 0,
  })]);
  assertEquals(result.outputs.map((entry) => entry.nodeType), ["form7206"]);
  assertEquals(findOutput(result, "form7206")?.fields.schedule1_line16_source, 0);
});

// =============================================================================
// 5. Aggregation — Multiple Plans
// =============================================================================

test("sep_retirement.compute: SEP + SIMPLE in same call — deductions summed to single schedule1 output", () => {
  const result = compute([
    minimalItem({ plan_type: PlanType.SEP, sep_contribution: 10000, net_self_employment_compensation: 100000 }),
    minimalItem({ plan_type: PlanType.SIMPLE, simple_employee_contribution: 5000, simple_employer_contribution: 1000 }),
  ]);
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16000);
});

test("sep_retirement.compute: rejects ambiguous SEP plus Solo 401k owner/plan coordination", () => {
  assertThrows(() => compute([
    minimalItem({ plan_type: PlanType.SEP, sep_contribution: 10000 }),
    minimalItem({ plan_type: PlanType.SOLO_401K, solo401k_employee_deferral: 5000 }),
  ]), Error, "one proprietor plan");
});

// =============================================================================
// 6. AGI Aggregator Routing (above-the-line deduction must reduce AGI)
// =============================================================================

test("sep_retirement.compute: SEP deduction routes to agi_aggregator with same amount as schedule1", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 15000,
    net_self_employment_compensation: 100000,
  })]);
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(s1Fields.line16_sep_simple, 15000);
  assertEquals(agiFields.line16_sep_simple, 15000);
});

test("sep_retirement.compute: SIMPLE agi_aggregator output matches schedule1 output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 10000,
    simple_employer_contribution: 2000,
  })]);
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(s1Fields.line16_sep_simple, agiFields.line16_sep_simple);
});

test("sep_retirement.compute: zero deduction — no agi_aggregator output", () => {
  const result = compute([minimalItem({ plan_type: PlanType.SEP })]);
  const out = result.outputs.find((o: { nodeType: string }) => o.nodeType === "agi_aggregator");
  assertEquals(out, undefined);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

test("sep_retirement.compute: throws on negative simple_employer_contribution", () => {
  assertThrows(() => compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employer_contribution: -100,
  })]), Error);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

test("sep_retirement.compute: rejects multiple unspecified plans containing a Solo 401k", () => {
  assertThrows(() => compute([
    minimalItem({ plan_type: PlanType.SEP, sep_contribution: 45000, net_self_employment_compensation: 200000 }),
    minimalItem({ plan_type: PlanType.SIMPLE, simple_employee_contribution: 16500, simple_employer_contribution: 4000 }),
    minimalItem({ plan_type: PlanType.SOLO_401K, solo401k_employee_deferral: 23500, solo401k_employer_contribution: 20000 }),
  ]), Error, "one proprietor plan");
});

test("routes the deduction to form8995 as retirement_plan_deduction", () => {
  // i8995, Determining Your Qualified Business Income: the items attributable to the
  // trade or business include "contributions to qualified retirement plans".
  const result = compute([minimalItem({
    net_self_employment_compensation: 100_000,
    sep_contribution: 10_000,
  })]);
  const qbi = result.outputs.find((o) => o.nodeType === "form8995");
  assertEquals(qbi?.fields.retirement_plan_deduction, 10_000);
});

test("TY2026 SIMPLE deferral for age 60-63 is capped at $22,250 (Notice 2025-67)", () => {
  const result = sep_retirement.compute({ taxYear: 2026, formType: "f1040" }, {
    sep_retirements: [{
      plan_type: PlanType.SIMPLE,
      simple_employee_contribution: 25_000,
      simple_employer_contribution: 1_000,
      age_60_to_63: true,
    }],
  });
  const schedule1 = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(schedule1?.fields.line16_sep_simple, 23_250);
});

test("TY2026 solo 401(k) rejects deferrals above $24,500 (Notice 2025-67)", () => {
  assertThrows(() => sep_retirement.compute({ taxYear: 2026, formType: "f1040" }, {
    sep_retirements: [{
      plan_type: PlanType.SOLO_401K,
      net_self_employment_compensation: 500_000,
      solo401k_employee_deferral: 30_000,
    }],
  }), Error, "employee deferral exceeds");
});

// IRS Pub. 560 chapter 5, Deduction Worksheet steps 3-15 and the 25%/20%
// reduced rate table. Independently chosen synthetic sole-proprietor fixtures;
// inputs are adjusted net profit BEFORE the owner's contributions.
function computeSolo2026(overrides: Partial<z.infer<typeof itemSchema>>) {
  return sep_retirement.compute({ taxYear: 2026, formType: "f1040" }, {
    sep_retirements: [{
      plan_type: PlanType.SOLO_401K,
      net_self_employment_compensation: 125_000,
      ...overrides,
    }],
  });
}

test("ordinary employee and employer contributions route to all deduction outputs", () => {
  const result = computeSolo2026({
    solo401k_employee_deferral: 6_000,
    solo401k_employer_contribution: 14_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 20_000);
  assertEquals(fieldsOf(result.outputs, agi_aggregator)!.line16_sep_simple, 20_000);
  assertEquals(findOutput(result, "form8995")?.fields.retirement_plan_deduction, 20_000);
});

test("rejects an excessive employer-only contribution instead of deducting excess", () => {
  assertThrows(() => computeSolo2026({
    solo401k_employer_contribution: 35_000,
  }), Error, "$25000.00");
});

test("employer-only contribution at the 20% adjusted-earnings boundary is allowed", () => {
  const result = computeSolo2026({ solo401k_employer_contribution: 25_000 });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 25_000);
  assertThrows(() => computeSolo2026({
    solo401k_employer_contribution: 25_000.01,
  }), Error, "employer contribution exceeds");
});

test("positive solo contribution requires the proprietor's adjusted earnings", () => {
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: undefined,
    solo401k_employee_deferral: 6_000,
  }), Error, "net_self_employment_compensation");
});

test("zero earnings cannot support employer or employee contributions", () => {
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: 0,
    solo401k_employee_deferral: 1,
  }), Error, "employee deferral exceeds");
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: 0,
    solo401k_employer_contribution: 1,
  }), Error, "employer contribution exceeds");
});

test("low earnings: worksheet step 12 reduces employer room after elective deferrals", () => {
  const result = computeSolo2026({
    net_self_employment_compensation: 20_000,
    solo401k_employee_deferral: 15_000,
    solo401k_employer_contribution: 2_500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 17_500);
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: 20_000,
    solo401k_employee_deferral: 15_000,
    solo401k_employer_contribution: 4_000,
  }), Error, "$2500.00");
});

test("annual additions boundary uses the correct year's $72,000 limit", () => {
  const result = computeSolo2026({
    net_self_employment_compensation: 500_000,
    solo401k_employee_deferral: 24_500,
    solo401k_employer_contribution: 47_500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 72_000);
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: 500_000,
    solo401k_employee_deferral: 24_500,
    solo401k_employer_contribution: 47_501,
  }), Error, "$47500.00");
});

test("same proprietor's other-plan deferrals reduce remaining elective capacity", () => {
  const result = computeSolo2026({
    other_plan_employee_deferrals: 10_000,
    solo401k_employee_deferral: 14_500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 14_500);
  assertThrows(() => computeSolo2026({
    other_plan_employee_deferrals: 10_000,
    solo401k_employee_deferral: 14_501,
  }), Error, "$14500.00");
});

test("age-50 eligibility permits ordinary base-limit contributions", () => {
  const result = computeSolo2026({
    net_self_employment_compensation: 500_000,
    age_50_or_over: true,
    solo401k_employee_deferral: 24_500,
    solo401k_employer_contribution: 47_500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 72_000);
});

test("age-60-to-63 eligibility permits ordinary employer-only contributions", () => {
  const result = computeSolo2026({
    age_60_to_63: true,
    solo401k_employer_contribution: 25_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 25_000);
});

test("older proprietor's other-plan deferrals still reduce ordinary capacity", () => {
  const result = computeSolo2026({
    age_50_or_over: true,
    age_60_to_63: true,
    other_plan_employee_deferrals: 10_000,
    solo401k_employee_deferral: 14_500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line16_sep_simple, 14_500);
});

test("actual age-50 catch-up deferrals require a reviewed worksheet", () => {
  assertThrows(() => computeSolo2026({
    age_50_or_over: true,
    solo401k_employee_deferral: 25_000,
  }), Error, "catch-up elective deferrals");
});

test("combined other-plan and solo catch-up deferrals require a reviewed worksheet", () => {
  assertThrows(() => computeSolo2026({
    age_60_to_63: true,
    other_plan_employee_deferrals: 10_000,
    solo401k_employee_deferral: 15_000,
  }), Error, "catch-up elective deferrals");
});

test("older proprietor's ordinary contributions retain earnings and annual-additions guards", () => {
  assertThrows(() => computeSolo2026({
    age_50_or_over: true,
    net_self_employment_compensation: 5_000,
    solo401k_employee_deferral: 6_000,
  }), Error, "employee deferral exceeds");
  assertThrows(() => computeSolo2026({
    age_60_to_63: true,
    solo401k_employer_contribution: 25_001,
  }), Error, "employer contribution exceeds");
  assertThrows(() => computeSolo2026({
    net_self_employment_compensation: 500_000,
    age_50_or_over: true,
    solo401k_employee_deferral: 24_500,
    solo401k_employer_contribution: 47_501,
  }), Error, "$47500.00");
});
