import { element, elements } from "../../../mef/xml.ts";
import {
  calculateAocStudentLines,
  calculateForm8863Lines,
  validateForm8863FilingSource,
  type F8863Input,
  type F8863Item,
} from "../../../nodes/inputs/f8863/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export function assertForm8863FinalizedReturn(
  fields: F8863Input,
  lines: NonNullable<ReturnType<typeof calculateForm8863Lines>>,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const filer = context?.filer;
  const filingStatus = ["single", "mfj", "mfs", "hoh", "qss"][(filer?.filingStatus ?? 0) - 1];
  const final1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const finalSchedule3 = pending?.schedule3 as Record<string, unknown> | undefined;
  const worksheet = fields.credit_limit_worksheet;
  if (
    !filer || !final1040 || !worksheet ||
    fields.f8863s.some((student) => student.filing_status !== filingStatus) ||
    final1040.filing_status !== filingStatus ||
    final1040.line11_agi !== lines.line3 ||
    final1040.line18_total_tax_before_credits !== worksheet.form1040_line18_tax ||
    (final1040.line29_refundable_aoc ?? 0) !== lines.line8 ||
    (finalSchedule3?.line3_education_credit ?? 0) !== lines.line19 ||
    (finalSchedule3?.line1_foreign_tax_credit ?? 0) !== worksheet.schedule3_line1_foreign_tax_credit ||
    (finalSchedule3?.line1_foreign_tax_1099 ?? 0) !== 0 ||
    (finalSchedule3?.line2_childcare_credit ?? 0) !== worksheet.schedule3_line2_dependent_care_credit ||
    (finalSchedule3?.line6d_elderly_disabled_credit ?? 0) !== worksheet.schedule3_line6d ||
    (finalSchedule3?.line6l_form8978_credit ?? 0) !== worksheet.schedule3_line6l ||
    pending?.form2555 !== undefined || pending?.form4563 !== undefined
  ) {
    throw new Error(
      "Form 8863 filing needs source MAGI, Credit Limit Worksheet, and finalized Form 1040/Schedule 3 credit lines to reconcile",
    );
  }
}

function boolElement(tag: string, value: boolean): string {
  return element(tag, String(value));
}

function institutionXml(
  institution: NonNullable<F8863Item["filing_details"]>["institutions"][number],
): string {
  const us = institution.us_address;
  const foreign = institution.foreign_address;
  return elements("EducationalInstitutionGroup", [
    elements("InstitutionName", [
      element("BusinessNameLine1Txt", institution.name),
    ]),
    us
      ? elements("USAddress", [
        element("AddressLine1Txt", us.line1),
        element("AddressLine2Txt", us.line2),
        element("CityNm", us.city),
        element("StateAbbreviationCd", us.state),
        element("ZIPCd", us.zip),
      ])
      : elements("ForeignAddress", [
        element("AddressLine1Txt", foreign?.line1),
        element("AddressLine2Txt", foreign?.line2),
        element("CityNm", foreign?.city),
        element("ProvinceOrStateNm", foreign?.province_or_state),
        element("CountryCd", foreign?.country_code),
        element("ForeignPostalCd", foreign?.postal_code),
      ]),
    boolElement(
      "CurrentYear1098TReceivedInd",
      institution.current_year_1098t_received,
    ),
    boolElement(
      "PriorYear1098TReceivedInd",
      institution.prior_year_1098t_received,
    ),
    element("EIN", institution.ein?.replaceAll("-", "")),
  ]);
}

