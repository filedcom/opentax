import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { form4952 as nativeForm4952 } from "../2025/mef/forms/f4952.ts";
import { form4952Pdf } from "../2025/pdf/forms/f4952.ts";
import { testFiler } from "../2025/mef/test-filer.ts";

const trace = {
  tax_year: 2025,
  owner_tin: "123456789",
  loan_id: "loan-one",
  lender_statement_reference: "lender-2025-interest",
  loan_agreement_reference: "signed-loan-agreement",
  disbursement_record_reference: "2025-direct-disbursement",
  purchase_record_reference: "broker-lot-purchase",
  loan_date: "2025-01-10",
  direct_purchase_date: "2025-01-10",
  borrowed_principal: 100_000,
  direct_taxable_securities_purchase: 100_000,
  asset_id: "taxable-security-lot-1",
  no_other_loan_proceeds_use: true,
  no_tax_exempt_or_passive_activity_asset: true,
  investment_use_maintained_through_2025: true,
  lender_2025_interest_total: 20_000,
  interest_payments: [{
    payment_id: "first-payment",
    payment_date: "2025-06-30",
    payment_record_reference: "bank-payment-june",
    interest_amount: 10_000,
  }, {
    payment_id: "second-payment",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-payment-december",
    interest_amount: 10_000,
  }],
} as const;

function filing(source: "interest" | "dividend" = "interest") {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    ...(source === "interest"
      ? {
        f1099int: [{
          payer_name: "Taxable bond payer",
          box1: 100_000,
          investment_property_for_form4952: true,
        }],
      }
      : {
        f1099div: [{
          payerName: "Taxable stock payer",
          source_document_reference: "issued-2025-stock-dividend",
          isNominee: false,
          box11: false,
          box1a: 100_000,
          investment_property_for_form4952: true,
        }],
      }),
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
    form4952: {
      investment_interest_expense: 20_000,
      direct_debt_trace: trace,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
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

Deno.test("Form 4952 direct loan reaches Schedule A, Form 1040, native, and PDF", () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line1, 20_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 100_000);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 20_000);
  const fields = result.pending.form4952!;
  const xml = nativeForm4952.build(fields, {
    pending: result.pending,
    filer: testFiler(),
  });
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
});

Deno.test("Form 4952 traced loan with one ordinary dividend payer reaches native and PDF", () => {
  const result = filing("dividend");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 100_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: { ...result.pending, f1099div: { f1099divs: [] } },
        filer: testFiler(),
      }),
    Error,
    "one retained loan",
  );
});

Deno.test("Form 4952 direct loan rejects payment, loan, and owner tampering at export", () => {
  const result = filing();
  const fields = result.pending.form4952!;
  const changed = {
    ...result.pending,
    form4952: {
      ...fields,
      direct_debt_trace: {
        ...trace,
        interest_payments: [{
          ...trace.interest_payments[0],
          payment_record_reference: "different bank record",
        }, trace.interest_payments[1]],
      },
    },
  };
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: changed,
        filer: testFiler(),
      }),
    Error,
    "matching payments",
  );
  assertThrows(
    () => form4952Pdf.projectFields!(fields, changed),
    Error,
    "matching payments",
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: result.pending,
        filer: { ...testFiler(), primarySSN: "987654321" },
      }),
    Error,
    "owner",
  );
  assertThrows(
    () =>
      form4952Pdf.instances!(fields, {
        ...testFiler(),
        primarySSN: "987654321",
      }, result.pending),
    Error,
    "owner",
  );
});
