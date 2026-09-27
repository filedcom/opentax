import { element, elements } from "../../../mef/xml.ts";
import {
  type F8283Input,
  FMVMethod,
  inputSchema,
  normalizeSimilarItemGroup,
  type SectionAItem,
  type SectionBItem,
  SectionBPropertyType,
  similarItemGroupTotals,
} from "../../../nodes/inputs/f8283/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

const FMV_METHOD_LABELS: Readonly<Record<FMVMethod, string>> = {
  [FMVMethod.Appraisal]: "Appraisal",
  [FMVMethod.ThriftShopValue]: "Thrift shop value",
  [FMVMethod.CatalogValue]: "Catalog value",
  [FMVMethod.ComparableSales]: "Comparable sales",
  [FMVMethod.Formula]: "Formula",
  [FMVMethod.Other]: "Other",
};

function propertyId(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value--;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  if (result.length > 3) {
    throw new Error("Form 8283 exceeds the three-letter property ID limit");
  }
  return result;
}

function donorLineDetail(item: SectionAItem): string {
  if (
    item.date_acquired !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired)
  ) {
    throw new Error("Form 8283 date acquired must be YYYY-MM-DD");
  }
  return elements("DonorLineDetail", [
    element("ContributionDt", item.date_contributed),
    element("DonorAcquiredDt", item.date_acquired?.slice(0, 7)),
    element("DonorAcquisitionDesc", item.donor_acquisition_description),
    element("DonorCostOrAdjustedBasisAmt", item.cost_or_adjusted_basis),
  ]);
}

export function needsVehicleStatement(item: SectionAItem): boolean {
  return item.is_vehicle === true &&
    (item.deduction_claimed ?? item.fmv ?? 0) > 500;
}

export function needsSectionBVehicleStatement(item: SectionBItem): boolean {
  return item.property_type === SectionBPropertyType.Vehicle;
}

function buildSectionAItem(
  item: SectionAItem,
  index: number,
  statementId?: string,
): string {
  if (item.is_vehicle && !item.vehicle_vin) {
    throw new Error(
      "Form 8283 vehicle needs a VIN",
    );
  }
  if (!item.property_description || item.fmv === undefined) {
    throw new Error(
      `Form 8283 Section A item ${
        index + 1
      } needs a description and fair market value`,
    );
  }
  if (item.fmv_method === FMVMethod.Other && !item.fmv_method_description) {
    throw new Error(
      `Form 8283 Section A item ${
        index + 1
      } needs the fair-market-value method description`,
    );
  }
  const method = item.fmv_method === FMVMethod.Other
    ? item.fmv_method_description
    : item.fmv_method_description ??
      (item.fmv_method && FMV_METHOD_LABELS[item.fmv_method]);
  const address = item.donee_organization_us_address;
  const acknowledgment = item.vehicle_sale_acknowledgment ??
    item.vehicle_needy_transfer_acknowledgment ??
    item.vehicle_significant_use_acknowledgment ??
    item.vehicle_material_improvement_acknowledgment;
  const vehicleDescription = acknowledgment
    ? `${acknowledgment.vehicle_year} ${acknowledgment.vehicle_make} ${acknowledgment.vehicle_model}, ${acknowledgment.vehicle_condition}, ${acknowledgment.odometer_miles} miles`
    : item.property_description;
  return elements("InformationOnDonatedProperty", [
    element("PropertyId", propertyId(index)),
    item.donee_organization_name
      ? elements("DoneeOrganizationName", [
        element("BusinessNameLine1Txt", item.donee_organization_name),
      ])
      : "",
    address
      ? elements("DoneeOrganizationUSAddress", [
        element("AddressLine1Txt", address.line1),
        element("AddressLine2Txt", address.line2),
        element("CityNm", address.city),
        element("StateAbbreviationCd", address.state),
        element("ZIPCd", address.zip),
      ])
      : "",
    item.is_vehicle
      ? element(
        "DonatedPropertyVehicleInd",
        "X",
        statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName:
              "ContributionsOfMotorVehiclesBoatsAndAirplanesStatement ContemporaneousWrittenAcknowledgmentStatement",
          }
          : undefined,
      )
      : "",
    item.is_vehicle ? element("VIN", item.vehicle_vin) : "",
    element("DonatedPropertyDesc", vehicleDescription),
    donorLineDetail(item),
    element("FairMarketValueAmt", item.fmv),
    element("FairMarketValueMethodDesc", method),
  ]);
}

