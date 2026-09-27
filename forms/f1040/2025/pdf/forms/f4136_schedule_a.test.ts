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
    names.line6_registration_number,
    "topmostSubform[0].Page2[0].f2_41[0]",
  );
  assertEquals(
    names.line6a_credit_dollars,
    "topmostSubform[0].Page2[0].Line6Table[0].Line6a[0].ColE[0].f2_46[0]",
  );
  assertEquals(
    names.line11h_quantity,
    "topmostSubform[0].Page3[0].Line11Table[0].Line11h[0].f3_87[0]",
  );
  assertEquals(
    names.line14a_credit_dollars,
    "topmostSubform[0].Page4[0].Line14Table[0].Line14a[0].ColE[0].f4_6[0]",
  );
  assertEquals(
    names.line14b_quantity,
    "topmostSubform[0].Page4[0].Line14Table[0].Line14b[0].f4_11[0]",
  );
  assertEquals(
    names.line15_registration_number,
    "topmostSubform[0].Page4[0].f4_17[0]",
  );
  assertEquals(
    names.line15a_quantity,
    "topmostSubform[0].Page4[0].Line15Table[0].Line15a[0].f4_19[0]",
  );
  assertEquals(
    names.line15a_credit_dollars,
    "topmostSubform[0].Page4[0].Line15Table[0].Line15a[0].ColE[0].f4_22[0]",
  );
  assertEquals(
    names.line16a_credit_dollars,
    "topmostSubform[0].Page4[0].Line16Table[0].Line16a[0].ColE[0].f4_29[0]",
  );
  assertEquals(
    names.line16b_quantity,
    "topmostSubform[0].Page4[0].Line16Table[0].Line16b[0].f4_33[0]",
  );
  assertEquals(names.line17_total_cents, "topmostSubform[0].Page4[0].f4_40[0]");
});

Deno.test("Schedule A (Form 4136) keeps blender line 15a on its activity", () => {
  const projected = form4136ScheduleAPdf.projectFields?.({
    claimant_context: "business",
    business: {
      qualifying_business_activity: true,
      business_name: "Example Emulsion Blender",
      principal_activity_code: "324110",
      equipment_make: "Example",
      equipment_model: "Mixer",
      equipment_type: "fuel blender",
      production_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "15a",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      undyed_fuel_confirmed: true,
      excise_tax_rate_per_gallon: 0.244,
      blender_registration_number: "M123456789",
      blender_produced_confirmed: true,
      blender_input_diesel_gallons: 1_000,
      blender_trade_or_business_disposition: "used_in_business",
      emulsion_water_percentage: 14,
      emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
    }],
    additional_activities: [{
      business,
      claims: [{
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        not_highway_vehicle: true,
        not_noncommercial_motorboat: true,
      }],
    }],
    primary_activity_has_most_credit: true,
  }, {});
  const instances = form4136ScheduleAPdf.instances?.(projected ?? {}) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances[0].line15_registration_number, "M123456789");
  assertEquals(instances[0].line15a_quantity, 1_000);
  assertEquals(instances[0].line15a_credit_dollars, "46");
  assertEquals(instances[1].line15a_quantity, undefined);
});

Deno.test("Schedule A (Form 4136) expands one PDF per business activity", () => {
  const claim = {
    line: "1a",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    not_highway_vehicle: true,
    not_noncommercial_motorboat: true,
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
    primary_activity_has_most_credit: true,
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

Deno.test("Schedule A (Form 4136) preserves vendor line 6a on its activity", () => {
  const projected = form4136ScheduleAPdf.projectFields?.({
    claimant_context: "business",
    business: {
      qualifying_business_activity: true,
      business_name: "Example Fuel Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "diesel dispenser",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "6a",
      unit: "gallons",
      qualified_quantity: 150,
      actual_fuel_cost: 400,
      undyed_fuel_confirmed: true,
      vendor_registration_number: "UV123456789",
      vendor_tax_settlement: "tax_excluded_price",
      government_sales: [{
        sale_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_ein: "123456789",
        gallons: 150,
        certificate_p_record_reference: "Certificate P-2025-1",
        certificate_information_believed_true: true,
        exclusive_government_use_confirmed: true,
      }],
    }],
    additional_activities: [{
      business,
      claims: [{
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        not_highway_vehicle: true,
        not_noncommercial_motorboat: true,
      }],
    }],
    primary_activity_has_most_credit: true,
  }, {});
  const instances = form4136ScheduleAPdf.instances?.(projected ?? {}) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances[0].line6_registration_number, "UV123456789");
  assertEquals(instances[0].line6a_quantity, 150);
  assertEquals(instances[1].line6a_quantity, undefined);
});
