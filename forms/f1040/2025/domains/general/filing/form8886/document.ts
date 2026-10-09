import { element, elements } from "../../../../../mef/xml.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import {
  disclosureSchema,
  EntityType,
  type Form8886Disclosure,
  ReportableCategory,
  TaxBenefit,
} from "./source.ts";

type Party = Form8886Disclosure["parties"][number];
type Address = NonNullable<Party["address"]>;

const categoryTags: Readonly<Record<ReportableCategory, string>> = {
  [ReportableCategory.Listed]: "ListedInd",
  [ReportableCategory.Confidential]: "ConfidentialInd",
  [ReportableCategory.ContractualProtection]: "ContractualProtectionInd",
  [ReportableCategory.Loss]: "LossInd",
  [ReportableCategory.TransactionOfInterest]: "TransactionOfInterestInd",
};
const benefitTags: Readonly<Record<TaxBenefit, string>> = {
  [TaxBenefit.Deduction]: "DeductionsInd",
  [TaxBenefit.CapitalLoss]: "CapitalLossInd",
  [TaxBenefit.OrdinaryLoss]: "OrdinaryLossInd",
  [TaxBenefit.Exclusion]: "ExclusionsFromGrossIncomeInd",
  [TaxBenefit.Nonrecognition]: "NonrecognitionOfGainInd",
  [TaxBenefit.BasisAdjustment]: "AdjustmentsToBasisInd",
  [TaxBenefit.NoBasisAdjustment]: "AbsenceOfAdjustmentsToBasisInd",
  [TaxBenefit.Deferral]: "DeferralInd",
  [TaxBenefit.Other]: "OtherInd",
  [TaxBenefit.Credit]: "TaxCreditsInd",
};
const entityTags: Readonly<Record<EntityType, string>> = {
  [EntityType.Partnership]: "PartnershipInd",
  [EntityType.SCorporation]: "SCorporationInd",
  [EntityType.Trust]: "TrustInd",
};

function identity(party: Party): string {
  // Unknown identifiers are omitted as permitted by the instructions; a reason
  // remains in the reviewed source. Do not invent a foreign/applied-for code.
  if (party.identity.kind === "unknown") return "";
  return element(
    party.identity.kind === "ssn" ? "SSN" : "EIN",
    party.identity.value,
  );
}

function address(value: Address | undefined): string {
  if (!value) return "";
  const lines = [
    element("AddressLine1Txt", value.line1),
    element("AddressLine2Txt", value.line2),
  ];
  if (value.kind === "us") {
    return elements("USAddress", [
      ...lines,
      element("CityNm", value.city),
      element("StateAbbreviationCd", value.state),
      element("ZIPCd", value.zip),
    ]);
  }
  return elements("ForeignAddress", [
    ...lines,
    element("CityNm", value.city),
    element("ProvinceOrStateNm", value.province),
    element("CountryCd", value.country),
    element("ForeignPostalCd", value.postal_code),
  ]);
}

export function form8886Narrative(source: Form8886Disclosure): string {
  return [
    source.transaction_steps,
    source.expected_tax_treatment,
    source.economic_business_reasons,
    source.tax_result_protection,
    source.confidentiality_description,
    source.contractual_protection_description,
    source.loss_basis_description,
    ...source.benefits.map((benefit) => benefit.description),
  ].filter((value): value is string => value !== undefined).join(" ").replace(
    /\s+/g,
    " ",
  ).trim();
}

/** Preserve word boundaries across the native field and ordered continuation
 * entries. Identify this disclosure taxpayer explicitly because the joint
 * return header alone cannot distinguish separately owned copies. Never put
 * an SSN in the continuation schema's optional EIN field. */
