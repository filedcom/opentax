import { elements } from "../../../mef/xml.ts";
import {
  type F8854Input,
  inputSchema,
} from "../../../nodes/inputs/f8854/index.ts";
import { NongrantorTrustTreatment } from "../../../nodes/inputs/f8854/section-c.ts";
import { reconcileForm8854Form8949Properties } from "../../../nodes/inputs/f8854/reconcile-capital.ts";
import {
  buildForm8854BalanceSheet,
  buildForm8854BalanceSheetStatements,
  type Form8854BalanceSheetStatementIds,
} from "./f8854_balance_sheet.ts";
import { buildForm8854PartI } from "./f8854_part_i.ts";
import {
  buildForm8854ChangeStatement,
  buildForm8854PartIISectionA,
} from "./f8854_part_ii_a.ts";
import {
  buildForm8854SectionC,
  buildForm8854SectionCStatements,
  type Form8854SectionCStatementIds,
} from "./f8854_section_c.ts";
import {
  buildForm8854DeferredPropertyStatement,
  buildForm8854SectionD,
} from "./f8854_section_d.ts";

export type Form8854InitialDocumentLinks = {
  changeStatement?: string;
  balanceSheet: Form8854BalanceSheetStatementIds;
  sectionC: Form8854SectionCStatementIds;
  binaryAttachmentIdsByFileName: Readonly<Record<string, string>>;
};

export type Form8854NativeStatement = {
  documentId: string;
  documentName: string;
  xml: string;
};

export type Form8854NativeStatementKey =
  | "changeStatement"
  | "partnership"
  | "ownedTrust"
  | "balanceSheetNongrantorTrust"
  | "otherAssets"
  | "otherLiabilities"
  | "eligibleDeferredCompensation"
  | "ineligibleDeferredCompensation"
  | "specifiedTaxDeferredAccounts"
  | "sectionCNongrantorTrust"
  | "computation"
  | "deferredPropertyTaxElection";

export type Form8854NativeStatementContent = {
  key: Form8854NativeStatementKey;
  documentName: string;
  xml: string;
};

const idPattern = /^[A-Za-z0-9:.\-]{1,30}$/;

/** Stable statement set and order, independent of document-ID assignment. */
export function buildForm8854NativeStatementContents(
  rawInput: F8854Input,
): Form8854NativeStatementContent[] {
  const input = inputSchema.parse(rawInput);
  const balance = buildForm8854BalanceSheetStatements(input.balance_sheet);
  const sectionC = input.section_c
    ? buildForm8854SectionCStatements(input.section_c)
    : null;
  // ReturnData1040.xsd orders the Form 8854 native roots as listed here.
  const candidates: Form8854NativeStatementContent[] = [
    {
      key: "changeStatement",
      documentName: "ChangePreOrPostExpatriationDateStatement",
      xml: buildForm8854ChangeStatement(input),
    },
    {
      key: "deferredPropertyTaxElection",
      documentName: "DeferredPropertyTaxElectionStatement",
      xml: buildForm8854DeferredPropertyStatement(input),
    },
    {
      key: "eligibleDeferredCompensation",
      documentName: "EligibleDeferredCompensationItemStatement",
      xml: sectionC?.eligibleDeferredCompensation ?? "",
    },
    {
      key: "computation",
      documentName: "Form8854ComputationStatement",
      xml: sectionC?.computation ?? "",
    },
    {
      key: "ineligibleDeferredCompensation",
      documentName: "IneligibleDeferredCompensationItemStatement",
      xml: sectionC?.ineligibleDeferredCompensation ?? "",
    },
    {
      key: "balanceSheetNongrantorTrust",
      documentName: "NongrantorTrustsBeneficialInterestStatement",
      xml: balance.nongrantorTrust,
    },
    {
      key: "sectionCNongrantorTrust",
      documentName: "NongrantorTrustStatement",
      xml: sectionC?.nongrantorTrust ?? "",
    },
    {
      key: "otherAssets",
      documentName: "OtherAssetsNotIncludedStatement",
      xml: balance.otherAssets,
    },
    {
      key: "otherLiabilities",
      documentName: "OtherLiabilitiesStatement",
      xml: balance.otherLiabilities,
    },
    {
      key: "ownedTrust",
      documentName: "OwnedTrustValueStatement",
      xml: balance.ownedTrust,
    },
    {
      key: "partnership",
      documentName: "PartnershipInterestStatement",
      xml: balance.partnership,
    },
    {
      key: "specifiedTaxDeferredAccounts",
      documentName: "SpecifiedTaxDeferredAccountsStatement",
      xml: sectionC?.specifiedTaxDeferredAccounts ?? "",
    },
  ];
  return candidates.filter((statement) => statement.xml !== "");
}

