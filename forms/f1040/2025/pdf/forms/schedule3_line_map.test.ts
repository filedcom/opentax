import { assertEquals, assertThrows } from "@std/assert";
import { schedule3Pdf } from "./schedule3.ts";

const fuelSource = {
  claimant_context: "business" as const,
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
  additional_activities: [],
  primary_activity_has_most_credit: true as const,
  claims: [{
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    not_highway_vehicle: true as const,
    not_noncommercial_motorboat: true as const,
  }],
};

Deno.test("2025 Schedule 3 PDF maps DC, bond, and fuel credits to printed lines", () => {
  const fields = new Map(
    schedule3Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    fields.get("line6h_dc_homebuyer_credit"),
    "topmostSubform[0].Page1[0].f1_16[0]",
  );
  assertEquals(
    fields.get("line6k_tax_credit_bonds"),
    "topmostSubform[0].Page1[0].f1_19[0]",
  );
  assertEquals(
    fields.get("line12_fuel_tax_credit"),
    "topmostSubform[0].Page1[0].f1_29[0]",
  );
  assertEquals(
    fields.get("line14_total"),
    "topmostSubform[0].Page1[0].f1_36[0]",
  );
});

Deno.test("finalized Schedule 3 PDF rejects omitted and changed subtotals", () => {
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line1_foreign_tax_1099: [50, 25], line1_total: 74, line8_total: 74 },
        { f1040: { line20_nonrefundable_credits: 74 } },
      ),
    Error,
    "line 1 must equal",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        {
          line6b_prior_year_min_tax_credit: 100,
          line7_total: 99,
          line8_total: 99,
        },
        { f1040: { line20_nonrefundable_credits: 99 } },
      ),
    Error,
    "line 7 must equal",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line2_childcare_credit: 100, line8_total: 99 },
        { f1040: { line20_nonrefundable_credits: 99 } },
      ),
    Error,
    "line 8 must equal",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line10_amount_paid_extension: 100 },
        { f1040: { line31_additional_payments: 100 } },
      ),
    Error,
    "line 15 must equal",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line13a_total: 1_500, line14_total: 1_499, line15_total: 1_499 },
        {
          f1040: {},
          f2439: { f2439s: [{ box1a: 10_000, box2: 1_500 }] },
        },
      ),
    Error,
    "line 14 must equal",
  );
});

Deno.test("finalized Schedule 3 PDF rejects unsourced premium, extension, and excess SS payments", () => {
  for (
    const line of [
      "line9_premium_tax_credit",
      "line10_amount_paid_extension",
      "line11_excess_ss",
    ]
  ) {
    assertThrows(
      () =>
        schedule3Pdf.projectFields?.(
          { [line]: 100, line15_total: 100 },
          { f1040: { line31_additional_payments: 100 } },
        ),
      Error,
      "source",
    );
  }
});

Deno.test("finalized Schedule 3 PDF line 11 replays W-2 source", () => {
  const w2 = {
    w2s: [
      {
        employer_ein: "111111111",
        employee_ssn: "123456789",
        box1_wages: 100_000,
        box2_fed_withheld: 0,
        box3_ss_wages: 100_000,
        box4_ss_withheld: 6_200,
      },
      {
        employer_ein: "222222222",
        employee_ssn: "123456789",
        box1_wages: 100_000,
        box2_fed_withheld: 0,
        box3_ss_wages: 100_000,
        box4_ss_withheld: 6_200,
      },
    ],
  };
  const fields = { line11_excess_ss: 1_482, line15_total: 1_482 };
  const pending = { f1040: { line31_additional_payments: 1_482 }, w2 };
  assertEquals(schedule3Pdf.projectFields?.(fields, pending), fields);
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line11_excess_ss: 1_481, line15_total: 1_481 },
        { ...pending, f1040: { line31_additional_payments: 1_481 } },
      ),
    Error,
    "differs from W-2 source",
  );
});

Deno.test("finalized Schedule 3 PDF replays Form 8962 and extension payments", () => {
  const fields = {
    line9_premium_tax_credit: 100,
    line10_amount_paid_extension: 100,
    line15_total: 200,
  };
  const pending = {
    f1040: { line31_additional_payments: 200 },
    form8962: { net_premium_tax_credit: 100 },
    ext: {
      produce_4868: "X",
      line_7_amount_paying: 100,
      payment_evidence: {
        tax_year: 2025,
        primary_ssn: "123456789",
        payment_date: "2026-04-15",
        amount: 100,
        payment_confirmation_reference: "payment-100",
        extension_request_reference: "extension-100",
        extension_request_accepted_confirmed: true,
      },
    },
  };
  assertEquals(schedule3Pdf.projectFields?.(fields, pending), fields);
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { ...fields, line9_premium_tax_credit: 99, line15_total: 199 },
        { ...pending, f1040: { line31_additional_payments: 199 } },
      ),
    Error,
    "differs from Form 8962 source",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { ...fields, line10_amount_paid_extension: 99, line15_total: 199 },
        { ...pending, f1040: { line31_additional_payments: 199 } },
      ),
    Error,
    "differs from extension payment source",
  );
});

Deno.test("Schedule 3 PDF line 12 rejects a bare Form 4136 credit", () => {
  assertThrows(
    () => schedule3Pdf.projectFields?.({ line12_fuel_tax_credit: 125 }, {}),
    Error,
    "Form 4136",
  );
  const valid = { line12_fuel_tax_credit: 18.3 };
  assertEquals(
    schedule3Pdf.projectFields?.(valid, { f4136: fuelSource }),
    valid,
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.({ line12_fuel_tax_credit: 18.2 }, {
        f4136: fuelSource,
      }),
    Error,
    "differs from sourced Form 4136",
  );
  assertThrows(
    () => schedule3Pdf.projectFields?.({}, { f4136: fuelSource }),
    Error,
    "differs from sourced Form 4136",
  );
});

Deno.test("Schedule 3 PDF line 13a requires matching Form 2439 box 2 sources", () => {
  const fields = {
    line13a_total: 2_250,
    line14_total: 2_250,
    line15_total: 2_250,
  };
  assertThrows(
    () => schedule3Pdf.projectFields?.(fields, {}),
    Error,
    "sourced Form 2439",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(fields, {
        f2439: { f2439s: [{ box1a: 10_000, box2: 2_249 }] },
      }),
    Error,
    "sourced Form 2439",
  );
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.({}, {
        f2439: { f2439s: [{ box1a: 10_000, box2: 2_250 }] },
      }),
    Error,
    "sourced Form 2439",
  );
  assertEquals(
    schedule3Pdf.projectFields?.(fields, {
      f2439: {
        f2439s: [{ box1a: 10_000, box2: 1_500 }, { box1a: 5_000, box2: 750 }],
      },
    })?.line13a_total,
    2_250,
  );
});
