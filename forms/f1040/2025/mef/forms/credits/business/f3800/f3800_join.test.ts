import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  type Form3800PassiveTaxUseVintage,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import { PassiveCreditReportingRoute } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/source.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
} from "./f3800_current_rows.ts";
import type { Form3800DocumentParts } from "./f3800_document.ts";
import { buildIRS3800Document } from "./f3800_document.ts";
import { joinForm3800DocumentParts } from "./f3800_join.ts";
import { buildForm3800PassiveRowXml } from "./f3800_passive_rows.ts";
import { projectForm3800PartVIFields } from "../../../../../pdf/forms/credits/business/f3800/f3800_detail_projection.ts";
import { form3800PartVIFields } from "../../../../../pdf/forms/credits/business/f3800/f3800_fields.ts";

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 300,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 300,
  specifiedCredit: 0,
  standardCarryforward: 0,
  specifiedCarryforward: 0,
};
const lines = calculateForm3800Nonpassive(
  tax,
  { ...ZERO_FORM3800_PASSIVE_ACTIVITY, line2: 400, line3: 300 },
);
const ordinaryAmount = combineForm3800CurrentCreditAmounts([{
  line: "1h",
  grossCredit: 300,
  transferOutCredit: 0,
  appliedCredit: 200,
}], [])[0];
const ordinaryMetadata = {
  sourceCount: 1,
  entity: { ein: "123456789" },
  referenceDocumentId: "IRS8820_1",
  referenceDocumentName: "IRS8820",
};
const nonpassive: Form3800DocumentParts = {
  lines: calculateForm3800Nonpassive(tax, ZERO_FORM3800_PASSIVE_ACTIVITY),
  transferStatementIds: [],
  carryforwardSources: [],
  currentRows: [{
    line: "1h",
    metadata: ordinaryMetadata,
    entityCredits: [{ entity: { ein: "123456789" }, credit: 300 }],
    xml: buildForm3800CurrentCreditRowXml(ordinaryAmount, ordinaryMetadata),
  }],
  currentAmounts: [ordinaryAmount],
  carryoverRows: [],
  currentDetails: [{
    line: "1h",
    credit: 300,
    appliedCredit: 200,
    passThroughEin: "123456789",
  }],
  carryoverDetails: [],
  passiveCurrentDetails: [],
  passiveCarryoverDetails: [],
};
const firstPassiveSource: Form3800PassiveTaxUseVintage = {
  sourceKey: "partnership-123",
  activityReference: "Clinical activity 123",
  sourceForm: "Form 8820",
  sourceDocumentReference: "Clinical K-1 123",
  sourceOrigin: {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "Clinical partnership 123",
    ein: "123456789",
  },
  form3800CreditLine: "1h",
  reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
  originatingTaxYear: 2025,
  beforePassiveLimit: 100,
  afterPassiveLimit: 100,
  availableAfterPassiveLimit: 100,
  appliedAgainstTax: 50,
  unusedAfterTaxLimit: 50,
};
const passive = buildForm3800PassiveRowXml([
  firstPassiveSource,
  {
    ...firstPassiveSource,
    sourceKey: "partnership-987",
    activityReference: "Clinical activity 987",
    sourceDocumentReference: "Clinical K-1 987",
    sourceOrigin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership 987",
      ein: "987654321",
    },
    beforePassiveLimit: 300,
    afterPassiveLimit: 200,
    availableAfterPassiveLimit: 200,
    unusedAfterTaxLimit: 150,
  },
], {});

Deno.test("Form 3800 joins same-line sources and selects the largest combined EIN", () => {
  const parts = joinForm3800DocumentParts(lines, nonpassive, passive);
  assertEquals(parts.currentRows.length, 1);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 3);
  assertEquals(parts.currentRows[0].metadata.entity, { ein: "123456789" });
  assertEquals(parts.currentAmounts[0].totalCredit, 600);
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  assertEquals(parts.currentDetails.length, 1);
  assertEquals(parts.passiveCurrentDetails.length, 2);
  assertEquals(parts.passiveCurrentDetails.map((row) => row.source.sourceKey), [
    "partnership-123",
    "partnership-987",
  ]);
  const xml = buildIRS3800Document(parts);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>3</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>600</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
});

