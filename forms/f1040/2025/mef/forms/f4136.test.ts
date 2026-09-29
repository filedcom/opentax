import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form4136 } from "./f4136.ts";
import { form4136DieselGovernmentSalesStatement } from "./f4136_diesel_government_sales_statement.ts";
import { form4136EmulsionBlendingStatement } from "./f4136_emulsion_blending_statement.ts";
import { form4136KeroseneGovernmentSalesStatement } from "./f4136_kerosene_government_sales_statement.ts";
import { form4136CreditCardUsersStatement } from "./f4136_credit_card_users_statement.ts";
import {
  fuelClaimSchema,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
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
  claimant_context: "business" as const,
  additional_activities: [],
  primary_activity_has_most_credit: true as const,
};

const fields = {
  ...activityContext,
  business: {
    qualifying_business_activity: true as const,
    claimant_is_ultimate_purchaser: true as const,
    business_name: "Example Farm",
    principal_activity_code: "111000",
    equipment_make: "Example",
    equipment_model: "Tractor",
    equipment_type: "farm tractor",
    purchase_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
  },
  claims: [
    {
      ...certifications,
      line: "1a" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    },
    {
      ...certifications,
      line: "3b" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 400,
    },
  ],
};

Deno.test("Form 4136 XML emits business and source-backed fuel groups", () => {
  const xml = form4136.build(fields, {
    pending: { schedule3: { line12_fuel_tax_credit: 42.6 } },
  });
  assertStringIncludes(xml, "<IRS4136>");
  assertStringIncludes(
    xml,
    "<QlfyUsageFuelsEligFTCInd>true</QlfyUsageFuelsEligFTCInd>",
  );
  assertStringIncludes(
    xml,
    "<OffHwyBusUseGasolineGalsQty>100</OffHwyBusUseGasolineGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<FarmPrpsUndyedDslFuelGalsQty>100</FarmPrpsUndyedDslFuelGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>43</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML rejects a Schedule 3 source mismatch", () => {
  assertThrows(
    () =>
      form4136.build(fields, {
        pending: { schedule3: { line12_fuel_tax_credit: 40 } },
      }),
    Error,
    "does not match Schedule 3",
  );
});

Deno.test("Form 4136 XML separates emulsion use, reduced-rate bus use, and export", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "14a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 250,
      },
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 51.9 } } });
  assertStringIncludes(xml, "<BusNontxUseDieselWtrEmlsnGrp>");
  assertStringIncludes(xml, "<CreditRt>0.124</CreditRt>");
  assertStringIncludes(xml, "<NontxUseDieselWaterEmulsionGrp>");
  assertStringIncludes(
    xml,
    "<ExpNontxUseDslWtrEmulsionQty>100</ExpNontxUseDslWtrEmulsionQty>",
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>52</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML links registered-blender line 15a to its certification", () => {
  const blender = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Emulsion Blender",
      principal_activity_code: "324110",
      equipment_make: "Example",
      equipment_model: "Mixer",
      equipment_type: "fuel blender",
      production_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "15a" as const,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      undyed_fuel_confirmed: true as const,
      excise_tax_rate_per_gallon: 0.244,
      blender_registration_number: "M123456789",
      blender_produced_confirmed: true as const,
      blender_input_diesel_gallons: 1_000,
      blender_trade_or_business_disposition: "used_in_business" as const,
      emulsion_water_percentage: 14,
      emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
    }],
  };
  const xml = form4136.build(blender, {
    pending: { schedule3: { line12_fuel_tax_credit: 46 } },
    documentIdsByPendingKey: {
      f4136_emulsion_blending_statement: ["blender-statement-1"],
    },
  });
  assertStringIncludes(
    xml,
    "<DieselWtrBlndgRegistrationNum>M123456789</DieselWtrBlndgRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<BlndrCrUseDslWtrEmulsionQty>1000</BlndrCrUseDslWtrEmulsionQty>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="blender-statement-1" referenceDocumentName="DieselWaterFuelEmulsionBlendingStatement"',
  );
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>46</TotalFuelTaxCreditAmt>",
  );
  const [statement] = form4136EmulsionBlendingStatement.build(undefined, {
    pending: { f4136: blender },
  });
  assertStringIncludes(statement, "<DslWaterFuelEmulsionBlndgStmt>");
  assertStringIncludes(statement, "at least 14% water");
  assertStringIncludes(statement, "EPA under Clean Air Act section 211");
  assertStringIncludes(statement, "taxed at $0.244 per gallon");
  assertStringIncludes(
    statement,
    "used in the blender&apos;s trade or business",
  );
  assertThrows(
    () =>
      form4136.build(blender, {
        pending: { schedule3: { line12_fuel_tax_credit: 46 } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs a blending statement",
  );
});

Deno.test("Form 4136 XML combines line 16a fuel kinds and separates dyed kerosene", () => {
  const exporter = {
    ...activityContext,
    business: {
      ...fields.business,
      claimant_is_ultimate_purchaser: undefined,
      purchase_records_confirmed: undefined,
      export_records_confirmed: true as const,
    },
    claims: [
      {
        ...certifications,
        line: "16a" as const,
        exported_fuel_kind: "dyed_diesel" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
      {
        ...certifications,
        line: "16a" as const,
        exported_fuel_kind: "gasoline_blendstock" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
      {
        ...certifications,
        line: "16b" as const,
        exported_fuel_kind: "dyed_kerosene" as const,
        exporter_of_record_confirmed: true as const,
        excise_tax_rate_per_gallon: 0.001,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
      },
    ],
  };
  const xml = form4136.build(exporter, {
    pending: { schedule3: { line12_fuel_tax_credit: 3 } },
  });
  assertStringIncludes(
    xml,
    "<ExportedDyedDieselFuelGalsQty>2000</ExportedDyedDieselFuelGalsQty>",
  );
  assertStringIncludes(
    xml,
    "<ExportedDyedKeroseneGallonsQty>1000</ExportedDyedKeroseneGallonsQty>",
  );
  assertStringIncludes(xml, "<TotalFuelTaxCreditAmt>3</TotalFuelTaxCreditAmt>");
});

Deno.test("Form 4136 XML and buyer statement reconcile registered vendor line 6a", () => {
  const vendor = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Fuel Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "diesel dispenser",
      sales_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "6a" as const,
      unit: "gallons" as const,
      qualified_quantity: 150,
      actual_fuel_cost: 400,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UV123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      government_sales: [{
        sale_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_ein: "123456789",
        gallons: 150,
        certificate_p_record_reference: "Certificate P-2025-1",
        certificate_p_unexpired_at_claim_confirmed: true as const,
        certificate_information_believed_true: true as const,
        state_credit_card_not_used_confirmed: true as const,
        exclusive_government_use_confirmed: true as const,
      }],
    }],
  };
  const xml = form4136.build(vendor, {
    pending: { schedule3: { line12_fuel_tax_credit: 36.45 } },
  });
  assertStringIncludes(
    xml,
    "<UndyedDieselRegistrationNum>UV123456789</UndyedDieselRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<SlsUndyedDslStLclGovtGalsQty>150</SlsUndyedDslStLclGovtGalsQty>",
  );
  assertStringIncludes(
    xml,
    '<SlsUndyedDslUseStLclGovtCrAmt creditReferenceNum="360">36</SlsUndyedDslUseStLclGovtCrAmt>',
  );
  const statement = form4136DieselGovernmentSalesStatement.build(undefined, {
    pending: { f4136: vendor },
  });
  assertStringIncludes(statement, "<ToWhomDieselFuelSoldStatement>");
  assertStringIncludes(
    statement,
    "<BusinessNameLine1Txt>Example City</BusinessNameLine1Txt>",
  );
  assertStringIncludes(statement, "<EIN>123456789</EIN>");
  assertStringIncludes(statement, "<GallonsBoughtQty>150</GallonsBoughtQty>");
});

