import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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
  transfer_agreements: [],
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
      transfer_agreement_file_name: "Form965C.pdf",
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
      transfer_agreement_links: [{
        counterparty_tax_id: { kind: "ein", value: "123123123" },
        file_name: "Form965D1.pdf",
      }, {
        counterparty_tax_id: { kind: "ssn", value: "321321321" },
        file_name: "Form965D2.pdf",
      }],
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
    transfer_agreements: [{
      agreement_type: "965-C",
      file_name: "Form965C.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 signed Form 965-C",
    }, {
      agreement_type: "965-D",
      file_name: "Form965D1.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 first signed Form 965-D",
    }, {
      agreement_type: "965-D",
      file_name: "Form965D2.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 second signed Form 965-D",
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
    binaryAttachmentFileNames: [
      "Form965C.pdf",
      "Form965D1.pdf",
      "Form965D2.pdf",
    ],
    documentIdsByAttachmentFileName: {
      "Form965C.pdf": "BinaryAttachment2",
      "Form965D1.pdf": "BinaryAttachment3",
      "Form965D2.pdf": "BinaryAttachment4",
    },
    documentIdsByPendingKey: {
      f965_net_adjustment_transfer_statement: ["net1"],
      f965_multiple_transferee_statement: ["multi1"],
    },
  });
  assertStringIncludes(
    parent,
    'referenceDocumentId="BinaryAttachment2 BinaryAttachment3 BinaryAttachment4 net1 multi1"',
  );
  assertThrows(
    () =>
      form965a.build(withStatements, {
        ...context,
        binaryAttachmentFileNames: [
          "Form965C.pdf",
          "Form965D1.pdf",
          "Form965D2.pdf",
        ],
        documentIdsByAttachmentFileName: {
          "Form965C.pdf": "BinaryAttachment2",
          "Form965D1.pdf": "BinaryAttachment3",
          "Form965D2.pdf": "BinaryAttachment4",
        },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs its supporting transfer statement",
  );
});

Deno.test("Form 965-A rejects an omitted signed agreement from the MeF bundle", () => {
  const source = {
    ...input,
    f965s: [{
      ...input.f965s[0],
      net_tax_adjustment: -100,
      net_tax_adjustment_kind: "transfer_out",
      transfer_agreement_file_name: "Form965C.pdf",
      counterparty_tax_id: { kind: "ein", value: "987654321" },
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        7_900,
      ],
      current_year_payment: 7_900,
    }],
    transfer_agreements: [{
      agreement_type: "965-C",
      file_name: "Form965C.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 signed Form 965-C",
    }],
  };
  assertThrows(
    () => form965a.build(source, { binaryAttachmentFileNames: [] }),
    Error,
    "needs each signed transfer agreement PDF",
  );
});

Deno.test("Form 965-A transfer-in omits Part IV beginning balance", () => {
  const transferIn = {
    ...input,
    s_corp_deferred_rows: [{
      election_or_transfer_year: 2025,
      source_document_reference: "2025 signed transfer-in agreement",
      corporation_name: "Acquired S Corp",
      corporation_ein: "456789123",
      beginning_deferred_liability: 0,
      triggered_liability: 0,
      transferred_liability: 500,
      counterparty_tax_id: { kind: "ein", value: "987654321" },
      transfer_agreement_links: [{
        counterparty_tax_id: { kind: "ein", value: "987654321" },
        file_name: "Form965DIn.pdf",
      }],
    }],
    transfer_agreements: [{
      agreement_type: "965-D",
      file_name: "Form965DIn.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 signed Form 965-D transfer in",
    }],
  };
  const xml = form965a.build(transferIn, {
    pending: { schedule2: { line20_965_tax_installment: 8_000 } },
    binaryAttachmentFileNames: ["Form965DIn.pdf"],
    documentIdsByAttachmentFileName: {
      "Form965DIn.pdf": "BinaryAttachment1",
    },
  });
  assertStringIncludes(
    xml,
    "<DeferredNetTaxLiabTrnsfrAmt>500</DeferredNetTaxLiabTrnsfrAmt>",
  );
  assertStringIncludes(
    xml,
    "<DeferredNetTaxLiabilityAmt>500</DeferredNetTaxLiabilityAmt>",
  );
  assertEquals(xml.includes("<BeginningDeferredTaxLiabAmt>"), false);
});
