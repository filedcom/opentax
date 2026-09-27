import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PassiveCreditReportingRoute } from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import { buildForm3800PassiveRowXml } from "./f3800_passive_rows.ts";
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
  ]);
  assertEquals(xml.partIII.length, 1);
  assertEquals(xml.partIII[0].line, "1h");
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
  assertStringIncludes(
    xml.partV[1].xml,
    "<CrTrnsfrElectCrAllwAftrLmtAmt>150</CrTrnsfrElectCrAllwAftrLmtAmt>",
  );
});

Deno.test("Form 3800 passive carryover XML keeps summary and source-year detail", () => {
  const xml = buildForm3800PassiveRowXml([own, partnership]);
  assertEquals(xml.partIV.length, 1);
  assertEquals(xml.partIV[0].line, "1h");
  assertEquals(xml.partVI.length, 2);
  assertStringIncludes(
    xml.partIV[0].xml,
    "<CyovGeneralBusinessCrItemCnt>2</CyovGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(xml.partIV[0].xml, "<Yr>2024</Yr>");
  assertStringIncludes(
    xml.partIV[0].xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml.partIV[0].xml,
    "<CrSubjToPassiveActyLmtAmt>300</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    xml.partIV[0].xml,
    "<PassiveActivityCrAfterLmtAmt>230</PassiveActivityCrAfterLmtAmt>",
  );
  assertStringIncludes(
    xml.partIV[0].xml,
    "<TotalGeneralBusCreditsAppTxAmt>180</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertStringIncludes(
    xml.partIV[0].xml,
    "<CarryforwardGeneralBusCrAmt>50</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(xml.partVI[0].xml, 'lineNumberTxt="Part IV Line 1h"');
  assertStringIncludes(xml.partVI[0].xml, "<Yr>2023</Yr>");
  assertStringIncludes(xml.partVI[1].xml, "<Yr>2024</Yr>");
  assertStringIncludes(
    xml.partVI[1].xml,
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
  const xml = buildForm3800PassiveRowXml([source]);
  assertEquals(xml.partVI, []);
  assertStringIncludes(
    xml.partIV[0].xml,
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
  ]);
  assertStringIncludes(
    xml.partIV[0].xml,
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
      ]),
    Error,
    "entity identity does not reconcile",
  );
});

Deno.test("Form 3800 passive carryover XML rejects unreconciled tax use", () => {
  assertThrows(
    () => buildForm3800PassiveRowXml([{ ...own, unusedAfterTaxLimit: 1 }]),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () => buildForm3800PassiveRowXml([own, { ...own }]),
    Error,
    "must be unique",
  );
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
  ]);
  const xml =
    `<IRS3800 xmlns="http://www.irs.gov/efile"><CAMTAndBEATInd>false</CAMTAndBEATInd>${
      fragments.partIII.map((row) => row.xml).join("")
    }${fragments.partIV.map((row) => row.xml).join("")}${
      buildForm3800PartVXml(fragments.partV)
    }${fragments.partVI.map((row) => row.xml).join("")}</IRS3800>`;
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