Deno.test("Form 4136 XML maps registered vendor bus sales to line 6b", () => {
  const vendor = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Bus Fuel Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "diesel dispenser",
      sales_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "6b" as const,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 2_500,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UB123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      intercity_local_bus_sales: [{
        sale_date: "2025-03-15",
        buyer_name: "Example Bus Operator",
        buyer_address: "10 Transit Lane, Wilmington, DE 19801",
        gallons: 1_000,
        certain_intercity_or_local_bus_use_confirmed: true as const,
        waiver_n: {
          kind: "single_purchase" as const,
          record_reference: "Waiver N-001",
          invoice_or_delivery_ticket_number: "INV-001",
          waived_gallons: 1_000,
          signed_by_buyer_confirmed: true as const,
          held_unexpired_when_claimed_confirmed: true as const,
        },
      }],
    }],
  };
  const xml = form4136.build(vendor, {
    pending: { schedule3: { line12_fuel_tax_credit: 170 } },
  });
  assertStringIncludes(
    xml,
    "<UndyedDieselRegistrationNum>UB123456789</UndyedDieselRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<SlsUndyedDieselUseBusGalsQty>1000</SlsUndyedDieselUseBusGalsQty>",
  );
  assertStringIncludes(
    xml,
    '<SlsUndyedDieselUseBusCrAmt creditReferenceNum="350">170</SlsUndyedDieselUseBusCrAmt>',
  );
});

