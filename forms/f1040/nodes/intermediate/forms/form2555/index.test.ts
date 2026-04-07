import { assertEquals } from "@std/assert";
import { form2555 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form2555.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke / Empty Input ──────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no qualification — zero days and no bona fide → no output", () => {
  const result = compute({ foreign_wages: 50_000, days_in_foreign_country: 100 });
  assertEquals(result.outputs.length, 0);
});

// ─── Physical Presence Test ───────────────────────────────────────────────────

Deno.test("physical presence — exactly 330 days qualifies", () => {
  const result = compute({ foreign_wages: 50_000, days_in_foreign_country: 330 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 50_000);
});

Deno.test("physical presence — 329 days does not qualify", () => {
  const result = compute({ foreign_wages: 50_000, days_in_foreign_country: 329 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("physical presence — 365 days qualifies", () => {
  const result = compute({ foreign_wages: 80_000, days_in_foreign_country: 365 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 80_000);
});

// ─── Bona Fide Residence Test ─────────────────────────────────────────────────

Deno.test("bona fide resident — qualifies with 0 days", () => {
  const result = compute({ foreign_wages: 40_000, bona_fide_resident: true });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 40_000);
});

Deno.test("bona fide resident = false and 0 days → no output", () => {
  const result = compute({ foreign_wages: 40_000, bona_fide_resident: false });
  assertEquals(result.outputs.length, 0);
});

// ─── FEIE Amount — Limit at $130,000 ─────────────────────────────────────────

Deno.test("FEIE — income below limit: full exclusion", () => {
  const result = compute({
    foreign_wages: 100_000,
    days_in_foreign_country: 365,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 100_000);
});

Deno.test("FEIE — income exactly at $130,000 limit", () => {
  const result = compute({
    foreign_wages: 130_000,
    days_in_foreign_country: 365,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 130_000);
});

Deno.test("FEIE — income above $130,000: capped at $130,000", () => {
  const result = compute({
    foreign_wages: 200_000,
    days_in_foreign_country: 365,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 130_000);
});

// ─── Self-Employment Income ───────────────────────────────────────────────────

Deno.test("SE income — combined wages + SE excluded, capped at $130k", () => {
  const result = compute({
    foreign_wages: 60_000,
    foreign_self_employment_income: 90_000,
    days_in_foreign_country: 365,
  });
  const s1 = findOutput(result, "schedule1");
  // Total $150k, capped at $130k
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 130_000);
});

Deno.test("SE income only — no wages", () => {
  const result = compute({
    foreign_self_employment_income: 50_000,
    days_in_foreign_country: 365,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_earned_income_exclusion, 50_000);
});

// ─── Housing Exclusion ────────────────────────────────────────────────────────

Deno.test("housing — employer exclusion routes to housing deduction field", () => {
  const result = compute({
    foreign_wages: 50_000,
    days_in_foreign_country: 365,
    employer_housing_exclusion: 15_000,
  });
  const outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  const feieOut = outputs.find((o) => "line8d_foreign_earned_income_exclusion" in o.fields);
  const housingOut = outputs.find((o) => "line8d_foreign_housing_deduction" in o.fields);
  assertEquals(feieOut?.fields.line8d_foreign_earned_income_exclusion, 50_000);
  assertEquals(housingOut?.fields.line8d_foreign_housing_deduction, 15_000);
});

Deno.test("housing only — no foreign earned income, employer housing present", () => {
  const result = compute({
    days_in_foreign_country: 365,
    employer_housing_exclusion: 20_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_housing_deduction, 20_000);
});

Deno.test("housing — taxpayer expenses above base: housing_costs=$30k, base=$20,800 → exclusion=$9,200", () => {
  const result = compute({
    days_in_foreign_country: 365,
    foreign_housing_expenses: 30_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line8d_foreign_housing_deduction, 9_200);
});

Deno.test("housing — taxpayer expenses exactly at base: no exclusion", () => {
  const result = compute({
    days_in_foreign_country: 365,
    foreign_housing_expenses: 20_800,
  });
  const housingOutputs = result.outputs.filter(
    (o) => o.nodeType === "schedule1" && "line8d_foreign_housing_deduction" in o.fields,
  );
  assertEquals(housingOutputs.length, 0);
});

Deno.test("housing — taxpayer expenses below base: no exclusion", () => {
  const result = compute({
    days_in_foreign_country: 365,
    foreign_housing_expenses: 10_000,
  });
  const housingOutputs = result.outputs.filter(
    (o) => o.nodeType === "schedule1" && "line8d_foreign_housing_deduction" in o.fields,
  );
  assertEquals(housingOutputs.length, 0);
});

Deno.test("housing — taxpayer expenses combined with employer exclusion", () => {
  // taxpayer excess: 35,000 − 20,800 = 14,200; employer: 5,000; total: 19,200
  const result = compute({
    days_in_foreign_country: 365,
    foreign_housing_expenses: 35_000,
    employer_housing_exclusion: 5_000,
  });
  const outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  const housingOut = outputs.find((o) => "line8d_foreign_housing_deduction" in o.fields);
  assertEquals(housingOut?.fields.line8d_foreign_housing_deduction, 19_200);
});

Deno.test("housing — zero employer exclusion produces no housing output", () => {
  const result = compute({
    foreign_wages: 40_000,
    days_in_foreign_country: 365,
    employer_housing_exclusion: 0,
  });
  const outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  const housingOut = outputs.find((o) => "line8d_foreign_housing_deduction" in o.fields);
  assertEquals(housingOut, undefined);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule1 and agi_aggregator", () => {
  const result = compute({ foreign_wages: 50_000, days_in_foreign_country: 365 });
  const nodeTypes = new Set(result.outputs.map((o) => o.nodeType));
  assertEquals(nodeTypes.has("schedule1"), true);
  assertEquals(nodeTypes.has("agi_aggregator"), true);
});
