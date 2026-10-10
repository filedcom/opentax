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
  const documents = report.scenarios.map((s) => ({
    id: s.id,
    observed: s.documentCoverage.requiredCopiesObserved,
    required: s.documentCoverage.requiredCopies,
    present: s.documentCoverage.allRequiredCopiesPresent,
  }));
  assertEquals(documents, [
    { id: "1040-01", observed: 0, required: 7, present: false },
    { id: "1040-02", observed: 0, required: 7, present: false },
    { id: "1040-03", observed: 0, required: 9, present: false },
    { id: "1040-04", observed: 2, required: 7, present: false },
    { id: "1040-05", observed: 2, required: 9, present: false },
    { id: "1040-08", observed: 0, required: 3, present: false },
    { id: "1040-12", observed: 0, required: 8, present: false },
    { id: "1040-13", observed: 6, required: 6, present: true },
  ]);
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!
      .documentCoverage.rows.filter((r) => r.missingCopies).map((r) =>
        r.sourceForm
      ),
    ["Schedule 3", "3800", "8835", "8936", "8936 Schedule A"],
  );

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
  for (const id of ["1040-02", "1040-03"]) {
    const scenario = report.scenarios.find((s) => s.id === id)!;
    assertEquals(scenario.diagnostics, []);
    assertEquals(
      scenario.checks.every((c) => c.result === CheckResult.Match),
      true,
    );
    assertEquals(scenario.preparation.result, PreparationResult.NativeBlocked);
  }
  assertEquals(report.counts, { match: 41, different: 12, "not-produced": 1 });
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
