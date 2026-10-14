import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { bonusFilerFixture } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import {
  section179HealthCases,
  section179HealthInput,
} from "./section179-health.fixture.ts";

Deno.test("Section 179, source health months, SE, QBI and credit settle through complete returns", async () => {
  for (const scenario of section179HealthCases) {
    const input = section179HealthInput(scenario);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.form7206.line14, scenario.health);
    assertEquals(
      result.pending.schedule1.line17_se_health_insurance ?? 0,
      scenario.health,
    );
    assertEquals(result.pending.schedule1.line15_se_deduction, 707);
    assertEquals(result.pending.f1040.line13_qbi_deduction ?? 0, scenario.qbi);
    assertEquals(result.pending.f1040.line24_total_tax, scenario.tax);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      bonusFilerFixture.filer,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<Section179ExpenseDeductionAmt>${
        scenario.id === "179-health-active-income-limit" ? 20000 : 2000
      }</Section179ExpenseDeductionAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<SelfEmploymentTaxAmt>1413</SelfEmploymentTaxAmt>",
    );
    assertEquals(
      prepared.bundle.xml.includes("<IRS7206 "),
      scenario.health > 0,
    );
    if (scenario.health > 0) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<SelfEmpldHealthInsDedAmt>${scenario.health}</SelfEmpldHealthInsDedAmt>`,
      );
    }
    if (scenario.id === "179-health-active-income-limit") {
      assertStringIncludes(
        prepared.bundle.xml,
        "<BusinessIncomeLimitationAmt>70707</BusinessIncomeLimitationAmt>",
      );
    }
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Section 179 health integration rejects contradictory active income, premium and ownership facts", async () => {
  const input = section179HealthInput(section179HealthCases[0]);
  const unadjusted = structuredClone(input);
  unadjusted.form4562.current_year_inventory.section179_election
    .taxpayer_active_business_income = 62000;
  await assertRejects(
    () =>
      f1040_2025.prepareReturn(
        f1040_2025.executeReturn(unadjusted).pending,
        bonusFilerFixture.filer,
      ),
    Error,
    "active income",
  );
  const result = f1040_2025.executeReturn(input);
  for (
    const transform of [
      (p: typeof result.pending) => {
        p.form7206.line14 = 6001;
      },
      (p: typeof result.pending) => {
        p.schedule1.line17_se_health_insurance = 6001;
      },
      (p: typeof result.pending) => {
        p.form7206.single_schedule_c_plan = {
          ...input.form7206.single_schedule_c_plan,
          taxpayer_identity: { name: "Alex Example", ssn: "999887777" },
        };
      },
      (p: typeof result.pending) => {
        p.form7206.single_schedule_c_plan = {
          ...input.form7206.single_schedule_c_plan,
          premium_months: input.form7206.single_schedule_c_plan.premium_months
            .map((m, i) => ({
              ...m,
              paid_premium: i === 0 ? 501 : m.paid_premium,
            })),
        };
      },
      (p: typeof result.pending) => {
        p.form7206.single_schedule_c_plan = {
          ...input.form7206.single_schedule_c_plan,
          business_reference: "another-business",
        };
      },
    ]
  ) {
    const changed = structuredClone(result.pending);
    transform(changed);
    await assertRejects(
      () => f1040_2025.prepareReturn(changed, bonusFilerFixture.filer),
      Error,
    );
  }
});
