import { assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../../2025/registry.ts";
import { SCENARIO_1040_08_FACTS } from "./ty2025_cases.ts";
import { scenario104008Input } from "./scenario_1040_08_input.ts";
import { scheduleD } from "../../2025/mef/forms/schedule_d.ts";

const plan = buildExecutionPlan(registry);

Deno.test("ATS 1040 Scenario 8: source-backed return calculates age deduction and refund", () => {
  const result = execute(plan, registry, scenario104008Input(), {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  assertEquals(form?.line5a_pension_gross, 20_300);
  assertEquals(form?.line5b_pension_taxable, 10_300);
  assertEquals(form?.line5c_pension_rollover, true);
  assertEquals(form?.line6a_ss_gross, 1_000);
  assertEquals(form?.line6b_ss_taxable ?? 0, 0);
  assertEquals(form?.mfs_spouse_lived_with_taxpayer, false);
  assertEquals(result.pending.agi_aggregator?.mfs_lived_with_spouse, false);
  assertEquals(form?.line7a_cap_gain_distrib, 7_500);
  assertEquals(form?.line9_total_income, 17_800);
  assertEquals(form?.line12a_standard_deduction, 17_350);
  assertEquals(form?.line13b_additional_deductions ?? 0, 0);
  assertEquals(form?.line15_taxable_income, 450);
  assertEquals(form?.line16_income_tax, 0);
  assertEquals(form?.line24_total_tax, 0);
  assertEquals(form?.line25b_withheld_1099, 2_555);
  assertEquals(form?.line33_total_payments, 2_555);
  assertEquals(form?.line35a_refund, 2_555);
  assertEquals(result.pending.schedule_d?.line13_cap_gain_distrib, 7_500);
  assertEquals(scheduleD.build(result.pending.schedule_d), "");
});

Deno.test("ATS 1040 Scenario 8: MFS cohabitation answer changes Social Security taxability", () => {
  const input = scenario104008Input();
  (input.general as Record<string, unknown>).mfs_spouse_lived_with_taxpayer =
    true;
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line6b_ss_taxable, 850);
  assertEquals(result.pending.f1040?.mfs_spouse_lived_with_taxpayer, true);
});

Deno.test("ATS 1040 Scenario 8: code G and printed mark confirm rollover but code Q does not prove QCD", () => {
  const facts = SCENARIO_1040_08_FACTS;
  assertEquals(facts.form1040.line4cQcdChecked, true);
  assertEquals(facts.form1040.line5cRolloverChecked, true);
  assertEquals(facts.form1099R.map((form) => form.distributionCode), [
    "Q",
    "G",
  ]);
  const forms = scenario104008Input().f1099r as Record<string, unknown>[];
  assertEquals(
    forms.some((form) => form.box7_ira_simple_indicator === true),
    false,
  );
  assertEquals(forms[0].qcd_full, undefined);
  assertEquals(forms[0].qcd_partial_amount, undefined);
  assertEquals(forms[1].box7_distribution_code, "G");
  assertEquals(forms[1].direct_rollover_confirmed, true);
  assertEquals(forms[1].box2a_taxable_amount, 10_300);
});
