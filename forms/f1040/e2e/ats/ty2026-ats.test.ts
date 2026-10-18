import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  RETURN_1040_2026_XSD,
  TY2026_ATS_FIXTURES,
  ty2026ScenarioValues,
} from "./ty2026-ats.ts";
import { xsdAvailable } from "./ats-export.ts";
import { TY2026_ATS_CASES } from "./ty2026_cases.ts";
import {
  SCENARIO_1040_01_TY2026_ASSUMPTIONS,
  SCENARIO_1040_01_TY2026_FACTS,
} from "./ty2026_scenario_1040_01_input.ts";
import { SCENARIO_1040_02_TY2026_ASSUMPTIONS } from "./ty2026_scenario_1040_02_input.ts";
import { SCENARIO_1040_03_TY2026_ASSUMPTIONS } from "./ty2026_scenario_1040_03_input.ts";
import { SCENARIO_1040_04_TY2026_ASSUMPTIONS } from "./ty2026_scenario_1040_04_input.ts";
import { SCENARIO_1040_06_TY2026_ASSUMPTIONS } from "./ty2026_scenario_1040_06_input.ts";
import {
  SCENARIO_1040_12_TY2026_ASSUMPTIONS,
  SCENARIO_1040_12_TY2026_RECONCILIATION,
} from "./ty2026_scenario_1040_12_input.ts";
import {
  SCENARIO_1040_13_TY2026_ASSUMPTIONS,
  SCENARIO_1040_13_TY2026_RECONCILIATION,
} from "./ty2026_scenario_1040_13_input.ts";
import {
  SCENARIO_1040_14_TY2026_ASSUMPTIONS,
  SCENARIO_1040_14_TY2026_RECONCILIATION,
} from "./ty2026_scenario_1040_14_input.ts";

const schema = await xsdAvailable(RETURN_1040_2026_XSD);

test("TY2026 ATS 1040 Scenario 14 exports with 2026 law; differences are documented packet conflicts", async () => {
  const built = await ty2026ScenarioValues("1040-14");
  assertEquals(built?.findings, []);
  if (schema) assertEquals(built?.schemaValid, true);
  const unexplained = built?.values.filter((v) =>
    v.result === "different" || v.result === "not-produced"
  );
  assertEquals(unexplained, []);
  assertEquals(
    built?.values.filter((v) => v.result === "conflict").map((v) => v.line)
      .sort(),
    SCENARIO_1040_14_TY2026_RECONCILIATION.conflicts.map((c) => c.line).sort(),
  );
  // Rev. Proc. 2025-32 §4.06: two children, $7,316 less 21.06% of
  // ($35,025 - $23,890), at the EIC Table row midpoint.
  assertStringIncludes(
    built?.xml ?? "",
    'referenceDocumentName="IRS1040ScheduleEIC">4971</EarnedIncomeCreditAmt>',
  );
  // Schedule 3-A and 1040 lines 11b, 24c, 32b and 32c have no 2026v1.0 element.
  assertEquals(
    built?.values.filter((v) => v.result === "unrepresentable").length,
    12,
  );
});

test("TY2026 ATS 1040 Scenario 1 is refused as printed: Schedule H line 9 contradicts $4,100 of wages", async () => {
  const h = SCENARIO_1040_01_TY2026_FACTS.scheduleH;
  // A year's wages of $4,000 or more put $1,000 or more in some quarter.
  assertEquals(h.line1SocialSecurityWages >= 4 * 1_000, true);
  assertEquals(h.line9QuarterOver1000, false);
  const built = await ty2026ScenarioValues("1040-01");
  assertEquals(built?.xml, null);
  assertStringIncludes(
    built?.findings.join("\n") ?? "",
    "Schedule H FICA-only aggregate employee wages must stay below the FUTA quarter threshold",
  );
});

test("TY2026 ATS 1040 Scenario 5 matches every printed W-2 and Form 8888 value", async () => {
  const built = await ty2026ScenarioValues("1040-05");
  assertEquals(built?.findings, []);
  if (schema) assertEquals(built?.schemaValid, true);
  assertEquals(built?.values.every((v) => v.result === "match"), true);
  assertEquals(built?.values.length, 16);
});

const results = <T extends { result: string }>(
  values: readonly T[] | undefined,
  result: string,
) => values?.filter((v) => v.result === result) ?? [];

test("TY2026 ATS 1040 Scenario 3 files and matches every printed value", async () => {
  const built = await ty2026ScenarioValues("1040-03");
  assertEquals(built?.findings, []);
  if (schema) assertEquals(built?.schemaValid, true);
  assertEquals(built?.values.every((v) => v.result === "match"), true);
  assertEquals(built?.values.length, 36);
});

