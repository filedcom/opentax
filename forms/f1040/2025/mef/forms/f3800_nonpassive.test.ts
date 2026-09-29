import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  calculateForm8826,
  type F8826Input,
} from "../../../nodes/inputs/f8826/index.ts";
import { buildIRS3800Document } from "./f3800_document.ts";
import {
  buildForm3800NonpassiveParts,
  type Form3800NonpassiveXmlInput,
} from "./f3800_nonpassive.ts";

function buildFiledNonpassive(
  input: Omit<Form3800NonpassiveXmlInput, "passiveActivity" | "passiveApplied">,
): string {
  return buildIRS3800Document(buildForm3800NonpassiveParts({
    ...input,
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
  }));
}

function disabledAccessFromForm(
  source: F8826Input,
  appliedCredit: number,
  documentId?: string,
  appliedCreditsBySource?: readonly number[],
): NonNullable<Form3800NonpassiveXmlInput["disabledAccess"]> {
  const lines = calculateForm8826(source);
  return {
    credit: lines.line8,
    documentId,
    appliedCredit,
    sources: [
      ...(lines.selfCreditAfterCap > 0
        ? [{ credit: lines.selfCreditAfterCap }]
        : []),
      ...(source.pass_through_credits ?? []).flatMap((entry, index) => {
        const credit = lines.passThroughCreditsAfterCap[index] ?? 0;
        return credit > 0 ? [{ credit, ein: entry.entity_ein }] : [];
      }),
    ],
    appliedCreditsBySource,
  };
}

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

const disabledAccess = disabledAccessFromForm(
  {
    eligible_expenditures: 20_000,
    prior_year_gross_receipts: 900_000,
    prior_year_full_time_employee_count: 40,
    subject_to_passive_activity_limit: false,
  },
  5_000,
  "IRS8826_1",
);

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

