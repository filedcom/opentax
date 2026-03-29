import { assertEquals, assertThrows } from "@std/assert";
import { form8606, inputSchema } from "./index.ts";
import { z } from "zod";

type Form8606Input = z.infer<typeof inputSchema>;

function compute(input: Partial<Form8606Input> & Record<string, unknown>) {
  return form8606.compute(input as Form8606Input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Schema validation
// ---------------------------------------------------------------------------

Deno.test("form8606: invalid input (negative year_end_ira_value) throws", () => {
  assertThrows(() =>
    compute({
      nondeductible_contributions: 0,
      year_end_ira_value: -1,
    })
  );
});

Deno.test("form8606: invalid input (negative nondeductible_contributions) throws", () => {
  assertThrows(() =>
    compute({
      nondeductible_contributions: -100,
      year_end_ira_value: 10_000,
    })
  );
});

// ---------------------------------------------------------------------------
// 2. No basis, no contributions — all traditional distributions fully taxable
// ---------------------------------------------------------------------------

Deno.test("form8606: all deductible IRA — full distribution taxable (Part I)", () => {
  // No nondeductible contributions, no prior basis, no Roth
  // traditional_distributions routes to line4b_ira_taxable in full
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 0,
    year_end_ira_value: 0,
    traditional_distributions: 10_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 10_000);
});

// ---------------------------------------------------------------------------
// 3. Nondeductible basis — pro-rata exclusion applies (Part I)
// ---------------------------------------------------------------------------

Deno.test("form8606: nondeductible basis with distribution — pro-rata exclusion", () => {
  // prior_basis = $6,000, no new contributions
  // year_end_value = $44,000, distribution = $10,000
  // denominator = 44,000 + 10,000 = 54,000
  // nontaxable_ratio = 6,000 / 54,000 = 1/9
  // nontaxable_distributions = 10,000 × 1/9 ≈ 1,111.11
  // taxable = 10,000 - 1,111.11 ≈ 8,888.89
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 6_000,
    year_end_ira_value: 44_000,
    traditional_distributions: 10_000,
  });

  const f1040 = findOutput(result, "f1040");
  const taxable = f1040?.fields?.line4b_ira_taxable as number;
  // Allow for floating-point: should be approximately 8888.89
  assertEquals(Math.round(taxable * 100) / 100, Math.round((10_000 - 6_000 / 54_000 * 10_000) * 100) / 100);
});

// ---------------------------------------------------------------------------
// 4. Full basis recovery — zero taxable when basis covers all distributions
// ---------------------------------------------------------------------------

Deno.test("form8606: full basis recovery — zero taxable distributions", () => {
  // basis = $10,000, distribution = $10,000, year_end_value = $0
  // denominator = 0 + 10,000 = 10,000
  // nontaxable_ratio = 10,000 / 10,000 = 1.0 → nontaxable = 10,000
  // taxable = 0 → no f1040 output
  const result = compute({
    nondeductible_contributions: 10_000,
    prior_basis: 0,
    year_end_ira_value: 0,
    traditional_distributions: 10_000,
  });

  const f1040 = findOutput(result, "f1040");
  // Either no f1040 output or line4b_ira_taxable = 0
  const taxable = (f1040?.fields?.line4b_ira_taxable as number) ?? 0;
  assertEquals(taxable, 0);
});

// ---------------------------------------------------------------------------
// 5. Roth conversion with basis — partial exclusion (Part II)
// ---------------------------------------------------------------------------

Deno.test("form8606: Roth conversion with basis — taxable portion computed", () => {
  // prior_basis = $3,000, no distributions, conversion = $10,000
  // year_end_value = $20,000
  // denominator = 20,000 + 0 + 10,000 = 30,000
  // nontaxable_ratio = 3,000 / 30,000 = 0.1
  // nontaxable_conversions = 0.1 × 10,000 = 1,000
  // taxable_conversion = 10,000 - 1,000 = 9,000
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 3_000,
    year_end_ira_value: 20_000,
    roth_conversion: 10_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 9_000);
});

// ---------------------------------------------------------------------------
// 6. Roth conversion — no basis — fully taxable
// ---------------------------------------------------------------------------

Deno.test("form8606: Roth conversion, no basis — fully taxable", () => {
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 0,
    year_end_ira_value: 0,
    roth_conversion: 15_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 15_000);
});

// ---------------------------------------------------------------------------
// 7. Roth distribution — within basis — zero taxable (Part III)
// ---------------------------------------------------------------------------

Deno.test("form8606: Roth distribution within contribution basis — zero taxable", () => {
  // Roth basis = $20,000 in contributions, distribution = $10,000
  // taxable = max(0, 10,000 - 20,000) = 0
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    roth_distribution: 10_000,
    roth_basis_contributions: 20_000,
    roth_basis_conversions: 0,
  });

  const f1040 = findOutput(result, "f1040");
  const taxable = (f1040?.fields?.line4b_ira_taxable as number) ?? 0;
  assertEquals(taxable, 0);
});

// ---------------------------------------------------------------------------
// 8. Roth distribution — exceeds basis — partially taxable (Part III)
// ---------------------------------------------------------------------------

