import { element, elements } from "../../../mef/xml.ts";
import type { W2Item } from "../../../nodes/inputs/w2/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

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
  const employerEin = digits(
    requiredEmployerValue(item, "employer_ein", index),
  );
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
  ]);
}

export const w2: MefFormDescriptor<"w2", Fields, readonly string[]> = {
  pendingKey: "w2",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/fw2.pdf",
  build(fields, context) {
    return (fields.w2s ?? []).map((item, index) =>
      buildW2(item, context ?? {}, index)
    );
  },
};