Deno.test("Form 4136 XML links line 7a government kerosene buyer statement", () => {
  const vendor = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Kerosene Vendor",
      principal_activity_code: "457100",
      equipment_make: "Example",
      equipment_model: "Pump",
      equipment_type: "kerosene dispenser",
      sales_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [{
      line: "7a" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UV123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      government_sales: [{
        sale_date: "2025-06-12",
        buyer_name: "Example City",
        buyer_ein: "123456789",
        gallons: 100,
        certificate_p_record_reference: "Certificate P-2025-7",
        certificate_p_unexpired_at_claim_confirmed: true as const,
        certificate_information_believed_true: true as const,
        state_credit_card_not_used_confirmed: true as const,
        exclusive_government_use_confirmed: true as const,
      }],
    }],
  };
  const xml = form4136.build(vendor, {
    pending: { schedule3: { line12_fuel_tax_credit: 24.3 } },
    documentIdsByPendingKey: {
      f4136_kerosene_government_sales_statement: ["kerosene-buyers-1"],
    },
  });
  assertStringIncludes(
    xml,
    "<UndyedKeroseneRegistrationNum>UV123456789</UndyedKeroseneRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="kerosene-buyers-1" referenceDocumentName="ToWhomKeroseneFuelSoldStatement">100</SlsUndyedKrsnStLclGovtGalsQty>',
  );
  assertStringIncludes(
    xml,
    '<SlsUndyedKrsnBlockPumpCrAmt creditReferenceNum="346">24</SlsUndyedKrsnBlockPumpCrAmt>',
  );
  const statement = form4136KeroseneGovernmentSalesStatement.build(undefined, {
    pending: { f4136: vendor },
  });
  assertStringIncludes(statement, "<ToWhomKeroseneFuelSoldStmt>");
  assertStringIncludes(statement, "<EIN>123456789</EIN>");
  assertStringIncludes(statement, "<GallonsBoughtQty>100</GallonsBoughtQty>");
  assertThrows(
    () =>
      form4136.build(vendor, {
        pending: { schedule3: { line12_fuel_tax_credit: 24.3 } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs one kerosene buyer statement",
  );
});

Deno.test("Form 4136 XML separates line 7b blocked pump from line 7c bus sales", () => {
  const business = {
    qualifying_business_activity: true as const,
    business_name: "Example Kerosene Vendor",
    principal_activity_code: "457100",
    equipment_make: "Example",
    equipment_model: "Pump",
    equipment_type: "kerosene dispenser",
    sales_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
  };
  const base = {
    ...activityContext,
    business,
  };
  const blockedPump = {
    ...base,
    claims: [{
      line: "7b" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UP123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      blocked_pump_sales: [{
        sale_date: "2025-06-13",
        buyer_name: "Example Home Heating",
        buyer_address: "10 Main Street, Wilmington, DE 19801",
        gallons: 100,
        pump_location_reference: "Pump UP-1",
        fixed_location_confirmed: true as const,
        nontaxable_use_notice_confirmed: true as const,
        pump_access_method:
          "locked_after_each_sale_and_unlocked_only_on_request" as const,
        buyer_nontaxable_use_confirmed: true as const,
        no_reason_to_doubt_nontaxable_use_confirmed: true as const,
      }],
    }],
  };
  const blockedXml = form4136.build(blockedPump, {
    pending: { schedule3: { line12_fuel_tax_credit: 24.3 } },
  });
  assertStringIncludes(
    blockedXml,
    "<SlsUndyedKrsnBlockPumpGalsQty>100</SlsUndyedKrsnBlockPumpGalsQty>",
  );
  assertStringIncludes(
    blockedXml,
    "<UndyedKeroseneRegistrationNum>UP123456789</UndyedKeroseneRegistrationNum>",
  );
  const bus = {
    ...base,
    claims: [{
      line: "7c" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true as const,
      vendor_registration_number: "UB123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      intercity_local_bus_sales: [{
        sale_date: "2025-07-15",
        buyer_name: "Example Bus Operator",
        buyer_address: "10 Transit Lane, Wilmington, DE 19801",
        gallons: 100,
        certain_intercity_or_local_bus_use_confirmed: true as const,
        waiver_n: {
          kind: "account_period" as const,
          record_reference: "Waiver N-007",
          account_or_order_number: "BUS-2025",
          effective_date: "2025-07-01",
          expiration_date: "2026-06-30",
          signed_by_buyer_confirmed: true as const,
          held_unexpired_when_claimed_confirmed: true as const,
        },
      }],
    }],
  };
  const busXml = form4136.build(bus, {
    pending: { schedule3: { line12_fuel_tax_credit: 17 } },
  });
  assertStringIncludes(
    busXml,
    "<SlsUndyedKrsnUseBusGalsQty>100</SlsUndyedKrsnUseBusGalsQty>",
  );
  assertStringIncludes(
    busXml,
    '<SlsUndyedKrsnUseBusCrAmt creditReferenceNum="347">17</SlsUndyedKrsnUseBusCrAmt>',
  );
});

