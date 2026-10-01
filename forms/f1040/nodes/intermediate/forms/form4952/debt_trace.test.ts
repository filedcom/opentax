import { assertEquals, assertThrows } from "@std/assert";
import {
  form4952DirectDebtTraceSchema,
  reconcileForm4952DirectDebtTrace,
} from "./debt_trace.ts";

const trace = form4952DirectDebtTraceSchema.parse({
  tax_year: 2025,
  owner_tin: "123456789",
  loan_id: "broker-loan-1",
  lender_statement_reference: "bank-2025-interest-statement",
  loan_agreement_reference: "bank-loan-agreement",
  disbursement_record_reference: "bank-disbursement-2025-02-01",
  purchase_record_reference: "broker-purchase-2025-02-01",
  loan_date: "2025-02-01",
  direct_purchase_date: "2025-02-01",
  borrowed_principal: 10_000,
  direct_taxable_securities_purchase: 10_000,
  asset_id: "taxable-security-lot-1",
  no_other_loan_proceeds_use: true,
  no_tax_exempt_or_passive_activity_asset: true,
  investment_use_maintained_through_2025: true,
  lender_2025_interest_total: 400,
  interest_payments: [{
    payment_id: "payment-1",
    payment_date: "2025-06-30",
    payment_record_reference: "bank-payment-2025-06-30",
    interest_amount: 200,
  }, {
    payment_id: "payment-2",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-payment-2025-12-31",
    interest_amount: 200,
  }],
});

Deno.test("Form 4952 direct debt trace matches one taxable purchase and paid interest", () => {
  assertEquals(
    reconcileForm4952DirectDebtTrace(
      trace,
      { investment_interest_expense: 400 },
      "123456789",
    ),
    trace,
  );
});

Deno.test("Form 4952 direct debt trace rejects other uses, source drift, and duplicate payments", () => {
  const form = { investment_interest_expense: 400 };
  const reject = (input: unknown, fields: unknown = form, tin = "123456789") =>
    assertThrows(
      () => reconcileForm4952DirectDebtTrace(input, fields, tin),
    );
  reject(trace, form, "987654321");
  reject({ ...trace, direct_taxable_securities_purchase: 9_000 });
  reject({ ...trace, no_other_loan_proceeds_use: false });
  reject({ ...trace, no_tax_exempt_or_passive_activity_asset: false });
  reject({ ...trace, investment_use_maintained_through_2025: false });
  reject({ ...trace, lender_2025_interest_total: 350 });
  reject({
    ...trace,
    interest_payments: [
      trace.interest_payments[0],
      trace.interest_payments[0],
    ],
  });
  reject({ ...trace, direct_purchase_date: "2025-01-31" });
  reject(trace, { investment_interest_expense: 399 });
  reject(trace, {
    investment_interest_expense: 400,
    source_k1_investment_interest: 100,
  });
});