Deno.test("Form 3800 nonpassive source builder exposes structured document parts", () => {
  const parts = buildForm3800NonpassiveParts({
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    disabledAccess: disabledAccess,
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertEquals(parts.currentAmounts.map((row) => row.line), ["1e"]);
  assertEquals(parts.currentRows.map((row) => row.line), ["1e"]);
  assertEquals(parts.currentDetails.map((row) => row.line), ["1e"]);
  assertEquals(parts.carryoverRows, []);
  assertEquals(parts.lines.line38, 5_000);
});

Deno.test("Form 3800 source parts retain facility metadata for a mixed row", () => {
  const parts = buildForm3800NonpassiveParts({
    tax,
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    facilities: [ordinary, specified],
    form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
    appliedCreditsByFacility: [18_000, 15_000],
    transferStatementIdsByFileName: {
      "Transfer Election Statement.pdf": "BinaryAttachment1",
    },
  });
  assertEquals(parts.currentRows.find((row) => row.line === "4e")?.metadata, {
    sourceCount: 1,
    transferRegistrationNumber: "CAABC12ABCDE",
    referenceDocumentId: "IRS8835_2",
    referenceDocumentName: "IRS8835",
  });
  assertEquals(parts.currentDetails.map((row) => row.line), ["1f", "4e"]);
});

Deno.test("Form 3800 retains one Form 8936 source detail for a later mixed line", () => {
  const parts = buildForm3800NonpassiveParts({
    tax: { ...tax, standardCredit: 1_875, specifiedCredit: 0 },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8936: {
      credit: 1_875,
      documentId: "IRS8936_1",
      appliedCredit: 1_875,
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertEquals(parts.currentDetails.length, 1);
  assertEquals(parts.currentDetails[0], {
    line: "1y",
    credit: 1_875,
    appliedCredit: 1_875,
    sourceDocumentId: "IRS8936_1",
  });
  assertEquals(
    buildIRS3800Document(parts).includes("Frm8936PartIICYAggrgtAmtGrp"),
    false,
  );
});

Deno.test("Form 3800 XML: nonpassive Form 8835 credit and transfer reconcile to Part II", () => {
  const xml = buildFiledNonpassive({
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
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    disabledAccess: disabledAccess,
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

Deno.test("Form 3800 XML: Form 8820 line 1h reconciles with Part II", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 19_750, specifiedCredit: 0 },
    form8820: {
      credit: 19_750,
      documentId: "IRS8820_1",
      appliedCredit: 19_750,
      sources: [{ credit: 19_750 }],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8820CYCreditsGrp referenceDocumentId="IRS8820_1"',
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>19750</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(() =>
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 19_750, specifiedCredit: 0 },
      form8820: {
        credit: 19_750,
        documentId: "IRS8820_1",
        appliedCredit: 20_000,
        sources: [{ credit: 19_750 }],
      },
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    })
  );
});

Deno.test("Form 3800 XML: Form 8874 line 1i links native source and tax use", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    form8874: {
      credit: 5_000,
      documentId: "IRS8874_1",
      appliedCredit: 5_000,
      sources: [{ credit: 5_000 }],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8874CYCreditsGrp referenceDocumentId="IRS8874_1"',
  );
  assertStringIncludes(xml, "<GenBusCYCreditsSubTotGrp>");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>5000</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
        form8874: {
          credit: 5_000,
          documentId: "IRS8874_1",
          appliedCredit: 5_001,
          sources: [{ credit: 5_000 }],
        },
        facilities: [],
        form8835DocumentIds: [],
        appliedCreditsByFacility: [],
        transferStatementIdsByFileName: {},
      }),
    Error,
    "invalid Form 8874",
  );
});

Deno.test("Form 3800 XML: Form 8874 pass-through-only credit needs no invented source form", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    form8874: {
      credit: 5_000,
      appliedCredit: 5_000,
      sources: [{ credit: 5_000, ein: "123456789" }],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(xml, "<Form8874CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8874"'), false);
});

Deno.test("Form 3800 XML: mixed Form 8874 sources need explicit partial-limit use", () => {
  const base = {
    tax: { ...tax, standardCredit: 30_000, specifiedCredit: 0 },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  const form8874 = {
    credit: 30_000,
    documentId: "IRS8874_1",
    appliedCredit: 20_000,
    sources: [{ credit: 20_000 }, { credit: 10_000, ein: "123456789" }],
  };
  assertThrows(
    () => buildFiledNonpassive({ ...base, form8874 }),
    Error,
    "Part V applied credits",
  );
  const xml = buildFiledNonpassive({
    ...base,
    form8874: { ...form8874, appliedCreditsBySource: [15_000, 5_000] },
  });
  assertStringIncludes(xml, "<Frm8874CYAggrgtAmtGrp");
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>5000</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 XML: Form 8820 pass-through-only line 1h needs no Form 8820 document", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 1_250, specifiedCredit: 0 },
    form8820: {
      credit: 1_250,
      appliedCredit: 1_250,
      sources: [{ credit: 1_250, ein: "123456789" }],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(xml, "<Form8820CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8820"'), false);
});

Deno.test("Form 3800 XML: mixed Form 8820 sources retain Part V identity and allocations", () => {
  const base = {
    tax: { ...tax, standardCredit: 19_750, specifiedCredit: 0 },
    form8820: {
      credit: 19_750,
      documentId: "IRS8820_1",
      appliedCredit: 19_750,
      sources: [
        { credit: 18_500 },
        { credit: 1_250, ein: "123456789" },
      ],
      appliedCreditsBySource: [18_500, 1_250],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  const xml = buildFiledNonpassive(base);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml,
    '<Frm8820CYAggrgtAmtGrp referenceDocumentId="IRS8820_1"',
  );
  assertStringIncludes(
    xml,
    '<Frm8820CYAggrgtAmtGrp lineNumberTxt="Part III Line 1h">',
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        form8820: {
          ...base.form8820,
          appliedCreditsBySource: [18_500, 1_249],
        },
      }),
    Error,
    "Part V applied credits do not reconcile",
  );
});

Deno.test("Form 3800 XML: Form 8936 new-vehicle business credit uses line 1y", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 1_875, specifiedCredit: 0 },
    form8936: {
      credit: 1_875,
      documentId: "IRS8936_1",
      appliedCredit: 1_875,
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8936PartIICYCreditsGrp referenceDocumentId="IRS8936_1" referenceDocumentName="IRS8936">',
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>1875</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        tax: { ...tax, standardCredit: 1_875, specifiedCredit: 0 },
        form8936: {
          credit: 1_875,
          documentId: "IRS8936_1",
          appliedCredit: 1_876,
        },
        facilities: [],
        form8835DocumentIds: [],
        appliedCreditsByFacility: [],
        transferStatementIdsByFileName: {},
      }),
    Error,
    "invalid Form 8936",
  );
});

