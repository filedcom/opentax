import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { scheduleAPdf } from "./schedule_a.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { purchasePointsCrossLoanFixture } from "../../../nodes/inputs/f1098/purchase_points_cross_loan.fixture.ts";
import { PDFDocument } from "pdf-lib";
import { fillFormPdf } from "../builder.ts";
import { scheduleA as scheduleAMef } from "../../mef/forms/schedule_a.ts";
import { buildMefXml } from "../../mef/builder.ts";
import type { MefFormsPending } from "../../mef/types.ts";

Deno.test("Schedule A reviewed nonqualifying mortgage use checks native and PDF line 8", async () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general: {
        filing_status: "single",
        taxpayer_first_name: "Test",
        taxpayer_last_name: "Taxpayer",
        taxpayer_ssn: "111223333",
        digital_assets: false,
      },
      schedule_a: {
        line_8a_mortgage_interest_1098: 20_000,
        home_mortgage_nonqualifying_use_review: {
          loan_document_reference: "2025 home equity loan statement",
          outstanding_balance_2025: 100_000,
          nonqualifying_proceeds_amount: 10_000,
          interest_allocation_workpaper_reference:
            "2025 Pub 936 tracing workpaper",
          deductible_home_interest_reviewed: true,
        },
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 20_000);
  const xml = buildMefXml(result.pending as MefFormsPending, filer);
  assertEquals(
    xml.includes("<HomeMortgNotUsedInd>X</HomeMortgNotUsedInd>"),
    true,
  );
  const [instance] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    filer,
    result.pending,
  ) ?? [];
  assertEquals(instance?.print_line_8_mortgage_use_warning, true);
  const pdf = await fillFormPdf(
    scheduleAPdf,
    instance!,
    filer,
    ".pdf-cache",
    result.pending,
  );
  assertEquals((await PDFDocument.load(pdf!)).getPageCount(), 1);
});

Deno.test("Schedule A election below standard reaches line 12e, native form, and PDF line 18", async () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const run = (amount: number) =>
    execute(
      buildExecutionPlan(registry),
      registry,
      {
        general: {
          filing_status: "single",
          taxpayer_first_name: "Test",
          taxpayer_last_name: "Taxpayer",
          taxpayer_ssn: "111223333",
          digital_assets: false,
        },
        schedule_a: { line_5b_real_estate_tax: amount, force_itemized: true },
      },
      { taxYear: 2025, formType: "f1040" },
    );
  const result = run(1_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 1_000);
  assertEquals(result.pending.f1040?.line12a_standard_deduction, undefined);
  const xml = buildMefXml(result.pending as MefFormsPending, filer);
  assertEquals(xml.includes("<IRS1040ScheduleA "), true);
  assertEquals(
    xml.includes("<RealEstateTaxesAmt>1000</RealEstateTaxesAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<ItmzdDedLessThanStdDedInd>X</ItmzdDedLessThanStdDedInd>"),
    true,
  );
  const [instance] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    filer,
    result.pending,
  ) ?? [];
  assertEquals(instance?.print_line_18_itemize_election, true);
  const filled = await fillFormPdf(
    scheduleAPdf,
    instance!,
    filer,
    ".pdf-cache",
    result.pending,
  );
  assertEquals((await PDFDocument.load(filled!)).getPageCount(), 1);

  const equal = run(15_750);
  assertEquals(equal.diagnostics, []);
  const [equalInstance] = scheduleAPdf.instances?.(
    equal.pending.schedule_a,
    filer,
    equal.pending,
  ) ?? [];
  assertEquals(equal.pending.f1040?.line12e_itemized_deductions, 15_750);
  assertEquals(equalInstance?.print_line_18_itemize_election, false);
  assertEquals(
    buildMefXml(equal.pending as MefFormsPending, filer).includes(
      "ItmzdDedLessThanStdDedInd",
    ),
    false,
  );
  const zero = run(0);
  assertEquals(zero.diagnostics, []);
  assertEquals(zero.pending.f1040?.line12e_itemized_deductions, 0);
  const zeroXml = buildMefXml(zero.pending as MefFormsPending, filer);
  assertEquals(zeroXml.includes("<IRS1040ScheduleA "), true);
  assertEquals(
    zeroXml.includes(
      "<TotalItemizedDeductionsAmt>0</TotalItemizedDeductionsAmt>",
    ),
    true,
  );
  assertEquals(
    zeroXml.includes(
      "<ItmzdDedLessThanStdDedInd>X</ItmzdDedLessThanStdDedInd>",
    ),
    true,
  );
  const [zeroInstance] = scheduleAPdf.instances?.(
    zero.pending.schedule_a,
    filer,
    zero.pending,
  ) ?? [];
  assertEquals(zeroInstance?.line_17_itemized, 0);
  assertEquals(zeroInstance?.print_line_18_itemize_election, true);
  const zeroFilled = await fillFormPdf(
    scheduleAPdf,
    zeroInstance!,
    filer,
    ".pdf-cache",
    zero.pending,
  );
  assertEquals((await PDFDocument.load(zeroFilled!)).getPageCount(), 1);
});

