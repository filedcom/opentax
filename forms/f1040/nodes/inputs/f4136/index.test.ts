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
      certificate_information_believed_true: true as const,
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
