import { test } from "bun:test";
import { atsSourceReconciliation } from "./ty2025-source-reconciliation.ts";
import { buildAtsCheckLedger } from "./ty2025-check-ledger.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  ATS_REPLAY_TARGETS,
  CheckResult,
  compareAtsTarget,
  PreparationResult,
  replayAtsChecks,
  TargetBasis,
} from "./ty2025-check-replay.ts";
import { TY2025_ATS_CASES } from "./ty2025_cases.ts";

test("ATS check replay never treats an absent amount as a calculated zero", () => {
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

test("ATS public-entry matrix retains missing prerequisites and printed conflicts across all eight scenarios", async () => {
  const report = await replayAtsChecks();
  assertEquals(
    report.scenarios.map((s) => s.id),
    TY2025_ATS_CASES.filter((s) => s.returnType === "1040").map((s) => s.id),
  );
  assertEquals(new Set(ATS_REPLAY_TARGETS.map((s) => s.id)).size, 8);
  for (const s of report.scenarios) {
    assertEquals(new Set(s.checks.map((c) => c.path)).size, s.checks.length);
  }
  assertEquals(report.denominator, 90);
  const ledger = buildAtsCheckLedger(report);
  assertEquals(ledger.count, 343);
  assertEquals(ledger.sourceReconciliations.length, 8);
  for (const entry of ledger.sourceReconciliations) {
    const scenario = report.scenarios.find((s) => s.id === entry.scenario)!;
    assertEquals(entry.sourceUrl, scenario.sourceUrl);
    assertEquals(entry.notes, scenario.sourceReconciliation.notes);
    assertEquals(entry.notes.length > 0, true);
    assertEquals(entry.completeRequirementsInventoried, false);
    assertEquals(entry.preparationResult, scenario.preparation.result);
    assertEquals(entry.firstPreparationReason, scenario.preparation.reason);
  }
  // Partial preparation must retain unresolved credits and answer-key conflicts.
  assertEquals(
    ledger.sourceReconciliations.filter((s) =>
      s.preparationResult === PreparationResult.PartialPrepared
    ).map((s) => s.scenario),
    ["1040-03", "1040-04", "1040-05", "1040-08", "1040-12", "1040-13"],
  );
  const retirement = ledger.sourceReconciliations.find((s) =>
    s.scenario === "1040-08"
  )!;
  assertEquals(
    retirement.preparationResult,
    PreparationResult.PartialPrepared,
  );
  assertEquals(retirement.notes.some((n) => n.includes("QCD")), true);
  assertEquals(retirement.notes.some((n) => n.includes("1099-DIV")), true);
  // Notes describe missing evidence; adding them never adds pass/fail rows.
  assertEquals(ledger.byKind, {
    calculation: {
      count: 90,
      counts: { different: 19, match: 69, "not-produced": 2 },
    },
    "document-copy": {
      count: 56,
      counts: { "not-evaluated": 14, present: 42 },
    },
    "binary-attachment": {
      count: 2,
      counts: { "not-evaluated": 1, "present-in-verified-manifest": 1 },
    },
    "native-retirement-value": {
      count: 30,
      counts: { match: 30 },
    },
    "native-w2-value": {
      count: 80,
      counts: { match: 40, "not-evaluated": 40 },
    },
    "native-value": {
      count: 85,
      counts: {
        different: 17,
        match: 60,
        "missing-field": 2,
        "not-evaluated": 6,
      },
    },
  });
  assertEquals(ledger.calculationAnchor.matching, 64);
  assertEquals(ledger.calculationAnchor.evaluated, 83);
  assertEquals(ledger.calculationAnchor.notProduced, 2);
  assertEquals(ledger.calculationAnchor.provisional, 5);
  assertEquals(ledger.calculationAnchor.percent, 100 * 64 / 83);
  assertEquals(ledger.attachmentRequirementsNotInventoried.length, 0);
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
      ["f1040.line14_deductions_qbi_total", 30000, 31500],
      ["f1040.line18_total_tax_before_credits", 162, 11],
      ["f1040.line21_credits_total", 162, 11],
      ["f1040.line15_taxable_income", 1620, 120],
      ["f1040.line16_income_tax", 162, 11],
      ["f1040.line20_nonrefundable_credits", 162, 11],
      ["form6251.regular_tax_income", 1620, 120],
      ["form6251.line2a_taxes_paid", 30000, 31500],
      ["form6251.regular_tax", 162, 11],
      ["schedule3.line6j_alt_fuel_vehicle_refueling", 162, 11],
    ],
  );
  assertEquals(
    native13.rows.filter((r) => r.result === "missing-field")
      .map((r) => r.path),
    ["form6251.amtftc"],
  );
  assertEquals(native13.unmappedTargetPaths, [
    "f1040.line12a_standard_deduction",
  ]);
  // Scenario 12 differences are its documented 15,000 deduction and omitted
  // Form 8995 answer-key conflicts.
  const native12 = report.scenarios.find((s) => s.id === "1040-12")!
    .preparation.nativeValueCoverage;
  assertEquals(
    native12.rows.filter((r) => r.result === "different").map((
      r,
    ) => [r.path, r.expected, r.actual]),
    [
      ["f1040.line14_deductions_qbi_total", 15000, 20072],
      ["f1040.line18_total_tax_before_credits", 18634, 17436],
      ["f1040.line22_tax_after_credits", 18634, 17436],
      ["f1040.line15_taxable_income", 107445, 102373],
      ["f1040.line16_income_tax", 18634, 17436],
      ["f1040.line24_total_tax", 22072, 20874],
      ["f1040.line37_amount_owed", 7628, 6430],
    ],
  );
  const transfer = report.scenarios.find((s) => s.id === "1040-04")!;
  const statement = {
    description: "Transfer Election Statement",
    fileName: "Transfer Election Statement.pdf",
    byteLength: 792,
    sha256: "5dd494c2ff29f13af108af76f27e6e2c3936b0ff5de009ed38b2abb080f5f523",
  };
  assertEquals(transfer.preparation.attachments, [statement]);
  assertEquals(transfer.attachmentCoverage.knownRequiredCount, 1);
  assertEquals(transfer.attachmentCoverage.allKnownRequiredPresent, true);
  assertEquals(transfer.attachmentCoverage.rows, [{
    description: "Transfer Election Statement",
    result: "present-in-verified-manifest",
    observed: [statement],
  }]);
  for (const scenario of report.scenarios) {
    const coverage = scenario.attachmentCoverage;
    assertEquals(coverage.requirementsInventoried, true);
    assertEquals(coverage.completeRequirementsInventoried, false);
    assertEquals(coverage.coverSheetReview?.page, 1);
    assertEquals(
      /^[a-f0-9]{64}$/.test(coverage.coverSheetReview!.sourceSha256),
      true,
    );
    if (
      !["1040-03", "1040-04", "1040-05", "1040-08", "1040-12", "1040-13"].includes(
        scenario.id,
      )
    ) {
      assertEquals(coverage.allKnownRequiredPresent, null);
    }
  }
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-02")!.attachmentCoverage.rows,
    [{
      description: "Nonresident Spouse Choice Statement",
      result: "not-evaluated",
      observed: null,
    }],
  );
  const documents = report.scenarios.map((s) => ({
    id: s.id,
    observed: s.documentCoverage.requiredCopiesObserved,
    required: s.documentCoverage.requiredCopies,
    present: s.documentCoverage.allRequiredCopiesPresent,
  }));
  assertEquals(documents, [
    { id: "1040-01", observed: 0, required: 7, present: false },
    { id: "1040-02", observed: 0, required: 7, present: false },
    { id: "1040-03", observed: 9, required: 9, present: true },
    { id: "1040-04", observed: 7, required: 7, present: true },
    { id: "1040-05", observed: 9, required: 9, present: true },
    { id: "1040-08", observed: 3, required: 3, present: true },
    { id: "1040-12", observed: 8, required: 8, present: true },
    { id: "1040-13", observed: 6, required: 6, present: true },
  ]);
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!
      .documentCoverage.rows.filter((r) => r.missingCopies).map((r) =>
        r.sourceForm
      ),
    [],
  );

  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!.preparation.result,
    PreparationResult.PartialPrepared,
  );
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-04")!.preparation.documentRoots,
    [
      "IRS1040",
      "IRS1040Schedule3",
      "IRS3800",
      "IRS6251",
      "IRS8835",
      "IRS8936",
      "IRS8936ScheduleA",
      "IRSW2",
      "BinaryAttachment",
    ],
  );
  assertEquals(
    report.scenarios.find((s) => s.id === "1040-01")!.preparation.result,
    PreparationResult.NativeBlocked,
  );
  const singleWage = report.scenarios.find((s) => s.id === "1040-02")!;
  assertEquals(singleWage.diagnostics, []);
  assertEquals(
    singleWage.checks.every((c) => c.result === CheckResult.Match),
    true,
  );
  assertEquals(
    singleWage.preparation.result,
    PreparationResult.NativeBlocked,
  );
  assertEquals(report.counts, { match: 69, different: 19, "not-produced": 2 });
  for (const id of ["1040-03", "1040-08"]) {
    const scenario = report.scenarios.find((s) => s.id === id)!;
    assertEquals(scenario.diagnostics, []);
    assertEquals(
      scenario.checks.every((c) => c.result === CheckResult.Match),
      true,
    );
  }
  assertEquals(
    transfer.checks.map((c) => [c.path, c.expected, c.result]),
    [
      ["f1040.line1a_wages", 36014, CheckResult.Match],
      ["f1040.line25a_w2_withheld", 4581, CheckResult.Match],
      [
        "f3800.f8835_credit_entries.0.transfer_in_amount",
        13200,
        CheckResult.Match,
      ],
      [
        "f3800.f8936_new_vehicle_credit.credit_amount",
        130,
        CheckResult.Match,
      ],
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

test("ATS reconciliation requires a reviewed scenario and protects retained notes from report mutation", () => {
  assertThrows(
    () => atsSourceReconciliation("1040-99"),
    Error,
    "Missing ATS source reconciliation",
  );
  const first = atsSourceReconciliation("1040-01");
  const expected = [...first.notes];
  first.notes.splice(0, first.notes.length, "Cleared by caller");
  assertEquals(atsSourceReconciliation("1040-01").notes, expected);
});
