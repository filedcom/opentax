import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { inputSchema, itemSchema } from "../../nodes/inputs/f8863/index.ts";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../nodes/inputs/f8863/claimant-review.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";
const base = pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!;
const filer = { ...base.filer, timestamp: "2026-04-01T12:00:00Z" };
const ssn = filer.primarySSN;
const childSsns = ["222334444", "555667777"];
const wageReference = "2025-claimant-issued-W2";
function student(studentSsn: string, firstName: string, dependent: boolean) {
  const school = {
    name: `${firstName} University`,
    ein: "32-1111111",
    us_address: {
      line1: "1 College Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    current_year_1098t_received: true,
    prior_year_1098t_received: false,
  };
  const paymentReference = `2025-${studentSsn}-tuition`;
  const dependencyReference = `2025-${studentSsn}-dependency-review`;
  return itemSchema.parse({
    credit_type: "aoc",
    student_name: `${firstName} Example`,
    student_ssn: studentSsn,
    aoc_adjusted_expenses: 4_000,
    filer_magi: 25_000,
    filing_status: "single",
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    ownership_review: {
      tax_year: 2025,
      claimant_ssn: ssn,
      student_ssn: studentSsn,
      dependency_claim_state: dependent
        ? "claimed_on_this_return"
        : "not_claimed",
      student_can_be_claimed_as_dependent: true,
      dependency_claimant_ssn: dependent ? ssn : undefined,
      dependency_record_reference: dependencyReference,
      eligible_parent_ssn: dependent ? undefined : "999887777",
      parent_nonclaim_record_reference: dependent
        ? undefined
        : "2025-parent-return-review-student-not-claimed",
      no_competing_education_claim: true,
      competing_claim_review_reference:
        `2025-${studentSsn}-no-competing-education-claim`,
    },
    filing_details: {
      first_name: firstName,
      last_name: "Example",
      name_control: "EXAM",
      institutions: [school],
    },
    education_expense_workpaper: {
      form1098t_document_id: `2025-${studentSsn}-1098T`,
      form1098t_box1_payments: 4_500,
      form1098t_box5_scholarships: 500,
      issued_form1098t_source: {
        student_ssn: studentSsn,
        institution_name: school.name,
        institution_ein: school.ein,
        tax_year: 2025,
        document_id: `2025-${studentSsn}-1098T`,
        box1_payments: 4_500,
        box5_scholarships: 500,
      },
      payment_record_ids: [paymentReference],
      paid_tuition_required_fees: 4_500,
      payment_sources: [{
        student_ssn: studentSsn,
        institution_name: school.name,
        tax_year: 2025,
        payment_record_id: paymentReference,
        category: "tuition_required_fees",
        amount: 4_500,
      }],
      assistance_sources: [{
        student_ssn: studentSsn,
        institution_name: school.name,
        tax_year: 2025,
        source_document_reference: `2025-${studentSsn}-tax-free-scholarship`,
        amount: 500,
        tax_treatment: "tax_free",
      }],
      paid_course_materials_to_institution: 0,
      paid_course_materials_elsewhere: 0,
      outside_materials_needed_for_course: false,
      institution_materials_required_for_enrollment: false,
      tax_free_assistance_applied_to_expenses: 500,
      qualified_expense_refunds: 0,
      expenses_used_for_other_tax_benefits: 0,
    },
  });
}
function fixture(
  kind:
    | "parent-limited"
    | "parent-two"
    | "student-refundable"
    | "student-no-refund"
    | "student-scholarship",
) {
  const parent = kind.startsWith("parent");
  const wages = kind === "parent-two"
    ? 75_000
    : (kind === "student-no-refund" || kind === "student-scholarship")
    ? 18_000
    : 25_000;
  const magi = wages + (kind === "student-scholarship" ? 8000 : 0);
  const tax = kind === "student-scholarship"
    ? 1028
    : kind === "parent-two"
    ? 7_955
    : kind === "student-no-refund"
    ? 226
    : 928;
  const withheld = wages === 75_000 ? 11_000 : 3_000;
  const students = parent
    ? childSsns.slice(0, kind === "parent-two" ? 2 : 1).map((tin, i) =>
      student(tin, i ? "Jordan" : "Taylor", true)
    )
    : [student(ssn, "Alex", false)];
  const review = {
    tax_year: 2025,
    claimant_ssn: ssn,
    claimant_dob: parent ? "1985-06-15" : "2005-06-15",
    dob_record_reference: "claimant-issued-birth-record",
    claimant_actually_claimed_as_dependent: false,
    claimant_dependency_record_reference: "2025-claimant-dependency-review",
    ...(parent ? { kind: "age_24_or_older" } : {
      kind: "under_24",
      full_time_student_months: [1, 2, 3, 4, 5],
      full_time_enrollment_record_reference:
        "2025-claimant-full-time-five-month-enrollment",
      at_least_one_parent_alive_at_year_end: true,
      parent_status_record_reference: "2025-claimant-parent-status",
      other_earned_income_present: false,
      earned_income_w2_sources: [{
        source_document_reference: wageReference,
        employee_ssn: ssn,
        employer_ein: "12-3456789",
        box1_wages: wages,
      }],
      support_sources: [
        {
          source_document_reference: "2025-claimant-housing-food-care",
          beneficiary_ssn: ssn,
          kind: "ordinary_support",
          amount: 45_500,
        },
        {
          source_document_reference: "2025-claimant-education-support",
          beneficiary_ssn: ssn,
          kind: "ordinary_support",
          amount: 4_500,
        },
        {
          source_document_reference: "2025-claimant-scholarship-support",
          beneficiary_ssn: ssn,
          kind: "scholarship_support",
          amount: kind === "student-scholarship" ? 8500 : 500,
        },
      ],
    }),
  };
  const general = {
    ...(base.inputs.general as Record<string, unknown>),
    taxpayer_dob: review.claimant_dob,
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
    taxpayer_claimed_as_dependent: false,
    taxpayer_can_be_claimed_as_dependent: !parent,
    ...(!parent ? { dependent_earned_income: wages } : {}),
    // EIC is separately waived so this packet isolates education/ODC ordering.
    do_not_claim_eic: true,
    dependents: parent
      ? students.map((item) => ({
        first_name: item.filing_details!.first_name,
        last_name: "Example",
        name_control: "EXAM",
        ssn: item.student_ssn,
        dob: "2005-06-15",
        relationship: "son",
        irs_relationship_code: "SON",
        months_in_home: 12,
        months_lived_with_you_in_us: 12,
        full_time_student: true,
        us_citizen_national_or_resident: true,
        lived_in_us_over_half_year: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        education_dependency_record_reference:
          item.ownership_review!.dependency_record_reference,
      }))
      : [],
  };
  const wage = {
    ...(base.inputs.w2 as Record<string, unknown>[])[0],
    source_document_reference: wageReference,
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: wages,
    box4_ss_withheld: wages * .062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * .0145,
  };
  return {
    review,
    students,
    tax,
    general,
    inputs: {
      ...base.inputs,
      general,
      w2: [wage],
      f8863: students.map((item) => ({ ...item, filer_magi: magi })),
      ...(kind === "student-scholarship"
        ? {
          education_income: [{
            kind: "scholarship_not_on_w2",
            student_ssn: ssn,
            tax_year: 2025,
            source_document_reference:
              "2025-Alex-taxable-room-board-scholarship",
            taxable_amount: 8000,
            payer_name: "Alex University",
            nonqualified_expenses_paid: 8000,
            nonqualified_expense_payment_record_ids: [
              "2025-Alex-separate-scholarship-room-board",
            ],
            scholarship_terms_record_id:
              "2025-Alex-scholarship-permits-room-board",
            taxable_allocation_record_id: "2025-Alex-8000-taxable-allocation",
          }],
        }
        : {}),
      f8863_claimant_review: { claimant_review: review },
      ...(parent
        ? {
          f8812: [{
            filing_status: "single",
            agi: wages,
            income_tax_liability: tax,
            earned_income: wages,
            line18a_earned_income: wages,
            qualifying_children_count: 0,
            other_dependents_count: students.length,
            credit_limit_worksheet: {
              schedule3_line1: 0,
              schedule3_line2: 0,
              schedule3_line3: kind === "parent-two" ? 3000 : tax,
              schedule3_line4: 0,
              schedule3_line5b: 0,
              schedule3_line6d: 0,
              schedule3_line6f: 0,
              schedule3_line6l: 0,
              schedule3_line6m: 0,
              worksheet_b_applies: false,
            },
          }],
        }
        : {}),
      f8863_credit_limit_worksheet: {
        credit_limit_worksheet: {
          form1040_line18_tax: tax,
          schedule3_line1_foreign_tax_credit: 0,
          schedule3_line2_dependent_care_credit: 0,
          schedule3_line6d: 0,
          schedule3_line6l: 0,
        },
      },
    },
  };
}
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (
  const kind of [
    "parent-limited",
    "parent-two",
    "student-refundable",
    "student-no-refund",
    "student-scholarship",
  ] as const
) {
  Deno.test(`education ${kind} owner/support source reaches 1040, credit ordering, full XSD and PDF`, async () => {
    const source = fixture(kind);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const pending = result.pending;
    assertEquals(pending.f1040.line18_total_tax_before_credits, source.tax);
    const noRefund = kind === "student-no-refund" ||
      kind === "student-scholarship";
    const two = kind === "parent-two";
    assertEquals(
      pending.f1040.line29_refundable_aoc ?? 0,
      noRefund ? 0 : two ? 2_000 : 1_000,
    );
    assertEquals(
      pending.schedule3.line3_education_credit,
      two ? 3_000 : source.tax,
    );
    assertEquals(pending.f1040.line19_child_tax_credit ?? 0, two ? 1_000 : 0);
    assertEquals(pending.f1040.line24_total_tax, two ? 3_955 : 0);
    assertEquals(
      pending.f1040.line11_agi,
      kind === "parent-two"
        ? 75_000
        : kind === "student-scholarship"
        ? 26000
        : noRefund
        ? 18_000
        : 25_000,
    );
    assertEquals(
      pending.f1040.taxpayer_can_be_claimed_as_dependent,
      kind.startsWith("student"),
    );
    if (kind === "student-scholarship") {
      assertEquals(pending.schedule1.line8r_taxable_scholarships, 8000);
      assertEquals(
        inputSchema.parse(pending.f8863).f8863s[0].filer_magi,
        26000,
      );
    }
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(
      prepared.bundle.xml.includes(
        "<RefundableAmerOppCrUnder24Ind>X</RefundableAmerOppCrUnder24Ind>",
      ),
      noRefund,
    );
    const [projected] = form8863Pdf.instances!(pending.f8863, filer, pending);
    assertEquals(projected.pdf_under24, noRefund);
    assertEquals(projected.line8 ?? 0, noRefund ? 0 : two ? 2_000 : 1_000);
    assertStringIncludes(
      prepared.bundle.xml,
      `<StudentSSN>${source.students[0].student_ssn}</StudentSSN>`,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, prepared.bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(path);
    }
    const pdf = await prepared.renderPdf();
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      doc.getPageCount(),
      two ? 8 : kind === "student-scholarship" ? 7 : 5,
    );
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-f8863-owner-evidence";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${kind}-source-input.json`,
        JSON.stringify({ inputs: source.inputs, filer }, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/${kind}-full-return.xml`,
        prepared.bundle.xml,
      );
      await Deno.writeFile(`${dir}/${kind}-filled-return.pdf`, pdf);
    }
  });
}

Deno.test("claimant support restriction follows age, earned/support threshold, full-time enrollment and parents/joint status", () => {
  const source = fixture("student-refundable");
  const review = claimantReviewSchema.parse(source.review);
  assertEquals(claimantRefundRestriction(review, "single"), false);
  assertEquals(
    claimantRefundRestriction(
      claimantReviewSchema.parse(fixture("student-no-refund").review),
      "single",
    ),
    true,
  );
  if (review.kind !== "under_24") throw new Error("test review");
  const below = {
    ...review,
    earned_income_w2_sources: [{
      ...review.earned_income_w2_sources[0],
      box1_wages: 24_999,
    }],
  };
  assertEquals(claimantRefundRestriction(below, "single"), true);
  assertEquals(
    claimantRefundRestriction({
      ...below,
      at_least_one_parent_alive_at_year_end: false,
    }, "single"),
    false,
  );
  assertEquals(claimantRefundRestriction(below, "mfj"), false);
  assertEquals(
    claimantRefundRestriction({
      ...below,
      full_time_student_months: [1, 2, 3, 4],
    }, "single"),
    false,
  );
  assertEquals(
    claimantRefundRestriction({
      ...below,
      claimant_dob: "2007-06-15",
      full_time_student_months: [],
    }, "single"),
    true,
  );
  assertEquals(
    claimantRefundRestriction(
      { ...review, claimant_dob: "2008-06-15" },
      "single",
    ),
    true,
  );
  assertEquals(
    claimantRefundRestriction(
      claimantReviewSchema.parse({
        kind: "age_24_or_older",
        tax_year: 2025,
        claimant_ssn: ssn,
        claimant_dob: "2002-01-01",
        dob_record_reference: "DOB",
        claimant_actually_claimed_as_dependent: false,
        claimant_dependency_record_reference: "dependency",
      }),
      "single",
    ),
    false,
  );
});

Deno.test("education claimant rejects competing owners, dependency releases, detached income and filed-row tampering", async () => {
  for (const kind of ["parent-two", "student-refundable"] as const) {
    const source = fixture(kind);
    const calculated = f1040_2025.executeReturn(source.inputs);
    assertEquals(calculated.diagnostics, []);
    const pending = calculated.pending;
    const mutations: Array<(value: any) => void> = [
      (p) => {
        p.f8863.claimant_review.claimant_ssn = "999887777";
      },
      (p) => {
        p.f8863.claimant_review.claimant_dob = "2006-06-15";
      },
      (p) => {
        p.f8863.claimant_review.claimant_actually_claimed_as_dependent = true;
      },
      (p) => {
        p.general.taxpayer_claimed_as_dependent = true;
      },
      (p) => {
        delete p.f8863.claimant_review;
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.claimant_ssn = "999887777";
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.student_ssn = "999887777";
      },
      (p) => {
        p.f8863.f8863s[0].ownership_review.dependency_claim_state =
          "claimed_on_another_return";
      },
      (p) => {
        p.f8863.f8863s[0].taxpayer_under_24_no_refundable_aoc = true;
      },
      (p) => {
        p.f8863.f8863s.push(structuredClone(p.f8863.f8863s[0]));
      },
      ...(kind === "parent-two"
        ? [
          (p: any) => {
            delete p.f8812;
          },
          (p: any) => {
            delete p.f8812.f8812s[0].credit_limit_worksheet;
          },
          (p: any) => {
            p.general.dependents[0].dependent_on_another_return = true;
          },
          (p: any) => {
            p.general.dependents[0].provided_over_half_own_support = true;
          },
          (p: any) => {
            p.general.dependents[0].education_dependency_record_reference =
              "detached-review";
          },
          (p: any) => {
            p.f1040.dependent_details.splice(0, 1);
          },
          (p: any) => {
            p.f1040.dependent_details[0].education_dependency_record_reference =
              "detached-filed-review";
          },
        ]
        : [
          (p: any) => {
            delete p.f8863.f8863s[0].ownership_review
              .parent_nonclaim_record_reference;
          },
          (p: any) => {
            p.general.taxpayer_can_be_claimed_as_dependent = false;
          },
          (p: any) => {
            p.f1040.taxpayer_can_be_claimed_as_dependent = false;
          },
          (p: any) => {
            p.f8863.claimant_review.earned_income_w2_sources[0].box1_wages =
              25001;
          },
          (p: any) => {
            p.w2.w2s[0].source_document_reference = "detached-W2";
          },
          (p: any) => {
            p.w2.w2s[0].box1_wages = 24999;
          },
          (p: any) => {
            p.w2.w2s[0].box12_entries = [{ code: "D", amount: 4000 }];
          },
          (p: any) => {
            p.f1040.line1a_wages = 24999;
          },
          (p: any) => {
            p.f8863.claimant_review.support_sources[0].beneficiary_ssn =
              "999887777";
          },
          (p: any) => {
            p.f1040.line1c_unreported_tips = 100;
          },
        ]),
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      assertThrows(() =>
        form8863.build(inputSchema.parse(changed.f8863), {
          pending: changed,
          filer,
        })
      );
      assertThrows(() => form8863Pdf.instances!(changed.f8863, filer, changed));
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
    }
  }
});

Deno.test("dependent scholarship income stays on student return and Schedule 8812 checks filed credit ordering", async () => {
  const source = fixture("parent-two");
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const scholarshipFixture = JSON.parse(
    await Deno.readTextFile(
      new URL("./review-8863-scholarship-source.json", import.meta.url),
    ),
  );
  const scholarship = {
    ...scholarshipFixture.inputs.education_income[0],
    student_ssn: childSsns[0],
  };
  const crossed: Record<string, any> = {
    ...result.pending,
    education_income: { education_incomes: [scholarship] },
  };
  assertThrows(
    () =>
      form8863.build(inputSchema.parse(crossed.f8863), {
        pending: crossed,
        filer,
      }),
    Error,
    "recipient must match",
  );
  assertThrows(() => form8863Pdf.instances!(crossed.f8863, filer, crossed));
  await assertRejects(() => f1040_2025.prepareReturn(crossed, filer));
  for (
    const mutate of [
      (p: any) => {
        p.f1040.line19_child_tax_credit = 999;
      },
      (p: any) => {
        p.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3 = 2999;
      },
    ]
  ) {
    const changed = structuredClone(result.pending);
    mutate(changed);
    await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
  }
});