Deno.test("Form 4136 XML separates commercial aviation vendor tax rates on lines 8a and 8b", () => {
  const vendor = {
    ...activityContext,
    business: {
      qualifying_business_activity: true as const,
      business_name: "Example Aviation Vendor",
      principal_activity_code: "424720",
      equipment_make: "Example",
      equipment_model: "Fuel Truck",
      equipment_type: "aviation refueler",
      sales_records_confirmed: true as const,
      no_duplicate_excise_claim: true as const,
    },
    claims: [
      { line: "8a" as const, excise_tax_rate_per_gallon: 0.219 },
      { line: "8b" as const, excise_tax_rate_per_gallon: 0.244 },
    ].map((claim, index) => ({
      ...claim,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price" as const,
      aviation_vendor_sales: [{
        sale_record_reference: index ? "AV-002" : "AV-001",
        sale_date: index ? "2025-07-12" : "2025-06-12",
        buyer_name: "Example Airline",
        buyer_address: "10 Airport Road, Wilmington, DE 19801",
        gallons: 100,
        commercial_aviation_nonforeign_trade_confirmed: true as const,
        waiver_l: {
          kind: "single_purchase" as const,
          record_reference: index ? "Waiver L-002" : "Waiver L-001",
          invoice_or_delivery_ticket_number: index ? "AV-002" : "AV-001",
          waived_gallons: 100,
          signed_by_buyer_confirmed: true as const,
          held_unexpired_when_claimed_confirmed: true as const,
        },
      }],
    })),
  };
  const xml = form4136.build(vendor, {
    pending: { schedule3: { line12_fuel_tax_credit: 37.5 } },
  });
  assertStringIncludes(
    xml,
    "<KeroseneForAvnRegistrationNum>UA123456789</KeroseneForAvnRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<SlsKrsnUsedInAvnTxd219GalsQty>100</SlsKrsnUsedInAvnTxd219GalsQty>",
  );
  assertStringIncludes(
    xml,
    "<SlsKrsnUsedInAvnTxd244GalsQty>100</SlsKrsnUsedInAvnTxd244GalsQty>",
  );
  assertStringIncludes(
    xml,
    '<SlsKrsnUsedInAvnTxd219CrAmt creditReferenceNum="355">18</SlsKrsnUsedInAvnTxd219CrAmt>',
  );
  assertStringIncludes(
    xml,
    '<SlsKrsnUsedInAvnTxd244CrAmt creditReferenceNum="417">20</SlsKrsnUsedInAvnTxd244CrAmt>',
  );
});

