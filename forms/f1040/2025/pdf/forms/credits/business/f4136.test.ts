import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form4136Pdf } from "./f4136.ts";

const business = {
  qualifying_business_activity: true,
  claimant_is_ultimate_purchaser: true,
  business_name: "Example Farm",
  principal_activity_code: "111000",
  equipment_make: "Example",
  equipment_model: "Tractor",
  equipment_type: "farm tractor",
  purchase_records_confirmed: true,
  no_duplicate_excise_claim: true,
};
const certifications = {
  undyed_fuel_confirmed: true,
  right_to_claim_not_waived: true,
  credit_card_issuer_certificate_not_provided: true,
  not_highway_vehicle: true,
  not_noncommercial_motorboat: true,
  aviation_gasoline_outside_propulsion_confirmed: true,
  export_proof: {
    kind: "carrier_bill_of_lading",
    record_reference: "Export file 2025-001",
  },
  commercial_aviation_nonforeign_trade_confirmed: true,
  foreign_trade_lust_tax_paid_confirmed: true,
  train_use_confirmed: true,
  certain_intercity_or_local_bus_use_confirmed: true,
  emulsion_water_percentage: 14,
  emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
} as const;
const activityContext = {
  claimant_context: "business",
  additional_activities: [],
  primary_activity_has_most_credit: true,
};

