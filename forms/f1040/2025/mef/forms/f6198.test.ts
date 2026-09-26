import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6198 } from "./f6198.ts";

const risk = (opening: number) => ({
  opening_adjusted_basis: opening,
  current_year_increases: 0,
  line9_decreases_and_exclusions: 0,
});

Deno.test("Form 6198 uses one computation for each Schedule C or F activity", () => {
  const xml = form6198.build({}, {
    pending: {
      schedule_c: {
        schedule_cs: [{
          line_a_principal_business: "Design",
          line_b_business_code: "541310",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 1000,
          line_8_advertising: 3000,
          line_32_at_risk: "b",
          at_risk_simplified: risk(500),
        }],
      },
      schedule_f: {
        schedule_fs: [{
          line_a_principal_crop_activity: "GRAIN FARMING",
          line_b_agricultural_activity_code: "111100",
          line_c_farm_name: "South farm",
          line_e_material_participation: true,
          accounting_method: "cash",
          line1_sales_livestock_resale: 1000,
          line16_feed: 4000,
          line36_at_risk: "b",
          at_risk_simplified: risk(900),
        }],
      },
    },
  });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<ActivityDescriptionTxt>Design</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml[0], "<DeductibleLossAmt>-500</DeductibleLossAmt>");
  assertStringIncludes(
    xml[1],
    "<ActivityDescriptionTxt>South farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml[1], "<DeductibleLossAmt>-900</DeductibleLossAmt>");
});

Deno.test("Form 6198 refuses untraceable aggregate fields", () => {
  assertThrows(
    () => form6198.build({ schedule_c_loss: -100 }),
    Error,
    "aggregate loss fields",
  );
});
