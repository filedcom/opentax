import { element, elements } from "../../../mef/xml.ts";
import {
  calculatePhysicalPresence2555,
  type PhysicalPresenceFiling,
  physicalPresenceFilingSchema,
} from "../../../nodes/intermediate/forms/form2555/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  filing_details?: PhysicalPresenceFiling | null;
  foreign_wages?: number | null;
  foreign_self_employment_income?: number | null;
  days_in_foreign_country?: number | null;
  foreign_housing_expenses?: number | null;
  employer_housing_exclusion?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [];

function foreignAddress(
  tag: string,
  address: PhysicalPresenceFiling["foreign_address"],
): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("ProvinceOrStateNm", address.province_or_state),
    element("CountryCd", address.country_code),
    element("ForeignPostalCd", address.postal_code),
  ]);
}

function buildIRS2555(fields: Input, context?: MefBuildContext): string {
  if (Array.isArray(fields) && fields.length === 0) return "";
  if (Object.keys(fields).length === 0) return "";
  if (!fields.filing_details) {
    if (
      fields.foreign_wages === undefined &&
      fields.foreign_self_employment_income === undefined &&
      fields.foreign_housing_expenses === undefined &&
      fields.employer_housing_exclusion === undefined
    ) return "";
    throw new Error(
      "Form 2555 aggregate inputs cannot be e-filed without physical-presence filing details",
    );
  }
  if (
    fields.foreign_wages !== undefined ||
    fields.foreign_self_employment_income !== undefined ||
    fields.days_in_foreign_country !== undefined ||
    fields.foreign_housing_expenses !== undefined ||
    fields.employer_housing_exclusion !== undefined
  ) {
    throw new Error(
      "Form 2555 filing details cannot be mixed with aggregate inputs",
    );
  }
  const filer = context?.filer;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 2555 needs the taxpayer's name and SSN");
  }
  const filing = physicalPresenceFilingSchema.parse(fields.filing_details);
  const lines = calculatePhysicalPresence2555(filing, 2025);
  const schedule1 = context?.pending?.schedule1;
  const schedule1Exclusion = schedule1 && typeof schedule1 === "object" &&
      "line8d_foreign_earned_income_exclusion" in schedule1
    ? schedule1.line8d_foreign_earned_income_exclusion
    : undefined;
  if (schedule1Exclusion !== lines.line45) {
    throw new Error("Form 2555 exclusion differs from Schedule 1 line 8d");
  }
  const return1040 = context?.pending?.f1040;
  const reportedWages = return1040 && typeof return1040 === "object" &&
      "line1h_other_earned" in return1040
    ? return1040.line1h_other_earned
    : undefined;
  if (reportedWages !== lines.line19) {
    throw new Error("Form 2555 wages differ from Form 1040 line 1h");
  }
  return elements("IRS2555", [
    element("NameLine1Txt", filer.nameLine1),
    element("SSN", filer.primarySSN.replaceAll("-", "")),
    foreignAddress("ForeignAddress", filing.foreign_address),
    element("OccupationTxt", filing.occupation),
    elements("EmployerName", [
      element("BusinessNameLine1Txt", filing.employer_name),
    ]),
    foreignAddress("EmployerForeignAddress", filing.employer_foreign_address),
    element("EmployerForeignEntityInd", "X"),
    element("NoFrgnEarnIncExclPrevFiledInd", "X"),
    element("ForeignEarnIncExclRevokedInd", "false"),
    element("CitizenCountryNm", filing.citizenship_country),
    element("SeparateForeignResidenceInd", "false"),
    elements("TaxHomeGroup", [
      element("TaxHomeDesc", filing.tax_home_description),
      element("EstablishedDt", filing.tax_home_established_date),
    ]),
    element("EmploymentContractTermsDesc", filing.employment_contract_terms),
    element("VisaTypeDesc", filing.visa_type),
    element("VisaLimitStayOrEmploymentInd", "false"),
    element("MaintainedHouseInUSInd", "false"),
    elements("TaxpayerPhysicalPresenceGrp", [
      element("PhysicalPresenceBeginDt", filing.physical_presence_begin),
      element("PhysicalPresenceEndDt", filing.physical_presence_end),
    ]),
    element(
      "PrincipalEmploymentCountryNm",
      filing.principal_employment_country,
    ),
    element(
      "NoTravelExplanationCd",
      "PHYSICALLY PRESENT IN A FOREIGN COUNTRY OR COUNTRIES FOR THE ENTIRE 12-MONTH PERIOD",
    ),
    element("ForeignEarnedTotalWagesIncAmt", lines.line19),
    element("TotalForeignEarnedIncomeAmt", lines.line24),
    element("TotalForeignEarnedIncmExclAmt", lines.line25),
    element("ForeignEarnedIncomeAmt", lines.line26),
    element(
      "ClaimingHousingExclOrDedInd",
      filing.claiming_housing_exclusion_or_deduction ? "true" : "false",
    ),
    ...(filing.employee_housing
      ? [
        element("HousingQualifiedExpenseAmt", lines.line28),
        ...(lines.line29a
          ? [element("HousingExpenseLocationDesc", lines.line29a)]
          : []),
        element("HousingExpenseLimitAmt", lines.line29b),
        element("SmallerQualifiedOrLimitAmt", lines.line30),
        element("HousingQualifiedDaysCnt", lines.line31),
        element("HousingMaximumAllowedAmt", lines.line32),
        element("HousingExpensesOverMaxAmt", lines.line33),
        ...(lines.line33 > 0
          ? [
            element("EmployerProvidedHousingAmt", lines.line34),
            element("EmployerProvHousingExclPct", lines.line35.toFixed(5)),
            element("HousingExclusionAmt", lines.line36),
          ]
          : []),
      ]
      : []),
    element("ForeignEarnIncmExclQlfyDaysCnt", lines.line38),
    element("ForeignEarnedIncExclusionPct", lines.line39.toFixed(5)),
    element("TentForeignEarnedIncomeExclAmt", lines.line40),
    element("ForeignIncLessHousingExclAmt", lines.line41),
    element("ForeignEarnedIncExclusionAmt", lines.line42),
    element("TentativeIncomeExclusionAmt", lines.line43),
    element("DeductionAllocToExcludedIncAmt", lines.line44),
    element("TotalIncomeExclusionAmt", lines.line45),
  ]);
}

export const form2555: MefFormDescriptor<"form2555", Input> = {
  pendingKey: "form2555",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2555.pdf",
  build: buildIRS2555,
};
