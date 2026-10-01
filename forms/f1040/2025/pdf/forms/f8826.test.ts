import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8826 } from "../../mef/forms/f8826_draft.ts";
import { form3800 } from "../../mef/forms/f3800.ts";
import { registry } from "../../registry.ts";
import { form8826Pdf } from "./f8826.ts";

const source = {
  eligible_expenditures: 5_000,
  prior_year_gross_receipts: 500_000,
  prior_year_full_time_employee_count: 20,
  subject_to_passive_activity_limit: false,
  self_source_evidence: {
    business_reference: "ACCESS-BUSINESS",
    prior_year_gross_receipts_source_reference: "2024 business return",
    prior_year_gross_receipts: 500_000,
    prior_year_full_time_employee_count_source_reference: "2024 payroll roster",
    prior_year_full_time_employee_count: 20,
    no_predecessor_or_common_control_confirmed: true as const,
    interpreter_expenditures: [{
      expense_record_reference: "ACCESS-EXPENSE-1",
      invoice_reference: "ACCESS-INVOICE-1",
      payment_reference: "ACCESS-PAYMENT-1",
      paid_or_incurred_on: "2025-06-01",
      amount: 5_000,
      hearing_impaired_service_confirmed: true as const,
      ada_compliance_confirmed: true as const,
      reasonable_and_necessary_confirmed: true as const,
    }],
    schedule_c_line27b: {
      amount_before_credit_reduction: 5_000,
      credit_reduction_amount: 2_375,
      amount_after_credit_reduction: 2_625,
      not_deducted_elsewhere_confirmed: true as const,
      not_capitalized_or_used_for_other_credit_confirmed: true as const,
    },
  },
};
const parent = {
  f8826_credit_entries: [{
    source_type: "self" as const,
    credit_amount: 2_375,
    subject_to_passive_activity_limit: false,
  }],
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 2_375,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 2_375,
};
const pending = {
  f8826: source,
  f3800: parent,
  f1040: {
    line16_income_tax: 40_000,
    line20_nonrefundable_credits: 2_375,
  },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 2_375, line8_total: 2_375 },
  schedule_c: {
    schedule_cs: [{
      business_reference: "ACCESS-BUSINESS",
      line_a_principal_business: "Interpreter services",
      line_b_business_code: "541930",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 100_000,
      line_27b_other_expenses: 2_625,
    }],
  },
};

Deno.test("sourced interpreter expense and reduced Schedule C deduction reach Form 1040", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 300_000,
      box6_medicare_withheld: 5_250,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    f8826: source,
    schedule_c: pending.schedule_c.schedule_cs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.f3800?.f8826_credit_entries,
    parent.f8826_credit_entries,
  );
  assertEquals(result.pending.f3800?.allowed_credit, 2_375);
  assertEquals(result.pending.schedule3?.line6a_total, 2_375);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 2_375);
});

Deno.test("self-earned Form 8826 prints the same source credit as native Form 3800 and final tax", () => {
  const native = form8826.build(source, {
    pending,
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(native, "<IRS8826>");
  assertStringIncludes(native, "<ShareOfCreditAmt>2375</ShareOfCreditAmt>");
  assertStringIncludes(
    native,
    "<PrtshpandSCorpReportAmt>2375</PrtshpandSCorpReportAmt>",
  );
  const parentNative = form3800.build(parent, {
    pending,
    documentIdsByPendingKey: {
      f8826: ["IRS8826_1"],
      form6251: ["IRS6251_1"],
    },
  });
  assertStringIncludes(parentNative, "<Frm8826CYAggrgtAmtGrp");
  assertStringIncludes(
    parentNative,
    "<TotalGeneralBusCreditsAppTxAmt>2375</TotalGeneralBusCreditsAppTxAmt>",
  );

  assertEquals(form8826Pdf.includeWhen!(source), true);
  assertEquals(form8826Pdf.pageIndices!(source), [0]);
  assertEquals(form8826Pdf.projectFields!(source, pending), {
    line1_dollars: "5000",
    line1_cents: "00",
    line3_dollars: "4750",
    line3_cents: "00",
    line5_dollars: "4750",
    line5_cents: "00",
    line6_dollars: "2375",
    line6_cents: "00",
    line8_dollars: "2375",
    line8_cents: "00",
  });
  assertEquals(
    form8826Pdf.includeWhen!({
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{
        entity_type: "s_corporation",
        entity_ein: "987654321",
        source_document_reference: "K-1 access credit",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    }),
    false,
  );

  assertThrows(
    () =>
      form8826Pdf.projectFields!(
        { ...source, eligible_expenditures: 4_000 },
        pending,
      ),
    Error,
    "Form 8826 PDF line 8 differs",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!(source, {
        ...pending,
        f3800: {
          ...parent,
          f8826_credit_entries: [{
            ...parent.f8826_credit_entries[0],
            credit_amount: 2_374,
          }],
        },
      }),
    Error,
    "Form 8826 PDF line 8 differs",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!(source, {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_374 },
      }),
    Error,
    "Form 1040 line 20",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!({
        ...source,
        self_source_evidence: {
          ...source.self_source_evidence,
          interpreter_expenditures: [{
            ...source.self_source_evidence.interpreter_expenditures[0],
            amount: 4_999,
          }],
        },
      }, pending),
    Error,
    "interpreter expenses and credit reduction",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!(source, {
        ...pending,
        schedule_c: {
          schedule_cs: [{
            ...pending.schedule_c.schedule_cs[0],
            line_27b_other_expenses: 5_000,
          }],
        },
      }),
    Error,
    "filed Schedule C line 27b",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!({
        ...source,
        self_source_evidence: {
          ...source.self_source_evidence,
          prior_year_gross_receipts: 500_001,
        },
      }, pending),
    Error,
    "prior-year eligibility differs",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!(
        { ...source, subject_to_passive_activity_limit: true },
        pending,
      ),
    Error,
    "self-earned, nonpassive",
  );
  assertThrows(
    () =>
      form8826Pdf.projectFields!({
        ...source,
        pass_through_credits: [{
          entity_type: "s_corporation",
          entity_ein: "987654321",
          source_document_reference: "2025 disability-access K-1",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
      }, pending),
    Error,
    "without pass-through credits",
  );
});
