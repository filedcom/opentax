import {
  projectForm3800PartIAndIIFields,
  projectForm3800PartIIIFields,
} from "../../../../../pdf/forms/credits/business/f3800/f3800_print_projection.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "../../../../../pdf/forms/credits/business/f3800/f3800_fields.ts";
import { form3800NonpassiveCurrentDetailXml } from "./f3800_nonpassive_details.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import { calculatePropertyCredit } from "../../../../../../nodes/inputs/credits/business/f8911/property-credit.ts";
import {
  form3800NonpassiveCreditUseRows,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import { buildForm3800NonpassiveParts } from "./f3800_nonpassive.ts";
import { buildIRS3800Document } from "./f3800_document.ts";

function sourceParts(appliedCredit = 400, documentId = "IRS8911-1") {
  const credit = calculatePropertyCredit({ cost: 10000, business_use_pct: 1 })
    .businessCredit;
  return {
    tax: {
      filingStatus: FilingStatus.Single as const,
      regularTax: 400,
      alternativeMinimumTax: 0,
      foreignTaxCredit: 0,
      priorAllowableCredits: 0,
      tentativeMinimumTax: 0,
      standardCredit: credit,
      specifiedCredit: 0,
      standardCarryforward: 0,
      specifiedCarryforward: 0,
    },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
    form8911: { credit, documentId, appliedCredit },
  };
}

Deno.test("Form 3800 places a property-derived Form 8911 credit on line 1s with limited use", () => {
  const input = sourceParts();
  const rows = form3800NonpassiveCreditUseRows({
    form8911Credit: input.form8911.credit,
    facilities: [],
  });
  assertEquals(rows.length, 1);
  assertEquals(rows[0].sourceKey, "nonpassive:8911");
  assertEquals(rows[0].form3800CreditLine, "1s");
  const parts = buildForm3800NonpassiveParts(input);
  const xml = buildIRS3800Document(parts);
  const printable = projectForm3800PartIIIFields(parts);
  const row = form3800PartIIIFields("1s");
  assertEquals([printable[row.e], printable[row.g], printable[row.i]], [
    600,
    600,
    400,
  ]);
  assertEquals(
    projectForm3800PartIAndIIFields(
      parts,
      400,
    )[form3800PartIAndIIFields.line38],
    400,
  );

  assertStringIncludes(xml, 'referenceDocumentId="IRS8911-1"');
  assertStringIncludes(xml, 'referenceDocumentName="IRS8911"');
  const detail = form3800NonpassiveCurrentDetailXml(parts.currentDetails[0]);
  assertStringIncludes(detail, 'lineNumberTxt="Part III Line 1s"');
  assertStringIncludes(
    detail,
    "<CarryforwardGeneralBusCrAmt>200</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    detail,
    "<TotalGBCLessGrossEPEAppTxAmt>400</TotalGBCLessGrossEPEAppTxAmt>",
  );
});

Deno.test("Form 3800 refueling row rejects missing documents and tax-use mismatches", () => {
  assertThrows(
    () => buildForm3800NonpassiveParts(sourceParts(400, "")),
    Error,
    "invalid Form 8911 line 1s allocation",
  );
  assertThrows(
    () => buildForm3800NonpassiveParts(sourceParts(601)),
    Error,
    "invalid Form 8911 line 1s allocation",
  );
  assertThrows(() => buildForm3800NonpassiveParts(sourceParts(399)));
  const source = sourceParts();
  assertThrows(() =>
    buildForm3800NonpassiveParts({
      ...source,
      tax: { ...source.tax, standardCredit: 601 },
    })
  );
});
