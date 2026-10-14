import { assertEquals, assertRejects } from "@std/assert";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import {
  businessReviewSchema,
  reviewedBusinessIncome,
} from "../../../../../nodes/inputs/credits/individual/f8863/business-review.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { filer, fixture, ssn } from "./form8863-claimant-source.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";

const cases = [
  {
    name: "two-half",
    count: 2,
    wages: 0,
    below: false,
    sstb: false,
    child: false,
  },
  {
    name: "two-below",
    count: 2,
    wages: 0,
    below: true,
    sstb: false,
    child: false,
  },
  {
    name: "three-wage-half",
    count: 3,
    wages: 10000,
    below: false,
    sstb: false,
    child: false,
  },
  {
    name: "three-wage-below",
    count: 3,
    wages: 10000,
    below: true,
    sstb: false,
    child: false,
  },
  {
    name: "two-mixed-sstb",
    count: 2,
    wages: 10000,
    below: false,
    sstb: true,
    child: false,
  },
  {
    name: "three-child-credit",
    count: 3,
    wages: 10000,
    below: false,
    sstb: false,
    child: true,
  },
];
function source(item: typeof cases[number], taxableScholarship: boolean) {
  const base = fixture(
    taxableScholarship ? "student-scholarship" : "student-refundable",
  );
  const wages = item.wages;
  // Independent ordinary Schedule SE: 30000 × .9235 = 27705;
  // 3435 SS + 803 Medicare = 4238; filed half = 2119.
  const agi = wages + 30000 - 2119 + (taxableScholarship ? 8000 : 0);
  const businessEarned = 27881;
  const earned = wages + businessEarned;
  const support = (Math.round(earned * 100) * 2 + (item.below ? 2 : 0)) / 100;
  // IRS TY2025 single tax table: 9700–9750=973; 17700–17750=1889;
  // taxable-scholarship variants: 16100–16150=1697; 24550–24600=2711.
  const ordinaryTax = taxableScholarship
    ? (wages ? 2711 : 1697)
    : (wages ? 1889 : 973);
  const refundable = item.below ? 0 : 1000;
  const education = Math.min(item.below ? 2500 : 1500, ordinaryTax);
  const ctc = item.child ? ordinaryTax - education : 0;
  const actc = item.child ? Math.min(1700, 2200 - ctc) : 0;
  const tax = ordinaryTax - education - ctc + 4238;
  const withholding = wages ? 5000 : 0;
  const refund = Math.max(0, withholding + refundable + actc - tax);
  const owed = Math.max(0, tax - withholding - refundable - actc);
  const businesses = Array.from({ length: item.count }, (_, i) => {
    const reference = `2025-service-${i + 1}`;
    const profit = item.count === 2 ? (i === 0 ? 20000 : 10000) : 10000;
    return businessReviewSchema.parse({
      tax_year: 2025,
      owner_ssn: ssn,
      business_reference: reference,
      ownership_record_reference: `${reference}-ownership`,
      personal_services_record_reference: `${reference}-services`,
      capital_review_record_reference: `${reference}-nonmaterial-capital`,
      income_producing_factors: "personal_services_without_material_capital",
      schedule_c_source: {
        business_reference: reference,
        proprietor_recipient: "T",
        line_a_principal_business: item.sstb && i === 1
          ? "Consulting"
          : "Academic tutoring",
        line_b_business_code: item.sstb && i === 1 ? "541600" : "611691",
        line_c_business_name: `Alex Services ${i + 1}`,
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        qbi_no_other_adjustments_confirmed: true,
        qbi_specified_service: item.sstb && i === 1,
        qbi_se_tax_allocation_review: {
          deduction_amount: item.count === 2
            ? [1412.67, 706.33][i]
            : [706.34, 706.33, 706.33][i],
          allocation_method: "positive_profit_proportion_with_cent_residual",
          reasonable_for_business_facts_confirmed: true,
          consistently_applied_and_books_agree_confirmed: true,
          all_businesses_included_confirmed: true,
          no_aggregation_confirmed: true,
          workpaper_reference: `${reference}-shared-SE-allocation`,
          reviewed_by: "Synthetic source reviewer",
          reviewed_on: "2026-10-09",
        },
        line_1_gross_receipts: profit + 2000,
        line_8_advertising: 2000,
      },
      receipt_sources: [{
        source_document_reference: `${reference}-receipts`,
        owner_ssn: ssn,
        business_reference: reference,
        schedule_c_field: "line_1_gross_receipts",
        amount: profit + 2000,
      }],
      cost_sources: [{
        source_document_reference: `${reference}-advertising`,
        owner_ssn: ssn,
        business_reference: reference,
        schedule_c_field: "line_8_advertising",
        amount: 2000,
      }],
    });
  });
  const originalReview = claimantReviewSchema.parse(base.review);
  if (originalReview.kind !== "under_24") throw new Error("Expected student");
  const wage = w2ItemSchema.parse({
    ...base.inputs.w2[0],
    box1_wages: wages,
    box2_fed_withheld: withholding,
    box3_ss_wages: wages,
    box4_ss_withheld: Math.round(wages * 6.2) / 100,
    box5_medicare_wages: wages,
    box6_medicare_withheld: Math.round(wages * 1.45) / 100,
    box7_ss_tips: 0,
  });
  const review = claimantReviewSchema.parse({
    ...originalReview,
    earned_income_w2_sources:
      (wages ? originalReview.earned_income_w2_sources : []).map((
        w,
      ) => ({
        ...w,
        box1_wages: wages,
        box3_ss_wages: wages,
        box7_ss_tips: 0,
      })),
    earned_income_business_sources: businesses,
    support_sources: originalReview.support_sources.map((s, i) => ({
      ...s,
      amount: i === 0 ? support - 4500 : s.amount,
    })),
  });
  const general = generalSchema.parse({
    ...base.general,
    taxpayer_can_be_claimed_as_dependent: !item.child,
    dependent_earned_income: item.child ? undefined : agi,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
    dependents: item.child
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
  });
  const inputs = {
    ...base.inputs,
    general,
    w2: wages ? [wage] : [],
    schedule_c: businesses.map((b) => b.schedule_c_source),
    f8863: base.inputs.f8863.map((s) => ({
      ...s,
      filer_magi: agi,
      ownership_review: {
        ...s.ownership_review!,
        student_can_be_claimed_as_dependent: !item.child,
        eligible_parent_ssn: item.child
          ? undefined
          : s.ownership_review!.eligible_parent_ssn,
        parent_nonclaim_record_reference: item.child
          ? undefined
          : s.ownership_review!.parent_nonclaim_record_reference,
      },
    })),
    f8863_claimant_review: { claimant_review: review },
    f8863_credit_limit_worksheet: {
      credit_limit_worksheet: {
        ...base.inputs.f8863_credit_limit_worksheet.credit_limit_worksheet,
        form1040_line18_tax: ordinaryTax,
      },
    },
    ...(item.child
      ? {
        f8812: [{
          qualifying_children_count: 1,
          other_dependents_count: 0,
          filing_status: "single",
          agi,
          income_tax_liability: ordinaryTax,
          earned_income: wages + 27881,
          line18a_earned_income: wages + 27881,
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
        }],
      }
      : {}),
  };
  return {
    inputs,
    review,
    earned,
    businessEarned,
    qbi: taxableScholarship ? (wages ? 5576 : 4026) : (wages ? 4426 : 2426),
    agi,
    ordinaryTax,
    refundable,
    education,
    ctc,
    actc,
    tax,
    refund,
    owed,
  };
}