export function buildVehicleStatement(
  item: Pick<
    SectionAItem,
    | "date_contributed"
    | "vehicle_vin"
    | "vehicle_sale_acknowledgment"
    | "vehicle_needy_transfer_acknowledgment"
    | "vehicle_significant_use_acknowledgment"
    | "vehicle_material_improvement_acknowledgment"
  >,
  context: MefBuildContext,
): string {
  const saleAck = item.vehicle_sale_acknowledgment;
  const needyAck = item.vehicle_needy_transfer_acknowledgment;
  const useAck = item.vehicle_significant_use_acknowledgment;
  const improvementAck = item.vehicle_material_improvement_acknowledgment;
  const ack = saleAck ?? needyAck ?? useAck ?? improvementAck;
  if (!ack || !item.vehicle_vin || !item.date_contributed) {
    throw new Error(
      "Form 8283 vehicle needs a contemporaneous donee acknowledgment",
    );
  }
  return elements("ContriVehicleBoatAirplaneStmt", [
    elements("DoneeName", [
      element("BusinessNameLine1Txt", ack.donee_name),
    ]),
    usAddress(ack.donee_us_address, "DoneeUSAddress"),
    element("DoneeEIN", ack.donee_ein),
    element("DonorSSN", context.filer?.primarySSN),
    element("ContributionDt", item.date_contributed),
    element("OdometerMileageQty", ack.odometer_miles),
    elements("VehicleDescriptionGrp", [
      element("VehicleModelYr", ack.vehicle_year),
      element("VehicleMakeNameTxt", ack.vehicle_make),
      element("VehicleModelNameTxt", ack.vehicle_model),
    ]),
    element("VIN", item.vehicle_vin),
    saleAck ? element("CertifiesVehSoldToUnrltPrtyInd", "X") : "",
    saleAck ? element("SaleDt", saleAck.sale_date) : "",
    saleAck
      ? element("GrossProceedsFromSaleOfVehAmt", saleAck.gross_proceeds)
      : "",
    useAck || improvementAck
      ? element("CertifiesVehicleNotTrnsfrInd", "X")
      : "",
    needyAck ? element("CertifiesVehTrnsfrToNeedyInd", "X") : "",
    useAck
      ? element(
        "CertifiesDetailedImprvDesc",
        `${useAck.intended_use_description}; intended duration: ${useAck.intended_use_duration}`,
      )
      : improvementAck
      ? element(
        "CertifiesDetailedImprvDesc",
        improvementAck.intended_improvement_description,
      )
      : "",
    element("GoodsAndServicesInd", "false"),
  ]);
}

const SECTION_B_PROPERTY_TAG: Readonly<Record<SectionBPropertyType, string>> = {
  [SectionBPropertyType.ArtUnder20000]: "ArtWorthLssThan20000DollarsInd",
  [SectionBPropertyType.ArtAtLeast20000]: "ArtWorthAtLeast20000DollarsInd",
  [SectionBPropertyType.OtherRealEstate]: "OtherRealEstateInd",
  [SectionBPropertyType.Equipment]: "EquipmentInd",
  [SectionBPropertyType.Securities]: "SecuritiesInd",
  [SectionBPropertyType.Collectibles]: "CollectiblesInd",
  [SectionBPropertyType.IntellectualProperty]: "IntellectualPropertyInd",
  [SectionBPropertyType.Vehicle]: "VehicleInd",
  [SectionBPropertyType.ClothingHousehold]: "ClothingHouseholdItemsInd",
  [SectionBPropertyType.DigitalAssets]: "DigitalAssetsInd",
  [SectionBPropertyType.Other]: "OtherInd",
};

function usAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}, tag: string): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip),
  ]);
}

const BINARY_REFERENCE_NAME =
  "BinaryAttachment DeductionsTakenUnderSection170Stmt DoneesSignatureUnavailableStmt";

function requiredVehicleAttachment(
  item: { vehicle_acknowledgment_attachment_file_name?: string },
  context: MefBuildContext,
): { fileName: string; id?: string } {
  const fileName = item.vehicle_acknowledgment_attachment_file_name;
  if (!fileName) {
    throw new Error(
      "Form 8283 vehicle needs its donee-issued Form 1098-C or written acknowledgment PDF",
    );
  }
  const description = context.attachmentDescriptionsByFileName?.[fileName];
  if (
    description === undefined ||
    !/^(?:Form1098C|DoneeOrganizationContemporaneousWrittenAcknowledgment)/
      .test(description)
  ) {
    throw new Error(
      "Form 8283 vehicle attachment needs an IRS-approved description and matching PDF",
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 vehicle acknowledgment PDF has no linked MeF document",
    );
  }
  return { fileName, id };
}

