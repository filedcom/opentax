import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8960_2026, form8960_2026 } from "./form8960.ts";
import { niitFixture2026 } from "./form8960.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 NIIT thresholds and filing decision include zero-tax forms above the threshold", () => {
  for (
    const [status, threshold] of [
      [FilingStatus.Single, 200000],
      [FilingStatus.HOH, 200000],
      [FilingStatus.MFS, 125000],
      [FilingStatus.MFJ, 250000],
      [FilingStatus.QSS, 250000],
    ] as const
  ) {
    for (const delta of [0, 1, 92, 10000]) {
      const raw = {
        ...niitFixture2026(),
        filing_status: status,
        ...(status === FilingStatus.MFJ || status === FilingStatus.MFS
          ? { spouse_ssn: "987654321" }
          : {}),
        magi: threshold + delta,
        taking_standard_deduction: true,
        itemized_after_overall_limit: 0,
      };
      const result = calculateForm8960_2026(raw);
      assertEquals(result.file_form8960, delta > 0);
      // $92 * 3.8% = $3.496 -> $3, without first rounding it to $3.50.
      assertEquals(result.tax, Math.round(delta * .038));
    }
  }
  const zero = {
    ...niitFixture2026(),
    investment_sources_2026: undefined,
    taxable_interest_from_agi: 0,
    ordinary_dividends_from_agi: 0,
    capital_gain_from_agi: 0,
    early_withdrawal_penalty_from_agi: 0,
  };
  const result = calculateForm8960_2026(zero);
  assertEquals(result.file_form8960, true);
  assertEquals(result.tax, 0);
  assertEquals(result.lines?.line12_net_investment_income, 0);
});

Deno.test("2026 NIIT reconciles penalties, deductions and its revised Schedule 2 destination", () => {
  const input = niitFixture2026();
  const calculation = calculateForm8960_2026(input);
  assertEquals(calculation.lines?.line8_total_investment_income, 55000);
  assertEquals(calculation.lines?.line9b_state_local_tax, 4444);
  assertEquals(calculation.lines?.line10_additional_modifications, 1000);
  assertEquals(calculation.lines?.line12_net_investment_income, 49556);
  assertEquals(calculation.tax, 1883);
  const output = form8960_2026.compute(
    { taxYear: 2026, formType: "f1040" },
    input,
  ).outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(output?.fields, { line6_niit: 1883 });
});

Deno.test("2026 NIIT refuses stale income, unknown activity and unreconciled itemization", () => {
  const input = niitFixture2026();
  for (
    const key of [
      "taxable_interest_from_agi",
      "ordinary_dividends_from_agi",
      "capital_gain_from_agi",
      "early_withdrawal_penalty_from_agi",
    ] as const
  ) {
    assertThrows(
      () => calculateForm8960_2026({ ...input, [key]: input[key] + 1 }),
      Error,
      "disagree with AGI",
    );
  }
  assertThrows(() =>
    calculateForm8960_2026({
      ...input,
      other_niit_income_pending: true as never,
    })
  );
  assertThrows(() =>
    calculateForm8960_2026({
      ...input,
      foreign_earned_income_exclusion_from_agi: 1 as never,
    })
  );
  assertThrows(
    () => calculateForm8960_2026({ ...input, schedule_a_tax_facts: undefined }),
    Error,
    "Schedule A tax handoff",
  );
  assertThrows(
    () =>
      calculateForm8960_2026({
        ...input,
        tax_residency: "nonresident_or_dual_status",
      }),
    Error,
    "resident",
  );
  assertThrows(
    () =>
      calculateForm8960_2026({
        ...input,
        schedule_a_tax_facts: {
          ...input.schedule_a_tax_facts!,
          allowed_taxes: 50001,
        },
      }),
    Error,
    "tax amounts",
  );
});
