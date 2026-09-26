import { assertEquals, assertThrows } from "@std/assert";
import { f8936 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(items: Parameters<typeof f8936.compute>[1]["f8936s"]) {
  const datedItems = items.map((item) => ({
    acquisition_date: "2025-09-30",
    vin: "1HGCM82633A004352",
    vehicle_year: item.is_new_vehicle === false ? 2022 : 2025,
    vehicle_make: "Example",
    vehicle_model: "EV",
    placed_in_service_date: "2025-09-30",
    seller_report_received: true,
    transferred_to_dealer: false,
    resold_within_30_days: false,
    acquired_for_use_not_resale: true,
    claimed_as_dependent: false,
    claimed_prev_owned_credit_last_3_years: false,
    previously_owned_first_eligible_transfer: true,
    purchased_from_dealer: true,
    msrp: item.is_new_vehicle === false ? undefined : 45_000,
    vehicle_type: item.is_new_vehicle === false ? undefined : "other" as const,
    prior_year_modified_agi: item.modified_agi,
    prior_year_filing_status: item.filing_status,
    ...item,
  }));
  return f8936.compute({ taxYear: 2025, formType: "f1040" }, {
    f8936s: datedItems,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f8936: empty array produces no outputs", () => {
  assertEquals(compute([]).outputs.length, 0);
});

Deno.test("f8936: negative credit_amount rejected", () => {
  const parsed = f8936.inputSchema.safeParse({
    f8936s: [{ credit_amount: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8936: business_use_pct > 1 rejected", () => {
  const parsed = f8936.inputSchema.safeParse({
    f8936s: [{ business_use_pct: 1.5 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8936: business_use_pct < 0 rejected", () => {
  const parsed = f8936.inputSchema.safeParse({
    f8936s: [{ business_use_pct: -0.1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8936: missing acquisition date cannot award credit", () => {
  assertThrows(
    () =>
      f8936.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          f8936s: [{
            is_new_vehicle: true,
            credit_amount: 7_500,
            modified_agi: 100_000,
            filing_status: FilingStatus.Single,
          }],
        },
      ),
    Error,
    "acquisition date is required",
  );
});

Deno.test("f8936: malformed acquisition date cannot award credit", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        acquisition_date: "2025-02-30",
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "valid ISO date",
  );
});

Deno.test("f8936: missing current-year MAGI cannot award credit", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "current-year MAGI",
  );
});

Deno.test("f8936: prior-year MAGI is required if current-year MAGI is over the limit", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        modified_agi: 150_001,
        filing_status: FilingStatus.Single,
        prior_year_modified_agi: undefined,
        prior_year_filing_status: undefined,
      }]),
    Error,
    "prior-year MAGI",
  );
});

Deno.test("f8936: VIN and vehicle identity are required before a credit is awarded", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        vin: undefined,
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "valid VIN",
  );
});

Deno.test("f8936: a new vehicle needs MSRP and its vehicle type", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        msrp: undefined,
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "MSRP and vehicle type",
  );
});

Deno.test("f8936: placed-in-service date must be in 2025", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        placed_in_service_date: "2024-12-31",
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "valid 2025 placed-in-service date",
  );
});

Deno.test("f8936: seller report is required before a credit is awarded", () => {
  assertThrows(
    () =>
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        seller_report_received: false,
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
    Error,
    "seller report",
  );
});

