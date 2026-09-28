import { assertEquals, assertThrows } from "@std/assert";
import { TS } from "../../../types.ts";
import {
  calculateSingleScheduleCForm7206,
  form7206,
  inputSchema,
  type SingleScheduleCPlan,
} from "./index.ts";
import { form7206 as form7206Mef } from "../../../../2025/mef/forms/f7206.ts";
import { form7206Pdf } from "../../../../2025/pdf/forms/f7206.ts";
import { inputNodes } from "../../../../2025/inputs.ts";

const source: SingleScheduleCPlan = {
  business_reference: "SCHEDULE-C-A",
  plan_identifier: "HEALTH-2025-A",
  recipient: TS.T,
  eligible_health_premiums: 12_000,
  schedule_c_line31_net_profit: 50_000,
  schedule1_line15_se_tax_deduction: 3_000,
  schedule1_line16_retirement_deduction: 2_000,
  plan_established_under_business: true,
  eligible_premium_months_verified: true,
  sole_positive_business_verified: true,
  no_marketplace_overlap: true,
  no_ltc_premiums: true,
  no_form2555: true,
  no_schedule_se_optional_method: true,
  no_other_earned_income: true,
};

const scheduleC = {
  schedule_cs: [{
    business_reference: "SCHEDULE-C-A",
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 50_000,
  }],
};

Deno.test("2025 Form 7206 identified-plan source is a registered filing input", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "form7206"),
    true,
  );
});

Deno.test("2025 Form 7206 computes the single Schedule C plan's lines 1-14", () => {
  assertEquals(calculateSingleScheduleCForm7206(source), {
    line1: 12_000,
    line2: 0,
    line3: 12_000,
    line4: 50_000,
    line5: 50_000,
    line6: 1,
    line7: 3_000,
    line8: 47_000,
    line9: 2_000,
    line10: 45_000,
    line12: 0,
    line13: 45_000,
    line14: 12_000,
  });
});

Deno.test("2025 Form 7206 helper computes a capped amount, but active filing fails closed", () => {
  const lines = calculateSingleScheduleCForm7206({
    ...source,
    eligible_health_premiums: 48_000,
  });
  assertEquals(lines.line14, 45_000);
  assertThrows(
    () =>
      form7206.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          single_schedule_c_plan: {
            ...source,
            eligible_health_premiums: 48_000,
          },
          marketplace_ptc_premium_overlap: false,
        },
      ),
    Error,
    "not source-reconciled",
  );
});

Deno.test("2025 Form 7206 does not trust asserted premium eligibility or spouse ownership", () => {
  for (
    const proposed of [
      {
        ...source,
        schedule1_line15_se_tax_deduction: 0,
        schedule1_line16_retirement_deduction: 0,
      },
      { ...source, recipient: TS.S },
    ]
  ) {
    assertThrows(
      () =>
        form7206.compute(
          { taxYear: 2025, formType: "f1040" },
          {
            single_schedule_c_plan: proposed,
            marketplace_ptc_premium_overlap: false,
          },
        ),
      Error,
      "not source-reconciled",
    );
  }
});

Deno.test("2025 Form 7206 rejects unsupported or unsourced plans", () => {
  assertThrows(
    () =>
      inputSchema.parse({
        se_net_profit: 50_000,
        health_insurance_premiums: 12_000,
      }),
    Error,
  );
  assertThrows(
    () =>
      inputSchema.parse({
        single_schedule_c_plan: { ...source, no_ltc_premiums: false },
        marketplace_ptc_premium_overlap: false,
      }),
    Error,
  );
  assertThrows(
    () =>
      calculateSingleScheduleCForm7206({
        ...source,
        schedule1_line15_se_tax_deduction: 51_000,
      }),
    Error,
    "exceed the establishing business income",
  );
  assertThrows(
    () =>
      form7206.compute({ taxYear: 2025, formType: "f1040" }, {
        single_schedule_c_plan: source,
        marketplace_ptc_premium_overlap: true,
      }),
    Error,
    "requires Publication 974",
  );
});

Deno.test("2025 Form 7206 rejects direct MeF and PDF filing of asserted plan facts", () => {
  const lines = calculateSingleScheduleCForm7206(source);
  const fields = { single_schedule_c_plan: source, ...lines };
  assertThrows(
    () => form7206Mef.build(fields, { pending: { schedule_c: scheduleC } }),
    Error,
    "needs primary premium-month",
  );
  assertThrows(
    () => form7206Pdf.projectFields?.(fields, {}),
    Error,
    "needs primary premium-month",
  );
  assertThrows(
    () => form7206Pdf.includeWhen?.(fields),
    Error,
    "not source-reconciled",
  );
});

Deno.test("2025 Form 7206 direct XML filing fails before trusting mismatched sources", () => {
  const lines = calculateSingleScheduleCForm7206(source);
  assertThrows(
    () =>
      form7206Mef.build({ single_schedule_c_plan: source, ...lines }, {
        pending: {
          schedule_c: {
            ...scheduleC,
            schedule_cs: [{
              ...scheduleC.schedule_cs[0],
              business_reference: "OTHER",
            }],
          },
        },
      }),
    Error,
    "needs primary premium-month",
  );
  assertThrows(
    () =>
      form7206Mef.build({
        single_schedule_c_plan: source,
        ...lines,
        line14: 13_000,
      }, {
        pending: { schedule_c: scheduleC },
      }),
    Error,
    "needs primary premium-month",
  );
});
