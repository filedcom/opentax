import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPending } from "../../mef/pending.ts";
import { buildPdfBytes } from "../builder.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { irs1040Pdf } from "./f1040.ts";
import { form4137Pdf } from "./f4137.ts";
import { schedule1aPdf } from "./schedule1a.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";

Deno.test("2025 Schedule 1-A PDF maps the source-backed NEC line 5 and zero employee line", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-1099nec-trade-business-tips-schedule1a"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const projected = schedule1aPdf.projectFields?.(
    result.pending.schedule1a,
    result.pending,
  );
  assertEquals(projected?.line4c_employee_tips, 0);
  assertEquals(projected?.line5_trade_business_tips, 9_294);
  assertEquals(projected?.line6_total_tips, 9_294);
  assertEquals(
    schedule1aPdf.fields.find((field) =>
      field.domainKey === "line5_trade_business_tips"
    )?.pdfField,
    "form1[0].Page1[0].f1_13[0]",
  );
});

Deno.test("2025 Schedule 1-A PDF joins two Form 4137 employers, worksheet, and Form 1040", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-two-employer-form4137-tips-schedule1a"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const projected = schedule1aPdf.projectFields?.(
    pending.schedule1a,
    pending,
  );
  assertEquals(projected?.line4a_w2_tips, 0);
  assertEquals(projected?.line4b_form4137_tips, 0);
  assertEquals(projected?.line4c_employee_tips, 9_500);
  assertEquals(projected?.line38_total, 9_500);
  assertEquals(
    (projected?.pdf_tip_sources as Array<{
      reported_amount: number;
      form4137_amount: number;
      amount: number;
    }>).map((row) => [
      row.reported_amount,
      row.form4137_amount,
      row.amount,
    ]),
    [[5_000, 6_500, 6_500], [2_000, 3_000, 3_000]],
  );
  assertEquals(
    irs1040Pdf.projectFields?.(pending.f1040, pending)
      ?.line13b_additional_deductions,
    9_500,
  );
  const [form4137] = form4137Pdf.instances?.(
    pending.form4137,
    fixture.filer,
    pending,
  ) ?? [];
  assertEquals(form4137?.employer_1_received, 6_500);
  assertEquals(form4137?.employer_2_received, 3_000);

  const sourceRows = pending.schedule1a.qualified_form4137_tips as Array<
    Record<string, unknown>
  >;
  const omitted = {
    ...pending,
    schedule1a: {
      ...pending.schedule1a,
      qualified_form4137_tips: sourceRows.slice(0, 1),
    },
    f1040: { ...pending.f1040, line13b_additional_deductions: 8_500 },
  };
  assertThrows(
    () => schedule1aPdf.projectFields?.(omitted.schedule1a, omitted),
    Error,
    "do not match the filed employer",
  );
  const sourceForms = pending.form4137.forms as Array<{
    recipient: string;
    employers: Array<Record<string, unknown>>;
  }>;
  const changedEmployer = {
    ...pending,
    form4137: {
      ...pending.form4137,
      forms: [{
        ...sourceForms[0],
        employers: [
          sourceForms[0].employers[0],
          {
            ...sourceForms[0].employers[1],
            tips_received: 2_999,
          },
        ],
      }],
    },
  };
  assertThrows(
    () => schedule1aPdf.projectFields?.(pending.schedule1a, changedEmployer),
    Error,
    "do not match the filed employer",
  );
  assertThrows(
    () =>
      form4137Pdf.instances?.(pending.form4137, fixture.filer, {
        ...pending,
        f1040: { ...pending.f1040, line1c_unreported_tips: 2_499 },
      }),
    Error,
    "tip income and tax do not reconcile",
  );
  assertThrows(
    () =>
      form4137Pdf.instances?.(pending.form4137, fixture.filer, {
        ...pending,
        schedule2: { ...pending.schedule2, line5_unreported_tip_tax: 190 },
      }),
    Error,
    "tip income and tax do not reconcile",
  );
  const w2Rows = pending.w2.w2s as Array<Record<string, unknown>>;
  assertThrows(
    () =>
      form4137Pdf.instances?.(pending.form4137, fixture.filer, {
        ...pending,
        w2: {
          ...pending.w2,
          w2s: [w2Rows[0], { ...w2Rows[1], box7_ss_tips: 1_999 }],
        },
      }),
    Error,
    "W-2 tip sources disagree",
  );
});