Deno.test("Form 3800 XML: Form 8936 commercial vehicle credit uses line 1aa", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 7_500, specifiedCredit: 0 },
    form8936Commercial: {
      credit: 7_500,
      documentId: "IRS8936_1",
      appliedCredit: 7_500,
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8936PartVCYCreditsGrp referenceDocumentId="IRS8936_1" referenceDocumentName="IRS8936">',
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>7500</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        tax: { ...tax, standardCredit: 7_500, specifiedCredit: 0 },
        form8936Commercial: {
          credit: 7_500,
          documentId: "IRS8936_1",
          appliedCredit: 7_501,
        },
        facilities: [],
        form8835DocumentIds: [],
        appliedCreditsByFacility: [],
        transferStatementIdsByFileName: {},
      }),
    Error,
    "line 1aa allocation",
  );
});

Deno.test("Form 3800 XML: pass-through-only disabled-access credit has no Form 8826 document", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 1_250, specifiedCredit: 0 },
    disabledAccess: disabledAccessFromForm({
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{
        entity_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 disabled-access K-1",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    }, 1_250),
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    "<Form8826CYCreditsGrp><PassThroughEntityEIN>123456789</PassThroughEntityEIN><GeneralBusCrFromNnPssvActyAmt>1250",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>1250</CurrentYearCreditAllowedAmt>",
  );
});

