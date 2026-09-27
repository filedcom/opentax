import { assertEquals, assertThrows } from "@std/assert";
import {
  businessUsePercentage,
  computeCommercialVehicleCreditLines,
  computeNewVehicleCreditParts,
  f8936,
  type F8936Input,
  type F8936Item,
  modifiedAgi,
} from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { f3800 } from "../f3800/index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";

const newVehicle: F8936Item = {
  credit_kind: "new_clean_vehicle",
  vin: "1HGCM82633A004352",
  vehicle_year: 2025,
  vehicle_make: "Example",
  vehicle_model: "EV",
  acquisition_date: "2025-09-30",
  placed_in_service_date: "2025-09-30",
  seller_report_received: true,
  transferred_to_dealer: false,
  resold_within_30_days: false,
  acquired_for_use_not_resale: true,
  credit_amount: 7_500,
  msrp: 45_000,
  vehicle_type: "other",
};

const usedVehicle: F8936Item = {
  ...newVehicle,
  vin: "1HGCM82633A004353",
  credit_kind: "previously_owned_clean_vehicle",
  vehicle_year: 2022,
  credit_amount: undefined,
  sale_price: 15_000,
  msrp: undefined,
  vehicle_type: undefined,
  claimed_as_dependent: false,
  claimed_prev_owned_credit_last_3_years: false,
  purchased_from_dealer: true,
  previously_owned_first_eligible_transfer: true,
};

const commercialVehicle: F8936Item = {
  ...newVehicle,
  credit_kind: "qualified_commercial_clean_vehicle",
  vin: "1HGCM82633A004354",
  business_credit_subject_to_passive_activity_limit: false,
  credit_amount: undefined,
  msrp: undefined,
  vehicle_type: undefined,
  commercial: {
    owned_by_taxpayer: true,
    qualified_manufacturer: true,
    original_use_begins_with_taxpayer: true,
    claimed_new_clean_credit_for_vin: false,
    primarily_used_in_us: true,
    subject_to_depreciation: true,
    vehicle_design: "street_vehicle",
    powered_partly_by_gas_or_diesel: false,
    gvwr_pounds: 10_000,
    cost_or_other_basis: 60_000,
    section179_expense_deduction: 0,
    incremental_cost: {
      kind: "2025_light_street_safe_harbor",
      is_compact_car_phev: false,
    },
    propulsion: {
      kind: "plug_in_electric",
      battery_capacity_kwh: 80,
      externally_rechargeable: true,
    },
  },
};

function mileageUse(businessMiles: number) {
  return {
    kind: "mileage" as const,
    business_miles: businessMiles,
    commuting_miles: 0,
    total_miles: 1_000,
    months_in_business_use: 12,
  };
}

function source(
  vehicles: F8936Item[],
  overrides: Partial<F8936Input> = {},
): F8936Input {
  return {
    current_year_magi: { adjusted_gross_income: 50_000 },
    prior_year_magi: { adjusted_gross_income: 50_000 },
    filing_status: FilingStatus.Single,
    prior_year_filing_status: FilingStatus.Single,
    f8936s: vehicles,
    ...overrides,
  };
}

