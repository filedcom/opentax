import { assertStringIncludes, assertThrows } from "@std/assert";
import { buildForm8874Document, form8874 } from "./f8874.ts";

const source = {
  investments: [{
    cde_name: "Community Development Entity",
    cde_ein: "123456789",
    cde_address: {
      line1: "10 Main Street",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    initial_investment_date: "2023-04-15",
    credit_allowance_date: "2025-04-15",
    qualified_equity_investment_amount: 1_000_000,
    designation_notice_reference: "2023 QEI notice",
    held_on_credit_allowance_date: true,
    qualified_on_credit_allowance_date: true,
    recapture_notice_received: false,
    subject_to_passive_activity_limit: false,
  }],
};

Deno.test("Form 8874 MeF records an identified investment and 5 percent credit", () => {
  const xml = buildForm8874Document(source);
  assertStringIncludes(xml, "<IRS8874>");
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Community Development Entity</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<InitialInvestmentDt>2023-04-15</InitialInvestmentDt>",
  );
  assertStringIncludes(
    xml,
    "<EquityInvestmentAmt>1000000</EquityInvestmentAmt>",
  );
  assertStringIncludes(xml, "<CreditRt>5</CreditRt>");
  assertStringIncludes(xml, "<CreditByRatioAmt>50000</CreditByRatioAmt>");
  assertStringIncludes(xml, "<TotalCreditAmt>50000</TotalCreditAmt>");
});

Deno.test("Form 8874 MeF requires matching linked Form 3800", () => {
  assertThrows(
    () => form8874.build(source, { pending: { f8874: source } }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8874.build(source, {
        pending: { f3800: { f8874_credit: { credit_amount: 50_000 } } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs attached Form 3800",
  );
  const xml = form8874.build(source, {
    pending: { f3800: { f8874_credit: { credit_amount: 50_000 } } },
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<CDETotalCreditAmt>50000</CDETotalCreditAmt>");
});
