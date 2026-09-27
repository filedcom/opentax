import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { inputSchema } from "../../../nodes/inputs/f8820/index.ts";
import { buildForm8820Document, form8820 } from "./f8820.ts";

const source = inputSchema.parse({
  f8820s: [{
    generic_name: "Test Orphan Drug",
    designation_application_number: "FDA-123",
    designation_date: "2024-03-15",
    qualified_clinical_testing_expenses: 100_000,
    qualifying_testing_confirmed: true,
    expenses_exclude_third_party_funding: true,
    expenses_not_used_for_research_credit: true,
  }],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 1_250,
  subject_to_passive_activity_limit: false,
});

Deno.test("Form 8820 MeF maps the election, wage offset, and drug identity", () => {
  const xml = buildForm8820Document(source);
  assertStringIncludes(
    xml,
    "<QlfyClinicalTestExpnssPdAmt>100000</QlfyClinicalTestExpnssPdAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectAmt>19750</ReducedSection280CCrElectAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectInd>true</ReducedSection280CCrElectInd>",
  );
  assertStringIncludes(
    xml,
    "<EmployerDifferentialWageCrAmt>1250</EmployerDifferentialWageCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CYCLessEmployerDiffWageCrAmt>18500</CYCLessEmployerDiffWageCrAmt>",
  );
  assertStringIncludes(xml, "<OrphanDrugNm>Test Orphan Drug</OrphanDrugNm>");
  assertStringIncludes(
    xml,
    "<OrphanDrugDesignationNum>FDA-123</OrphanDrugDesignationNum>",
  );
});

Deno.test("Form 8820 MeF requires the linked Form 3800 and any expense statement", () => {
  assertThrows(() =>
    form8820.build(source, {
      documentIdsByPendingKey: {},
    })
  );
  const xml = form8820.build(source, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<IRS8820>");
  assertThrows(() =>
    form8820.build({
      ...source,
      reduced_section280c_credit_election: false,
      expense_reduction_statement_file_name: "deduction-reduction.pdf",
      expense_reductions: [{
        treatment: "current_deduction",
        return_form_or_schedule: "Schedule C",
        return_line: "27b",
        return_instance_reference: "BUSINESS-1",
        expense_record_reference: "2025 clinical testing ledger",
        amount_before_reduction: 100_000,
        reduction_amount: 25_000,
        expense_amount_after_reduction: 75_000,
      }],
    }, {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      binaryAttachmentFileNames: [],
    })
  );
  assertStringIncludes(
    form8820.build({
      ...source,
      reduced_section280c_credit_election: false,
      expense_reduction_statement_file_name: "deduction-reduction.pdf",
      expense_reductions: [{
        treatment: "current_deduction",
        return_form_or_schedule: "Schedule C",
        return_line: "27b",
        return_instance_reference: "BUSINESS-1",
        expense_record_reference: "2025 clinical testing ledger",
        amount_before_reduction: 100_000,
        reduction_amount: 25_000,
        expense_amount_after_reduction: 75_000,
      }],
    }, {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      binaryAttachmentFileNames: ["deduction-reduction.pdf"],
    }),
    "<ReducedSection280CCrElectInd>false</ReducedSection280CCrElectInd>",
  );
  assertEquals(form8820.build({}), "");
});

Deno.test("Form 8820 MeF preserves a zero-credit reduced election without Form 3800", () => {
  const election = {
    ...source,
    f8820s: [{ ...source.f8820s[0], qualified_clinical_testing_expenses: 0 }],
    form8932_overlapping_wage_credit: 0,
  };
  const xml = form8820.build(election, { documentIdsByPendingKey: {} });
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectInd>true</ReducedSection280CCrElectInd>",
  );
  assertStringIncludes(
    xml,
    "<SumCurrYrCrandOrphnDrugCrAmt>0</SumCurrYrCrandOrphnDrugCrAmt>",
  );
  assertEquals(
    form8820.build({ ...election, reduced_section280c_credit_election: false }),
    "",
  );
});

Deno.test("Form 8820 MeF includes mixed line 3 but omits a pass-through-only form", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 Schedule K-1 orphan-drug credit",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const mixed = { ...source, pass_through_credits: [passThrough] };
  const xml = form8820.build(mixed, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<OrphanDrugCreditAmt>1250</OrphanDrugCreditAmt>");
  assertStringIncludes(
    xml,
    "<SumCurrYrCrandOrphnDrugCrAmt>19750</SumCurrYrCrandOrphnDrugCrAmt>",
  );
  assertEquals(
    form8820.build({
      ...mixed,
      f8820s: [],
      reduced_section280c_credit_election: false,
    }),
    "",
  );
});