Deno.test("Form 4136 PDF maps page 1 business and page 4 total widgets", () => {
  const names = Object.fromEntries(
    form4136Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.business_name, "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(
    names.line1a_quantity,
    "topmostSubform[0].Page1[0].Table_Line1[0].Line1a[0].f1_12[0]",
  );
  assertEquals(
    names.line1c_type,
    "topmostSubform[0].Page1[0].Table_Line1[0].Line1c[0].f1_17[0]",
  );
  assertEquals(
    names.line1d_credit_dollars,
    "topmostSubform[0].Page1[0].Table_Line1[0].Line1d[0].ColE[0].f1_29[0]",
  );
  assertEquals(
    names.line2a_quantity,
    "topmostSubform[0].Page1[0].Table_Line2[0].Line2a[0].f1_34[0]",
  );
  assertEquals(
    names.line2d_credit_cents,
    "topmostSubform[0].Page1[0].Table_Line2[0].Line2d[0].ColE[0].f1_62[0]",
  );
  assertEquals(
    names.line3c_quantity,
    "topmostSubform[0].Page1[0].Table_Line3[0].Line3c[0].f1_77[0]",
  );
  assertEquals(
    names.line3e_credit_cents,
    "topmostSubform[0].Page1[0].Table_Line3[0].Line3e[0].ColE[0].f1_97[0]",
  );
  assertEquals(
    names.line4c_quantity,
    "topmostSubform[0].Page2[0].Table_Line4[0].Line4c[0].f2_14[0]",
  );
  assertEquals(
    names.line4f_credit_cents,
    "topmostSubform[0].Page2[0].Table_Line4[0].Line4f[0].ColE[0].f2_42[0]",
  );
  assertEquals(
    names.line5a_quantity,
    "topmostSubform[0].Page2[0].Table_Line5[0].Line5a[0].f2_46[0]",
  );
  assertEquals(
    names.line5e_credit_cents,
    "topmostSubform[0].Page2[0].Table_Line5[0].Line5e[0].ColE[0].f2_82[0]",
  );
  assertEquals(
    names.line5d_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line5[0].Line5d[0].ColE[0].f2_73[0]",
  );
  assertEquals(
    names.line6_registration_number,
    "topmostSubform[0].Page2[0].f2_84[0]",
  );
  assertEquals(
    names.line6a_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line6[0].Line6a[0].ColE[0].f2_89[0]",
  );
  assertEquals(
    names.line6b_quantity,
    "topmostSubform[0].Page2[0].Table_Line6[0].Line6b[0].f2_93[0]",
  );
  assertEquals(
    names.line6b_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line6[0].Line6b[0].ColE[0].f2_96[0]",
  );
  assertEquals(
    names.line7_registration_number,
    "topmostSubform[0].Page2[0].f2_99[0]",
  );
  assertEquals(
    names.line7a_quantity,
    "topmostSubform[0].Page2[0].Table_Line7[0].Line7a[0].f2_101[0]",
  );
  assertEquals(
    names.line7b_quantity,
    "topmostSubform[0].Page2[0].Table_Line7[0].Line7b[0].f2_103[0]",
  );
  assertEquals(
    names.line7_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line7[0].Line7b[0].ColE[0].f2_106[0]",
  );
  assertEquals(
    names.line7c_credit_dollars,
    "topmostSubform[0].Page2[0].Table_Line7[0].Line7c[0].ColE[0].f2_113[0]",
  );
  assertEquals(
    names.line8_registration_number,
    "topmostSubform[0].Page3[0].f3_1[0]",
  );
  assertEquals(
    names.line8a_quantity,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8a[0].f3_4[0]",
  );
  assertEquals(
    names.line8b_credit_dollars,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8b[0].ColE[0].f3_15[0]",
  );
  assertEquals(
    names.line8c_credit_dollars,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8c[0].ColE[0].f3_23[0]",
  );
  assertEquals(
    names.line8d_type,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8d[0].f3_26[0]",
  );
  assertEquals(
    names.line8e_credit_dollars,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8e[0].ColE[0].f3_39[0]",
  );
  assertEquals(
    names.line8f_credit_dollars,
    "topmostSubform[0].Page3[0].Table_Line8[0].Line8f[0].ColE[0].f3_47[0]",
  );
  assertEquals(
    names.line13_registration_number,
    "topmostSubform[0].Page4[0].f4_64[0]",
  );
  assertEquals(
    names.line13a_quantity,
    "topmostSubform[0].Page4[0].Table_Line13[0].Line13a[0].f4_66[0]",
  );
  assertEquals(
    names.line13c_credit_dollars,
    "topmostSubform[0].Page4[0].Table_Line13[0].Line13c[0].ColE[0].f4_83[0]",
  );
  assertEquals(
    names.line11c_quantity,
    "topmostSubform[0].Page3[0].Table_Line11[0].Line11c[0].f3_97[0]",
  );
  assertEquals(
    names.line11h_credit_cents,
    "topmostSubform[0].Page3[0].Table_Line11[0].Line11h[0].ColE[0].f3_141[0]",
  );
  assertEquals(
    names.line14a_credit_dollars,
    "topmostSubform[0].Page4[0].Table_Line14[0].Line14a[0].ColE[0].f4_91[0]",
  );
  assertEquals(
    names.line14b_quantity,
    "topmostSubform[0].Page4[0].Table_Line14[0].Line14b[0].f4_96[0]",
  );
  assertEquals(
    names.line15_registration_number,
    "topmostSubform[0].Page4[0].f4_102[0]",
  );
  assertEquals(
    names.line15a_quantity,
    "topmostSubform[0].Page4[0].Table_Line15[0].Line15a[0].f4_104[0]",
  );
  assertEquals(
    names.line15a_credit_dollars,
    "topmostSubform[0].Page4[0].Table_Line15[0].Line15a[0].ColE[0].f4_107[0]",
  );
  assertEquals(
    names.line16a_credit_dollars,
    "topmostSubform[0].Page4[0].Table_Line16[0].Line16a[0].ColE[0].f4_114[0]",
  );
  assertEquals(
    names.line16b_quantity,
    "topmostSubform[0].Page4[0].Table_Line16[0].Line16b[0].f4_118[0]",
  );
  assertEquals(
    names.line17_total_cents,
    "topmostSubform[0].Page4[0].f4_125[0]",
  );
});

