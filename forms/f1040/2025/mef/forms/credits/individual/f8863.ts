import { assertSettledParentTaxSource } from "../../../../../nodes/inputs/taxes/investments/f8615/dependent-source-review.ts";
import {
  canonicalSource,
  dependentScholarshipEarned,
  dependentScholarshipReviewSchema,
} from "../../../../../nodes/inputs/income/other/education_income/dependent-scholarship-review.ts";
import {
  dependentSchema,
  educationDependentSourceEligible,
} from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { assertEducationClaimantSources } from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import { assertEducationIncomeSource } from "../../../../../nodes/inputs/income/other/education_income/index.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import {
  calculateAocStudentLines,
  calculateForm8863Lines,
  type F8863Input,
  type F8863Item,
  form8863InstitutionWorkpapers,
  validateForm8863FilingSource,
} from "../../../../../nodes/inputs/credits/individual/f8863/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../../form-descriptor.ts";

export function assertForm8863FinalizedReturn(
  fields: F8863Input,
  lines: NonNullable<ReturnType<typeof calculateForm8863Lines>>,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  const filer = context?.filer;
  const filingStatus =
    ["single", "mfj", "mfs", "hoh", "qss"][(filer?.filingStatus ?? 0) - 1];
  const final1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const finalSchedule3 = pending?.schedule3 as
    | Record<string, unknown>
    | undefined;
  const worksheet = fields.credit_limit_worksheet;
  const dependentDetails = Array.isArray(final1040?.dependent_details)
    ? final1040.dependent_details as Array<Record<string, unknown>>
    : [];
  const eligibleStudentTins = new Set(
    [
      filer?.primarySSN,
      filer?.spouse?.ssn,
      ...dependentDetails.flatMap((dependent) => [
        dependent.ssn,
        dependent.itin,
        dependent.atin,
      ]),
    ].filter((tin): tin is string => typeof tin === "string").map((tin) =>
      tin.replaceAll("-", "")
    ),
  );
  if (!filer || !final1040 || !worksheet) {
    throw new Error(
      "Form 8863 filing needs source MAGI, Credit Limit Worksheet, and finalized Form 1040/Schedule 3 credit lines to reconcile",
    );
  }
  const incomeRows = assertEducationIncomeSource(
    pending,
    [filer.primarySSN, ...(filer.spouse?.ssn ? [filer.spouse.ssn] : [])],
    (pending?.schedule1 as Record<string, unknown> | undefined)
      ?.line8r_taxable_scholarships,
  );
  const claimedIncomeRefs = new Set<string>();
  const qualifiedPaymentRefs = new Set(
    fields.f8863s.flatMap((student) =>
      form8863InstitutionWorkpapers(student).flatMap(({ workpaper }) =>
        workpaper.payment_record_ids
      )
    ),
  );
  for (const student of fields.f8863s) {
    let studentIncomeRows = incomeRows;
    const retained = student.ownership_review?.dependent_student_income_return;
    if (retained) {
      const owner = student.ownership_review!;
      const review = dependentScholarshipReviewSchema.parse(
        retained.student_claim_review,
      );
      const childGeneral = retained.pending.general as
        | Record<string, unknown>
        | undefined;
      const dependencySource = (pending?.general as {
        dependents?: {
          ssn?: string;
          dob?: string;
          full_time_student?: boolean;
        }[];
      } | undefined)?.dependents?.find((d) =>
        d.ssn?.replaceAll("-", "") === review.student_ssn.replaceAll("-", "")
      );
      if (
        dependencySource?.dob !== review.student_dob ||
        dependencySource?.full_time_student !== true ||
        owner.dependency_claim_state !== "claimed_on_this_return" ||
        review.student_ssn.replaceAll("-", "") !==
          student.student_ssn?.replaceAll("-", "") ||
        ![
          filer.primarySSN,
          ...(filingStatus === "mfj" && filer.spouse?.ssn
            ? [filer.spouse.ssn]
            : []),
        ].map((s) => s.replaceAll("-", "")).includes(
          review.education_claimant_ssn.replaceAll("-", ""),
        ) ||
        owner.dependency_record_reference !==
          review.dependency_record_reference ||
        owner.competing_claim_review_reference !==
          review.actual_parent_claim_record_reference ||
        canonicalSource(review) !==
          canonicalSource(childGeneral?.dependent_education_income_review) ||
        canonicalSource(review.school_sources) !==
          canonicalSource(form8863InstitutionWorkpapers(student))
      ) {
        throw new Error(
          "Parent education claim must bind the exact student dependency, retained child return and owned school expense/aid packet",
        );
      }
      dependentScholarshipEarned(review);
      assertSettledParentTaxSource(review, pending ?? {}, filer);
      studentIncomeRows = assertEducationIncomeSource(
        retained.pending,
        [review.student_ssn],
        (retained.pending.schedule1 as Record<string, unknown> | undefined)
          ?.line8r_taxable_scholarships,
      );
      if (
        studentIncomeRows.some((r) =>
          incomeRows.some((parent) =>
            parent.source_document_reference === r.source_document_reference
          )
        )
      ) {
        throw new Error(
          "Dependent student income cannot also enter the parent education claimant's income sources",
        );
      }
    }
    for (
      const { institution: school, workpaper } of form8863InstitutionWorkpapers(
        student,
      )
    ) {
      for (const aid of workpaper.assistance_sources ?? []) {
        if (
          aid.required_service_compensation !== true &&
          aid.taxable_nonservice_scholarship !== true
        ) continue;
        const source = studentIncomeRows.find((row) =>
          row.source_document_reference === aid.student_income_source_reference
        );
        if (
          !school.current_year_1098t_received ||
          !workpaper.issued_form1098t_source || !source ||
          (source.kind !== "scholarship_for_required_services" &&
            source.kind !== "scholarship_not_on_w2") ||
          (student.student_ssn?.replaceAll("-", "") !==
              filer.primarySSN.replaceAll("-", "") &&
            student.student_ssn?.replaceAll("-", "") !==
              filer.spouse?.ssn.replaceAll("-", "") &&
            !retained) ||
          source.student_ssn.replaceAll("-", "") !==
            student.student_ssn?.replaceAll("-", "") ||
          source.payer_name !== school.name ||
          (source.kind === "scholarship_for_required_services" &&
            (aid.required_service_compensation !== true ||
              source.payer_ein.replaceAll("-", "") !==
                school.ein?.replaceAll("-", "") ||
              source.scholarship_terms_record_reference !==
                aid.required_service_terms_record_reference)) ||
          (source.kind === "scholarship_not_on_w2" &&
            (aid.taxable_nonservice_scholarship !== true ||
              source.scholarship_terms_record_id !==
                aid.scholarship_terms_record_reference ||
              source.taxable_allocation_record_id !==
                aid.taxable_allocation_record_reference ||
              source.nonqualified_expense_payment_record_ids.some((ref) =>
                qualifiedPaymentRefs.has(ref)
              ))) ||
          source.taxable_amount !== aid.amount ||
          aid.tax_treatment !== "taxable" ||
          aid.included_in_form1098t_box5 !== true ||
          claimedIncomeRefs.has(source.source_document_reference)
        ) {
          throw new Error(
            "Form 8863 taxable issued-school aid must match its recipient, school, actual grant terms and finalized compensation income source",
          );
        }
        claimedIncomeRefs.add(source.source_document_reference);
      }
      const exception = workpaper.missing_1098t_exception;
      if (exception?.reason !== "institution_not_required") continue;
      const basis = exception.furnishing_basis;
      if (
        basis.kind !== "formal_billing_arrangement" &&
        basis.kind !== "expenses_waived_or_paid_entirely_with_scholarships"
      ) continue;
      const amount = basis.kind === "formal_billing_arrangement"
        ? basis.taxable_payment_amount
        : basis.taxable_scholarship_payment_amount;
      if (!amount) continue;
      const source = incomeRows.find((row) =>
        row.source_document_reference === basis.student_gross_income_record_id
      );
      if (
        !source ||
        source.student_ssn.replaceAll("-", "") !==
          student.student_ssn?.replaceAll("-", "") ||
        source.taxable_amount !== amount ||
        claimedIncomeRefs.has(source.source_document_reference) ||
        (basis.kind === "formal_billing_arrangement" &&
          (source.kind !== "w2_education_payment" ||
            source.payroll_allocation_record_id !==
              basis.payment_tax_treatment_record_id)) ||
        (basis.kind === "expenses_waived_or_paid_entirely_with_scholarships" &&
          (source.kind !== "scholarship_not_on_w2" ||
            source.payer_name !== exception.institution_name ||
            source.scholarship_terms_record_id !==
              basis.scholarship_terms_record_id ||
            source.taxable_allocation_record_id !==
              basis.taxable_allocation_record_id ||
            source.nonqualified_expense_payment_record_ids.some((reference) =>
              qualifiedPaymentRefs.has(reference)
            )))
      ) {
        throw new Error(
          "Form 8863 taxable assistance allocation must match the student's retained taxable income source and finalized income route",
        );
      }
      claimedIncomeRefs.add(source.source_document_reference);
    }
  }
  if (fields.f8863s.some((student) => student.filing_status !== filingStatus)) {
    throw new Error("Form 8863 filing status must match the finalized return");
  }
  if (
    fields.f8863s.some((student) =>
      !student.student_ssn ||
      !eligibleStudentTins.has(student.student_ssn.replaceAll("-", ""))
    )
  ) {
    throw new Error(
      "Form 8863 student SSN must match the primary filer, spouse, or a dependent on Form 1040",
    );
  }
  if (
    final1040.filing_status !== filingStatus ||
    final1040.line11_agi !== lines.line3 ||
    final1040.line18_total_tax_before_credits !==
      worksheet.form1040_line18_tax ||
    (final1040.line29_refundable_aoc ?? 0) !== lines.line8 ||
    (finalSchedule3?.line3_education_credit ?? 0) !== lines.line19 ||
    (finalSchedule3?.line1_foreign_tax_credit ?? 0) !==
      worksheet.schedule3_line1_foreign_tax_credit ||
    (finalSchedule3?.line1_foreign_tax_1099 ?? 0) !== 0 ||
    (finalSchedule3?.line2_childcare_credit ?? 0) !==
      worksheet.schedule3_line2_dependent_care_credit ||
    (finalSchedule3?.line6d_elderly_disabled_credit ?? 0) !==
      worksheet.schedule3_line6d ||
    (finalSchedule3?.line6l_form8978_credit ?? 0) !==
      worksheet.schedule3_line6l ||
    pending?.form2555 !== undefined || pending?.form4563 !== undefined
  ) {
    throw new Error(
      "Form 8863 filing needs source MAGI, Credit Limit Worksheet, and finalized Form 1040/Schedule 3 credit lines to reconcile",
    );
  }
  const dependentCredit = pending?.f8812 as Record<string, unknown> | undefined;
  const items = (dependentCredit?.f8812s ?? []) as Record<string, unknown>[];
  const dependentWorksheet = (dependentCredit?.credit_limit_worksheet ??
    items.find((item) => item.credit_limit_worksheet)
      ?.credit_limit_worksheet) as Record<string, unknown> | undefined;
  if (
    fields.claimant_review &&
    ((Number(final1040.line19_child_tax_credit ?? 0)) > 0 ||
      (Number(final1040.line28_actc ?? 0)) > 0) &&
    !dependentWorksheet
  ) {
    throw new Error(
      "Reviewed education claimant's dependent credit needs its retained Schedule 8812 credit-limit worksheet",
    );
  }
  if (
    dependentWorksheet && dependentWorksheet.schedule3_line3 !== lines.line19
  ) {
    throw new Error(
      "Form 8863 education credit must match Schedule 8812's preceding-credit worksheet",
    );
  }
  assertEducationClaimantSources(
    fields,
    pending,
    filer.primarySSN,
    (source) => educationDependentSourceEligible(dependentSchema.parse(source)),
    filer.spouse?.ssn,
  );
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
    if (
      fields.f8863s?.length &&
      (context?.filer?.filingStatus === 3 ||
        fields.f8863s.some((s) => s.filing_status === "mfs"))
    ) {
      throw new Error(
        "Married filing separately cannot file an education credit claim source",
      );
    }
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