/** Bind the assembler's ordered statement IDs to this exact statement set. */
export function linkForm8854NativeStatementIds(
  contents: readonly Form8854NativeStatementContent[],
  statementIds: readonly string[],
  binaryAttachmentIdsByFileName: Readonly<Record<string, string>>,
): Form8854InitialDocumentLinks {
  if (contents.length !== statementIds.length) {
    throw new Error("Form 8854 native statement set changed while linking IDs");
  }
  const linked = new Map<Form8854NativeStatementKey, string>();
  contents.forEach((statement, index) => {
    if (linked.has(statement.key)) {
      throw new Error(`Form 8854 statement ${statement.key} is duplicated`);
    }
    linked.set(statement.key, statementIds[index]);
  });
  if (new Set(statementIds).size !== statementIds.length) {
    throw new Error("Form 8854 native statement IDs must be unique");
  }
  return {
    changeStatement: linked.get("changeStatement"),
    balanceSheet: {
      partnership: linked.get("partnership"),
      ownedTrust: linked.get("ownedTrust"),
      nongrantorTrust: linked.get("balanceSheetNongrantorTrust"),
      otherAssets: linked.get("otherAssets"),
      otherLiabilities: linked.get("otherLiabilities"),
    },
    sectionC: {
      eligibleDeferredCompensation: linked.get("eligibleDeferredCompensation"),
      ineligibleDeferredCompensation: linked.get(
        "ineligibleDeferredCompensation",
      ),
      specifiedTaxDeferredAccounts: linked.get("specifiedTaxDeferredAccounts"),
      nongrantorTrust: linked.get("sectionCNongrantorTrust"),
      computation: linked.get("computation"),
      deferredPropertyTaxElection: linked.get("deferredPropertyTaxElection"),
    },
    binaryAttachmentIdsByFileName,
  };
}

function linkedStatementId(
  links: Form8854InitialDocumentLinks,
  key: Form8854NativeStatementKey,
): string | undefined {
  const ids: Record<Form8854NativeStatementKey, string | undefined> = {
    changeStatement: links.changeStatement,
    partnership: links.balanceSheet.partnership,
    ownedTrust: links.balanceSheet.ownedTrust,
    balanceSheetNongrantorTrust: links.balanceSheet.nongrantorTrust,
    otherAssets: links.balanceSheet.otherAssets,
    otherLiabilities: links.balanceSheet.otherLiabilities,
    eligibleDeferredCompensation: links.sectionC.eligibleDeferredCompensation,
    ineligibleDeferredCompensation:
      links.sectionC.ineligibleDeferredCompensation,
    specifiedTaxDeferredAccounts: links.sectionC.specifiedTaxDeferredAccounts,
    sectionCNongrantorTrust: links.sectionC.nongrantorTrust,
    computation: links.sectionC.computation,
    deferredPropertyTaxElection: links.sectionC.deferredPropertyTaxElection,
  };
  return ids[key];
}

