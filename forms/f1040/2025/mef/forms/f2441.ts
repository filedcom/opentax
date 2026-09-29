import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm2441,
  filingDetailsSchema,
  type Form2441FilingDetails,
} from "../../../nodes/intermediate/forms/form2441/calculation.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  dep_care_benefits?: number | null;
  agi?: number | null;
  filing_details?: Form2441FilingDetails | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [];

const HEADER_STATUS: Readonly<Record<NodeFilingStatus, HeaderFilingStatus>> = {
  [NodeFilingStatus.Single]: HeaderFilingStatus.Single,
  [NodeFilingStatus.MFJ]: HeaderFilingStatus.MarriedFilingJointly,
  [NodeFilingStatus.MFS]: HeaderFilingStatus.MarriedFilingSeparately,
  [NodeFilingStatus.HOH]: HeaderFilingStatus.HeadOfHousehold,
  [NodeFilingStatus.QSS]: HeaderFilingStatus.QualifyingSurvivingSpouse,
};

function usAddress(
  address: Form2441FilingDetails["care_providers"][number]["us_address"],
): string {
  return elements("USAddress", [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip.replaceAll("-", "")),
  ]);
}

function careProvider(
  provider: Form2441FilingDetails["care_providers"][number],
): string {
  const name = provider.kind === "person"
    ? [
      elements("CareProviderPersonName", [
        element("PersonFirstNm", provider.first_name),
        element("PersonLastNm", provider.last_name),
      ]),
      element("CareProviderNameControlTxt", provider.name_control),
    ]
    : [
      elements("CareProviderBusinessName", [
        element("BusinessNameLine1Txt", provider.name),
      ]),
      element("CareProviderBusNameControlTxt", provider.name_control),
    ];
  return elements("CareProviderGrp", [
    ...name,
    usAddress(provider.us_address),
    element(
      provider.kind === "person" ? "SSN" : "EIN",
      provider.kind === "person" ? provider.ssn : provider.ein,
    ),
    element("HouseholdEmployeeInd", String(provider.household_employee)),
    element("PaidAmt", provider.amount_paid),
  ]);
}

function qualifyingPerson(
  person: Form2441FilingDetails["qualifying_people"][number],
): string {
  return elements("QualifyingPersonGrp", [
    elements("QualifyingPersonName", [
      element("PersonFirstNm", person.first_name),
      element("PersonLastNm", person.last_name),
    ]),
    element("QualifyingPersonNameControlTxt", person.name_control),
    element("QualifyingPersonSSN", person.ssn),
    person.over_12_and_disabled
      ? element("PrsnOverSpcfdAgeAndDisabledInd", "X")
      : "",
    element("QualifiedCareExpensesPaidAmt", person.credit_expenses_paid),
  ]);
}

