import { assertEquals, assertThrows } from "@std/assert";
import { reconcileBusinessInterestExpenseRecords } from "./interest-expense.ts";
import { stageProvisionalScheduleCInterest } from "./two-stage.ts";

const provisional = stageProvisionalScheduleCInterest({
  schedule_cs: [{
    business_reference: "C-1",
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 200_000,
    line_16b_interest_other: 100_000,
  }],
});

const traced = {
  interest_payment_reference: "statement-1",
  debt_proceeds_tracing_reference: "loan-ledger-1",
  debtor_taxpayer_ssn: "123456789",
  lender_ein: "987654321",
  debt_account_reference: "BUSINESS-LOAN-1",
  business_reference: "C-1",
  allocation: "nonexcepted_schedule_c_business" as const,
  interest_paid_amount: 100_000,
  line16b_business_interest_amount: 100_000,
};

Deno.test("2025 Form 8990 interest records reconcile to one nonexcepted Schedule C", () => {
  assertEquals(
    reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
      {
        ...traced,
        interest_paid_amount: 60_000,
        line16b_business_interest_amount: 60_000,
      },
      {
        ...traced,
        interest_payment_reference: "statement-2",
        interest_paid_amount: 40_000,
        line16b_business_interest_amount: 40_000,
      },
    ]).length,
    2,
  );
});

Deno.test("2025 Form 8990 rejects missing, duplicate, and unmatched interest tracing", () => {
  assertThrows(
    () => reconcileBusinessInterestExpenseRecords(provisional, "123456789", []),
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        {
          ...traced,
          interest_paid_amount: 99_999,
          line16b_business_interest_amount: 99_999,
        },
      ]),
    Error,
    "does not match Schedule C line 16b",
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        {
          ...traced,
          interest_paid_amount: 60_000,
          line16b_business_interest_amount: 60_000,
        },
        {
          ...traced,
          interest_paid_amount: 40_000,
          line16b_business_interest_amount: 40_000,
        },
      ]),
    Error,
    "references are duplicated",
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, business_reference: "C-2" },
      ]),
    Error,
    "differs from Schedule C business",
  );
});

Deno.test("2025 Form 8990 rejects untraced or excepted interest classifications", () => {
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, interest_paid_amount: 110_000 },
      ]),
    Error,
    "wholly business-allocated interest payments",
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, debt_proceeds_tracing_reference: "" },
      ]),
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, allocation: "excepted_real_property_business" },
      ]),
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, allocation: "personal" },
      ]),
  );
});

Deno.test("2025 Form 8990 binds traced debt to the filer and one account/workpaper pair", () => {
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        { ...traced, debtor_taxpayer_ssn: "999999999" },
      ]),
    Error,
    "debt owner differs",
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        {
          ...traced,
          interest_paid_amount: 60_000,
          line16b_business_interest_amount: 60_000,
        },
        {
          ...traced,
          interest_payment_reference: "statement-2",
          debt_account_reference: "BUSINESS-LOAN-2",
          interest_paid_amount: 40_000,
          line16b_business_interest_amount: 40_000,
        },
      ]),
    Error,
    "account and workpaper references conflict",
  );
  assertThrows(
    () =>
      reconcileBusinessInterestExpenseRecords(provisional, "123456789", [
        {
          ...traced,
          interest_paid_amount: 60_000,
          line16b_business_interest_amount: 60_000,
        },
        {
          ...traced,
          interest_payment_reference: "statement-2",
          debt_proceeds_tracing_reference: "loan-ledger-2",
          interest_paid_amount: 40_000,
          line16b_business_interest_amount: 40_000,
        },
      ]),
    Error,
    "account and workpaper references conflict",
  );
});