export function form8886NativeNarrative(source: Form8886Disclosure) {
  const narrative = `Disclosure taxpayer SSN ${source.taxpayer_ssn}. ${
    form8886Narrative(source)
  }`;
  const chunks: string[] = [];
  let remaining = narrative;
  let limit = 1000;
  while (remaining.length > limit) {
    const boundary = remaining.lastIndexOf(" ", limit);
    if (boundary < 1) {
      throw new Error("Form 8886 narrative word exceeds the native field");
    }
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary + 1);
    limit = 100_000;
  }
  chunks.push(remaining);
  return { initial: chunks[0], continuations: chunks.slice(1) };
}

export function buildForm8886Documents(
  source: Form8886Disclosure,
  ownerSSN: string,
  statementNumber: number,
  statementCount: number,
) {
  const input = disclosureSchema.parse(source);
  const narrative = form8886NativeNarrative(input);
  const continuationId = narrative.continuations.length
    ? `F8886Expected${statementNumber}`
    : undefined;
  const serialized = serializeForm8886Document(
    input,
    ownerSSN,
    statementNumber,
    statementCount,
    continuationId,
    true,
  );
  const formXml = serialized.formXml;
  const continuationXml = continuationId
    ? elements(
      "ContF8886ExpctTaxBnftExpln",
      narrative.continuations.map((value) =>
        elements("ContF8886ExpctTaxBenefitExpln", [
          element("ExpectedTaxBenefitsExplnTxt", value),
        ])
      ),
      { documentId: continuationId },
    )
    : undefined;
  return {
    formXml,
    continuationXml,
    continuationId,
    generalContinuations: serialized.generalContinuations,
  };
}

/** Staged serializer only: not registered for filing until return/source and
 * exact-copy PDF/OTSA preparation are complete. No tax calculation is changed. */
export function buildForm8886Document(
  input: Form8886Disclosure,
  ownerSSN: string,
  statementNumber: number,
  statementCount: number,
  continuationDocumentId?: string,
): string {
  return serializeForm8886Document(
    input,
    ownerSSN,
    statementNumber,
    statementCount,
    continuationDocumentId,
  ).formXml;
}

