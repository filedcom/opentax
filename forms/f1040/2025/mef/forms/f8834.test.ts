import { assertStringIncludes, assertThrows } from "@std/assert";
import { form8834 } from "./f8834.ts";

const fields = {
  f8834s: [{
    source_form: "8582-CR" as const,
    source_activity_id: "rental-a",
    allowed_passive_activity_credit: 600,
  }],
  line1_source_credit: 600,
  line2_regular_tax: 1_000,
  line3a_foreign_tax_credit: 100,
  line3b_other_credits: 150,
  line3c_total_credits: 250,
  line4_net_regular_tax: 750,
  line5_tentative_minimum_tax: 300,
  line6_adjusted_regular_tax: 450,
  line7_allowed_credit: 450,
};

Deno.test("Form 8834 XML emits its nine source-backed and limited lines", () => {
  const xml = form8834.build(fields, {
    pending: { schedule3: { line6i_qualified_electric_vehicle_credit: 450 } },
  });
  assertStringIncludes(xml, "<IRS8834>");
  assertStringIncludes(
    xml,
    "<QlfyElecVehPssvActyCrAllwAmt>600</QlfyElecVehPssvActyCrAllwAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyElecVehAdjRegularTaxAmt>450</QlfyElecVehAdjRegularTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyElecMotorVehCrAmt>450</QlfyElecMotorVehCrAmt>",
  );
});

Deno.test("Form 8834 XML rejects source, limit, or Schedule 3 mismatch", () => {
  assertThrows(
    () =>
      form8834.build({ ...fields, line1_source_credit: 500 }, {
        pending: {
          schedule3: { line6i_qualified_electric_vehicle_credit: 450 },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8834.build(fields, {
        pending: {
          schedule3: { line6i_qualified_electric_vehicle_credit: 400 },
        },
      }),
    Error,
    "does not reconcile",
  );
});