for (const item of cases) {
  for (const taxableScholarship of [false, true]) {
    Deno.test(`Multiple personal-service businesses AOTC ${item.name}${taxableScholarship ? "-taxable-scholarship" : ""} reconciles calculation and export boundary`, async () => {
      const s = source(item, taxableScholarship);
      if (s.review.kind !== "under_24") {
        throw new Error("Expected young claimant");
      }
      const derived = reviewedBusinessIncome(
        s.review.earned_income_business_sources!,
        s.review.earned_income_w2_sources,
        ssn,
      );
      assertEquals([
        derived.earned,
        derived.businessEarned,
        derived.deduction,
        derived.seTax,
      ], [s.earned, s.businessEarned, 2119, 4238]);
      assertEquals(claimantRefundRestriction(s.review, "single"), item.below);
      const result = f1040_2025.executeReturn(s.inputs);
      assertEquals(result.diagnostics, []);
      const pending = buildPending(result.pending);
      const f = pending.f1040!;
      assertEquals([
        f.line11_agi,
        Math.round(f.line13_qbi_deduction ?? 0),
        f.line18_total_tax_before_credits,
        f.line29_refundable_aoc ?? 0,
        pending.schedule3?.line3_education_credit,
        f.line19_child_tax_credit ?? 0,
        f.line28_actc ?? 0,
        f.line24_total_tax,
        f.line35a_refund ?? 0,
        f.line37_amount_owed ?? 0,
      ], [
        s.agi,
        s.qbi,
        s.ordinaryTax,
        s.refundable,
        s.education,
        s.ctc,
        s.actc,
        s.tax,
        s.refund,
        s.owed,
      ]);
      if (taxableScholarship) {
        const nativeError = await assertRejects(
          () => buildMefBundle(pending, { filer, attachments: [] }),
          Error,
          "Multiple Schedule C Form 8995 payroll, business, shared SE allocation and return sources do not reconcile",
        );
        const pdfError = await assertRejects(
          () => buildPdfBytes(pending, filer, ".pdf-cache"),
          Error,
          "Multiple Schedule C Form 8995 payroll, business, shared SE allocation and return sources do not reconcile",
        );
        if (Deno.args.includes("--write-review-artifacts")) {
          const dir =
            `.state/research/form8863-multiple-business-2026-10-09/blocked-${item.name}`;
          await Deno.mkdir(dir, { recursive: true });
          for (
            const [name, value] of [
              ["source", s.inputs],
              ["pending", pending],
              ["expected", s],
              ["block", { native: nativeError.message, pdf: pdfError.message }],
            ] as const
          ) {
            await Deno.writeTextFile(
              `${dir}/${name}.json`,
              JSON.stringify(value, null, 2),
            );
          }
        }
        return;
      }
      const bundle = await buildMefBundle(pending, { filer, attachments: [] });
      const origins: PdfPageOrigin[] = [];
      const pdf = await buildPdfBytes(
        pending,
        filer,
        ".pdf-cache",
        bundle,
        origins,
      );
      const businessSources = s.review.earned_income_business_sources!;
      const first = businessSources[0];
      const second = businessSources[1];
      const alteredReviews = [
        {
          ...s.review,
          earned_income_business_sources: businessSources.slice(1),
        },
        {
          ...s.review,
          earned_income_business_sources: [
            first,
            first,
            ...businessSources.slice(2),
          ],
        },
        {
          ...s.review,
          earned_income_business_sources: [first, {
            ...second,
            owner_ssn: "999887777",
          }, ...businessSources.slice(2)],
        },
        {
          ...s.review,
          earned_income_business_sources: [first, {
            ...second,
            receipt_sources: second.receipt_sources.map((r) => ({
              ...r,
              source_document_reference:
                first.receipt_sources[0].source_document_reference,
            })),
          }, ...businessSources.slice(2)],
        },
        {
          ...s.review,
          earned_income_business_sources: [first, {
            ...second,
            schedule_c_source: {
              ...second.schedule_c_source,
              line_1_gross_receipts:
                second.schedule_c_source.line_1_gross_receipts + 1,
            },
          }, ...businessSources.slice(2)],
        },
        {
          ...s.review,
          support_sources: s.review.support_sources.map((v) => ({
            ...v,
            beneficiary_ssn: "999887777",
          })),
        },
      ];
      const variants = [
        ...alteredReviews.map((claimant_review) => ({
          ...pending,
          f8863: { ...pending.f8863!, claimant_review },
        })),
        { ...pending, schedule_c: undefined },
        {
          ...pending,
          schedule_se: { ...pending.schedule_se, net_profit_schedule_c: 30001 },
        },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line15_se_deduction: 2120 },
        },
        {
          ...pending,
          f1040: { ...f, line29_refundable_aoc: s.refundable + 1 },
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
          `.state/research/form8863-multiple-business-2026-10-09/${item.name}`;
        await Deno.mkdir(dir, { recursive: true });
        for (
          const [name, data] of [
            ["source", s.inputs],
            ["pending", result.pending],
            ["origins", origins],
            ["expected", s],
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
}