Deno.test("2025 two-employer Form 4137 tips build one prepared filled return PDF", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-two-employer-form4137-tips-schedule1a"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assert((await PDFDocument.load(pdf)).getPageCount() >= 7);
});

const source = {
  filing_status: FilingStatus.MFJ,
  magi: 160_000,
  taxpayer_age_65_or_older: true,
  taxpayer_has_valid_ssn: true,
  taxpayer_ssn: "111223333",
  spouse_age_65_or_older: true,
  spouse_has_valid_ssn: true,
  spouse_ssn: "222334444",
  senior_zero_exclusions_review: {
    no_section933_puerto_rico_excluded_income: true as const,
    section933_review_source_reference: "2025 residency and income review",
    no_form2555_filed: true as const,
    form2555_review_source_reference: "2025 foreign-income return review",
    no_form4563_filed: true as const,
    form4563_review_source_reference: "2025 Samoa-source income review",
  },
};

const return1040 = {
  filing_status: FilingStatus.MFJ,
  line11_agi: 160_000,
  line13b_additional_deductions: 10_800,
  schedule1a_line37_senior_deduction: 10_800,
  taxpayer_ssn: "111223333",
  taxpayer_age_65_or_older: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  spouse_ssn: "222334444",
  spouse_age_65_or_older: true,
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
};

Deno.test("Schedule 1-A PDF does not silently omit a positive senior source without Part I review", () => {
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.(
        { ...source, senior_zero_exclusions_review: undefined },
        { f1040: {} },
      ),
    Error,
    "sourced Part I zero-exclusion review",
  );
});

Deno.test("2025 Schedule 1-A PDF maps the senior-only worksheet to both pages", () => {
  const map = new Map(schedule1aPdf.fields.map((entry) => [
    entry.domainKey,
    entry.pdfField,
  ]));
  assertEquals(map.get("line1_agi"), "form1[0].Page1[0].f1_03[0]");
  assertEquals(map.get("line3_magi"), "form1[0].Page1[0].f1_09[0]");
  assertEquals(map.get("line31_magi"), "form1[0].Page2[0].f2_15[0]");
  assertEquals(map.get("line36a_taxpayer"), "form1[0].Page2[0].f2_20[0]");
  assertEquals(map.get("line36b_spouse"), "form1[0].Page2[0].f2_21[0]");
  assertEquals(map.get("line38_total"), "form1[0].Page2[0].f2_23[0]");
  assertEquals(
    schedule1aPdf.filerFields?.map((field) => field.domainKey),
    ["nameLine1", "primarySSN"],
  );

  const pending = { schedule1a: source, f1040: return1040 };
  const projected = schedule1aPdf.projectFields?.(source, pending);
  assertEquals(projected?.line1_agi, 160_000);
  assertEquals(projected?.line2e_zero_exclusions, 0);
  assertEquals(projected?.line31_magi, 160_000);
  assertEquals(projected?.line35_per_person, 5_400);
  assertEquals(projected?.line36a_taxpayer, 5_400);
  assertEquals(projected?.line36b_spouse, 5_400);
  assertEquals(projected?.line37_senior, 10_800);
  assertEquals(projected?.line38_total, 10_800);
  assertEquals(
    irs1040Pdf.projectFields?.(return1040, pending)
      ?.line13b_additional_deductions,
    10_800,
  );
});