Deno.test("Form 3800 XML: direct estate and trust disabled-access sources share one line 1e row", () => {
  const xml = buildFiledNonpassive({
    tax: {
      ...tax,
      regularTax: 22_500,
      standardCredit: 3_000,
      specifiedCredit: 0,
    },
    disabledAccess: {
      credit: 3_000,
      sources: [
        { ein: "123456789", credit: 1_000 },
        { ein: "987654321", credit: 2_000 },
      ],
      appliedCredit: 2_500,
      appliedCreditsBySource: [1_000, 1_500],
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertEquals([...xml.matchAll(/<Form8826CYCreditsGrp/g)].length, 1);
  assertEquals([...xml.matchAll(/<Frm8826CYAggrgtAmtGrp/g)].length, 2);
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
});

Deno.test("Form 3800 XML: Form 8826 source rows preserve capped K-1 identity and applied credit", () => {
  const source = {
    eligible_expenditures: 5_000,
    prior_year_gross_receipts: 500_000,
    prior_year_full_time_employee_count: 20,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
  };
  const xml = buildFiledNonpassive({
    tax: {
      ...tax,
      regularTax: 22_000,
      standardCredit: 5_000,
      specifiedCredit: 0,
    },
    disabledAccess: disabledAccessFromForm(
      source,
      2_000,
      "IRS8826_1",
      [1_000, 1_000],
    ),
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    '<Form8826CYCreditsGrp referenceDocumentId="IRS8826_1" referenceDocumentName="IRS8826"><CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt><PassThroughEntityEIN>123456789</PassThroughEntityEIN>',
  );
  assertStringIncludes(
    xml,
    '<Frm8826CYAggrgtAmtGrp referenceDocumentId="IRS8826_1" referenceDocumentName="IRS8826" lineNumberTxt="Part III Line 1e">',
  );
  assertStringIncludes(
    xml,
    '<Frm8826CYAggrgtAmtGrp lineNumberTxt="Part III Line 1e"><PassThroughEntityEIN>123456789</PassThroughEntityEIN>',
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>1209</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>1791</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 XML: multiple Form 8826 K-1 sources need exact Part V applied amounts", () => {
  const base = {
    tax: {
      ...tax,
      regularTax: 23_000,
      standardCredit: 5_000,
      specifiedCredit: 0,
    },
    disabledAccess: disabledAccessFromForm(
      {
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
        pass_through_credits: [{
          entity_type: "partnership" as const,
          entity_ein: "123456789",
          source_document_reference: "2025 disabled-access K-1",
          credit_amount: 2_000,
          subject_to_passive_activity_limit: false,
        }, {
          entity_type: "s_corporation" as const,
          entity_ein: "987654321",
          source_document_reference: "2025 disabled-access K-1",
          credit_amount: 3_000,
          subject_to_passive_activity_limit: false,
        }],
      },
      3_000,
      undefined,
      [1_000, 2_000],
    ),
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  const xml = buildFiledNonpassive(base);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt><PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  assertEquals(
    [...xml.matchAll(/<Frm8826CYAggrgtAmtGrp /g)].length,
    2,
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        disabledAccess: {
          ...base.disabledAccess,
          appliedCreditsBySource: undefined,
        },
      }),
    Error,
    "applied credit for each Form 8826 Part V source",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        disabledAccess: {
          ...base.disabledAccess,
          appliedCreditsBySource: [3_000, 0],
        },
      }),
    Error,
    "invalid applied credit",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        disabledAccess: {
          ...base.disabledAccess,
          appliedCreditsBySource: [1_000, 1_000],
        },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Form 3800 XML: whole-dollar Form 8826 Part V rows reconcile after source rounding", () => {
  const xml = buildFiledNonpassive({
    tax: {
      ...tax,
      regularTax: 20_002,
      tentativeMinimumTax: 20_000,
      standardCredit: 4.47,
      specifiedCredit: 0,
    },
    disabledAccess: disabledAccessFromForm(
      {
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
        pass_through_credits: [
          {
            entity_type: "partnership",
            entity_ein: "111111111",
            source_document_reference: "2025 disabled-access K-1",
            credit_amount: 1.49,
            subject_to_passive_activity_limit: false,
          },
          {
            entity_type: "partnership",
            entity_ein: "222222222",
            source_document_reference: "2025 disabled-access K-1",
            credit_amount: 1.49,
            subject_to_passive_activity_limit: false,
          },
          {
            entity_type: "partnership",
            entity_ein: "333333333",
            source_document_reference: "2025 disabled-access K-1",
            credit_amount: 1.49,
            subject_to_passive_activity_limit: false,
          },
        ],
      },
      2,
      undefined,
      [0.49, 1.49, 0.02],
    ),
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  const rows = [
    ...xml.matchAll(
      /<Frm8826CYAggrgtAmtGrp[^>]*>(.*?)<\/Frm8826CYAggrgtAmtGrp>/g,
    ),
  ]
    .map((match) => match[1]);
  assertEquals(rows.length, 3);
  const amount = (row: string, tag: string): number => {
    const match = row.match(new RegExp(`<${tag}>(\\d+)</${tag}>`));
    if (!match) throw new Error(`Missing ${tag}`);
    return Number(match[1]);
  };
  const credits = rows.map((row) => amount(row, "TotalGeneralBusCreditsAmt"));
  const applied = rows.map((row) =>
    amount(row, "TotalGBCLessGrossEPEAppTxAmt")
  );
  const remaining = rows.map((row) =>
    amount(row, "CarryforwardGeneralBusCrAmt")
  );
  assertEquals(credits, [2, 1, 1]);
  assertEquals(applied, [1, 1, 0]);
  assertEquals(remaining, [1, 0, 1]);
  assertEquals(credits.reduce((sum, value) => sum + value, 0), 4);
  assertEquals(applied.reduce((sum, value) => sum + value, 0), 2);
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>4</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>2</CurrentYearCreditAllowedAmt>",
  );
});

Deno.test("Form 3800 XML: self-earned credit needs Form 8826 document, pass-through-only credit must omit it", () => {
  const base = {
    tax: { ...tax, standardCredit: 1_250, specifiedCredit: 0 },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        tax: { ...base.tax, standardCredit: 5_000 },
        disabledAccess: { ...disabledAccess, documentId: undefined },
      }),
    Error,
    "source document",
  );
  assertThrows(
    () =>
      buildFiledNonpassive({
        ...base,
        disabledAccess: disabledAccessFromForm(
          {
            eligible_expenditures: 0,
            subject_to_passive_activity_limit: false,
            pass_through_credits: [{
              entity_type: "s_corporation",
              entity_ein: "987654321",
              source_document_reference: "2025 disabled-access K-1",
              credit_amount: 1_250,
              subject_to_passive_activity_limit: false,
            }],
          },
          1_250,
          "IRS8826_1",
        ),
      }),
    Error,
    "source document",
  );
});

Deno.test("Form 3800 XML: Form 8826 and Form 8835 share the standard-credit limit", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 23_000 },
    disabledAccess: disabledAccess,
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
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 23_000 },
      disabledAccess: disabledAccess,
      facilities: [ordinary, specified],
      form8835DocumentIds: ["IRS8835_1", "IRS8835_2"],
      appliedCreditsByFacility: [18_000, 15_000],
      transferStatementIdsByFileName: {
        "Transfer Election Statement.pdf": "BinaryAttachment1",
      },
    })
  );
});