test("TY2026 ATS 1040 Scenario 2 matches every printed value; only 2026v1.0 rule SA-F1040-018 rejects Schedule A line 8d", async () => {
  const built = await ty2026ScenarioValues("1040-02");
  // P.L. 119-21 §70108 makes mortgage insurance premiums deductible for 2026.
  assertEquals(built?.findings, ["rule SA-F1040-018"]);
  if (schema) assertEquals(built?.schemaValid, true);
  assertEquals(built?.values.every((v) => v.result === "match"), true);
  assertStringIncludes(
    built?.xml ?? "",
    "<MortgageInsurancePremiumsAmt>2316</MortgageInsurancePremiumsAmt>",
  );
});

test("TY2026 ATS 1040 Scenario 4 matches every representable value; 2026v1.0 has no 39% Form 2441 rate and no Schedule 3-A", async () => {
  const built = await ty2026ScenarioValues("1040-04");
  assertEquals(built?.findings, []);
  // IRC §21(a)(2) as amended: 50% less 1 point per $2,000 over $15,000.
  assertStringIncludes(
    built?.xml ?? "",
    "<CareExpensesDecimalAmt>.39</CareExpensesDecimalAmt>",
  );
  if (schema) assertEquals(built?.schemaValid, false);
  assertEquals(results(built?.values, "unrepresentable").length, 3);
  assertEquals(
    built?.values.filter((v) => v.result !== "unrepresentable").every((v) =>
      v.result === "match"
    ),
    true,
  );
});

test("TY2026 ATS 1040 Scenario 6 files W-2 code TT and box 14b; only the Schedule E Part II loss column is not produced", async () => {
  const built = await ty2026ScenarioValues("1040-06");
  assertEquals(built?.findings, []);
  if (schema) assertEquals(built?.schemaValid, true);
  assertStringIncludes(
    built?.xml ?? "",
    "<TreasuryTippedOccupationCd>102</TreasuryTippedOccupationCd>",
  );
  assertEquals(
    results(built?.values, "not-produced").map((v) => v.line),
    ["Schedule E line 28A(i)"],
  );
});

test("TY2026 ATS 1040 Scenarios 12 and 13 export; packet arithmetic errors are documented conflicts", async () => {
  for (
    const [id, reconciliation] of [
      ["1040-12", SCENARIO_1040_12_TY2026_RECONCILIATION],
      ["1040-13", SCENARIO_1040_13_TY2026_RECONCILIATION],
    ] as const
  ) {
    const built = await ty2026ScenarioValues(id);
    assertEquals(built?.findings, []);
    if (schema) assertEquals(built?.schemaValid, true);
    assertEquals(
      results(built?.values, "conflict").map((v) => v.line).sort(),
      reconciliation.conflicts.map((c) => c.line).sort(),
    );
  }
});

test("TY2026 ATS scenarios without a fixture report that, not a refused input", async () => {
  const fixtured = new Set(Object.keys(TY2026_ATS_FIXTURES));
  for (const c of TY2026_ATS_CASES.filter((c) => !fixtured.has(c.id))) {
    assertEquals(await ty2026ScenarioValues(c.id), null);
  }
});

test("TY2026 ATS fixture assumptions stay explicit", () => {
  assertEquals(SCENARIO_1040_01_TY2026_ASSUMPTIONS.map((a) => a.field), [
    "general.taxpayer_dob",
    "general.taxpayer_prior_year_agi",
    "general.ats_test_submission",
    "w2[i].source_document_reference",
    "schedule_h.fica_only_payroll.employee_wages[0]",
    "schedule_h.fica_only_payroll.prior_year_quarter_cash_wages",
    "f5695.part_i_tax_limit",
  ]);
  assertEquals(SCENARIO_1040_14_TY2026_ASSUMPTIONS.length, 9);
  for (
    const assumptions of [
      SCENARIO_1040_02_TY2026_ASSUMPTIONS,
      SCENARIO_1040_03_TY2026_ASSUMPTIONS,
      SCENARIO_1040_04_TY2026_ASSUMPTIONS,
      SCENARIO_1040_06_TY2026_ASSUMPTIONS,
      SCENARIO_1040_12_TY2026_ASSUMPTIONS,
      SCENARIO_1040_13_TY2026_ASSUMPTIONS,
    ]
  ) {
    assertEquals(
      assumptions.every((a) => a.field.length > 0 && a.why.length > 0),
      true,
    );
  }
});
