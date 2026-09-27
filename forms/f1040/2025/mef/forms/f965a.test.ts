import { assertStringIncludes, assertThrows } from "@std/assert";
import { form965a } from "./f965a.ts";
import { form965aNetAdjustmentTransferStatement } from "./f965a_net_adjustment_transfer_statement.ts";
import { form965aMultipleTransfereeStatement } from "./f965a_multiple_transferee_statement.ts";

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

Deno.test("Form 965-A links native netted-transfer and multiple-transferee statements", () => {
  const withStatements = {
    ...input,
    f965s: [{
      ...input.f965s[0],
      net_tax_adjustment: 100,
      net_tax_adjustment_kind: "netted_adjustment_and_transfer",
      counterparty_tax_id: { kind: "ein", value: "987654321" },
      netted_adjustment_and_transfer: {
        adjustment_amount: 200,
        transferred_out_amount: -100,
        explanation: "IRS examination adjustment followed by transfer",
        source_document_reference: "2025 signed transfer agreement",
      },
    }],
    s_corp_deferred_rows: [{
      election_or_transfer_year: 2018,
      source_document_reference: "2025 signed Form 965-D agreements",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      beginning_deferred_liability: 10_000,
      triggered_liability: 0,
      transferred_liability: -6_000,
      counterparty_tax_id: { kind: "ein", value: "123123123" },
      multiple_transferees: [
        {
          tax_id: { kind: "ein", value: "123123123" },
          transferred_amount: 2_000,
        },
        {
          tax_id: { kind: "ssn", value: "321321321" },
          transferred_amount: 4_000,
        },
      ],
    }],
  };
  const context = {
    pending: {
      f965: withStatements,
      schedule2: { line20_965_tax_installment: 8_000 },
    },
  };
  assertStringIncludes(
    form965aNetAdjustmentTransferStatement.build(undefined, context),
    "<NetAdjustmentTransferStmt>",
  );
  assertStringIncludes(
    form965aMultipleTransfereeStatement.build(undefined, context),
    "<TransferredAmt>-4000</TransferredAmt>",
  );
  const parent = form965a.build(withStatements, {
    ...context,
    documentIdsByPendingKey: {
      f965_net_adjustment_transfer_statement: ["net1"],
      f965_multiple_transferee_statement: ["multi1"],
    },
  });
  assertStringIncludes(parent, 'referenceDocumentId="net1 multi1"');
  assertThrows(
    () =>
      form965a.build(withStatements, {
        ...context,
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs its supporting transfer statement",
  );
});
