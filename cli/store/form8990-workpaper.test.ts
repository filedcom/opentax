import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  appendInput,
  createReturn,
  deleteInput,
  getInput,
  updateInput,
} from "./store.ts";
import {
  persistCalculatedForm8990Workpaper,
  readCalculatedForm8990Workpaper,
} from "./form8990-workpaper.ts";

async function makeBoundedReturn(baseDir: string) {
  const { returnId, returnPath } = await createReturn(2025, baseDir);
  await appendInput(returnPath, "general", {
    filing_status: "single",
    taxpayer_ssn: "123456789",
  });
  const scheduleC = await appendInput(returnPath, "schedule_c", {
    business_reference: "C-1",
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 200_000,
    line_12_depletion: 1_000,
    amt_depletion_worksheet: {
      source_reference: "2025 AMT depletion worksheet C-1",
      all_property_income_and_basis_limits_applied_verified: true,
      no_at_risk_or_basis_limitation_verified: true,
      properties: [{
        property_reference: "PROPERTY-1",
        regular_allowed_depletion: 1_000,
        amt_allowed_depletion: 1_000,
      }],
    },
    line_13_depreciation: 7_500,
    line_16b_interest_other: 100_000,
  });
  await appendInput(returnPath, "form8990", {
    receipts: [{ source_reference: "sale-1", kind: "sale", amount: 200_000 }],
    interestExpenseRecords: [{
      interest_payment_reference: "interest-statement-1",
      debt_proceeds_tracing_reference: "business-loan-ledger-1",
      business_reference: "C-1",
      allocation: "nonexcepted_schedule_c_business",
      interest_paid_amount: 100_000,
      line16b_business_interest_amount: 100_000,
    }],
    priorFiledScheduleCs: [2022, 2023, 2024].map((taxYear) => ({
      tax_year: taxYear,
      business_reference: "C-1",
      filed_schedule_c_document_reference: `filed-${taxYear}-schedule-c`,
      filed_tax_period_start: `${taxYear}-01-01`,
      filed_tax_period_end: `${taxYear}-12-31`,
      filed_line1_gross_receipts: 33_000_000,
      filed_line2_returns_and_allowances: 1_000_000,
      filed_line3_net_receipts: 32_000_000,
    })),
    priorFiledForm8990: {
      tax_year: 2024,
      filed_form8990_document_reference: "filed-2024-form8990",
      filed_taxpayer_ssn: "123456789",
      filed_line31_disallowed_business_interest: 0,
    },
  });
  return { returnId, returnPath, scheduleCId: scheduleC.id };
}

Deno.test("Form 8990 calculated workpaper is saved in its return and rechecked", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId, returnPath } = await makeBoundedReturn(baseDir);
    const saved = await persistCalculatedForm8990Workpaper(baseDir, returnId);
    assertEquals(saved.status, "calculated-unfiled");
    assertEquals(saved.workpaper.status, "unfiled-workpaper");
    assertEquals(saved.workpaper.sourceTaxYear, 2025);
    assertEquals(saved.workpaper.targetTaxYear, 2026);
    assertEquals(saved.workpaper.targetLine2, saved.form8990Line31);
    const raw = JSON.parse(
      await Deno.readTextFile(join(returnPath, "return.json")),
    );
    assertEquals(raw.form8990CalculatedWorkpaper, saved);
    assertEquals(
      await readCalculatedForm8990Workpaper(baseDir, returnId),
      saved,
    );
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("Form 8990 saved workpaper rejects a changed source and tampered balance", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId, returnPath } = await makeBoundedReturn(baseDir);
    await persistCalculatedForm8990Workpaper(baseDir, returnId);
    const filePath = join(returnPath, "return.json");
    const raw = JSON.parse(await Deno.readTextFile(filePath));
    raw.form8990CalculatedWorkpaper.form8990Line31++;
    await Deno.writeTextFile(filePath, JSON.stringify(raw));
    await assertRejects(
      () => readCalculatedForm8990Workpaper(baseDir, returnId),
      Error,
      "saved workpaper differs",
    );
    raw.form8990CalculatedWorkpaper.form8990Line31--;
    raw.inputs.form8990[0].fields.receipts[0].source_reference =
      "different-sale";
    await Deno.writeTextFile(filePath, JSON.stringify(raw));
    await assertRejects(
      () => readCalculatedForm8990Workpaper(baseDir, returnId),
      Error,
      "saved workpaper differs",
    );
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("Form 8990 calculated workpaper is cleared by every input mutation", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    for (const mutation of ["append", "update", "delete"] as const) {
      const { returnId, returnPath, scheduleCId } = await makeBoundedReturn(
        baseDir,
      );
      await persistCalculatedForm8990Workpaper(baseDir, returnId);
      if (mutation === "append") {
        await appendInput(returnPath, "w2", {});
      } else if (mutation === "update") {
        const scheduleC = await getInput(returnPath, scheduleCId);
        await updateInput(returnPath, scheduleCId, { ...scheduleC.fields });
      } else {
        await deleteInput(returnPath, scheduleCId);
      }
      const raw = JSON.parse(
        await Deno.readTextFile(join(returnPath, "return.json")),
      );
      assertEquals("form8990CalculatedWorkpaper" in raw, false);
      await assertRejects(
        () => readCalculatedForm8990Workpaper(baseDir, returnId),
      );
    }
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("Form 8990 workpaper cannot be saved without bounded source", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturn(2025, baseDir);
    await assertRejects(
      () => persistCalculatedForm8990Workpaper(baseDir, returnId),
      Error,
      "needs source records",
    );
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});
