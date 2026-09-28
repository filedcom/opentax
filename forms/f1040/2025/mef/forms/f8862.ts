import { element, elements } from "../../../mef/xml.ts";
import {
  type F8862Input,
  inputSchema,
} from "../../../nodes/inputs/f8862/index.ts";
import { inputSchema as form8863InputSchema } from "../../../nodes/inputs/f8863/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function boolElement(tag: string, value: boolean | undefined): string {
  return element(tag, value === undefined ? undefined : String(value));
}

function personName(
  fields: { first_name: string; last_name: string },
): string[] {
  return [
    element("PersonFirstNm", fields.first_name),
    element("PersonLastNm", fields.last_name),
  ];
}

function validateDetail(fields: F8862Input): void {
  const eitcChildren = fields.eitc_children ?? [];
  const ctcChildren = fields.ctc_children ?? [];
  const otherDependents = fields.other_dependents ?? [];
  const aotcStudents = fields.aotc_students ?? [];
  if (fields.claim_eitc) {
    const hasChildren = eitcChildren.length > 0;
    const hasNoChildDetail = fields.eitc_without_child !== undefined;
    if (fields.eitc_income_reporting_only === undefined) {
      throw new Error("Form 8862 EITC needs the income-reporting answer");
    }
    if (fields.eitc_income_reporting_only) {
      if (
        fields.eitc_qualifying_child_of_other !== undefined || hasChildren ||
        hasNoChildDetail || fields.eitc_qualifying_children_count !== undefined
      ) {
        throw new Error(
          "Form 8862 EITC income-only answer must not include the rest of Part II",
        );
      }
    } else if (
      fields.eitc_qualifying_child_of_other === undefined ||
      hasChildren === hasNoChildDetail
    ) {
      throw new Error(
        "Form 8862 EITC needs both eligibility answers and either qualifying-child or no-child detail",
      );
    }
    if (fields.eitc_qualifying_child_of_other) {
      throw new Error(
        "Form 8862 EITC cannot be claimed by another taxpayer's qualifying child",
      );
    }
    if (
      eitcChildren.some((child) =>
        child.days_in_us === undefined || child.days_in_us < 183
      )
    ) {
      throw new Error("Form 8862 EITC child needs at least 183 US days");
    }
    if (
      eitcChildren.some((child) =>
        (child.birth_month_day || child.death_month_day) &&
        child.days_in_us !== 365
      )
    ) {
      throw new Error(
        "Form 8862 TY2025 birth/death exception requires 365 on line 7",
      );
    }
    if (
      fields.eitc_without_child?.primary.claimed_as_dependent ||
      fields.eitc_without_child?.spouse?.claimed_as_dependent
    ) {
      throw new Error(
        "Form 8862 childless EITC claimant cannot be another taxpayer's dependent",
      );
    }
    if (
      fields.eitc_without_child &&
      (fields.eitc_without_child.primary.main_home_us_days < 183 ||
        (fields.eitc_without_child.spouse !== undefined &&
          fields.eitc_without_child.spouse.main_home_us_days < 183))
    ) {
      throw new Error(
        "Form 8862 childless EITC needs at least 183 US-home days for each claimant",
      );
    }
    if (
      fields.eitc_qualifying_children_count !== undefined &&
      fields.eitc_qualifying_children_count !== eitcChildren.length
    ) {
      throw new Error("Form 8862 EITC child count does not match child detail");
    }
  } else if (
    eitcChildren.length || fields.eitc_without_child ||
    fields.eitc_income_reporting_only !== undefined ||
    fields.eitc_qualifying_child_of_other !== undefined ||
    fields.eitc_qualifying_children_count !== undefined
  ) {
    throw new Error("Form 8862 EITC detail requires an EITC claim");
  }
  if (fields.claim_ctc) {
    if (ctcChildren.length + otherDependents.length === 0) {
      throw new Error("Form 8862 CTC needs child or other-dependent detail");
    }
    if (
      fields.ctc_qualifying_children_count !== undefined &&
      fields.ctc_qualifying_children_count !== ctcChildren.length
    ) {
      throw new Error("Form 8862 CTC child count does not match child detail");
    }
    if (
      ctcChildren.some((child) =>
        !child.lived_with_over_half_year || !child.qualifying_child ||
        !child.dependent || !child.us_citizen_national_or_resident
      ) || otherDependents.some((person) =>
        !person.dependent || !person.us_citizen_national_or_resident
      )
    ) {
      throw new Error("Form 8862 CTC or ODC detail is not credit-eligible");
    }
  } else if (
    ctcChildren.length || otherDependents.length ||
    fields.ctc_qualifying_children_count !== undefined
  ) {
    throw new Error("Form 8862 CTC detail requires a CTC claim");
  }
  if (fields.claim_aotc) {
    if (aotcStudents.length === 0) {
      throw new Error("Form 8862 AOTC needs student detail");
    }
    if (
      fields.aotc_student_count !== undefined &&
      fields.aotc_student_count !== aotcStudents.length
    ) {
      throw new Error("Form 8862 AOTC student count does not match detail");
    }
    if (
      aotcStudents.some((student) =>
        !student.eligible || student.credit_claimed_four_prior_years
      )
    ) {
      throw new Error("Form 8862 AOTC student is not credit-eligible");
    }
  } else if (
    aotcStudents.length || fields.aotc_student_count !== undefined
  ) {
    throw new Error("Form 8862 AOTC detail requires an AOTC claim");
  }
}

