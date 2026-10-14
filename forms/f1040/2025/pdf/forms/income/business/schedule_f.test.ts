import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../../../mef/header.ts";
import { testFiler } from "../../../../mef/execution/test-filer.ts";
import { fillFormPdf } from "../../../builder.ts";
import { scheduleFPdf } from "./schedule_f.ts";

const jointFiler = {
  ...testFiler(),
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "111223333",
    firstName: "Jane",
    lastName: "Farmer",
    nameControl: "FARM",
  },
};

const farm = {
  farm_id: "farm-1",
  proprietor_recipient: "S" as const,
  line_a_principal_crop_activity: "GRAIN FARMING",
  line_b_agricultural_activity_code: "111100" as const,
  line_e_material_participation: true,
  line_f_made_1099_payments: false,
  accounting_method: "cash" as const,
  line1_sales_livestock_resale: 0,
  line6a_crop_insurance: 3_000,
  line6b_crop_insurance_taxable: 3_000,
  line8_other_income: 2_000,
  line16_feed: 500,
};

Deno.test("Schedule F PDF prints the spouse proprietor and income on the correct IRS lines", async () => {
  const [fields] = scheduleFPdf.instances!({ schedule_fs: [farm] }, jointFiler);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    fields,
    jointFiler,
    ".pdf-cache",
  );
  const filled = await PDFDocument.load(bytes!);
  assertEquals(filled.getPageCount(), 2);
  const prefix = "topmostSubform[0].Page1[0].";
  const field = (key: string) =>
    scheduleFPdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(fields.proprietor_name, "Jane Farmer");
  assertEquals(fields.proprietor_ssn, "111223333");
  assertEquals(fields.line9_gross_income, 5_000);
  assertEquals(fields.line33_total_expenses, 500);
  assertEquals(fields.line34_net_profit, 4_500);
  assertEquals(field("line6a_crop_insurance"), `${prefix}f1_17[0]`);
  assertEquals(field("line8_other_income"), `${prefix}f1_21[0]`);
  assertEquals(field("line9_gross_income"), `${prefix}f1_22[0]`);
  assertEquals(field("line16_feed"), `${prefix}Lines10-22[0].f1_29[0]`);
  assertEquals(field("line33_total_expenses"), `${prefix}f1_59[0]`);
  assertEquals(field("line34_net_profit"), `${prefix}f1_60[0]`);
});

Deno.test("Schedule F PDF rejects an unnamed joint proprietor", () => {
  assertThrows(
    () =>
      scheduleFPdf.instances!({
        schedule_fs: [{ ...farm, proprietor_recipient: undefined }],
      }, jointFiler),
    Error,
    "joint return needs an explicit proprietor",
  );
});

Deno.test("Schedule F PDF requires line F and conditional line G answers", async () => {
  assertThrows(
    () =>
      scheduleFPdf.instances!({
        schedule_fs: [{ ...farm, line_f_made_1099_payments: undefined }],
      }, jointFiler),
    Error,
    "required Forms 1099 answers",
  );
  assertThrows(
    () =>
      scheduleFPdf.instances!({
        schedule_fs: [{ ...farm, line_f_made_1099_payments: true }],
      }, jointFiler),
    Error,
    "required Forms 1099 answers",
  );
  const [fields] = scheduleFPdf.instances!({
    schedule_fs: [{
      ...farm,
      line_f_made_1099_payments: true,
      line_f_filed_1099s: false,
    }],
  }, jointFiler);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    fields,
    jointFiler,
    ".pdf-cache",
  );
  const filled = await PDFDocument.load(bytes!);
  const page = "topmostSubform[0].Page1[0].";
  assertEquals(
    scheduleFPdf.fields.find((field) =>
      field.domainKey === "line_f_made_1099_payments" &&
      field.kind === "checkboxWhen" && field.whenValue === "true"
    )?.pdfField,
    `${page}c1_3[0]`,
  );
  assertEquals(
    scheduleFPdf.fields.find((field) =>
      field.domainKey === "line_f_filed_1099s" &&
      field.kind === "checkboxWhen" && field.whenValue === "false"
    )?.pdfField,
    `${page}c1_4[1]`,
  );
  assertEquals(filled.getPageCount(), 2);
});

Deno.test("Schedule F PDF needs a visible line 32 expense description", () => {
  assertThrows(() =>
    scheduleFPdf.instances!({
      schedule_fs: [{
        ...farm,
        line32_other_expenses: [{ description: "  ", amount: 125 }],
      }],
    }, jointFiler)
  );
});

Deno.test("Schedule F PDF requires a line 36 answer for a farm loss", () => {
  assertThrows(
    () =>
      scheduleFPdf.instances!({
        schedule_fs: [{
          ...farm,
          line6a_crop_insurance: undefined,
          line6b_crop_insurance_taxable: undefined,
          line8_other_income: undefined,
        }],
      }, jointFiler),
    Error,
    "Schedule F loss requires a line 36 at-risk answer",
  );
});

