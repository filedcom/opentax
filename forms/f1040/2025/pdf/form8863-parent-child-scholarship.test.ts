import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import {
  childSsns,
  filer,
  fixture,
  ssn,
} from "./form8863-claimant-source.fixture.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";
import { irs1040 } from "../mef/forms/f1040.ts";
import { irs1040Pdf } from "./forms/f1040.ts";
import {
  dependentScholarshipEarned,
  dependentScholarshipReviewSchema,
} from "../../nodes/inputs/education_income/dependent-scholarship-review.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
function paired(issued: boolean, studentPaid = false) {
  const parent: any = structuredClone(fixture("parent-two").inputs);
  parent.f8863 = parent.f8863.slice(0, 1);
  parent.general.dependents = parent.general.dependents.slice(0, 1);
  parent.f8812[0].other_dependents_count = 1;
  parent.f8812[0].credit_limit_worksheet.schedule3_line3 = 1500;
  const student = parent.f8863[0];
  const studentSsn = childSsns[0];
  const school = student.filing_details.institutions[0];
  const w = student.education_expense_workpaper;
  const grantRef = "2025-Taylor-paid-required-service-award";
  const terms = "2025-Taylor-performed-teaching-required-award-terms";
  const grantW2Ref = "2025-Taylor-issued-teaching-W2";
  const grant = {
    kind: "scholarship_for_required_services",
    tax_year: 2025,
    student_ssn: studentSsn,
    source_document_reference: grantRef,
    taxable_amount: 8000,
    payer_name: school.name,
    payer_ein: school.ein,
    scholarship_terms_record_reference: terms,
    section117c_exception_review: {
      source_document_reference:
        "2025-Taylor-ordinary-nonexempt-program-review",
      national_health_service_corps_program: false,
      armed_forces_health_professions_program: false,
      comprehensive_work_college_program: false,
    },
    payment_sources: [{
      source_document_reference:
        "2025-Taylor-service-award-actual-disbursement",
      grant_source_reference: grantRef,
      student_ssn: studentSsn,
      payer_ein: school.ein,
      payment_date: "2025-12-20",
      amount: 8000,
    }],
    required_service_sources: [{
      source_document_reference: "2025-Taylor-required-teaching-source",
      grant_source_reference: grantRef,
      student_ssn: studentSsn,
      payer_ein: school.ein,
      service_kind: "teaching",
      required_as_condition_of_award: true,
      service_condition_record_reference: terms,
      performance_record_reference:
        "2025-Taylor-actual-teaching-hours-attendance",
      performed_start_date: "2025-01-15",
      performed_end_date: "2025-12-15",
      performed_hours: 225,
      payment_source_references: [
        "2025-Taylor-service-award-actual-disbursement",
      ],
    }],
    reporting: issued
      ? {
        kind: "w2_box1",
        w2_source_document_reference: grantW2Ref,
        w2_box1_wages: 8000,
        payroll_allocation_record_reference:
          "2025-Taylor-service-receipt-payroll-allocation",
      }
      : {
        kind: "schedule1_line8r",
        amount_reported_in_w2_box1: 0,
        reporting_review_record_reference:
          "2025-Taylor-service-award-not-in-W2-review",
      },
  };
  const nonservice = {
    kind: "scholarship_not_on_w2",
    tax_year: 2025,
    student_ssn: studentSsn,
    source_document_reference: "2025-Taylor-nonservice-room-board-award",
    taxable_amount: 3000,
    payer_name: school.name,
    scholarship_terms_record_id:
      "2025-Taylor-award-permits-room-board-no-service",
    taxable_allocation_record_id:
      "2025-Taylor-3000-taxable-room-board-allocation",
    nonqualified_expenses_paid: 3000,
    nonqualified_expense_payment_record_ids: [
      "2025-Taylor-actual-room-board-scholarship-payment",
    ],
    scholarship_disbursement_sources: [{
      source_document_reference:
        "2025-Taylor-nonservice-award-paid-disbursement",
      grant_source_reference: "2025-Taylor-nonservice-room-board-award",
      student_ssn: studentSsn,
      payer_name: school.name,
      payment_date: "2025-08-20",
      amount: 3000,
    }],
    nonqualified_expense_payment_sources: [{
      payment_record_id: "2025-Taylor-actual-room-board-scholarship-payment",
      student_ssn: studentSsn,
      payee_name: "Taylor Campus Housing",
      category: "room_board",
      payment_date: "2025-09-01",
      amount: 3000,
    }],
  };
  w.form1098t_box5_scholarships = 11500;
  w.issued_form1098t_source.box5_scholarships = 11500;
  Object.assign(w.payment_sources[0], {
    payer_ssn: ssn,
    payment_date: "2025-08-15",
    payment_account_record_reference: "2025-parent-bank-paid-Taylor-tuition",
  });
  w.assistance_sources[0].included_in_form1098t_box5 = true;
  w.assistance_sources.push({
    student_ssn: studentSsn,
    institution_name: school.name,
    tax_year: 2025,
    source_document_reference: "2025-Taylor-service-award-school-ledger",
    amount: 8000,
    tax_treatment: "taxable",
    included_in_form1098t_box5: true,
    required_service_compensation: true,
    required_service_terms_record_reference: terms,
    student_income_source_reference: grantRef,
  }, {
    student_ssn: studentSsn,
    institution_name: school.name,
    tax_year: 2025,
    source_document_reference: "2025-Taylor-nonservice-award-school-ledger",
    amount: 3000,
    tax_treatment: "taxable",
    included_in_form1098t_box5: true,
    taxable_nonservice_scholarship: true,
    scholarship_terms_record_reference: nonservice.scholarship_terms_record_id,
    taxable_allocation_record_reference:
      nonservice.taxable_allocation_record_id,
    student_income_source_reference: nonservice.source_document_reference,
  });
  const ordinaryW2 = {
    ...parent.w2[0],
    source_document_reference: "2025-Taylor-issued-part-time-W2",
    employee_ssn: studentSsn,
    box1_wages: 2000,
    box2_fed_withheld: 100,
    box3_ss_wages: 2000,
    box4_ss_withheld: 124,
    box5_medicare_wages: 2000,
    box6_medicare_withheld: 29,
  };
  const grantW2 = {
    ...ordinaryW2,
    source_document_reference: grantW2Ref,
    employer_name: school.name,
    employer_ein: school.ein,
    box1_wages: 8000,
    box2_fed_withheld: 200,
    box3_ss_wages: 8000,
    box4_ss_withheld: 496,
    box5_medicare_wages: 8000,
    box6_medicare_withheld: 116,
  };
  const wages = issued ? [ordinaryW2, grantW2] : [ordinaryW2];
  const review = {
    tax_year: 2025,
    source_document_reference: "2025-Taylor-parent-child-source-claim-review",
    student_ssn: studentSsn,
    student_dob: "2005-06-15",
    education_claimant_ssn: ssn,
    dependency_record_reference:
      student.ownership_review.dependency_record_reference,
    actual_parent_claim_record_reference:
      student.ownership_review.competing_claim_review_reference,
    no_student_education_credit: true,
    full_time_enrollment_record_reference:
      "2025-Taylor-full-time-five-month-record",
    full_time_student_months: [1, 2, 3, 4, 5],
    student_income_sources: [grant, nonservice],
    student_w2_sources: wages.map((r) => ({
      source_document_reference: r.source_document_reference,
      employee_ssn: r.employee_ssn,
      employer_ein: r.employer_ein,
      box1_wages: r.box1_wages,
    })),
    school_sources: [{ institution: school, workpaper: w }],
    support_sources: [{
      source_document_reference: "2025-parent-paid-Taylor-housing-food",
      student_ssn: studentSsn,
      payer_ssn: ssn,
      kind: "ordinary_support",
      amount: 20000,
    }, {
      source_document_reference: w.payment_record_ids[0],
      student_ssn: studentSsn,
      payer_ssn: ssn,
      kind: "ordinary_support",
      amount: 4500,
    }, {
      source_document_reference: "2025-Taylor-personal-paid-support",
      student_ssn: studentSsn,
      payer_ssn: studentSsn,
      kind: "ordinary_support",
      amount: 8000,
    }, {
      source_document_reference:
        nonservice.nonqualified_expense_payment_record_ids[0],
      student_ssn: studentSsn,
      payer_ssn: studentSsn,
      kind: "scholarship_support",
      amount: 3000,
    }],
  };
  if (studentPaid) {
    const payment = "2025-Taylor-student-bank-paid-tuition";
    w.payment_record_ids = [payment];
    w.payment_sources[0].payment_record_id = payment;
    w.payment_sources[0].payer_ssn = studentSsn;
    w.payment_sources[0].payment_account_record_reference =
      "2025-Taylor-owned-bank-tuition-debit";
    review.support_sources[1].source_document_reference = payment;
    review.support_sources[1].payer_ssn = studentSsn;
    review.support_sources[2].amount = 4000;
  }
  const child = {
    general: {
      ...parent.general,
      taxpayer_ssn: studentSsn,
      taxpayer_dob: "2005-06-15",
      taxpayer_can_be_claimed_as_dependent: true,
      taxpayer_claimed_as_dependent: true,
      dependents: [],
      dependent_education_income_review: review,
    },
    w2: wages,
    education_income: [grant, nonservice],
  };
  const childFiler = { ...filer, primarySSN: studentSsn, firstName: "Taylor" };
  const childResult = f1040_2025.executeReturn(child);
  assertEquals(childResult.diagnostics, []);
  student.ownership_review.dependent_student_income_return = {
    source_document_reference: "2025-Taylor-finalized-owned-income-return",
    student_claim_review: review,
    pending: childResult.pending,
  };
  return {
    parent,
    child,
    childFiler,
    review,
    student,
    childPending: childResult.pending,
  };
}
for (
  const { issued, studentPaid } of [{ issued: true, studentPaid: false }, {
    issued: false,
    studentPaid: false,
  }, { issued: true, studentPaid: true }]
) {
  Deno.test(`parent and dependent ${issued ? "issued-W2" : "line8r"} ${studentPaid ? "student-paid" : "parent-paid"} service/nonservice scholarships reconcile separate source-owned full returns`, async () => {
    const p = paired(issued, studentPaid);
    assertEquals(
      p.student.education_expense_workpaper.payment_sources[0].payer_ssn,
      studentPaid ? childSsns[0] : ssn,
    );
    if (studentPaid) assertEquals(p.review.support_sources[2].amount, 4000);
    assertEquals((p.child.general as any).dependent_earned_income, undefined);
    assertEquals(
      dependentScholarshipEarned(
        dependentScholarshipReviewSchema.parse(p.review),
      ),
      13000,
    );
    const child = p.childPending;
    assertEquals(child.f1040.line1a_wages, issued ? 10000 : 2000);
    assertEquals(
      child.schedule1.line8r_taxable_scholarships,
      issued ? 3000 : 11000,
    );
    assertEquals(child.f1040.line11_agi, 13000);
    assertEquals(child.f1040.line12a_standard_deduction, 13450);
    assertEquals(child.f1040.line15_taxable_income, 0);
    assertEquals(child.f1040.line24_total_tax, 0);
    assertEquals(child.f1040.line29_refundable_aoc ?? 0, 0);
    assertEquals(child.f1040.line35a_refund, issued ? 300 : 100);
    const parentResult = f1040_2025.executeReturn(p.parent);
    assertEquals(parentResult.diagnostics, []);
    const parent = parentResult.pending;
    assertEquals(parent.f1040.line11_agi, 75000);
    assertEquals(parent.f1040.line8_additional_income ?? 0, 0);
    assertEquals(parent.f1040.line18_total_tax_before_credits, 7955);
    assertEquals(parent.f1040.line29_refundable_aoc, 1000);
    assertEquals(parent.schedule3.line3_education_credit, 1500);
    assertEquals(parent.f1040.line19_child_tax_credit, 500);
    assertEquals(parent.f1040.line24_total_tax, 5955);
    assertEquals((parent.f1040.dependent_details as unknown[]).length, 1);
    const projected = form8863Pdf.instances!(parent.f8863, filer, parent)[0];
    assertEquals(projected.pdf_under24, false);
    for (
      const [owner, pending, identity, inputs, pages] of [[
        "parent",
        parent,
        filer,
        p.parent,
        7,
      ], ["child", child, p.childFiler, p.child, 4]] as const
    ) {
      const packet = await f1040_2025.prepareReturn(pending, identity);
      assertEquals(packet.bundle.xml.includes("<IRS8863"), owner === "parent");
      assertEquals(
        packet.bundle.xml.includes("<GrantsOrScholarshipsAmt>"),
        owner === "child",
      );
      if (owner === "child") {
        assertStringIncludes(
          packet.bundle.xml,
          `<GrantsOrScholarshipsAmt>${
            issued ? 3000 : 11000
          }</GrantsOrScholarshipsAmt>`,
        );
      }
      const tmp = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(tmp, packet.bundle.xml);
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, tmp],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      } finally {
        await Deno.remove(tmp);
      }
      const pdf = await packet.renderPdf();
      const document = await PDFDocument.load(pdf);
      assertEquals(document.getForm().getFields().length, 0);
      assertEquals(document.getPageCount(), pages);
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir = "/tmp/opentax-f8863-parent-child-scholarship-evidence";
        const stem = `${
          issued ? studentPaid ? "w2-student-paid" : "w2" : "line8r"
        }-${owner}`;
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(
          `${dir}/${stem}-source-input.json`,
          JSON.stringify({ inputs, filer: identity }, null, 2),
        );
        await Deno.writeTextFile(
          `${dir}/${stem}-full-return.xml`,
          packet.bundle.xml,
        );
        await Deno.writeFile(`${dir}/${stem}-filled-return.pdf`, pdf);
      }
    }
  });
}
Deno.test("parent scholarship claim rejects detached child destination, aid/expense copies and duplicate credits in native/PDF/complete export", async () => {
  const source = paired(true);
  const result = f1040_2025.executeReturn(source.parent);
  assertEquals(result.diagnostics, []);
  const changes: Array<(p: any) => void> = [
    (p) =>
      delete p.f8863.f8863s[0].ownership_review.dependent_student_income_return,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return
        .student_claim_review.education_claimant_ssn = "999887777",
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return
        .student_claim_review.dependency_record_reference =
          "detached-parent-dependency",
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return
        .student_claim_review.student_ssn = "999887777",
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .general.taxpayer_ssn = ssn,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .general.taxpayer_claimed_as_dependent = false,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .f1040.line29_refundable_aoc = 1000,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .f8863 = p.f8863,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .f1040.line11_agi = 75000,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .f1040.line12a_standard_deduction = 2450,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .education_income.education_incomes[0].payment_sources[0].amount = 7999,
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .w2.w2s[1].employee_ssn = ssn,
    (p) =>
      p.f8863.f8863s[0].education_expense_workpaper.issued_form1098t_source
        .box5_scholarships = 500,
    (p) =>
      p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[2]
        .student_income_source_reference = "detached-room-board-award",
    (p) =>
      p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[2]
        .taxable_allocation_record_reference = "detached-taxable-allocation",
    (p) =>
      p.f8863.f8863s[0].education_expense_workpaper.payment_sources[0]
        .payer_ssn = childSsns[0],
    (p) => p.general.dependents[0].provided_over_half_own_support = true,
    (p) => {
      p.general.dependents[0].full_time_student = false;
      p.f1040.dependent_details[0].full_time_student = false;
    },
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return
        .student_claim_review.actual_parent_claim_record_reference =
          "detached-parent-claim-record",
    (p) =>
      p.f8863.f8863s[0].ownership_review.dependent_student_income_return.pending
        .general.taxpayer_dob = "2004-06-15",
    (p) =>
      p.f8863.f8863s[0].ownership_review.no_competing_education_claim = false,
    (p) =>
      p.education_income =
        p.f8863.f8863s[0].ownership_review.dependent_student_income_return
          .pending.education_income,
    (p) => {
      p.schedule1 = {
        ...p.f8863.f8863s[0].ownership_review.dependent_student_income_return
          .pending.schedule1,
      };
      p.f1040.line8_additional_income = 3000;
      p.f1040.line11_agi = 78000;
    },
  ];
  for (const change of changes) {
    const bad: any = structuredClone(result.pending);
    change(bad);
    assertThrows(() => form8863.build(bad.f8863, { filer, pending: bad }));
    assertThrows(() => form8863Pdf.instances!(bad.f8863, filer, bad));
    await assertRejects(() => f1040_2025.prepareReturn(bad, filer));
  }
});
Deno.test("dependent scholarship export rejects changed sources, omitted income, manual deduction and duplicate credit ownership", async () => {
  for (const issued of [true, false]) {
    const source = paired(issued);
    const badInputs: any = structuredClone(source.child);
    badInputs.general.dependent_earned_income = 2000;
    assertEquals(
      f1040_2025.executeReturn(badInputs).diagnostics.length > 0,
      true,
    );
    const changes: Array<(p: any) => void> = [
      (p) =>
        p.general.dependent_education_income_review.student_income_sources[1]
          .taxable_amount = 2999,
      (p) =>
        p.general.dependent_education_income_review.school_sources[0].workpaper
          .assistance_sources[2].tax_treatment = "tax_free",
      (p) =>
        p.general.dependent_education_income_review.school_sources[0].workpaper
          .payment_sources[0].payer_ssn = childSsns[0],
      (p) =>
        p.general.dependent_education_income_review.support_sources[2].amount =
          30000,
      (p) =>
        p.education_income.education_incomes[1]
          .nonqualified_expense_payment_record_ids = [
            p.general.dependent_education_income_review.school_sources[0]
              .workpaper.payment_record_ids[0],
          ],
      (p) => p.education_income.education_incomes[0].student_ssn = ssn,
      (p) => p.schedule1.line8r_taxable_scholarships = 0,
      (p) => p.f1040.line11_agi = 2000,
      (p) => p.f1040.line12a_standard_deduction = 2450,
      (p) => p.f1040.line14_deductions_qbi_total = 2450,
      (p) => p.f1040.line15_taxable_income = 10550,
      (p) => p.f1040.line16_income_tax = 100,
      (p) => {
        p.education_income.education_incomes[1]
          .scholarship_disbursement_sources[0].source_document_reference =
            p.education_income.education_incomes[0].payment_sources[0]
              .source_document_reference;
        p.general.dependent_education_income_review.student_income_sources =
          structuredClone(p.education_income.education_incomes);
      },
      (p) => p.general.taxpayer_claimed_as_dependent = false,
      (p) => p.general.taxpayer_dob = "2004-06-15",
      (p) => p.standard_deduction.dependent_earned_income = 2000,
      (p) =>
        p.education_income.education_incomes[1]
          .scholarship_disbursement_sources[0].amount = 2999,
      (p) =>
        p.education_income.education_incomes[1]
          .nonqualified_expense_payment_sources[0].amount = 2999,
      (p) => p.f1040.taxpayer_can_be_claimed_as_dependent = false,
      (p) => p.f1040.line29_refundable_aoc = 1000,
      (p) => p.schedule3 = { line3_education_credit: 1500 },
      (p) =>
        p.f8863 = structuredClone(
          f1040_2025.executeReturn(source.parent).pending.f8863,
        ),
    ];
    for (const change of changes) {
      const bad: any = structuredClone(source.childPending);
      change(bad);
      assertThrows(() =>
        irs1040.build(bad.f1040, { filer: source.childFiler, pending: bad })
      );
      assertThrows(() =>
        irs1040Pdf.instances!(bad.f1040, source.childFiler, bad)
      );
      await assertRejects(() =>
        f1040_2025.prepareReturn(bad, source.childFiler)
      );
    }
    const attempted: any = structuredClone(source.child);
    attempted.f8863 = [{
      ...source.student,
      ownership_review: {
        ...source.student.ownership_review,
        claimant_ssn: childSsns[0],
        dependency_claim_state: "claimed_on_another_return",
      },
    }];
    attempted.f8863_claimant_review = {
      claimant_review: {
        kind: "age_24_or_older",
        tax_year: 2025,
        claimant_ssn: childSsns[0],
        claimant_dob: "2005-06-15",
        dob_record_reference: "DOB",
        claimant_actually_claimed_as_dependent: true,
        claimant_dependency_record_reference:
          source.review.dependency_record_reference,
      },
    };
    assertEquals(
      f1040_2025.executeReturn(attempted).diagnostics.length > 0,
      true,
    );
  }
});
