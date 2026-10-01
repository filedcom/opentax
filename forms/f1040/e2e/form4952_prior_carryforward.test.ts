import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { form4952 as nativeForm4952 } from "../2025/mef/forms/f4952.ts";
import { form4952Pdf } from "../2025/pdf/forms/f4952.ts";
import { testFiler } from "../2025/mef/test-filer.ts";

const prior = {
  tax_year: 2024 as const,
  filed_return_reference: "2024-accepted-filing-review",
  completed_form_reference: "2024-completed-form4952-review",
  filed_primary_ssn: "123456789",
  reviewed_by: "Tax Reviewer",
  reviewed_on: "2026-09-30",
  filed_2024_form4952: {
    line1: 5_000,
    line2: 0,
    line3: 5_000,
    line6: 1_000,
    line7: 4_000,
    line8: 1_000,
  },
  filed_2024_schedule_a_line9: 1_000,
  prior_interest_entirely_schedule_a_confirmed: true,
  prior_no_form6198_allocation_confirmed: true,
  reviewed_2024_amt_form4952_line7: 4_000,
};
const trace = {
  tax_year: 2025,
  owner_tin: "123456789",
  loan_id: "taxable-bond-purchase-loan",
  lender_statement_reference: "lender-2025-statement",
  loan_agreement_reference: "loan-agreement",
  disbursement_record_reference: "bank-disbursement",
  purchase_record_reference: "bond-purchase-record",
  loan_date: "2025-01-10",
  direct_purchase_date: "2025-01-10",
  borrowed_principal: 100_000,
  direct_taxable_securities_purchase: 100_000,
  asset_id: "taxable-bond-lot",
  no_other_loan_proceeds_use: true,
  no_tax_exempt_or_passive_activity_asset: true,
  investment_use_maintained_through_2025: true,
  lender_2025_interest_total: 20_000,
  interest_payments: [{
    payment_id: "june-payment",
    payment_date: "2025-06-30",
    payment_record_reference: "bank-june",
    interest_amount: 10_000,
  }, {
    payment_id: "december-payment",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-december",
    interest_amount: 10_000,
  }],
};

function filing(source = prior) {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    f1099int: [{
      payer_name: "Taxable bond payer",
      source_document_reference: "2025-bond-interest",
      box1: 22_000,
      investment_property_for_form4952: true,
    }],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
    form4952: {
      investment_interest_expense: 20_000,
      direct_debt_trace: trace,
      prior_year_carryforward: 4_000,
      prior_year_carryforward_source: source,
      amt_refigure: {
        prior_year_disallowed_interest: 4_000,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4952 imports reviewed 2024 line 7 through the 2025 loan, Schedule A, Form 1040, MeF, and PDF", () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line1, 20_000);
  assertEquals(result.pending.form4952?.line2, 4_000);
  assertEquals(result.pending.form4952?.line3, 24_000);
  assertEquals(result.pending.form4952?.line7, 2_000);
  assertEquals(result.pending.form4952?.line8, 22_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 22_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 22_000);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 22_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<PriorYrDisallowInvsmtIntExpAmt>4000</PriorYrDisallowInvsmtIntExpAmt>",
  );
  assertEquals(form4952Pdf.projectFields!(fields, result.pending).line2, 4_000);
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
});

Deno.test("Form 4952 rejects altered prior line 7, filer, and retained source", () => {
  const badPrior = filing({
    ...prior,
    filed_2024_form4952: { ...prior.filed_2024_form4952, line7: 3_999 },
  });
  assertEquals(badPrior.diagnostics.length > 0, true);
  const result = filing();
  const fields = result.pending.form4952!;
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...result.pending,
          form4952: {
            ...fields,
            prior_year_carryforward_source: {
              ...prior,
              filed_primary_ssn: "987654321",
            },
          },
        },
        filer: testFiler(),
      }),
    Error,
    "prior carryforward differs",
  );
  assertThrows(
    () =>
      form4952Pdf.instances!(fields, {
        ...testFiler(),
        primarySSN: "987654321",
      }, result.pending),
    Error,
    "prior carryforward differs",
  );
  const changedAmtSource = {
    ...result.pending,
    form4952: {
      ...fields,
      prior_year_carryforward_source: {
        ...prior,
        reviewed_2024_amt_form4952_line7: 3_999,
      },
    },
  };
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: changedAmtSource,
        filer: testFiler(),
      }),
    Error,
    "prior carryforward",
  );
  assertThrows(
    () => form4952Pdf.projectFields!(fields, changedAmtSource),
    Error,
    "prior carryforward",
  );
});
