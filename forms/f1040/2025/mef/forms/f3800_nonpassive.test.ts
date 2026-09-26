import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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

const disabledAccess = {
  source: {
    eligible_expenditures: 20_000,
    prior_year_gross_receipts: 900_000,
    prior_year_full_time_employee_count: 40,
    subject_to_passive_activity_limit: false,
  },
  documentId: "IRS8826_1",
  appliedCredit: 5_000,
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

Deno.test("Form 3800 XML: Form 8826 line 1e alone reconciles with Part II", () => {
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    form8826: disabledAccess,
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8826CYCreditsGrp referenceDocumentId="IRS8826_1" referenceDocumentName="IRS8826">',
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>5000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, "<GenBusCYCreditsSubTotGrp>");
  assertStringIncludes(
    xml,
    "<GeneralBusCrFromNnPssvActyAmt>5000</GeneralBusCrFromNnPssvActyAmt>",
  );
});

Deno.test("Form 3800 XML: Form 8826 and Form 8835 share the standard-credit limit", () => {
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 23_000 },
    form8826: disabledAccess,
    facilities: [ordinary, specified],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [15_000, 15_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>35000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, "<Form8826CYCreditsGrp");
  assertStringIncludes(xml, "<Form8835PartIICYCreditsGrp");
  assertThrows(() =>
    buildIRS3800Nonpassive({
      tax: { ...tax, standardCredit: 23_000 },
      form8826: disabledAccess,
      facilities: [ordinary, specified],
      form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
      appliedCreditsByFacility: [18_000, 15_000],
      transferStatementIdsByFileName: {
        "Transfer Election Statement.pdf": "BinaryAttachment1",
      },
    })
  );
});

Deno.test("Form 3800 XML: Form 8826 rejects passive, unmatched, and over-applied credit", () => {
  const base = {
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    form8826: disabledAccess,
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  assertThrows(() =>
    buildIRS3800Nonpassive({
      ...base,
      form8826: {
        ...disabledAccess,
        source: {
          ...disabledAccess.source,
          subject_to_passive_activity_limit: true,
        },
      },
    })
  );
  assertThrows(() =>
    buildIRS3800Nonpassive({
      ...base,
      tax: { ...base.tax, standardCredit: 6_000 },
    })
  );
  assertThrows(() =>
    buildIRS3800Nonpassive({
      ...base,
      form8826: { ...disabledAccess, appliedCredit: 5_001 },
    })
  );
});

Deno.test("Form 3800 XML: mixed Form 8826 and Form 8835 follows TY2025 source schema", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const xml = buildIRS3800Nonpassive({
    tax: { ...tax, standardCredit: 23_000 },
    form8826: disabledAccess,
    facilities: [ordinary, specified],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [15_000, 15_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  }).replace("<IRS3800>", '<IRS3800 xmlns="http://www.irs.gov/efile">');
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
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
