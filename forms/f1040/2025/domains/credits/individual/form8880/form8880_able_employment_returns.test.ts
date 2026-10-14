import { assertAbleEmploymentW2Sources } from "./form8880_able_sources.ts";
import { z } from "zod";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import {
  ableContributionReviewSchema,
  AbleEligibilityBasis,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { ableEmploymentLimit } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_employment_review.ts";
import {
  Box12Code,
  w2ItemSchema,
} from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

type Account = z.infer<typeof ableContributionReviewSchema>["accounts"][number];
type Employment = NonNullable<Account["employed_beneficiary_review"]>;
const cases = [
  {
    name: "continental-limit",
    state: "TX",
    extra: 15060,
    wages: [25000],
    joint: false,
    spouseOnly: false,
    credit: 400,
    tax: 528,
    refund: 1472,
  },
  {
    name: "alaska-limit",
    state: "AK",
    extra: 18810,
    wages: [25000],
    joint: false,
    spouseOnly: false,
    credit: 400,
    tax: 528,
    refund: 1472,
  },
  {
    name: "hawaii-limit",
    state: "HI",
    extra: 17310,
    wages: [25000],
    joint: false,
    spouseOnly: false,
    credit: 400,
    tax: 528,
    refund: 1472,
  },
  {
    name: "wage-limited-cents",
    state: "TX",
    extra: 12000.49,
    wages: [12000.49],
    joint: false,
    spouseOnly: false,
    credit: 0,
    tax: 0,
    refund: 2542,
  },
  {
    name: "joint-both",
    state: "AK",
    extra: 18810,
    wages: [25000],
    joint: true,
    spouseOnly: false,
    credit: 800,
    tax: 1053,
    refund: 1947,
  },
  {
    name: "joint-spouse-only",
    state: "HI",
    extra: 17310,
    wages: [25000],
    joint: true,
    spouseOnly: true,
    credit: 400,
    tax: 1453,
    refund: 1547,
  },
  {
    name: "move-longest-texas",
    state: "TX",
    extra: 15060,
    wages: [25000],
    joint: false,
    spouseOnly: false,
    credit: 400,
    tax: 528,
    refund: 1472,
  },
  {
    name: "two-employers",
    state: "TX",
    extra: 15060,
    wages: [10000, 15000],
    joint: false,
    spouseOnly: false,
    credit: 400,
    tax: 528,
    refund: 1472,
  },
] as const;

function wage(
  subject: TS,
  amount: number,
  second: boolean,
  joint: boolean,
): z.infer<typeof w2ItemSchema> {
  return w2ItemSchema.parse({
    ts: subject,
    employee_ssn: subject === TS.T ? "111-22-3333" : "999-88-7777",
    employer_ein: second
      ? "34-5678901"
      : subject === TS.T
      ? "12-3456789"
      : "23-4567890",
    employer_name: "Example Employer",
    employer_address_line1: "2 Main St",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box1_wages: amount,
    box2_fed_withheld: second ? 0 : joint ? 1500 : 2000,
  });
}
function account(
  subject: TS,
  item: typeof cases[number],
  wages: readonly z.infer<typeof w2ItemSchema>[],
): Account {
  const owner = subject === TS.T ? "111223333" : "999887777";
  const periods: Employment["residence_periods"] =
    item.name === "move-longest-texas"
      ? [{
        source_document_ref: `${owner}-alaska-lease`,
        state: "AK",
        from: "2025-01-01",
        through: "2025-04-30",
      }, {
        source_document_ref: `${owner}-texas-lease`,
        state: "TX",
        from: "2025-05-01",
        through: "2025-12-31",
      }]
      : [{
        source_document_ref: `${owner}-residence`,
        state: item.state,
        from: "2025-01-01",
        through: "2025-12-31",
      }];
  return {
    form5498qa: {
      source_document_ref: `${owner}-5498qa`,
      beneficiary_ssn: owner,
      program_ein: "456789012",
      account_number: `${owner}-able`,
      box1_contributions: 19000 + item.extra,
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
      amount: item.extra,
    }],
    employed_beneficiary_review: {
      eligibility_review_ref: `${owner}-employment-eligibility`,
      no_401a_403a_defined_contribution_403b_or_457b_contributions_confirmed:
        true,
      only_wage_compensation_confirmed: true,
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
      residence_periods: periods,
    },
  };
}
for (const item of cases) {
  Deno.test(`employed ABLE beneficiary ${item.name} reaches complete filing`, async () => {
    const w2 = [
      ...item.wages.map((amount, i) => wage(TS.T, amount, i > 0, item.joint)),
      ...(item.joint ? [wage(TS.S, 25000, false, true)] : []),
    ];
    const review = ableContributionReviewSchema.parse({
      tax_year: 2025,
      reviewed_by: "ABLE Reviewer",
      reviewed_on: "2026-04-10",
      complete_able_account_inventory_confirmed: true,
      accounts: [
        ...(!item.spouseOnly ? [account(TS.T, item, w2)] : []),
        ...(item.joint ? [account(TS.S, item, w2)] : []),
      ],
    });
    for (const a of review.accounts) {
      assertEquals(
        ableEmploymentLimit(a.employed_beneficiary_review!),
        item.extra,
      );
    }
    const general = generalSchema.parse({
      filing_status: item.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Working",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      ...(item.name === "wage-limited-cents"
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
          spouse_last_name: "Working",
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
    const inputs = { general, w2 };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(
      pending.f1040?.line11_agi,
      item.joint ? 50000 : item.wages.reduce((s, w) => s + w, 0),
    );
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, item.tax);
    // Pub596 TY2025, $12000–$12050 single/no-child row: EIC542.
    assertEquals(
      pending.f1040?.line27_eitc ?? 0,
      item.name === "wage-limited-cents" ? 542 : 0,
    );
    assertEquals(pending.f1040?.line35a_refund, item.refund);
    if (item.credit) {
      assertEquals(
        pending.form8880?.print_line1a_ira ?? 0,
        item.spouseOnly ? 0 : item.extra,
      );
      assertEquals(
        pending.form8880?.print_line1b_ira ?? 0,
        item.joint ? item.extra : 0,
      );
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
    const target = item.spouseOnly ? w2.length - 1 : 0;
    const changedWages = [
      w2.filter((_, i) => i !== target),
      [...w2, w2[target]],
      w2.map((w, i) =>
        i === target ? { ...w, box1_wages: w.box1_wages + 1 } : w
      ),
      w2.map((w, i) =>
        i === target ? { ...w, employee_ssn: "222-33-4444" } : w
      ),
      w2.map((w, i) =>
        i === target
          ? { ...w, box12_entries: [{ code: Box12Code.D, amount: 1 }] }
          : w
      ),
    ];
    for (const alteredW2 of changedWages) {
      assertThrows(() =>
        f1040_2025.executeReturn({ ...inputs, w2: alteredW2 })
      );
      const altered = { ...pending, w2: { ...pending.w2, w2s: alteredW2 } };
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    const changes = [
      {
        ...review,
        accounts: review.accounts.map((a) => ({
          ...a,
          employed_beneficiary_review: undefined,
        })),
      },
      {
        ...review,
        accounts: review.accounts.map((a) => ({
          ...a,
          form5498qa: {
            ...a.form5498qa,
            box1_contributions: a.form5498qa.box1_contributions + 0.01,
          },
          beneficiary_payments: a.beneficiary_payments.map((p) => ({
            ...p,
            amount: p.amount + 0.01,
          })),
        })),
      },
      {
        ...review,
        accounts: review.accounts.map((a) => ({
          ...a,
          other_contributors_cash: 19000.01,
          beneficiary_payments: a.beneficiary_payments.map((p) => ({
            ...p,
            amount: p.amount - 0.01,
          })),
        })),
      },
      { ...review, reviewed_by: "Changed Reviewer" },
    ];
    for (const [i, change] of changes.entries()) {
      if (i < 3) {
        assertThrows(() =>
          f1040_2025.executeReturn({
            ...inputs,
            general: { ...general, form8880_able_contribution_review: change },
          })
        );
      }
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
    const dir = Deno.env.get("FORM8880_ABLE_EMPLOYMENT_EVIDENCE");
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

Deno.test("ABLE employment review rejects incomplete residence, wage and plan evidence", () => {
  const base = account(TS.T, cases[0], [wage(TS.T, 25000, false, false)]);
  const employment = base.employed_beneficiary_review!;
  const review = {
    tax_year: 2025,
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-10",
    complete_able_account_inventory_confirmed: true,
    accounts: [base],
  };
  const changes = [
    {
      ...employment,
      no_401a_403a_defined_contribution_403b_or_457b_contributions_confirmed:
        false,
    },
    { ...employment, only_wage_compensation_confirmed: false },
    { ...employment, complete_w2_inventory_confirmed: false },
    { ...employment, wages: [] },
    { ...employment, wages: [...employment.wages, employment.wages[0]] },
    {
      ...employment,
      wages: [{ ...employment.wages[0], employee_ssn: "222334444" }],
    },
    {
      ...employment,
      wages: [{
        ...employment.wages[0],
        wages_for_current_services_confirmed: false,
      }],
    },
    {
      ...employment,
      wages: [{
        ...employment.wages[0],
        employer_plan_review_ref: base.program_review_ref,
      }],
    },
    { ...employment, residence_periods: [] },
    {
      ...employment,
      residence_periods: [{
        ...employment.residence_periods[0],
        from: "2025-01-02",
      }],
    },
    {
      ...employment,
      residence_periods: [{
        ...employment.residence_periods[0],
        through: "2026-01-01",
      }],
    },
    {
      ...employment,
      residence_periods: [
        ...employment.residence_periods,
        employment.residence_periods[0],
      ],
    },
    {
      ...employment,
      residence_periods: [
        {
          source_document_ref: "lease-1",
          state: "AK",
          from: "2025-01-01",
          through: "2025-05-30",
        },
        {
          source_document_ref: "lease-2",
          state: "HI",
          from: "2025-05-31",
          through: "2025-10-27",
        },
        {
          source_document_ref: "lease-3",
          state: "TX",
          from: "2025-10-28",
          through: "2025-12-31",
        },
      ],
    },
  ];
  for (const employed_beneficiary_review of changes) {
    assertThrows(() =>
      ableContributionReviewSchema.parse({
        ...review,
        accounts: [{ ...base, employed_beneficiary_review }],
      })
    );
  }
});

Deno.test("ABLE increased limit distinguishes employer plans from IRA and defined-benefit evidence", () => {
  const copy = wage(TS.T, 25000, false, false);
  const review = ableContributionReviewSchema.parse({
    tax_year: 2025,
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-10",
    complete_able_account_inventory_confirmed: true,
    accounts: [account(TS.T, cases[0], [copy])],
  });
  for (
    const code of [
      Box12Code.D,
      Box12Code.E,
      Box12Code.G,
      Box12Code.AA,
      Box12Code.BB,
      Box12Code.EE,
    ]
  ) {
    assertThrows(() =>
      assertAbleEmploymentW2Sources(review, [{
        ...copy,
        box12_entries: [{ code, amount: 1 }],
      }], undefined)
    );
  }
  // The statutory exclusion names 401(a)/403(a), 403(b), and 457(b).
  for (const code of [Box12Code.F, Box12Code.S, Box12Code.H]) {
    assertAbleEmploymentW2Sources(review, [{
      ...copy,
      box12_entries: [{ code, amount: 1 }],
    }], undefined);
  }
  assertAbleEmploymentW2Sources(review, [{
    ...copy,
    box13_retirement_plan: true,
  }], undefined);
  for (
    const changed of [{ ...copy, box11_nonqual_plans: 100 }, {
      ...copy,
      box13_statutory_employee: true,
    }]
  ) {
    assertThrows(() =>
      assertAbleEmploymentW2Sources(review, [changed], undefined)
    );
  }
});
