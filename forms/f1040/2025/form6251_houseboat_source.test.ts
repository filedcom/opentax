import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1098 } from "../nodes/inputs/f1098/index.ts";
import {
  form6251,
  inputSchema,
} from "../nodes/intermediate/forms/form6251/index.ts";
import { form6251 as mef6251 } from "./mef/forms/f6251.ts";
import { form6251Pdf } from "./pdf/forms/f6251.ts";

const mortgage = {
  box1_mortgage_interest: 30_000,
  box1_current_year_deductible_interest: 30_000,
  box1_deduction_workpaper_reference: "2025 Pub 936 qualified-loan calculation",
  lender_name: "Harbor Lender",
  recipient_tin: "111223333",
  source_document_reference: "2025 Harbor Form 1098 copy 1",
  amt_houseboat_second_home_review: {
    vessel_id: "HULL-2025-1",
    property_review_reference: "2025 ownership and vessel facilities review",
    publication936_deduction_workpaper_reference:
      "2025 second-home acquisition debt and limit review",
    second_home_not_principal_residence_verified: true as const,
    sleeping_cooking_toilet_facilities_verified: true as const,
    personal_use_only_verified: true as const,
    secured_acquisition_debt_and_loan_limit_verified: true as const,
  },
};

function filedCase() {
  const source = { f1098s: [mortgage] };
  const routed = f1098.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  assertEquals(
    routed.outputs.find((row) => row.nodeType === "form6251")?.fields
      .line3_houseboat_interest_addback,
    30_000,
  );
  const result = form6251.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_taxable_income: 200_000,
      regular_tax: 0,
      line2a_taxes_paid: 0,
      taking_standard_deduction: false,
      line3_houseboat_interest_addback: 30_000,
    }),
  );
  const filed = result.outputs.find((row) => row.nodeType === "form6251")!
    .fields;
  const amt = result.outputs.find((row) => row.nodeType === "schedule2")
    ?.fields.line2_amt;
  const pending = {
    f1098: source,
    schedule_a: { line_8a_mortgage_interest_1098: 30_000 },
    schedule2: { line2_amt: amt },
    f1040: {
      taxpayer_ssn: "111223333",
      line11_agi: 230_000,
      line12e_itemized_deductions: 30_000,
      line14_deductions_qbi_total: 30_000,
      line15_taxable_income: 200_000,
      line17_additional_taxes: filed.line11_amt,
    },
  };
  return { filed, pending };
}

Deno.test("second-home houseboat interest is added back on AMT line 3", () => {
  const { filed, pending } = filedCase();
  assertEquals(filed.line3_houseboat_interest_addback, 30_000);
  assertEquals(filed.amti, 230_000);
  assertStringIncludes(
    mef6251.build(filed, { pending }),
    "<RelatedAdjustmentAmt>30000</RelatedAdjustmentAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, pending)
      ?.line3_houseboat_interest_addback,
    30_000,
  );
});

Deno.test("houseboat AMT addback rejects changed 1098, Schedule A, and return facts", () => {
  const { filed, pending } = filedCase();
  const changed1098 = {
    ...pending,
    f1098: {
      f1098s: [{ ...mortgage, box1_current_year_deductible_interest: 29_999 }],
    },
  };
  const changedScheduleA = {
    ...pending,
    schedule_a: { line_8a_mortgage_interest_1098: 29_999 },
  };
  const changedTax = {
    ...pending,
    schedule2: { line2_amt: 0 },
  };
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line12e_itemized_deductions: 29_999 },
  };
  for (
    const candidate of [
      changed1098,
      changedScheduleA,
      changedTax,
      changedReturn,
    ]
  ) {
    assertThrows(() => mef6251.build(filed, { pending: candidate }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, candidate));
  }
  assertThrows(() =>
    mef6251.build({ ...filed, line3_houseboat_interest_addback: 29_999 }, {
      pending,
    })
  );
  assertThrows(() =>
    form6251Pdf.projectFields?.({
      ...filed,
      line3_houseboat_interest_addback: 29_999,
    }, pending)
  );
  assertThrows(() =>
    form6251.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        filing_status: "single",
        regular_tax_income: 200_000,
        regular_tax: 0,
        taking_standard_deduction: true,
        line3_houseboat_interest_addback: 30_000,
      }),
    )
  );
});
