import { assert, assertStringIncludes } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  type Form3800PassiveActivityLines,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form3800PartIAndIIXml } from "./f3800_part_i_ii.ts";

Deno.test("Form 3800 XML: Parts I and II keep passive and nonpassive credits on their own lines", () => {
  const passive: Form3800PassiveActivityLines = {
    line2: 600,
    line3: 400,
    line23: 100,
    line24: 50,
    line32: 80,
    line33: 30,
  };
  const lines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 1_000,
    specifiedCredit: 2_000,
  }, passive);
  const xml = form3800PartIAndIIXml(lines).join("");
  assertStringIncludes(
    xml,
    "<GeneralBusCrFromNnPssvActyAmt>1000</GeneralBusCrFromNnPssvActyAmt>",
  );
  assertStringIncludes(
    xml,
    "<CrSubjToPassiveActyLmtAmt>600</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    xml,
    "<PssvActyForGenBusCrAllowedAmt>400</PssvActyForGenBusCrAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<CYCreditsNotAllwAgainstTMTAmt>1400</CYCreditsNotAllwAgainstTMTAmt>",
  );
  assertStringIncludes(
    xml,
    "<GBCFromPssvActyAllPartsAmt>100</GBCFromPssvActyAllPartsAmt>",
  );
  assertStringIncludes(
    xml,
    "<PassiveActyAllowedForTYAmt>50</PassiveActyAllowedForTYAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllwGenBusCrFromNonPssvActyAmt>2000</AllwGenBusCrFromNonPssvActyAmt>",
  );
  assertStringIncludes(
    xml,
    "<GenBusEligSmllBusPssvActyCrAmt>80</GenBusEligSmllBusPssvActyCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherSpecifiedAllwGenBusCrAmt>30</OtherSpecifiedAllwGenBusCrAmt>",
  );
  assert(
    xml.indexOf("<GeneralBusCrFromNnPssvActyAmt>") <
      xml.indexOf("<CrSubjToPassiveActyLmtAmt>"),
  );
  assert(
    xml.indexOf("<GBCFromPssvActyAllPartsAmt>") <
      xml.indexOf("<NetIncomeTaxLessPctExcessAmt>"),
  );
});
