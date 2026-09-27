import { assertEquals, assertThrows } from "@std/assert";
import { f4136, type Form4136Input, inputSchema } from "./index.ts";

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
} as const;
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

function compute(
  input: Pick<
    Extract<Form4136Input, { claimant_context: "business" }>,
    "business" | "claims"
  >,
) {
  return f4136.compute({ taxYear: 2025, formType: "f1040" }, {
    ...input,
    claimant_context: "business",
    additional_activities: [],
    primary_activity_has_most_credit: true,
  });
}

function parseInput(input: Record<string, unknown>) {
  return inputSchema.safeParse({
    claimant_context: "business",
    additional_activities: [],
    primary_activity_has_most_credit: true,
    ...input,
  });
}

Deno.test("Form 4136: qualified business gasoline and diesel route to refundable Schedule 3 line 12", () => {
  const result = compute({
    business,
    claims: [
      {
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "3b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 400,
      },
    ],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line12_fuel_tax_credit, 42.6);
  assertEquals(
    result.outputs[0].fields.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("Form 4136: registered vendor government diesel sales reconcile to line 6a", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Fuel Vendor",
    principal_activity_code: "457100",
    equipment_make: "Example",
    equipment_model: "Pump",
    equipment_type: "diesel dispenser",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const claim = {
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
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    36.45,
  );
  for (
    const invalidClaim of [
      { ...claim, vendor_registration_number: undefined },
      { ...claim, vendor_tax_settlement: undefined },
      { ...claim, government_sales: undefined },
      {
        ...claim,
        government_sales: [{ ...claim.government_sales[0], gallons: 149 }],
      },
      {
        ...claim,
        government_sales: [{
          ...claim.government_sales[0],
          certificate_p_record_reference: " ",
        }],
      },
      {
        ...claim,
        government_sales: [{
          ...claim.government_sales[0],
          certificate_p_unexpired_at_claim_confirmed: undefined,
        }],
      },
      {
        ...claim,
        government_sales: [{
          ...claim.government_sales[0],
          state_credit_card_not_used_confirmed: undefined,
        }],
      },
      {
        ...claim,
        government_sales: [{
          ...claim.government_sales[0],
          exclusive_government_use_confirmed: undefined,
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalidClaim] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: { ...vendorBusiness, sales_records_confirmed: undefined },
      claims: [claim],
    }).success,
    false,
  );
});

Deno.test("Form 4136: registered blender line 15a uses taxed input diesel gallons", () => {
  const blenderBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Emulsion Blender",
    principal_activity_code: "324110",
    equipment_make: "Example",
    equipment_model: "Mixer",
    equipment_type: "fuel blender",
    production_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const claim = {
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
  };
  assertEquals(
    parseInput({ business: blenderBusiness, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business: blenderBusiness, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    46,
  );
  for (
    const invalidClaim of [
      { ...claim, blender_registration_number: undefined },
      { ...claim, blender_produced_confirmed: undefined },
      { ...claim, blender_input_diesel_gallons: 999 },
      { ...claim, blender_trade_or_business_disposition: undefined },
      { ...claim, emulsion_water_percentage: 13.9 },
      { ...claim, emulsion_epa_additive_record_reference: undefined },
      { ...claim, excise_tax_rate_per_gallon: 0.001 },
      { ...claim, undyed_fuel_confirmed: undefined },
    ]
  ) {
    assertEquals(
      parseInput({ business: blenderBusiness, claims: [invalidClaim] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: { ...blenderBusiness, production_records_confirmed: undefined },
      claims: [claim],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business: blenderBusiness,
      claims: [claim],
      additional_activities: [{
        business: blenderBusiness,
        claims: [{
          ...claim,
          qualified_quantity: 500,
          blender_input_diesel_gallons: 500,
          blender_registration_number: "M987654321",
        }],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: registered vendor line 6b reconciles bus sales and Model Waiver N", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Bus Fuel Vendor",
    principal_activity_code: "457100",
    equipment_make: "Example",
    equipment_model: "Pump",
    equipment_type: "diesel dispenser",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const singleSale = {
    sale_date: "2025-03-15",
    buyer_name: "Example Bus Operator",
    buyer_address: "10 Transit Lane, Wilmington, DE 19801",
    gallons: 600,
    certain_intercity_or_local_bus_use_confirmed: true as const,
    waiver_n: {
      kind: "single_purchase" as const,
      record_reference: "Waiver N-001",
      invoice_or_delivery_ticket_number: "INV-001",
      waived_gallons: 600,
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  const accountSale = {
    ...singleSale,
    sale_date: "2025-07-15",
    gallons: 400,
    waiver_n: {
      kind: "account_period" as const,
      record_reference: "Waiver N-002",
      account_or_order_number: "BUS-2025",
      effective_date: "2025-07-01",
      expiration_date: "2026-06-30",
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  const claim = {
    line: "6b" as const,
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 2_500,
    undyed_fuel_confirmed: true as const,
    vendor_registration_number: "UB123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    intercity_local_bus_sales: [singleSale, accountSale],
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    170,
  );
  for (
    const invalidClaim of [
      { ...claim, vendor_registration_number: "UV123456789" },
      { ...claim, vendor_tax_settlement: undefined },
      { ...claim, intercity_local_bus_sales: [singleSale] },
      {
        ...claim,
        intercity_local_bus_sales: [{
          ...singleSale,
          certain_intercity_or_local_bus_use_confirmed: undefined,
        }, accountSale],
      },
      {
        ...claim,
        intercity_local_bus_sales: [{
          ...singleSale,
          waiver_n: { ...singleSale.waiver_n, waived_gallons: 599 },
        }, accountSale],
      },
      {
        ...claim,
        intercity_local_bus_sales: [{
          ...singleSale,
          waiver_n: {
            ...singleSale.waiver_n,
            held_unexpired_when_claimed_confirmed: undefined,
          },
        }, accountSale],
      },
      {
        ...claim,
        intercity_local_bus_sales: [singleSale, {
          ...accountSale,
          waiver_n: { ...accountSale.waiver_n, expiration_date: "2025-07-14" },
        }],
      },
      {
        ...claim,
        intercity_local_bus_sales: [singleSale, {
          ...accountSale,
          waiver_n: { ...accountSale.waiver_n, expiration_date: "2026-07-02" },
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalidClaim] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: { ...vendorBusiness, sales_records_confirmed: undefined },
      claims: [claim],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [claim],
      additional_activities: [{
        business: vendorBusiness,
        claims: [{
          ...claim,
          qualified_quantity: 600,
          vendor_registration_number: "UB987654321",
          intercity_local_bus_sales: [singleSale],
        }],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: registered kerosene vendors use distinct line 7 source routes", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Kerosene Vendor",
    principal_activity_code: "457100",
    equipment_make: "Example",
    equipment_model: "Pump",
    equipment_type: "kerosene dispenser",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const base = {
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    undyed_fuel_confirmed: true as const,
    vendor_tax_settlement: "tax_excluded_price" as const,
  };
  const government = {
    ...base,
    line: "7a" as const,
    vendor_registration_number: "UV123456789",
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
  };
  const smallSale = {
    sale_date: "2025-06-13",
    gallons: 4,
    pump_location_reference: "Pump UP-1",
    fixed_location_confirmed: true as const,
    nontaxable_use_notice_confirmed: true as const,
    pump_access_method: "cannot_fuel_highway_vehicle_or_train" as const,
    buyer_nontaxable_use_confirmed: true as const,
    no_reason_to_doubt_nontaxable_use_confirmed: true as const,
  };
  const blockedPump = {
    ...base,
    line: "7b" as const,
    vendor_registration_number: "UP123456789",
    blocked_pump_sales: [smallSale, {
      ...smallSale,
      sale_date: "2025-06-14",
      buyer_name: "Example Home Heating",
      buyer_address: "10 Main Street, Wilmington, DE 19801",
      gallons: 96,
      pump_access_method:
        "locked_after_each_sale_and_unlocked_only_on_request" as const,
    }],
  };
  const bus = {
    ...base,
    line: "7c" as const,
    vendor_registration_number: "UB123456789",
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
  };
  for (
    const [claim, credit] of [
      [government, 24.3],
      [blockedPump, 24.3],
      [bus, 17],
    ] as const
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [claim] }).success,
      true,
    );
    assertEquals(
      compute({ business: vendorBusiness, claims: [claim] }).outputs[0].fields
        .line12_fuel_tax_credit,
      credit,
    );
  }
  for (
    const invalid of [
      { ...government, vendor_registration_number: "UP123456789" },
      {
        ...government,
        government_sales: [{
          ...government.government_sales[0],
          state_credit_card_not_used_confirmed: undefined,
        }],
      },
      { ...blockedPump, vendor_registration_number: "UV123456789" },
      {
        ...blockedPump,
        blocked_pump_sales: [smallSale, {
          ...blockedPump.blocked_pump_sales[1],
          buyer_address: undefined,
        }],
      },
      {
        ...blockedPump,
        blocked_pump_sales: [{
          ...smallSale,
          nontaxable_use_notice_confirmed: undefined,
        }, blockedPump.blocked_pump_sales[1]],
      },
      { ...bus, vendor_registration_number: "UP123456789" },
      { ...bus, intercity_local_bus_sales: undefined },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalid] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [government, blockedPump] })
      .success,
    false,
  );
});

Deno.test("Form 4136: commercial aviation vendor lines 8a and 8b require Model Waiver L", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Aviation Vendor",
    principal_activity_code: "424720",
    equipment_make: "Example",
    equipment_model: "Fuel Truck",
    equipment_type: "aviation refueler",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const sale = {
    sale_record_reference: "AV-001",
    sale_date: "2025-06-12",
    buyer_name: "Example Airline",
    buyer_address: "10 Airport Road, Wilmington, DE 19801",
    gallons: 100,
    commercial_aviation_nonforeign_trade_confirmed: true as const,
    waiver_l: {
      kind: "single_purchase" as const,
      record_reference: "Waiver L-001",
      invoice_or_delivery_ticket_number: "AV-001",
      waived_gallons: 100,
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  const base = {
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    aviation_vendor_sales: [sale],
  };
  const lowTax = {
    ...base,
    line: "8a" as const,
    excise_tax_rate_per_gallon: 0.219,
  };
  const standardTax = {
    ...base,
    line: "8b" as const,
    excise_tax_rate_per_gallon: 0.244,
    aviation_vendor_sales: [{
      ...sale,
      sale_record_reference: "AV-002",
      sale_date: "2025-07-15",
      waiver_l: {
        kind: "account_period" as const,
        record_reference: "Waiver L-002",
        account_or_order_number: "AIR-2025",
        effective_date: "2025-07-01",
        expiration_date: "2026-06-30",
        signed_by_buyer_confirmed: true as const,
        held_unexpired_when_claimed_confirmed: true as const,
      },
    }],
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [lowTax, standardTax] })
      .success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [lowTax, standardTax] })
      .outputs[0].fields
      .line12_fuel_tax_credit,
    37.5,
  );
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [lowTax, {
        ...standardTax,
        aviation_vendor_sales: [{
          ...standardTax.aviation_vendor_sales[0],
          sale_record_reference: "AV-001",
        }],
      }],
    }).success,
    false,
  );
  for (
    const invalid of [
      { ...lowTax, vendor_registration_number: "UV123456789" },
      { ...lowTax, excise_tax_rate_per_gallon: 0.244 },
      { ...lowTax, vendor_tax_settlement: undefined },
      { ...lowTax, aviation_vendor_sales: [] },
      {
        ...lowTax,
        aviation_vendor_sales: [{
          ...sale,
          waiver_l: { ...sale.waiver_l, waived_gallons: 99 },
        }],
      },
      {
        ...standardTax,
        aviation_vendor_sales: [{
          ...standardTax.aviation_vendor_sales[0],
          waiver_l: {
            ...standardTax.aviation_vendor_sales[0].waiver_l,
            expiration_date: "2025-07-14",
          },
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalid] }).success,
      false,
    );
  }
});

Deno.test("Form 4136: nonexempt noncommercial aviation line 8c requires Certificate Q", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Aviation Vendor",
    principal_activity_code: "424720",
    equipment_make: "Example",
    equipment_model: "Fuel Truck",
    equipment_type: "aviation refueler",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const sale = {
    sale_record_reference: "AV-Q-001",
    sale_date: "2025-06-12",
    buyer_name: "Example Aircraft Owner",
    buyer_address: "10 Airport Road, Wilmington, DE 19801",
    gallons: 100,
    nonexempt_noncommercial_aviation_confirmed: true as const,
    certificate_q: {
      kind: "single_purchase" as const,
      record_reference: "Certificate Q-001",
      invoice_or_delivery_ticket_number: "AV-Q-001",
      certified_gallons: 100,
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  const claim = {
    line: "8c" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    excise_tax_rate_per_gallon: 0.244,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    nonexempt_noncommercial_aviation_sales: [sale],
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    2.5,
  );
  const accountSale = {
    ...sale,
    sale_record_reference: "AV-Q-002",
    certificate_q: {
      kind: "account_period" as const,
      record_reference: "Certificate Q-002",
      account_or_order_number: "ACCT-1",
      effective_date: "2025-01-01",
      expiration_date: "2025-12-31",
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [{
        ...claim,
        nonexempt_noncommercial_aviation_sales: [accountSale],
      }],
    }).success,
    true,
  );
  for (
    const invalid of [
      { ...claim, vendor_registration_number: "UV123456789" },
      { ...claim, vendor_tax_settlement: undefined },
      { ...claim, excise_tax_rate_per_gallon: 0.219 },
      { ...claim, nonexempt_noncommercial_aviation_sales: [] },
      {
        ...claim,
        nonexempt_noncommercial_aviation_sales: [{ ...sale, gallons: 99 }],
      },
      {
        ...claim,
        nonexempt_noncommercial_aviation_sales: [{
          ...sale,
          certificate_q: { ...sale.certificate_q, certified_gallons: 99 },
        }],
      },
      {
        ...claim,
        nonexempt_noncommercial_aviation_sales: [{
          ...sale,
          certificate_q: {
            ...sale.certificate_q,
            held_unexpired_when_claimed_confirmed: undefined,
          },
        }],
      },
      {
        ...claim,
        nonexempt_noncommercial_aviation_sales: [{
          ...sale,
          certificate_q: {
            kind: "account_period",
            record_reference: "Certificate Q-002",
            account_or_order_number: "ACCT-1",
            effective_date: "2025-07-01",
            expiration_date: "2026-06-30",
            signed_by_buyer_confirmed: true,
            held_unexpired_when_claimed_confirmed: true,
          },
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalid] }).success,
      false,
    );
  }
});

Deno.test("Form 4136: noncommercial aviation lines 8d and 8e separate Waiver L from government Certificate P", () => {
  const vendorBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Aviation Vendor",
    principal_activity_code: "424720",
    equipment_make: "Example",
    equipment_model: "Fuel Truck",
    equipment_type: "aviation refueler",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const waiverSale = {
    proof_kind: "waiver_l" as const,
    sale_record_reference: "AV-09-001",
    sale_date: "2025-06-12",
    buyer_name: "Example Aircraft Operator",
    buyer_address: "10 Airport Road, Wilmington, DE 19801",
    gallons: 100,
    noncommercial_aviation_confirmed: true as const,
    type_of_use: "09" as const,
    waiver_l_selected_use_code: "09" as const,
    waiver_l: {
      kind: "single_purchase" as const,
      record_reference: "Waiver L-09-001",
      invoice_or_delivery_ticket_number: "AV-09-001",
      waived_gallons: 100,
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
    },
  };
  const waiverClaim = {
    line: "8d" as const,
    type_of_use: "09",
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    excise_tax_rate_per_gallon: 0.244,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    nontaxable_noncommercial_aviation_sales: [waiverSale],
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [waiverClaim] }).success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [waiverClaim] }).outputs[0]
      .fields.line12_fuel_tax_credit,
    24.3,
  );
  const secondWaiverClaim = {
    ...waiverClaim,
    type_of_use: "10",
    nontaxable_noncommercial_aviation_sales: [{
      ...waiverSale,
      sale_record_reference: "AV-10-001",
      type_of_use: "10" as const,
      waiver_l_selected_use_code: "10" as const,
      waiver_l: {
        kind: "account_period" as const,
        record_reference: "Waiver L-10-001",
        account_or_order_number: "ACCT-10",
        effective_date: "2025-01-01",
        expiration_date: "2025-12-31",
        signed_by_buyer_confirmed: true as const,
        held_unexpired_when_claimed_confirmed: true as const,
      },
    }],
  };
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [waiverClaim, secondWaiverClaim],
    }).success,
    true,
  );
  assertEquals(
    compute({
      business: vendorBusiness,
      claims: [waiverClaim, secondWaiverClaim],
    })
      .outputs[0].fields.line12_fuel_tax_credit,
    48.6,
  );
  const governmentSale = {
    proof_kind: "certificate_p" as const,
    sale_record_reference: "AV-GOV-001",
    sale_date: "2025-06-12",
    buyer_name: "Example City",
    buyer_address: "20 City Hall Road, Wilmington, DE 19801",
    buyer_ein: "123456789",
    gallons: 100,
    noncommercial_aviation_confirmed: true as const,
    type_of_use: "14" as const,
    certificate_p_record_reference: "Certificate P-001",
    certificate_p_unexpired_at_claim_confirmed: true as const,
    certificate_information_believed_true: true as const,
    state_credit_card_not_used_confirmed: true as const,
    exclusive_government_use_confirmed: true as const,
  };
  const governmentClaim = {
    ...waiverClaim,
    line: "8e" as const,
    type_of_use: "14",
    excise_tax_rate_per_gallon: 0.219,
    vendor_registration_number: "UV123456789",
    nontaxable_noncommercial_aviation_sales: [governmentSale],
  };
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [governmentClaim] }).success,
    true,
  );
  assertEquals(
    compute({ business: vendorBusiness, claims: [governmentClaim] }).outputs[0]
      .fields.line12_fuel_tax_credit,
    21.8,
  );
  for (
    const invalid of [
      { ...waiverClaim, vendor_registration_number: "UV123456789" },
      { ...waiverClaim, vendor_tax_settlement: undefined },
      { ...waiverClaim, excise_tax_rate_per_gallon: 0.219 },
      {
        ...waiverClaim,
        nontaxable_noncommercial_aviation_sales: [{
          ...waiverSale,
          type_of_use: "10",
        }],
      },
      {
        ...waiverClaim,
        nontaxable_noncommercial_aviation_sales: [{
          ...waiverSale,
          waiver_l_selected_use_code: "10",
        }],
      },
      {
        ...waiverClaim,
        nontaxable_noncommercial_aviation_sales: [{
          ...waiverSale,
          waiver_l: { ...waiverSale.waiver_l, waived_gallons: 99 },
        }],
      },
      { ...waiverClaim, nontaxable_noncommercial_aviation_sales: [] },
      { ...governmentClaim, vendor_registration_number: "UA123456789" },
      {
        ...governmentClaim,
        nontaxable_noncommercial_aviation_sales: [{
          ...governmentSale,
          certificate_p_record_reference: " ",
        }],
      },
      {
        ...governmentClaim,
        nontaxable_noncommercial_aviation_sales: [{
          ...governmentSale,
          state_credit_card_not_used_confirmed: undefined,
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [invalid] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [waiverClaim, governmentClaim],
    }).success,
    false,
  );
  const foreignTradeClaim = {
    line: "8f" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price" as const,
    foreign_trade_lust_tax_paid_confirmed: true as const,
    foreign_trade_aviation_sale_references: ["AV-09-001"],
  };
  assertEquals(
    parseInput({
      business: vendorBusiness,
      claims: [waiverClaim, foreignTradeClaim],
    }).success,
    true,
  );
  assertEquals(
    compute({
      business: vendorBusiness,
      claims: [waiverClaim, foreignTradeClaim],
    })
      .outputs[0].fields.line12_fuel_tax_credit,
    24.4,
  );
  for (
    const invalid of [
      {
        ...foreignTradeClaim,
        foreign_trade_lust_tax_paid_confirmed: undefined,
      },
      {
        ...foreignTradeClaim,
        foreign_trade_aviation_sale_references: ["AV-OTHER"],
      },
      {
        ...foreignTradeClaim,
        foreign_trade_aviation_sale_references: ["AV-09-001", "AV-09-001"],
      },
      { ...foreignTradeClaim, qualified_quantity: 99 },
      { ...foreignTradeClaim, actual_fuel_cost: 299 },
      { ...foreignTradeClaim, vendor_registration_number: "UA987654321" },
      {
        ...foreignTradeClaim,
        vendor_tax_settlement: "tax_repaid_to_buyer" as const,
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: vendorBusiness, claims: [waiverClaim, invalid] })
        .success,
      false,
    );
  }
  assertEquals(
    parseInput({ business: vendorBusiness, claims: [foreignTradeClaim] })
      .success,
    false,
  );
});

Deno.test("Form 4136: registered card issuer lines 13a-13c require matched government purchases and Certificate R", () => {
  const issuerBusiness = {
    qualifying_business_activity: true,
    business_name: "Example Card Issuer",
    business_ein: "987654321",
    principal_activity_code: "522210",
    equipment_make: "Payment",
    equipment_model: "Card Network",
    equipment_type: "fleet card platform",
    sales_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const sale = {
    sale_record_reference: "CARD-001",
    purchase_date: "2025-06-12",
    buyer_name: "Example City",
    buyer_address: "20 City Hall Road, Wilmington, DE 19801",
    buyer_ein: "123456789",
    card_account_number: "CITY-2025",
    gallons: 1_000,
    actual_fuel_cost: 3_000,
    card_issued_to_government_buyer_confirmed: true as const,
    exclusive_government_use_confirmed: true as const,
    buyer_tax_arrangement: "tax_not_collected" as const,
    vendor_tax_arrangement: "tax_repaid" as const,
    certificate_r: {
      record_reference: "Certificate R-001",
      account_number: "CITY-2025",
      effective_date: "2025-01-01",
      expiration_date: "2026-12-31",
      signed_by_buyer_confirmed: true as const,
      held_unexpired_when_claimed_confirmed: true as const,
      information_believed_true_confirmed: true as const,
    },
  };
  const base = {
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
    credit_card_issuer_registration_number: "CC123456789",
    excise_tax_rate_per_gallon: 0.244,
    credit_card_sales: [sale],
  };
  for (const line of ["13a", "13b"] as const) {
    const claim = { ...base, line, undyed_fuel_confirmed: true as const };
    assertEquals(
      parseInput({ business: issuerBusiness, claims: [claim] }).success,
      true,
    );
    assertEquals(
      compute({ business: issuerBusiness, claims: [claim] }).outputs[0].fields
        .line12_fuel_tax_credit,
      243,
    );
  }
  for (const [rate, expected] of [[0.219, 218], [0.244, 243]] as const) {
    const claim = {
      ...base,
      line: "13c" as const,
      excise_tax_rate_per_gallon: rate,
    };
    assertEquals(
      parseInput({ business: issuerBusiness, claims: [claim] }).success,
      true,
    );
    assertEquals(
      compute({ business: issuerBusiness, claims: [claim] }).outputs[0].fields
        .line12_fuel_tax_credit,
      expected,
    );
  }
  const dieselClaim = {
    ...base,
    line: "13a" as const,
    undyed_fuel_confirmed: true as const,
  };
  for (
    const invalid of [
      { ...dieselClaim, credit_card_issuer_registration_number: "UV123456789" },
      { ...dieselClaim, undyed_fuel_confirmed: undefined },
      { ...dieselClaim, excise_tax_rate_per_gallon: 0.219 },
      { ...dieselClaim, credit_card_sales: [{ ...sale, gallons: 999 }] },
      {
        ...dieselClaim,
        credit_card_sales: [{ ...sale, actual_fuel_cost: 2_999 }],
      },
      {
        ...dieselClaim,
        credit_card_sales: [{ ...sale, card_account_number: "OTHER" }],
      },
      {
        ...dieselClaim,
        credit_card_sales: [{ ...sale, buyer_tax_arrangement: undefined }],
      },
      {
        ...dieselClaim,
        credit_card_sales: [{ ...sale, vendor_tax_arrangement: undefined }],
      },
      {
        ...dieselClaim,
        credit_card_sales: [{
          ...sale,
          certificate_r: {
            ...sale.certificate_r,
            expiration_date: "2027-01-02",
          },
        }],
      },
      {
        ...dieselClaim,
        credit_card_sales: [{
          ...sale,
          certificate_r: {
            ...sale.certificate_r,
            information_believed_true_confirmed: undefined,
          },
        }],
      },
    ]
  ) {
    assertEquals(
      parseInput({ business: issuerBusiness, claims: [invalid] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: issuerBusiness,
      claims: [dieselClaim, { ...dieselClaim, line: "13b" }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business: issuerBusiness,
      claims: [{ ...base, line: "13c", excise_tax_rate_per_gallon: 0.219 }, {
        ...base,
        line: "13c",
        excise_tax_rate_per_gallon: 0.244,
      }],
    }).success,
    false,
  );
  const secondSale = {
    ...sale,
    sale_record_reference: "CARD-002",
    gallons: 500,
    actual_fuel_cost: 1_500,
  };
  const secondActivity = {
    business: {
      ...issuerBusiness,
      business_name: "Example Card Issuer East",
    },
    claims: [{
      ...dieselClaim,
      qualified_quantity: 500,
      actual_fuel_cost: 1_500,
      credit_card_sales: [secondSale],
    }],
  };
  assertEquals(
    parseInput({
      business: issuerBusiness,
      claims: [dieselClaim],
      additional_activities: [secondActivity],
    }).success,
    true,
  );
  const duplicateAcrossActivities = parseInput({
    business: issuerBusiness,
    claims: [dieselClaim],
    additional_activities: [{
      ...secondActivity,
      claims: [{
        ...secondActivity.claims[0],
        credit_card_sales: [{
          ...secondSale,
          sale_record_reference: "CARD-001",
        }],
      }],
    }],
  });
  assertEquals(duplicateAcrossActivities.success, false);
  if (!duplicateAcrossActivities.success) {
    assertEquals(
      duplicateAcrossActivities.error.issues.some((issue) =>
        issue.path.join(".") ===
          "additional_activities.0.claims.0.credit_card_sales.0.sale_record_reference"
      ),
      true,
    );
  }
  assertEquals(
    parseInput({
      business: issuerBusiness,
      claims: [{ ...base, line: "13c", excise_tax_rate_per_gallon: 0.219 }],
      additional_activities: [{
        ...secondActivity,
        claims: [{
          ...secondActivity.claims[0],
          line: "13c",
          excise_tax_rate_per_gallon: 0.244,
        }],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: represented 2025 Part II rates are line-specific", () => {
  const cases = [
    ["1a", undefined, 18.3],
    ["1b", undefined, 18.3],
    ["1c", "05", 18.3],
    ["1d", undefined, 18.4],
    ["2a", undefined, 15],
    ["2b", "01", 19.3],
    ["2c", undefined, 19.4],
    ["2d", undefined, 0.1],
    ["3a", "02", 24.3],
    ["3b", undefined, 24.3],
    ["3c", undefined, 24.3],
    ["3d", undefined, 17],
    ["3e", undefined, 24.4],
    ["4a", "02", 24.3],
    ["4b", undefined, 24.3],
    ["4c", undefined, 17],
    ["4d", undefined, 24.4],
    ["4e", "02", 4.3],
    ["4f", "02", 21.8],
    ["5a", undefined, 20],
    ["5b", undefined, 17.5],
    ["5c", "01", 24.3],
    ["5d", "01", 21.8],
    ["5e", undefined, 0.1],
    ["11a", "02", 18.3],
    ["11b", "02", 18.3],
    ["11c", "02", 18.3],
    ["11d", "02", 18.3],
    ["11e", "02", 24.3],
    ["11f", "02", 24.3],
    ["11g", "02", 24.3],
    ["11h", "02", 18.3],
    ["14a", "02", 19.7],
    ["14a", "05", 12.4],
    ["14b", undefined, 19.8],
  ] as const;
  for (const [line, type_of_use, expected] of cases) {
    const result = compute({
      business,
      claims: [{
        ...certifications,
        line,
        type_of_use,
        unit: line === "11a" || line === "11c"
          ? "GGE"
          : line === "11g"
          ? "DGE"
          : "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 200,
        excise_tax_rate_per_gallon: line === "4e"
          ? 0.044
          : line === "4f" || line === "5b" || line === "5d"
          ? 0.219
          : line === "5a" || line === "5c"
          ? 0.244
          : undefined,
      }],
    });
    assertEquals(result.outputs[0].fields.line12_fuel_tax_credit, expected);
  }
});

Deno.test("Form 4136: diesel-water emulsion use and export require distinct source facts", () => {
  const useClaim = {
    ...certifications,
    line: "14a" as const,
    type_of_use: "02",
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 250,
  };
  assertEquals(parseInput({ business, claims: [useClaim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...useClaim, emulsion_water_percentage: 13.9 }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...useClaim,
        emulsion_epa_additive_record_reference: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({ business, claims: [{ ...useClaim, type_of_use: "09" }] })
      .success,
    false,
  );
  const exportClaim = {
    ...useClaim,
    line: "14b" as const,
    type_of_use: undefined,
  };
  assertEquals(parseInput({ business, claims: [exportClaim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...exportClaim, export_proof: undefined }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: exporter line 16 distinguishes dyed fuel and gasoline blendstock", () => {
  const exporterBusiness = {
    ...business,
    claimant_is_ultimate_purchaser: undefined,
    purchase_records_confirmed: undefined,
    export_records_confirmed: true as const,
  };
  const base = {
    ...certifications,
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 2_500,
    exporter_of_record_confirmed: true as const,
    excise_tax_rate_per_gallon: 0.001,
  };
  const claims = [
    {
      ...base,
      line: "16a" as const,
      exported_fuel_kind: "dyed_diesel" as const,
    },
    {
      ...base,
      line: "16a" as const,
      exported_fuel_kind: "gasoline_blendstock" as const,
    },
    {
      ...base,
      line: "16b" as const,
      exported_fuel_kind: "dyed_kerosene" as const,
    },
  ];
  assertEquals(
    parseInput({ business: exporterBusiness, claims }).success,
    true,
  );
  assertEquals(
    compute({ business: exporterBusiness, claims }).outputs[0].fields
      .line12_fuel_tax_credit,
    3,
  );
  for (
    const invalid of [
      { ...claims[0], exported_fuel_kind: "dyed_kerosene" },
      { ...claims[0], exporter_of_record_confirmed: undefined },
      { ...claims[0], excise_tax_rate_per_gallon: 0.244 },
      { ...claims[0], export_proof: undefined },
    ]
  ) {
    assertEquals(
      parseInput({ business: exporterBusiness, claims: [invalid] }).success,
      false,
    );
  }
  assertEquals(
    parseInput({
      business: { ...exporterBusiness, export_records_confirmed: undefined },
      claims: [claims[0]],
    }).success,
    false,
  );
});

Deno.test("Form 4136: kerosene bus, export, and reduced-tax claims require distinct proof", () => {
  const claim = {
    ...certifications,
    line: "4e" as const,
    type_of_use: "02",
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    excise_tax_rate_per_gallon: 0.044,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, excise_tax_rate_per_gallon: 0.219 }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, type_of_use: "08" }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "4c",
        type_of_use: undefined,
        certain_intercity_or_local_bus_use_confirmed: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "4d",
        type_of_use: undefined,
        export_proof: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: diesel train, bus, and export claims require distinct proof", () => {
  const claim = {
    ...certifications,
    line: "3c" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, train_use_confirmed: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "3d",
        certain_intercity_or_local_bus_use_confirmed: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "3d", right_to_claim_not_waived: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "3e", export_proof: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "3e", undyed_fuel_confirmed: undefined }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: commercial aviation, export, and foreign-trade LUST facts are required", () => {
  const claim = {
    ...certifications,
    line: "2a" as const,
    unit: "gallons" as const,
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        commercial_aviation_nonforeign_trade_confirmed: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "2c",
        export_proof: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "2d",
        foreign_trade_lust_tax_paid_confirmed: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: other-use and exported gasoline require their source confirmations", () => {
  const claim = {
    ...certifications,
    line: "1c" as const,
    type_of_use: "13",
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, not_noncommercial_motorboat: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        credit_card_issuer_certificate_not_provided: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, right_to_claim_not_waived: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "1d", type_of_use: undefined }],
    }).success,
    true,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "1d",
        type_of_use: undefined,
        export_proof: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: gasoline motorboat and aviation propulsion exclusions are enforced", () => {
  const gasoline = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(parseInput({ business, claims: [gasoline] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...gasoline, not_noncommercial_motorboat: undefined }],
    }).success,
    false,
  );
  const aviation = {
    ...certifications,
    line: "2b" as const,
    type_of_use: "01",
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(parseInput({ business, claims: [aviation] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...aviation,
        aviation_gasoline_outside_propulsion_confirmed: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: exported claims require an identifiable IRS-accepted proof record", () => {
  const claim = {
    ...certifications,
    line: "1d" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({ business, claims: [{ ...claim, export_proof: undefined }] })
      .success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        export_proof: {
          kind: "carrier_bill_of_lading",
          record_reference: "  ",
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        export_proof: {
          kind: "self_attestation",
          record_reference: "Export file 2025-001",
        },
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: aviation kerosene requires rate, use, and no-waiver proof", () => {
  const claim = {
    ...certifications,
    line: "5a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    excise_tax_rate_per_gallon: 0.244,
  };
  assertEquals(parseInput({ business, claims: [claim] }).success, true);
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, excise_tax_rate_per_gallon: 0.219 }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        commercial_aviation_nonforeign_trade_confirmed: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, right_to_claim_not_waived: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...claim,
        line: "5e",
        excise_tax_rate_per_gallon: undefined,
        foreign_trade_lust_tax_paid_confirmed: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: credit rounds to cents", () => {
  assertEquals(
    compute({
      business,
      claims: [{
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 1,
        actual_fuel_cost: 3,
      }],
    }).outputs[0].fields.line12_fuel_tax_credit,
    0.18,
  );
});

Deno.test("Form 4136: eligibility, costs, use codes, and duplicate claims are required", () => {
  const claim = {
    ...certifications,
    line: "3a",
    type_of_use: "02",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  } as const;
  assertEquals(parseInput({ claims: [claim] }).success, false);
  assertEquals(
    parseInput({
      business: { ...business, claimant_is_ultimate_purchaser: false },
      claims: [claim],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [claim],
      primary_activity_has_most_credit: false,
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, actual_fuel_cost: 0 }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, type_of_use: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({ business, claims: [claim, claim] }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, undyed_fuel_confirmed: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, not_highway_vehicle: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, unit: "GGE" }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        business,
        claims: [{ ...claim, unit: "gallons", qualified_quantity: -1 }],
      }),
    Error,
  );
});

Deno.test("Form 4136: aviation claims require no-waiver and credit-card certifications", () => {
  const aviation = {
    ...certifications,
    line: "2b" as const,
    type_of_use: "13",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    parseInput({ business, claims: [aviation] }).success,
    true,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...aviation, right_to_claim_not_waived: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...aviation,
        credit_card_issuer_certificate_not_provided: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...aviation,
        line: "5c",
        type_of_use: "01",
        excise_tax_rate_per_gallon: 0.244,
        right_to_claim_not_waived: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: line 11 retains an explicit equivalent-fuel unit", () => {
  const claim = {
    ...certifications,
    line: "11c" as const,
    type_of_use: "02",
    unit: "DGE" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    parseInput({ business, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    18.3,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "3a" }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: line 11 bus claims use reduced rates and required units", () => {
  const cases = [
    ["11a", "GGE", 10.9],
    ["11b", "gallons", 11],
    ["11c", "GGE", 10.9],
    ["11d", "gallons", 11],
    ["11e", "gallons", 17],
    ["11f", "gallons", 17],
    ["11g", "DGE", 16.9],
    ["11h", "gallons", 11],
  ] as const;
  for (const [line, unit, expected] of cases) {
    const claim = {
      ...certifications,
      line,
      type_of_use: "05",
      unit,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    } as const;
    assertEquals(
      parseInput({ business, claims: [claim] }).success,
      true,
    );
    assertEquals(
      compute({ business, claims: [claim] }).outputs[0].fields
        .line12_fuel_tax_credit,
      expected,
    );
    assertEquals(
      parseInput({
        business,
        claims: [{ ...claim, unit: "gallons" }],
      }).success,
      unit === "gallons",
    );
  }
});

Deno.test("Form 4136: separate business activities combine credit without merging claim validation", () => {
  const claim = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  const input = {
    claimant_context: "business" as const,
    business: { ...business, business_ein: "123456789" },
    claims: [claim],
    additional_activities: [{
      business: {
        ...business,
        business_name: "Second Business",
        business_ein: "987654321",
      },
      claims: [{ ...claim, qualified_quantity: 50 }],
    }],
    primary_activity_has_most_credit: true as const,
  };
  assertEquals(inputSchema.safeParse(input).success, true);
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    27.45,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      additional_activities: [{
        ...input.additional_activities[0],
        claims: [claim, claim],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: claim cents on separate Schedules A add to the parent credit", () => {
  const claim = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 1,
    actual_fuel_cost: 3,
  };
  const input = {
    claimant_context: "business" as const,
    business,
    claims: [claim],
    additional_activities: [{
      business: { ...business, business_name: "Second Activity" },
      claims: [claim],
    }],
    primary_activity_has_most_credit: true as const,
  };
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    0.36,
  );
});

Deno.test("Form 4136: primary activity is selected by credit, not gallons", () => {
  const gasoline = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  const diesel = {
    ...certifications,
    line: "3b" as const,
    unit: "gallons" as const,
    qualified_quantity: 80,
    actual_fuel_cost: 300,
  };
  const input = {
    claimant_context: "business" as const,
    business,
    claims: [gasoline],
    additional_activities: [{
      business: { ...business, business_name: "Diesel Activity" },
      claims: [diesel],
    }],
    primary_activity_has_most_credit: true as const,
  };
  assertEquals(inputSchema.safeParse(input).success, false);
  assertEquals(
    inputSchema.safeParse({
      ...input,
      claims: [diesel],
      additional_activities: [{
        business: { ...business, business_name: "Gasoline Activity" },
        claims: [gasoline],
      }],
    }).success,
    true,
  );
});

Deno.test("Form 4136: a combined fuel line rejects mixed units without conversion", () => {
  const claim = {
    ...certifications,
    line: "11a" as const,
    type_of_use: "02",
    unit: "GGE" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    inputSchema.safeParse({
      claimant_context: "business",
      business,
      claims: [claim],
      additional_activities: [{
        business: { ...business, business_name: "Second Activity" },
        claims: [{ ...claim, unit: "gallons" }],
      }],
      primary_activity_has_most_credit: true,
    }).success,
    false,
  );
});

Deno.test("Form 4136: home heating kerosene follows the nonbusiness exception", () => {
  const input = {
    claimant_context: "home_kerosene" as const,
    claimant_is_ultimate_purchaser: true as const,
    home_purchase_outside_blocked_pump: true as const,
    home_use_heating_lighting_or_cooking: true as const,
    purchase_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
    claims: [{
      line: "4a" as const,
      type_of_use: "08",
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true as const,
    }],
  };
  assertEquals(inputSchema.safeParse(input).success, true);
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    24.3,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      home_purchase_outside_blocked_pump: false,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      claims: [{ ...input.claims[0], type_of_use: "02" }],
    }).success,
    false,
  );
});
