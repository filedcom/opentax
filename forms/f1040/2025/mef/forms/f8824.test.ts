import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateLikeKindExchange,
} from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import { form8824 } from "./f8824.ts";
import type {
  Form8824Input,
} from "../../../nodes/intermediate/forms/form8824/index.ts";

const exchange = {
  relinquished_description: "Investment land, Austin TX",
  received_description: "Investment land, Dallas TX",
  date_acquired: "2020-01-15",
  date_transferred: "2025-04-01",
  date_identified: "2025-04-20",
  date_received: "2025-06-01",
  return_due_date_including_extensions: "2026-04-15",
  related_party: false,
  recapture_applies: false,
  multiple_like_kind_properties: false,
  installment_method_applies: false,
  property_used_as_home: false,
  replacement_property_category: "nondepreciable_land",
  relinquished_basis: 100_000,
  received_fmv: 200_000,
} satisfies Form8824Input;

Deno.test("Form 8824 uses IRS Part III line names and order", () => {
  const xml = form8824.build(exchange);
  assertStringIncludes(
    xml,
    "<RealizedGainOrLossAmt>100000</RealizedGainOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DeferredGainOrLossAmt>100000</DeferredGainOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<BasisOfLikeKindPropertyRcvdAmt>100000</BasisOfLikeKindPropertyRcvdAmt>",
  );
  assertEquals(xml.includes("FMVLikeKindPropertyReceivedAmt"), false);
  assertEquals(
    xml.indexOf("CashFMVNetLiabRedByExpnssAmt") <
      xml.indexOf("FMVOfLikeKindPropertyRcvdAmt"),
    true,
  );
});

Deno.test("Form 8824 nets liabilities and cash paid before calculating boot", () => {
  const lines = calculateLikeKindExchange({
    relinquished_basis: 175_000,
    received_fmv: 220_000,
    liabilities_assumed_by_buyer: 150_000,
    liabilities_taxpayer_assumed: 80_000,
    cash_paid: 40_000,
  });
  assertEquals(lines.line15, 30_000);
  assertEquals(lines.line18, 175_000);
  assertEquals(lines.line19, 75_000);
  assertEquals(lines.line20, 30_000);
  assertEquals(lines.line25, 175_000);
});

Deno.test("Form 8824 puts unused exchange expenses on line 18", () => {
  const lines = calculateLikeKindExchange({
    relinquished_basis: 100_000,
    received_fmv: 200_000,
    exchange_expenses: 5_000,
  });
  assertEquals(lines.line15, 0);
  assertEquals(lines.line18, 105_000);
  assertEquals(lines.line19, 95_000);
  assertEquals(lines.line25, 105_000);
});

Deno.test("Form 8824 rejects incomplete exchange metadata", () => {
  assertThrows(
    () => form8824.build({ received_fmv: 200_000 }),
    Error,
    "needs property and dates",
  );
});

Deno.test("Form 8824 does not file boot without required gain statement", () => {
  assertThrows(
    () => form8824.build({ ...exchange, cash_received: 5_000 }),
    Error,
    "gain statement attachment",
  );
});

Deno.test("Form 8824 statement route omits lines 12-18 and links its document", () => {
  const xml = form8824.build({
    ...exchange,
    received_fmv: 150_000,
    cash_received: 50_000,
    gain_type: "section_1231",
  }, {
    binaryAttachmentFileNames: ["Form8824RealizedRecognizedGainStatement.pdf"],
    documentIdsByAttachmentFileName: {
      "Form8824RealizedRecognizedGainStatement.pdf": "BinaryAttachment2",
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment2"');
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall RealizedAndRecognizedGainInMultiAssetExchangesStmt"',
  );
  assertStringIncludes(xml, 'gainInMultiAssetExchStmtInd="true"');
  assertEquals(xml.includes("<CashFMVNetLiabRedByExpnssAmt>"), false);
  assertEquals(xml.includes("<AdjBssOfLikeKindPropGvnUpAmt>"), false);
  assertStringIncludes(
    xml,
    "<RealizedGainOrLossAmt>100000</RealizedGainOrLossAmt>",
  );
  assertStringIncludes(xml, "<RecognizedGainAmt>50000</RecognizedGainAmt>");
});

Deno.test("Form 8824 recognized gain requires its destination source", () => {
  const context = {
    binaryAttachmentFileNames: ["Form8824RealizedRecognizedGainStatement.pdf"],
    pending: {},
  };
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        received_fmv: 150_000,
        cash_received: 50_000,
        gain_type: "section_1231",
      }, context),
    Error,
    "Form 4797 gain source",
  );
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        received_fmv: 150_000,
        cash_received: 50_000,
        gain_type: "capital",
      }, context),
    Error,
    "Schedule D gain source",
  );
});

Deno.test("Form 8824 enforces deferred exchange identification and receipt deadlines", () => {
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        date_identified: "2025-05-17",
      }),
    Error,
    "later than 45 days",
  );
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        date_received: "2025-10-01",
      }),
    Error,
    "after the exchange deadline",
  );
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        return_due_date_including_extensions: "2025-05-15",
      }),
    Error,
    "after the exchange deadline",
  );
  assertThrows(
    () =>
      form8824.build({
        ...exchange,
        date_received: "2025-04-15",
      }),
    Error,
    "line 5 must use the receipt date",
  );
});