function buildIRS2441(fields: Input, context?: MefBuildContext): string {
  const legacyInput = context?.pending?.f2441;
  const legacyItems = legacyInput && typeof legacyInput === "object" &&
      "f2441s" in legacyInput && Array.isArray(legacyInput.f2441s)
    ? legacyInput.f2441s
    : [];
  if (
    !fields.filing_details &&
    legacyItems.some((item) =>
      item && typeof item === "object" &&
      (Number(item.qualifying_expenses_paid ?? 0) > 0 ||
        Number(item.employer_dep_care_benefits ?? 0) > 0)
    )
  ) {
    throw new Error(
      "Form 2441 aggregate inputs cannot be e-filed without provider and person details",
    );
  }
  if (Array.isArray(fields) && fields.length === 0) return "";
  if (Object.keys(fields).length === 0) return "";
  if (!fields.filing_details) {
    if (!fields.dep_care_benefits) return "";
    throw new Error(
      "Form 2441 MeF needs care-provider and qualifying-person filing details",
    );
  }
  const return1040 = context?.pending?.f1040;
  const returnAgi = return1040 && typeof return1040 === "object" &&
      "line11_agi" in return1040
    ? return1040.line11_agi
    : undefined;
  if (
    typeof returnAgi === "number" && typeof fields.agi === "number" &&
    returnAgi !== fields.agi
  ) {
    throw new Error("Form 2441 AGI differs from Form 1040 line 11");
  }
  const agi = typeof returnAgi === "number" ? returnAgi : fields.agi;
  if (agi === null || agi === undefined) {
    throw new Error("Form 2441 MeF needs calculated AGI");
  }
  const details = filingDetailsSchema.parse(fields.filing_details);
  if (
    details.care_providers.length > 3 || details.qualifying_people.length > 3
  ) {
    throw new Error(
      "Form 2441 more than three providers or qualifying people needs an attached statement",
    );
  }
  if (
    context?.filer?.filingStatus !== undefined &&
    HEADER_STATUS[details.filing_status] !== context.filer.filingStatus
  ) {
    throw new Error("Form 2441 filing status differs from return header");
  }
  const lines = calculateForm2441(
    details,
    agi,
    fields.dep_care_benefits ?? 0,
  );
  const schedule3 = context?.pending?.schedule3;
  const schedule3Credit = schedule3 && typeof schedule3 === "object" &&
      "line2_childcare_credit" in schedule3
    ? schedule3.line2_childcare_credit
    : undefined;
  if (
    schedule3Credit !== undefined && schedule3Credit !== lines.line11
  ) {
    throw new Error("Form 2441 credit differs from Schedule 3 line 2");
  }
  const returnTaxableBenefits = return1040 &&
      typeof return1040 === "object" &&
      "line1e_taxable_dep_care" in return1040
    ? return1040.line1e_taxable_dep_care
    : undefined;
  if (
    returnTaxableBenefits !== undefined &&
    returnTaxableBenefits !== lines.line26
  ) {
    throw new Error("Form 2441 taxable benefits differ from Form 1040 line 1e");
  }
  const hasBenefits = lines.line15 > 0 || lines.line12 > 0;
  return elements("IRS2441", [
    details.mfs_eligibility_met
      ? element("EligibilityRequirementMetInd", "X")
      : "",
    details.student_or_disabled_deemed_income_used
      ? element("StudentOrDisabledInd", "X")
      : "",
    ...details.care_providers.map(careProvider),
    ...details.qualifying_people.map(qualifyingPerson),
    element("TotalQlfdExpensesOrLimitAmt", lines.line3),
    element("PrimaryEarnedIncomeAmt", lines.line4),
    element("SpouseEarnedIncomeAmt", lines.line5),
    element("SmallerOfExpensesOrIncomeAmt", lines.line6),
    element("AdjustedGrossIncomeAmt", lines.line7),
    element("CareExpensesDecimalAmt", `.${Math.round(lines.line8 * 100)}`),
    element("CalculatedTentativeExpenseAmt", lines.line9a),
    element("TotalEligCDCCAmt", lines.line9a),
    element("TaxLiabLmtFromCrLmtWrkshtAmt", lines.line10),
    element("CreditForChildAndDepdCareAmt", lines.line11),
    hasBenefits ? element("DependentCareBenefitsAmt", lines.line12) : "",
    hasBenefits ? element("CarryoverAmt", lines.line13) : "",
    hasBenefits ? element("ForfeitedAmt", lines.line14) : "",
    hasBenefits ? element("AdjustedDepdCareBenefitsAmt", lines.line15) : "",
    hasBenefits ? element("QualifiedExpensesAmt", lines.line16) : "",
    hasBenefits ? element("SmallerOfAdjOrQualifiedAmt", lines.line17) : "",
    hasBenefits ? element("EarnedIncomeAmt", lines.line18) : "",
    hasBenefits ? element("SpouseIncomeAmt", lines.line19) : "",
    hasBenefits ? element("TentativeExclusionAmt", lines.line20) : "",
    hasBenefits ? element("SpecifiedAmt", lines.line21) : "",
    hasBenefits ? element("SolePropshpPrtshpAmt", 0) : "",
    hasBenefits ? element("PropshpPrtshpLessAdjBnftAmt", lines.line23) : "",
    hasBenefits ? element("DeductibleBenefitsAmt", 0) : "",
    hasBenefits ? element("ExcludedBenefitsAmt", lines.line25) : "",
    hasBenefits ? element("TaxableBenefitsAmt", lines.line26) : "",
    hasBenefits ? element("AllowedCaredForAmt", lines.line27) : "",
    hasBenefits ? element("SumOfDedAndExcludedBenefitsAmt", lines.line28) : "",
    hasBenefits ? element("NetAllowableAmt", lines.line29) : "",
    hasBenefits ? element("TotalQualifiedExpensesAmt", lines.line30) : "",
    hasBenefits ? element("SmallerOfTotalQlfyExpensesAmt", lines.line31) : "",
  ]);
}

export const form2441: MefFormDescriptor<"form2441", Input> = {
  pendingKey: "form2441",
  sourcePendingKeys: ["form2441", "f2441"],
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2441.pdf",
  build: buildIRS2441,
};