Deno.test("Schedule A PDF fills TY2025 line 8e and prints Form 8396 net mortgage interest", async () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const source = {
    line_8a_mortgage_interest_1098: 21_000,
    line_8b_mortgage_interest_no_1098: 1_000,
    line_8c_points_no_1098: 500,
    line_9_investment_interest: 300,
    form8396_interest_credit_reduction: 2_000,
    form8396_interest_reporting_line: "8a" as const,
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 20_800 },
    form8396: { line3: 2_000, interest_reporting_line: "8a" },
  };
  const [instance] = scheduleAPdf.instances?.(source, filer, pending) ?? [];
  assertEquals(instance?.line_8a_mortgage_interest_1098, 19_000);
  assertEquals(instance?.line_8b_mortgage_interest_no_1098, 1_000);
  assertEquals(instance?.line_8e_mortgage_interest, 20_500);
  assertEquals(instance?.line_10_interest, 20_800);
  const xml = scheduleAMef.build(source, { pending });
  assertEquals(
    xml.includes(
      "<RptHomeMortgIntAndPointsAmt>19000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const filled = await fillFormPdf(
    scheduleAPdf,
    instance!,
    filer,
    ".pdf-cache",
    pending,
  );
  const document = await PDFDocument.load(filled!);
  assertEquals(document.getPageCount(), 1);
  const official = await PDFDocument.load(
    await Deno.readFile(
      ".pdf-cache/https_www_irs_gov_pub_irs_prior_f1040sa_2025_pdf.pdf",
    ),
  );
  official.getForm().getTextField("form1[0].Page1[0].f1_20[0]");
  const [line8b] = scheduleAPdf.instances?.(
    {
      ...source,
      line_8a_mortgage_interest_1098: 1_000,
      line_8b_mortgage_interest_no_1098: 21_000,
      form8396_interest_reporting_line: "8b",
    },
    filer,
    {
      ...pending,
      form8396: { line3: 2_000, interest_reporting_line: "8b" },
    },
  ) ?? [];
  assertEquals(line8b?.line_8b_mortgage_interest_no_1098, 19_000);
  assertEquals(line8b?.line_8e_mortgage_interest, 20_500);
  assertThrows(
    () =>
      scheduleAPdf.instances?.(source, filer, {
        ...pending,
        form8396: { line3: 1_999, interest_reporting_line: "8a" },
      }),
    Error,
    "reduction differs from Form 8396 line 3",
  );
});

Deno.test("Schedule A PDF replays purchase points and the second mortgage", () => {
  const fixture = purchasePointsCrossLoanFixture();
  const source = {
    f1098s: fixture.f1098,
    ...fixture.f1098_purchase_points_cross_loan_review,
  };
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 21_000 },
    f1098: source,
  };
  const [instance] = scheduleAPdf.instances?.(
    { line_8a_mortgage_interest_1098: 21_000 },
    filer,
    pending,
  ) ?? [];
  assertEquals(instance?.line_8a_mortgage_interest_1098, 21_000);
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 21_001 },
        filer,
        pending,
      ),
    Error,
    "exact sourced line 8a",
  );
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 21_000 },
        filer,
        {
          ...pending,
          f1098: {
            ...source,
            f1098s: [source.f1098s[0], {
              ...source.f1098s[1],
              recipient_tin: "999-88-7777",
            }],
          },
        },
      ),
    Error,
    "same single filer",
  );
});