function studentXml(item: F8863Item, credit: "aoc" | "llc"): string {
  const details = item.filing_details;
  const ssn = item.student_ssn?.replaceAll("-", "");
  if (!details || !ssn || !/^\d{9}$/.test(ssn)) {
    throw new Error(
      "Form 8863 filing needs structured student details and SSN",
    );
  }
  if (item.aoc_claimed_4_prior_years === undefined) {
    throw new Error(
      "Form 8863 filing needs the student's four-prior-years answer",
    );
  }
  for (const institution of details.institutions) {
    if (
      (institution.current_year_1098t_received ||
        institution.prior_year_1098t_received) && !institution.ein
    ) {
      throw new Error("Form 8863 institution with Form 1098-T needs its EIN");
    }
  }
  if (
    credit === "aoc" &&
    (item.enrolled_half_time !== true ||
      item.completed_4_years_postsec !== false ||
      item.felony_drug_conviction !== false ||
      item.taxpayer_under_24_no_refundable_aoc === undefined)
  ) {
    throw new Error(
      "Form 8863 AOC filing needs explicit eligibility and under-24 answers",
    );
  }
  validateForm8863FilingSource(item, credit);
  const aoc = credit === "aoc"
    ? calculateAocStudentLines(item.aoc_adjusted_expenses ?? 0)
    : null;
  return elements("StudentAndEducationalInstnGrp", [
    elements("StudentName", [
      element("PersonFirstNm", details.first_name),
      element("PersonLastNm", details.last_name),
    ]),
    element("StudentNameControlTxt", details.name_control),
    element("StudentSSN", ssn),
    ...details.institutions.map(institutionXml),
    boolElement("PriorYearCreditClaimedInd", item.aoc_claimed_4_prior_years),
    item.enrolled_half_time === undefined
      ? ""
      : boolElement("AcademicPdEligibleStudentInd", item.enrolled_half_time),
    item.completed_4_years_postsec === undefined ? "" : boolElement(
      "PostSecondaryEducationInd",
      item.completed_4_years_postsec,
    ),
    item.felony_drug_conviction === undefined
      ? ""
      : boolElement("DrugFelonyConvictionInd", item.felony_drug_conviction),
    aoc
      ? element("AmerOppQualifiedExpensesAmt", aoc.line27)
      : element("LifetimeQualifiedExpensesAmt", item.llc_adjusted_expenses),
    aoc ? element("AmerOppQlfyExpnssLessAllwblAmt", aoc.line28) : "",
    aoc ? element("AmerOppAllwblExpnssTimesPctAmt", aoc.line29) : "",
    aoc ? element("AmerOppCreditNetCalcExpnssAmt", aoc.line30) : "",
  ]);
}

export const form8863: MefFormDescriptor<"f8863", F8863Input> = {
  pendingKey: "f8863",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8863.pdf",
  build(fields, context) {
    if (Object.keys(fields).length === 0) return "";
    const lines = calculateForm8863Lines(fields);
    if (!lines || (lines.line8 === 0 && lines.line19 === 0)) return "";
    const students = [
      ...lines.aocStudents.map((item) => ({ item, credit: "aoc" as const })),
      ...lines.llcStudents.map((item) => ({ item, credit: "llc" as const })),
    ];
    if (students.length > 25) {
      throw new Error("Form 8863 supports at most 25 students per document");
    }
    const xml = elements("IRS8863", [
      lines.aocStudents.length
        ? elements("RefundableAmerOppCreditGroup", [
          element("TentativeAmerOppCreditAmt", lines.line1),
          element("EnterSpecifiedAmountForFSAmt", lines.line2),
          element("ModifiedAGIAmt", lines.line3),
          element("SubtractAGIFromAmt", lines.line4),
          element("SpecifiedAmtPerFSAmt", lines.line5),
          element("CalcTentativeEducationRt", lines.line6.toFixed(3)),
          lines.kiddieApplies
            ? element("RefundableAmerOppCrUnder24Ind", "X")
            : "",
          element("CalcTentativeEducationCrAmt", lines.line7),
          element("RefundableAmerOppCreditAmt", lines.line8),
        ])
        : "",
      elements("NonrefundableEducationCrGroup", [
        element("TentativeEducCrLessRfdblCrAmt", lines.line9),
        element("TotalQualifiedExpensesAmt", lines.line10),
        element("SmllrOfTotExpnssOrSpcfdAmt", lines.line11),
        element("TentLifetimeLearningCreditAmt", lines.line12),
        lines.llcStudents.length
          ? element("EnterSpecifiedAmountForFSAmt", lines.line13)
          : "",
        lines.llcStudents.length ? element("ModifiedAGIAmt", lines.line14) : "",
        lines.llcStudents.length
          ? element("SubtractAGIFromAmt", lines.line15)
          : "",
        lines.llcStudents.length
          ? element("SpecifiedAmtPerFSAmt", lines.line16)
          : "",
        lines.llcStudents.length
          ? element("CalcTentativeEducationRt", lines.line17.toFixed(3))
          : "",
        element("CalcTentativeEducationCrAmt", lines.line18),
        element("NonrefundableEducationCrAmt", lines.line19),
      ]),
      ...students.map(({ item, credit }) => studentXml(item, credit)),
    ]);
    assertForm8863FinalizedReturn(fields, lines, context);
    return xml;
  },
};
