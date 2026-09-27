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
  binaryAttachments: readonly string[];
};

export type Form8854NativeStatement = {
  documentId: string;
  documentName: string;
  xml: string;
};

const idPattern = /^[A-Za-z0-9:.\-]{1,30}$/;

function nativeStatement(
  documentId: string | undefined,
  documentName: string,
  xml: string,
): Form8854NativeStatement | null {
  if (!xml) return null;
  if (!documentId) {
    throw new Error(`Form 8854 ${documentName} needs a document ID`);
  }
  return { documentId, documentName, xml };
}

function requiredBinaryIds(input: F8854Input): string[] {
  const deferral = input.section_d;
  const deferralIds = deferral.elect_deferral
    ? [
      deferral.hypothetical_return_with_877a.document_id,
      deferral.hypothetical_return_without_877a.document_id,
      deferral.tax_deferral_agreement_copy_document_id,
    ]
    : [];
  const rulingIds = input.section_c?.nongrantor_trust_interests
    .filter((row) => row.treatment === NongrantorTrustTreatment.ElectFullValue)
    .map((row) => {
      if (!row.valuation_letter_ruling_document_id) {
        throw new Error(
          "Form 8854 trust election needs a valuation letter ruling",
        );
      }
      return row.valuation_letter_ruling_document_id;
    }) ?? [];
  return [...new Set([...deferralIds, ...rulingIds])];
}

function validateIds(
  ids: Form8854InitialDocumentLinks,
  statements: readonly Form8854NativeStatement[],
  requiredBinary: readonly string[],
): void {
  for (const required of requiredBinary) {
    if (!ids.binaryAttachments.includes(required)) {
      throw new Error(`Form 8854 needs binary attachment ${required}`);
    }
  }
  const used = [
    ...statements.map((statement) => statement.documentId),
    ...ids.binaryAttachments,
  ];
  if (used.some((id) => !idPattern.test(id))) {
    throw new Error("Form 8854 document IDs must match the MeF IdType");
  }
  if (new Set(used).size !== used.length) {
    throw new Error("Form 8854 document IDs must be unique within the return");
  }
}

/** Unregistered initial Form 8854 document and native statement fragments. */
export function buildForm8854InitialBundle(
  rawInput: F8854Input,
  ids: Form8854InitialDocumentLinks,
  filingPending: { form8949: unknown },
): { formXml: string; nativeStatements: Form8854NativeStatement[] } {
  const input = inputSchema.parse(rawInput);
  reconcileForm8854Form8949Properties(input, filingPending.form8949);
  const changeXml = buildForm8854ChangeStatement(input);
  const balanceStatements = buildForm8854BalanceSheetStatements(
    input.balance_sheet,
  );
  const sectionCStatements = input.section_c
    ? buildForm8854SectionCStatements(input.section_c)
    : null;
  const deferredXml = buildForm8854DeferredPropertyStatement(input);
  const nativeStatements = [
    nativeStatement(
      ids.changeStatement,
      "ChangePreOrPostExpatriationDateStatement",
      changeXml,
    ),
    nativeStatement(
      ids.balanceSheet.partnership,
      "PartnershipInterestStatement",
      balanceStatements.partnership,
    ),
    nativeStatement(
      ids.balanceSheet.ownedTrust,
      "OwnedTrustValueStatement",
      balanceStatements.ownedTrust,
    ),
    nativeStatement(
      ids.balanceSheet.nongrantorTrust,
      "NongrantorTrustsBeneficialInterestStatement",
      balanceStatements.nongrantorTrust,
    ),
    nativeStatement(
      ids.balanceSheet.otherAssets,
      "OtherAssetsNotIncludedStatement",
      balanceStatements.otherAssets,
    ),
    nativeStatement(
      ids.balanceSheet.otherLiabilities,
      "OtherLiabilitiesStatement",
      balanceStatements.otherLiabilities,
    ),
    nativeStatement(
      ids.sectionC.eligibleDeferredCompensation,
      "EligibleDeferredCompensationItemStatement",
      sectionCStatements?.eligibleDeferredCompensation ?? "",
    ),
    nativeStatement(
      ids.sectionC.ineligibleDeferredCompensation,
      "IneligibleDeferredCompensationItemStatement",
      sectionCStatements?.ineligibleDeferredCompensation ?? "",
    ),
    nativeStatement(
      ids.sectionC.specifiedTaxDeferredAccounts,
      "SpecifiedTaxDeferredAccountsStatement",
      sectionCStatements?.specifiedTaxDeferredAccounts ?? "",
    ),
    nativeStatement(
      ids.sectionC.nongrantorTrust,
      "NongrantorTrustStatement",
      sectionCStatements?.nongrantorTrust ?? "",
    ),
    nativeStatement(
      ids.sectionC.computation,
      "Form8854ComputationStatement",
      sectionCStatements?.computation ?? "",
    ),
    nativeStatement(
      ids.sectionC.deferredPropertyTaxElection,
      "DeferredPropertyTaxElectionStatement",
      deferredXml,
    ),
  ].filter((statement): statement is Form8854NativeStatement =>
    statement !== null
  );
  validateIds(ids, nativeStatements, requiredBinaryIds(input));
  const formXml = elements(
    "IRS8854",
    [
      buildForm8854PartI(input),
      buildForm8854PartIISectionA(input, ids.changeStatement),
      buildForm8854BalanceSheet(input, ids.balanceSheet),
      buildForm8854SectionC(input, ids.sectionC),
      buildForm8854SectionD(input),
    ],
    ids.binaryAttachments.length
      ? {
        referenceDocumentId: ids.binaryAttachments.join(" "),
        referenceDocumentName: "BinaryAttachment",
      }
      : undefined,
  );
  return { formXml, nativeStatements };
}
