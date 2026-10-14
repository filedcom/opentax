import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../registry.ts";
import { form6251 } from "../../../../mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../pdf/forms/taxes/amt/f6251.ts";
import { testFiler } from "../../../../mef/execution/test-filer.ts";
import { assertDistinctMiningSources } from "../../../../../nodes/inputs/income/business/schedule_c/mining.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { PDFDocument } from "pdf-lib";

const mine = (
  businessReference: string,
  propertyReference: string,
  amount: number,
) => ({
  line_a_principal_business: "Mining exploration",
  line_b_business_code: "212000",
  line_c_business_name: businessReference,
  business_reference: businessReference,
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_i_made_1099_payments: false,
  line_1_gross_receipts: amount,
  qbi_no_other_adjustments_confirmed: true,
  part_v_other_expenses: [{
    description: `2025 exploration ${propertyReference}`,
    amount,
  }],
  amt_mining_cost_workpaper: {
    property_reference: propertyReference,
    reviewed_workpaper_reference: `reviewed ${propertyReference} cost ledger`,
    expense_description: `2025 exploration ${propertyReference}`,
    paid_or_incurred_date: "2025-04-15",
    mining_exploration_or_development_verified: true,
    regular_ten_year_writeoff_not_elected: true,
    no_unamortized_property_loss: true,
  },
});

const mines = [
  mine("mine-west-2025", "west-claim", 100_000),
  mine("mine-east-2025", "east-claim", 50_000),
];

function filing(scheduleCItems = mines) {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: [{
      employee_ssn: "123-45-6789",
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.20,
      box5_medicare_wages: 300_000,
      box6_medicare_withheld: 4_350,
      employer_ein: "12-3456789",
      employer_name: "ACME Mining",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    schedule_c: scheduleCItems,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("four distinct current-year mines reconcile Form 6251, Schedule 2, Form 1040, native, and PDF", async () => {
  const allMines = [
    ...mines,
    mine("mine-north-2025", "north-claim", 30_000),
    mine("mine-south-2025", "south-claim", 20_000),
  ];
  const pending = filing(allMines).pending;
  const fields = pending.form6251!;
  assertEquals(pending.schedule1?.line3_schedule_c, 0);
  assertEquals(fields.line2q_mining_costs, 180_000);
  assertEquals(pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(pending.f1040?.line17_additional_taxes, fields.line11_amt);
  const xml = form6251.build(fields, { pending, filer: testFiler() });
  assertStringIncludes(xml, "<MiningCostsAmt>180000</MiningCostsAmt>");
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2q_mining_costs,
    180_000,
  );
  const finalFiler = {
    ...testFiler(),
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
    fullName: "Alex Taxpayer",
  };
  const bundle = await buildMefBundle(buildPending(pending), {
    filer: finalFiler,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<MiningCostsAmt>180000</MiningCostsAmt>");
  const pdf = await buildPdfBytes(pending, finalFiler, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  for (
    const changed of [
      {
        ...pending,
        schedule_c: {
          ...pending.schedule_c,
          schedule_cs: [
            ...allMines.slice(0, 3),
            {
              ...allMines[3],
              part_v_other_expenses: [{
                ...allMines[3].part_v_other_expenses[0],
                amount: 19_990,
              }],
            },
          ],
        },
      },
      {
        ...pending,
        schedule_c: {
          ...pending.schedule_c,
          schedule_cs: [
            ...allMines.slice(0, 3),
            {
              ...allMines[3],
              amt_mining_cost_workpaper: {
                ...allMines[3].amt_mining_cost_workpaper,
                property_reference:
                  allMines[0].amt_mining_cost_workpaper.property_reference,
              },
            },
          ],
        },
      },
      {
        ...pending,
        schedule1: { ...pending.schedule1, line3_schedule_c: 1 },
      },
      {
        ...pending,
        schedule2: { ...pending.schedule2, line2_amt: 1 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 1 },
      },
    ]
  ) {
    assertThrows(
      () => form6251.build(fields, { pending: changed, filer: testFiler() }),
      Error,
    );
    assertThrows(() => form6251Pdf.projectFields!(fields, changed), Error);
  }
});

Deno.test("two distinct mine workpapers sum once on Form 6251 line 2q and the final return", () => {
  const pending = filing().pending;
  const fields = pending.form6251!;
  assertEquals(pending.schedule1?.line3_schedule_c, 0);
  assertEquals(fields.line2q_mining_costs, 135_000);
  assertEquals(pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(pending.f1040?.line17_additional_taxes, fields.line11_amt);
  const xml = form6251.build(fields, { pending, filer: testFiler() });
  assertStringIncludes(xml, "<MiningCostsAmt>135000</MiningCostsAmt>");
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2q_mining_costs,
    135_000,
  );
});

Deno.test("two-mine line 2q export rejects a changed mine, duplicate property, and changed Schedule 1", () => {
  const pending = filing().pending;
  const fields = pending.form6251!;
  const altered = [{
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [
        mines[0],
        {
          ...mines[1],
          part_v_other_expenses: [{
            ...mines[1].part_v_other_expenses[0],
            amount: 49_990,
          }],
        },
      ],
    },
  }, {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [
        mines[0],
        {
          ...mines[1],
          amt_mining_cost_workpaper: {
            ...mines[1].amt_mining_cost_workpaper,
            property_reference: mines[0].amt_mining_cost_workpaper
              .property_reference,
          },
        },
      ],
    },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line3_schedule_c: 1 },
  }];
  for (const changed of altered) {
    assertThrows(() =>
      form6251.build(fields, {
        pending: changed,
        filer: testFiler(),
      }), Error);
    assertThrows(() => form6251Pdf.projectFields!(fields, changed), Error);
  }
  assertThrows(
    () =>
      assertDistinctMiningSources([
        mines[0] as never,
        {
          ...mines[1],
          amt_mining_cost_workpaper: {
            ...mines[1].amt_mining_cost_workpaper,
            property_reference: mines[0].amt_mining_cost_workpaper
              .property_reference,
          },
        } as never,
      ]),
    Error,
    "distinct Schedule C businesses, properties, and reviewed workpapers",
  );
});
