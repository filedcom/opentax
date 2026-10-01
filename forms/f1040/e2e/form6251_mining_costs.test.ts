import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { form6251 as nativeForm6251 } from "../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../2025/pdf/forms/f6251.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildMefBundle } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";

const mine = {
  line_a_principal_business: "Mining exploration",
  line_b_business_code: "212000",
  line_c_business_name: "Taxpayer Mine",
  business_reference: "mine-2025",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_1_gross_receipts: 400_000,
  qbi_no_other_adjustments_confirmed: true,
  part_v_other_expenses: [{
    description: "2025 mine exploration",
    amount: 100_000,
  }],
  amt_mining_cost_workpaper: {
    property_reference: "mine-one",
    reviewed_workpaper_reference: "reviewed-mining-cost-ledger-2025",
    expense_description: "2025 mine exploration",
    paid_or_incurred_date: "2025-04-15",
    mining_exploration_or_development_verified: true,
    regular_ten_year_writeoff_not_elected: true,
    no_unamortized_property_loss: true,
  },
} as const;

function filing() {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: { schedule_cs: [mine] },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 6251 mining cost workpaper reaches AMT, Schedule 2, Form 1040, native, and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form6251!;
  assertEquals(result.pending.schedule1?.line3_schedule_c, 300_000);
  assertEquals(fields.line2q_mining_costs, 90_000);
  assertEquals((fields.line11_amt ?? 0) > 0, true);
  assertEquals(result.pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(
    result.pending.f1040?.line17_additional_taxes,
    fields.line11_amt,
  );
  const xml = nativeForm6251.build(fields, {
    pending: result.pending,
    filer: testFiler(),
  });
  assertStringIncludes(xml, "<MiningCostsAmt>90000</MiningCostsAmt>");
  assertEquals(
    form6251Pdf.projectFields!(fields, result.pending).line2q_mining_costs,
    90_000,
  );
  assertEquals(
    form6251Pdf.fields.find((field) =>
      field.domainKey === "line2q_mining_costs"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_21[0]",
  );
  assertEquals(
    form6251Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: testFiler(),
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<MiningCostsAmt>90000</MiningCostsAmt>");
  const pdf = await buildPdfBytes(pending, testFiler(), ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const changedExpense = {
    ...result.pending,
    schedule_c: {
      schedule_cs: [{
        ...mine,
        part_v_other_expenses: [{
          ...mine.part_v_other_expenses[0],
          amount: 90_000,
        }],
      }],
    },
  };
  assertThrows(() =>
    nativeForm6251.build(fields, {
      pending: changedExpense,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form6251Pdf.projectFields!(fields, changedExpense), Error);

  const electedWriteoff = {
    ...result.pending,
    schedule_c: {
      schedule_cs: [{
        ...mine,
        amt_mining_cost_workpaper: {
          ...mine.amt_mining_cost_workpaper,
          regular_ten_year_writeoff_not_elected: false,
        },
      }],
    },
  };
  assertThrows(() =>
    nativeForm6251.build(fields, {
      pending: electedWriteoff,
      filer: testFiler(),
    }), Error);
  assertThrows(
    () => form6251Pdf.projectFields!(fields, electedWriteoff),
    Error,
  );

  const changedIncome = {
    ...result.pending,
    schedule1: { ...result.pending.schedule1, line3_schedule_c: 299_999 },
  };
  assertThrows(() =>
    nativeForm6251.build(fields, {
      pending: changedIncome,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form6251Pdf.projectFields!(fields, changedIncome), Error);

  assertThrows(
    () =>
      nativeForm6251.build({ ...fields, line2q_mining_costs: 89_999 }, {
        pending: result.pending,
        filer: testFiler(),
      }),
    Error,
  );
  assertThrows(() =>
    form6251Pdf.projectFields!(
      { ...fields, line2q_mining_costs: 89_999 },
      result.pending,
    ), Error);
});
