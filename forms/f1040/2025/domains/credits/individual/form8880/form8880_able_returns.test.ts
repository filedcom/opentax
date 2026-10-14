import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { z } from "zod";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  ableContributionReviewSchema,
  AbleEligibilityBasis,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { SaverDistributionTreatment } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const cases = [
  {
    name: "single-own-cents",
    joint: false,
    primary: 1500.50,
    spouse: 0,
    elective: 0,
    prior: 0,
    credit: 300,
    other: 0,
    qtp: 0,
    rollover: 0,
  },
  {
    name: "single-mixed-deposits",
    joint: false,
    primary: 1000.49,
    spouse: 0,
    elective: 1000.49,
    prior: 0,
    credit: 400,
    other: 5000,
    qtp: 3000,
    rollover: 2000,
  },
  {
    name: "single-other-only",
    joint: false,
    primary: 0,
    spouse: 0,
    elective: 0,
    prior: 0,
    credit: 0,
    other: 2000,
    qtp: 0,
    rollover: 0,
  },
  {
    name: "single-prior-distribution",
    joint: false,
    primary: 1500,
    spouse: 0,
    elective: 0,
    prior: 500,
    credit: 200,
    other: 0,
    qtp: 0,
    rollover: 0,
  },
  {
    name: "single-offset",
    joint: false,
    primary: 1500,
    spouse: 0,
    elective: 0,
    prior: 1500,
    credit: 0,
    other: 0,
    qtp: 0,
    rollover: 0,
  },
  {
    name: "joint-both",
    joint: true,
    primary: 1000,
    spouse: 1500,
    elective: 0,
    prior: 0,
    credit: 500,
    other: 0,
    qtp: 0,
    rollover: 0,
  },
  {
    name: "joint-spouse-only",
    joint: true,
    primary: 0,
    spouse: 1500,
    elective: 0,
    prior: 0,
    credit: 300,
    other: 0,
    qtp: 0,
    rollover: 0,
  },
];
function account(
  spouse: boolean,
  amount: number,
  item: typeof cases[number],
): z.infer<typeof ableContributionReviewSchema>["accounts"][number] {
  const owner = spouse ? "999887777" : "111223333";
  return {
    form5498qa: {
      source_document_ref: `${owner}-5498qa`,
      beneficiary_ssn: owner,
      program_ein: "123456789",
      account_number: `${owner}-able`,
      box1_contributions: amount + item.other + item.qtp,
      box2_able_rollovers: item.rollover,
      box6_eligibility_basis: AbleEligibilityBasis.DisabilityCertification,
    },
    program_review_ref: `${owner}-program-review`,
    eligible_individual_in_2025_confirmed: true,
    no_current_year_able_distributions_confirmed: true,
    no_returned_or_excess_contributions_confirmed: true,
    no_prior_year_excess_contributions_confirmed: true,
    within_program_cumulative_limit_confirmed: true,
    contribution_detail_ref: `${owner}-details`,
    other_contributors_cash: item.other,
    qtp_rollovers_or_transfers: item.qtp,
    beneficiary_payments: amount > 0
      ? [{
        source_document_ref: `${owner}-bank-payment`,
        contributor_ssn: owner,
        paid_on: "2025-06-15",
        amount,
      }]
      : [],
  };
}
for (const item of cases) {
  Deno.test(`reviewed ABLE beneficiary contribution ${item.name} reaches complete filing`, async () => {
    const review = ableContributionReviewSchema.parse({
      tax_year: 2025,
      reviewed_by: "Retirement Reviewer",
      reviewed_on: "2026-04-10",
      complete_able_account_inventory_confirmed: true,
      accounts: [
        ...((item.primary > 0 || !item.joint)
          ? [account(false, item.primary, item)]
          : []),
        ...(item.spouse > 0 ? [account(true, item.spouse, item)] : []),
      ],
    });
    const general = generalSchema.parse({
      filing_status: item.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Able",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      ...(item.joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Able",
          spouse_ssn: "999-88-7777",
          spouse_dob: "1964-07-15",
          spouse_form8880_student_five_months: false,
          spouse_form8880_claimed_as_dependent: false,
          form8880_joint_distribution_review: {
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "joint-no-distributions",
            no_other_qualifying_distributions_in_lookback: true,
            current_year_source_inventory_review: {
              reviewed_by: "Retirement Reviewer",
              reviewed_on: "2026-04-10",
              complete_1099r_inventory_confirmed: true,
            },
            entries: [],
          },
        }
        : {
          form8880_nonjoint_distribution_review: {
            taxpayer_ssn: "111223333",
            reviewed_by: "Retirement Reviewer",
            reviewed_on: "2026-04-10",
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "complete-lookback",
            complete_distribution_inventory_confirmed: true,
            entries: item.prior
              ? [{
                recipient_ssn: "111223333",
                received_date: "2023-06-15",
                gross_amount: item.prior,
                source_document_ref: "prior-distribution",
                classification_review_ref: "prior-included-review",
                treatment: SaverDistributionTreatment.Included,
              }]
              : [],
          },
        }),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      form8880_able_contribution_review: review,
    });
    const wage = (spouse: boolean) => ({
      ts: spouse ? TS.S : TS.T,
      employee_ssn: spouse ? "999-88-7777" : "111-22-3333",
      employer_ein: spouse ? "23-4567890" : "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 25000,
      box2_fed_withheld: item.joint ? 1500 : 2000,
      ...(!spouse && item.elective
        ? { box12_entries: [{ code: Box12Code.D, amount: item.elective }] }
        : {}),
    });
    const inputs = {
      general,
      w2: item.joint ? [wage(false), wage(true)] : [wage(false)],
    };
    assertThrows(() =>
      f1040_2025.executeReturn({
        ...inputs,
        general: {
          ...general,
          form8880_nonjoint_distribution_review: undefined,
          form8880_joint_distribution_review: undefined,
        },
      })
    );
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const beforeTax = item.joint ? 1853 : 928;
    assertEquals(pending.f1040?.line11_agi, item.joint ? 50000 : 25000);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, beforeTax);
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, beforeTax - item.credit);
    assertEquals(
      pending.f1040?.line35a_refund,
      (item.joint ? 3000 : 2000) - beforeTax + item.credit,
    );
    if (item.credit) {
      assertEquals(
        pending.form8880?.print_line1a_ira,
        Math.round(item.primary),
      );
      assertEquals(pending.form8880?.print_line1b_ira ?? 0, item.spouse);
    } else assertEquals(pending.form8880?.calculated_zero_credit, true);
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
    for (
      const altered of [
        { ...pending, general: undefined },
        { ...pending, form8880: undefined },
        {
          ...pending,
          general: {
            ...general,
            form8880_able_contribution_review: undefined,
          },
        },
        {
          ...pending,
          form8880: {
            ...pending.form8880,
            able_contribution_review: undefined,
          },
        },
        { ...pending, general: { ...general, taxpayer_ssn: "222-33-4444" } },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    for (
      const change of [
        { ...review, accounts: [...review.accounts, review.accounts[0]] },
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            form5498qa: {
              ...a.form5498qa,
              box1_contributions: a.form5498qa.box1_contributions + 1,
            },
          })),
        },
        {
          ...review,
          accounts: review.accounts.map((a) => ({
            ...a,
            form5498qa: { ...a.form5498qa, beneficiary_ssn: "222334444" },
          })),
        },
      ]
    ) {
      assertThrows(() =>
        f1040_2025.executeReturn({
          ...inputs,
          general: { ...general, form8880_able_contribution_review: change },
        })
      );
      for (
        const altered of [
          {
            ...pending,
            general: { ...general, form8880_able_contribution_review: change },
          },
          {
            ...pending,
            form8880: { ...pending.form8880, able_contribution_review: change },
          },
        ]
      ) {
        await assertRejects(() =>
          buildMefBundle(altered, { filer, attachments: [] })
        );
        await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
      }
    }
    // A schema-valid source edit must still match its retained calculation source.
    const changedReview = { ...review, reviewed_by: "Different Reviewer" };
    for (
      const altered of [
        {
          ...pending,
          general: {
            ...general,
            form8880_able_contribution_review: changedReview,
          },
        },
        {
          ...pending,
          form8880: {
            ...pending.form8880,
            able_contribution_review: changedReview,
          },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    const dir = Deno.env.get("FORM8880_ABLE_EVIDENCE");
    if (dir) {
      const output = `${dir}/${item.name}`;
      await Deno.mkdir(output, { recursive: true });
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", result.pending],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${output}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${output}/return.xml`, bundle.xml);
      await Deno.writeFile(`${output}/return.pdf`, pdf);
    }
  });
}
Deno.test("ABLE source review excludes unsupported contributions and classifications", () => {
  const base = account(false, 1500, cases[0]);
  const review = {
    tax_year: 2025,
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-10",
    complete_able_account_inventory_confirmed: true,
    accounts: [base],
  };
  for (
    const changed of [
      { ...base, no_current_year_able_distributions_confirmed: false },
      { ...base, no_returned_or_excess_contributions_confirmed: false },
      { ...base, no_prior_year_excess_contributions_confirmed: false },
      { ...base, eligible_individual_in_2025_confirmed: false },
      { ...base, within_program_cumulative_limit_confirmed: false },
      {
        ...base,
        form5498qa: { ...base.form5498qa, box1_contributions: 19001 },
      },
      {
        ...base,
        beneficiary_payments: [{
          ...base.beneficiary_payments[0],
          paid_on: "2026-01-01",
        }],
      },
      {
        ...base,
        beneficiary_payments: [{
          ...base.beneficiary_payments[0],
          contributor_ssn: "222334444",
        }],
      },
    ]
  ) {
    assertThrows(() =>
      ableContributionReviewSchema.parse({ ...review, accounts: [changed] })
    );
  }
});