Deno.test("Form 4136 PDF projects commercial aviation vendor lines 8a and 8b", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Aviation Vendor",
      principal_activity_code: "424720",
      equipment_make: "Example",
      equipment_model: "Fuel Truck",
      equipment_type: "aviation refueler",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [
      { line: "8a", excise_tax_rate_per_gallon: 0.219 },
      { line: "8b", excise_tax_rate_per_gallon: 0.244 },
    ].map((claim, index) => ({
      ...claim,
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price",
      aviation_vendor_sales: [{
        sale_record_reference: index ? "AV-002" : "AV-001",
        sale_date: index ? "2025-07-12" : "2025-06-12",
        buyer_name: "Example Airline",
        buyer_address: "10 Airport Road, Wilmington, DE 19801",
        gallons: 1_000,
        commercial_aviation_nonforeign_trade_confirmed: true,
        waiver_l: {
          kind: "single_purchase",
          record_reference: index ? "Waiver L-002" : "Waiver L-001",
          invoice_or_delivery_ticket_number: index ? "AV-002" : "AV-001",
          waived_gallons: 1_000,
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
        },
      }],
    })),
  }, { schedule3: { line12_fuel_tax_credit: 375 } });
  assertEquals(result?.line8_registration_number, "UA123456789");
  assertEquals(result?.line8a_quantity, 1_000);
  assertEquals(result?.line8a_credit_dollars, "175");
  assertEquals(result?.line8b_quantity, 1_000);
  assertEquals(result?.line8b_credit_dollars, "200");
});

Deno.test("Form 4136 PDF projects Certificate Q vendor line 8c", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Aviation Vendor",
      principal_activity_code: "424720",
      equipment_make: "Example",
      equipment_model: "Fuel Truck",
      equipment_type: "aviation refueler",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "8c",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      excise_tax_rate_per_gallon: 0.244,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price",
      nonexempt_noncommercial_aviation_sales: [{
        sale_record_reference: "AV-Q-001",
        sale_date: "2025-06-12",
        buyer_name: "Example Aircraft Owner",
        buyer_address: "10 Airport Road, Wilmington, DE 19801",
        gallons: 1_000,
        nonexempt_noncommercial_aviation_confirmed: true,
        certificate_q: {
          kind: "single_purchase",
          record_reference: "Certificate Q-001",
          invoice_or_delivery_ticket_number: "AV-Q-001",
          certified_gallons: 1_000,
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
        },
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 25 } });
  assertEquals(result?.line8_registration_number, "UA123456789");
  assertEquals(result?.line8c_quantity, 1_000);
  assertEquals(result?.line8c_credit_dollars, "25");
});

Deno.test("Form 4136 PDF projects noncommercial aviation lines 8d through 8f with multi-use detail", () => {
  const routes = [
    { line: "8d", use: "09", rate: 0.244, reference: "AV-09" },
    { line: "8d", use: "10", rate: 0.244, reference: "AV-10" },
    { line: "8e", use: "11", rate: 0.219, reference: "AV-11" },
  ] as const;
  const claims = routes.map((route) => ({
    line: route.line,
    type_of_use: route.use,
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
    excise_tax_rate_per_gallon: route.rate,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    nontaxable_noncommercial_aviation_sales: [{
      proof_kind: "waiver_l" as const,
      sale_record_reference: route.reference,
      sale_date: "2025-06-12",
      buyer_name: "Example Aircraft Operator",
      buyer_address: "10 Airport Road, Wilmington, DE 19801",
      gallons: 1_000,
      noncommercial_aviation_confirmed: true as const,
      type_of_use: route.use,
      waiver_l_selected_use_code: route.use,
      waiver_l: {
        kind: "single_purchase" as const,
        record_reference: `Waiver L-${route.reference}`,
        invoice_or_delivery_ticket_number: route.reference,
        waived_gallons: 1_000,
        signed_by_buyer_confirmed: true as const,
        held_unexpired_when_claimed_confirmed: true as const,
      },
    }],
  }));
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Aviation Vendor",
      principal_activity_code: "424720",
      equipment_make: "Example",
      equipment_model: "Fuel Truck",
      equipment_type: "aviation refueler",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [...claims, {
      line: "8f",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price",
      foreign_trade_lust_tax_paid_confirmed: true,
      foreign_trade_aviation_sale_references: ["AV-09"],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 705 } });
  assertEquals(result?.line8_registration_number, "UA123456789");
  assertEquals(result?.line8d_type, "STMT");
  assertEquals(result?.line8d_quantity, "STMT");
  assertEquals(result?.line8d_credit_dollars, "486");
  assertEquals(result?.line8e_type, "11");
  assertEquals(result?.line8e_credit_dollars, "218");
  assertEquals(result?.line8f_quantity, 1_000);
  assertEquals(result?.line8f_credit_dollars, "1");
});

