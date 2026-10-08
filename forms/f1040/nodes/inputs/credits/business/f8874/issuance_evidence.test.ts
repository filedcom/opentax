import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema } from "./index.ts";
import {
  form8874AIssuanceSchema,
  reconcileForm8874AIssuance,
} from "./issuance_evidence.ts";

const notice = form8874AIssuanceSchema.parse({
  notice_document_reference: "cde-8874a-qei-one",
  cde_name: "Low Income Community CDE",
  cde_ein: "123456789",
  investor_name: "Alex Owner",
  investor_tin: "111223333",
  initial_investment_date: "2023-04-15",
  qualified_equity_investment_amount: 10_000,
  total_allowable_credit: 3_900,
  annual_credit_amounts: [500, 500, 500, 600, 600, 600, 600],
  cde_official_signed_notice_confirmed: true,
  cde_signature_date: "2023-04-20",
  notice_provided_to_investor_date: "2023-05-01",
});
const source = inputSchema.parse({
  investments: [{
    cde_name: "Low Income Community CDE",
    cde_ein: "123456789",
    cde_address: {
      line1: "10 Market St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    initial_investment_date: "2023-04-15",
    credit_allowance_date: "2025-04-15",
    qualified_equity_investment_amount: 10_000,
    designation_notice_reference: "cde-8874a-qei-one",
    reviewed_form8874a: notice,
    held_on_credit_allowance_date: true,
    qualified_on_credit_allowance_date: true,
    recapture_notice_received: false,
    subject_to_passive_activity_limit: false,
  }],
});
const pending = {
  f8874: source,
  f1040: {
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Owner",
    taxpayer_ssn: "111-22-3333",
  },
};

Deno.test("Form 8874-A issuance matches direct investor and 2025 year-three credit", () => {
  const result = reconcileForm8874AIssuance(notice, pending);
  assertEquals(result.creditYear, 3);
  assertEquals(result.credit, 500);
  assertEquals(
    result.investment.designation_notice_reference,
    notice.notice_document_reference,
  );
});

Deno.test("Form 8874-A rejects unsigned, late and inconsistent annual schedules", () => {
  for (
    const changed of [
      { cde_official_signed_notice_confirmed: false },
      { notice_provided_to_investor_date: "2023-07-01" },
      { annual_credit_amounts: [500, 500, 501, 600, 600, 600, 600] },
      { total_allowable_credit: 3_899 },
    ]
  ) {
    assertEquals(
      form8874AIssuanceSchema.safeParse({ ...notice, ...changed }).success,
      false,
    );
  }
});

Deno.test("Form 8874-A rejects investor, CDE, investment and year-three tampering", () => {
  for (
    const changed of [
      { investor_tin: "222334444" },
      { investor_name: "Other Owner" },
      { cde_ein: "999999999" },
      { notice_document_reference: "different-notice" },
      { initial_investment_date: "2023-05-15" },
      { qualified_equity_investment_amount: 11_000 },
    ]
  ) {
    assertThrows(
      () => reconcileForm8874AIssuance({ ...notice, ...changed }, pending),
      Error,
    );
  }
  assertThrows(
    () =>
      reconcileForm8874AIssuance(notice, {
        ...pending,
        f1040: { ...pending.f1040, taxpayer_ssn: "222334444" },
      }),
    Error,
    "investor differs",
  );
  assertThrows(() =>
    reconcileForm8874AIssuance(notice, {
      ...pending,
      f8874: { investments: [source.investments[0], source.investments[0]] },
    }), Error);
});