function serializeForm8886Document(
  input: Form8886Disclosure,
  ownerSSN: string,
  statementNumber: number,
  statementCount: number,
  continuationDocumentId?: string,
  allowGeneralContinuations = false,
) {
  const source = disclosureSchema.parse(input);
  if (source.taxpayer_ssn !== ownerSSN) {
    throw new Error("Form 8886 disclosure owner differs from the return owner");
  }
  if (
    !Number.isInteger(statementNumber) || !Number.isInteger(statementCount) ||
    statementNumber < 1 || statementNumber > statementCount
  ) {
    throw new Error(
      "Form 8886 statement number must be within the disclosure count",
    );
  }
  const narrative = form8886NativeNarrative(source);
  if (
    continuationDocumentId &&
    !/^[A-Za-z0-9:.\-]{1,30}$/.test(continuationDocumentId)
  ) {
    throw new Error("Invalid Form 8886 continuation document ID");
  }
  if (narrative.continuations.length && !continuationDocumentId) {
    throw new Error(
      "Form 8886 narrative needs its ordered continuation; refusing to truncate",
    );
  }
  if (!narrative.continuations.length && continuationDocumentId) {
    throw new Error("Form 8886 cannot reference an empty continuation");
  }
  const generalRows: { label: string; value: string }[] = [];
  const retainGeneral = (label: string, value: string) => {
    let remaining = value;
    while (remaining.length > 5000) {
      const boundary = remaining.lastIndexOf(" ", 5000);
      if (boundary < 1) {
        throw new Error("Form 8886 continuation word exceeds its native field");
      }
      generalRows.push({ label, value: remaining.slice(0, boundary) });
      remaining = remaining.slice(boundary + 1);
    }
    if (remaining) generalRows.push({ label, value: remaining });
  };
  const nativeValue = (value: string, maximum: number, label: string) => {
    const canonical = value.replace(/\s+/g, " ").trim();
    if (canonical.length <= maximum) return canonical;
    if (!allowGeneralContinuations) {
      throw new Error(
        `Form 8886 ${label} needs an ordered continuation; refusing to truncate`,
      );
    }
    const boundary = canonical.lastIndexOf(" ", maximum);
    if (boundary < 1) {
      throw new Error("Form 8886 field word exceeds its native width");
    }
    retainGeneral(label, canonical.slice(boundary + 1));
    return canonical.slice(0, boundary);
  };
  const nativeText = (
    tag: string,
    value: string | undefined,
    maximum: number,
    label = tag,
  ) =>
    value === undefined ? "" : element(tag, nativeValue(value, maximum, label));
  const partyById = new Map(
    source.parties.map((party) => [party.party_id, party]),
  );
  const party = (id: string): Party => {
    const found = partyById.get(id);
    if (!found) throw new Error("Form 8886 references an undisclosed party");
    return found;
  };
  const benefits = new Set(source.benefits.map((benefit) => benefit.kind));
  const totalBenefit = roundWholeDollars(source.benefits.reduce(
    (total, benefit) => total + benefit.anticipated_amount,
    0,
  ));
  if (totalBenefit > 999_999_999_999_999) {
    throw new Error(
      "Form 8886 total tax benefit exceeds the native amount field",
    );
  }
  const otherDescription = source.benefits.filter((benefit) =>
    benefit.kind === TaxBenefit.Other
  ).map((benefit) => benefit.description).join("; ");
  if (otherDescription.length > 20 && !allowGeneralContinuations) {
    throw new Error(
      "Form 8886 other benefit needs a short native description and continuation",
    );
  }
  const nativeOtherDescription = nativeValue(
    otherDescription,
    20,
    "Line 7a other tax benefits",
  );
  const categoryFields = Object.values(ReportableCategory).map((category) =>
    element(
      categoryTags[category],
      source.categories.includes(category) ? "X" : undefined,
    )
  );
  const benefitFields = [
    ...Object.values(TaxBenefit).filter((benefit) =>
      benefit !== TaxBenefit.Credit
    ),
    TaxBenefit.Credit,
  ].map((benefit) =>
    element(
      benefitTags[benefit],
      benefits.has(benefit) ? "X" : undefined,
      benefit === TaxBenefit.Other
        ? { otherTaxBenefitDesc: nativeOtherDescription }
        : undefined,
    )
  );
  const formBody = [
    element("StatementCnt", statementNumber),
    element("TotalStatementCnt", statementCount),
    element("TaxReturnFormNumberDsc", "1040"),
    element("TaxYearDt", "2025-12"),
    element("AttachedToAmendedReturnInd", "false"),
    element("InitialYearFilerInd", source.initial_year_filer ? "X" : undefined),
    element(
      "ProtectiveDisclosureInd",
      source.protective_disclosure ? "X" : undefined,
    ),
    ...source.transactions.map((transaction, index) => {
      if (
        transaction.reportable_transaction_numbers.length > 1 &&
        !allowGeneralContinuations
      ) {
        throw new Error(
          "Form 8886 multiple RTNs need an additional-list attachment",
        );
      }
      const numbers = transaction.reportable_transaction_numbers;
      const number = numbers[0];
      if (numbers.some((value) => !/^[A-Za-z0-9]{1,22}$/.test(value))) {
        throw new Error(
          "Form 8886 RTN is outside the retained native schema; no workaround applied",
        );
      }
      if (numbers.length > 1) {
        retainGeneral(
          `Line 1c transaction ${
            index + 1
          } additional reportable transaction numbers`,
          numbers.slice(1).join(", "),
        );
      }
      return elements("ReportableTransactionInfo", [
        nativeText(
          "ReportableTransactionDesc",
          transaction.name,
          100,
          `Line 1a transaction ${index + 1} name`,
        ),
        element(
          "InitialParticipatedYr",
          transaction.initial_participation_year,
        ),
        element("TransactionOrTaxShelterNum", number),
      ]);
    }),
    ...categoryFields,
    nativeText(
      "PublishedGuidanceNumberTxt",
      source.published_guidance,
      100,
      "Line 3 published guidance",
    ),
    element("SameOrSimilarTransactionCnt", source.transactions.length),
    ...source.through_entities.map((entity, index) => {
      const involved = party(entity.party_id);
      return elements("TypeOfEntityInformation", [
        element(entityTags[entity.entity_type], "X"),
        element("ForeignInd", involved.foreign ? "X" : undefined),
        elements("EntityName", [
          nativeText(
            "BusinessNameLine1Txt",
            involved.name,
            75,
            `Line 5 entity ${index + 1} name`,
          ),
        ]),
        involved.identity.kind === "ein"
          ? element("EntityEIN", involved.identity.value)
          : "",
        element("ScheduleK1ReceivedDt", entity.k1_received_date),
        element(
          "NoScheduleK1ReceivedCd",
          entity.no_k1_received ? "NONE" : undefined,
        ),
      ]);
    }),
    ...source.fee_recipients.map((recipient, index) => {
      const advisor = party(recipient.party_id);
      return elements("PersonsYouPaidAFeeInfo", [
        nativeText(
          "PersonNm",
          advisor.name,
          35,
          `Line 6 fee recipient ${index + 1} name`,
        ),
        identity(advisor),
        element("FeesPaidAmt", recipient.approximate_fees_paid),
        address(advisor.address),
      ]);
    }),
    ...benefitFields,
    element("TotalTaxBenefitAmt", totalBenefit),
    element(
      "ClmTotTaxBnftAnticipatedYrCnt",
      source.anticipated_benefit_year_count,
    ),
    element("TotalInvestmentOrBasisAmt", source.total_investment_or_basis),
    element(
      "ExpectedTaxBenefitsExplnTxt",
      narrative.initial,
      continuationDocumentId
        ? {
          referenceDocumentId: continuationDocumentId,
          referenceDocumentName:
            "ContinuationOfForm8886ExpectedTaxBenefitsExplanation",
        }
        : undefined,
    ),
    ...source.parties.map((involved, index) =>
      elements("IdentifyAllInvolvedInTr", [
        element("TaxExemptInd", involved.tax_exempt ? "X" : undefined),
        element("ForeignInd", involved.foreign ? "X" : undefined),
        element("RelatedInd", involved.related ? "X" : undefined),
        involved.individual
          ? nativeText(
            "PersonNm",
            involved.name,
            35,
            `Line 8 party ${index + 1} name`,
          )
          : elements("BusinessName", [
            nativeText(
              "BusinessNameLine1Txt",
              involved.name,
              75,
              `Line 8 party ${index + 1} name`,
            ),
          ]),
        identity(involved),
        address(involved.address),
        nativeText(
          "InvolvementDesc",
          [involved.involvement_description, involved.relationship_description]
            .filter((value) => value !== undefined).join(" "),
          1000,
          `Line 8 party ${index + 1} involvement`,
        ),
      ])
    ),
  ];
  const generalContinuations = generalRows.toSorted((a, b) =>
    Number(a.label.charAt(5)) - Number(b.label.charAt(5))
  ).map((row, index) => {
    const documentId = `F8886Other${statementNumber}-${index + 1}`;
    if (!/^[A-Za-z0-9:.\-]{1,30}$/.test(documentId)) {
      throw new Error("Form 8886 general continuation document ID is too long");
    }
    return {
      documentId,
      xml: elements("GeneralDependencySmall", [
        element("SSN", ownerSSN),
        element("FormLineOrInstructionRefTxt", row.label),
        element("AttachmentInformationSmllDesc", row.value),
      ], { documentId }),
    };
  });
  const formXml = elements(
    "IRS8886",
    formBody,
    generalContinuations.length
      ? {
        referenceDocumentId: generalContinuations.map((row) => row.documentId)
          .join(" "),
        referenceDocumentName: "GeneralDependencySmall",
      }
      : undefined,
  );
  return { formXml, generalContinuations };
}