Deno.test("Form 4136 PDF projects registered card issuer line 13c taxed at $.244", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Card Issuer",
      business_ein: "987654321",
      principal_activity_code: "522210",
      equipment_make: "Payment",
      equipment_model: "Card Network",
      equipment_type: "fleet card platform",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "13c",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      excise_tax_rate_per_gallon: 0.244,
      credit_card_issuer_registration_number: "CC123456789",
      credit_card_sales: [{
        sale_record_reference: "CARD-001",
        purchase_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_address: "20 City Hall Road, Wilmington, DE 19801",
        buyer_ein: "123456789",
        card_account_number: "CITY-2025",
        gallons: 1_000,
        actual_fuel_cost: 3_000,
        card_issued_to_government_buyer_confirmed: true,
        exclusive_government_use_confirmed: true,
        buyer_tax_arrangement: "tax_not_collected",
        vendor_tax_arrangement: "tax_repaid",
        certificate_r: {
          record_reference: "Certificate R-001",
          account_number: "CITY-2025",
          effective_date: "2025-01-01",
          expiration_date: "2026-12-31",
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
          information_believed_true_confirmed: true,
        },
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 243 } });
  assertEquals(result?.line13_registration_number, "CC123456789");
  assertEquals(result?.line13c_quantity, 1_000);
  assertEquals(result?.line13c_cost_dollars, "3000");
  assertEquals(result?.line13c_credit_dollars, "243");
});

Deno.test("Form 4136 PDF maps line 7a government kerosene and appends buyers", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Kerosene Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "kerosene dispenser",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "7a",
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true,
      vendor_registration_number: "UV123456789",
      vendor_tax_settlement: "tax_excluded_price",
      government_sales: [{
        sale_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_ein: "123456789",
        gallons: 100,
        certificate_p_record_reference: "Certificate P-2025-7",
        certificate_p_unexpired_at_claim_confirmed: true,
        certificate_information_believed_true: true,
        state_credit_card_not_used_confirmed: true,
        exclusive_government_use_confirmed: true,
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 24.3 } });
  assertEquals(result?.line7_registration_number, "UV123456789");
  assertEquals(result?.line7a_quantity, 100);
  assertEquals(result?.line7_credit_dollars, "24");
  assertEquals(result?.line7_credit_cents, "30");
  const document = await PDFDocument.create();
  for (let i = 0; i < 4; i++) document.addPage([612, 792]);
  await form4136Pdf.appendSupplementalPages?.(
    document,
    result ?? {},
    undefined,
  );
  assertEquals(document.getPageCount(), 5);
});

Deno.test("Form 4136 PDF projects kerosene bus line 7c", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Kerosene Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "kerosene dispenser",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "7c",
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true,
      vendor_registration_number: "UB123456789",
      vendor_tax_settlement: "tax_excluded_price",
      intercity_local_bus_sales: [{
        sale_date: "2025-07-15",
        buyer_name: "Example Bus Operator",
        buyer_address: "10 Transit Lane, Wilmington, DE 19801",
        gallons: 100,
        certain_intercity_or_local_bus_use_confirmed: true,
        waiver_n: {
          kind: "account_period",
          record_reference: "Waiver N-007",
          account_or_order_number: "BUS-2025",
          effective_date: "2025-07-01",
          expiration_date: "2026-06-30",
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
        },
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 17 } });
  assertEquals(result?.line7_registration_number, "UB123456789");
  assertEquals(result?.line7c_quantity, 100);
  assertEquals(result?.line7c_credit_dollars, "17");
  assertEquals(result?.line7c_credit_cents, "00");
});

