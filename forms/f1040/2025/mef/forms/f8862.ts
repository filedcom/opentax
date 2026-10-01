import { element, elements } from "../../../mef/xml.ts";
import {
  assertCreditDisallowanceEvidence,
  type F8862Input,
  inputSchema,
  type PriorCreditDisallowanceReview,
} from "../../../nodes/inputs/f8862/index.ts";
import { inputSchema as form8863InputSchema } from "../../../nodes/inputs/f8863/index.ts";
import { inputSchema as generalInputSchema } from "../../../nodes/inputs/general/index.ts";
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
  const general = generalInputSchema.safeParse(pending?.general);
  const filerSsn = context?.filer?.primarySSN ??
    (general.success
      ? general.data.taxpayer_ssn?.replace(/\D/g, "")
      : undefined);
  const assertPriorNotice = (
    credit: "CTC/ODC" | "AOTC",
    review: PriorCreditDisallowanceReview | undefined,
    year: number | undefined,
    reference: string | undefined,
  ) => {
    if (
      !review || review.disallowed_year !== year ||
      review.notice_reference !== reference ||
      !filerSsn || review.taxpayer_ssn.replace(/\D/g, "") !== filerSsn
    ) {
      throw new Error(
        `Form 8862 ${credit} claim needs a matching reviewed prior IRS notice and taxpayer`,
      );
    }
  };
  if (fields.claim_ctc) {
    assertPriorNotice(
      "CTC/ODC",
      general.success ? general.data.prior_ctc_disallowance_review : undefined,
      fields.ctc_disallowed_year,
      fields.ctc_disallowance_notice_reference,
    );
  }
  if (fields.claim_aotc) {
    assertPriorNotice(
      "AOTC",
      general.success ? general.data.prior_aotc_disallowance_review : undefined,
      fields.aotc_disallowed_year,
      fields.aotc_disallowance_notice_reference,
    );
  }
  const positive = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0;
  if (fields.claim_eitc && !positive(form1040.line27_eitc)) {
    throw new Error(
      "Form 8862 EITC claim needs positive finalized Form 1040 line 27",
    );
  }
  if (fields.claim_eitc && (fields.eitc_children?.length ?? 0) > 0) {
    const eitc = pending?.eitc as Record<string, unknown> | undefined;
    const filedChildren = eitc?.qualifying_child_details;
    if (
      !Array.isArray(filedChildren) ||
      eitc?.qualifying_children !== fields.eitc_children?.length ||
      eitc?.credit_amount !== form1040.line27_eitc ||
      (context?.documentIdsByPendingKey &&
        (context.documentIdsByPendingKey.eitc?.length ?? 0) === 0)
    ) {
      throw new Error(
        "Form 8862 EITC children must match finalized Schedule EIC and Form 1040 line 27",
      );
    }
    const names = filedChildren.map((child) => {
      if (child === null || typeof child !== "object") return "";
      const person = child as Record<string, unknown>;
      if (
        typeof person.first_name !== "string" ||
        typeof person.last_name !== "string"
      ) return "";
      return `${person.first_name} ${person.last_name}`.trim().toUpperCase();
    });
    const claimed = fields.eitc_children!.map((child) =>
      `${child.first_name} ${child.last_name}`.trim().toUpperCase()
    );
    if (
      names.length !== claimed.length ||
      new Set(names).size !== names.length ||
      new Set(claimed).size !== claimed.length ||
      names.some((name) => !name || !claimed.includes(name))
    ) {
      throw new Error(
        "Form 8862 EITC children must match finalized Schedule EIC and Form 1040 line 27",
      );
    }
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
  if (fields.claim_ctc) {
    const dependentRows = form1040.dependent_details;
    if (!Array.isArray(dependentRows)) {
      throw new Error(
        "Form 8862 CTC and ODC names need finalized Form 1040 dependent rows",
      );
    }
    const filed = new Map<string, string>();
    for (const row of dependentRows) {
      if (row === null || typeof row !== "object") continue;
      const dep = row as Record<string, unknown>;
      if (
        typeof dep.first_name !== "string" ||
        typeof dep.last_name !== "string" ||
        typeof dep.credit_category !== "string"
      ) continue;
      const name = `${dep.first_name} ${dep.last_name}`.trim().toUpperCase();
      if (filed.has(name)) {
        throw new Error("Form 8862 dependent names are ambiguous on Form 1040");
      }
      filed.set(name, dep.credit_category);
    }
    const claimed = new Set<string>();
    for (
      const [people, category] of [
        [fields.ctc_children ?? [], "ctc"],
        [fields.other_dependents ?? [], "odc"],
      ] as const
    ) {
      for (const person of people) {
        const name = `${person.first_name} ${person.last_name}`.trim()
          .toUpperCase();
        if (claimed.has(name) || filed.get(name) !== category) {
          throw new Error(
            "Form 8862 CTC and ODC names must match filed Form 1040 dependent credit rows",
          );
        }
        claimed.add(name);
      }
    }
    const filedCreditNames = [...filed.entries()].filter(([, category]) =>
      category === "ctc" || category === "odc"
    ).map(([name]) => name);
    if (
      claimed.size !== filedCreditNames.length ||
      filedCreditNames.some((name) => !claimed.has(name))
    ) {
      throw new Error(
        "Form 8862 Part III must include every filed CTC and ODC dependent",
      );
    }
  }
  if (fields.claim_aotc) {
    const form8863 = form8863InputSchema.safeParse(pending?.f8863);
    if (!form8863.success) {
      throw new Error(
        "Form 8862 AOTC students and credit must reconcile to Form 8863 and the finalized return",
      );
    }
    const aocStudents = form8863.data.f8863s.filter((student) =>
      student.credit_type === "aoc"
    );
    const filedStudents = aocStudents.map((student) =>
      student.student_name.trim().toUpperCase()
    );
    const claimedStudents = (fields.aotc_students ?? []).map((student) =>
      `${student.first_name} ${student.last_name}`.trim().toUpperCase()
    );
    const filedNames = new Set(filedStudents);
    const claimedNames = new Set(claimedStudents);
    const schedule3 = pending?.schedule3 as Record<string, unknown> | undefined;
    if (
      !filedNames.size ||
      filedNames.size !== filedStudents.length ||
      claimedNames.size !== claimedStudents.length ||
      filedNames.size !== claimedNames.size ||
      filedStudents.some((name) => !claimedNames.has(name)) ||
      !(positive(form1040.line29_refundable_aoc) ||
        positive(schedule3?.line3_education_credit)) ||
      (context?.documentIdsByPendingKey &&
        (context.documentIdsByPendingKey.f8863?.length ?? 0) === 0)
    ) {
      throw new Error(
        "Form 8862 AOTC students and credit must reconcile to Form 8863 and the finalized return",
      );
    }
    if (fields.claim_ctc && Array.isArray(form1040.dependent_details)) {
      const odcDependents = form1040.dependent_details.filter((row) =>
        row !== null && typeof row === "object" &&
        (row as Record<string, unknown>).credit_category === "odc"
      ) as Record<string, unknown>[];
      for (const student of aocStudents) {
        const name = student.student_name.trim().toUpperCase();
        const samePerson = odcDependents.find((row) =>
          `${row.first_name} ${row.last_name}`.trim().toUpperCase() === name
        );
        if (
          samePerson &&
          (typeof samePerson.ssn !== "string" ||
            samePerson.ssn.replace(/\D/g, "") !==
              student.student_ssn.replace(/\D/g, ""))
        ) {
          throw new Error(
            "Form 8862 shared ODC and AOTC student needs one matching dependent SSN",
          );
        }
      }
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
    assertCreditDisallowanceEvidence(fields);
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