function validateFinalizedCreditClaims(
  fields: F8862Input,
  context: MefBuildContext | undefined,
): void {
  const pending = context?.pending;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  if (!form1040) {
    throw new Error("Form 8862 needs finalized Form 1040 credit lines");
  }
  const positive = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0;
  if (fields.claim_eitc && !positive(form1040.line27_eitc)) {
    throw new Error(
      "Form 8862 EITC claim needs positive finalized Form 1040 line 27",
    );
  }
  if (
    fields.claim_ctc &&
    !(positive(form1040.line19_child_tax_credit) ||
      positive(form1040.line28_actc))
  ) {
    throw new Error(
      "Form 8862 CTC/ODC claim needs a finalized Form 1040 line 19 or 28 credit",
    );
  }
  if (fields.claim_aotc) {
    const form8863 = form8863InputSchema.safeParse(pending?.f8863);
    if (!form8863.success) {
      throw new Error(
        "Form 8862 AOTC students and credit must reconcile to Form 8863 and the finalized return",
      );
    }
    const names = new Set(
      form8863.data.f8863s.filter((student) => student.credit_type === "aoc")
        .map((student) => student.student_name.trim().toUpperCase()),
    );
    const schedule3 = pending?.schedule3 as Record<string, unknown> | undefined;
    if (
      fields.aotc_students?.some((student) =>
        !names.has(`${student.first_name} ${student.last_name}`.toUpperCase())
      ) || !names.size ||
      !(positive(form1040.line29_refundable_aoc) ||
        positive(schedule3?.line3_education_credit)) ||
      (context?.documentIdsByPendingKey &&
        (context.documentIdsByPendingKey.f8863?.length ?? 0) === 0)
    ) {
      throw new Error(
        "Form 8862 AOTC students and credit must reconcile to Form 8863 and the finalized return",
      );
    }
  }
}

export const form8862: MefFormDescriptor<"f8862", F8862Input> = {
  pendingKey: "f8862",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8862.pdf",
  build(rawFields, context) {
    if (Object.keys(rawFields).length === 0) return "";
    const fields = inputSchema.parse(rawFields);
    validateDetail(fields);
    if (!fields.claim_eitc && !fields.claim_ctc && !fields.claim_aotc) {
      return "";
    }
    validateFinalizedCreditClaims(fields, context);

    return elements("IRS8862", [
      element("TaxYr", 2025),
      fields.claim_eitc ? element("EICClaimedInd", "X") : "",
      fields.claim_ctc ? element("CTCACTCODCClaimedInd", "X") : "",
      fields.claim_aotc ? element("AOTCClaimedInd", "X") : "",
      fields.claim_eitc
        ? boolElement(
          "EICEligClmIncmIncorrectRptInd",
          fields.eitc_income_reporting_only,
        )
        : "",
      fields.claim_eitc && fields.eitc_income_reporting_only === false
        ? boolElement(
          "EICEligClmQlfyChldOfOtherInd",
          fields.eitc_qualifying_child_of_other,
        )
        : "",
      fields.claim_eitc && fields.eitc_income_reporting_only === false
        ? boolElement(
          "QualifyingChildInd",
          (fields.eitc_children ?? []).length > 0,
        )
        : "",
      ...(fields.eitc_children ?? []).map((child) =>
        elements("FilerWithQualifyingChildGrp", [
          elements("ChildFirstAndLastName", personName(child)),
          element("LiveInUSDayCnt", child.days_in_us),
          element("BirthMonthDayDt", child.birth_month_day),
          element("DeathMonthDayDt", child.death_month_day),
        ])
      ),
      fields.eitc_without_child
        ? elements("PrimaryNoQualifyingChildGrp", [
          element(
            "MainHomeUSDayCnt",
            fields.eitc_without_child.primary.main_home_us_days,
          ),
          element("AgeNum", fields.eitc_without_child.primary.age),
          boolElement(
            "OtherPersonClaimDependentInd",
            fields.eitc_without_child.primary.claimed_as_dependent,
          ),
        ])
        : "",
      fields.eitc_without_child?.spouse
        ? elements("SpouseNoQualifyingChildGrp", [
          element(
            "MainHomeUSDayCnt",
            fields.eitc_without_child.spouse.main_home_us_days,
          ),
          element("AgeNum", fields.eitc_without_child.spouse.age),
          boolElement(
            "OtherPersonClaimDependentInd",
            fields.eitc_without_child.spouse.claimed_as_dependent,
          ),
        ])
        : "",
      ...(fields.ctc_children ?? []).map((child) =>
        elements("CTCACTCChildInformationGrp", [
          elements("ChildFirstAndLastName", personName(child)),
          boolElement(
            "LiveWithChildOverHalfYearInd",
            child.lived_with_over_half_year,
          ),
          boolElement("QualifyingChildInd", child.qualifying_child),
          boolElement("DependentInd", child.dependent),
          boolElement(
            "USCitizenOrNationalInd",
            child.us_citizen_national_or_resident,
          ),
        ])
      ),
      ...(fields.other_dependents ?? []).map((person) =>
        elements("ODCPersonInformationGrp", [
          elements("PersonFullName", personName(person)),
          boolElement("DependentInd", person.dependent),
          boolElement(
            "USCitizenOrNationalInd",
            person.us_citizen_national_or_resident,
          ),
        ])
      ),
      ...(fields.aotc_students ?? []).map((student) =>
        elements("AOTCStudentInformationGrp", [
          elements("StudentName", personName(student)),
          boolElement("EligibleStudentInd", student.eligible),
          boolElement(
            "PriorYearCreditClaimedInd",
            student.credit_claimed_four_prior_years,
          ),
        ])
      ),
    ]);
  },
};