Deno.test("Form 4136 PDF projects registered vendor bus line 6b", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business: {
      qualifying_business_activity: true,
      business_name: "Example Bus Fuel Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "diesel dispenser",
      sales_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: "6b",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      undyed_fuel_confirmed: true,
      vendor_registration_number: "UB123456789",
      vendor_tax_settlement: "tax_excluded_price",
      intercity_local_bus_sales: [{
        sale_date: "2025-03-15",
        buyer_name: "Example Bus Operator",
        buyer_address: "10 Transit Lane, Wilmington, DE 19801",
        gallons: 1_000,
        certain_intercity_or_local_bus_use_confirmed: true,
        waiver_n: {
          kind: "single_purchase",
          record_reference: "Waiver N-001",
          invoice_or_delivery_ticket_number: "INV-001",
          waived_gallons: 1_000,
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
        },
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 170 } });
  assertEquals(result?.line6_registration_number, "UB123456789");
  assertEquals(result?.line6b_quantity, 1_000);
  assertEquals(result?.line6b_cost_dollars, "2500");
  assertEquals(result?.line6b_credit_dollars, "170");
});

Deno.test("Form 4136 PDF projects blender line 15a and appends certification", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
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
  }, { schedule3: { line12_fuel_tax_credit: 46 } });
  assertEquals(result?.line15_registration_number, "M123456789");
  assertEquals(result?.line15a_quantity, 1_000);
  assertEquals(result?.line15a_cost_dollars, "2500");
  assertEquals(result?.line15a_credit_dollars, "46");
  const document = await PDFDocument.create();
  for (let i = 0; i < 4; i++) document.addPage([612, 792]);
  await form4136Pdf.appendSupplementalPages?.(
    document,
    result ?? {},
    undefined,
  );
  assertEquals(document.getPageCount(), 5);
});

Deno.test("Form 4136 PDF projects emulsion bus and export rows", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "14a",
        type_of_use: "05",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
      {
        ...certifications,
        line: "14b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 32.2 } });
  assertEquals(result?.line14a_type, "05");
  assertEquals(result?.line14a_quantity, 100);
  assertEquals(result?.line14a_credit_dollars, "12");
  assertEquals(result?.line14a_credit_cents, "40");
  assertEquals(result?.line14b_credit_dollars, "19");
  assertEquals(result?.line14b_credit_cents, "80");
  const document = await PDFDocument.create();
  for (let i = 0; i < 4; i++) document.addPage([612, 792]);
  await form4136Pdf.decoratePages?.(
    document,
    document.getPages(),
    result ?? {},
    undefined,
  );
  assertEquals(document.getPageCount(), 4);
});

Deno.test("Form 4136 PDF aggregates exporter fuel kinds with a detail page", async () => {
  const exporter = {
    ...activityContext,
    business: {
      ...business,
      claimant_is_ultimate_purchaser: undefined,
      purchase_records_confirmed: undefined,
      export_records_confirmed: true,
    },
    claims: [
      { line: "16a", exported_fuel_kind: "dyed_diesel" },
      { line: "16a", exported_fuel_kind: "gasoline_blendstock" },
      { line: "16b", exported_fuel_kind: "dyed_kerosene" },
    ].map((claim) => ({
      ...certifications,
      ...claim,
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      excise_tax_rate_per_gallon: 0.001,
      exporter_of_record_confirmed: true,
    })),
  };
  const result = form4136Pdf.projectFields?.(
    exporter,
    { schedule3: { line12_fuel_tax_credit: 3 } },
  );
  assertEquals(result?.line16a_quantity, "STMT");
  assertEquals(result?.line16a_credit_dollars, "2");
  assertEquals(result?.line16b_quantity, 1_000);
  assertEquals(result?.line16b_credit_dollars, "1");
  const document = await PDFDocument.create();
  for (let i = 0; i < 4; i++) document.addPage([612, 792]);
  await form4136Pdf.appendSupplementalPages?.(
    document,
    result ?? {},
    undefined,
  );
  assertEquals(document.getPageCount(), 5);
});

