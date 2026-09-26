import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form4797 } from "./f4797.ts";

Deno.test("Form 4797: no gain or loss does not emit a document", () => {
  assertEquals(form4797.build({}), "");
  assertEquals(form4797.build({ section_1231_gain: 0 }), "");
  assertEquals(form4797.build({ junk: 999 }), "");
});

Deno.test("Form 4797: section 1231 gain uses Part I line 7", () => {
  const xml = form4797.build({ section_1231_gain: 20_000 });
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertEquals(xml.includes("<TotalOrdinaryGainLossAmt>"), false);
  assertEquals(xml.includes("<TotalGainLossAmt>"), false);
});

Deno.test("Form 4797: Form 6252 section 1231 gain appears on line 4 and line 7", () => {
  const xml = form4797.build({
    section_1231_gain: 8_000,
    gain_form6252: 8_000,
  });
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>8000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>8000</TotalPropertyGainLossAmt>",
  );
  assertThrows(
    () => form4797.build({ section_1231_gain: 7_000, gain_form6252: 8_000 }),
    Error,
    "included in its line 7",
  );
});

Deno.test("Form 4797: Form 8824 section 1231 gain appears on line 5 and line 7", () => {
  const xml = form4797.build({
    section_1231_gain: 8_000,
    gain_form8824: 8_000,
  });
  assertStringIncludes(xml, "<GainLossForm8824Amt>8000</GainLossForm8824Amt>");
  assertStringIncludes(xml, "<TotalPropertyGainLossAmt>8000</TotalPropertyGainLossAmt>");
});

Deno.test("Form 4797: partnership and S-corp K-1 amounts retain line 2 source rows", () => {
  const xml = form4797.build({
    section_1231_gain: 7_000,
    k1_1231_rows: [
      { source: "partnership", entity_name: "Partner One", gain_loss: 10_000 },
      { source: "s_corp", entity_name: "Corp Two", gain_loss: -3_000 },
    ],
  });
  assertStringIncludes(xml, "<PropertyDesc>K-1 Form 1065</PropertyDesc>");
  assertStringIncludes(xml, "<PropertyDesc>K-1 Form 1120-S</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>FROM SCHEDULE K-1 F1120S</DateAcquiredInheritedCd>",
  );
  assertStringIncludes(xml, "<GainOrLossAmt>10000</GainOrLossAmt>");
  assertStringIncludes(xml, "<GainOrLossAmt>-3000</GainOrLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>7000</TotalPropertyGainLossAmt>",
  );
});

Deno.test("Form 4797: prior section 1231 loss recaptures only the smaller gain", () => {
  const xml = form4797.build({
    section_1231_gain: 20_000,
    nonrecaptured_1231_loss: 5_000,
  });
  assertStringIncludes(
    xml,
    "<NonrecapturedNet1231LossesAmt>5000</NonrecapturedNet1231LossesAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>15000</TotalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<PropGainNonrecapturedLossAmt>5000</PropGainNonrecapturedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>5000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>5000</OtherGainLossAmt>");
});

Deno.test("Form 4797: prior loss exceeding current gain recaptures all current gain", () => {
  const xml = form4797.build({
    section_1231_gain: 3_000,
    nonrecaptured_1231_loss: 8_000,
  });
  assertStringIncludes(xml, "<TotalGainLossAmt>0</TotalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<PropGainNonrecapturedLossAmt>3000</PropGainNonrecapturedLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>3000</OtherGainLossAmt>");
});

Deno.test("Form 4797: section 1231 loss flows through Part II lines 11, 17, and 18b", () => {
  const xml = form4797.build({ section_1231_gain: -4_000 });
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>-4000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>-4000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
});

Deno.test("Form 4797: Form 4684 business loss reaches line 14 and Schedule 1 total", () => {
  const xml = form4797.build({ ordinary_gain_form4684: -20_000 });
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-20000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>-20000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-20000</OtherGainLossAmt>");
  assertEquals(xml.includes("<TotalPropertyGainLossAmt>"), false);
});

Deno.test("Form 4797: source amounts reconcile even when the ordinary total is zero", () => {
  const xml = form4797.build({
    section_1231_gain: -4_000,
    ordinary_gain_form4684: 4_000,
  });
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>4000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>0</TotalOrdinaryGainLossAmt>",
  );
});

Deno.test("Form 4797: line 8 requires a current positive section 1231 gain", () => {
  assertThrows(
    () => form4797.build({ nonrecaptured_1231_loss: 5_000 }),
    Error,
    "line 8",
  );
  assertThrows(
    () =>
      form4797.build({
        section_1231_gain: -2_000,
        nonrecaptured_1231_loss: 5_000,
      }),
    Error,
    "line 8",
  );
});

Deno.test("Form 4797: ordinary and recapture aggregates need source detail", () => {
  assertThrows(
    () => form4797.build({ ordinary_gain: 8_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_1245: 3_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_1250: 1_500 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_form6252: 10_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => buildMefXml({ form4797: { ordinary_gain: 8_000 } }, testFiler()),
    Error,
    "source-line and property detail",
  );
});

Deno.test("Form 4797: amounts must be whole dollars", () => {
  assertThrows(
    () => form4797.build({ section_1231_gain: 1.5 }),
    Error,
    "whole-dollar",
  );
  assertThrows(
    () =>
      form4797.build({ section_1231_gain: 100, nonrecaptured_1231_loss: -1 }),
    Error,
    "negative",
  );
});