function requiredSignatureAttachment(
  fileName: string | undefined,
  description: string,
  context: MefBuildContext,
): string | undefined {
  if (!fileName) {
    throw new Error(`Form 8283 needs ${description} PDF`);
  }
  if (context.attachmentDescriptionsByFileName?.[fileName] !== description) {
    throw new Error(
      `Form 8283 needs a matching PDF described exactly as ${description}`,
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(`Form 8283 ${description} PDF has no linked MeF document`);
  }
  return id;
}

function requiredQualifiedAppraisalAttachment(
  fileName: string | undefined,
  context: MefBuildContext,
): string | undefined {
  if (!fileName) {
    throw new Error(
      "Form 8283 deduction above $500,000 needs the full qualified-appraisal PDF",
    );
  }
  const description = context.attachmentDescriptionsByFileName?.[fileName];
  if (!description?.startsWith("Qualified Appraisal")) {
    throw new Error(
      "Form 8283 high-value appraisal PDF needs a description beginning Qualified Appraisal",
    );
  }
  const id = context.documentIdsByAttachmentFileName?.[fileName];
  if (context.documentIdsByPendingKey && !id) {
    throw new Error(
      "Form 8283 high-value appraisal PDF has no linked MeF document",
    );
  }
  return id;
}

function buildSectionBItem(
  item: SectionBItem,
  index: number,
  similarGroupTotal: number,
  context: MefBuildContext,
  vehicleStatementId?: string,
  vehicleAttachmentId?: string,
): string {
  if (
    !item.property_description || !item.property_type ||
    !item.date_acquired || !/^\d{4}-\d{2}-\d{2}$/.test(item.date_acquired) ||
    !item.donor_acquisition_description ||
    item.cost_or_adjusted_basis === undefined ||
    !item.date_contributed ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date_contributed) ||
    !item.qualified_appraisal || !item.donee_acknowledgment
  ) {
    throw new Error(
      `Form 8283 Section B item ${
        index + 1
      } needs property, acquisition, qualified appraisal, and signed donee facts`,
    );
  }
  if (similarGroupTotal <= 5_000) {
    throw new Error(
      "Form 8283 Section B ordinary gift needs a claimed deduction above $5,000 for the item or similar-item group",
    );
  }
  if (
    item.property_type === SectionBPropertyType.ArtUnder20000 &&
    item.fmv >= 20_000
  ) {
    throw new Error(
      "Form 8283 art valued at $20,000 needs its appraisal attachment",
    );
  }
  if (
    item.property_type === SectionBPropertyType.ClothingHousehold &&
    item.good_used_condition_confirmed !== true
  ) {
    throw new Error(
      "Form 8283 clothing or household property needs verified good condition or an appraisal attachment",
    );
  }
  const tangible = new Set<SectionBPropertyType>([
    SectionBPropertyType.ArtUnder20000,
    SectionBPropertyType.OtherRealEstate,
    SectionBPropertyType.Equipment,
    SectionBPropertyType.Collectibles,
    SectionBPropertyType.Vehicle,
    SectionBPropertyType.ClothingHousehold,
  ]);
  if (tangible.has(item.property_type) && !item.physical_condition?.trim()) {
    throw new Error("Form 8283 tangible property needs its physical condition");
  }
  if (item.property_type === SectionBPropertyType.ArtAtLeast20000) {
    throw new Error(
      "Form 8283 Section B gift needs a linked appraisal or vehicle acknowledgment attachment",
    );
  }
  if (item.donee_acknowledgment.received_date !== item.date_contributed) {
    throw new Error(
      "Form 8283 Section B donee receipt date differs from contribution date",
    );
  }
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  const appraiserId = requiredSignatureAttachment(
    appraisal.signature_attachment_file_name,
    "Form 8283 appraiser signature document",
    context,
  );
  const doneeId = requiredSignatureAttachment(
    donee.signature_attachment_file_name,
    "Form 8283 Donee signature document",
    context,
  );
  const signatureIds = [appraiserId, doneeId].filter(
    (id): id is string => id !== undefined,
  );
  const qualifiedAppraisalId = similarGroupTotal > 500_000
    ? requiredQualifiedAppraisalAttachment(
      appraisal.attachment_file_name,
      context,
    )
    : undefined;
  const binaryIds = [vehicleAttachmentId, qualifiedAppraisalId, ...signatureIds]
    .filter(
      (id): id is string => id !== undefined,
    );
  return elements(
    "IRS8283",
    [
      element(SECTION_B_PROPERTY_TAG[item.property_type], "X"),
      elements(
        "PropertyInformation",
        [
          element("PropertyId", propertyId(0)),
          element("DonatedPropertyDesc", item.property_description),
          element("DonatedPropertyPhysicalCondTxt", item.physical_condition),
          element("AppraisedFairMarketValueAmt", item.fmv),
          element("DonorAcquiredDt", item.date_acquired.slice(0, 7)),
          element("DonorAcquisitionDesc", item.donor_acquisition_description),
          element("DonorCostOrAdjustedBasisAmt", item.cost_or_adjusted_basis),
          element("DeductionClaimedAmt", item.deduction_claimed),
        ],
        vehicleStatementId
          ? {
            referenceDocumentId: vehicleStatementId,
            referenceDocumentName:
              "ContemporaneousWrittenAcknowledgmentStatement ContributionsOfMotorVehiclesBoatsAndAirplanesStatement",
          }
          : undefined,
      ),
      elements("AppraiserName", [
        element("PersonFirstNm", appraisal.appraiser_first_name),
        element("PersonLastNm", appraisal.appraiser_last_name),
      ]),
      element("AppraiserSignedDt", appraisal.signed_date),
      usAddress(appraisal.us_address, "AppraiserUSAddress"),
      element(
        appraisal.appraiser_ein ? "AppraiserEIN" : "AppraiserSSN",
        appraisal.appraiser_ein ?? appraisal.appraiser_ssn,
      ),
      element("ReceivedDt", donee.received_date),
      element(
        "UsePropertyForUnrelatedUseInd",
        donee.unrelated_use ? "true" : "false",
      ),
      elements("DoneeName", [
        element("BusinessNameLine1Txt", donee.organization_name),
      ]),
      element("DoneeEIN", donee.ein),
      usAddress(donee.us_address, "DoneeUSAddress"),
    ],
    binaryIds.length > 0
      ? {
        referenceDocumentId: binaryIds.join(" "),
        referenceDocumentName: BINARY_REFERENCE_NAME,
      }
      : undefined,
  );
}

