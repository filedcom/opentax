import { assertStringIncludes, assertThrows } from "@std/assert";
import { form965a } from "./f965a.ts";

const input = {
  reporting_year: 2025,
  amended_report: false,
  f965s: [{
    entry_type: "original",
    source_document_reference: "2018 filed Form 965-A and 2025 payment ledger",
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
};

Deno.test("Form 965-A emits cumulative Part I/II and reporting-year payment", () => {
  const xml = form965a.build(input, {
    pending: { schedule2: { line20_965_tax_installment: 8_000 } },
  });
  assertStringIncludes(xml, "<IRS965A>");
  assertStringIncludes(xml, "<NetTaxLiabilityYr>2018</NetTaxLiabilityYr>");
  assertStringIncludes(
    xml,
    "<NetSection965TaxLiabilityAmt>32000</NetSection965TaxLiabilityAmt>",
  );
  assertStringIncludes(xml, "<PaidYear8Amt>8000</PaidYear8Amt>");
  assertStringIncludes(xml, "<UnpaidTaxLiabilityAmt>0</UnpaidTaxLiabilityAmt>");
  assertStringIncludes(xml, "<PaidTaxLiabilityAmt>8000</PaidTaxLiabilityAmt>");
  assertStringIncludes(
    xml,
    "<NetSection965TaxLiabPaidAmt>8000</NetSection965TaxLiabPaidAmt>",
  );
});

Deno.test("Form 965-A refuses a Schedule 2 payment mismatch", () => {
  assertThrows(
    () =>
      form965a.build(input, {
        pending: { schedule2: { line20_965_tax_installment: 7_999 } },
      }),
    Error,
    "differ from Schedule 2 line 20",
  );
});
