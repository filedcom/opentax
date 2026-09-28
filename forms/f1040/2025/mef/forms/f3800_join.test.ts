import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  type Form3800PassiveTaxUseVintage,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { PassiveCreditReportingRoute } from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
} from "./f3800_current_rows.ts";
import type { Form3800DocumentParts } from "./f3800_document.ts";
import { buildIRS3800Document } from "./f3800_document.ts";
import { joinForm3800DocumentParts } from "./f3800_join.ts";
import { buildForm3800PassiveRowXml } from "./f3800_passive_rows.ts";

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 300,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 300,
  specifiedCredit: 0,
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
