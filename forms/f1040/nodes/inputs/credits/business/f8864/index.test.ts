import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { shiftDatedFacts } from "../../../../../../../scripts/testing/sample-year.ts";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";
import { f3800 } from "../f3800/index.ts";
import { calculateForm8864, f8864, inputSchema } from "./index.ts";
import { directAgriBiodieselSource } from "./fixture.ts";

test("Form 8864 computes the dated 2025 small producer credit", () => {
  assertEquals(calculateForm8864(directAgriBiodieselSource, 2025), {
    line7_gallons: 0,
    line7_rate: 0.10,
    line7: 0,
    line8_gallons: 2_500,
    line8_rate: 0.20,
    line8: 500,
    line9: 500,
    line10: 0,
    line11: 500,
  });
  const result = f8864.compute(
    { taxYear: 2025, formType: "f1040" },
    directAgriBiodieselSource,
  );
  assertEquals(
    fieldsOf(result.outputs, f3800)?.f8864_direct_producer_credit,
    {
      credit_amount: 500,
      schedule_c_business_reference: "id-agri-fuel-2025",
      form637_registration_number: "AB123456789",
      subject_to_passive_activity_limit: false,
    },
  );
  assertEquals(
    fieldsOf(result.outputs, form6251)?.line3_form8864_income_exclusion,
    -500,
  );
});

test("Form 8864 rejects old gallon shortcuts, missing registration and ineligible fuel", () => {
  const lot = directAgriBiodieselSource.lots[0];
  for (
    const candidate of [
      { gallons_biodiesel: 1_000 },
      { gallons_saf: 1_000 },
      { ...directAgriBiodieselSource, gallons_biodiesel: 1_000 },
      { ...directAgriBiodieselSource, form637_registration_number: "" },
      { ...directAgriBiodieselSource, no_transfer_election_confirmed: false },
      { ...directAgriBiodieselSource, no_pass_through_credit_confirmed: false },
      {
        ...directAgriBiodieselSource,
        no_controlled_group_or_common_control_confirmed: false,
      },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, feedstock_origin: "BR" }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, sale_invoice_reference: undefined }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, gallons_sold: 15_000_001 }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{
          ...lot,
          no_renewable_diesel_or_saf_included_confirmed: false,
        }],
      },
      { ...directAgriBiodieselSource, lots: [lot, lot] },
    ]
  ) {
    assertEquals(inputSchema.safeParse(candidate).success, false);
  }
});

// Instructions for Form 8864 (Rev. December 2025): $.20 a gallon for fuel sold
// or used after June 30, 2025 and before January 1, 2027 (P.L. 119-21).
test("Form 8864 sales fall in the return year at the $.20 rate before 2027", () => {
  const lot = directAgriBiodieselSource.lots[0];
  for (const sale_date of ["2025-06-30", "2026-01-02"]) {
    assertThrows(
      () =>
        calculateForm8864({
          ...directAgriBiodieselSource,
          lots: [{ ...lot, sale_date }],
        }, 2025),
      Error,
      "must fall in 2025",
    );
  }
  const in2026 = shiftDatedFacts(directAgriBiodieselSource, 1);
  assertEquals(calculateForm8864(in2026, 2026).line11, 500);
  assertThrows(
    () => calculateForm8864(directAgriBiodieselSource, 2026),
    Error,
    "must fall in 2026",
  );
});
