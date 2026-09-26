import { assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { buildIRS3800Nonpassive } from "./f3800_nonpassive.ts";

const ordinary = {
  form3800_line: "1f" as const,
  credit_amount: 18_000,
  transfer_out_amount: 0,
  subject_to_passive_activity_limit: false,
};

const specified = {
  form3800_line: "4e" as const,
  credit_amount: 20_000,
  transfer_out_amount: 5_000,
  registration_number: "CAABC12ABCDE",
  subject_to_passive_activity_limit: false,
  transfer_election_statement_file_name: "Transfer Election Statement.pdf",
};

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 18_000,
  specifiedCredit: 15_000,
};

Deno.test("Form 3800 XML: nonpassive Form 8835 credit and transfer reconcile to Part II", () => {
  const xml = buildIRS3800Nonpassive({
    tax,
    facilities: [ordinary, specified],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [18_000, 15_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>33000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment1"');
  assertStringIncludes(
    xml,
    "<CreditTransferElectionAmt>-5000</CreditTransferElectionAmt>",
  );
  assertStringIncludes(
    xml,
    '<Form8835PartIICYCreditsGrp referenceDocumentId="IRS8835_1"',
  );
  assertStringIncludes(
    xml,
    '<Frm8835PartIICYSpcfdCreditsGrp referenceDocumentId="IRS8835_2"',
  );
  assertStringIncludes(xml, "<GenBusCYCreditsSubTotGrp>");
  assertStringIncludes(xml, "<GenBusCYCreditsSubTot2Grp>");
  assertStringIncludes(xml, "<TotGenBusCYCreditAmtGrp>");
});

Deno.test("Form 3800 XML: multiple facilities on one line have per-facility Part V rows", () => {
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 30_000, specifiedCredit: 0 },
    facilities: [
      { ...ordinary, credit_amount: 15_000 },
      { ...ordinary, credit_amount: 15_000 },
    ],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [15_000, 5_000],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(xml, "<GBCBreakdownCYAggrgtAmtGrp>");
  assertStringIncludes(xml, 'lineNumberTxt="Part III Line 1f"');
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>10000</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 XML: repeated facility values keep separate applied amounts and document IDs", () => {
  const facility = { ...ordinary, credit_amount: 18_000 };
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 36_000, specifiedCredit: 0 },
    facilities: [facility, facility],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [15_000, 5_000],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8835PartIICYCreditsGrp referenceDocumentId="IRS8835_1 IRS8835_2"',
  );
  assertStringIncludes(
    xml,
    '<Frm8835PartIICYAggrgtAmtGrp referenceDocumentId="IRS8835_1"',
  );
  assertStringIncludes(
    xml,
    '<Frm8835PartIICYAggrgtAmtGrp referenceDocumentId="IRS8835_2"',
  );
  assertStringIncludes(
    xml,
    "<TotalGBCLessGrossEPEAppTxAmt>15000</TotalGBCLessGrossEPEAppTxAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGBCLessGrossEPEAppTxAmt>5000</TotalGBCLessGrossEPEAppTxAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>3000</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>13000</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 XML: specified-credit facilities and transfers have Part V detail", () => {
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 0, specifiedCredit: 19_000 },
    facilities: [specified, {
      ...specified,
      credit_amount: 4_000,
      transfer_out_amount: 0,
    }],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [15_000, 4_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  });
  assertStringIncludes(
    xml,
    '<Frm8835PartIICYSpcfdAmtGrp referenceDocumentId="IRS8835_1"',
  );
  assertStringIncludes(xml, 'lineNumberTxt="Part III Line 4e"');
  assertStringIncludes(
    xml,
    "<TrnsfrElectCrSoldNoLmtAmt>-5000</TrnsfrElectCrSoldNoLmtAmt>",
  );
});

Deno.test("Form 3800 XML: rejects unmatched allocation and absent transfer statement", () => {
  const base = {
    tax,
    facilities: [ordinary, specified],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [18_000, 15_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  };
  assertThrows(
    () =>
      buildIRS3800Nonpassive({
        ...base,
        appliedCreditsByFacility: [17_000, 15_000],
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      buildIRS3800Nonpassive({ ...base, transferStatementIdsByFileName: {} }),
    Error,
    "not bundled",
  );
});
