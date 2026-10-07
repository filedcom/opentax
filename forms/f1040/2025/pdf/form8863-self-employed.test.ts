import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { filer, fixture, ssn } from "./form8863-claimant-source.fixture.ts";
import { f1040_2025 } from "../index.ts";
import { inputSchema } from "../../nodes/inputs/f8863/index.ts";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../nodes/inputs/f8863/claimant-review.ts";
import { reviewedBusinessIncome } from "../../nodes/inputs/f8863/business-review.ts";
import { form8863 } from "../mef/forms/f8863.ts";
import { form8863Pdf } from "./forms/f8863.ts";

const kinds = [
  "business-half",
  "business-below",
  "mixed-half",
  "mixed-below",
  "mixed-child-credit",
] as const;
type Kind = typeof kinds[number];
function businessFixture(kind: Kind) {
  const source = fixture("student-scholarship");
  const mixed = kind.startsWith("mixed");
  const child = kind === "mixed-child-credit";
  const restricted = kind.endsWith("below");
  const wages = mixed ? 10000 : 0;
  const profit = mixed ? 20000 : 30000;
  const deduction = mixed ? 1413 : 2119;
  const seTax = mixed ? 2826 : 4238;
  const earned = wages + profit - deduction;
  const magi = earned + 8000;
  const c = {
    business_reference: "2025-Alex-tutoring",
    proprietor_recipient: "T" as const,
    line_a_principal_business: "Academic tutoring",
    line_b_business_code: "611691",
    line_c_business_name: "Alex Tutoring",
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    qbi_no_other_adjustments_confirmed: true,
    qbi_specified_service: false,
    line_1_gross_receipts: profit + 6000,
    line_8_advertising: 2000,
    line_18_office_expense: 1500,
    line_22_supplies: 2500,
  };
  const review: any = structuredClone(source.review);
  review.earned_income_w2_sources = mixed
    ? [{
      ...review.earned_income_w2_sources[0],
      box1_wages: wages,
      box3_ss_wages: wages,
      box7_ss_tips: 0,
    }]
    : [];
  review.support_sources[0].amount = earned * 2 - 4500 + (restricted ? 2 : 0);
  review.earned_income_business_sources = [{
    tax_year: 2025,
    owner_ssn: ssn,
    business_reference: c.business_reference,
    ownership_record_reference: "2025-Alex-sole-proprietorship-record",
    income_producing_factors: "personal_services_without_material_capital",
    personal_services_record_reference: "2025-Alex-tutoring-delivery-and-hours",
    capital_review_record_reference:
      "2025-Alex-tutoring-capital-not-material-review",
    schedule_c_source: c,
    receipt_sources: [{
      source_document_reference: "2025-Alex-tutoring-paid-client-invoices",
      owner_ssn: ssn,
      business_reference: c.business_reference,
      schedule_c_field: "line_1_gross_receipts",
      amount: profit + 6000,
    }],
    cost_sources: [["line_8_advertising", 2000], [
      "line_18_office_expense",
      1500,
    ], ["line_22_supplies", 2500]].map(([field, amount]) => ({
      source_document_reference: `2025-Alex-tutoring-${field}-paid-invoices`,
      owner_ssn: ssn,
      business_reference: c.business_reference,
      schedule_c_field: field,
      amount,
    })),
  }];
  const general: any = {
    ...source.inputs.general,
    taxpayer_can_be_claimed_as_dependent: !child,
    dependent_earned_income: earned + 8000,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
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
  const student: any = structuredClone(source.inputs.f8863[0]);
  student.filer_magi = magi;
  student.ownership_review.student_can_be_claimed_as_dependent = !child;
  if (child) {
    delete student.ownership_review.eligible_parent_ssn;
    delete student.ownership_review.parent_nonclaim_record_reference;
  }
  const w2: any = mixed
    ? [{
      ...source.inputs.w2[0],
      box1_wages: wages,
      box3_ss_wages: wages,
      box4_ss_withheld: 620,
      box5_medicare_wages: wages,
      box6_medicare_withheld: 145,
      box7_ss_tips: 0,
    }]
    : [];
  const inputs: any = {
    ...source.inputs,
    general,
    w2,
    schedule_c: [c],
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
  const education = Math.min(tax, restricted ? 2500 : 1500);
  if (child) {
    inputs.f8812 = [{
      qualifying_children_count: 1,
      other_dependents_count: 0,
      filing_status: "single",
      agi: magi,
      income_tax_liability: tax,
      earned_income: earned,
      line18a_earned_income: earned,
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
    profit,
    deduction,
    seTax,
    earned,
    magi,
    tax,
    education,
    restricted,
    mixed,
    child,
  };
}
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const kind of kinds) {
  Deno.test(`self-employed student ${kind} owned sources reconcile support, SE, AGI, QBI, education and full XSD/PDF`, async () => {
    const source = businessFixture(kind);
    assertEquals(source.tax, source.mixed ? 1817 : 1697);
    const review = claimantReviewSchema.parse(source.review);
    assertEquals(review.kind, "under_24");
    if (review.kind !== "under_24") throw new Error("young source");
    const derived = reviewedBusinessIncome(
      review.earned_income_business_sources!,
      review.earned_income_w2_sources,
      ssn,
    );
    assertEquals(derived.profit, source.profit);
    assertEquals(derived.deduction, source.deduction);
    assertEquals(derived.earned, source.earned);
    assertEquals(
      claimantRefundRestriction(review, "single"),
      source.restricted,
    );
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const pending = result.pending;
    assertEquals(pending.schedule1.line3_schedule_c, source.profit);
    assertEquals(pending.schedule1.line15_se_deduction, source.deduction);
    assertEquals(pending.schedule1.line8r_taxable_scholarships, 8000);
    assertEquals(pending.schedule2.line4_se_tax, source.seTax);
    assertEquals(pending.f1040.line11_agi, source.magi);
    assertEquals(
      pending.f1040.line29_refundable_aoc ?? 0,
      source.restricted ? 0 : 1000,
    );
    assertEquals(pending.schedule3.line3_education_credit, source.education);
    const qbi = Math.min(
      Math.round((source.profit - source.deduction) * .2),
      Math.round((source.magi - 15750) * .2),
    );
    assertEquals(pending.f1040.line13_qbi_deduction, qbi);
    const ctc = source.child
      ? Math.min(2200, source.tax - source.education)
      : 0;
    assertEquals(pending.f1040.line19_child_tax_credit ?? 0, ctc);
    assertEquals(pending.f1040.line28_actc ?? 0, source.child ? 1700 : 0);
    assertEquals(
      pending.f1040.line24_total_tax,
      source.tax - source.education - ctc + source.seTax,
    );
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      "<NetNonFarmProfitLossAmt>" + source.profit +
        "</NetNonFarmProfitLossAmt>",
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<GrantsOrScholarshipsAmt>8000</GrantsOrScholarshipsAmt>",
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
    assertEquals(doc.getPageCount(), source.child ? 16 : 14);
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-f8863-self-employed-evidence";
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

Deno.test("self-employed student rejects changed ownership, receipt/cost copies and detached filed income", async () => {
  const source = businessFixture("mixed-child-credit");
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const changes: Array<(p: any) => void> = [
    (p) => {
      p.f8863.claimant_review.earned_income_business_sources[0].owner_ssn =
        "999887777";
    },
    (p) => {
      p.f8863.claimant_review.earned_income_business_sources[0]
        .receipt_sources[0].owner_ssn = "999887777";
    },
    (p) => {
      p.f8863.claimant_review.earned_income_business_sources[0].cost_sources[0]
        .amount = 1999;
    },
    (p) => {
      p.f8863.claimant_review.earned_income_business_sources[0].cost_sources[0]
        .business_reference = "detached-business";
    },
    (p) => {
      p.f8863.claimant_review.earned_income_business_sources[0].cost_sources[1]
        .source_document_reference =
          p.f8863.claimant_review.earned_income_business_sources[0]
            .cost_sources[0].source_document_reference;
    },
    (p) => {
      p.schedule_c.schedule_cs[0].proprietor_recipient = "S";
    },
    (p) => {
      p.schedule_c.schedule_cs[0].line_1_gross_receipts = 26001;
    },
    (p) => {
      p.schedule_c.schedule_cs[0].line_22_supplies = 2501;
    },
    (p) => {
      delete p.schedule_c;
    },
    (p) => {
      delete p.f8863.claimant_review.earned_income_business_sources;
    },
    (p) => {
      p.schedule_se.net_profit_schedule_c = 20001;
    },
    (p) => {
      p.schedule_se.w2_ss_wages = 10001;
    },
    (p) => {
      p.schedule1.line3_schedule_c = 20001;
    },
    (p) => {
      p.schedule1.line15_se_deduction = 1414;
    },
    (p) => {
      p.schedule2.line4_se_tax = 2827;
    },
    (p) => {
      p.agi_aggregator.line3_schedule_c = 20001;
    },
    (p) => {
      p.form8995.qbi_from_schedule_c = 20001;
    },
    (p) => {
      p.form8995.se_tax_deduction = 1414;
    },
    (p) => {
      p.f1040.line11_agi = source.magi + 1;
    },
    (p) => {
      p.f8863.claimant_review.earned_income_w2_sources[0].box3_ss_wages = 10001;
    },
    (p) => {
      p.w2.w2s[0].box3_ss_wages = 10001;
    },
  ];
  for (const change of changes) {
    const p = structuredClone(result.pending);
    change(p);
    assertThrows(() =>
      form8863.build(inputSchema.parse(p.f8863), { pending: p, filer })
    );
    assertThrows(() => form8863Pdf.instances!(p.f8863, filer, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, filer));
  }
  for (
    const change of [
      (p: any) => {
        p.f1040.line13_qbi_deduction = 1;
      },
      (p: any) => {
        p.f1040.line18_total_tax_before_credits += 1;
      },
      (p: any) => {
        p.f1040.line9_total_income += 1;
      },
      (p: any) => {
        p.f1040.line19_child_tax_credit += 1;
      },
      (p: any) => {
        p.f8812.f8812s[0].credit_limit_worksheet.schedule3_line3 -= 1;
      },
    ]
  ) {
    const p = structuredClone(result.pending);
    change(p);
    await assertRejects(() => f1040_2025.prepareReturn(p, filer));
  }
});