Deno.test("Schedule A PDF box 6 points reject a wrong recipient or missing filed amount", () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "Test Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
  };
  const source = {
    f1098s: [{
      lender_name: "Home Lender",
      recipient_tin: "111-22-3333",
      source_document_reference: "2025 Form 1098 copy",
      box1_mortgage_interest: 18_000,
      box1_current_year_deductible_interest: 18_000,
      box1_deduction_workpaper_reference: "2025 interest workpaper",
      box6_points_paid: 2_400,
      box6_current_year_deductible_points: 2_400,
      box6_deduction_workpaper_reference: "2025 points workpaper",
    }],
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 20_400 },
    f1098: source,
  };
  const [instance] = scheduleAPdf.instances?.(
    { line_8a_mortgage_interest_1098: 20_400 },
    filer,
    pending,
  ) ?? [];
  assertEquals(instance?.line_8a_mortgage_interest_1098, 20_400);
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 2_399 },
        filer,
        { ...pending, f1040: { line12e_itemized_deductions: 2_399 } },
      ),
    Error,
    "less than sourced Form 1098 box 6",
  );
  assertThrows(
    () =>
      scheduleAPdf.instances?.(
        { line_8a_mortgage_interest_1098: 20_400 },
        filer,
        {
          ...pending,
          f1098: {
            f1098s: [{ ...source.f1098s[0], recipient_tin: "999887777" }],
          },
        },
      ),
    Error,
    "recipient must match",
  );
});

Deno.test("Schedule A PDF rejects a finalized capital-gain election without reconciled Form 8283 source", () => {
  assertThrows(
    () =>
      scheduleAPdf.includeWhen?.({
        line_12_noncash_contributions: 24_000,
        line_13_contribution_carryover: 5_000,
        charitable_limits_finalized: true,
        capital_gain_election_finalized: true,
      }, { f1040: { line12e_itemized_deductions: 29_000 } }),
    Error,
    "complete Schedule A source",
  );
  assertEquals(
    scheduleAPdf.includeWhen?.({ capital_gain_election_finalized: true }, {
      f1040: { line12a_standard_deduction: 15_750 },
    }),
    false,
  );
});

Deno.test("Schedule A PDF prints the ordinary gift on the official line 12 widget", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-ordinary-noncash-gift"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const [instance] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    fixture.filer,
    result.pending,
  ) ?? [];
  assertEquals(instance?.filer_name, "ALEX EXAMPLE");
  assertEquals(instance?.line_5e_salt_deduction, 24_000);
  assertEquals(instance?.line_12_noncash_contributions, 1_200);
  assertEquals(instance?.line_17_itemized, 37_200);
  assertEquals(
    scheduleAPdf.fields.find((field) =>
      field.domainKey === "line_12_noncash_contributions"
    )?.pdfField,
    "form1[0].Page1[0].f1_24[0]",
  );
});

Deno.test("Schedule A PDF marks the canonical line 5a election for sourced sales tax", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-ordinary-noncash-gift"
  )!;
  const inputs = {
    ...fixture.inputs,
    schedule_a: {
      ...(fixture.inputs.schedule_a as Record<string, unknown>),
      line_5a_state_income_tax: undefined,
    },
    sales_tax_deduction: {
      method: "actual",
      actual_sales_tax_paid: 24_000,
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a?.line_5a_sales_tax, 24_000);
  const [salesTax] = scheduleAPdf.instances?.(
    result.pending.schedule_a,
    fixture.filer,
    result.pending,
  ) ?? [];
  assertEquals(salesTax?.print_line_5a_sales_tax_election, true);
  assertEquals(
    scheduleAPdf.fields.find((field) =>
      field.domainKey === "print_line_5a_sales_tax_election"
    )?.pdfField,
    "form1[0].Page1[0].c1_1[0]",
  );
  const source = await PDFDocument.load(
    await Deno.readFile(
      ".pdf-cache/https_www_irs_gov_pub_irs_prior_f1040sa_2025_pdf.pdf",
    ),
    { ignoreEncryption: true },
  );
  source.getForm().getCheckBox("form1[0].Page1[0].c1_1[0]");
  const filled = await fillFormPdf(
    scheduleAPdf,
    salesTax!,
    fixture.filer,
    ".pdf-cache",
    result.pending,
  );
  assertEquals((await PDFDocument.load(filled!)).getPageCount(), 1);

  const incomeResult = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(incomeResult.diagnostics, []);
  const [incomeTax] = scheduleAPdf.instances?.(
    incomeResult.pending.schedule_a,
    fixture.filer,
    incomeResult.pending,
  ) ?? [];
  assertEquals(incomeTax?.print_line_5a_sales_tax_election, false);
});