Deno.test("Form 3800 joins a passive-only current-year source", () => {
  const passiveOnlyLines = calculateForm3800Nonpassive(
    { ...tax, regularTax: 100, standardCredit: 0 },
    { ...ZERO_FORM3800_PASSIVE_ACTIVITY, line2: 400, line3: 300 },
  );
  const only = joinForm3800DocumentParts(passiveOnlyLines, undefined, passive);
  assertEquals(only.currentRows.length, 1);
  assertEquals(only.currentAmounts[0].passiveAfterLimit, 300);
  assertEquals(only.currentDetails.length, 0);
  assertEquals(only.passiveCurrentDetails.length, 2);
  assertStringIncludes(
    buildIRS3800Document(only),
    "<CurrentYearCreditAllowedAmt>100</CurrentYearCreditAllowedAmt>",
  );
});

Deno.test("Form 3800 join rejects a mismatched source-row set", () => {
  assertThrows(
    () =>
      joinForm3800DocumentParts(lines, {
        ...nonpassive,
        currentAmounts: [],
      }, passive),
    Error,
    "source rows and amounts do not reconcile",
  );
});

Deno.test("Form 3800 joins passive and nonpassive carryovers on one Part IV line", async () => {
  const carryoverLines = calculateForm3800Nonpassive({
    ...tax,
    regularTax: 1_000,
    standardCredit: 0,
    standardCarryforward: 100,
  }, { ...ZERO_FORM3800_PASSIVE_ACTIVITY, line2: 200, line3: 150 });
  const ordinaryCarryover: Form3800DocumentParts = {
    ...nonpassive,
    lines: carryoverLines,
    carryforwardSources: [{
      sourceKey: "nonpassive-2023",
      line: "1h",
      originatingTaxYear: 2023,
      documentId: "CarryforwardGeneralBusinessCr1",
      availableCredit: 100,
      revisedFromOriginal: false,
    }],
    currentRows: [],
    currentAmounts: [],
    currentDetails: [],
    carryoverRows: [{
      line: "1h",
      sourceKeys: ["nonpassive-2023"],
      originatingTaxYear: 2023,
      entity: { ein: "987654321" },
      amount: {
        line: "1h",
        passiveBeforeLimit: 0,
        passiveAfterLimit: 0,
        nonpassiveCredit: 100,
        appliedCredit: 100,
        recapturedOrAdjusted: 0,
        carryforwardCredit: 0,
      },
    }],
  };
  const passiveCarryover = buildForm3800PassiveRowXml([{
    ...firstPassiveSource,
    sourceKey: "passive-2024",
    originatingTaxYear: 2024,
    sourceOrigin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership 2024",
      ein: "123456789",
    },
    beforePassiveLimit: 200,
    afterPassiveLimit: 150,
    availableAfterPassiveLimit: 150,
    appliedAgainstTax: 150,
    unusedAfterTaxLimit: 0,
  }], {});
  const parts = joinForm3800DocumentParts(
    carryoverLines,
    ordinaryCarryover,
    passiveCarryover,
  );
  assertEquals(parts.carryoverRows.length, 1);
  assertEquals(parts.carryoverRows[0].sourceKeys, [
    "nonpassive-2023",
    "passive-2024",
  ]);
  assertEquals(parts.carryoverRows[0].amount.appliedCredit, 250);
  assertEquals(parts.carryoverRows[0].entity, { ein: "123456789" });
  assertEquals(parts.carryoverDetails.length, 1);
  assertEquals(parts.passiveCarryoverDetails.length, 1);
  const xml = buildIRS3800Document(parts);
  assertStringIncludes(
    xml,
    "<CyovGeneralBusinessCrItemCnt>2</CyovGeneralBusinessCrItemCnt>",
  );
  const pdf = projectForm3800PartVIFields(parts);
  assertEquals(pdf[form3800PartVIFields(1).a], "1h");
  assertEquals(pdf[form3800PartVIFields(2).a], "1h");
  const xsd = new URL(
    "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    throw new Error(`Missing verification prerequisite: ${xsd}`);
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      path,
      xml.replace(
        "<IRS3800>",
        '<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">',
      ),
    );
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
