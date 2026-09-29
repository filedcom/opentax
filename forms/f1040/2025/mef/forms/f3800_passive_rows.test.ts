import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PassiveCreditReportingRoute } from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  buildForm3800PassiveRowXml,
  form3800CarryoverRowXml,
  form3800PassiveCarryoverDetailXml,
  form3800PassiveCurrentDetailXml,
} from "./f3800_passive_rows.ts";
import { buildForm3800PartIVXml } from "./f3800_part_iv.ts";
import { buildForm3800PartVXml } from "./f3800_part_v.ts";

const own: Form3800PassiveTaxUseVintage = {
  sourceKey: "own-2023",
  activityReference: "Clinical activity",
  sourceForm: "Form 8820",
  sourceDocumentReference: "2023 clinical credit statement",
  sourceOrigin: { kind: PassiveCreditSourceOrigin.Self },
  form3800CreditLine: "1h",
  reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
  originatingTaxYear: 2023,
  beforePassiveLimit: 100,
  afterPassiveLimit: 80,
  availableAfterPassiveLimit: 80,
  appliedAgainstTax: 80,
  unusedAfterTaxLimit: 0,
};

const partnership: Form3800PassiveTaxUseVintage = {
  ...own,
  sourceKey: "partnership-2024",
  activityReference: "Partnership clinical credit",
  sourceDocumentReference: "2024 Schedule K-1 credit statement",
  sourceOrigin: {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "Clinical partnership",
    ein: "123456789",
  },
  originatingTaxYear: 2024,
  beforePassiveLimit: 200,
  afterPassiveLimit: 150,
  availableAfterPassiveLimit: 150,
  appliedAgainstTax: 100,
  unusedAfterTaxLimit: 50,
};

const currentOwn: Form3800PassiveTaxUseVintage = {
  ...own,
  sourceKey: "own-2025",
  originatingTaxYear: 2025,
  appliedAgainstTax: 60,
  unusedAfterTaxLimit: 20,
};

const currentPartnership: Form3800PassiveTaxUseVintage = {
  ...partnership,
  sourceKey: "partnership-2025",
  originatingTaxYear: 2025,
};