Deno.test("Schedule F accrual PDF prints Part III income and inventory on page 2", async () => {
  const accrualFarm = {
    ...farm,
    accounting_method: "accrual" as const,
    line1_sales_livestock_resale: undefined,
    line6a_crop_insurance: undefined,
    line6b_crop_insurance_taxable: undefined,
    line8_other_income: undefined,
    part_iii: {
      line37_sales_products: 10_000,
      line43_other_income: 2_000,
      line45_beginning_inventory: 1_000,
      line46_products_purchased: 500,
      line48_ending_inventory: 200,
      inventory_method: "cost" as const,
    },
  };
  const [projected] = scheduleFPdf.instances!(
    { schedule_fs: [accrualFarm] },
    jointFiler,
  );
  assertEquals(projected.line44_total_income, 12_000);
  assertEquals(projected.line47_inventory_plus_purchases, 1_500);
  assertEquals(projected.line49_cost_of_products_sold, 1_300);
  assertEquals(projected.line50_gross_income, 10_700);
  assertEquals(projected.line9_gross_income, 10_700);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    projected,
    jointFiler,
    ".pdf-cache",
  );
  assertEquals((await PDFDocument.load(bytes!)).getPageCount(), 2);
  const page2 = "topmostSubform[0].Page2[0].";
  assertEquals(
    scheduleFPdf.fields.find((entry) =>
      entry.domainKey === "line50_gross_income"
    )?.pdfField,
    `${page2}f2_18[0]`,
  );
});

Deno.test("Schedule F PDF prints labor reduced by its linked Form 5884 allocation", async () => {
  const wageSource = {
    subject_to_passive_activity_limit: false,
    f5884s: [{
      employee_reference: "EMP-001",
      target_group: "1",
      hired_on: "2025-01-15",
      certification: {
        path: "certified_by_start",
        swa_certification_reference: "SWA-001",
        certification_received_on: "2025-01-15",
        certification_received_before_claim_confirmed: true,
        revocation: { status: "no_notice_received" },
      },
      qualified_wages_confirmed: true,
      not_prior_employee_confirmed: true,
      not_related_or_dependent_confirmed: true,
      more_than_half_wages_for_trade_or_business_confirmed: true,
      excluded_wages_removed_confirmed: true,
      wage_records: [{
        payroll_record_reference: "PAY-001",
        deduction_location: { kind: "schedule_f", farm_id: "farm-1" },
        service_period_start_on: "2025-02-01",
        service_period_end_on: "2025-02-28",
        paid_or_incurred_on: "2025-02-28",
        qualified_wages: 6_000,
      }],
      hours_worked: 400,
    }],
  };
  const fields = {
    schedule_fs: [{
      ...farm,
      line16_feed: undefined,
      line6a_crop_insurance: undefined,
      line6b_crop_insurance_taxable: undefined,
      line8_other_income: 6_000,
      line22_labor_hired: 6_000,
    }],
    wotc_wage_reductions: [{ farm_id: "farm-1", credit_amount: 2_400 }],
  };
  const pending = { f5884: wageSource };
  const [projected] = scheduleFPdf.instances!(fields, jointFiler, pending);
  assertEquals(projected.line22_labor_after_credits, 3_600);
  assertEquals(projected.line33_total_expenses, 3_600);
  assertEquals(projected.line34_net_profit, 2_400);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    projected,
    jointFiler,
    ".pdf-cache",
  );
  assertEquals((await PDFDocument.load(bytes!)).getPageCount(), 2);
  assertThrows(
    () => scheduleFPdf.instances!(fields, jointFiler, {}),
  );
  assertThrows(
    () =>
      scheduleFPdf.instances!(
        {
          ...fields,
          wotc_wage_reductions: [{ farm_id: "farm-1", credit_amount: 2_300 }],
        },
        jointFiler,
        pending,
      ),
    Error,
    "needs matching Form 5884 line 2",
  );
});

Deno.test("Schedule F PDF carries excess line 32 expenses on a described continuation", async () => {
  const other = Array.from({ length: 8 }, (_, index) => ({
    description: `FARM EXPENSE ${index + 1}`,
    amount: (index + 1) * 10,
  }));
  const [projected] = scheduleFPdf.instances!({
    schedule_fs: [{ ...farm, line32_other_expenses: other }],
  }, jointFiler);
  assertEquals(projected.other_description_0, "FARM EXPENSE 1");
  assertEquals(projected.other_amount_4, 50);
  assertEquals(projected.other_description_5, "SEE ATTACHED");
  assertEquals(projected.other_amount_5, 210);
  assertEquals(projected.line32_statement_rows, other.slice(5));
  assertEquals(projected.line33_total_expenses, 860);
  assertEquals(projected.line34_net_profit, 4_140);
  const bytes = await fillFormPdf(
    scheduleFPdf,
    projected,
    jointFiler,
    ".pdf-cache",
  );
  assertEquals((await PDFDocument.load(bytes!)).getPageCount(), 2);
  const continuation = await PDFDocument.create();
  await scheduleFPdf.appendSupplementalPages!(
    continuation,
    projected,
    jointFiler,
  );
  assertEquals(continuation.getPageCount(), 1);

  const many = Array.from({ length: 85 }, (_, index) => ({
    description: `ADDITIONAL FARM EXPENSE ${index + 1}`,
    amount: 1,
  }));
  const [manyFields] = scheduleFPdf.instances!({
    schedule_fs: [{ ...farm, line32_other_expenses: many }],
  }, jointFiler);
  const morePages = await PDFDocument.create();
  await scheduleFPdf.appendSupplementalPages!(
    morePages,
    manyFields,
    jointFiler,
  );
  assertEquals(morePages.getPageCount() > 1, true);
});
