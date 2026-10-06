import { form4852NativeSources } from "../../form4852_native_source.ts";
import { element, elements } from "../../../mef/xml.ts";
import type { W2Item } from "../../../nodes/inputs/w2/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { FilingStatus } from "../types.ts";

interface Fields {
  readonly w2s?: readonly W2Item[];
}

const REQUIRED_EMPLOYER_FIELDS = [
  "employer_ein",
  "employer_name",
  "employer_address_line1",
  "employer_address_city",
  "employer_address_state",
  "employer_address_zip",
] as const satisfies readonly (keyof W2Item)[];

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function employerNameControl(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function requiredEmployerValue(
  item: W2Item,
  key: typeof REQUIRED_EMPLOYER_FIELDS[number],
  index: number,
): string {
  const value = item[key];
  if (typeof value === "string" && value.trim() !== "") return value;
  throw new Error(`W-2 ${index + 1} cannot be exported to MeF without ${key}`);
}

function employeeIdentity(
  item: W2Item,
  context: MefBuildContext,
  index: number,
): { readonly ssn: string; readonly name: string } {
  const filer = context.filer;
  if (!filer) {
    throw new Error(
      `W-2 ${index + 1} cannot be exported to MeF without filer identity`,
    );
  }

  const requestedSsn = digits(item.employee_ssn ?? filer.primarySSN);
  const spouseSsn = filer.spouse ? digits(filer.spouse.ssn) : undefined;
  if (spouseSsn === requestedSsn && filer.spouse) {
    if (filer.filingStatus !== FilingStatus.MarriedFilingJointly) {
      throw new Error(
        `W-2 ${index + 1} spouse wages require a joint Form 1040`,
      );
    }
    return {
      ssn: requestedSsn,
      name: [
        filer.spouse.firstName,
        filer.spouse.middleInitial,
        filer.spouse.lastName,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (requestedSsn !== digits(filer.primarySSN)) {
    throw new Error(
      `W-2 ${index + 1} employee SSN must match the taxpayer or joint spouse`,
    );
  }

  return {
    ssn: requestedSsn,
    name: filer.fullName ?? filer.nameLine1,
  };
}

function buildEmployerAddress(item: W2Item, index: number): string {
  return elements("EmployerUSAddress", [
    element(
      "AddressLine1Txt",
      requiredEmployerValue(item, "employer_address_line1", index),
    ),
    element("AddressLine2Txt", item.employer_address_line2),
    element(
      "CityNm",
      requiredEmployerValue(item, "employer_address_city", index),
    ),
    element(
      "StateAbbreviationCd",
      requiredEmployerValue(item, "employer_address_state", index),
    ),
    element(
      "ZIPCd",
      requiredEmployerValue(item, "employer_address_zip", index),
    ),
  ]);
}

function buildEmployeeAddress(context: MefBuildContext, index: number): string {
  const address = context.filer?.address;
  if (!address?.line1 || !address.city || !address.state || !address.zip) {
    throw new Error(
      `W-2 ${
        index + 1
      } cannot be exported to MeF without the filer's US address`,
    );
  }
  return elements("EmployeeUSAddress", [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip),
  ]);
}

function optionalAmount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function buildW2(
  item: W2Item,
  context: MefBuildContext,
  index: number,
): string {
  if (
    item.nonstandard_document_review &&
    item.source_document_reference !==
      item.nonstandard_document_review.source_document_reference
  ) {
    throw new Error(
      "Nonstandard W-2 review must match the retained issued-copy reference",
    );
  }
  const enteredEmployerEin = requiredEmployerValue(item, "employer_ein", index);
  if (!/^\d{2}-?\d{7}$/.test(enteredEmployerEin)) {
    throw new Error(`W-2 ${index + 1} MeF employer EIN must be nine digits`);
  }
  const employerEin = digits(enteredEmployerEin);
  const employerName = requiredEmployerValue(item, "employer_name", index);
  const employee = employeeIdentity(item, context, index);

  return elements("IRSW2", [
    element("EmployeeSSN", employee.ssn),
    element("EmployerEIN", employerEin),
    element("EmployerNameControlTxt", employerNameControl(employerName)),
    elements("EmployerName", [element("BusinessNameLine1Txt", employerName)]),
    buildEmployerAddress(item, index),
    element("EmployeeNm", employee.name),
    buildEmployeeAddress(context, index),
    element("WagesAmt", item.box1_wages),
    element("WithholdingAmt", item.box2_fed_withheld),
    optionalAmount("SocialSecurityWagesAmt", item.box3_ss_wages),
    optionalAmount("SocialSecurityTaxAmt", item.box4_ss_withheld),
    optionalAmount("MedicareWagesAndTipsAmt", item.box5_medicare_wages),
    optionalAmount("MedicareTaxWithheldAmt", item.box6_medicare_withheld),
    optionalAmount("SocialSecurityTipsAmt", item.box7_ss_tips),
    optionalAmount("AllocatedTipsAmt", item.box8_allocated_tips),
    optionalAmount("DependentCareBenefitsAmt", item.box10_dep_care),
    optionalAmount("NonqualifiedPlansAmt", item.box11_nonqual_plans),
    ...(item.box12_entries ?? []).map(({ code, amount }) =>
      elements("EmployersUseGrp", [
        element("EmployersUseCd", code),
        element("EmployersUseAmt", amount),
      ])
    ),
    item.box13_statutory_employee === true
      ? element("StatutoryEmployeeInd", "X")
      : "",
    item.box13_retirement_plan === true
      ? element("RetirementPlanInd", "X")
      : "",
    item.box13_third_party_sick === true
      ? element("ThirdPartySickPayInd", "X")
      : "",
    ...(item.box14_entries ?? []).map(({ description, amount }) =>
      elements("OtherDeductionsBenefitsGrp", [
        element("Desc", description),
        element("Amt", amount),
      ])
    ),
    [
        item.box15_state,
        item.box16_state_wages,
        item.box17_state_withheld,
        item.box18_local_wages,
        item.box19_local_withheld,
        item.box20_locality_name,
      ]
        .some((value) => value !== undefined)
      ? elements("W2StateLocalTaxGrp", [elements("W2StateTaxGrp", [
        element("StateAbbreviationCd", item.box15_state),
        optionalAmount("StateWagesAmt", item.box16_state_wages),
        optionalAmount("StateIncomeTaxAmt", item.box17_state_withheld),
        [
            item.box18_local_wages,
            item.box19_local_withheld,
            item.box20_locality_name,
          ]
            .some((value) => value !== undefined)
          ? elements("W2LocalTaxGrp", [
            optionalAmount("LocalWagesAndTipsAmt", item.box18_local_wages),
            optionalAmount("LocalIncomeTaxAmt", item.box19_local_withheld),
            element("LocalityNm", item.box20_locality_name),
          ])
          : "",
      ])])
      : "",
    element(
      "StandardOrNonStandardCd",
      item.nonstandard_document_review ? "N" : "S",
    ),
  ]);
}

export const w2: MefFormDescriptor<"w2", Fields, readonly string[]> = {
  pendingKey: "w2",
  sourcePendingKeys: ["w2", "f4852"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/fw2.pdf",
  build(fields, context) {
    const substitutes =
      form4852NativeSources(context?.pending, context?.filer).w2s;
    const allSources = [...(fields.w2s ?? []), ...substitutes];
    return allSources.map((item, index) => buildW2(item, context ?? {}, index));
  },
};
