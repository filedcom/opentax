import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  serviceBusinessCases,
  serviceBusinessSource,
} from "./form8863-service-business.fixture.ts";
import { filer, ssn } from "./form8863-claimant-source.fixture.ts";
import { claimantReviewSchema } from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import { itemSchema } from "../../../../../nodes/inputs/credits/individual/f8863/index.ts";
import { requiredServiceScholarshipSchema } from "../../../../../nodes/inputs/income/other/education_income/required-service-scholarship.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { form8863Pdf } from "../../../forms/credits/individual/f8863.ts";

const cases = [
  { name: "two-aoc-w2", count: 2, route: "w2", credit: "aoc", below: false },
  {
    name: "two-aoc-line8r",
    count: 2,
    route: "line8r",
    credit: "aoc",
    below: false,
  },
  {
    name: "three-aoc-mixed-half",
    count: 3,
    route: "mixed",
    credit: "aoc",
    below: false,
  },
  {
    name: "three-aoc-mixed-below",
    count: 3,
    route: "mixed",
    credit: "aoc",
    below: true,
  },
  {
    name: "four-aoc-mixed",
    count: 4,
    route: "mixed",
    credit: "aoc",
    below: false,
  },
  {
    name: "four-llc-mixed",
    count: 4,
    route: "mixed",
    credit: "llc",
    below: false,
  },
] as const;

