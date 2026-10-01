import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  form3800 as form3800Builder,
  prepareForm3800DocumentParts,
} from "../../mef/forms/f3800.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { registry } from "../../registry.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartVFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";

const form8826 = {
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
  pass_through_credits: [{
    entity_type: "s_corporation" as const,
    entity_ein: "987654321",
    source_document_reference: "2025 disability-access K-1",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  }],
};
const form3800 = {
  f8826_credit_entries: [{
    source_type: "self" as const,
    credit_amount: 2_375,
    subject_to_passive_activity_limit: false,
  }, {
    source_type: "s_corporation" as const,
    source_ein: "987654321",
    source_document_reference: "2025 disability-access K-1",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  }],
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 3_625,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 3_625,
};
const pending = {
  f3800: form3800,
  f8826: form8826,
  k1_s_corp: {
    k1_s_corps: [{
      corporation_name: "Access Corporation",
      corporation_ein: "987654321",
      source_document_reference: "2025 disability-access K-1",
      box13_code_k_disabled_access_credit: 1_250,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
  },
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
  f1040: {
    line16_income_tax: 40_000,
    line20_nonrefundable_credits: 3_625,
  },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 3_625, line8_total: 3_625 },
};
const ids = {
  f8826: ["IRS8826_1"],
  form6251: ["IRS6251_1"],
};

Deno.test("combined Form 8826 source reaches Form 3800 and final Form 1040", () => {
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
    f8826: form8826,
    k1_s_corp: pending.k1_s_corp.k1_s_corps,
    schedule_c: pending.schedule_c.schedule_cs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.f3800?.f8826_credit_entries,
    form3800.f8826_credit_entries,
  );
  assertEquals(result.pending.f3800?.allowed_credit, 3_625);
  assertEquals(result.pending.schedule3?.line6a_total, 3_625);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 3_625);
});

Deno.test("Form 3800 line 1e retains one self and one S corporation Form 8826 source through native, PDF, and final tax", () => {
  const prepared = prepareForm3800DocumentParts(form3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  if (!prepared) throw new Error("Expected a prepared Form 3800 credit");
  const xml = form3800Builder.build(form3800, {
    pending,
    documentIdsByPendingKey: ids,
  });
  assertStringIncludes(xml, "<Frm8826CYAggrgtAmtGrp");
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>3625</TotalGeneralBusCreditsAppTxAmt>",
  );
  const [fields] = form3800Pdf.instances!(
    form3800,
    testFiler(),
    pending,
    prepared,
  );
  assertEquals(fields[form3800PartIIIFields("1e").e], 3_625);
  assertEquals(fields[form3800PartIAndIIFields.line38], 3_625);
  assertEquals(fields[form3800PartVFields(1).e], 2_375);
  assertEquals(fields[form3800PartVFields(2).c1], "987654321");
  assertEquals(fields[form3800PartVFields(2).e], 1_250);
  assertEquals(prepared.currentDetails.map((row) => row.credit), [
    2_375,
    1_250,
  ]);

  assertThrows(
    () =>
      form3800Pdf.instances!(form3800, testFiler(), {
        ...pending,
        f8826: { ...form8826, eligible_expenditures: 4_000 },
      }, prepared),
    Error,
    "Form 3800 PDF line 1e differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(form3800, testFiler(), pending, {
        ...prepared,
        currentDetails: [prepared.currentDetails[0], {
          ...prepared.currentDetails[1],
          credit: 1_249,
        }],
      }),
    Error,
    "Form 3800 PDF line 1e differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(form3800, testFiler(), {
        ...pending,
        f8826: {
          ...form8826,
          pass_through_credits: [{
            ...form8826.pass_through_credits[0],
            entity_ein: "123456789",
          }],
        },
      }, prepared),
    Error,
    "Form 3800 PDF line 1e differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...form3800,
          f8826_credit_entries: [{
            ...form3800.f8826_credit_entries[0],
            credit_amount: 2_374,
          }, form3800.f8826_credit_entries[1]],
        },
        testFiler(),
        pending,
        prepared,
      ),
    Error,
    "Form 3800 PDF line 1e differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(form3800, testFiler(), {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 3_624 },
      }, prepared),
    Error,
    "Form 1040 line 20",
  );
});
