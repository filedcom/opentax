import { z } from "zod";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { jointDistributionReviewSchema } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import { SaverDistributionTreatment as Treatment } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import {
  DistributionCode,
  itemSchema,
} from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const general = {
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1964-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Example",
  spouse_ssn: "999-88-7777",
  spouse_dob: "1964-07-15",
  taxpayer_form8880_student_five_months: false,
  taxpayer_form8880_claimed_as_dependent: false,
  spouse_form8880_student_five_months: false,
  spouse_form8880_claimed_as_dependent: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};
function copy(
  subject: TS,
  gross: number,
  ref: string,
  excluded = false,
): z.infer<typeof itemSchema> {
  return {
    ts: subject,
    recipient_ssn: subject === TS.T ? general.taxpayer_ssn : general.spouse_ssn,
    payer_name: "Example Retirement Plan",
    payer_ein: "98-7654321",
    payer_address_line1: "2 Main St",
    payer_address_city: "Austin",
    payer_address_state: "TX",
    payer_address_zip: "78701",
    source_document_reference: ref,
    account_number: ref,
    box1_gross_distribution: gross,
    box2a_taxable_amount: gross,
    box7_distribution_code: DistributionCode.Code7,
    ...(excluded ? { box7_code2: DistributionCode.CodeD } : {}),
    box7_ira_simple_indicator: subject === TS.S && !excluded,
  };
}
function entry(
  item: z.infer<typeof itemSchema>,
): z.infer<typeof jointDistributionReviewSchema>["entries"][number] {
  const excluded = item.box7_code2 === DistributionCode.CodeD;
  return {
    recipient: item.ts ?? TS.T,
    received_date: "2025-06-15",
    source_document_ref: item.source_document_reference!,
    gross_amount: item.box1_gross_distribution,
    qualifying_amount: excluded ? 0 : item.box1_gross_distribution,
    treatment: excluded ? Treatment.NonqualifyingPlan : Treatment.Included,
    current_year_1099r: {
      payer_ein: item.payer_ein,
      account_number: item.account_number!,
      taxable_amount: item.box2a_taxable_amount!,
      distribution_code: item.box7_distribution_code,
      second_distribution_code: item.box7_code2,
      ira_simple_indicator: item.box7_ira_simple_indicator ?? false,
      plan_classification_review_ref: `${item.account_number}-classification`,
    },
  };
}
const current = [
  copy(TS.T, 200, "primary-plan"),
  copy(TS.S, 100, "spouse-ira"),
];
const prior = (
  joint: boolean,
): z.infer<typeof jointDistributionReviewSchema>["entries"][number] => ({
  recipient: TS.S,
  received_date: "2023-07-01",
  qualifying_amount: 400,
  source_document_ref: "spouse-2023-distribution",
  filed_jointly_in_distribution_year: joint,
  distribution_year_return_ref: "reviewed-2023-filing-status",
});
const future = (
  joint: boolean,
): z.infer<typeof jointDistributionReviewSchema>["entries"][number] => ({
  recipient: TS.T,
  received_date: "2026-02-01",
  qualifying_amount: 500,
  source_document_ref: "primary-2026-distribution",
  plans_joint_2026: joint,
  plan_reference_2026: "reviewed-2026-filing-plan",
});
const cases = [
  {
    name: "both-current",
    copies: current,
    history: [],
    columns: [300, 300],
    credit: 580,
  },
  {
    name: "prior-separate",
    copies: current,
    history: [prior(false)],
    columns: [300, 700],
    credit: 500,
  },
  {
    name: "prior-joint",
    copies: current,
    history: [prior(true)],
    columns: [700, 700],
    credit: 420,
  },
  {
    name: "prefiling-separate",
    copies: current,
    history: [prior(false), future(false)],
    columns: [800, 700],
    credit: 400,
  },
  {
    name: "prefiling-joint",
    copies: current,
    history: [prior(false), future(true)],
    columns: [800, 1200],
    credit: 300,
  },
  {
    name: "excluded-spouse-annuity",
    copies: [...current, copy(TS.S, 500, "spouse-annuity", true)],
    history: [],
    columns: [300, 300],
    credit: 580,
  },
  {
    name: "fully-offset",
    copies: [copy(TS.T, 1500, "primary-plan"), copy(TS.S, 1000, "spouse-ira")],
    history: [],
    columns: [2500, 2500],
    credit: 0,
  },
];
function ledger(
  item: typeof cases[number],
): z.infer<typeof jointDistributionReviewSchema> {
  return {
    filing_due_date: "2026-04-15",
    reviewed_distribution_sources_ref: "complete-2023-prefiling-2026-review",
    no_other_qualifying_distributions_in_lookback: true,
    current_year_source_inventory_review: {
      reviewed_by: "Retirement Reviewer",
      reviewed_on: "2026-04-10",
      complete_1099r_inventory_confirmed: true,
    },
    entries: [...item.copies.map(entry), ...item.history],
  };
}
function wage(subject: TS, item: typeof cases[number]) {
  const income = item.copies.filter((source) => source.ts === subject).reduce(
    (total, source) => total + source.box2a_taxable_amount!,
    0,
  );
  const wages = 25000 - income;
  const deferred = subject === TS.T ? 2000 : 1500;
  return {
    ts: subject,
    employee_ssn: subject === TS.T ? general.taxpayer_ssn : general.spouse_ssn,
    employer_ein: subject === TS.T ? "12-3456789" : "23-4567890",
    employer_name: "Example Employer",
    employer_address_line1: "3 Main St",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box1_wages: wages,
    box2_fed_withheld: 1500,
    box3_ss_wages: wages + deferred,
    box4_ss_withheld: Math.round((wages + deferred) * 0.062),
    box5_medicare_wages: wages + deferred,
    box6_medicare_withheld: Math.round((wages + deferred) * 1.45) / 100,
    box12_entries: [{ code: Box12Code.D, amount: deferred }],
  };
}
for (const item of cases) {
  Deno.test(`joint saver inventory ${item.name} reconciles both owners and complete exports`, async () => {
    const review = ledger(item);
    const inputs = {
      general: { ...general, form8880_joint_distribution_review: review },
      w2: [wage(TS.T, item), wage(TS.S, item)],
      f1099r: item.copies,
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.f1040?.line11_agi, 50000);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, 1853);
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, 1853 - item.credit);
    assertEquals(pending.f1040?.line33_total_payments, 3000);
    assertEquals(pending.f1040?.line35a_refund, 1147 + item.credit);
    if (item.credit > 0) {
      assertEquals(
        pending.form8880?.print_line4a_distributions,
        item.columns[0],
      );
      assertEquals(
        pending.form8880?.print_line4b_distributions,
        item.columns[1],
      );
    } else assertEquals(pending.form8880?.calculated_zero_credit, true);
    const filer = extractFilerIdentity(general);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
      [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const variants = [
      [],
      [...item.copies, item.copies[0]],
      item.copies.map((source, index) =>
        index === 1 ? { ...source, ts: TS.T } : source
      ),
      item.copies.map((source, index) =>
        index === 1
          ? { ...source, recipient_ssn: general.taxpayer_ssn }
          : source
      ),
      item.copies.map((source, index) =>
        index === 1
          ? {
            ...source,
            box1_gross_distribution: source.box1_gross_distribution + 1,
          }
          : source
      ),
    ];
    for (const sources of variants) {
      assertThrows(() =>
        f1040_2025.executeReturn({ ...inputs, f1099r: sources })
      );
      const altered = {
        ...pending,
        f1099r: { ...pending.f1099r, f1099rs: sources },
      };
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(altered, filer, ".pdf-cache", bundle)
      );
    }
    for (
      const altered of [
        ...["taxpayer_ssn", "spouse_ssn"].map((owner) => ({
          ...pending,
          general: { ...inputs.general, [owner]: "222-33-4444" },
        })),
        {
          ...pending,
          form8880: {
            ...pending.form8880,
            joint_distribution_review: { ...review, entries: [] },
          },
        },
        {
          ...pending,
          general: {
            ...inputs.general,
            form8880_joint_distribution_review: { ...review, entries: [] },
          },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(altered, filer, ".pdf-cache", bundle)
      );
    }
    const dir = Deno.env.get("FORM8880_JOINT_EVIDENCE");
    if (dir) {
      const output = `${dir}/${item.name}`;
      await Deno.mkdir(output, { recursive: true });
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", result.pending],
          ["origins", origins],
          ["qualification", {
            expectedTaxBeforeCredits: 1853,
            expectedCredit: item.credit,
            expectedRefund: 1147 + item.credit,
            observedRefund: pending.f1040?.line35a_refund,
            refundDifference: (pending.f1040?.line35a_refund ?? 0) -
              (1147 + item.credit),
            deferredItems: [97],
            authority: "https://www.irs.gov/publications/p1040",
          }],
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
Deno.test("joint reviewed inventory rejects unclassified copies and incorrect included amounts", () => {
  const source = ledger(cases[0]);
  for (
    const entries of [
      [{ ...source.entries[0], qualifying_amount: 201 }, source.entries[1]],
      [
        { ...source.entries[0], current_year_1099r: undefined },
        source.entries[1],
      ],
      [{ ...source.entries[0], treatment: undefined }, source.entries[1]],
      [{ ...source.entries[0], gross_amount: undefined }, source.entries[1]],
      [{
        ...source.entries[0],
        received_date: "2024-06-15",
        filed_jointly_in_distribution_year: true,
        distribution_year_return_ref: "prior-return",
      }, source.entries[1]],
    ]
  ) {
    assertThrows(() =>
      jointDistributionReviewSchema.parse({ ...source, entries })
    );
  }
  assertThrows(() =>
    jointDistributionReviewSchema.parse({
      ...source,
      current_year_source_inventory_review: undefined,
    })
  );
});