Deno.test("Form 4136 PDF includes vendor line 6a and government-buyer detail", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
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
        certificate_p_unexpired_at_claim_confirmed: true,
        certificate_information_believed_true: true,
        state_credit_card_not_used_confirmed: true,
        exclusive_government_use_confirmed: true,
      }],
    }],
  }, { schedule3: { line12_fuel_tax_credit: 36.45 } });
  assertEquals(result?.line6_registration_number, "UV123456789");
  assertEquals(result?.line6a_quantity, 150);
  assertEquals(result?.line6a_credit_dollars, "36");
  assertEquals(result?.line6a_credit_cents, "45");
  const document = await PDFDocument.create();
  for (let i = 0; i < 4; i++) document.addPage([612, 792]);
  await form4136Pdf.appendSupplementalPages?.(
    document,
    result ?? {},
    undefined,
  );
  assertEquals(document.getPageCount(), 5);
});

Deno.test("Form 4136 PDF separates aviation kerosene commercial and LUST rows", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: (["5a", "5b", "5e"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      excise_tax_rate_per_gallon: line === "5a"
        ? 0.244
        : line === "5b"
        ? 0.219
        : undefined,
    })),
  }, { schedule3: { line12_fuel_tax_credit: 376 } });
  assertEquals(result?.line5a_quantity, 1_000);
  assertEquals(result?.line5a_credit_dollars, "200");
  assertEquals(result?.line5b_credit_dollars, "175");
  assertEquals(result?.line5e_credit_dollars, "1");
  assertEquals(result?.line17_total_dollars, "376");
});

Deno.test("Form 4136 PDF separates kerosene bus, export, and reduced-tax rows", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: (["4c", "4d", "4e", "4f"] as const).map((line) => ({
      ...certifications,
      line,
      type_of_use: line === "4e" || line === "4f" ? "02" : undefined,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      excise_tax_rate_per_gallon: line === "4e"
        ? 0.044
        : line === "4f"
        ? 0.219
        : undefined,
    })),
  }, { schedule3: { line12_fuel_tax_credit: 67.5 } });
  assertEquals(result?.line4c_credit_dollars, "17");
  assertEquals(result?.line4d_credit_cents, "40");
  assertEquals(result?.line4e_type, "02");
  assertEquals(result?.line4e_credit_cents, "30");
  assertEquals(result?.line4f_credit_dollars, "21");
  assertEquals(result?.line4f_credit_cents, "80");
  assertEquals(result?.line17_total_cents, "50");
});

Deno.test("Form 4136 PDF separates diesel train, bus, and export rows", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: (["3c", "3d", "3e"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    })),
  }, { schedule3: { line12_fuel_tax_credit: 65.7 } });
  assertEquals(result?.line3c_quantity, 100);
  assertEquals(result?.line3c_credit_dollars, "24");
  assertEquals(result?.line3c_credit_cents, "30");
  assertEquals(result?.line3d_credit_dollars, "17");
  assertEquals(result?.line3e_credit_cents, "40");
  assertEquals(result?.line17_total_cents, "70");
});

Deno.test("Form 4136 PDF projects all aviation-gasoline fixed-use lines", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: (["2a", "2c", "2d"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
    })),
  }, { schedule3: { line12_fuel_tax_credit: 345 } });
  assertEquals(result?.line2a_quantity, 1_000);
  assertEquals(result?.line2a_credit_dollars, "150");
  assertEquals(result?.line2c_credit_dollars, "194");
  assertEquals(result?.line2d_credit_dollars, "1");
  assertEquals(result?.line17_total_dollars, "345");
});

Deno.test("Form 4136 PDF separates other-use and exported gasoline", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "1c",
        type_of_use: "05",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "1d",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 36.7 } });
  assertEquals(result?.line1c_type, "05");
  assertEquals(result?.line1c_quantity, 100);
  assertEquals(result?.line1_credit_dollars, "18");
  assertEquals(result?.line1_credit_cents, "30");
  assertEquals(result?.line1d_quantity, 100);
  assertEquals(result?.line1d_credit_dollars, "18");
  assertEquals(result?.line1d_credit_cents, "40");
});

