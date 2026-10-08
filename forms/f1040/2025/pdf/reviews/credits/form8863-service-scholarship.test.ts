import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  filer,
  fixture,
  ssn,
  wageReference,
} from "./form8863-claimant-source.fixture.ts";
import { f1040_2025 } from "../../../index.ts";
import { inputSchema } from "../../../../nodes/inputs/f8863/index.ts";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../../../nodes/inputs/f8863/claimant-review.ts";
import {
  requiredServiceScholarshipEarned,
  requiredServiceScholarshipSchema,
} from "../../../../nodes/inputs/education_income/required-service-scholarship.ts";
import { form8863 } from "../../../mef/forms/credits/f8863.ts";
import { form8863Pdf } from "../../forms/credits/f8863.ts";
const kinds = [
  "w2-half",
  "w2-below",
  "line8r-half",
  "line8r-below",
  "nonservice-control",
  "w2-child-credit",
  "line8r-phaseout",
] as const;
type Kind = typeof kinds[number];
function serviceFixture(kind: Kind) {
  const base: any = fixture("student-scholarship");
  const issued = kind.startsWith("w2");
  const child = kind === "w2-child-credit";
  const phaseout = kind === "line8r-phaseout";
  const nonservice = kind === "nonservice-control";
  const ordinaryWages = phaseout ? 71000 : 18000;
  const earned = ordinaryWages + (nonservice ? 0 : 8000);
  const magi = ordinaryWages + 16000;
  const restricted = kind.endsWith("below") || nonservice;
  const supportCents = (ordinaryWages + 8000) * 200 +
    (kind.endsWith("below") ? 2 : 0);
  const grantReference = "2025-Alex-required-teaching-service-grant";
  const termsReference = "2025-Alex-award-requires-performed-teaching-terms";
  const grantW2Reference = "2025-Alex-issued-teaching-compensation-W2";
  const payerEin = "32-1111111";
  const grant = {
    kind: "scholarship_for_required_services",
    student_ssn: ssn,
    tax_year: 2025,
    source_document_reference: grantReference,
    taxable_amount: 8000,
    payer_name: "Alex University",
    payer_ein: payerEin,
    scholarship_terms_record_reference: termsReference,
    section117c_exception_review: {
      source_document_reference:
        "2025-Alex-service-grant-no-exempt-program-review",
      national_health_service_corps_program: false,
      armed_forces_health_professions_program: false,
      comprehensive_work_college_program: false,
    },
    payment_sources: [3500, 4500].map((amount, i) => ({
      source_document_reference: `2025-Alex-service-grant-paid-disbursement-${
        i + 1
      }`,
      grant_source_reference: grantReference,
      student_ssn: ssn,
      payer_ein: payerEin,
      payment_date: i ? "2025-12-20" : "2025-06-01",
      amount,
    })),
    required_service_sources: [1, 2].map((i) => ({
      source_document_reference: `2025-Alex-performed-teaching-source-${i}`,
      grant_source_reference: grantReference,
      student_ssn: ssn,
      payer_ein: payerEin,
      service_kind: "teaching",
      required_as_condition_of_award: true,
      service_condition_record_reference: termsReference,
      performance_record_reference:
        `2025-Alex-actual-teaching-attendance-hours-${i}`,
      performed_start_date: i === 1 ? "2025-01-15" : "2025-08-15",
      performed_end_date: i === 1 ? "2025-05-31" : "2025-12-15",
      performed_hours: i === 1 ? 100 : 125,
      payment_source_references: [
        `2025-Alex-service-grant-paid-disbursement-${i}`,
      ],
    })),
    reporting: issued
      ? {
        kind: "w2_box1",
        w2_source_document_reference: grantW2Reference,
        w2_box1_wages: 8000,
        payroll_allocation_record_reference:
          "2025-Alex-grant-disbursements-to-W2-allocation",
      }
      : {
        kind: "schedule1_line8r",
        amount_reported_in_w2_box1: 0,
        reporting_review_record_reference:
          "2025-Alex-service-compensation-not-in-issued-W2-box1-review",
      },
  };
  const review: any = structuredClone(base.review);
  review.earned_income_w2_sources[0].box1_wages = ordinaryWages;
  if (issued) {
    review.earned_income_w2_sources.push({
      source_document_reference: grantW2Reference,
      employee_ssn: ssn,
      employer_ein: payerEin,
      box1_wages: 8000,
    });
  }
  if (!nonservice) review.earned_income_service_scholarship_sources = [grant];
  review.support_sources[0].amount = (supportCents - 450000) / 100;
  review.support_sources[2].amount = nonservice ? 16500 : 8500;
  const general: any = {
    ...base.inputs.general,
    taxpayer_can_be_claimed_as_dependent: !child,
    dependent_earned_income: magi,
    dependents: child
      ? [{
        first_name: "Casey",
        last_name: "Example",
        name_control: "EXAM",
        ssn: "222334444",
        dob: "2022-06-15",
        relationship: "daughter",
        irs_relationship_code: "DAUGHTER",
        months_in_home: 12,
        months_lived_with_you_in_us: 12,
        full_time_student: false,
        us_citizen_national_or_resident: true,
        lived_in_us_over_half_year: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
      }]
      : [],
  };
  if (child) delete general.dependent_earned_income;
  const student: any = structuredClone(base.inputs.f8863[0]);
  student.filer_magi = magi;
  student.ownership_review.student_can_be_claimed_as_dependent = !child;
  if (child) {
    delete student.ownership_review.eligible_parent_ssn;
    delete student.ownership_review.parent_nonclaim_record_reference;
  }
  if (!nonservice) {
    const wp = student.education_expense_workpaper;
    wp.form1098t_box5_scholarships = 8500;
    wp.issued_form1098t_source.box5_scholarships = 8500;
    wp.assistance_sources[0].included_in_form1098t_box5 = true;
    wp.assistance_sources.push({
      student_ssn: ssn,
      institution_name: "Alex University",
      tax_year: 2025,
      source_document_reference:
        "2025-Alex-school-ledger-required-service-award",
      amount: 8000,
      tax_treatment: "taxable",
      included_in_form1098t_box5: true,
      required_service_compensation: true,
      student_income_source_reference: grantReference,
      required_service_terms_record_reference: termsReference,
    });
  }
  const wage: any = {
    ...base.inputs.w2[0],
    box1_wages: ordinaryWages,
    box3_ss_wages: ordinaryWages,
    box4_ss_withheld: ordinaryWages * .062,
    box5_medicare_wages: ordinaryWages,
    box6_medicare_withheld: ordinaryWages * .0145,
  };
  const scholarshipWage: any = {
    ...base.inputs.w2[0],
    source_document_reference: grantW2Reference,
    employer_name: "Alex University",
    employer_ein: payerEin,
    box1_wages: 8000,
    box2_fed_withheld: 0,
    box3_ss_wages: 8000,
    box4_ss_withheld: 496,
    box5_medicare_wages: 8000,
    box6_medicare_withheld: 116,
  };
  base.inputs.education_income[0].payer_name = "External Merit Foundation";
  const extraNonservice = {
    ...base.inputs.education_income[0],
    source_document_reference: "2025-Alex-separate-nonservice-room-board-grant",
    nonqualified_expense_payment_record_ids: [
      "2025-Alex-separate-nonservice-room-board-paid",
    ],
    scholarship_terms_record_id: "2025-Alex-separate-nonservice-award-terms",
    taxable_allocation_record_id:
      "2025-Alex-separate-nonservice-taxable-allocation",
  };
  const inputs: any = {
    ...base.inputs,
    general,
    w2: issued ? [wage, scholarshipWage] : [wage],
    education_income: [
      ...base.inputs.education_income,
      nonservice ? extraNonservice : grant,
    ],
    f8863: [student],
    f8863_claimant_review: { claimant_review: review },
  };
  const previewInputs = structuredClone(inputs);
  delete previewInputs.f8863;
  delete previewInputs.f8863_claimant_review;
  delete previewInputs.f8863_credit_limit_worksheet;
  previewInputs.general.dependents = [];
  const preview = f1040_2025.executeReturn(previewInputs);
  assertEquals(preview.diagnostics, []);
  const tax = Number(preview.pending.f1040.line18_total_tax_before_credits);
  inputs.f8863_credit_limit_worksheet.credit_limit_worksheet
    .form1040_line18_tax = tax;
  const credit = phaseout ? 750 : 2500;
  const education = Math.min(tax, restricted ? credit : credit * .6);
  if (child) {
    inputs.f8812 = [{
      filing_status: "single",
      agi: magi,
      income_tax_liability: tax,
      earned_income: earned,
      line18a_earned_income: earned,
      qualifying_children_count: 1,
      other_dependents_count: 0,
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: 0,
        schedule3_line3: education,
        schedule3_line4: 0,
        schedule3_line5b: 0,
        schedule3_line6d: 0,
        schedule3_line6f: 0,
        schedule3_line6l: 0,
        schedule3_line6m: 0,
        worksheet_b_applies: false,
      },
    }];
  }
  return {
    inputs,
    review,
    issued,
    child,
    phaseout,
    nonservice,
    ordinaryWages,
    earned,
    magi,
    tax,
    credit,
    education,
    restricted,
    supportCents,
  };
}
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const kind of kinds) {
  Deno.test(`required-service scholarship ${kind} actual receipts, compensation, income and support file full XSD/PDF`, async () => {
    const source = serviceFixture(kind);
    assertEquals(source.tax, source.phaseout ? 10595 : 1955);
    const review = claimantReviewSchema.parse(source.review);
    if (review.kind !== "under_24") throw new Error("young claimant");
    const grantEarned = requiredServiceScholarshipEarned(
      review.earned_income_service_scholarship_sources ?? [],
      ssn,
    );
    assertEquals(grantEarned, source.issued || source.nonservice ? 0 : 8000);
    const earned = review.earned_income_w2_sources.reduce((sum, row) =>
      sum + row.box1_wages, 0) + grantEarned;
    assertEquals(earned, source.earned);
    assertEquals(
      claimantRefundRestriction(review, "single"),
      source.restricted,
    );
    if (source.phaseout) {
      const before = structuredClone(source.inputs);
      before.education_income.pop();
      delete before.f8863_claimant_review.claimant_review
        .earned_income_service_scholarship_sources;
      before.f8863[0].filer_magi = 79000;
      const wp = before.f8863[0].education_expense_workpaper;
      wp.assistance_sources.pop();
      wp.form1098t_box5_scholarships = 500;
      wp.issued_form1098t_source.box5_scholarships = 500;
      before.f8863_credit_limit_worksheet.credit_limit_worksheet
        .form1040_line18_tax = 8835;
      const prior = f1040_2025.executeReturn(before);
      assertEquals(prior.diagnostics, []);
      assertEquals(prior.pending.f1040.line11_agi, 79000);
      assertEquals(prior.pending.f1040.line18_total_tax_before_credits, 8835);
      assertEquals(prior.pending.schedule3.line3_education_credit, 2500);
      assertEquals(prior.pending.f1040.line29_refundable_aoc ?? 0, 0);
    }
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const p: any = result.pending;
    const wages = source.ordinaryWages + (source.issued ? 8000 : 0);
    const scholarship = source.issued ? 8000 : 16000;
    assertEquals(p.f1040.line1a_wages, wages);
    assertEquals(p.schedule1.line8r_taxable_scholarships, scholarship);
    assertEquals(p.agi_aggregator.line8r_taxable_scholarships, scholarship);
    assertEquals(p.f1040.line8_additional_income, scholarship);
    assertEquals(p.f1040.line9_total_income, source.magi);
    assertEquals(p.f1040.line11_agi, source.magi);
    assertEquals(
      p.f1040.line29_refundable_aoc ?? 0,
      source.restricted ? 0 : source.credit * .4,
    );
    assertEquals(p.schedule3.line3_education_credit, source.education);
    const ctc = source.child ? source.tax - source.education : 0;
    assertEquals(p.f1040.line19_child_tax_credit ?? 0, ctc);
    assertEquals(p.f1040.line28_actc ?? 0, source.child ? 1700 : 0);
    assertEquals(p.f1040.line24_total_tax, source.tax - source.education - ctc);
    if (source.child) {
      assertEquals(
        p.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3,
        source.education,
      );
    }
    const prepared = await f1040_2025.prepareReturn(p, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<GrantsOrScholarshipsAmt>${scholarship}</GrantsOrScholarshipsAmt>`,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        "<RefundableAmerOppCrUnder24Ind>X</RefundableAmerOppCrUnder24Ind>",
      ),
      source.restricted,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, prepared.bundle.xml);
      const validation = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
    } finally {
      await Deno.remove(path);
    }
    const pdf = await prepared.renderPdf();
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(doc.getPageCount(), source.child ? 9 : 7);
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-f8863-service-scholarship-evidence";
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
Deno.test("required-service scholarship rejects detached terms, performance, payer, reporting, income and stale support credit", async () => {
  for (const kind of ["w2-child-credit", "line8r-half"] as const) {
    const source = serviceFixture(kind);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const grant = (p: any) => p.education_income.education_incomes[1];
    const copy = (p: any) =>
      p.f8863.claimant_review.earned_income_service_scholarship_sources[0];
    const both = (p: any, fn: (g: any) => void) => {
      fn(grant(p));
      fn(copy(p));
    };
    const changes: Array<(p: any) => void> = [
      (p) => {
        p.f1040.line18_total_tax_before_credits += 1;
      },
      (p) => {
        p.f1040.line29_refundable_aoc += 1;
      },
      (p) => {
        p.f1040.line8_additional_income -= 1;
      },
      (p) => {
        p.f1040.line1a_wages += 1;
      },
      (p) => {
        p.schedule3.line3_education_credit += 1;
      },

      (p) => {
        delete p.f8863.f8863s[0].education_expense_workpaper
          .issued_form1098t_source;
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[1]
          .student_income_source_reference = "detached-compensation-income";
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[1]
          .required_service_terms_record_reference =
            "detached-compensation-terms";
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[1]
          .amount += 1;
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[1]
          .tax_treatment = "tax_free";
      },
      (p) => {
        delete p.f8863.f8863s[0].education_expense_workpaper
          .assistance_sources[1].required_service_compensation;
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.assistance_sources[1]
          .included_in_form1098t_box5 = false;
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper.issued_form1098t_source
          .box5_scholarships = 500;
      },
      (p) => {
        p.f8863.f8863s[0].education_expense_workpaper
          .tax_free_assistance_applied_to_expenses = 8500;
      },

      (p) => {
        grant(p).student_ssn = "999887777";
      },
      (p) => {
        copy(p).taxable_amount = 8001;
      },
      (p) => {
        both(p, (g) => g.payment_sources[0].student_ssn = "999887777");
      },
      (p) => {
        both(p, (g) => g.payment_sources[0].payer_ein = "99-9999999");
      },
      (p) => {
        both(
          p,
          (g) => g.payment_sources[0].grant_source_reference = "detached-award",
        );
      },
      (p) => {
        both(p, (g) => g.payment_sources[0].amount += 1);
      },
      (p) => {
        both(
          p,
          (g) => g.payment_sources.push(structuredClone(g.payment_sources[0])),
        );
      },
      (p) => {
        both(
          p,
          (g) =>
            g.required_service_sources[0].required_as_condition_of_award =
              false,
        );
      },
      (p) => {
        both(p, (g) => g.required_service_sources[0].student_ssn = "999887777");
      },
      (p) => {
        both(
          p,
          (g) =>
            g.required_service_sources[0].service_condition_record_reference =
              "unrelated-terms",
        );
      },
      (p) => {
        both(
          p,
          (g) =>
            g.required_service_sources[0].payment_source_references = [
              "detached-disbursement",
            ],
        );
      },
      (p) => {
        both(
          p,
          (g) =>
            g.required_service_sources[1].payment_source_references =
              g.required_service_sources[0].payment_source_references,
        );
      },
      (p) => {
        both(p, (g) => g.required_service_sources.pop());
      },
      (p) => {
        both(
          p,
          (g) =>
            g.required_service_sources[0].performed_end_date = "2024-12-31",
        );
      },
      (p) => {
        both(p, (g) => g.required_service_sources[0].performed_hours = 0);
      },
      (p) => {
        both(
          p,
          (g) =>
            g.section117c_exception_review.comprehensive_work_college_program =
              true,
        );
      },
      (p) => {
        delete p.f8863.claimant_review
          .earned_income_service_scholarship_sources;
      },
      (p) => {
        p.education_income.education_incomes.pop();
      },
      (p) => {
        p.schedule1.line8r_taxable_scholarships -= 1;
      },
      (p) => {
        p.agi_aggregator.line8r_taxable_scholarships -= 1;
      },
      (p) => {
        p.f1040.line11_agi += 1;
      },
      (p) => {
        p.f8863.claimant_review.support_sources[0].amount += .02;
      },
    ];
    if (kind.startsWith("w2")) {
      changes.push(
        (p) => {
          both(
            p,
            (g) => g.reporting.w2_source_document_reference = "detached-W2",
          );
        },
        (p) => {
          both(p, (g) => g.reporting.w2_box1_wages += 1);
        },
        (p) => {
          p.w2.w2s[1].employee_ssn = "999887777";
        },
        (p) => {
          p.w2.w2s[1].box1_wages += 1;
        },
        (p) => {
          p.w2.w2s.pop();
        },
      );
    } else {changes.push((p) => {
        both(p, (g) => g.reporting.amount_reported_in_w2_box1 = 8000);
      });}
    changes.push((p) => {
      const duplicate = structuredClone(grant(p));
      duplicate.source_document_reference += "-second-grant";
      for (
        const row of [
          ...duplicate.payment_sources,
          ...duplicate.required_service_sources,
        ]
      ) row.grant_source_reference = duplicate.source_document_reference;
      p.education_income.education_incomes.push(duplicate);
      p.f8863.claimant_review.earned_income_service_scholarship_sources.push(
        structuredClone(duplicate),
      );
    });
    if (kind.startsWith("w2")) {
      changes.push((p) => {
        const duplicate = structuredClone(grant(p));
        duplicate.source_document_reference += "-second-grant";
        for (
          const row of [
            ...duplicate.payment_sources,
            ...duplicate.required_service_sources,
          ]
        ) {
          row.grant_source_reference = duplicate.source_document_reference;
          row.source_document_reference += "-second";
        }
        for (const row of duplicate.required_service_sources) {
          row.performance_record_reference += "-second";
          row.payment_source_references = row.payment_source_references.map((
            ref: string,
          ) => ref + "-second");
        }
        p.education_income.education_incomes.push(duplicate);
        p.f8863.claimant_review.earned_income_service_scholarship_sources.push(
          structuredClone(duplicate),
        );
      });
    }
    for (const change of changes) {
      const p: any = structuredClone(result.pending);
      change(p);
      assertThrows(() =>
        form8863.build(inputSchema.parse(p.f8863), { pending: p, filer })
      );
      assertThrows(() => form8863Pdf.instances!(p.f8863, filer, p));
      await assertRejects(() => f1040_2025.prepareReturn(p, filer));
    }
    const p: any = structuredClone(result.pending);
    p.f1040.line9_total_income += 1;
    await assertRejects(() => f1040_2025.prepareReturn(p, filer));
    if (source.child) {
      const childTax: any = structuredClone(result.pending);
      childTax.f1040.line19_child_tax_credit += 1;
      await assertRejects(() => f1040_2025.prepareReturn(childTax, filer));
      const priorCredit: any = structuredClone(result.pending);
      priorCredit.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3 -= 1;
      await assertRejects(() => f1040_2025.prepareReturn(priorCredit, filer));
    }
  }
  assertThrows(() =>
    requiredServiceScholarshipSchema.parse({
      kind: "scholarship_for_required_services",
      taxable_amount: 8000,
    })
  );
});
