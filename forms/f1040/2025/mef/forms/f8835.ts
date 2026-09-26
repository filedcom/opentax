import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8835,
  EnergyType,
  type F8835Item,
  inputSchema,
} from "../../../nodes/inputs/f8835/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input =
  & Partial<ReturnType<typeof inputSchema.parse>>
  & Record<string, unknown>;

const productionTags: Readonly<Record<EnergyType, readonly [string, string]>> =
  {
    [EnergyType.Wind]: [
      "KwHrsPrdcdAndSoldWindQty",
      "KwHrsPrdcdAndSoldWindCrAmt",
    ],
    [EnergyType.BiomassClosed]: [
      "KwHrsPrdcdSoldClsLoopBmssQty",
      "KwHrsPrdcdSoldClsLoopBmssCrAmt",
    ],
    [EnergyType.Geothermal]: [
      "KwHrsPrdcdAndSoldGthrmlQty",
      "KwHrsPrdcdAndSoldGthrmlAmt",
    ],
    [EnergyType.Solar]: [
      "KwHrsPrdcdAndSoldSolarQty",
      "KwHrsPrdcdAndSoldSolarCrAmt",
    ],
    [EnergyType.OffshoreWind]: [
      "KwHrsPrdcdSoldOffshrWindQty",
      "KwHrsPrdcdSoldOffshrWindCrAmt",
    ],
    [EnergyType.BiomassOpen]: [
      "KwHrsPrdcdSoldOpenLoopBmssQty",
      "KwHrsPrdcdSoldOpenLopBmssCrAmt",
    ],
    [EnergyType.Landfill]: [
      "KwHrsPrdcdAndSoldLndfllGasQty",
      "KwHrsPrdcdAndSoldLndfllGsCrAmt",
    ],
    [EnergyType.Trash]: [
      "KwHrsPrdcdAndSoldTrashQty",
      "KwHrsPrdcdAndSoldTrashCrAmt",
    ],
    [EnergyType.Hydro]: [
      "KwHrsPrdcdAndSoldHydropowerQty",
      "KwHrsPrdcdAndSoldHydropwrCrAmt",
    ],
    [EnergyType.Marine]: [
      "KwHrsPrdcdSoldMarineRnwblQty",
      "KwHrsPrdcdSoldMarineRnwblCrAmt",
    ],
  };

function coordinate(value: number, digits: 2 | 3): string {
  const sign = value < 0 ? "-" : "+";
  return sign + Math.abs(value).toFixed(6).padStart(digits + 7, "0");
}

function requireAttachment(
  fileName: string | undefined,
  context: MefBuildContext,
  reason: string,
): void {
  if (!fileName || !context.binaryAttachmentFileNames?.includes(fileName)) {
    throw new Error(`Form 8835 ${reason} needs a bundled PDF statement`);
  }
}