Deno.test("Form 3800 passive current-year XML keeps Part III and V source amounts", () => {
  const xml = buildForm3800PassiveRowXml([
    currentOwn,
    currentPartnership,
  ], {});
  assertEquals(xml.partIII.length, 1);
  assertEquals(xml.partIII[0].line, "1h");
  assertEquals(xml.partIII[0].metadata, {
    sourceCount: 2,
    entity: { ein: "123456789" },
  });
  assertEquals(xml.partIII[0].entityCredits, [{
    entity: { ein: "123456789" },
    entityReference: "Clinical partnership",
    credit: 200,
  }]);
  assertEquals(xml.currentAmounts, [{
    line: "1h",
    nonpassiveCredit: 0,
    transferOutCredit: 0,
    passiveBeforeLimit: 300,
    passiveAfterLimit: 230,
    totalCredit: 230,
    appliedCredit: 160,
  }]);
  assertEquals(xml.partV.length, 2);
  assertEquals(xml.partIV, []);
  assertEquals(xml.partVI, []);
  assertStringIncludes(
    xml.partIII[0].xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml.partIII[0].xml,
    "<CrSubjToPassiveActyLmtAmt>300</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    xml.partIII[0].xml,
    "<TotalGeneralBusCreditsAmt>230</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml.partIII[0].xml,
    "<TotalGeneralBusCreditsAppTxAmt>160</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertEquals(xml.partV.map((row) => row.line), ["1h", "1h"]);
  assertEquals(xml.partV.map((row) => row.source.sourceKey), [
    "own-2025",
    "partnership-2025",
  ]);
  assertEquals(
    xml.partV[1].source.sourceOrigin,
    currentPartnership.sourceOrigin,
  );
  assertEquals(xml.partV[1].source.appliedAgainstTax, 100);
  assertEquals(xml.partV[1].source.unusedAfterTaxLimit, 50);
  assertEquals(
    form3800PassiveCurrentDetailXml(xml.partV[0]),
    '<Frm8820CYAggrgtAmtGrp lineNumberTxt="Part III Line 1h">' +
      "<OthThnCrTrnsfrElectCrBfrLmtAmt>100</OthThnCrTrnsfrElectCrBfrLmtAmt>" +
      "<CrTrnsfrElectCrAllwAftrLmtAmt>80</CrTrnsfrElectCrAllwAftrLmtAmt>" +
      "<TotalGeneralBusCreditsAmt>80</TotalGeneralBusCreditsAmt>" +
      "<TotalGBCLessGrossEPEAppTxAmt>60</TotalGBCLessGrossEPEAppTxAmt>" +
      "<CarryforwardGeneralBusCrAmt>20</CarryforwardGeneralBusCrAmt>" +
      "</Frm8820CYAggrgtAmtGrp>",
  );
  assertStringIncludes(
    form3800PassiveCurrentDetailXml(xml.partV[1]),
    "<CrTrnsfrElectCrAllwAftrLmtAmt>150</CrTrnsfrElectCrAllwAftrLmtAmt>",
  );
});

Deno.test("Form 3800 retains single passive current-year source detail for a mixed line", () => {
  const xml = buildForm3800PassiveRowXml([currentOwn], {});
  assertEquals(xml.partIII[0].metadata.sourceCount, 1);
  assertEquals(xml.partV.length, 1);
  assertStringIncludes(
    form3800PassiveCurrentDetailXml(xml.partV[0]),
    "<TotalGeneralBusCreditsAmt>80</TotalGeneralBusCreditsAmt>",
  );
});

Deno.test("Form 3800 passive self-earned New Markets row links its IRS8874 source", () => {
  const ownMarkets = {
    ...currentOwn,
    sourceKey: "own-markets-2025",
    sourceForm: "Form 8874",
    form3800CreditLine: "1i" as const,
  };
  const partnershipMarkets = {
    ...currentPartnership,
    sourceKey: "partnership-markets-2025",
    sourceForm: "Form 8874",
    form3800CreditLine: "1i" as const,
  };
  const rows = buildForm3800PassiveRowXml(
    [ownMarkets, partnershipMarkets],
    {
      "Form 8874": {
        documentId: "IRS8874_1",
        documentName: "IRS8874",
      },
    },
  );
  assertEquals(rows.partIII[0].metadata.referenceDocumentId, "IRS8874_1");
  assertEquals(rows.partV[0].sourceDocument, {
    documentId: "IRS8874_1",
    documentName: "IRS8874",
  });
  assertEquals(rows.partV[1].sourceDocument, undefined);
  assertStringIncludes(rows.partIII[0].xml, 'referenceDocumentId="IRS8874_1"');
  assertStringIncludes(
    form3800PassiveCurrentDetailXml(rows.partV[0]),
    'referenceDocumentId="IRS8874_1"',
  );
  assertEquals(
    form3800PassiveCurrentDetailXml(rows.partV[1]).includes(
      'referenceDocumentId="IRS8874_1"',
    ),
    false,
  );
});

Deno.test("Form 3800 passive carryover XML keeps summary and source-year detail", () => {
  const xml = buildForm3800PassiveRowXml([own, partnership], {});
  assertEquals(xml.partIV.length, 1);
  assertEquals(xml.partIV[0].line, "1h");
  assertEquals(xml.partIV[0].sourceKeys, ["own-2023", "partnership-2024"]);
  assertEquals(xml.partIV[0].originatingTaxYear, 2024);
  assertEquals(xml.partIV[0].entity, { ein: "123456789" });
  assertEquals(Object.hasOwn(xml.partIV[0], "xml"), false);
  assertEquals(xml.partIV[0].amount, {
    line: "1h",
    passiveBeforeLimit: 300,
    passiveAfterLimit: 230,
    nonpassiveCredit: 0,
    appliedCredit: 180,
    recapturedOrAdjusted: 0,
    carryforwardCredit: 50,
  });
  assertEquals(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<Frm8820CYCyovCrGrp>" +
      "<CyovGeneralBusinessCrItemCnt>2</CyovGeneralBusinessCrItemCnt>" +
      "<Yr>2024</Yr>" +
      "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>" +
      "<CrSubjToPassiveActyLmtAmt>300</CrSubjToPassiveActyLmtAmt>" +
      "<PassiveActivityCrAfterLmtAmt>230</PassiveActivityCrAfterLmtAmt>" +
      "<TotalGeneralBusCreditsAppTxAmt>180</TotalGeneralBusCreditsAppTxAmt>" +
      "<CarryforwardGeneralBusCrAmt>50</CarryforwardGeneralBusCrAmt>" +
      "</Frm8820CYCyovCrGrp>",
  );
  assertEquals(xml.partVI.length, 2);
  assertEquals(xml.partVI.map((row) => row.source.sourceKey), [
    "own-2023",
    "partnership-2024",
  ]);
  assertEquals(xml.partVI.map((row) => row.source.originatingTaxYear), [
    2023,
    2024,
  ]);
  assertEquals(
    form3800PassiveCarryoverDetailXml(xml.partVI[0]),
    '<Frm8820CYCyovCrAggrgtGrp lineNumberTxt="Part IV Line 1h">' +
      "<Yr>2023</Yr>" +
      "<CrSubjToPassiveActyLmtAmt>100</CrSubjToPassiveActyLmtAmt>" +
      "<PassiveActivityCrAfterLmtAmt>80</PassiveActivityCrAfterLmtAmt>" +
      "<TotalGeneralBusCreditsAppTxAmt>80</TotalGeneralBusCreditsAppTxAmt>" +
      "<CarryforwardGeneralBusCrAmt>0</CarryforwardGeneralBusCrAmt>" +
      "</Frm8820CYCyovCrAggrgtGrp>",
  );
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<CyovGeneralBusinessCrItemCnt>2</CyovGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(form3800CarryoverRowXml(xml.partIV[0]), "<Yr>2024</Yr>");
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<CrSubjToPassiveActyLmtAmt>300</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<PassiveActivityCrAfterLmtAmt>230</PassiveActivityCrAfterLmtAmt>",
  );
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<TotalGeneralBusCreditsAppTxAmt>180</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<CarryforwardGeneralBusCrAmt>50</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    form3800PassiveCarryoverDetailXml(xml.partVI[0]),
    'lineNumberTxt="Part IV Line 1h"',
  );
  assertStringIncludes(
    form3800PassiveCarryoverDetailXml(xml.partVI[0]),
    "<Yr>2023</Yr>",
  );
  assertStringIncludes(
    form3800PassiveCarryoverDetailXml(xml.partVI[1]),
    "<Yr>2024</Yr>",
  );
  assertStringIncludes(
    form3800PassiveCarryoverDetailXml(xml.partVI[1]),
    "<CarryforwardGeneralBusCrAmt>50</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 passive carryover XML preserves explicit missing-EIN reason", () => {
  const source: Form3800PassiveTaxUseVintage = {
    ...partnership,
    sourceOrigin: {
      kind: PassiveCreditSourceOrigin.SCorporation,
      entity_reference: "Clinical S corporation",
      missing_ein_reason: "APPLD FOR",
    },
  };
  const xml = buildForm3800PassiveRowXml([source], {});
  assertEquals(xml.partVI, []);
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<MissingEINReasonCd>APPLD FOR</MissingEINReasonCd>",
  );
});