function schoolSource(c: typeof cases[number]) {
  const base = serviceBusinessSource(serviceBusinessCases[0]);
  const original = base.inputs.f8863[0];
  const work = original.education_expense_workpaper;
  const payments = work.payment_sources;
  if (!payments) throw new Error("Expected retained school payments");
  const amounts = c.count === 2
    ? [4000, 4000]
    : c.count === 3
    ? [2000, 2500, 3500]
    : [2000, 2000, 2000, 2000];
  const institutions = amounts.map((_, i) => ({
    ...original.filing_details!.institutions[0],
    name: `Alex Service College ${i + 1}`,
    ein: `33-${1000000 + i}`,
    us_address: {
      line1: `${i + 1} Teaching Road`,
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    current_year_1098t_received: true,
  }));
  const grants = amounts.map((amount, i) => {
    const ref = `school-${i}-grant`;
    const terms = `school-${i}-terms`;
    const paid = c.route === "w2" || (c.route === "mixed" && i % 2 === 0);
    const original = base.inputs.education_income[0];
    return requiredServiceScholarshipSchema.parse({
      ...original,
      source_document_reference: ref,
      taxable_amount: amount,
      payer_name: institutions[i].name,
      payer_ein: institutions[i].ein,
      scholarship_terms_record_reference: terms,
      section117c_exception_review: {
        ...original.section117c_exception_review,
        source_document_reference: `school-${i}-exception-review`,
      },
      payment_sources: original.payment_sources.map((p, j) => ({
        ...p,
        source_document_reference: `${ref}-payment-${j}`,
        grant_source_reference: ref,
        payer_ein: institutions[i].ein,
        amount: amount / 2,
      })),
      required_service_sources: original.required_service_sources.map((
        s,
        j,
      ) => ({
        ...s,
        source_document_reference: `${ref}-performance-${j}`,
        grant_source_reference: ref,
        payer_ein: institutions[i].ein,
        service_condition_record_reference: terms,
        performance_record_reference: `${ref}-hours-${j}`,
        payment_source_references: [`${ref}-payment-${j}`],
      })),
      reporting: paid
        ? {
          kind: "w2_box1",
          w2_source_document_reference: `${ref}-w2`,
          w2_box1_wages: amount,
          payroll_allocation_record_reference: `${ref}-payroll`,
        }
        : {
          kind: "schedule1_line8r",
          amount_reported_in_w2_box1: 0,
          reporting_review_record_reference: `${ref}-no-w2`,
        },
    });
  });
  const wages = [
    base.inputs.w2[0],
    ...grants.flatMap((g, i) =>
      g.reporting.kind === "w2_box1"
        ? [w2ItemSchema.parse({
          ...base.inputs.w2[0],
          source_document_reference: g.reporting.w2_source_document_reference,
          employer_name: g.payer_name,
          employer_ein: g.payer_ein,
          employer_address_line1: institutions[i].us_address.line1,
          employer_address_city: institutions[i].us_address.city,
          employer_address_state: institutions[i].us_address.state,
          employer_address_zip: institutions[i].us_address.zip,
          box1_wages: g.taxable_amount,
          box2_fed_withheld: 0,
          box3_ss_wages: g.taxable_amount,
          box4_ss_withheld: g.taxable_amount * .062,
          box5_medicare_wages: g.taxable_amount,
          box6_medicare_withheld: g.taxable_amount * .0145,
        })]
        : []
    ),
  ];
  if (base.review.kind !== "under_24") {
    throw new Error("Expected under-24 claimant");
  }
  const review = claimantReviewSchema.parse({
    ...base.review,
    earned_income_w2_sources: wages.map((w) => ({
      source_document_reference: w.source_document_reference,
      employee_ssn: ssn,
      employer_ein: w.employer_ein,
      box1_wages: w.box1_wages,
      box3_ss_wages: w.box3_ss_wages,
      box7_ss_tips: 0,
    })),
    earned_income_service_scholarship_sources: grants,
    support_sources: base.review.support_sources.map((s, i) => ({
      ...s,
      amount: i === 0
        ? (5272860 + (c.below ? 2 : 0)) / 100 - c.count * 3000
        : i === 1
        ? c.count * 3000
        : c.count * 500,
    })),
  });
  const student = itemSchema.parse({
    ...original,
    credit_type: c.credit,
    aoc_adjusted_expenses: c.credit === "aoc" ? c.count * 2500 : undefined,
    llc_adjusted_expenses: c.credit === "llc" ? c.count * 2500 : undefined,
    aoc_claimed_4_prior_years: c.credit === "llc",
    enrolled_half_time: c.credit === "aoc" ? true : undefined,
    completed_4_years_postsec: c.credit === "aoc" ? false : undefined,
    felony_drug_conviction: c.credit === "aoc" ? false : undefined,
    education_expense_workpaper: undefined,
    filing_details: { ...original.filing_details, institutions },
    institution_expense_workpapers: institutions.map((school, i) => ({
      institution_name: school.name,
      institution_ein: school.ein,
      workpaper: {
        ...work,
        form1098t_document_id: `school-${i}-1098t`,
        form1098t_box1_payments: 3000,
        form1098t_box5_scholarships: 500 + amounts[i],
        paid_tuition_required_fees: 3000,
        issued_form1098t_source: {
          ...work.issued_form1098t_source,
          institution_name: school.name,
          institution_ein: school.ein,
          document_id: `school-${i}-1098t`,
          box1_payments: 3000,
          box5_scholarships: 500 + amounts[i],
        },
        payment_record_ids: [`school-${i}-tuition`],
        payment_sources: payments.map((p) => ({
          ...p,
          institution_name: school.name,
          payment_record_id: `school-${i}-tuition`,
          amount: 3000,
        })),
        assistance_sources: work.assistance_sources.map((a) => ({
          ...a,
          institution_name: school.name,
          source_document_reference: `school-${i}-${a.tax_treatment}-ledger`,
          amount: a.tax_treatment === "tax_free" ? 500 : amounts[i],
          ...(a.tax_treatment === "taxable"
            ? {
              student_income_source_reference:
                grants[i].source_document_reference,
              required_service_terms_record_reference:
                grants[i].scholarship_terms_record_reference,
            }
            : {}),
        })),
      },
    })),
  });
  const inputs = {
    ...base.inputs,
    w2: wages,
    education_income: grants,
    f8863: [student],
    f8863_claimant_review: { claimant_review: review },
  };
  const education = c.credit === "llc" ? 2000 : c.below ? 2500 : 1500;
  const refundable = c.credit === "aoc" && !c.below ? 1000 : 0;
  const tax = 2711 - education + 4238;
  return {
    inputs,
    student,
    grants,
    review,
    expected: {
      agi: 45881,
      ordinaryTax: 2711,
      education,
      refundable,
      tax,
      refund: 5000 + refundable - tax,
      ctc: 0,
      actc: 0,
      wages: wages.reduce((n, w) => n + w.box1_wages, 0),
      scholarship: grants.reduce(
        (n, g) =>
          n + (g.reporting.kind === "schedule1_line8r" ? g.taxable_amount : 0),
        0,
      ),
      institutions: c.count,
      credit: c.credit,
    },
  };
}

for (const c of cases) {
  Deno.test(`multi-school service awards ${c.name} join owned income and complete education packet`, async () => {
    const s = schoolSource(c);
    const result = f1040_2025.executeReturn(s.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const f = pending.f1040!;
    assertEquals([
      f.line11_agi,
      f.line18_total_tax_before_credits,
      pending.schedule3?.line3_education_credit,
      f.line29_refundable_aoc ?? 0,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      s.expected.agi,
      s.expected.ordinaryTax,
      s.expected.education,
      s.expected.refundable,
      s.expected.tax,
      s.expected.refund,
    ]);
    assertEquals(f.line1a_wages, s.expected.wages);
    assertEquals(
      pending.schedule1?.line8r_taxable_scholarships ?? 0,
      s.expected.scholarship,
    );
    const instances = form8863Pdf.instances!(
      pending.f8863!,
      filer,
      result.pending,
    );
    assertEquals(instances.length, Math.ceil(c.count / 2));
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    for (const institution of s.student.filing_details!.institutions) {
      assertStringIncludes(bundle.xml, institution.name);
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const workpapers = s.student.institution_expense_workpapers!;
    const retainedWages = pending.w2?.w2s;
    if (!retainedWages) throw new Error("Expected retained wage inventory");
    const variants = [
      {
        ...pending,
        w2: {
          w2s: retainedWages.map((w, i) =>
            i === retainedWages.length - 1
              ? { ...w, employee_ssn: "999887777" }
              : w
          ),
        },
      },
      {
        ...pending,
        f8863: {
          ...pending.f8863!,
          f8863s: [{
            ...s.student,
            institution_expense_workpapers: workpapers.map((w, i) =>
              i ? w : {
                ...w,
                workpaper: {
                  ...w.workpaper,
                  assistance_sources: w.workpaper.assistance_sources!.map(
                    (a) =>
                      a.tax_treatment === "taxable"
                        ? {
                          ...a,
                          student_income_source_reference:
                            s.grants[1].source_document_reference,
                        }
                        : a,
                  ),
                },
              }
            ),
          }],
        },
      },
      {
        ...pending,
        education_income: { education_incomes: s.grants.slice(1) },
      },
      {
        ...pending,
        education_income: {
          education_incomes: s.grants.map((g, i) =>
            i ? g : { ...g, payer_ein: s.grants[1].payer_ein }
          ),
        },
      },
      {
        ...pending,
        f8863: {
          ...pending.f8863!,
          f8863s: [{
            ...s.student,
            institution_expense_workpapers: workpapers.slice(1),
          }],
        },
      },
      {
        ...pending,
        f1040: { ...f, line29_refundable_aoc: s.expected.refundable + 1 },
      },
    ];
    for (const changed of variants) {
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir =
        `.state/research/form8863-service-schools-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", s.inputs],
          ["pending", result.pending],
          ["expected", s.expected],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
