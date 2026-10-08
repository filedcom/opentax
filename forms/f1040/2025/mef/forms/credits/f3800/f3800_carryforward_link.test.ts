import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { testFiler } from "../../../execution/test-filer.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartVIFields,
} from "../../../../pdf/forms/credits/f3800/f3800_fields.ts";
import { projectForm3800PartVIFields } from "../../../../pdf/forms/credits/f3800/f3800_detail_projection.ts";
import {
  projectForm3800HeaderFields,
  projectForm3800PartIAndIIFields,
} from "../../../../pdf/forms/credits/f3800/f3800_print_projection.ts";
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "./f3800_document.ts";

const lines = calculateForm3800Nonpassive({
  filingStatus: FilingStatus.Single,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 0,
  specifiedCredit: 0,
  standardCarryforward: 600,
  specifiedCarryforward: 300,
}, ZERO_FORM3800_PASSIVE_ACTIVITY);

const parts: Form3800DocumentParts = {
  lines,
  transferStatementIds: [],
  carryforwardSources: [{
    sourceKey: "2024-new-markets-1",
    line: "1i",
    originatingTaxYear: 2024,
    documentId: "CarryforwardGeneralBusinessCr1",
    availableCredit: 600,
    revisedFromOriginal: true,
  }, {
    sourceKey: "2024-work-opportunity-1",
    line: "4b",
    originatingTaxYear: 2024,
    documentId: "CarryforwardGeneralBusinessCr2",
    availableCredit: 300,
    revisedFromOriginal: false,
  }],
  currentRows: [],
  currentAmounts: [],
  carryoverRows: [{
    line: "1i",
    sourceKeys: ["2024-new-markets-1"],
    originatingTaxYear: 2024,
    amount: {
      line: "1i",
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      nonpassiveCredit: 600,
      appliedCredit: 600,
      recapturedOrAdjusted: 0,
      carryforwardCredit: 0,
    },
  }, {
    line: "4b",
    sourceKeys: ["2024-work-opportunity-1"],
    originatingTaxYear: 2024,
    amount: {
      line: "4b",
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      nonpassiveCredit: 300,
      appliedCredit: 300,
      recapturedOrAdjusted: 0,
      carryforwardCredit: 0,
    },
  }],
  currentDetails: [],
  carryoverDetails: [],
  passiveCurrentDetails: [],
  passiveCarryoverDetails: [],
};

const aggregateParts: Form3800DocumentParts = {
  ...parts,
  lines: calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 0,
    specifiedCredit: 0,
    standardCarryforward: 600,
    specifiedCarryforward: 0,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY),
  carryforwardSources: [{
    sourceKey: "2022-new-markets-1",
    line: "1i",
    originatingTaxYear: 2022,
    documentId: "CarryforwardGeneralBusinessCr1",
    availableCredit: 300,
    revisedFromOriginal: false,
  }, {
    sourceKey: "2024-new-markets-2",
    line: "1i",
    originatingTaxYear: 2024,
    documentId: "CarryforwardGeneralBusinessCr2",
    availableCredit: 300,
    revisedFromOriginal: true,
  }],
  carryoverRows: [{
    line: "1i",
    sourceKeys: ["2022-new-markets-1", "2024-new-markets-2"],
    originatingTaxYear: 2024,
    amount: {
      line: "1i",
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      nonpassiveCredit: 600,
      appliedCredit: 600,
      recapturedOrAdjusted: 0,
      carryforwardCredit: 0,
    },
  }],
  carryoverDetails: [{
    sourceKey: "2022-new-markets-1",
    line: "1i",
    originatingTaxYear: 2022,
    nonpassiveCredit: 300,
    appliedCredit: 300,
    recapturedOrAdjusted: 0,
    carryforwardCredit: 0,
  }, {
    sourceKey: "2024-new-markets-2",
    line: "1i",
    originatingTaxYear: 2024,
    nonpassiveCredit: 300,
    appliedCredit: 300,
    recapturedOrAdjusted: 0,
    carryforwardCredit: 0,
  }],
};

const XSD_PATH = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test("Form 3800 links source-specific carryforward computations to native and printable lines", () => {
  const xml = buildIRS3800Document(parts);
  assertStringIncludes(xml, "<CYGeneralBusCrCarryforwardAmt");
  assertStringIncludes(
    xml,
    'referenceDocumentId="CarryforwardGeneralBusinessCr1"',
  );
  assertStringIncludes(xml, 'carryforwardChgdOrRevsInd="X"');
  assertStringIncludes(
    xml,
    "<AllwGenAndEligSmllBusCfwdCrAmt>300</AllwGenAndEligSmllBusCfwdCrAmt>",
  );
  const header = projectForm3800HeaderFields(parts, testFiler());
  assertEquals(header[form3800HeaderFields.line4RevisedCarryforward], true);
  assertEquals(
    header[form3800HeaderFields.line34RevisedCarryforward],
    undefined,
  );
  const printable = projectForm3800PartIAndIIFields(parts, 900);
  assertEquals(printable[form3800PartIAndIIFields.line4], 600);
  assertEquals(printable[form3800PartIAndIIFields.line34], 300);
});