Deno.test("Form 4136 XML emits nonexempt noncommercial aviation line 8c", () => {
  const xml = form4136.build({
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
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      excise_tax_rate_per_gallon: 0.244,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price",
      nonexempt_noncommercial_aviation_sales: [{
        sale_record_reference: "AV-Q-001",
        sale_date: "2025-06-12",
        buyer_name: "Example Aircraft Owner",
        buyer_address: "10 Airport Road, Wilmington, DE 19801",
        gallons: 100,
        nonexempt_noncommercial_aviation_confirmed: true,
        certificate_q: {
          kind: "single_purchase",
          record_reference: "Certificate Q-001",
          invoice_or_delivery_ticket_number: "AV-Q-001",
          certified_gallons: 100,
          signed_by_buyer_confirmed: true,
          held_unexpired_when_claimed_confirmed: true,
        },
      }],
    }],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 2.5 } } });
  assertStringIncludes(
    xml,
    "<KeroseneForAvnRegistrationNum>UA123456789</KeroseneForAvnRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<SlsKrsnNnxmptUseInAvnGalsQty>100</SlsKrsnNnxmptUseInAvnGalsQty>",
  );
  assertStringIncludes(
    xml,
    '<SlsKrsnNnxmptUseInAvnCrAmt creditReferenceNum="418">3</SlsKrsnNnxmptUseInAvnCrAmt>',
  );
});

Deno.test("Form 4136 XML separates noncommercial aviation vendor tax rates on lines 8d and 8e", () => {
  const claims = [
    { line: "8d" as const, type_of_use: "09" as const, taxRate: 0.244 },
    { line: "8e" as const, type_of_use: "10" as const, taxRate: 0.219 },
  ].map((route, index) => ({
    line: route.line,
    type_of_use: route.type_of_use,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    excise_tax_rate_per_gallon: route.taxRate,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    nontaxable_noncommercial_aviation_sales: [{
      proof_kind: "waiver_l" as const,
      sale_record_reference: `AV-${index + 1}`,
      sale_date: "2025-06-12",
      buyer_name: "Example Aircraft Operator",
      buyer_address: "10 Airport Road, Wilmington, DE 19801",
      gallons: 100,
      noncommercial_aviation_confirmed: true as const,
      type_of_use: route.type_of_use,
      waiver_l_selected_use_code: route.type_of_use,
      waiver_l: {
        kind: "single_purchase" as const,
        record_reference: `Waiver L-${index + 1}`,
        invoice_or_delivery_ticket_number: `AV-${index + 1}`,
        waived_gallons: 100,
        signed_by_buyer_confirmed: true as const,
        held_unexpired_when_claimed_confirmed: true as const,
      },
    }],
  }));
  const xml = form4136.build({
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
    claims,
  }, { pending: { schedule3: { line12_fuel_tax_credit: 46.1 } } });
  assertStringIncludes(xml, "<KrsnOthNontxTxdAt244Grp>");
  assertStringIncludes(xml, "<KrsnOthNontxTxdAt219Grp>");
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>09</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>10</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(
    xml,
    '<SlsKrsnOthNontxTxd244CrAmt creditReferenceNum="346">24</SlsKrsnOthNontxTxd244CrAmt>',
  );
  assertStringIncludes(
    xml,
    '<SlsKrsnOthNontxTxd219CrAmt creditReferenceNum="369">22</SlsKrsnOthNontxTxd219CrAmt>',
  );
});