Deno.test("2025 Schedule 1-A PDF fills senior and overtime parts together", () => {
  const mixed = {
    ...source,
    qualified_w2_overtime: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      amount: 4_000,
      box1_wages: 160_000,
      covered_nonexempt_employee: true as const,
      premium_included_in_box1: true as const,
      source_reference: "Employer box 14 FLSA premium review",
    }],
  };
  const mixedReturn = { ...return1040, line13b_additional_deductions: 14_800 };
  const projected = schedule1aPdf.projectFields?.(mixed, {
    schedule1a: mixed,
    f1040: mixedReturn,
  });
  assertEquals(projected?.line21_overtime, 4_000);
  assertEquals(projected?.line37_senior, 10_800);
  assertEquals(projected?.line38_total, 14_800);
});

Deno.test("2025 Schedule 1-A PDF maps reviewed vehicle interest to Part IV", async () => {
  const loan = {
    vin: "1HGCM82633A004352",
    borrower_ssn: "111223333",
    loan_originated_date: "2025-02-01",
    vehicle_purchased_date: "2025-02-01",
    lender_name: "Test Credit Union",
    lender_interest_statement_reference: "2025 lender interest statement",
    purchase_and_lien_reference: "2025 purchase and first-lien agreement",
    final_assembly_reference: "vehicle information label",
    original_borrower: true,
    purchase_proceeds_only: true,
    first_lien_secured: true,
    original_vehicle_use: true,
    road_vehicle_with_two_or_more_wheels: true,
    vehicle_type: "car",
    gross_vehicle_weight_under_14000_pounds: true,
    final_assembly_in_us: true,
    expected_personal_use_over_half: true,
    qualified_interest_paid: 4_000,
    interest_deducted_elsewhere: 0,
    no_other_interest_deduction_review_reference: "2025 Schedule C/E/F review",
  };
  const vehicleSource = {
    filing_status: FilingStatus.Single,
    magi: 80_000,
    taxpayer_ssn: "111223333",
    senior_zero_exclusions_review: source.senior_zero_exclusions_review,
    vehicle_loans: [loan],
  };
  const vehicleReturn = {
    filing_status: FilingStatus.Single,
    line11_agi: 80_000,
    line13b_additional_deductions: 4_000,
    schedule1a_line37_senior_deduction: 0,
    taxpayer_ssn: "111223333",
  };
  const map = new Map(
    schedule1aPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    map.get("line22a_vin"),
    "form1[0].Page2[0].Table_Line22[0].Line22a[0].VIN-1_Comb[0].f2_01[0]",
  );
  assertEquals(
    map.get("line30_vehicle_interest"),
    "form1[0].Page2[0].f2_14[0]",
  );
  const projected = schedule1aPdf.projectFields?.(vehicleSource, {
    schedule1a: vehicleSource,
    f1040: vehicleReturn,
  });
  assertEquals(projected?.line22a_vin, loan.vin);
  assertEquals(projected?.line22a_elsewhere, 0);
  assertEquals(projected?.line22a_interest, 4_000);
  assertEquals(projected?.line23_total_interest, 4_000);
  assertEquals(projected?.line30_vehicle_interest, 4_000);
  assertEquals(projected?.line38_total, 4_000);
  const refinancedSource = {
    ...vehicleSource,
    vehicle_loans: [{
      ...loan,
      refinance: {
        refinanced_date: "2025-07-01",
        lender_name: "Second Credit Union",
        interest_statement_reference: "2025 refinance lender statement",
        refinance_and_first_lien_reference:
          "2025 refinance first-lien agreement",
        outstanding_original_principal_at_refinance: 20_000,
        refinanced_principal: 20_000,
        original_loan_interest_paid_before_refinance: 1_500,
        refinanced_loan_interest_paid: 2_500,
        first_lien_secured_on_same_vehicle: true as const,
        no_cash_out_or_ineligible_debt: true as const,
      },
    }],
  };
  const refinancedProjected = schedule1aPdf.projectFields?.(
    refinancedSource,
    { schedule1a: refinancedSource, f1040: vehicleReturn },
  );
  assertEquals(refinancedProjected?.line22a_vin, loan.vin);
  assertEquals(refinancedProjected?.line22a_interest, 4_000);
  assertEquals(refinancedProjected?.line30_vehicle_interest, 4_000);
  const secondLoan = {
    ...loan,
    vin: "1HGCM82633A004353",
    qualified_interest_paid: 1_000,
  };
  const twoLoanSource = {
    ...vehicleSource,
    vehicle_loans: [{ ...loan, qualified_interest_paid: 3_000 }, secondLoan],
  };
  const twoLoanProjected = schedule1aPdf.projectFields?.(twoLoanSource, {
    schedule1a: twoLoanSource,
    f1040: vehicleReturn,
  });
  assertEquals(twoLoanProjected?.line22a_interest, 3_000);
  assertEquals(twoLoanProjected?.line22b_vin, secondLoan.vin);
  assertEquals(twoLoanProjected?.line22b_interest, 1_000);
  const threeLoanSource = {
    ...vehicleSource,
    vehicle_loans: [
      { ...loan, qualified_interest_paid: 1_000 },
      secondLoan,
      { ...loan, vin: "1HGCM82633A004354", qualified_interest_paid: 2_000 },
    ],
  };
  const threeLoanProjected = schedule1aPdf.projectFields?.(threeLoanSource, {
    schedule1a: threeLoanSource,
    f1040: vehicleReturn,
  }) ?? {};
  assertEquals(threeLoanProjected.line22b_vin, "SEEATTACHED");
  assertEquals(threeLoanProjected.line22b_interest, 3_000);
  assertEquals(threeLoanProjected.line23_total_interest, 4_000);
  const document = await PDFDocument.create();
  await schedule1aPdf.appendSupplementalPages?.(
    document,
    threeLoanProjected,
    { nameLine1: "Alex Example", primarySSN: "111223333" } as never,
  );
  assertEquals(document.getPageCount(), 1);
  await assertRejects(async () =>
    await schedule1aPdf.appendSupplementalPages?.(
      await PDFDocument.create(),
      { ...threeLoanProjected, line22b_interest: 2_999 },
      { nameLine1: "Alex Example", primarySSN: "111223333" } as never,
    )
  );
  await assertRejects(async () =>
    await schedule1aPdf.appendSupplementalPages?.(
      await PDFDocument.create(),
      {
        ...threeLoanProjected,
        line22_overflow_vehicles: [
          {
            ...(threeLoanProjected.line22_overflow_vehicles as Record<
              string,
              unknown
            >[])[0],
            vin: "1HGCM82633A004355",
          },
          (threeLoanProjected.line22_overflow_vehicles as unknown[])[1],
        ],
      },
      { nameLine1: "Alex Example", primarySSN: "111223333" } as never,
    )
  );
  const twentyLoanSource = {
    ...vehicleSource,
    vehicle_loans: Array.from({ length: 20 }, (_, index) => ({
      ...loan,
      vin: `1HGCM82633A${String(index).padStart(6, "0")}`,
      qualified_interest_paid: 200,
    })),
  };
  const twentyLoanProjected = schedule1aPdf.projectFields?.(
    twentyLoanSource,
    { schedule1a: twentyLoanSource, f1040: vehicleReturn },
  ) ?? {};
  const multipage = await PDFDocument.create();
  await schedule1aPdf.appendSupplementalPages?.(
    multipage,
    twentyLoanProjected,
    { nameLine1: "Alex Example", primarySSN: "111223333" } as never,
  );
  assertEquals(multipage.getPageCount(), 2);
});