Deno.test("Form 4136 PDF projects gallons and split dollars/cents from source", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300.25,
      },
      {
        ...certifications,
        line: "3b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 400.10,
      },
    ],
  }, {
    schedule3: { line12_fuel_tax_credit: 42.6 },
  });
  assertEquals(result?.line1a_quantity, 100);
  assertEquals(result?.line1_cost_dollars, "300");
  assertEquals(result?.line1_cost_cents, "25");
  assertEquals(result?.line3_credit_dollars, "24");
  assertEquals(result?.line3_credit_cents, "30");
  assertEquals(result?.line17_total_dollars, "42");
  assertEquals(result?.line17_total_cents, "60");
});

Deno.test("Form 4136 PDF carries multiple uses on a separate statement", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "3a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "3a",
        type_of_use: "06",
        unit: "gallons",
        qualified_quantity: 50,
        actual_fuel_cost: 150,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 36.45 } });
  assertEquals(result?.line3a_type, "STMT");
  assertEquals(result?.line3a_quantity, "STMT");
  const doc = await PDFDocument.create();
  await form4136Pdf.appendSupplementalPages?.(doc, result ?? {}, undefined);
  assertEquals(doc.getPageCount(), 1);
});

Deno.test("Form 4136 PDF rejects a Schedule 3 mismatch", () => {
  assertThrows(
    () =>
      form4136Pdf.projectFields?.({
        ...activityContext,
        business,
        claims: [{
          ...certifications,
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
        }],
      }, { schedule3: { line12_fuel_tax_credit: 50 } }),
    Error,
    "does not match Schedule 3",
  );
});

Deno.test("Form 4136 PDF carries line 11 LNG diesel-gallon equivalents", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [{
      ...certifications,
      line: "11g",
      type_of_use: "02",
      unit: "DGE",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 24.3 } });
  assertEquals(result?.line11g_quantity, 100);
  assertEquals(result?.line11g_credit_dollars, "24");
  assertEquals(result?.line11g_credit_cents, "30");
});

Deno.test("Form 4136 PDF projects reduced-rate bus claims", async () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [{
      ...certifications,
      line: "11a",
      type_of_use: "05",
      unit: "GGE",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 10.9 } });
  assertEquals(result?.line11a_type, "05");
  assertEquals(result?.line11a_quantity, 100);
  assertEquals(result?.line11a_credit_dollars, "10");
  assertEquals(result?.line11a_credit_cents, "90");
  const doc = await PDFDocument.create();
  const pages = [doc.addPage(), doc.addPage(), doc.addPage()];
  await form4136Pdf.decoratePages?.(doc, pages, result ?? {}, undefined);
  assertEquals(doc.getPageCount(), 3);
});

Deno.test("Form 4136 PDF sends mixed bus and standard line 11 use to a statement", () => {
  const result = form4136Pdf.projectFields?.({
    ...activityContext,
    business,
    claims: [
      {
        ...certifications,
        line: "11a",
        type_of_use: "05",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "11a",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, { schedule3: { line12_fuel_tax_credit: 29.2 } });
  assertEquals(result?.line11a_type, "STMT");
  assertEquals(result?.line11a_quantity, "STMT");
  assertEquals(result?.line11a_credit_dollars, "29");
  assertEquals(result?.line11a_credit_cents, "20");
});

Deno.test("Form 4136 PDF skips business lines for home-use kerosene", () => {
  const result = form4136Pdf.projectFields?.({
    claimant_context: "home_kerosene",
    claimant_is_ultimate_purchaser: true,
    home_purchase_outside_blocked_pump: true,
    home_use_heating_lighting_or_cooking: true,
    purchase_records_confirmed: true,
    no_duplicate_excise_claim: true,
    claims: [{
      line: "4a",
      type_of_use: "08",
      unit: "gallons",
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true,
    }],
  }, { schedule3: { line12_fuel_tax_credit: 24.3 } });
  assertEquals(result?.qualified_yes, true);
  assertEquals(result?.activity_count, undefined);
  assertEquals(result?.business_name, undefined);
  assertEquals(result?.line4a_type, "08");
  assertEquals(result?.line4a_quantity, 100);
  assertEquals(result?.line17_total_dollars, "24");
});
