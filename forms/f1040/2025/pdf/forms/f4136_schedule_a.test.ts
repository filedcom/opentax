import { assertEquals } from "@std/assert";
import { form4136ScheduleAPdf } from "./f4136_schedule_a.ts";

const business = {
  qualifying_business_activity: true,
  claimant_is_ultimate_purchaser: true,
  business_name: "First Activity",
  business_ein: "123456789",
  principal_activity_code: "111000",
  equipment_make: "Example",
  equipment_model: "Tractor",
  equipment_type: "farm tractor",
  purchase_records_confirmed: true,
  no_duplicate_excise_claim: true,
};

Deno.test("Schedule A (Form 4136) has exact 2025 page and widget paths", () => {
  const names = Object.fromEntries(
    form4136ScheduleAPdf.fields.map((
      field,
    ) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.business_name, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(
    names.line1a_quantity,
    "topmostSubform[0].Page1[0].Line1Table[0].Line1a[0].f1_11[0]",
  );
  assertEquals(
    names.line5c_credit_cents,
    "topmostSubform[0].Page2[0].Line5Table[0].Line5c[0].ColE[0].f2_23[0]",
  );
  assertEquals(
    names.line11h_quantity,
    "topmostSubform[0].Page3[0].Line11Table[0].Line11h[0].f3_87[0]",
  );
  assertEquals(names.line17_total_cents, "topmostSubform[0].Page4[0].f4_40[0]");
});

Deno.test("Schedule A (Form 4136) expands one PDF per business activity", () => {
  const claim = {
    line: "1a",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    not_highway_vehicle: true,
  };
  const projected = form4136ScheduleAPdf.projectFields?.({
    claimant_context: "business",
    business,
    claims: [claim],
    additional_activities: [{
      business: {
        ...business,
        business_name: "Second Activity",
        business_ein: "987654321",
      },
      claims: [{ ...claim, qualified_quantity: 50 }],
    }],
    primary_activity_has_most_qualified_fuel_usage: true,
  }, {});
  const instances = form4136ScheduleAPdf.instances?.(projected ?? {}) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances[0].business_name, "First Activity");
  assertEquals(instances[0].line1a_quantity, 100);
  assertEquals(instances[1].business_name, "Second Activity");
  assertEquals(instances[1].line1a_quantity, 50);
  assertEquals(instances[0].line17_total_dollars, "18");
  assertEquals(instances[1].line17_total_dollars, "9");
});
