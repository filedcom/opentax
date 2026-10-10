import { buildAtsCheckLedger } from "./ty2025-check-ledger.ts";
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
  assertEquals(report.denominator, 74);
  const ledger = buildAtsCheckLedger(report);
  assertEquals(ledger.count, 185);
  assertEquals(ledger.byKind, {
    calculation: {
      count: 74,
      counts: { different: 17, match: 51, "not-produced": 6 },
    },
    "document-copy": {
      count: 56,
      counts: { missing: 12, "not-evaluated": 34, present: 10 },
    },
    "binary-attachment": { count: 1, counts: { missing: 1 } },
    "native-value": {
      count: 54,
      counts: {
        different: 6,
        match: 16,
        "missing-field": 2,
        "not-evaluated": 30,
      },
    },
  });
  assertEquals(ledger.calculationAnchor.matching, 46);
  assertEquals(ledger.calculationAnchor.evaluated, 63);
  assertEquals(ledger.calculationAnchor.notProduced, 6);
  assertEquals(ledger.calculationAnchor.provisional, 5);
  assertEquals(ledger.calculationAnchor.percent, 100 * 46 / 63);
  assertEquals(ledger.attachmentRequirementsNotInventoried.length, 7);
  // Distinct W2 copy identities survive; blocked copies are not labeled missing.
  assertEquals(
    ledger.rows.filter((r) => r.id.startsWith("1040-01:document:W-2:")).map((
      r,
    ) => r.result),
    ["not-evaluated", "not-evaluated"],
  );

  const native13 = report.scenarios.find((s) => s.id === "1040-13")!
    .preparation.nativeValueCoverage;
  assertEquals(
    native13.rows.filter((r) => r.result === "different").map((
      r,
    ) => [r.path, r.expected, r.actual]),
    [
      ["f1040.line15_taxable_income", 1620, 120],
      ["f1040.line16_income_tax", 162, 11],
      ["f1040.line20_nonrefundable_credits", 162, 11],
      ["form6251.regular_tax_income", 1620, 120],
      ["form6251.line2a_taxes_paid", 30000, 31500],
      ["form6251.regular_tax", 162, 11],
    ],
  );
  assertEquals(
    native13.rows.filter((r) => r.result === "missing-field")
      .map((r) => r.path),
    ["form6251.amtftc"],
  );
  assertEquals(native13.unmappedTargetPaths, [
    "f1040.line12a_standard_deduction",
    "schedule3.line6j_alt_fuel_vehicle_refueling",
  ]);
  const transfer = report.scenarios.find((s) => s.id === "1040-04")!;
  assertEquals(transfer.preparation.attachments, []);
  assertEquals(transfer.attachmentCoverage.knownRequiredCount, 1);
  assertEquals(transfer.attachmentCoverage.allKnownRequiredPresent, false);
  assertEquals(transfer.attachmentCoverage.rows, [{
    description: "Transfer Election Statement",
    result: "missing",
    observed: [],
  }]);
  for (const scenario of report.scenarios.filter((s) => s.id !== "1040-04")) {
    assertEquals(scenario.attachmentCoverage.requirementsInventoried, false);
    assertEquals(scenario.attachmentCoverage.allKnownRequiredPresent, null);
  }
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
    if (id === "1040-02") {
      assertEquals(
        scenario.checks.every((c) => c.result === CheckResult.Match),
        true,
      );
    }
    assertEquals(scenario.preparation.result, PreparationResult.NativeBlocked);
  }
  assertEquals(report.counts, { match: 51, different: 17, "not-produced": 6 });
  const farm = report.scenarios.find((s) => s.id === "1040-03")!;
  assertEquals(
    farm.checks.filter((c) => c.result !== CheckResult.Match).map(
      (c) => [c.path, c.expected, c.actual, c.result],
    ),
    [
      ["schedule1.line1_state_refund", 3110, null, CheckResult.NotProduced],
      ["f1040.line8_additional_income", 17422, 14312, CheckResult.Different],
      ["f1040.line9_total_income", 72235, 69125, CheckResult.Different],
    ],
  );
  assertEquals(
    transfer.checks.filter((c) => c.result === CheckResult.NotProduced)
      .map((c) => [c.path, c.expected]),
    [
      ["f3800.f8835_credit_entries.0.credit_amount", 13200],
      ["f3800.f8936_new_vehicle_credit.credit_amount", 130],
    ],
  );
  // Preserve every printed AMT target, including stale tax limits and absent
  // zero fields; never substitute the current-law output into the answer key.
  const amt = report.scenarios.find((s) => s.id === "1040-13")!.checks
    .filter((c) => c.path.startsWith("form6251."));
  assertEquals(amt.map((c) => [c.path, c.expected, c.actual, c.result]), [
    ["form6251.regular_tax_income", 1620, 120, CheckResult.Different],
    ["form6251.line2a_taxes_paid", 30000, 31500, CheckResult.Different],
    ["form6251.amti", 31620, 31620, CheckResult.Match],
    ["form6251.exemption", 137000, 137000, CheckResult.Match],
    ["form6251.taxable_excess", 0, 0, CheckResult.Match],
    ["form6251.tentative_tax", 0, 0, CheckResult.Match],
    ["form6251.amtftc", 0, null, CheckResult.NotProduced],
    ["form6251.net_tmt", 0, 0, CheckResult.Match],
    ["form6251.regular_tax", 162, 11, CheckResult.Different],
    ["form6251.line11_amt", 0, 0, CheckResult.Match],
  ]);
  const optedOut = report.scenarios.find((s) => s.id === "1040-05")!.checks
    .find((c) => c.path === "f1040.line28_actc")!;
  assertEquals([optedOut.expected, optedOut.actual, optedOut.result], [
    0,
    null,
    CheckResult.NotProduced,
  ]);
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
