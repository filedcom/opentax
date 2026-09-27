import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { credit_resolution_2026 } from "./credit_resolution.ts";

const base = {
  line1_total: 80,
  line2_childcare_credit: 0,
  line3_education_credit: 0,
  line4_retirement_savings_credit: 0,
  line6c_adoption_credit: 0,
  line6d_elderly_disabled_credit: 0,
  line6f_clean_vehicle_credit: 0,
  line6g_mortgage_interest_credit: 0,
  line6h_dc_homebuyer_credit: 0,
  line6l_form8978_credit: 0,
  line6m_prev_owned_clean_vehicle_credit: 0,
  line8_before_form5695: 80,
  line15_total: 0,
  line11_excess_ss: 0,
};

Deno.test("TY2026 credit stage limits Form 5695 after earlier Schedule 3 credits", () => {
  const result = credit_resolution_2026.compute(
    { taxYear: 2026, formType: "f1040" },
    {
      schedule3_base: base,
      carryforward_from_2025_line16: 200,
      line16_income_tax: 100,
      qualifying_children_count: 0,
      other_dependents_count: 0,
    },
  );
  const form5695 =
    result.outputs.find((output) => output.nodeType === "form5695")!.fields;
  const f1040 =
    result.outputs.find((output) => output.nodeType === "f1040")!.fields;
  assertEquals(form5695.line2_limit, 20);
  assertEquals(form5695.line3_credit, 20);
  assertEquals(form5695.line4_to_2027, 180);
  assertEquals(f1040.line20_nonrefundable_credits, 100);
  assertEquals(result.finalizations?.[0].fields.line8_total, 100);
  assertEquals(
    result.carryforwards?.form5695_residential_clean_energy_to_2027,
    180,
  );
});

Deno.test("TY2026 credit stage includes Schedule 2 line 3 in Form 5695 limit", () => {
  const result = credit_resolution_2026.compute(
    { taxYear: 2026, formType: "f1040" },
    {
      schedule3_base: { ...base, line1_total: 0, line8_before_form5695: 0 },
      carryforward_from_2025_line16: 200,
      line16_income_tax: 0,
      schedule2_line3: 100,
      qualifying_children_count: 0,
      other_dependents_count: 0,
    },
  );
  const form5695 =
    result.outputs.find((output) => output.nodeType === "form5695")!.fields;
  assertEquals(form5695.line2_limit, 100);
  assertEquals(form5695.line3_credit, 100);
});

Deno.test("TY2026 Worksheet B requires complete earned-income facts", () => {
  assertThrows(
    () =>
      credit_resolution_2026.compute(
        { taxYear: 2026, formType: "f1040" },
        {
          schedule3_base: base,
          carryforward_from_2025_line16: 200,
          line16_income_tax: 4_000,
          qualifying_children_count: 1,
          other_dependents_count: 0,
          filing_status: FilingStatus.Single,
          agi: 70_000,
          w2_earned_income: 70_000,
        },
      ),
    Error,
    "Earned Income Worksheet source facts",
  );
});
