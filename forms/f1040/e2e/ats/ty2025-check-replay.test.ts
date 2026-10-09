import { assertEquals } from "@std/assert";
import {
  ATS_REPLAY_TARGETS,
  CheckResult,
  compareAtsTarget,
  PreparationResult,
  replayAtsChecks,
  TargetBasis,
} from "./ty2025-check-replay.ts";
import { TY2025_ATS_CASES } from "./ty2025_cases.ts";

Deno.test("ATS check replay never treats an absent amount as a calculated zero", () => {
  const check = {
    path: "f1040.line24_total_tax",
    expected: 0,
    basis: TargetBasis.Printed,
    sourceLocation: "Form1040 line24",
  };
  assertEquals(compareAtsTarget({}, check).result, CheckResult.NotProduced);
  assertEquals(
    compareAtsTarget({ f1040: { line24_total_tax: 0 } }, check).result,
    CheckResult.Match,
  );
  assertEquals(
    compareAtsTarget({ f1040: { line24_total_tax: 11 } }, check).result,
    CheckResult.Different,
  );
  assertEquals(
    compareAtsTarget({ f1040: { line24_total_tax: false } }, check).result,
    CheckResult.Different,
  );
});

Deno.test("ATS public-entry matrix retains missing prerequisites and printed conflicts across all eight scenarios", async () => {
  const report = await replayAtsChecks();
  assertEquals(
    report.scenarios.map((s) => s.id),
    TY2025_ATS_CASES.filter((s) => s.returnType === "1040").map((s) => s.id),
  );
  assertEquals(new Set(ATS_REPLAY_TARGETS.map((s) => s.id)).size, 8);
  for (const s of report.scenarios) {
    assertEquals(new Set(s.checks.map((c) => c.path)).size, s.checks.length);
  }
  assertEquals(report.denominator, 54);
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!.preparation.result,
    PreparationResult.PartialPrepared,
  );
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!.preparation.documentRoots,
    ["IRS1040", "IRSW2"],
  );
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-01")!.preparation.result,
    PreparationResult.NativeBlocked,
  );
  const scenario2 = report.scenarios.find((s) => s.id === "1040-02")!;
  assertEquals(
    scenario2.diagnostics.some((d) =>
      String(d.message).includes("filing_status")
    ),
    true,
  );
  assertEquals(
    scenario2.checks.every((c) => c.result === CheckResult.NotProduced),
    true,
  );
  const deduction = report.scenarios.find((s) => s.id === "1040-12")!.checks
    .find((c) => c.path === "f1040.line12a_standard_deduction")!;
  assertEquals([deduction.expected, deduction.actual, deduction.result], [
    15000,
    15750,
    CheckResult.Different,
  ]);
  const credit = report.scenarios.find((s) => s.id === "1040-13")!.checks.find((
    c,
  ) => c.path === "schedule3.line6j_alt_fuel_vehicle_refueling")!;
  assertEquals([credit.expected, credit.actual, credit.result], [
    162,
    11,
    CheckResult.Different,
  ]);
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-01")!.checks.map((c) =>
      c.actual
    ),
    [42470, 2713, 474],
  );
});
