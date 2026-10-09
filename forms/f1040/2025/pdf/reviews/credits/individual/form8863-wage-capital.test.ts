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
    name: "cap-half",
    allowance: false,
    below: false,
    phaseout: false,
    child: false,
  },
  {
    name: "cap-below",
    allowance: false,
    below: true,
    phaseout: false,
    child: false,
  },
  {
    name: "allowance-half",
    allowance: true,
    below: false,
    phaseout: false,
    child: false,
  },
  {
    name: "allowance-below",
    allowance: true,
    below: true,
    phaseout: false,
    child: false,
  },
  {
    name: "phaseout-half",
    allowance: false,
    below: false,
    phaseout: true,
    child: false,
  },
  {
    name: "child-credit",
    allowance: false,
    below: false,
    phaseout: false,
    child: true,
  },
];
function source(item: typeof cases[number]) {
  const base = fixture("student-scholarship");
  const wages = item.phaseout ? 49119 : 10000;
  // Independent ordinary Schedule SE: 30000 × .9235 = 27705;
  // 3435 SS + 803 Medicare = 4238; filed half = 2119.
  const agi = wages + 30000 - 2119 + 8000;
  const businessEarned = item.allowance ? 6000 : 8364.30;
  const earned = wages + businessEarned;
  const support = (Math.round(earned * 100) * 2 + (item.below ? 2 : 0)) / 100;
  // IRS TY2025 tax table, single: 24550–24600=2711; 63650–63700=8923.
  const ordinaryTax = item.phaseout ? 8923 : 2711;
  const refundable = item.below ? 0 : item.phaseout ? 500 : 1000;
  const education = item.below ? 2500 : item.phaseout ? 750 : 1500;
  const ctc = item.child ? 1211 : 0;
  const actc = item.child ? 989 : 0;
  const tax = ordinaryTax - education - ctc + 4238;
  const withholding = item.phaseout ? 20000 : 5000;
  const refund = withholding + refundable + actc - tax;
  const business = businessReviewSchema.parse({
    tax_year: 2025,
    owner_ssn: ssn,
    business_reference: "2025-studio",
    ownership_record_reference: "2025-studio-ownership",
    personal_services_record_reference: "2025-studio-services",
    capital_review_record_reference: "2025-studio-capital-review",
    income_producing_factors: "personal_services_and_material_capital",
    schedule_c_source: {
      business_reference: "2025-studio",
      proprietor_recipient: "T",
      line_a_principal_business: "Portrait photography",
      line_b_business_code: "541921",
      line_c_business_name: "Alex Photo Studio",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      qbi_specified_service: false,
      line_1_gross_receipts: 45000,
      line_20a_rent_vehicles: 12000,
      line_22_supplies: 3000,
    },
    receipt_sources: [{
      source_document_reference: "2025-studio-receipts",
      owner_ssn: ssn,
      business_reference: "2025-studio",
      schedule_c_field: "line_1_gross_receipts",
      amount: 45000,
    }],
    cost_sources: [
      {
        source_document_reference: "2025-studio-rent",
        schedule_c_field: "line_20a_rent_vehicles",
        amount: 12000,
      },
      {
        source_document_reference: "2025-studio-supplies",
        schedule_c_field: "line_22_supplies",
        amount: 3000,
      },
    ].map((r) => ({ ...r, owner_ssn: ssn, business_reference: "2025-studio" })),
    material_capital_review: {
      reasonableness_record_reference: "2025-studio-pay-review",
      capital_sources: [{
        source_document_reference: "2025-studio-lease",
        owner_ssn: ssn,
        business_reference: "2025-studio",
        asset_reference: "studio-camera-lighting",
        deployment_record_reference: "2025-studio-equipment-use",
        cost_source_reference: "2025-studio-rent",
        capital_usage_cost_field: "line_20a_rent_vehicles",
        receipt_source_references: ["2025-studio-receipts"],
        income_producing_use: true,
      }],
      compensation_benchmarks: [{
        source_document_reference: "2025-photographer-pay",
        tax_year: 2025,
        service_description: "portrait photography",
        hourly_rate: item.allowance ? 15 : 25,
      }],
      personal_service_sources: [{
        source_document_reference: "2025-studio-hours",
        owner_ssn: ssn,
        business_reference: "2025-studio",
        receipt_source_references: ["2025-studio-receipts"],
        compensation_benchmark_reference: "2025-photographer-pay",
        service_description: "portrait photography",
        hours_performed: item.allowance ? 400 : 800,
      }],
    },
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
    earned_income_w2_sources: originalReview.earned_income_w2_sources.map((
      w,
    ) => ({
      ...w,
      box1_wages: wages,
      box3_ss_wages: wages,
      box7_ss_tips: 0,
    })),
    earned_income_business_sources: [business],
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
    w2: [wage],
    schedule_c: [business.schedule_c_source],
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
    agi,
    ordinaryTax,
    refundable,
    education,
    ctc,
    actc,
    tax,
    refund,
  };
}

for (const item of cases) {
  Deno.test(`W-2/material-capital AOTC ${item.name} reconciles complete return`, async () => {
    const s = source(item);
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
      f.line13_qbi_deduction,
      f.line18_total_tax_before_credits,
      f.line29_refundable_aoc ?? 0,
      pending.schedule3?.line3_education_credit,
      f.line19_child_tax_credit ?? 0,
      f.line28_actc ?? 0,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      s.agi,
      5576,
      s.ordinaryTax,
      s.refundable,
      s.education,
      s.ctc,
      s.actc,
      s.tax,
      s.refund,
    ]);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const alteredReviews = [
      {
        ...s.review,
        earned_income_w2_sources: s.review.earned_income_w2_sources.map((
          w,
        ) => ({ ...w, box1_wages: w.box1_wages + 1 })),
      },
      { ...s.review, earned_income_w2_sources: [] },
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
      { ...pending, w2: undefined },
      { ...pending, schedule_c: undefined },
      { ...pending, schedule_se: { ...pending.schedule_se, w2_ss_wages: 1 } },
      {
        ...pending,
        schedule1: { ...pending.schedule1, line15_se_deduction: 2120 },
      },
      { ...pending, f1040: { ...f, line29_refundable_aoc: s.refundable + 1 } },
    ];
    for (const changed of variants) {
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir =
        `.state/research/form8863-wage-capital-2026-10-09/${item.name}`;
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
