import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../core/validation/context.ts";
import { evaluateRules } from "../../../core/validation/engine.ts";
import { FilingStatus } from "../nodes/types.ts";
import { assembleReturn2026 } from "./assembly.ts";
import {
  CALCULATION_FIELD_REGISTRY_2026,
  CALCULATION_RULES_2026,
} from "./validation.ts";

function report(pending: Readonly<Record<string, Record<string, unknown>>>) {
  return evaluateRules(
    CALCULATION_RULES_2026,
    createReturnContext(pending, {
      primarySSN: "111223333",
      filingStatus: 1,
    }, CALCULATION_FIELD_REGISTRY_2026),
  );
}

const finalizedWages = {
  filing_status: FilingStatus.Single,
  line1a_wages: 150_000,
  line9_total_income: 150_000,
  deduction_method: "standard" as const,
  standard_deduction: 16_100,
  line16_income_tax: 24_734,
  line25a_w2_withheld: 30_000,
};

Deno.test("2026 assembly reconciles the finalized wage graph and detects broken totals", () => {
  const result = assembleReturn2026(finalizedWages);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line35a_refund, 5_266);
  assertEquals(report(result.pending).entries, []);
  for (
    const [key, value, rule] of [
      ["line25d_total_withholding", 1, "05"],
      ["line15_taxable_income", undefined, "11"],
      ["line33_total_payments", NaN, "11"],
      ["line11a_agi", 150_000.25, "11"],
      ["line9_total_income", 149_999, "12"],
      ["line22_tax_after_credits", 1, "13"],
      ["line35a_refund", 5_265, "14"],
    ] as const
  ) {
    const broken = {
      ...result.pending,
      f1040: { ...result.pending.f1040, [key]: value },
    };
    assertEquals(
      report(broken).entries.some((entry) =>
        entry.ruleNumber === `F1040-2026-LOCAL-${rule}`
      ),
      true,
      key,
    );
  }
  assertEquals(
    report({ f1040: {} }).entries.some((entry) =>
      entry.ruleNumber === "F1040-2026-LOCAL-11"
    ),
    true,
  );
});

Deno.test("2026 assembly requires Schedule 3-A even when its disallowed benefit is zero", () => {
  for (
    const [wants, eligible, reduction] of [
      [true, true, 0],
      [true, false, 500],
      [false, undefined, 500],
    ] as const
  ) {
    const result = assembleReturn2026({
      ...finalizedWages,
      line16_income_tax: 500,
      line27a_eic: 1_000,
      wants_federal_public_benefit: wants,
      eligible_for_federal_public_benefit: eligible,
    });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.f1040.line32b_public_benefit_reduction,
      reduction,
    );
    assertEquals(report(result.pending).entries, []);
    const { schedule3a: _omitted, ...missingAttachment } = result.pending;
    assertEquals(
      report(missingAttachment).entries.some((entry) =>
        entry.ruleNumber === "F1040-2026-LOCAL-14"
      ),
      true,
    );
    assertEquals(
      report({
        ...result.pending,
        schedule3a: { ...result.pending.schedule3a, line5_tax_offset: 1 },
      }).entries.some((entry) => entry.ruleNumber === "F1040-2026-LOCAL-14"),
      true,
    );
  }
});

Deno.test("2026 Schedule 3-A stops before election questions when credits do not exceed tax", () => {
  const result = assembleReturn2026({
    ...finalizedWages,
    line27a_eic: 1_000,
    wants_federal_public_benefit: true,
    eligible_for_federal_public_benefit: true,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule3a.line6_federal_public_benefit, 0);
  assertEquals(result.pending.schedule3a.line7_wants_benefit, undefined);
  assertEquals(result.pending.schedule3a.line8_eligible, undefined);
  assertEquals(report(result.pending).entries, []);
});