Deno.test("Form 4136 XML links line 8f LUST credit to foreign-trade line 8d sales", () => {
  const base = {
    line: "8d" as const,
    type_of_use: "09",
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
    excise_tax_rate_per_gallon: 0.244,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    nontaxable_noncommercial_aviation_sales: [{
      proof_kind: "waiver_l" as const,
      sale_record_reference: "AV-FT-001",
      sale_date: "2025-06-12",
      buyer_name: "Example Aircraft Operator",
      buyer_address: "10 Airport Road, Wilmington, DE 19801",
      gallons: 1_000,
      noncommercial_aviation_confirmed: true as const,
      type_of_use: "09" as const,
      waiver_l_selected_use_code: "09" as const,
      waiver_l: {
        kind: "single_purchase" as const,
        record_reference: "Waiver L-FT-001",
        invoice_or_delivery_ticket_number: "AV-FT-001",
        waived_gallons: 1_000,
        signed_by_buyer_confirmed: true as const,
        held_unexpired_when_claimed_confirmed: true as const,
      },
    }],
  };
  const xml = form4136.build({
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
    claims: [base, {
      line: "8f",
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      vendor_registration_number: "UA123456789",
      vendor_tax_settlement: "tax_excluded_price",
      foreign_trade_lust_tax_paid_confirmed: true,
      foreign_trade_aviation_sale_references: ["AV-FT-001"],
    }],
  }, { pending: { schedule3: { line12_fuel_tax_credit: 244 } } });
  assertStringIncludes(xml, "<LUSTTxSlsKrsnAvnFrgnTrdGrp>");
  assertStringIncludes(
    xml,
    "<LUSTTxSlsKrsnAvnFrgnTrdGalsQty>1000</LUSTTxSlsKrsnAvnFrgnTrdGalsQty>",
  );
  assertStringIncludes(
    xml,
    '<LUSTTxSlsKrsnAvnFrgnTrdCrAmt creditReferenceNum="433">1</LUSTTxSlsKrsnAvnFrgnTrdCrAmt>',
  );
});

Deno.test("Form 4136 XML emits registered card issuer lines 13a-13c and linked high-rate statement", () => {
  const claims = ["13a", "13b", "13c"].map((line, index) =>
    fuelClaimSchema.parse({
      line,
      unit: "gallons",
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
      undyed_fuel_confirmed: true,
      excise_tax_rate_per_gallon: 0.244,
      credit_card_issuer_registration_number: "CC123456789",
      credit_card_sales: [{
        sale_record_reference: `CARD-${index + 1}`,
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
    })
  );
  const issuer = inputSchema.parse({
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
    claims,
  });
  const xml = form4136.build(issuer, {
    pending: { schedule3: { line12_fuel_tax_credit: 729 } },
    documentIdsByPendingKey: {
      f4136_credit_card_users_statement: ["card-rate-statement-1"],
    },
  });
  assertStringIncludes(
    xml,
    "<CreditCardIssrRegistrationNum>CC123456789</CreditCardIssrRegistrationNum>",
  );
  assertStringIncludes(xml, "<DslFuelSoldStLocalGovtUseGrp>");
  assertStringIncludes(xml, "<KrsnFuelSoldStLocalGovtUseGrp>");
  assertStringIncludes(
    xml,
    '<KrsnAvnSoldStLocalGovtGalsQty keroseneTaxRateCd="TAXEDAT244">1000</KrsnAvnSoldStLocalGovtGalsQty>',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="card-rate-statement-1" referenceDocumentName="NontaxableUseFuelsCreditCardUsersStatement"',
  );
  const statement = form4136CreditCardUsersStatement.build(undefined, {
    pending: { f4136: issuer },
  });
  assertStringIncludes(
    statement,
    "<LineNum>13c</LineNum><CreditRt>0.243</CreditRt>",
  );
  assertThrows(
    () =>
      form4136.build(issuer, {
        pending: { schedule3: { line12_fuel_tax_credit: 729 } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "linked credit-card-users statement",
  );
  const lowRateIssuer = {
    ...issuer,
    claims: [{ ...claims[2], excise_tax_rate_per_gallon: 0.219 }],
  };
  const lowRateXml = form4136.build(lowRateIssuer, {
    pending: { schedule3: { line12_fuel_tax_credit: 218 } },
    documentIdsByPendingKey: {},
  });
  assertStringIncludes(
    lowRateXml,
    "<KrsnAvnSoldStLocalGovtGalsQty>1000</KrsnAvnSoldStLocalGovtGalsQty>",
  );
  assertStringIncludes(
    lowRateXml,
    '<KrsnAvnSoldStLocalGovtCrAmt creditReferenceNum="369">218</KrsnAvnSoldStLocalGovtCrAmt>',
  );
  assertEquals(
    form4136CreditCardUsersStatement.build(undefined, {
      pending: { f4136: lowRateIssuer },
    }),
    "",
  );
});

Deno.test("Form 4136 XML separates other-use and exported gasoline", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 36.7 } } });
  assertStringIncludes(xml, "<OtherNontaxableUseGasolineDtl>");
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>05</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(xml, "<ExportedNontaxableUseGasGrp>");
  assertStringIncludes(
    xml,
    '<ExportedNontxUseOfGasCrAmt creditReferenceNum="411">18</ExportedNontxUseOfGasCrAmt>',
  );
});