export const form8283: MefFormDescriptor<
  "f8283",
  F8283Input,
  readonly string[]
> = {
  pendingKey: "f8283",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8283.pdf",
  build(fields, context = {}) {
    const parsed = inputSchema.parse(fields);
    const sectionA = parsed.section_a_items ?? [];
    const sectionB = parsed.section_b_items ?? [];
    const similarGroupTotals = similarItemGroupTotals(parsed);
    const sectionAVehicleAttachments = sectionA.filter(needsVehicleStatement)
      .map((item) => requiredVehicleAttachment(item, context));
    const sectionBVehicleAttachments = sectionB
      .filter(needsSectionBVehicleStatement)
      .map((item) => requiredVehicleAttachment(item, context));
    const sectionAAttachmentIds = [
      ...new Set(
        sectionAVehicleAttachments.map((attachment) => attachment.id),
      ),
    ].filter((id): id is string => id !== undefined);
    const sectionBAttachmentIdsByFileName = Object.fromEntries(
      sectionBVehicleAttachments.map((attachment) => [
        attachment.fileName,
        attachment.id,
      ]),
    );
    const statementIds = context.documentIdsByPendingKey
      ?.form8283_vehicle_statement ?? [];
    const requiredStatements = sectionAVehicleAttachments.length +
      sectionBVehicleAttachments.length;
    if (
      context.documentIdsByPendingKey &&
      statementIds.length !== requiredStatements
    ) {
      throw new Error(
        "Form 8283 vehicle statement count does not match linked documents",
      );
    }
    let nextStatement = 0;
    return [
      ...(sectionA.length > 0
        ? [elements(
          "IRS8283",
          sectionA.map((item, index) =>
            buildSectionAItem(
              item,
              index,
              needsVehicleStatement(item)
                ? statementIds[nextStatement++]
                : undefined,
            )
          ),
          sectionAAttachmentIds.length > 0
            ? {
              referenceDocumentId: sectionAAttachmentIds.join(" "),
              referenceDocumentName: BINARY_REFERENCE_NAME,
            }
            : undefined,
        )]
        : []),
      ...sectionB.map((item, index) =>
        buildSectionBItem(
          item,
          index,
          item.similar_item_group
            ? similarGroupTotals.get(
              normalizeSimilarItemGroup(item.similar_item_group),
            ) ?? item.deduction_claimed
            : item.deduction_claimed,
          context,
          needsSectionBVehicleStatement(item)
            ? statementIds[nextStatement++]
            : undefined,
          item.vehicle_acknowledgment_attachment_file_name
            ? sectionBAttachmentIdsByFileName[
              item.vehicle_acknowledgment_attachment_file_name
            ]
            : undefined,
        )
      ),
    ];
  },
};