Deno.test("Form 3800 XML: Form 8820 and Form 8835 share a limited standard-credit amount", () => {
  const xml = buildFiledNonpassive({
    tax: { ...tax, standardCredit: 37_750, specifiedCredit: 0 },
    form8820: {
      credit: 19_750,
      documentId: "IRS8820_1",
      appliedCredit: 15_000,
      sources: [{ credit: 19_750 }],
    },
    facilities: [ordinary],
    form8835DocumentIds: ["IRS8835_1"],
    appliedCreditsByFacility: [5_000],
    transferStatementIdsByFileName: {},
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>20000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, "<Form8820CYCreditsGrp");
  assertStringIncludes(xml, "<Form8835PartIICYCreditsGrp");
  assertStringIncludes(
    xml,
    "<GenBusCYCreditsSubTotGrp><GeneralBusCrFromNnPssvActyAmt>37750</GeneralBusCrFromNnPssvActyAmt><TotalGeneralBusCreditsAmt>37750</TotalGeneralBusCreditsAmt><TotalGeneralBusCreditsAppTxAmt>20000</TotalGeneralBusCreditsAppTxAmt></GenBusCYCreditsSubTotGrp>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>5000</TotalGeneralBusCreditsAppTxAmt>",
  );
});

Deno.test("Form 3800 XML: disabled-access source totals and applied credit reconcile", () => {
  const base = {
    tax: { ...tax, standardCredit: 5_000, specifiedCredit: 0 },
    disabledAccess: disabledAccess,
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  };
  assertThrows(() =>
    buildFiledNonpassive({
      ...base,
      disabledAccess: { ...disabledAccess, sources: [{ credit: 4_999 }] },
    })
  );
  assertThrows(() =>
    buildFiledNonpassive({
      ...base,
      tax: { ...base.tax, standardCredit: 6_000 },
    })
  );
  assertThrows(() =>
    buildFiledNonpassive({
      ...base,
      disabledAccess: { ...disabledAccess, appliedCredit: 5_001 },
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
  const documents = [
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 23_000 },
      disabledAccess: { ...disabledAccess, documentId: "IRS8826-1" },
      facilities: [ordinary, specified],
      form8835DocumentIds: ["IRS8835-1", "IRS8835-2"],
      appliedCreditsByFacility: [15_000, 15_000],
      transferStatementIdsByFileName: {
        "Transfer Election Statement.pdf": "BinaryAttachment1",
      },
    }),
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 1_250, specifiedCredit: 0 },
      disabledAccess: disabledAccessFromForm({
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
        pass_through_credits: [{
          entity_type: "partnership",
          entity_ein: "123456789",
          source_document_reference: "2025 disabled-access K-1",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
      }, 1_250),
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    }),
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 1_250, specifiedCredit: 0 },
      form8820: {
        credit: 1_250,
        appliedCredit: 1_250,
        sources: [{ credit: 1_250, ein: "123456789" }],
      },
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    }),
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 19_750, specifiedCredit: 0 },
      form8820: {
        credit: 19_750,
        documentId: "IRS8820-1",
        appliedCredit: 19_750,
        sources: [
          { credit: 18_500 },
          { credit: 1_250, ein: "123456789" },
        ],
        appliedCreditsBySource: [18_500, 1_250],
      },
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    }),
    buildFiledNonpassive({
      tax: { ...tax, standardCredit: 19_750, specifiedCredit: 0 },
      form8820: {
        credit: 19_750,
        documentId: "IRS8820-1",
        appliedCredit: 19_750,
        sources: [{ credit: 19_750 }],
      },
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    }),
    buildFiledNonpassive({
      tax: {
        ...tax,
        regularTax: 23_000,
        standardCredit: 5_000,
        specifiedCredit: 0,
      },
      disabledAccess: disabledAccessFromForm(
        {
          eligible_expenditures: 0,
          subject_to_passive_activity_limit: false,
          pass_through_credits: [{
            entity_type: "partnership",
            entity_ein: "123456789",
            source_document_reference: "2025 disabled-access K-1",
            credit_amount: 2_000,
            subject_to_passive_activity_limit: false,
          }, {
            entity_type: "s_corporation",
            entity_ein: "987654321",
            source_document_reference: "2025 disabled-access K-1",
            credit_amount: 3_000,
            subject_to_passive_activity_limit: false,
          }],
        },
        3_000,
        undefined,
        [1_000, 2_000],
      ),
      facilities: [],
      form8835DocumentIds: [],
      appliedCreditsByFacility: [],
      transferStatementIdsByFileName: {},
    }),
  ];
  for (const document of documents) {
    const xml = document.replace(
      "<IRS3800>",
      '<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">',
    );
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
  }
});

Deno.test("Form 3800 XML: multiple facilities on one line have per-facility Part V rows", () => {
  const xml = buildFiledNonpassive({
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
  const xml = buildFiledNonpassive({
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
  const xml = buildFiledNonpassive({
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
      buildFiledNonpassive({
        ...base,
        appliedCreditsByFacility: [17_000, 15_000],
      }),
    Error,
    "do not reconcile to Part II",
  );
  assertThrows(
    () => buildFiledNonpassive({ ...base, transferStatementIdsByFileName: {} }),
    Error,
    "not bundled",
  );
});