function facilityXml(item: F8835Item, context: MefBuildContext): string {
  const address = item.facility_us_address;
  if (
    !item.facility_description || !address ||
    item.facility_latitude === undefined ||
    item.facility_longitude === undefined ||
    item.facility_owned_by_filer === undefined ||
    item.ac_nameplate_kw === undefined
  ) {
    throw new Error(
      "Form 8835 filing needs facility description, address, coordinates, owner answer, and AC nameplate capacity",
    );
  }
  if (
    item.facility_owned_by_filer &&
    (item.facility_owner_person || item.facility_owner_business)
  ) {
    throw new Error(
      "Form 8835 facility owner details conflict with filer ownership",
    );
  }
  if (
    !item.facility_owned_by_filer &&
    Number(Boolean(item.facility_owner_person)) +
          Number(Boolean(item.facility_owner_business)) !== 1
  ) {
    throw new Error(
      "Form 8835 different owner needs one person or business identity",
    );
  }
  if (
    item.energy_type === EnergyType.Solar &&
    item.solar_dc_nameplate_kw === undefined
  ) {
    throw new Error("Form 8835 solar facility needs DC nameplate capacity");
  }
  if (item.is_fiscal_year) {
    throw new Error(
      "Form 8835 fiscal-year production needs separate calendar-year calculations and attachment",
    );
  }
  if (item.increased_credit_reason !== "none") {
    requireAttachment(
      item.increased_credit_statement_file_name,
      context,
      "increased credit",
    );
  }
  if (item.increased_credit_reason === "prevailing_wage_and_apprenticeship") {
    requireAttachment(item.pwa_form7220_file_name, context, "Form 7220");
  }
  if (item.domestic_content_bonus) {
    requireAttachment(
      item.domestic_content_statement_file_name,
      context,
      "domestic-content bonus",
    );
  }

  const lines = calculateForm8835(item);
  const [quantityTag, amountTag] = productionTags[item.energy_type];
  const domesticStatementId = item.domestic_content_statement_file_name
    ? context.documentIdsByAttachmentFileName
      ?.[item.domestic_content_statement_file_name]
    : undefined;
  const domesticAttrs = domesticStatementId
    ? {
      referenceDocumentId: domesticStatementId,
      referenceDocumentName: "BinaryAttachment",
    }
    : undefined;
  const owner = item.facility_owner_person
    ? [
      element("FacilityOwnerPersonNm", item.facility_owner_person.name),
      element("FacilityOwnerSSN", item.facility_owner_person.ssn),
    ]
    : item.facility_owner_business
    ? [
      elements("FacilityOwnerBusinessName", [
        element("BusinessNameLine1Txt", item.facility_owner_business.name),
      ]),
      element("FacilityOwnerEIN", item.facility_owner_business.ein),
    ]
    : [];
  const acTag = item.energy_type === EnergyType.Solar
    ? "ACNameplateCapSolarEgyPropInd"
    : item.energy_type === EnergyType.Wind ||
        item.energy_type === EnergyType.OffshoreWind
    ? "ACNameplateCapWindEgyPropInd"
    : "ACNameplateCapOthEgyPropInd";
  const acAttribute = item.energy_type === EnergyType.Solar
    ? "aCNameplateCapSolarEgyKWQty"
    : item.energy_type === EnergyType.Wind ||
        item.energy_type === EnergyType.OffshoreWind
    ? "aCNameplateCapWindEgyPropKWQty"
    : "aCNameplateCapOthEgyPropKWQty";

  return elements("IRS8835", [
    element("FacilityIRSIssdRegistrationNum", item.registration_number),
    element("FacilityTypeDesc", item.facility_description),
    ...owner,
    elements("FacilityUSAddress", [
      element("AddressLine1Txt", address.line1),
      element("AddressLine2Txt", address.line2),
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ]),
    element("FacilityLatitudeNum", coordinate(item.facility_latitude, 2)),
    element("FacilityLongitudeNum", coordinate(item.facility_longitude, 3)),
    element(
      "FacilityConstructionStartDt",
      item.facility_construction_start_date,
    ),
    element("FacilityPlacedInServiceDt", item.facility_placed_in_service_date),
    item.existing_facility_expansion !== undefined
      ? element(
        "ExistingFacilityExpansionInd",
        String(item.existing_facility_expansion),
      )
      : "",
    item.increased_credit_reason === "under_one_mw"
      ? element("ProjectNetOutputUnder1MWInd", "X")
      : "",
    item.increased_credit_reason === "construction_before_2023_01_29"
      ? element("FcltyConstrBeganBfrSpcfdDtInd", "X")
      : "",
    item.increased_credit_reason === "prevailing_wage_and_apprenticeship"
      ? element("FcltyStsfyWgAprntcshpRqrInd", "X")
      : "",
    item.increased_credit_reason === "none" &&
      item.facility_placed_in_service_date >= "2022-01-01"
      ? element("FacilityRqrNotStsfdInd", "X")
      : "",
    element(
      "PropertyQualifyDomBonusCrInd",
      String(item.domestic_content_bonus),
      domesticAttrs,
    ),
    element("QlfyEgyComBonusCrInd", String(item.energy_community_bonus)),
    item.energy_type === EnergyType.Solar
      ? element("DCSolarEnergyPropCapacityInd", "X", {
        dCSolarEnergyPropCapKWQty: String(item.solar_dc_nameplate_kw),
      })
      : element("NANameplateCapacityDCInd", "X"),
    element(acTag, "X", { [acAttribute]: String(item.ac_nameplate_kw) }),
    element(quantityTag, item.kwh_sold),
    element(amountTag, lines.line1),
    element("TotalForCreditRtUnder45b4AAmt", lines.line2),
    element("CreditBeforeReductionAmt", lines.line4),
    (item.tax_exempt_bond_proceeds ?? 0) > 0
      ? element("CalcTaxExemptBondsPct", lines.line5a.toFixed(2))
      : "",
    (item.tax_exempt_bond_proceeds ?? 0) > 0
      ? element("CreditBeforeReductionFncAmt", lines.line5b)
      : "",
    (item.tax_exempt_bond_proceeds ?? 0) > 0
      ? element("CreditBeforeReductionPctAmt", lines.line5c)
      : "",
    (item.tax_exempt_bond_proceeds ?? 0) > 0
      ? element("SmllrCrBfrReductionFncPctAmt", lines.line5d)
      : "",
    element("AdjustedCreditReductionAmt", lines.line6),
    lines.line7g > 0
      ? element("WindFcltyConstrPhaseOutCrAmt", lines.line7g)
      : "",
    element("NetWindFacilityPercentageAmt", lines.line8),
    element("QualifiedFacilitiesIncrCrAmt", lines.line9),
    element("DomesticContentBonusCreditAmt", lines.line10),
    element("EnergyCommunityBonusCreditAmt", lines.line11),
    element("QlfyFcltsDomCntntEgyComCrAmt", lines.line12),
    element("ElectivePaymentAmt", lines.line13),
    element("TotalAllowedTaxCreditAmt", lines.line15),
  ]);
}

export const form8835: MefFormDescriptor<"f8835", Input, readonly string[]> = {
  pendingKey: "f8835",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8835--2025.pdf",
  build(fields, context = {}) {
    if (!fields.f8835s || fields.f8835s.length === 0) return [];
    return inputSchema.parse(fields).f8835s.map((item) =>
      facilityXml(item, context)
    );
  },
};