Deno.test("form8606: Roth distribution exceeds basis — earnings taxable", () => {
  // Roth basis (contributions) = $5,000, distribution = $8,000
  // taxable = 8,000 - 5,000 = 3,000
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    roth_distribution: 8_000,
    roth_basis_contributions: 5_000,
    roth_basis_conversions: 0,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 3_000);
});

// ---------------------------------------------------------------------------
// 9. Zero distributions — no output (no f1040 routing)
// ---------------------------------------------------------------------------

Deno.test("form8606: zero distributions with basis — no f1040 output", () => {
  // Has basis from prior contributions, but no distributions this year
  const result = compute({
    nondeductible_contributions: 7_000,
    prior_basis: 5_000,
    year_end_ira_value: 50_000,
  });

  const f1040 = findOutput(result, "f1040");
  // No distributions → no taxable income to report
  assertEquals(f1040, undefined);
});

// ---------------------------------------------------------------------------
// 10. Combined: traditional + Roth conversion in same year (Part I + II)
// ---------------------------------------------------------------------------

Deno.test("form8606: traditional distribution + Roth conversion combined taxable", () => {
  // basis = 4,000; year_end = 16,000; distributions = 2,000; conversion = 2,000
  // denominator = 16,000 + 2,000 + 2,000 = 20,000
  // nontaxable_ratio = 4,000 / 20,000 = 0.2
  // nontaxable_total = 0.2 × (2,000 + 2,000) = 800
  // nontaxable_conversions = 0.2 × 2,000 = 400
  // nontaxable_distributions = 0.2 × 2,000 = 400
  // taxable_traditional = 2,000 - 400 = 1,600
  // taxable_conversion = 2,000 - 400 = 1,600
  // total taxable = 3,200
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 4_000,
    year_end_ira_value: 16_000,
    traditional_distributions: 2_000,
    roth_conversion: 2_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 3_200);
});

// ---------------------------------------------------------------------------
// 11. Output routing smoke test — only routes to f1040
// ---------------------------------------------------------------------------

Deno.test("form8606: only produces f1040 output (correct nodeType routing)", () => {
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 0,
    year_end_ira_value: 0,
    traditional_distributions: 5_000,
  });

  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

// ---------------------------------------------------------------------------
// 12. New nondeductible contributions this year — added to basis for ratio
// ---------------------------------------------------------------------------

Deno.test("form8606: new nondeductible contributions increase total basis for ratio", () => {
  // nondeductible = 7,000 this year; prior_basis = 0
  // distribution = 5,000; year_end = 30,000
  // total_basis = 7,000
  // denominator = 30,000 + 5,000 = 35,000
  // nontaxable_ratio = 7,000 / 35,000 = 0.2
  // nontaxable = 0.2 × 5,000 = 1,000
  // taxable = 5,000 - 1,000 = 4,000
  const result = compute({
    nondeductible_contributions: 7_000,
    prior_basis: 0,
    year_end_ira_value: 30_000,
    traditional_distributions: 5_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 4_000);
});

// ---------------------------------------------------------------------------
// 13. Part III — Roth IRA distribution with conversion basis
// ---------------------------------------------------------------------------

Deno.test("form8606: roth_basis_conversions reduces taxable Roth distribution", () => {
  // Roth distribution $10,000; basis_conversions $4,000; basis_contributions $2,000
  // total Roth basis = 4,000 + 2,000 = 6,000
  // taxable = max(0, 10,000 - 6,000) = 4,000
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    roth_distribution: 10_000,
    roth_basis_contributions: 2_000,
    roth_basis_conversions: 4_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 4_000);
});

Deno.test("form8606: roth_basis_conversions alone covers full Roth distribution — no taxable amount", () => {
  // Roth distribution $5,000; basis_conversions $6,000 → taxable = max(0, 5,000-6,000) = 0
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    roth_distribution: 5_000,
    roth_basis_conversions: 6_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040, undefined);
});

Deno.test("form8606: roth_distribution with no basis is fully taxable (Part III)", () => {
  // Distribution $8,000; no contributions basis, no conversions basis → fully taxable
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    roth_distribution: 8_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 8_000);
});

// ---------------------------------------------------------------------------
// 14. Combined Part I (traditional) + Part III (Roth) in same year
// ---------------------------------------------------------------------------

Deno.test("form8606: combined traditional distribution and Roth distribution both taxable", () => {
  // Part I: prior_basis=0, no contributions, year_end=0, traditional_dist=3,000 → taxable 3,000
  // Part III: roth_distribution=2,000, no basis → taxable 2,000
  // Total line4b = 5,000
  const result = compute({
    nondeductible_contributions: 0,
    year_end_ira_value: 0,
    traditional_distributions: 3_000,
    roth_distribution: 2_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 5_000);
});

Deno.test("form8606: zero-denominator with positive basis and Roth distribution — no divide-by-zero", () => {
  // year_end_ira_value=0, traditional_distributions=0, roth_conversion=0
  // denominator = 0 → nontaxable = 0 (guarded), traditional portion = 0
  // roth_distribution = 3,000, basis_contributions = 1,000 → taxable = 2,000
  const result = compute({
    nondeductible_contributions: 0,
    prior_basis: 5_000,
    year_end_ira_value: 0,
    roth_distribution: 3_000,
    roth_basis_contributions: 1_000,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields?.line4b_ira_taxable, 2_000);
});
