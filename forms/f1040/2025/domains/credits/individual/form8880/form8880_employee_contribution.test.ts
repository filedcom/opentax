import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { z } from "zod";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { employeeContributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/employee_contribution_review.ts";
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
    name: "single-voluntary",
    joint: false,
    primary: 1500.50,
    spouse: 0,
    elective: 0,
    prior: 0,
    credit: 300,
  },
  {
    name: "single-mixed",
    joint: false,
    primary: 1000.49,
    spouse: 0,
    elective: 1000.49,
    prior: 0,
    credit: 400,
  },
  {
    name: "single-prior-distribution",
    joint: false,
    primary: 1500,
    spouse: 0,
    elective: 0,
    prior: 500,
    credit: 200,
  },
  {
    name: "single-offset",
    joint: false,
    primary: 1500,
    spouse: 0,
    elective: 0,
    prior: 1500,
    credit: 0,
  },
  {
    name: "joint-both",
    joint: true,
    primary: 1000,
    spouse: 1500,
    elective: 0,
    prior: 0,
    credit: 500,
  },
  {
    name: "joint-spouse-only",
    joint: true,
    primary: 0,
    spouse: 1500,
    elective: 0,
    prior: 0,
    credit: 300,
  },
];
function entry(
  spouse: boolean,
  amount: number,
): z.infer<typeof employeeContributionReviewSchema>["entries"][number] {
  const owner = spouse ? "999887777" : "111223333";
  const employer = spouse ? "234567890" : "123456789";
  return {
    payroll: {
      source_document_ref: `${owner}-2025-payroll`,
      employee_ssn: owner,
      employer_ein: employer,
      employee_after_tax_paid: amount,
      not_reported_in_box12_confirmed: true,
      not_employer_contributions_confirmed: true,
      not_section414h2_pickup_confirmed: true,
    },
    plan_statement: {
      source_document_ref: `${owner}-2025-plan`,
      participant_ssn: owner,
      sponsoring_employer_ein: employer,
      account_number: `${owner}-plan-account`,
      qualified_under_section4974c_confirmed: true,
      not_ira_or_able_confirmed: true,
      voluntary_employee_contributions: amount,
      no_returned_contributions_confirmed: true,
    },
  };
}
for (const item of cases) {
  Deno.test(`reviewed voluntary employee contribution ${item.name} reaches complete filing`, async () => {
    const review = employeeContributionReviewSchema.parse({
      tax_year: 2025,
      reviewed_by: "Retirement Reviewer",
      reviewed_on: "2026-04-10",
      entries: [
        ...(item.primary ? [entry(false, item.primary)] : []),
        ...(item.spouse ? [entry(true, item.spouse)] : []),
      ],
    });
    const general = generalSchema.parse({
      filing_status: item.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Employee",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      ...(item.joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Employee",
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
      form8880_employee_contribution_review: review,
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
        pending.form8880?.print_line2a_deferrals,
        Math.round(item.primary + item.elective),
      );
      assertEquals(pending.form8880?.print_line2b_deferrals ?? 0, item.spouse);
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
    const changedW2 = [
      [],
      [...inputs.w2, inputs.w2[0]],
      inputs.w2.map((w) => ({ ...w, employer_ein: "98-7654321" })),
      inputs.w2.map((w) => ({ ...w, employee_ssn: "222-33-4444" })),
    ];
    for (const w2 of changedW2) {
      assertThrows(() => f1040_2025.executeReturn({ ...inputs, w2 }));
      const altered = { ...pending, w2: { ...pending.w2, w2s: w2 } };
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
          general: {
            ...general,
            form8880_employee_contribution_review: undefined,
          },
        },
        {
          ...pending,
          form8880: {
            ...pending.form8880,
            employee_contribution_review: undefined,
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
    // Rebuild from the altered graph: an old prepared bundle would only prove
    // its hash guard, not retained eligibility reconciliation.
    if (item.credit > 0) {
      for (const owner of ["taxpayer", "spouse"] as const) {
        if (
          (owner === "taxpayer"
            ? item.primary + item.elective
            : item.spouse) === 0
        ) continue;
        for (
          const [generalField, computedField, value] of [
            [`${owner}_dob`, `${owner}_dob`, "2008-01-02"],
            [`${owner}_dob`, `${owner}_dob`, undefined],
            [
              `${owner}_form8880_student_five_months`,
              `${owner}_student_five_months`,
              true,
            ],
            [
              `${owner}_form8880_student_five_months`,
              `${owner}_student_five_months`,
              undefined,
            ],
            [
              `${owner}_form8880_claimed_as_dependent`,
              `${owner}_claimed_as_dependent`,
              true,
            ],
            [
              `${owner}_form8880_claimed_as_dependent`,
              `${owner}_claimed_as_dependent`,
              undefined,
            ],
          ] as const
        ) {
          for (const location of ["general", "computed", "both"] as const) {
            const altered = {
              ...pending,
              general: location === "computed" ? pending.general : {
                ...general,
                [generalField]: value,
              },
              form8880: location === "general" ? pending.form8880 : {
                ...pending.form8880,
                [computedField]: value,
              },
            };
            await assertRejects(() =>
              buildMefBundle(altered, { filer, attachments: [] })
            );
            await assertRejects(() =>
              buildPdfBytes(altered, filer, ".pdf-cache")
            );
          }
        }
      }
    }
    const dir = Deno.env.get("FORM8880_EMPLOYEE_EVIDENCE");
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
Deno.test("voluntary review rejects duplicate, unreconciled and ineligible payments", () => {
  const source = {
    tax_year: 2025,
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-10",
    entries: [entry(false, 1500)],
  };
  const first = source.entries[0];
  for (
    const entries of [
      [first, first],
      [{
        ...first,
        plan_statement: {
          ...first.plan_statement,
          not_ira_or_able_confirmed: false,
        },
      }],
      [{
        ...first,
        payroll: { ...first.payroll, employee_after_tax_paid: 1499 },
      }],
      [{
        ...first,
        plan_statement: {
          ...first.plan_statement,
          participant_ssn: "999887777",
        },
      }],
      [{
        ...first,
        payroll: { ...first.payroll, not_reported_in_box12_confirmed: false },
      }],
      [{
        ...first,
        payroll: {
          ...first.payroll,
          not_employer_contributions_confirmed: false,
        },
      }],
      [{
        ...first,
        payroll: { ...first.payroll, not_section414h2_pickup_confirmed: false },
      }],
      [{
        ...first,
        plan_statement: {
          ...first.plan_statement,
          no_returned_contributions_confirmed: false,
        },
      }],
    ]
  ) {
    assertThrows(() =>
      employeeContributionReviewSchema.parse({ ...source, entries })
    );
  }
});
