import { assertEquals, assertThrows } from "@std/assert";
import {
  ForeignTaxCreditMethod,
  IncomeCategory,
} from "../../intermediate/forms/form_1116/index.ts";
import { form1116_schedule_c_source, inputSchema } from "./index.ts";
import { scheduleCLedger } from "./test-fixture.ts";

const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("Schedule C source routes a reviewed payor and filed-return ledger", () => {
  const ledger = scheduleCLedger();
  const result = form1116_schedule_c_source.compute(ctx, { ledgers: [ledger] });
  assertEquals(result.outputs[0].fields.foreign_tax_redeterminations, [ledger]);
});

Deno.test("Schedule C source rejects a cash-method additional payment", () => {
  const ledger = scheduleCLedger(
    IncomeCategory.General,
    "additional_accrued_tax",
  );
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [{
          ...ledger,
          tax_credit_method_in_relation_back_year: ForeignTaxCreditMethod.Paid,
        }],
      }),
    Error,
    "current-year Form 1116 Part II",
  );
});

Deno.test("Schedule C source validates the two-year date and payor conversion", () => {
  const ledger = scheduleCLedger(
    IncomeCategory.Passive,
    "accrued_tax_unpaid_after_24_months",
  );
  inputSchema.parse({ ledgers: [ledger] });
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [{
          ...ledger,
          payor_events: [{
            ...ledger.payor_events[0],
            event_date: "2025-12-30",
          }],
        }],
      }),
    Error,
    "24 months",
  );
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [{
          ...ledger,
          payor_events: [{ ...ledger.payor_events[0], tax_change_usd: 21 }],
        }],
      }),
    Error,
    "conversion rate",
  );
  inputSchema.parse({
    ledgers: [{
      ...ledger,
      payor_events: [{
        ...ledger.payor_events[0],
        foreign_tax_year_end: "2023-06-30",
        event_date: "2025-06-30",
      }],
    }],
  });
});

Deno.test("Schedule C source rejects a paid-method 24-month deemed refund", () => {
  const ledger = scheduleCLedger(
    IncomeCategory.Passive,
    "accrued_tax_unpaid_after_24_months",
  );
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [{
          ...ledger,
          tax_credit_method_in_relation_back_year: ForeignTaxCreditMethod.Paid,
        }],
      }),
    Error,
    "applies to accrued foreign taxes",
  );
});

Deno.test("Schedule C source requires filed/revised tax and affected-year reconciliation", () => {
  const ledger = scheduleCLedger();
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [{
          ...ledger,
          redetermined_form1116: {
            ...ledger.redetermined_form1116,
            foreign_taxes_paid_or_accrued_usd: 90,
          },
        }],
      }),
    Error,
    "do not reconcile filed and redetermined",
  );
  assertThrows(() =>
    inputSchema.parse({
      ledgers: [{ ...ledger, affected_years: [] }],
    }), Error);
  assertThrows(
    () =>
      inputSchema.parse({
        ledgers: [ledger, ledger],
      }),
    Error,
    "one ledger per category and relation-back year",
  );
});