Deno.test("Form 3800 passive summary EIN uses the entity's combined years", () => {
  const oldest: Form3800PassiveTaxUseVintage = {
    ...partnership,
    sourceKey: "partnership-2022",
    originatingTaxYear: 2022,
    beforePassiveLimit: 100,
    afterPassiveLimit: 100,
    availableAfterPassiveLimit: 100,
    appliedAgainstTax: 100,
    unusedAfterTaxLimit: 0,
  };
  const later: Form3800PassiveTaxUseVintage = {
    ...oldest,
    sourceKey: "partnership-2024",
    originatingTaxYear: 2024,
  };
  const otherEntity: Form3800PassiveTaxUseVintage = {
    ...partnership,
    sourceKey: "other-2023",
    originatingTaxYear: 2023,
    sourceOrigin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Other partnership",
      ein: "987654321",
    },
  };
  const xml = buildForm3800PassiveRowXml([
    oldest,
    otherEntity,
    later,
  ], {});
  assertStringIncludes(
    form3800CarryoverRowXml(xml.partIV[0]),
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.partVI.length, 3);
  assertThrows(
    () =>
      buildForm3800PassiveRowXml([
        oldest,
        {
          ...later,
          sourceOrigin: {
            kind: PassiveCreditSourceOrigin.Partnership,
            entity_reference: "Clinical partnership",
            ein: "111111111",
          },
        },
      ], {}),
    Error,
    "entity identity does not reconcile",
  );
});

Deno.test("Form 3800 passive carryover XML rejects unreconciled tax use", () => {
  assertThrows(
    () => buildForm3800PassiveRowXml([{ ...own, unusedAfterTaxLimit: 1 }], {}),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () => buildForm3800PassiveRowXml([own, { ...own }], {}),
    Error,
    "must be unique",
  );
});

Deno.test("Form 3800 passive detail builders retain all source rows beyond one PDF page", () => {
  const current = Array.from({ length: 16 }, (_, index) => ({
    ...currentOwn,
    sourceKey: `current-${index + 1}`,
  }));
  const carryover = Array.from({ length: 36 }, (_, index) => ({
    ...own,
    sourceKey: `carryover-${index + 1}`,
  }));
  const rows = buildForm3800PassiveRowXml([...current, ...carryover], {});
  assertEquals(rows.partV.length, 16);
  assertEquals(rows.partVI.length, 36);
  assertEquals(new Set(rows.partV.map((row) => row.source.sourceKey)).size, 16);
  assertEquals(
    new Set(rows.partVI.map((row) => row.source.sourceKey)).size,
    36,
  );
  assertEquals(rows.partV[15].source.sourceKey, "current-16");
  assertEquals(rows.partVI[35].source.sourceKey, "carryover-36");
});

Deno.test("Form 3800 passive carryover fragments follow TY2025v5.4 IRS3800 XSD", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const fragments = buildForm3800PassiveRowXml([
    own,
    partnership,
    currentOwn,
    currentPartnership,
  ], {});
  const xml =
    `<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1"><CAMTAndBEATInd>false</CAMTAndBEATInd>${
      fragments.partIII.map((row) => row.xml).join("")
    }${buildForm3800PartIVXml(fragments.partIV).join("")}${
      buildForm3800PartVXml(fragments.partV.map((row) => ({
        line: row.line,
        xml: form3800PassiveCurrentDetailXml(row),
      })))
    }${
      fragments.partVI.map(form3800PassiveCarryoverDetailXml).join("")
    }</IRS3800>`;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
