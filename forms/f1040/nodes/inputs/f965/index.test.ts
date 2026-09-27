import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import {
  currentYear965Payment,
  f965,
  type F965Input,
  inputSchema,
  unpaidLiability,
} from "./index.ts";

function source(overrides: Partial<F965Input> = {}) {
  return inputSchema.parse({
    reporting_year: 2025,
    amended_report: false,
    f965s: [{
      entry_type: "original",
      source_document_reference:
        "2018 filed Form 965-A and 2025 payment ledger",
      tax_year_of_inclusion: 2018,
      net_tax_with_965: 52_000,
      net_tax_without_965: 20_000,
      installment_election: true,
      net_tax_adjustment: 0,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        8_000,
      ],
      current_year_payment: 8_000,
      current_year_payment_reference: "2025 IRS payment confirmation",
    }],
    s_corp_calculations: [],
    s_corp_deferred_rows: [],
    ...overrides,
  });
}

Deno.test("Form 965-A uses cumulative payments and the actual TY2025 payment", () => {
  const input = source();
  assertEquals(currentYear965Payment(input), 8_000);
  assertEquals(unpaidLiability(input, input.f965s[0]), 0);
  const result = f965.compute(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line20_965_tax_installment,
    8_000,
  );
});

Deno.test("Form 965-A retains an unpaid liability without inventing a 2025 payment", () => {
  const input = source({
    f965s: [{
      ...source().f965s[0],
      tax_year_of_inclusion: 2017,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        0,
      ],
      current_year_payment: 0,
      current_year_payment_reference: undefined,
    }],
  });
  assertEquals(unpaidLiability(input, input.f965s[0]), 8_000);
  assertEquals(
    f965.compute({ taxYear: 2025, formType: "f1040" }, input).outputs,
    [],
  );
});

Deno.test("Form 965-A rejects unsourced payments and overpaid balances", () => {
  assertThrows(() =>
    source({
      f965s: [{
        ...source().f965s[0],
        current_year_payment_reference: undefined,
      }],
    })
  );
  assertThrows(() =>
    source({
      f965s: [{
        ...source().f965s[0],
        paid_by_installment_year: Array(8).fill(8_000),
      }],
    })
  );
});

Deno.test("Form 965-A S corporation deferral reduces installment-eligible liability", () => {
  const input = source({
    f965s: [{
      ...source().f965s[0],
      net_tax_with_965: 62_000,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        8_000,
      ],
    }],
    s_corp_calculations: [{
      inclusion_year: 2018,
      source_document_reference: "2018 S corporation section 965 statement",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      net_tax_with_965: 15_000,
      net_tax_without_965: 5_000,
      deferral_election: true,
    }],
    s_corp_deferred_rows: [{
      election_or_transfer_year: 2018,
      source_document_reference: "2024 filed Form 965-A Part IV",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      beginning_deferred_liability: 10_000,
      triggered_liability: 0,
      transferred_liability: 0,
    }],
  });
  assertEquals(unpaidLiability(input, input.f965s[0]), 0);
});
