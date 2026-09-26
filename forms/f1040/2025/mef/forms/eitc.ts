import { element, elements } from "../../../mef/xml.ts";
import {
  type QualifyingChildDetail,
  qualifyingChildDetailSchema,
} from "../../../nodes/intermediate/forms/eitc/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  credit_amount?: number;
  qualifying_children?: number;
  qualifying_child_details?: readonly QualifyingChildDetail[];
}

type Input = Partial<Fields> & Record<string, unknown>;

const CHILD_RELATIONSHIP_CODES = new Set([
  "SON", "DAUGHTER", "STEPCHILD", "FOSTER CHILD", "BROTHER", "SISTER",
  "STEPBROTHER", "STEPSISTER", "HALF BROTHER", "HALF SISTER",
  "GRANDCHILD", "NIECE", "NEPHEW",
]);

function birthYear(dob: string, label: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) throw new Error(`${label} needs a valid date of birth`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year > 2025 || year < 1900 || date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
  ) {
    throw new Error(`${label} needs a valid date of birth`);
  }
  return match[1];
}

function childXml(
  child: QualifyingChildDetail,
  index: number,
  seenSsns: Set<string>,
  context?: MefBuildContext,
): string {
  const label = `Schedule EIC child ${index + 1}`;
  const namePattern = /^([A-Za-z-] ?)*[A-Za-z-]$/;
  if (
    !child.name_control ||
    !/^[A-Z][A-Z\- ]{0,3}$/.test(child.name_control) ||
    child.first_name.length > 20 || child.last_name.length > 20 ||
    !namePattern.test(child.first_name) || !namePattern.test(child.last_name)
  ) {
    throw new Error(`${label} needs IRS-valid names and a name control`);
  }
  const ssn = child.ssn.replaceAll("-", "");
  if (
    child.ssn_valid_for_employment !== true ||
    child.tin_issued_by_due_date !== true
  ) {
    throw new Error(
      `${label} needs a timely employment-valid SSN for the earned income credit`,
    );
  }
  if (
    !/^\d{9}$/.test(ssn) || seenSsns.has(ssn) ||
    ssn === context?.filer?.primarySSN.replaceAll("-", "") ||
    ssn === context?.filer?.spouse?.ssn.replaceAll("-", "")
  ) {
    throw new Error(`${label} needs a unique nine-digit SSN`);
  }
  seenSsns.add(ssn);
  if (
    !child.irs_relationship_code ||
    !CHILD_RELATIONSHIP_CODES.has(child.irs_relationship_code)
  ) {
    throw new Error(`${label} needs a qualifying IRS child relationship code`);
  }
  if (child.months_in_home < 7 || child.months_in_home > 12) {
    throw new Error(`${label} needs seven through twelve months in the home`);
  }
  if (child.ip_pin !== undefined && !/^\d{6}$/.test(child.ip_pin)) {
    throw new Error(`${label} needs a six-digit IP PIN`);
  }
  const year = birthYear(child.dob, label);
  return elements("QualifyingChildInformation", [
    element("QualifyingChildNameControlTxt", child.name_control),
    elements("ChildFirstAndLastName", [
      element("PersonFirstNm", child.first_name),
      element("PersonLastNm", child.last_name),
    ]),
    element("IdentityProtectionPIN", child.ip_pin),
    element("QualifyingChildSSN", ssn),
    element("ChildBirthYr", year),
    child.full_time_student === true
      ? element("ChildIsAStudentUnder24Ind", "true")
      : "",
    child.disabled === true
      ? element("ChildPermanentlyDisabledInd", "true")
      : "",
    element("ChildRelationshipCd", child.irs_relationship_code),
    element(
      "MonthsChildLivedWithYouCnt",
      String(child.months_in_home).padStart(2, "0"),
    ),
  ]);
}

export const eitc: MefFormDescriptor<"eitc", Input> = {
  pendingKey: "eitc",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  build(fields, context) {
    const credit = fields.credit_amount ?? 0;
    const count = fields.qualifying_children ?? 0;
    if (!Number.isFinite(credit) || credit < 0) {
      throw new Error("Schedule EIC credit amount must be nonnegative");
    }
    if (!Number.isInteger(count) || count < 0 || count > 3) {
      throw new Error("Schedule EIC needs zero through three qualifying children");
    }
    if (credit === 0 || count === 0) return "";
    const children = qualifyingChildDetailSchema.array().max(3).parse(
      fields.qualifying_child_details ?? [],
    );
    if (children.length !== count) {
      throw new Error("Schedule EIC qualifying-child count does not match child detail");
    }
    const seenSsns = new Set<string>();
    return elements(
      "IRS1040ScheduleEIC",
      children.map((child, index) => childXml(child, index, seenSsns, context)),
    );
  },
};