Deno.test("Form 4136 XML maps commercial, exported, and foreign-trade aviation gasoline", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["2a", "2c", "2d"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 1_000,
      actual_fuel_cost: 3_000,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 345 } } });
  assertStringIncludes(xml, "<CommercialAviationUseGasGrp>");
  assertStringIncludes(
    xml,
    "<AviationGasolineGallonsQty>1000</AviationGasolineGallonsQty>",
  );
  assertStringIncludes(xml, "<ExportedNontaxAviationGasGrp>");
  assertStringIncludes(xml, "<LUSTTxAvnFuelFrgnTradeGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>345</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML keeps diesel train, bus, and export credits separate", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: (["3c", "3d", "3e"] as const).map((line) => ({
      ...certifications,
      line,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 65.7 } } });
  assertStringIncludes(xml, "<TrainsUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<BusesUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<ExportedUndyedDieselFuelGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>66</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML separates kerosene bus, export, and reduced-tax claims", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 67.5 } } });
  assertStringIncludes(xml, "<BusesUseUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<ExportedUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt044Grp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt219Grp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>68</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML separates aviation kerosene commercial and LUST claims", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 376 } } });
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt244Grp>");
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt219Grp>");
  assertStringIncludes(xml, "<LUSTTxKrsnAvnFrgnTrdGrp>");
  assertStringIncludes(
    xml,
    "<TotalFuelTaxCreditAmt>376</TotalFuelTaxCreditAmt>",
  );
});

Deno.test("Form 4136 XML carries variable-use aviation, kerosene, and alternative fuel groups", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: [
      {
        ...certifications,
        line: "2b",
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "4a",
        type_of_use: "02",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "5c",
        excise_tax_rate_per_gallon: 0.244,
        type_of_use: "01",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "5d",
        excise_tax_rate_per_gallon: 0.219,
        type_of_use: "01",
        unit: "gallons",
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
      {
        ...certifications,
        line: "11c",
        type_of_use: "02",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
    ],
  }, {
    pending: { schedule3: { line12_fuel_tax_credit: 126.3 } },
  });
  assertStringIncludes(xml, "<OthNontaxableAviationGasGrp>");
  assertStringIncludes(xml, "<NontaxableUseUndyedKeroseneDtl>");
  assertStringIncludes(xml, "<NontxKrsnUsedAvnTxd244Grp>");
  assertStringIncludes(xml, "<NontxKrsnUsedAvnTxd219Grp>");
  assertStringIncludes(xml, "<NontxLiquefiedPetroleumGasGrp>");
  assertStringIncludes(xml, "<NontxCompressedNaturalGasGrp>");
});

Deno.test("Form 4136 XML requires the 2025 business and actual-cost facts", () => {
  assertThrows(
    () =>
      form4136.build({ claims: fields.claims }, {
        pending: { schedule3: { line12_fuel_tax_credit: 42.6 } },
      }),
  );
  assertThrows(
    () =>
      form4136.build({
        ...fields,
        claims: [{
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 0,
        }],
      }, {
        pending: { schedule3: { line12_fuel_tax_credit: 18.3 } },
      }),
  );
});

