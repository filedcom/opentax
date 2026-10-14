import { z } from "zod";
import {
  assertAlmostEquals,
  assertEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import {
  ableContributionReviewSchema,
  AbleEligibilityBasis,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import {
  ableDistributionAmounts,
  ableDistributionReviewSchema,
  AbleExpenseCategory,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_distribution_review.ts";
import { SaverDistributionTreatment } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const cases = [
  {
    name: "zero-additional-tax",
    gross: 500,
    earnings: 4,
    expenses: 0,
    contribution: 2000,
    taxable: 4,
    credit: 300,
    tax: 628,
  },
  {
    name: "credit-rate-boundary",
    gross: 2400,
    earnings: 400,
    expenses: 0,
    contribution: 5000,
    taxable: 400,
    credit: 200,
    tax: 848,
  },

  {
    name: "qualified-cents",
    gross: 500.5,
    earnings: 100,
    expenses: 500.5,
    contribution: 2000,
    taxable: 0,
    credit: 300,
    tax: 628,
  },
  {
    name: "joint-spouse-taxable",
    gross: 500,
    earnings: 100,
    expenses: 500,
    contribution: 5000,
    taxable: 133,
    credit: 800,
    tax: 1076,
  },
  {
    name: "joint-two-taxable",
    gross: 2400,
    earnings: 400,
    expenses: 1600,
    contribution: 8000,
    taxable: 533,
    credit: 800,
    tax: 1156,
  },

  {
    name: "qualified",
    gross: 500,
    earnings: 100,
    expenses: 500,
    contribution: 2000,
    taxable: 0,
    credit: 300,
    tax: 628,
  },
  // IRS Pub907: 2400 distribution, 400 earnings, 1600 expenses -> 133.33 income.
  {
    name: "publication-example",
    gross: 2400,
    earnings: 400,
    expenses: 1600,
    contribution: 5000,
    taxable: 133,
    credit: 400,
    tax: 551,
  },
  {
    name: "nonqualified",
    gross: 2400,
    earnings: 400,
    expenses: 0,
    contribution: 5000,
    taxable: 400,
    credit: 400,
    tax: 608,
  },
  {
    name: "basis-only",
    gross: 500,
    earnings: 0,
    expenses: 0,
    contribution: 2000,
    taxable: 0,
    credit: 300,
    tax: 628,
  },
  {
    name: "credit-offset",
    gross: 2400,
    earnings: 400,
    expenses: 1600,
    contribution: 1000,
    taxable: 133,
    credit: 0,
    tax: 951,
  },
  {
    name: "next-year-election",
    gross: 2400,
    earnings: 400,
    expenses: 1600,
    contribution: 5000,
    taxable: 133,
    credit: 400,
    tax: 551,
  },
  {
    name: "joint-both",
    gross: 2400,
    earnings: 400,
    expenses: 1600,
    contribution: 5000,
    taxable: 133,
    credit: 800,
    tax: 1076,
  },
];
function distribution(
  owner: string,
  gross: number,
  earnings: number,
  expenses: number,
  nextYear = false,
): z.infer<typeof ableDistributionReviewSchema> {
  return ableDistributionReviewSchema.parse({
    qualification_review_ref: `${owner}-distribution-review`,
    complete_distribution_and_expense_inventory_confirmed: true,
    no_rollovers_transfers_or_beneficiary_changes_confirmed: true,
    no_returned_excess_or_additional_accounts_confirmed: true,
    beneficiary_alive_through_all_distributions_confirmed: true,
    form1099qa: {
      source_document_ref: `${owner}-1099qa`,
      recipient_ssn: owner,
      program_ein: "123456789",
      account_number: `${owner}-able`,
      box1_gross_distribution: gross,
      box2_earnings: earnings,
      box3_basis: gross - earnings,
      box4_program_transfer: false,
      box5_account_terminated: false,
      box6_other_recipient: false,
    },
    distributions: [
      {
        source_document_ref: `${owner}-payment-1`,
        received_on: "2025-03-01",
        amount: gross / 2,
      },
      {
        source_document_ref: `${owner}-payment-2`,
        received_on: "2025-12-01",
        amount: gross / 2,
      },
    ],
    qualified_expenses: expenses
      ? [{
        source_document_ref: `${owner}-expense`,
        beneficiary_ssn: owner,
        category: AbleExpenseCategory.Housing,
        paid_on: nextYear ? "2026-03-01" : "2025-12-31",
        amount: expenses,
        relates_to_beneficiary_disability_confirmed: true,
        not_used_for_other_tax_benefits_confirmed: true,
        not_allocated_to_another_tax_year_confirmed: true,
        ...(nextYear
          ? { next_year_60_day_election_ref: `${owner}-election` }
          : {}),
      }]
      : [],
  });
}
function account(
  owner: string,
  contribution: number,
  source: z.infer<typeof ableDistributionReviewSchema>,
): z.infer<typeof ableContributionReviewSchema>["accounts"][number] {
  return {
    form5498qa: {
      source_document_ref: `${owner}-5498qa`,
      beneficiary_ssn: owner,
      program_ein: "123456789",
      account_number: `${owner}-able`,
      box1_contributions: contribution,
      box2_able_rollovers: 0,
      box6_eligibility_basis: AbleEligibilityBasis.DisabilityCertification,
    },
    program_review_ref: `${owner}-program`,
    eligible_individual_in_2025_confirmed: true,
    current_year_distributions: source,
    no_returned_or_excess_contributions_confirmed: true,
    no_prior_year_excess_contributions_confirmed: true,
    within_program_cumulative_limit_confirmed: true,
    contribution_detail_ref: `${owner}-contributions`,
    other_contributors_cash: 0,
    qtp_rollovers_or_transfers: 0,
    beneficiary_payments: [{
      source_document_ref: `${owner}-deposit`,
      paid_on: "2025-01-15",
      contributor_ssn: owner,
      amount: contribution,
    }],
  };
}
for (const item of cases) {
  Deno.test(`ABLE distribution complete return: ${item.name}`, async () => {
    const joint = item.name.startsWith("joint-");
    const primary = distribution(
      "111223333",
      item.gross,
      item.earnings,
      item.expenses,
      item.name === "next-year-election",
    );
    const accounts = [
      account("111223333", item.contribution, primary),
      ...(joint
        ? [
          account(
            "999887777",
            item.contribution,
            item.name === "joint-spouse-taxable"
              ? distribution("999887777", 2400, 400, 1600)
              : item.name === "joint-two-taxable"
              ? distribution("999887777", 2400, 400, 0)
              : distribution("999887777", 500, 100, 500),
          ),
        ]
        : []),
    ];
    const review = ableContributionReviewSchema.parse({
      tax_year: 2025,
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-04-10",
      complete_able_account_inventory_confirmed: true,
      accounts,
    });
    const entries = accounts.map((a) => ({
      received_date: "2025-12-01",
      gross_amount:
        a.current_year_distributions!.form1099qa.box1_gross_distribution,
      source_document_ref:
        a.current_year_distributions!.form1099qa.source_document_ref,
      treatment: SaverDistributionTreatment.Included,
      current_year_1099qa: true,
    }));
    const general = generalSchema.parse({
      filing_status: joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Distribution",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      form8880_able_contribution_review: review,
      ...(joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Distribution",
          spouse_ssn: "999-88-7777",
          spouse_dob: "1964-07-15",
          spouse_form8880_student_five_months: false,
          spouse_form8880_claimed_as_dependent: false,
          form8880_joint_distribution_review: {
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "joint-distributions",
            no_other_qualifying_distributions_in_lookback: true,
            current_year_source_inventory_review: {
              reviewed_by: "Synthetic reviewer",
              reviewed_on: "2026-04-10",
              complete_1099r_inventory_confirmed: true,
            },
            entries: entries.map((e, i) => ({
              ...e,
              recipient: i ? TS.S : TS.T,
              qualifying_amount: e.gross_amount,
            })),
          },
        }
        : {
          form8880_nonjoint_distribution_review: {
            taxpayer_ssn: "111223333",
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2026-04-10",
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "all-distributions",
            complete_distribution_inventory_confirmed: true,
            entries: entries.map((e) => ({
              ...e,
              recipient_ssn: "111223333",
              classification_review_ref: "qa-classification",
            })),
          },
        }),
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
      box1_wages: item.name === "credit-rate-boundary" ? 25400 : 25000,
      box2_fed_withheld: joint ? 1500 : 2000,
    });
    const inputs = {
      general,
      w2: joint ? [wage(false), wage(true)] : [wage(false)],
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(
      pending.f1040?.line11_agi,
      (joint ? 50000 : item.name === "credit-rate-boundary" ? 25400 : 25000) +
        item.taxable,
    );
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, item.tax);
    assertEquals(
      pending.f1040?.line35a_refund,
      (joint ? 3000 : 2000) - item.tax,
    );
    assertEquals(pending.schedule1?.line8q_able_taxable_earnings, item.taxable);
    if (item.credit) {
      const grossTotal = Math.round(
        entries.reduce((sum, e) => sum + e.gross_amount, 0),
      );
      assertEquals(pending.form8880?.print_line4a_distributions, grossTotal);
      if (joint) {
        assertEquals(pending.form8880?.print_line4b_distributions, grossTotal);
      }
    }
    const filer = extractFilerIdentity(general);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    if (item.taxable) {
      assertEquals(
        (bundle.xml.match(/<IRS5329 /g) ?? []).length,
        item.name === "joint-two-taxable" ? 2 : 1,
      );
    }
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
          schedule1: {
            ...pending.schedule1,
            line8q_able_taxable_earnings: item.taxable + 1,
          },
        },
        {
          ...pending,
          agi_aggregator: {
            ...pending.agi_aggregator,
            line8q_able_taxable_earnings: item.taxable + 1,
          },
        },
        ...(item.taxable ? [{ ...pending, form5329: undefined }] : []),
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    const noLedger = {
      ...general,
      ...(joint
        ? {
          form8880_joint_distribution_review: {
            ...general.form8880_joint_distribution_review,
            entries: [],
          },
        }
        : {
          form8880_nonjoint_distribution_review: {
            ...general.form8880_nonjoint_distribution_review,
            entries: [],
          },
        }),
    };
    assertThrows(() =>
      f1040_2025.executeReturn({ ...inputs, general: noLedger })
    );
    if (item.name === "publication-example") {
      const highResult = f1040_2025.executeReturn({
        ...inputs,
        w2: [{ ...wage(false), box1_wages: 300000 }],
      });
      assertEquals(highResult.diagnostics, []);
      const highPending = buildPending(highResult.pending);
      await assertRejects(
        () => buildMefBundle(highPending, { filer, attachments: [] }),
        Error,
        "NIIT threshold",
      );
      await assertRejects(
        () => buildPdfBytes(highPending, filer, ".pdf-cache"),
        Error,
        "NIIT threshold",
      );
    }
    for (
      const changedReview of [
        {
          ...review,
          accounts: accounts.map((a) => ({
            ...a,
            current_year_distributions: {
              ...a.current_year_distributions!,
              form1099qa: {
                ...a.current_year_distributions!.form1099qa,
                recipient_ssn: "222334444",
              },
            },
          })),
        },
        {
          ...review,
          accounts: accounts.map((a) => ({
            ...a,
            current_year_distributions: {
              ...a.current_year_distributions!,
              form1099qa: {
                ...a.current_year_distributions!.form1099qa,
                box1_gross_distribution:
                  a.current_year_distributions!.form1099qa
                    .box1_gross_distribution + 1,
              },
            },
          })),
        },
        {
          ...review,
          accounts: accounts.map((a) => ({
            ...a,
            no_current_year_able_distributions_confirmed: true as const,
          })),
        },
      ]
    ) {
      assertThrows(() =>
        f1040_2025.executeReturn({
          ...inputs,
          general: {
            ...general,
            form8880_able_contribution_review: changedReview,
          },
        })
      );
      const altered = {
        ...pending,
        general: {
          ...general,
          form8880_able_contribution_review: changedReview,
        },
      };
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    const dir = Deno.env.get("FORM8880_ABLE_DISTRIBUTION_EVIDENCE");
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
Deno.test("ABLE annual earnings ratio and first-60-day expense boundary", () => {
  const source = distribution("111223333", 2400, 400, 1600);
  assertAlmostEquals(
    ableDistributionAmounts(source).taxableEarnings,
    133.33333333333333,
  );
  assertEquals(ableDistributionAmounts(source).additionalTax, 13);
  for (
    const changed of [
      { ...source, form1099qa: { ...source.form1099qa, box3_basis: 2001 } },
      { ...source, distributions: [source.distributions[0]] },
      {
        ...source,
        qualified_expenses: [{
          ...source.qualified_expenses[0],
          beneficiary_ssn: "222334444",
        }],
      },
      {
        ...source,
        qualified_expenses: [{
          ...source.qualified_expenses[0],
          paid_on: "2026-03-02",
          next_year_60_day_election_ref: "late-election",
        }],
      },
      {
        ...source,
        qualified_expenses: [{
          ...source.qualified_expenses[0],
          paid_on: "2026-01-01",
        }],
      },
      {
        ...source,
        qualified_expenses: [{
          ...source.qualified_expenses[0],
          next_year_60_day_election_ref: "wrong-year",
        }],
      },
      {
        ...source,
        qualified_expenses: [
          source.qualified_expenses[0],
          source.qualified_expenses[0],
        ],
      },
      {
        ...source,
        form1099qa: { ...source.form1099qa, box4_program_transfer: true },
      },
    ]
  ) assertThrows(() => ableDistributionReviewSchema.parse(changed));
});