Deno.test("Form 8820 MeF reconciles a section 280C reduction to filed Schedule C", () => {
  const fullCredit = {
    ...source,
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "deduction-reduction.pdf",
    expense_reductions: [{
      treatment: "current_deduction" as const,
      return_form_or_schedule: "Schedule C",
      return_line: "27b",
      return_instance_reference: "BUSINESS-1",
      expense_record_reference: "CLINICAL-001",
      amount_before_reduction: 100_000,
      reduction_amount: 25_000,
      expense_amount_after_reduction: 75_000,
    }],
  };
  const business = {
    line_a_principal_business: "Clinical research",
    line_b_business_code: "541715",
    business_reference: "BUSINESS-1",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 120_000,
    line_27b_other_expenses: 75_000,
  };
  const context = {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    binaryAttachmentFileNames: ["deduction-reduction.pdf"],
    pending: { schedule_c: { schedule_cs: [business] } },
  };
  assertStringIncludes(form8820.build(fullCredit, context), "<IRS8820>");
  assertThrows(
    () =>
      form8820.build(fullCredit, {
        ...context,
        pending: {
          schedule_c: {
            schedule_cs: [{ ...business, line_27b_other_expenses: 76_000 }],
          },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8820.build(fullCredit, {
        ...context,
        pending: { schedule_c: { schedule_cs: [] } },
      }),
    Error,
    "linked Schedule C business",
  );
  assertStringIncludes(
    form8820.build({
      ...fullCredit,
      expense_reductions: [{
        ...fullCredit.expense_reductions[0],
        return_line: "11",
      }],
    }, {
      ...context,
      pending: {
        schedule_c: {
          schedule_cs: [{
            ...business,
            line_11_contract_labor: 75_000,
            line_27b_other_expenses: 0,
          }],
        },
      },
    }),
    "<IRS8820>",
  );
  assertThrows(
    () =>
      form8820.build({
        ...fullCredit,
        expense_reductions: [{
          ...fullCredit.expense_reductions[0],
          return_line: "26",
        }],
      }, context),
    Error,
    "filed-line support",
  );
});

Deno.test("Form 8820 MeF reconciles a section 280C reduction to filed Schedule F", () => {
  const farmSource = {
    ...source,
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "farm-reduction.pdf",
    expense_reductions: [{
      treatment: "current_deduction" as const,
      return_form_or_schedule: "Schedule F",
      return_line: "32",
      return_instance_reference: "FARM-1",
      expense_record_reference: "CLINICAL-FARM-001",
      amount_before_reduction: 100_000,
      reduction_amount: 25_000,
      expense_amount_after_reduction: 75_000,
    }],
  };
  const farm = {
    farm_id: "FARM-1",
    line_a_principal_crop_activity: "Livestock research",
    line_b_agricultural_activity_code: "112111",
    line_e_material_participation: true,
    accounting_method: "cash",
    line1_sales_livestock_resale: 0,
    line32_other_expenses: [{
      description: "Qualified clinical testing",
      amount: 75_000,
    }],
  };
  const context = {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    binaryAttachmentFileNames: ["farm-reduction.pdf"],
    pending: { schedule_f: { schedule_fs: [farm] } },
  };
  assertStringIncludes(form8820.build(farmSource, context), "<IRS8820>");
  assertThrows(
    () =>
      form8820.build(farmSource, {
        ...context,
        pending: {
          schedule_f: {
            schedule_fs: [{
              ...farm,
              line32_other_expenses: [{
                description: "Clinical",
                amount: 74_000,
              }],
            }],
          },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertStringIncludes(
    form8820.build({
      ...farmSource,
      expense_reductions: [{
        ...farmSource.expense_reductions[0],
        return_line: "13",
      }],
    }, {
      ...context,
      pending: {
        schedule_f: {
          schedule_fs: [{
            ...farm,
            line13_custom_hire: 75_000,
            line32_other_expenses: [],
          }],
        },
      },
    }),
    "<IRS8820>",
  );
  assertThrows(
    () =>
      form8820.build({
        ...farmSource,
        expense_reductions: [{
          ...farmSource.expense_reductions[0],
          treatment: "capitalized_basis",
        }],
      }, context),
    Error,
    "capitalized-basis reduction needs",
  );
});

Deno.test("Form 8820 builds its own section 280C PDF attachment", async () => {
  const filer = {
    primarySSN: "123456789",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TEST",
    fullName: "Test Taxpayer",
    address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    filingStatus: FilingStatus.Single,
  };
  const fullCredit = {
    ...source,
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "deduction-reduction.pdf",
    expense_reductions: [{
      treatment: "current_deduction" as const,
      return_form_or_schedule: "Schedule C",
      return_line: "27b",
      return_instance_reference: "BUSINESS-1",
      expense_record_reference: "CLINICAL-001",
      amount_before_reduction: 100_000,
      reduction_amount: 25_000,
      expense_amount_after_reduction: 75_000,
    }],
  };
  const attachments = await form8820.buildBinaryAttachments?.(fullCredit, {
    filer,
  }) ?? [];
  assertEquals(attachments.length, 1);
  assertEquals(attachments[0].fileName, "deduction-reduction.pdf");
  assertEquals(
    new TextDecoder().decode(attachments[0].bytes.subarray(0, 5)),
    "%PDF-",
  );
  assertEquals(
    (await PDFDocument.load(attachments[0].bytes)).getPageCount(),
    1,
  );
  assertEquals(
    (await form8820.buildBinaryAttachments?.(source, { filer }))?.length,
    0,
  );
  const many = {
    ...fullCredit,
    expense_reductions: Array.from({ length: 20 }, (_, index) => ({
      ...fullCredit.expense_reductions[0],
      return_form_or_schedule: "Schedule E",
      return_line: String(index + 1),
      return_instance_reference: undefined,
      expense_record_reference: `CLINICAL-${index + 1}`,
      amount_before_reduction: 2_000,
      reduction_amount: 1_250,
      expense_amount_after_reduction: 750,
    })),
  };
  const multiPage = await form8820.buildBinaryAttachments?.(many, { filer }) ??
    [];
  assertEquals(multiPage.length, 1);
  assertEquals(
    (await PDFDocument.load(multiPage[0].bytes)).getPageCount() > 1,
    true,
  );
});