Deno.test("2025 Schedule 1-A PDF rejects mismatched line 13b", () => {
  assertThrows(
    () =>
      schedule1aPdf.projectFields?.({
        ...source,
        qualified_w2_overtime: [{
          employee_ssn: "111223333",
          employer_ein: "123456789",
          amount: 100,
          box1_wages: 100_000,
          covered_nonexempt_employee: true,
          premium_included_in_box1: true,
          source_reference: "Employer box 14 FLSA premium review",
        }],
      }, { schedule1a: source, f1040: return1040 }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...return1040, line13b_additional_deductions: 10_900 },
        {
          schedule1a: source,
          f1040: { ...return1040, line13b_additional_deductions: 10_900 },
        },
      ),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(return1040, { f1040: return1040 }),
    Error,
    "needs a reconciled Schedule 1-A page",
  );
});

Deno.test("2025 Schedule 1-A PDF maps single-employer W-2 tips to Part II", () => {
  const tipSource = {
    filing_status: FilingStatus.Single,
    magi: 30_000,
    taxpayer_ssn: "111223333",
    taxpayer_has_valid_ssn: true,
    senior_zero_exclusions_review: source.senior_zero_exclusions_review,
    qualified_employee_tips: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Test Restaurant",
      amount: 5_000,
      box5_medicare_wages: 30_000,
      occupation_code: "102",
      source_type: "w2_box7" as const,
    }],
  };
  const tipReturn = {
    filing_status: FilingStatus.Single,
    line11_agi: 30_000,
    line13b_additional_deductions: 5_000,
    schedule1a_line37_senior_deduction: 0,
    taxpayer_ssn: "111223333",
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
  };
  const mapped = new Map(
    schedule1aPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(mapped.get("line4a_w2_tips"), "form1[0].Page1[0].f1_10[0]");
  assertEquals(
    mapped.get("line4b_form4137_tips"),
    "form1[0].Page1[0].f1_11[0]",
  );
  assertEquals(mapped.get("line13_tips"), "form1[0].Page1[0].f1_21[0]");
  const projected = schedule1aPdf.projectFields?.(tipSource, {
    schedule1a: tipSource,
    f1040: tipReturn,
    w2: {
      w2s: [{
        employee_ssn: "111223333",
        employer_ein: "123456789",
        employer_name: "Test Restaurant",
        box1_wages: 30_000,
        box2_fed_withheld: 2_500,
        box5_medicare_wages: 30_000,
        box7_ss_tips: 5_000,
        box14b_tipped_code: "102",
      }],
    },
  });
  assertEquals(projected?.line4a_w2_tips, 5_000);
  assertEquals(projected?.line4b_form4137_tips, 0);
  assertEquals(projected?.line4c_employee_tips, 5_000);
  assertEquals(projected?.line13_tips, 5_000);
  assertEquals(projected?.line38_total, 5_000);
});