Deno.test("f8936: a vehicle resold within 30 days has no credit", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    resold_within_30_days: true,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: dealer-transferred amount is not claimed again on Schedule 3", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    transferred_to_dealer: true,
    transferred_amount: 7_500,
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned credit is barred after another claim within three years", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    claimed_prev_owned_credit_last_3_years: true,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned model year must be at least two years older", () => {
  const result = compute([{
    is_new_vehicle: false,
    vehicle_year: 2024,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned vehicle must be bought from a dealer", () => {
  const result = compute([{
    is_new_vehicle: false,
    purchased_from_dealer: false,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned vehicle requires first eligible transfer", () => {
  const result = compute([{
    is_new_vehicle: false,
    previously_owned_first_eligible_transfer: false,
    sale_price: 15_000,
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: vehicles acquired October 1 are ineligible", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    acquisition_date: "2025-10-01",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }, {
    is_new_vehicle: false,
    sale_price: 15_000,
    acquisition_date: "2025-10-01",
    modified_agi: 50_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: prior-year MAGI can qualify a new vehicle", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 180_000,
    filing_status: FilingStatus.Single,
    prior_year_modified_agi: 145_000,
    prior_year_filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs[0]?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: prior-year filing status uses its own income limit", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    modified_agi: 180_000,
    filing_status: FilingStatus.Single,
    prior_year_modified_agi: 180_000,
    prior_year_filing_status: FilingStatus.MFJ,
  }]);
  assertEquals(result.outputs[0]?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: previously owned vehicle uses the $75,000 single limit", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 75_001,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned vehicle uses the $112,500 HOH limit", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 112_501,
    filing_status: FilingStatus.HOH,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned vehicle uses the $150,000 MFJ limit", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 150_001,
    filing_status: FilingStatus.MFJ,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936: previously owned vehicle can use prior-year MAGI", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 15_000,
    modified_agi: 80_000,
    filing_status: FilingStatus.Single,
    prior_year_modified_agi: 75_000,
    prior_year_filing_status: FilingStatus.Single,
  }]);
  assertEquals(
    result.outputs[0]?.fields.line6m_prev_owned_clean_vehicle_credit,
    4_000,
  );
});

// =============================================================================
// New Vehicle Credit — up to $7,500 (IRC §30D)
// =============================================================================

Deno.test("f8936: new vehicle — full $7,500 credit", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: new vehicle — partial $3,750 credit honored exactly", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 3_750,
      msrp: 45_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 3_750);
});

Deno.test("f8936: new vehicle — credit_amount above $7,500 capped at $7,500", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 10_000,
      msrp: 45_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

// =============================================================================
// Income Limits
// =============================================================================

Deno.test("f8936: single exceeds $150k → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        modified_agi: 150_001,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: single at exactly $150k → credit allowed", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      modified_agi: 150_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: MFJ exceeds $300k → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        modified_agi: 300_001,
        filing_status: FilingStatus.MFJ,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: MFJ within $300k → credit allowed", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      modified_agi: 250_000,
      filing_status: FilingStatus.MFJ,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: HOH exceeds $225k → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        modified_agi: 225_001,
        filing_status: FilingStatus.HOH,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: HOH at exactly $225k → credit allowed", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      modified_agi: 225_000,
      filing_status: FilingStatus.HOH,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

// =============================================================================
// MSRP Caps
// =============================================================================

Deno.test("f8936: other type exceeds $55k MSRP → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        msrp: 55_001,
        vehicle_type: "other",
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: other type at exactly $55k MSRP → credit allowed", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 55_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: SUV/van/truck allows up to $80k MSRP", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 75_000,
      vehicle_type: "suv_van_truck",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 7_500);
});

Deno.test("f8936: SUV exceeds $80k MSRP → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        msrp: 80_001,
        vehicle_type: "suv_van_truck",
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

// =============================================================================
// Business Use Reduction
// =============================================================================

Deno.test("f8936: 50% business use reduces credit by 50%", () => {
  // $7,500 × 50% personal = $3,750
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      business_use_pct: 0.5,
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 3_750);
});

Deno.test("f8936: 100% business use → no personal credit (zero output)", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: true,
        credit_amount: 7_500,
        business_use_pct: 1.0,
        modified_agi: 100_000,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: 25% business use → 75% personal credit", () => {
  // $7,500 × 75% = $5,625
  const s3 = findOutput(
    compute([{
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      business_use_pct: 0.25,
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6f_clean_vehicle_credit, 5_625);
});

// =============================================================================
// Used Vehicle Credit — 30% of sale price, max $4,000 (IRC §25E)
// =============================================================================

Deno.test("f8936: used vehicle — 30% of price, capped at $4,000", () => {
  // $15,000 × 30% = $4,500 → capped at $4,000
  const s3 = findOutput(
    compute([{
      is_new_vehicle: false,
      sale_price: 15_000,
      modified_agi: 50_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6m_prev_owned_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: used vehicle — $10,000 price × 30% = $3,000 (under cap)", () => {
  const s3 = findOutput(
    compute([{
      is_new_vehicle: false,
      sale_price: 10_000,
      modified_agi: 50_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6m_prev_owned_clean_vehicle_credit, 3_000);
});

Deno.test("f8936: used vehicle — price exceeds $25,000 → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: false,
        sale_price: 25_001,
        modified_agi: 50_000,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: used vehicle — price at exactly $25,000 → credit allowed", () => {
  // $25,000 × 30% = $7,500 → capped at $4,000
  const s3 = findOutput(
    compute([{
      is_new_vehicle: false,
      sale_price: 25_000,
      modified_agi: 50_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6m_prev_owned_clean_vehicle_credit, 4_000);
});

Deno.test("f8936: used vehicle — single exceeds $150k income → no credit", () => {
  assertEquals(
    findOutput(
      compute([{
        is_new_vehicle: false,
        sale_price: 20_000,
        modified_agi: 151_000,
        filing_status: FilingStatus.Single,
      }]),
      "schedule3",
    ),
    undefined,
  );
});

Deno.test("f8936: used vehicle credit is not split by business-use percentage", () => {
  // Schedule A Part IV has no business-use split: $4,500 caps at $4,000.
  const s3 = findOutput(
    compute([{
      is_new_vehicle: false,
      sale_price: 15_000,
      business_use_pct: 0.25,
      modified_agi: 50_000,
      filing_status: FilingStatus.Single,
    }]),
    "schedule3",
  );
  assertEquals(s3?.fields.line6m_prev_owned_clean_vehicle_credit, 4_000);
});

// =============================================================================
// Routing
// =============================================================================

Deno.test("f8936: credit routes to schedule3 line6f_clean_vehicle_credit", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    filing_status: FilingStatus.Single,
  }]);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6f_clean_vehicle_credit, 7_500);
});

// =============================================================================
// Multiple Vehicles
// =============================================================================

Deno.test("f8936: two qualifying vehicles each produce a schedule3 output", () => {
  const result = compute([
    {
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    },
    {
      is_new_vehicle: false,
      sale_price: 20_000,
      modified_agi: 50_000,
      filing_status: FilingStatus.Single,
    },
  ]);
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].fields.line6f_clean_vehicle_credit, 7_500);
  assertEquals(
    result.outputs[1].fields.line6m_prev_owned_clean_vehicle_credit,
    4_000,
  );
});

Deno.test("f8936: vehicle over income limit excluded, qualifying vehicle retained", () => {
  const result = compute([
    {
      is_new_vehicle: true,
      credit_amount: 7_500,
      modified_agi: 200_000,
      filing_status: FilingStatus.Single,
    },
    {
      is_new_vehicle: true,
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      modified_agi: 100_000,
      filing_status: FilingStatus.Single,
    },
  ]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].fields.line6f_clean_vehicle_credit, 7_500);
});
