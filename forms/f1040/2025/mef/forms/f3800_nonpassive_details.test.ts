import { assertStringIncludes, assertThrows } from "@std/assert";
import { form3800NonpassiveCurrentDetailXml } from "./f3800_nonpassive_details.ts";

Deno.test("Form 3800 typed nonpassive detail preserves pass-through identity and tax use", () => {
  const xml = form3800NonpassiveCurrentDetailXml({
    line: "1i",
    credit: 300,
    appliedCredit: 180,
    passThroughEin: "123456789",
  });
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>300</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGBCLessGrossEPEAppTxAmt>180</TotalGBCLessGrossEPEAppTxAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>120</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(xml, 'lineNumberTxt="Part III Line 1i"');
});

Deno.test("Form 3800 typed facility detail preserves transfer and source document", () => {
  const xml = form3800NonpassiveCurrentDetailXml({
    line: "4e",
    credit: 20_000,
    transferOutCredit: 5_000,
    transferRegistrationNumber: "CAABC12ABCDE",
    appliedCredit: 10_000,
    sourceDocumentId: "IRS8835_1",
  });
  assertStringIncludes(
    xml,
    "<TransferRegistrationNum>CAABC12ABCDE</TransferRegistrationNum>",
  );
  assertStringIncludes(
    xml,
    "<TrnsfrElectCrSoldNoLmtAmt>-5000</TrnsfrElectCrSoldNoLmtAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>15000</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>5000</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentName="IRS8835 BinaryAttachment"');
});

Deno.test("Form 3800 typed detail rejects impossible source and transfer combinations", () => {
  assertThrows(
    () =>
      form3800NonpassiveCurrentDetailXml({
        line: "1h",
        credit: 100,
        appliedCredit: 101,
      }),
    Error,
    "nonpassive Part V source is invalid",
  );
  assertThrows(
    () =>
      form3800NonpassiveCurrentDetailXml({
        line: "1f",
        credit: 100,
        transferOutCredit: 10,
        appliedCredit: 20,
        sourceDocumentId: "IRS8835_1",
      }),
    Error,
    "nonpassive Part V source is invalid",
  );
  assertThrows(
    () =>
      form3800NonpassiveCurrentDetailXml({
        line: "1h",
        credit: 100,
        appliedCredit: 20,
        passThroughEin: "123456789",
        sourceDocumentId: "IRS8820_1",
      }),
    Error,
    "nonpassive Part V source is invalid",
  );
});