Deno.test("Form 3800 rejects unlinked or changed carryforward source rows", () => {
  assertThrows(
    () =>
      buildIRS3800Document({
        ...parts,
        carryoverRows: [{
          ...parts.carryoverRows[0],
          amount: { ...parts.carryoverRows[0].amount, nonpassiveCredit: 601 },
        }, parts.carryoverRows[1]],
      }),
    Error,
    "nonpassive sources do not reconcile",
  );
  assertThrows(
    () =>
      projectForm3800HeaderFields({
        ...parts,
        carryforwardSources: parts.carryforwardSources.map((source) => ({
          ...source,
          documentId: "CarryforwardGeneralBusinessCr1",
        })),
      }, testFiler()),
    Error,
    "does not match Part IV",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        ...parts,
        carryoverRows: [{
          ...parts.carryoverRows[0],
          sourceKeys: ["2024-new-markets-1", "2024-work-opportunity-1"],
        }, parts.carryoverRows[1]],
      }),
    Error,
    "appears on multiple Part IV rows",
  );
});

Deno.test("Form 3800 Part VI prints and serializes each nonpassive carryforward vintage", () => {
  const xml = buildIRS3800Document(aggregateParts);
  assertEquals((xml.match(/Frm8874CYCyovCrAggrgtGrp/g) ?? []).length, 4);
  const printed = projectForm3800PartVIFields(aggregateParts);
  const first = form3800PartVIFields(1);
  const second = form3800PartVIFields(2);
  assertEquals(printed[first.a], "1i");
  assertEquals(printed[first.b], 2022);
  assertEquals(printed[first.f], 300);
  assertEquals(printed[first.g], 300);
  assertEquals(printed[second.b], 2024);
  assertEquals(printed[second.f], 300);
  assertThrows(
    () =>
      buildIRS3800Document({
        ...aggregateParts,
        carryoverDetails: aggregateParts.carryoverDetails.slice(0, 1),
      }),
    Error,
    "lacks a nonpassive source detail",
  );
  assertThrows(
    () =>
      projectForm3800PartVIFields({
        ...aggregateParts,
        carryoverDetails: [{
          ...aggregateParts.carryoverDetails[0],
          originatingTaxYear: 2021,
        }, aggregateParts.carryoverDetails[1]],
      }),
    Error,
    "detail does not match its source",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        ...aggregateParts,
        carryoverRows: [{
          ...aggregateParts.carryoverRows[0],
          originatingTaxYear: 2023,
        }],
      }),
    Error,
    "computation source does not match Part IV",
  );
});

Deno.test("Form 3800 native carryover rejects unreconciled Part IV and VI tax use", () => {
  assertThrows(
    () =>
      buildIRS3800Document({
        ...aggregateParts,
        carryoverDetails: [{
          ...aggregateParts.carryoverDetails[0],
          appliedCredit: 299,
          carryforwardCredit: 1,
        }, aggregateParts.carryoverDetails[1]],
      }),
    Error,
    "Part VI line 1i sources do not reconcile",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        ...aggregateParts,
        carryoverRows: [{
          ...aggregateParts.carryoverRows[0],
          sourceKeys: ["2022-new-markets-1", "unlinked-vintage"],
      }],
    }),
    Error,
    "carryforward computation source does not match Part IV",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        ...parts,
        carryoverRows: [{
          ...parts.carryoverRows[0],
          amount: {
            ...parts.carryoverRows[0].amount,
            appliedCredit: 599,
            carryforwardCredit: 0,
          },
        }, parts.carryoverRows[1]],
      }),
    Error,
    "Part IV line 1i does not reconcile to its source",
  );
});

Deno.test({
  name:
    "Form 3800 linked carryforward lines and Part IV/VI rows validate against TY2025 v5.4 XSD",
  ignore: !xsdAvailable,
  async fn() {
    for (const documentParts of [parts, aggregateParts]) {
      const path = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(
          path,
          buildIRS3800Document(documentParts).replace(
            "<IRS3800>",
            '<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">',
          ),
        );
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", XSD_PATH, path],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      } finally {
        await Deno.remove(path);
      }
    }
  },
});
