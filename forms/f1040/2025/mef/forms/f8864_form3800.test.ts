import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../nodes/inputs/f3800/calculation.ts";
import { directAgriBiodieselPending } from "../../../nodes/inputs/f8864/fixture.ts";
import { buildForm3800NonpassiveParts } from "./f3800_nonpassive.ts";
import { form8864 } from "./f8864.ts";

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 500,
  specifiedCredit: 0,
  standardCarryforward: 0,
  specifiedCarryforward: 0,
};

function parts(credit = 500, appliedCredit = 500) {
  return buildForm3800NonpassiveParts({
    tax,
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8864: { credit, documentId: "IRS8864_1", appliedCredit },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
}

Deno.test("Form 8864 stages one sourced standard Form 3800 line 1l and Part V row", () => {
  const filed = parts();
  assertEquals(filed.currentRows.map((row) => row.line), ["1l"]);
  assertEquals(filed.currentAmounts.map((row) => row.line), ["1l"]);
  assertEquals(filed.currentDetails.map((row) => row.line), ["1l"]);
  assertEquals(filed.currentAmounts[0].appliedCredit, 500);
  assertEquals(filed.lines.line38, 500);
  assertStringIncludes(
    filed.currentRows[0].xml,
    'referenceDocumentId="IRS8864_1"',
  );
  assertThrows(() => parts(499), Error, "invalid Form 8864 line 1l allocation");
});

Deno.test("IRS8864 native projection binds dated gallons to Form 3800 and AMT documents", () => {
  const context = {
    pending: directAgriBiodieselPending,
    documentIdsByPendingKey: {
      f3800: ["IRS3800_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const xml = form8864.build(directAgriBiodieselPending.f8864, context);
  assertEquals(xml.includes("QualifiedAgriBioDieselProdQty"), false);
  assertStringIncludes(
    xml,
    "<QlfyAgriBioDieselProdAfterQty>2500</QlfyAgriBioDieselProdAfterQty>",
  );
  assertStringIncludes(
    xml,
    "<QlfyAgriBioDieselProdAfterAmt>500</QlfyAgriBioDieselProdAfterAmt>",
  );
  assertStringIncludes(
    xml,
    "<BiodieselRnwblAvnFuelCrAmt>500</BiodieselRnwblAvnFuelCrAmt>",
  );
  assertThrows(
    () =>
      form8864.build(directAgriBiodieselPending.f8864, {
        ...context,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "Form 3800 and AMT documents",
  );
  assertThrows(
    () =>
      form8864.build(directAgriBiodieselPending.f8864, {
        ...context,
        pending: {
          ...directAgriBiodieselPending,
          form6251: { line3_form8864_income_exclusion: -499 },
        },
      }),
    Error,
    "AMT line 3 exclusion",
  );
});