function requiredBinaryFileNames(input: F8854Input): string[] {
  const deferral = input.section_d;
  const deferralIds = deferral.elect_deferral
    ? [
      deferral.hypothetical_return_with_877a.attachment_file_name,
      deferral.hypothetical_return_without_877a.attachment_file_name,
      deferral.tax_deferral_agreement_copy_attachment_file_name,
    ]
    : [];
  const rulingIds = input.section_c?.nongrantor_trust_interests
    .filter((row) => row.treatment === NongrantorTrustTreatment.ElectFullValue)
    .map((row) => {
      if (!row.valuation_letter_ruling_attachment_file_name) {
        throw new Error(
          "Form 8854 trust election needs a valuation letter ruling",
        );
      }
      return row.valuation_letter_ruling_attachment_file_name;
    }) ?? [];
  return [...new Set([...deferralIds, ...rulingIds])];
}

function validateIds(
  ids: Form8854InitialDocumentLinks,
  statements: readonly Form8854NativeStatement[],
  requiredBinaryFileNames: readonly string[],
): void {
  for (const fileName of requiredBinaryFileNames) {
    if (!ids.binaryAttachmentIdsByFileName[fileName]) {
      throw new Error(`Form 8854 needs binary attachment ${fileName}`);
    }
  }
  const used = [
    ...statements.map((statement) => statement.documentId),
    ...requiredBinaryFileNames.map((fileName) =>
      ids.binaryAttachmentIdsByFileName[fileName]
    ),
  ];
  if (used.some((id) => !idPattern.test(id))) {
    throw new Error("Form 8854 document IDs must match the MeF IdType");
  }
  if (new Set(used).size !== used.length) {
    throw new Error("Form 8854 document IDs must be unique within the return");
  }
}

/** Build the root in document discovery or final reference-linking phase. */
export function buildForm8854InitialDocument(
  rawInput: F8854Input,
  links: Form8854InitialDocumentLinks,
  filingPending: { form8949: unknown },
  phase: "discover" | "link",
): string {
  const input = inputSchema.parse(rawInput);
  reconcileForm8854Form8949Properties(input, filingPending.form8949);
  const requiredBinary = requiredBinaryFileNames(input);
  if (
    phase === "link" &&
    requiredBinary.some((fileName) =>
      !links.binaryAttachmentIdsByFileName[fileName]
    )
  ) {
    throw new Error("Form 8854 needs its required binary attachments linked");
  }
  const binaryIds = requiredBinary.flatMap((fileName) => {
    const id = links.binaryAttachmentIdsByFileName[fileName];
    return id ? [id] : [];
  });
  return elements(
    "IRS8854",
    [
      buildForm8854PartI(input),
      buildForm8854PartIISectionA(input, links.changeStatement, phase),
      buildForm8854BalanceSheet(input, links.balanceSheet, phase),
      buildForm8854SectionC(input, links.sectionC, phase),
      buildForm8854SectionD(input),
    ],
    binaryIds.length
      ? {
        referenceDocumentId: binaryIds.join(" "),
        referenceDocumentName: "BinaryAttachment",
      }
      : undefined,
  );
}

/** Unregistered initial Form 8854 document and native statement fragments. */
export function buildForm8854InitialBundle(
  rawInput: F8854Input,
  ids: Form8854InitialDocumentLinks,
  filingPending: { form8949: unknown },
): { formXml: string; nativeStatements: Form8854NativeStatement[] } {
  const input = inputSchema.parse(rawInput);
  reconcileForm8854Form8949Properties(input, filingPending.form8949);
  const nativeStatements = buildForm8854NativeStatementContents(input).map(
    (statement): Form8854NativeStatement => {
      const documentId = linkedStatementId(ids, statement.key);
      if (!documentId) {
        throw new Error(
          `Form 8854 ${statement.documentName} needs a document ID`,
        );
      }
      return {
        documentId,
        documentName: statement.documentName,
        xml: statement.xml,
      };
    },
  );
  validateIds(ids, nativeStatements, requiredBinaryFileNames(input));
  const formXml = buildForm8854InitialDocument(
    input,
    ids,
    filingPending,
    "link",
  );
  return { formXml, nativeStatements };
}
