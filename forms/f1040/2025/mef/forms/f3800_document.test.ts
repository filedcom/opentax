import { assert, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
} from "./f3800_current_rows.ts";
import { buildIRS3800Document } from "./f3800_document.ts";

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 50_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 100,
  specifiedCredit: 0,
};

const lines = calculateForm3800Nonpassive(
  tax,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
);
const currentAmounts = combineForm3800CurrentCreditAmounts([{
  line: "1h",
  grossCredit: 100,
  transferOutCredit: 0,
  appliedCredit: 100,
}], []);
const metadata = {
  sourceCount: 1,
  referenceDocumentId: "IRS8820_1",
  referenceDocumentName: "IRS8820",
};
const currentRows = [{
  line: "1h" as const,
  metadata,
  entityCredits: [],
  xml: buildForm3800CurrentCreditRowXml(currentAmounts[0], metadata),
}];

Deno.test("Form 3800 document orders all six parts with filed tax-use reconciliation", () => {
  const xml = buildIRS3800Document({
    lines,
    transferStatementIds: [],
    currentRows,
    currentAmounts,
    carryoverRows: [],
    currentDetails: [],
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>100</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    '<Form8820CYCreditsGrp referenceDocumentId="IRS8820_1"',
  );
  assert(
    xml.indexOf("<CurrentYearCreditAllowedAmt>") <
      xml.indexOf("<Form8820CYCreditsGrp"),
  );
  assertStringIncludes(xml, "<TotGenBusCYCreditAmtGrp>");
});

Deno.test("Form 3800 document accepts a passive carryover without a current-year row", () => {
  const carryoverLines = calculateForm3800Nonpassive(
    { ...tax, standardCredit: 0 },
    { ...ZERO_FORM3800_PASSIVE_ACTIVITY, line2: 30, line3: 30 },
  );
  const xml = buildIRS3800Document({
    lines: carryoverLines,
    transferStatementIds: [],
    currentRows: [],
    currentAmounts: [],
    carryoverRows: [{
      line: "1h",
      sourceKeys: ["form8820-2024"],
      originatingTaxYear: 2024,
      amount: {
        line: "1h",
        passiveBeforeLimit: 30,
        passiveAfterLimit: 30,
        nonpassiveCredit: 0,
        appliedCredit: 30,
        recapturedOrAdjusted: 0,
        carryforwardCredit: 0,
      },
    }],
    currentDetails: [],
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>30</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, "<Tot8844OthSpcfdGBCOrESBCAmtGrp>");
});

Deno.test("Form 3800 document emits all Part V sources only for an aggregate line", () => {
  const detail = [
    {
      line: "1h" as const,
      credit: 60,
      appliedCredit: 60,
      passThroughEin: "123456789",
    },
    {
      line: "1h" as const,
      credit: 40,
      appliedCredit: 40,
      passThroughEin: "987654321",
    },
  ];
  const aggregateMetadata = { ...metadata, sourceCount: 2 };
  const xml = buildIRS3800Document({
    lines,
    transferStatementIds: [],
    currentRows: [{
      line: "1h",
      metadata: aggregateMetadata,
      entityCredits: [],
      xml: buildForm3800CurrentCreditRowXml(
        currentAmounts[0],
        aggregateMetadata,
      ),
    }],
    currentAmounts,
    carryoverRows: [],
    currentDetails: detail,
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  });
  assertStringIncludes(xml, "<GBCBreakdownCYAggrgtAmtGrp>");
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>60</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>40</TotalGeneralBusCreditsAmt>",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        lines,
        transferStatementIds: [],
        currentRows: [{
          line: "1h",
          metadata: aggregateMetadata,
          entityCredits: [],
          xml: buildForm3800CurrentCreditRowXml(
            currentAmounts[0],
            aggregateMetadata,
          ),
        }],
        currentAmounts,
        carryoverRows: [],
        currentDetails: detail.slice(0, 1),
        carryoverDetails: [],
        passiveCurrentDetails: [],
        passiveCarryoverDetails: [],
      }),
    Error,
    "source count does not reconcile",
  );
});

Deno.test("Form 3800 document rejects missing source rows or unreconciled tax use", () => {
  const parts = {
    lines,
    transferStatementIds: [],
    currentRows,
    currentAmounts,
    carryoverRows: [],
    currentDetails: [],
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  };
  assertThrows(
    () =>
      buildIRS3800Document({ ...parts, currentRows: [], currentAmounts: [] }),
    Error,
    "needs a current-year or carryover source row",
  );
  assertThrows(
    () => buildIRS3800Document({ ...parts, currentAmounts: [] }),
    Error,
    "source-row tax use does not reconcile",
  );
  assertThrows(
    () =>
      buildIRS3800Document({
        ...parts,
        currentAmounts: [{ ...currentAmounts[0], line: "4b" }],
        currentRows: [{ ...currentRows[0], line: "4b" }],
      }),
    Error,
    "source-row tax use does not reconcile",
  );
});
