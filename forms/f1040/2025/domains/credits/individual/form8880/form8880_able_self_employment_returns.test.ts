import { z } from "zod";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import {
  ableContributionReviewSchema,
  AbleEligibilityBasis,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import {
  AbleBusinessKind,
  ableEmploymentLimit,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_employment_review.ts";
import { itemSchema as cSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { itemSchema as fSchema } from "../../../../../nodes/intermediate/forms/income/business/schedule_f/model.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

type Account = z.infer<typeof ableContributionReviewSchema>["accounts"][number];
const businessSchema = z.object({
  ref: z.string(),
  kind: z.nativeEnum(AbleBusinessKind),
  profit: z.number(),
  owner: z.nativeEnum(TS),
});
type Business = z.infer<typeof businessSchema>;
const cases = [
  {
    name: "single-c",
    joint: false,
    businesses: [40000],
    farm: false,
    wage: 0,
    deduction: [2826],
    extra: [15060],
  },
  {
    name: "single-f",
    joint: false,
    businesses: [40000],
    farm: true,
    wage: 0,
    deduction: [2826],
    extra: [15060],
  },
  {
    name: "mixed-wage-c",
    joint: false,
    businesses: [10000],
    farm: false,
    wage: 15000,
    deduction: [707],
    extra: [15060],
  },
  {
    name: "cents-compensation",
    joint: false,
    businesses: [12000.49],
    farm: false,
    wage: 0,
    deduction: [848],
    extra: [11152.49],
  },
  {
    name: "joint-spouse-c",
    joint: true,
    businesses: [25000],
    farm: false,
    wage: 25000,
    deduction: [1767],
    extra: [15060],
  },
  {
    name: "joint-both-c",
    joint: true,
    businesses: [40000, 10000],
    farm: false,
    wage: 0,
    deduction: [2826, 707],
    extra: [15060, 9293],
  },
  {
    name: "joint-mixed-c-f",
    joint: true,
    businesses: [30000, -5000],
    farm: false,
    wage: 25000,
    deduction: [1767],
    extra: [15060],
  },
] as const;
function account(
  subject: TS,
  rows: Business[],
  deduction: number,
  extra: number,
  wages: readonly z.infer<typeof w2ItemSchema>[],
): Account {
  const owner = subject === TS.T ? "111223333" : "999887777";
  return {
    form5498qa: {
      source_document_ref: `${owner}-5498qa`,
      beneficiary_ssn: owner,
      program_ein: "456789012",
      account_number: `${owner}-able`,
      box1_contributions: 19000 + extra,
      box2_able_rollovers: 0,
      box6_eligibility_basis: AbleEligibilityBasis.DisabilityCertification,
    },
    program_review_ref: `${owner}-program`,
    eligible_individual_in_2025_confirmed: true,
    no_current_year_able_distributions_confirmed: true,
    no_returned_or_excess_contributions_confirmed: true,
    no_prior_year_excess_contributions_confirmed: true,
    within_program_cumulative_limit_confirmed: true,
    contribution_detail_ref: `${owner}-deposits`,
    other_contributors_cash: 19000,
    qtp_rollovers_or_transfers: 0,
    beneficiary_payments: [{
      source_document_ref: `${owner}-payment`,
      contributor_ssn: owner,
      paid_on: "2025-12-01",
      amount: extra,
    }],
    employed_beneficiary_review: {
      eligibility_review_ref: `${owner}-employment-eligibility`,
      no_401a_403a_defined_contribution_403b_or_457b_contributions_confirmed:
        true,
      self_employment: {
        compensation_review_ref: `${owner}-business-review`,
        complete_sole_proprietor_inventory_confirmed: true,
        no_other_self_employment_or_excluded_income_confirmed: true,
        no_self_employed_retirement_deduction_confirmed: true,
        deductible_se_tax: deduction,
        businesses: rows.map((b) => ({
          business_reference: b.ref,
          income_record_ref: `${b.ref}-books`,
          owner_ssn: owner,
          kind: b.kind,
          net_profit: b.profit,
          personal_services_material_income_factor_confirmed: true,
        })),
      },
      complete_w2_inventory_confirmed: true,
      wages: wages.filter((w) => w.employee_ssn?.replaceAll("-", "") === owner)
        .map((w, i) => ({
          source_document_ref: `${owner}-w2-${i}`,
          employer_plan_review_ref: `${owner}-plan-${i}`,
          employee_ssn: owner,
          employer_ein: w.employer_ein!.replaceAll("-", ""),
          box1_wages: w.box1_wages,
          wages_for_current_services_confirmed: true,
        })),
      residence_periods: [{
        source_document_ref: `${owner}-residence`,
        state: "TX",
        from: "2025-01-01",
        through: "2025-12-31",
      }],
    },
  };
}
for (const item of cases) {
  Deno.test(`self-employed ABLE ${item.name} complete return`, async () => {
    const rows: Business[] = item.businesses.map((profit, i) => ({
      ref: `${item.name}-${i}`,
      kind: item.farm || (item.name === "joint-mixed-c-f" && i === 1)
        ? AbleBusinessKind.ScheduleF
        : AbleBusinessKind.ScheduleC,
      profit,
      owner:
        item.name === "joint-spouse-c" || item.name === "joint-mixed-c-f" ||
          i === 1
          ? TS.S
          : TS.T,
    }));
    const w2 = item.wage
      ? [w2ItemSchema.parse({
        source_document_reference: "primary-w2-issued",
        employee_ssn: "111-22-3333",
        employer_ein: "12-3456789",
        employer_name: "Reviewed Employer",
        employer_address_line1: "1 Work St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box2_fed_withheld: 0,
        box1_wages: item.wage,
        box3_ss_wages: item.wage,
        box5_medicare_wages: item.wage,
      })]
      : [];
    const review = ableContributionReviewSchema.parse({
      tax_year: 2025,
      reviewed_by: "ABLE Reviewer",
      reviewed_on: "2026-04-10",
      complete_able_account_inventory_confirmed: true,
      accounts: [...new Set(rows.map((b) => b.owner))].map((owner, i) =>
        account(
          owner,
          rows.filter((b) => b.owner === owner),
          item.deduction[i],
          item.extra[i],
          w2,
        )
      ),
    });
    const general = generalSchema.parse({
      ...(item.name === "joint-mixed-c-f"
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: 30000,
            line6_schedule_f_amount: -5000,
            source_document_refs: [
              "Reviewed complete C/F profit and loss inventory",
            ],
          },
        }
        : {}),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
      filing_status: item.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Proprietor",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      ...(true
        ? {
          taxpayer_ssn_valid_for_employment: true,
          taxpayer_ssn_issued_before_due_date: true,
          taxpayer_tin_issued_by_due_date: true,
          main_home_in_us_over_half_year: true,
          taxpayer_can_be_claimed_as_dependent: false,
          childless_eic_review: {
            not_qualifying_child_of_another_taxpayer_verified: true,
            qualifying_child_status_record_reference:
              "Reviewed family household inventory",
          },
          prior_eic_disallowance_review: {
            status: "none",
            irs_account_record_reference: "Reviewed IRS account record",
            no_nonclerical_disallowance_since_1996_verified: true,
          },
          eic_tax_residency_review: {
            status: "all_year_resident",
            taxpayer_status_record_reference: "Reviewed 2025 US tax residence",
          },
        }
        : {}),
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      ...(item.joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Proprietor",
          spouse_ssn: "999-88-7777",
          spouse_dob: "1964-07-15",
          spouse_form8880_student_five_months: false,
          spouse_form8880_claimed_as_dependent: false,
          form8880_joint_distribution_review: {
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "complete-joint-lookback",
            no_other_qualifying_distributions_in_lookback: true,
            current_year_source_inventory_review: {
              reviewed_by: "ABLE Reviewer",
              reviewed_on: "2026-04-10",
              complete_1099r_inventory_confirmed: true,
            },
            entries: [],
          },
        }
        : {
          form8880_nonjoint_distribution_review: {
            taxpayer_ssn: "111223333",
            reviewed_by: "ABLE Reviewer",
            reviewed_on: "2026-04-10",
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "complete-lookback",
            complete_distribution_inventory_confirmed: true,
            entries: [],
          },
        }),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      form8880_able_contribution_review: review,
    });

    const schedule_c = rows.filter((b) => b.kind === AbleBusinessKind.ScheduleC)
      .map((b) =>
        cSchema.parse({
          business_reference: b.ref,
          proprietor_recipient: b.owner,
          line_a_principal_business: "Consulting",
          line_b_business_code: "541990",
          line_c_business_name: `Business ${b.owner}`,
          line_d_ein: b.owner === TS.T ? "23-4567890" : "34-5678901",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_i_made_1099_payments: false,
          line_32_at_risk: "a",
          qbi_no_other_adjustments_confirmed: true,
          line_1_gross_receipts: Math.max(0, b.profit),
          line_18_office_expense: Math.max(0, -b.profit),
          qbi_specified_service: false,
        })
      );
    const schedule_fs = rows.filter((b) =>
      b.kind === AbleBusinessKind.ScheduleF
    ).map((b) =>
      fSchema.parse({
        farm_id: b.ref,
        proprietor_recipient: b.owner,
        line_a_principal_crop_activity: "Vegetables",
        line_b_agricultural_activity_code: "111210",
        line_c_farm_name: "Reviewed Farm",
        line_d_ein: "23-4567890",
        line_e_material_participation: true,
        line_f_made_1099_payments: false,
        accounting_method: "cash",
        line36_at_risk: "a",
        qbi_no_other_adjustments_confirmed: true,
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: Math.max(0, b.profit),
        line16_feed: Math.max(0, -b.profit),
      })
    );
    const inputs = {
      general,
      w2,
      ...(schedule_c.length ? { schedule_c } : {}),
      ...(schedule_fs.length ? { schedule_f: { schedule_fs } } : {}),
      f1040es: {
        payment_q1: 10000,
        quarter_payment_records: [{
          tax_year: 2025,
          quarter: "q1",
          amount: 10000,
          payer_tin: "111223333",
          payment_date: "2025-04-15",
          payment_record_reference: "Reviewed estimated payment",
        }],
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const deduction = item.deduction.reduce((s, n) => s + n, 0);
    assertEquals(pending.schedule1?.line15_se_deduction, deduction);
    for (const [i, a] of review.accounts.entries()) {
      assertEquals(
        ableEmploymentLimit(a.employed_beneficiary_review!),
        item.extra[i],
      );
    }
    const baseline = f1040_2025.executeReturn({
      ...inputs,
      general: { ...general, form8880_able_contribution_review: undefined },
    });
    assertEquals(baseline.diagnostics, []);
    const control = buildPending(baseline.pending);
    assertEquals(pending.f1040?.line11_agi, control.f1040?.line11_agi);
    const credit = pending.form8880?.print_line12_credit ?? 0;
    // Independently reviewed TY2025 tax-table rows: 17100/1817 single,
    // 6800/683 single, 13350/1338 MFJ, 11950/1198 MFJ; Pub596 11150/607.
    // https://www.irs.gov/publications/p1040 and https://www.irs.gov/publications/p596
    const expected = item.name === "single-c" || item.name === "single-f"
      ? [37174, 200, 7269, 2731, 0]
      : item.name === "mixed-wage-c"
      ? [24293, 400, 1696, 8304, 0]
      : item.name === "cents-compensation"
      ? [11152, 0, 1695, 8912, 607]
      : item.name === "joint-both-c"
      ? [46467, 1198, 7065, 2935, 0]
      : [48233, 400, 4471, 5529, 0];
    assertEquals([
      pending.f1040?.line11_agi,
      credit,
      pending.f1040?.line24_total_tax,
      pending.f1040?.line35a_refund,
      pending.f1040?.line27_eitc ?? 0,
    ], expected);
    assertEquals(
      pending.f1040?.line24_total_tax,
      (control.f1040?.line24_total_tax ?? 0) - credit,
    );
    const filer = extractFilerIdentity(general);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    console.log(
      item.name,
      JSON.stringify({
        agi: pending.f1040?.line11_agi,
        credit,
        tax: pending.f1040?.line24_total_tax,
        refund: pending.f1040?.line35a_refund,
        eic: pending.f1040?.line27_eitc,
      }),
    );
    for (
      const changedReview of [
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            employed_beneficiary_review: {
              ...a.employed_beneficiary_review!,
              self_employment: {
                ...a.employed_beneficiary_review!.self_employment!,
                deductible_se_tax:
                  a.employed_beneficiary_review!.self_employment!
                    .deductible_se_tax + 1,
              },
            },
          })),
        },
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            employed_beneficiary_review: {
              ...a.employed_beneficiary_review!,
              self_employment: {
                ...a.employed_beneficiary_review!.self_employment!,
                businesses: a.employed_beneficiary_review!.self_employment!
                  .businesses.map((b) => ({
                    ...b,
                    net_profit: b.net_profit + 1,
                  })),
              },
            },
          })),
        },
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            employed_beneficiary_review: {
              ...a.employed_beneficiary_review!,
              self_employment: {
                ...a.employed_beneficiary_review!.self_employment!,
                businesses: a.employed_beneficiary_review!.self_employment!
                  .businesses.map((b) => ({
                    ...b,
                    business_reference: `${b.business_reference}-wrong`,
                  })),
              },
            },
          })),
        },
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            employed_beneficiary_review: {
              ...a.employed_beneficiary_review!,
              self_employment: {
                ...a.employed_beneficiary_review!.self_employment!,
                businesses: a.employed_beneficiary_review!.self_employment!
                  .businesses.map((b) => ({ ...b, owner_ssn: "222334444" })),
              },
            },
          })),
        },
      ]
    ) {
      const changedGeneral = {
        ...general,
        form8880_able_contribution_review: changedReview,
      };
      assertThrows(() =>
        f1040_2025.executeReturn({ ...inputs, general: changedGeneral })
      );
      const altered = { ...pending, general: changedGeneral };
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    for (
      const altered of [
        { ...pending, general: undefined },
        { ...pending, form8880: undefined },
        {
          ...pending,
          ...(schedule_c.length
            ? { schedule_c: undefined }
            : { schedule_f: undefined }),
        },
        { ...pending, schedule_se: undefined },
        { ...pending, form2555: { foreign_earned_income: 100 } },
        {
          ...pending,
          schedule_se: { ...pending.schedule_se, wages_8919: 100 },
        },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line16_sep_simple: 1 },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    const dir = Deno.env.get("FORM8880_ABLE_SELF_EMPLOYMENT_EVIDENCE");
    if (dir) {
      const out = `${dir}/${item.name}`;
      await Deno.mkdir(out, { recursive: true });
      for (
        const [name, data] of [
          ["source", inputs],
          ["pending", result.pending],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${out}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${out}/return.xml`, bundle.xml);
      await Deno.writeFile(`${out}/return.pdf`, pdf);
    }
  });
}

Deno.test("ABLE compensation loss does not consume wages; unsupported and incomplete reviews reject", () => {
  const w = w2ItemSchema.parse({
    employee_ssn: "111223333",
    employer_ein: "123456789",
    box1_wages: 10000,
    box2_fed_withheld: 0,
  });
  const a = account(
    TS.T,
    [{
      ref: "loss-c",
      kind: AbleBusinessKind.ScheduleC,
      profit: -5000,
      owner: TS.T,
    }],
    0,
    10000,
    [w],
  );
  const review = {
    tax_year: 2025,
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-10",
    complete_able_account_inventory_confirmed: true,
    accounts: [a],
  };
  const parsed = ableContributionReviewSchema.parse(review);
  assertEquals(
    ableEmploymentLimit(parsed.accounts[0].employed_beneficiary_review!),
    10000,
  );
  const employment = a.employed_beneficiary_review!;
  for (
    const changed of [
      { ...employment, only_wage_compensation_confirmed: true },
      { ...employment, self_employment: undefined },
      {
        ...employment,
        self_employment: { ...employment.self_employment!, businesses: [] },
      },
      {
        ...employment,
        self_employment: {
          ...employment.self_employment!,
          no_self_employed_retirement_deduction_confirmed: false,
        },
      },
      {
        ...employment,
        self_employment: {
          ...employment.self_employment!,
          businesses: employment.self_employment!.businesses.map((b) => ({
            ...b,
            personal_services_material_income_factor_confirmed: false,
          })),
        },
      },
    ]
  ) {
    assertThrows(() =>
      ableContributionReviewSchema.parse({
        ...review,
        accounts: [{ ...a, employed_beneficiary_review: changed }],
      })
    );
  }
});
