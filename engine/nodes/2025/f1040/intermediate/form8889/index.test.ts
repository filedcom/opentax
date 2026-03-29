import { assertEquals, assertThrows } from "@std/assert";
import { form8889 } from "./index.ts";
import { CoverageType } from "./index.ts";

function compute(input: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  return form8889.compute(input as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no contributions, no distributions → no outputs", () => {
  const result = compute({ coverage_type: CoverageType.SelfOnly });
  assertEquals(result.outputs.length, 0);
});

// ─── Part I: Contribution Deduction ──────────────────────────────────────────

Deno.test("part1: self_only personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 3000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 3000);
});

Deno.test("part1: family personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    coverage_type: CoverageType.Family,
    taxpayer_hsa_contributions: 5000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 5000);
});

Deno.test("part1: employer contributions reduce deductible personal amount (self_only limit 4300)", () => {
  // employer contributes 2000, taxpayer contributes 2500 → total 4500 > 4300 limit
  // deductible = min(2500, 4300 - 2000) = min(2500, 2300) = 2300
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 2500,
    employer_hsa_contributions: 2000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 2300);
});

Deno.test("part1: employer covers entire limit → no personal deduction", () => {
  // employer contributes 4300 (full self_only limit), taxpayer 500 → all personal is excess
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 500,
    employer_hsa_contributions: 4300,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined); // no deduction
});

Deno.test("part1: age 55+ catch-up adds $1000 to self_only limit", () => {
  // limit = 4300 + 1000 = 5300; contribute 5300 → fully deductible
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 5300,
    age_55_or_older: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 5300);
});

Deno.test("part1: age 55+ catch-up adds $1000 to family limit", () => {
  // limit = 8550 + 1000 = 9550; contribute 9550 → fully deductible
  const result = compute({
    coverage_type: CoverageType.Family,
    taxpayer_hsa_contributions: 9550,
    age_55_or_older: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 9550);
});

Deno.test("part1: contribution at exact limit → fully deductible, no excess", () => {
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 4300,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 4300);
  const f5329 = findOutput(result, "form5329");
  assertEquals(f5329, undefined);
});

// ─── Part I: Excess Contributions → form5329 ─────────────────────────────────

Deno.test("part1: excess contributions route to form5329 excess_hsa", () => {
  // self_only limit 4300; taxpayer contributes 5000 → excess = 700
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 5000,
  });
  const f5329 = findOutput(result, "form5329");
  assertEquals((f5329!.input as Record<string, unknown>).excess_hsa, 700);
});

Deno.test("part1: combined employer+taxpayer excess routes to form5329", () => {
  // family limit 8550; employer 4000, taxpayer 5000 → total 9000, excess = 450
  const result = compute({
    coverage_type: CoverageType.Family,
    taxpayer_hsa_contributions: 5000,
    employer_hsa_contributions: 4000,
  });
  const f5329 = findOutput(result, "form5329");
  assertEquals((f5329!.input as Record<string, unknown>).excess_hsa, 450);
});

// ─── Part II: Distributions ───────────────────────────────────────────────────

Deno.test("part2: fully qualified distribution → no income, no penalty", () => {
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    hsa_distributions: 2000,
    qualified_medical_expenses: 2000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined);
});

Deno.test("part2: non-qualified distribution → schedule1 line8z_other income", () => {
  // distribute 3000, qualified 1000 → taxable 2000
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    hsa_distributions: 3000,
    qualified_medical_expenses: 1000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line8z_other, 2000);
});

Deno.test("part2: non-qualified distribution → 20% penalty on schedule2 line17b_hsa_penalty", () => {
  // distribute 3000, qualified 1000 → taxable 2000 → penalty 400
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    hsa_distributions: 3000,
    qualified_medical_expenses: 1000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals((s2!.input as Record<string, unknown>).line17b_hsa_penalty, 400);
});

Deno.test("part2: fully non-qualified distribution → income + 20% penalty", () => {
  // distribute 1000, no qualified expenses → taxable 1000 → penalty 200
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    hsa_distributions: 1000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line8z_other, 1000);
  const s2 = findOutput(result, "schedule2");
  assertEquals((s2!.input as Record<string, unknown>).line17b_hsa_penalty, 200);
});

Deno.test("part2: distribution_exception → income still taxable but no 20% penalty", () => {
  // distribute 2000, qualified 500 → taxable 1500; exception → no penalty
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    hsa_distributions: 2000,
    qualified_medical_expenses: 500,
    distribution_exception: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line8z_other, 1500);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined); // no penalty
});

// ─── Combined: contributions + distributions ──────────────────────────────────

Deno.test("combined: deduction + non-qualified distribution both present", () => {
  // self_only, contribute 3000, distribute 1000 non-qualified
  const result = compute({
    coverage_type: CoverageType.SelfOnly,
    taxpayer_hsa_contributions: 3000,
    hsa_distributions: 1000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals((s1!.input as Record<string, unknown>).line13_hsa_deduction, 3000);
  assertEquals((s1!.input as Record<string, unknown>).line8z_other, 1000);
  const s2 = findOutput(result, "schedule2");
  assertEquals((s2!.input as Record<string, unknown>).line17b_hsa_penalty, 200);
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: missing coverage_type throws", () => {
  assertThrows(() => compute({}));
});

Deno.test("validation: negative contributions throw", () => {
  assertThrows(() =>
    compute({
      coverage_type: CoverageType.SelfOnly,
      taxpayer_hsa_contributions: -100,
    })
  );
});

Deno.test("validation: negative distributions throw", () => {
  assertThrows(() =>
    compute({
      coverage_type: CoverageType.SelfOnly,
      hsa_distributions: -500,
    })
  );
});