Deno.test("2025 Schedule 1-A PDF maps reviewed W-2 overtime to Part III", () => {
  const overtimeSource = {
    filing_status: FilingStatus.Single,
    magi: 80_000,
    taxpayer_ssn: "111223333",
    taxpayer_has_valid_ssn: true,
    senior_zero_exclusions_review: source.senior_zero_exclusions_review,
    qualified_w2_overtime: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      amount: 4_000,
      box1_wages: 80_000,
      covered_nonexempt_employee: true,
      premium_included_in_box1: true,
      source_reference: "Employer box 14 FLSA premium review",
    }],
  };
  const overtimeReturn = {
    filing_status: FilingStatus.Single,
    line11_agi: 80_000,
    line13b_additional_deductions: 4_000,
    schedule1a_line37_senior_deduction: 0,
    taxpayer_ssn: "111223333",
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
  };
  const mapped = new Map(schedule1aPdf.fields.map((entry) => [
    entry.domainKey,
    entry.pdfField,
  ]));
  assertEquals(mapped.get("line14a_w2_overtime"), "form1[0].Page1[0].f1_22[0]");
  assertEquals(mapped.get("line21_overtime"), "form1[0].Page1[0].f1_31[0]");
  const projected = schedule1aPdf.projectFields?.(overtimeSource, {
    schedule1a: overtimeSource,
    f1040: overtimeReturn,
  });
  assertEquals(projected?.line14a_w2_overtime, 4_000);
  assertEquals(projected?.line14b_zero_1099, 0);
  assertEquals(projected?.line14c_total_overtime, 4_000);
  assertEquals(projected?.line21_overtime, 4_000);
  assertEquals(projected?.line38_total, 4_000);
});