function compute(input: F8936Input) {
  return f8936.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function amount(input: F8936Input, field: string): number | undefined {
  const outputs = compute(input).outputs.filter((row) =>
    row.nodeType === "schedule3"
  );
  return outputs.reduce<number | undefined>((sum, row) => {
    const value = row.fields[field];
    if (typeof value !== "number") return sum;
    return (sum ?? 0) + value;
  }, undefined);
}

Deno.test("Form 8936: MAGI is a return-level current/prior-year breakdown", () => {
  const input = source([newVehicle], {
    current_year_magi: {
      adjusted_gross_income: 140_000,
      excluded_puerto_rico_income: 5_000,
      foreign_earned_income_exclusion: 4_000,
      foreign_housing_deduction: 3_000,
      excluded_american_samoa_income: 2_000,
    },
  });
  assertEquals(modifiedAgi(input.current_year_magi), 154_000);
  assertEquals(amount(input, "line6f_clean_vehicle_credit"), 7_500);
});

Deno.test("Form 8936: both MAGI years and both filing statuses are required", () => {
  const valid = source([newVehicle]);
  assertEquals(f8936.inputSchema.safeParse(valid).success, true);
  assertEquals(
    f8936.inputSchema.safeParse({ ...valid, current_year_magi: undefined })
      .success,
    false,
  );
  assertEquals(
    f8936.inputSchema.safeParse({ ...valid, prior_year_magi: undefined })
      .success,
    false,
  );
  assertEquals(
    f8936.inputSchema.safeParse({
      ...valid,
      prior_year_filing_status: undefined,
    }).success,
    false,
  );
});

Deno.test("Form 8936: empty vehicle array has no outputs", () => {
  assertEquals(compute(source([])).outputs, []);
});

for (
  const [field, value] of [
    ["credit_amount", -1],
    ["business_use_pct", -0.01],
    ["business_use_pct", 1.01],
  ] as const
) {
  Deno.test(`Form 8936: invalid ${field} ${value} is rejected`, () => {
    assertEquals(
      f8936.inputSchema.safeParse(source([{ ...newVehicle, [field]: value }]))
        .success,
      false,
    );
  });
}

for (
  const [name, changes, message] of [
    [
      "missing acquisition date",
      { acquisition_date: undefined },
      "acquisition date is required",
    ],
    [
      "invalid acquisition date",
      { acquisition_date: "2025-02-30" },
      "valid ISO date",
    ],
    ["missing VIN", { vin: undefined }, "valid VIN"],
    [
      "missing service date",
      { placed_in_service_date: undefined },
      "valid 2025 placed-in-service date",
    ],
    [
      "service outside 2025",
      { placed_in_service_date: "2024-12-31" },
      "valid 2025 placed-in-service date",
    ],
    [
      "missing seller report",
      { seller_report_received: false },
      "seller report is required",
    ],
    ["missing MSRP", { msrp: undefined }, "MSRP and vehicle type"],
    [
      "missing dealer-transfer answer",
      { transferred_to_dealer: undefined },
      "dealer-transfer answer",
    ],
  ] as const
) {
  Deno.test(`Form 8936: ${name} cannot award a new credit`, () => {
    assertThrows(
      () => compute(source([{ ...newVehicle, ...changes }])),
      Error,
      message,
    );
  });
}

Deno.test("Form 8936: acquired after September 30 is ineligible", () => {
  assertEquals(
    compute(source([{ ...newVehicle, acquisition_date: "2025-10-01" }]))
      .outputs,
    [],
  );
  assertEquals(
    compute(source([{ ...usedVehicle, acquisition_date: "2025-10-01" }]))
      .outputs,
    [],
  );
});

for (
  const [name, changes] of [
    ["resold within 30 days", { resold_within_30_days: true }],
    ["acquired for resale", { acquired_for_use_not_resale: false }],
  ] as const
) {
  Deno.test(`Form 8936: ${name} is ineligible`, () => {
    assertEquals(compute(source([{ ...newVehicle, ...changes }])).outputs, []);
  });
}

for (
  const [name, credit, expected] of [
    ["full", 7_500, 7_500],
    ["partial", 3_750, 3_750],
    ["capped", 10_000, 7_500],
  ] as const
) {
  Deno.test(`Form 8936: ${name} new-vehicle credit`, () => {
    assertEquals(
      amount(
        source([{ ...newVehicle, credit_amount: credit }]),
        "line6f_clean_vehicle_credit",
      ),
      expected,
    );
  });
}

for (
  const [status, limit] of [
    [FilingStatus.Single, 150_000],
    [FilingStatus.HOH, 225_000],
    [FilingStatus.MFJ, 300_000],
  ] as const
) {
  Deno.test(`Form 8936: new-vehicle ${status} MAGI threshold`, () => {
    assertEquals(
      amount(
        source([newVehicle], {
          filing_status: status,
          prior_year_filing_status: status,
          current_year_magi: { adjusted_gross_income: limit },
          prior_year_magi: { adjusted_gross_income: limit + 1 },
        }),
        "line6f_clean_vehicle_credit",
      ),
      7_500,
    );
    assertEquals(
      amount(
        source([newVehicle], {
          filing_status: status,
          prior_year_filing_status: status,
          current_year_magi: { adjusted_gross_income: limit + 1 },
          prior_year_magi: { adjusted_gross_income: limit + 1 },
        }),
        "line6f_clean_vehicle_credit",
      ),
      undefined,
    );
  });
}

Deno.test("Form 8936: prior-year status uses its own limit", () => {
  assertEquals(
    amount(
      source([newVehicle], {
        current_year_magi: { adjusted_gross_income: 180_000 },
        prior_year_magi: { adjusted_gross_income: 180_000 },
        filing_status: FilingStatus.Single,
        prior_year_filing_status: FilingStatus.MFJ,
      }),
      "line6f_clean_vehicle_credit",
    ),
    7_500,
  );
});

for (
  const [type, msrp, expected] of [
    ["other", 55_000, 7_500],
    ["other", 55_001, undefined],
    ["suv_van_truck", 80_000, 7_500],
    ["suv_van_truck", 80_001, undefined],
  ] as const
) {
  Deno.test(`Form 8936: ${type} MSRP ${msrp}`, () => {
    assertEquals(
      amount(
        source([{ ...newVehicle, vehicle_type: type, msrp }]),
        "line6f_clean_vehicle_credit",
      ),
      expected,
    );
  });
}

for (
  const [businessUse, expected] of [[0.25, 5_625], [0.5, 3_750], [
    1,
    undefined,
  ]] as const
) {
  Deno.test(`Form 8936: ${businessUse * 100}% business use`, () => {
    assertEquals(
      amount(
        source([{
          ...newVehicle,
          business_use: mileageUse(businessUse * 1_000),
          business_credit_subject_to_passive_activity_limit: false,
        }]),
        "line6f_clean_vehicle_credit",
      ),
      expected,
    );
  });
}

Deno.test("Form 8936: new vehicle business and personal shares reconcile after rounding", () => {
  const vehicle = {
    ...newVehicle,
    credit_amount: 1_001,
    business_use: mileageUse(500),
    business_credit_subject_to_passive_activity_limit: false,
  };
  assertEquals(computeNewVehicleCreditParts(vehicle, source([vehicle])), {
    personal: 500,
    business: 501,
  });
  assertEquals(
    amount(source([vehicle]), "line6f_clean_vehicle_credit"),
    500,
  );
  assertEquals(fieldsOf(compute(source([vehicle])).outputs, f3800), {
    f8936_new_vehicle_credit: {
      credit_amount: 501,
      subject_to_passive_activity_limit: false,
    },
  });
  assertThrows(() =>
    computeNewVehicleCreditParts(usedVehicle, source([usedVehicle]))
  );
});

Deno.test("Form 8936: business credit needs a nonpassive source classification", () => {
  const vehicle = { ...newVehicle, business_use: mileageUse(1_000) };
  assertThrows(
    () => compute(source([vehicle])),
    Error,
    "passive-activity answer",
  );
  assertThrows(
    () =>
      compute(source([{
        ...vehicle,
        business_credit_subject_to_passive_activity_limit: true,
      }])),
    Error,
    "Form 8582-CR",
  );
  assertEquals(
    fieldsOf(
      compute(source([{
        ...vehicle,
        business_credit_subject_to_passive_activity_limit: false,
      }])).outputs,
      f3800,
    )?.f8936_new_vehicle_credit?.credit_amount,
    7_500,
  );
});

Deno.test("Form 8936: business mileage excludes commuting and prorates conversions", () => {
  const converted = {
    ...newVehicle,
    business_use: {
      kind: "mileage" as const,
      business_miles: 500,
      commuting_miles: 200,
      total_miles: 1_000,
      months_in_business_use: 6,
    },
  };
  assertEquals(f8936.inputSchema.safeParse(source([converted])).success, true);
  assertEquals(businessUsePercentage(converted), 0.25);
  assertEquals(computeNewVehicleCreditParts(converted, source([converted])), {
    business: 1_875,
    personal: 5_625,
  });
  assertEquals(
    f8936.inputSchema.safeParse(source([{
      ...converted,
      business_use: { ...converted.business_use, business_miles: 900 },
    }])).success,
    false,
  );
  assertEquals(
    f8936.inputSchema.safeParse(source([{
      ...converted,
      business_use: { ...converted.business_use, months_in_business_use: 13 },
    }])).success,
    false,
  );
  const employeeUse = {
    ...newVehicle,
    business_use: {
      kind: "employee_fringe" as const,
      personal_use_handling: "reimbursed" as const,
      months_in_business_use: 12,
    },
  };
  assertEquals(businessUsePercentage(employeeUse), 1);
  assertEquals(
    f8936.inputSchema.safeParse(source([employeeUse])).success,
    true,
  );
});

for (
  const [status, limit] of [
    [FilingStatus.Single, 75_000],
    [FilingStatus.HOH, 112_500],
    [FilingStatus.MFJ, 150_000],
  ] as const
) {
  Deno.test(`Form 8936: previously owned ${status} MAGI threshold`, () => {
    assertEquals(
      amount(
        source([usedVehicle], {
          filing_status: status,
          prior_year_filing_status: status,
          current_year_magi: { adjusted_gross_income: limit },
          prior_year_magi: { adjusted_gross_income: limit + 1 },
        }),
        "line6m_prev_owned_clean_vehicle_credit",
      ),
      4_000,
    );
    assertEquals(
      amount(
        source([usedVehicle], {
          filing_status: status,
          prior_year_filing_status: status,
          current_year_magi: { adjusted_gross_income: limit + 1 },
          prior_year_magi: { adjusted_gross_income: limit + 1 },
        }),
        "line6m_prev_owned_clean_vehicle_credit",
      ),
      undefined,
    );
  });
}

for (
  const [name, changes] of [
    ["claimed as dependent", { claimed_as_dependent: true }],
    ["prior credit within three years", {
      claimed_prev_owned_credit_last_3_years: true,
    }],
    ["not purchased from dealer", { purchased_from_dealer: false }],
    ["not first eligible transfer", {
      previously_owned_first_eligible_transfer: false,
    }],
    ["model year too recent", { vehicle_year: 2024 }],
    ["price over $25,000", { sale_price: 25_001 }],
  ] as const
) {
  Deno.test(`Form 8936: previously owned ${name} is ineligible`, () => {
    assertEquals(compute(source([{ ...usedVehicle, ...changes }])).outputs, []);
  });
}

for (
  const [price, expected] of [[10_000, 3_000], [15_000, 4_000], [
    25_000,
    4_000,
  ]] as const
) {
  Deno.test(`Form 8936: previously owned price ${price} computes credit`, () => {
    assertEquals(
      amount(
        source([{ ...usedVehicle, sale_price: price }]),
        "line6m_prev_owned_clean_vehicle_credit",
      ),
      expected,
    );
  });
}

Deno.test("Form 8936: previously owned credit is not reduced by business-use percentage", () => {
  assertEquals(
    amount(
      source([{ ...usedVehicle, business_use: mileageUse(250) }]),
      "line6m_prev_owned_clean_vehicle_credit",
    ),
    4_000,
  );
});

Deno.test("Form 8936: transferred dealer amount is not claimed again on Schedule 3", () => {
  assertEquals(
    compute(source([{
      ...newVehicle,
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }])).outputs,
    [],
  );
});

Deno.test("Form 8936: disqualified transferred new credit is repaid on Schedule 2 line 1b", () => {
  const result = compute(source([{
    ...newVehicle,
    transferred_to_dealer: true,
    transferred_amount: 7_500,
  }], {
    current_year_magi: { adjusted_gross_income: 200_000 },
    prior_year_magi: { adjusted_gross_income: 200_000 },
  }));
  assertEquals(result.outputs, [{
    nodeType: "schedule2",
    fields: { line1b_new_clean_vehicle_repayment: 7_500 },
  }]);
});

Deno.test("Form 8936: disqualified transferred used credit is repaid on Schedule 2 line 1c", () => {
  const result = compute(source([{
    ...usedVehicle,
    transferred_to_dealer: true,
    transferred_amount: 4_000,
  }], {
    current_year_magi: { adjusted_gross_income: 100_000 },
    prior_year_magi: { adjusted_gross_income: 100_000 },
  }));
  assertEquals(result.outputs, [{
    nodeType: "schedule2",
    fields: { line1c_prev_owned_clean_vehicle_repayment: 4_000 },
  }]);
});

Deno.test("Form 8936: multiple vehicles share one return-level MAGI test", () => {
  const result = compute(source([newVehicle, usedVehicle], {
    current_year_magi: { adjusted_gross_income: 100_000 },
    prior_year_magi: { adjusted_gross_income: 100_000 },
  }));
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("Form 8936: two qualifying vehicles route to their separate Schedule 3 lines", () => {
  const result = compute(source([newVehicle, usedVehicle]));
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].fields.line6f_clean_vehicle_credit, 7_500);
  assertEquals(
    result.outputs[1].fields.line6m_prev_owned_clean_vehicle_credit,
    4_000,
  );
});

Deno.test("Form 8936: commercial light EV uses the 2025 $7,500 incremental-cost safe harbor", () => {
  const lines = computeCommercialVehicleCreditLines(commercialVehicle);
  assertEquals(lines.line22BasisPercentage, 18_000);
  assertEquals(lines.line23IncrementalCost, 7_500);
  assertEquals(lines.line26Credit, 7_500);
  assertEquals(fieldsOf(compute(source([commercialVehicle])).outputs, f3800), {
    f8936_commercial_vehicle_credit: {
      credit_amount: 7_500,
      subject_to_passive_activity_limit: false,
    },
  });
});

Deno.test("Form 8936: commercial PHEV uses 15% basis after Section 179", () => {
  const vehicle: F8936Item = {
    ...commercialVehicle,
    commercial: {
      ...commercialVehicle.commercial!,
      powered_partly_by_gas_or_diesel: true,
      cost_or_other_basis: 50_000,
      section179_expense_deduction: 10_000,
      incremental_cost: {
        kind: "comparable_vehicle",
        purchase_price: 50_000,
        comparable_vehicle_price: 43_000,
        comparable_vehicle_description: "Same-size diesel van",
        comparable_in_size_and_use: true,
      },
    },
  };
  const lines = computeCommercialVehicleCreditLines(vehicle);
  assertEquals(lines.line21AdjustedBasis, 40_000);
  assertEquals(lines.line22BasisPercentage, 6_000);
  assertEquals(lines.line23IncrementalCost, 7_000);
  assertEquals(lines.line26Credit, 6_000);
});

Deno.test("Form 8936: commercial heavy vehicle uses the $40,000 cap", () => {
  const vehicle: F8936Item = {
    ...commercialVehicle,
    commercial: {
      ...commercialVehicle.commercial!,
      gvwr_pounds: 14_000,
      cost_or_other_basis: 200_000,
      incremental_cost: {
        kind: "comparable_vehicle",
        purchase_price: 200_000,
        comparable_vehicle_price: 150_000,
        comparable_vehicle_description: "Same-size diesel truck",
        comparable_in_size_and_use: true,
      },
      propulsion: {
        kind: "plug_in_electric",
        battery_capacity_kwh: 20,
        externally_rechargeable: true,
      },
    },
  };
  assertEquals(
    computeCommercialVehicleCreditLines(vehicle).line26Credit,
    40_000,
  );
});

Deno.test("Form 8936: commercial vehicle rejects unsupported safe harbor and too-small battery", () => {
  assertThrows(
    () =>
      computeCommercialVehicleCreditLines({
        ...commercialVehicle,
        commercial: {
          ...commercialVehicle.commercial!,
          gvwr_pounds: 14_000,
        },
      }),
    Error,
    "safe harbor",
  );
  assertThrows(
    () =>
      computeCommercialVehicleCreditLines({
        ...commercialVehicle,
        commercial: {
          ...commercialVehicle.commercial!,
          propulsion: {
            kind: "plug_in_electric",
            battery_capacity_kwh: 6,
            externally_rechargeable: true,
          },
        },
      }),
    Error,
    "battery requirements",
  );
  assertThrows(
    () =>
      computeCommercialVehicleCreditLines({
        ...commercialVehicle,
        acquisition_date: "2022-12-31",
      }),
    Error,
    "after 2022",
  );
});

Deno.test("Form 8936: commercial vehicle cannot claim a duplicate VIN or a new-vehicle credit for the same VIN", () => {
  assertEquals(
    f8936.inputSchema.safeParse(source([newVehicle, {
      ...commercialVehicle,
      vin: newVehicle.vin,
    }])).success,
    false,
  );
  assertThrows(
    () =>
      computeCommercialVehicleCreditLines({
        ...commercialVehicle,
        commercial: {
          ...commercialVehicle.commercial!,
          claimed_new_clean_credit_for_vin: true,
        },
      }),
    Error,
    "same VIN",
  );
});

Deno.test("Form 8936: commercial credit needs nonpassive source classification", () => {
  assertThrows(
    () =>
      compute(source([{
        ...commercialVehicle,
        business_credit_subject_to_passive_activity_limit: undefined,
      }])),
    Error,
    "passive-activity answer",
  );
  assertThrows(
    () =>
      compute(source([{
        ...commercialVehicle,
        business_credit_subject_to_passive_activity_limit: true,
      }])),
    Error,
    "Form 8582-CR",
  );
});