Deno.test("Form 4136 XML covers all non-bus line 11 alternative fuels", () => {
  const lines = [
    "11a",
    "11b",
    "11c",
    "11d",
    "11e",
    "11f",
    "11g",
    "11h",
  ] as const;
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
    claims: lines.map((line) => ({
      ...certifications,
      line,
      type_of_use: "02",
      unit: line === "11a" || line === "11c"
        ? "GGE" as const
        : line === "11g"
        ? "DGE" as const
        : "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    })),
  }, { pending: { schedule3: { line12_fuel_tax_credit: 164.4 } } });
  for (
    const tag of [
      "NontxLiquefiedPetroleumGasGrp",
      "NontxPSeriesFuelsGrp",
      "NontxCompressedNaturalGasGrp",
      "NontxLiquefiedHydrogenGrp",
      "NontxLiqfdFuelFromCoalGrp",
      "NontxLiqfdFuelDerBiomassGrp",
      "NontxLiquefiedNaturalGasGrp",
      "NontxLiqfdGasDerBiomassGrp",
    ]
  ) {
    assertStringIncludes(xml, `<${tag}>`);
  }
});

Deno.test("Form 4136 XML separates reduced-rate bus use from standard use", () => {
  const xml = form4136.build({
    ...activityContext,
    business: fields.business,
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 29.2 } } });
  assertStringIncludes(xml, "<BusNontxLiquifiedPetroleumGas>");
  assertStringIncludes(xml, "<FuelTaxLocalBusCd>BUS</FuelTaxLocalBusCd>");
  assertStringIncludes(xml, "<CreditRt>0.109</CreditRt>");
  assertStringIncludes(xml, "<NontxLiquefiedPetroleumGasGrp>");
  assertStringIncludes(
    xml,
    '<NontxLiquefiedPtrlmGasCrAmt creditReferenceNum="419">29</NontxLiquefiedPtrlmGasCrAmt>',
  );
});

Deno.test("Form 4136 XML combines two activities and links both Schedule A PDFs", () => {
  const multi = {
    ...fields,
    business: { ...fields.business, business_ein: "123456789" },
    claims: [{
      ...certifications,
      line: "1a" as const,
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    }],
    additional_activities: [{
      business: {
        ...fields.business,
        business_name: "Second Activity",
        business_ein: "987654321",
      },
      claims: [{
        ...certifications,
        line: "1a" as const,
        unit: "gallons" as const,
        qualified_quantity: 50,
        actual_fuel_cost: 150,
      }],
    }],
  };
  const xml = form4136.build(multi, {
    pending: { schedule3: { line12_fuel_tax_credit: 27.45 } },
    documentIdsByPendingKey: { f4136: ["IRS4136_1"] },
    documentIdsByAttachmentFileName: {
      "Form4136ScheduleA1.pdf": "BinaryAttachment1",
      "Form4136ScheduleA2.pdf": "BinaryAttachment2",
    },
  });
  assertStringIncludes(
    xml,
    "<QlfyBusinessActivitiesCnt>2</QlfyBusinessActivitiesCnt>",
  );
  assertStringIncludes(
    xml,
    "<OffHwyBusUseGasolineGalsQty>150</OffHwyBusUseGasolineGalsQty>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment1 BinaryAttachment2"',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall"',
  );
  assertThrows(
    () =>
      form4136.build(multi, {
        pending: { schedule3: { line12_fuel_tax_credit: 27.45 } },
        documentIdsByPendingKey: { f4136: ["IRS4136_1"] },
        documentIdsByAttachmentFileName: {},
      }),
    Error,
    "Schedule A",
  );
});

Deno.test("Form 4136 XML omits business fields for home-use kerosene", () => {
  const xml = form4136.build({
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
  }, { pending: { schedule3: { line12_fuel_tax_credit: 24.3 } } });
  assertStringIncludes(
    xml,
    "<QlfyUsageFuelsEligFTCInd>true</QlfyUsageFuelsEligFTCInd>",
  );
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>08</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(xml, "<FarmPrpsUndyedKeroseneCrAmt");
  if (
    xml.includes("<QlfyBusinessActivitiesCnt>") ||
    xml.includes("<BusinessName>")
  ) {
    throw new Error("Home-use kerosene must skip Form 4136 business lines B-F");
  }
});
