import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { syntheticEducator2026 } from "../inputs/educator.fixture.ts";
import { schedule1Fixture2026 } from "./schedule1.fixture.ts";
import {
  buildSchedule1PdfBytes2026,
  type Schedule1Input2026,
} from "./schedule1.ts";
const filer = { name: "Synthetic Filer", ssn: "111223333" };
const destinations = { form1040_line8: 3551, form1040_line10: 5167 };
async function extract(bytes: Uint8Array) {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/form.pdf`, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/form.pdf`, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}
Deno.test("2026 Schedule 1 prints signed income, adjusted deductions and reconciled statements", async () => {
  const bytes = await buildSchedule1PdfBytes2026(
    schedule1Fixture2026(),
    destinations,
    filer,
  );
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 3);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(bytes);
  for (
    const expected of [
      "2017-06-01",
      "(500)",
      "(200)",
      "201",
      "3551",
      "5167",
      "1667",
      "See attached statement",
      "RTAA payments",
      "Taxable grants",
      "Synthetic income correction",
      "(50)",
      "Total included on Schedule 1 line 8z: 250",
    ]
  ) assertStringIncludes(text, expected);
  assert(
    !text.includes("2500"),
    "Raw student-loan interest must not print as the deduction",
  );
  assertEquals(text.match(/DRAFT - NOT FOR FILING/g)?.length, 3);
});
Deno.test("2026 Schedule 1 prints a storage-only attachment even when its deduction rounds to zero", async () => {
  const bytes = await buildSchedule1PdfBytes2026(
    {
      line14_storage_fees: true,
      line14_moving_expenses: 0,
      agi_schedule1_line10: 0,
      agi_schedule1_line26: 0,
    },
    { form1040_line8: 0, form1040_line10: 0 },
    filer,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
});
Deno.test("2026 Schedule 1 rejects stale totals and missing print facts", async () => {
  for (const key of ["form1040_line8", "form1040_line10"] as const) {
    await assertRejects(
      () =>
        buildSchedule1PdfBytes2026(schedule1Fixture2026(), {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildSchedule1PdfBytes2026(
        { ...schedule1Fixture2026(), agi_schedule1_line26: 1 },
        destinations,
        filer,
      ),
    Error,
    "disagrees with AGI totals",
  );
  for (
    const [key, message] of [
      ["line2b_alimony_agreement_date", "agreement date"],
      ["line4_from_form4797", "source-form answers"],
      ["line20_mfs_lived_apart_all_year", "lived-apart answer"],
    ] as const
  ) {
    await assertRejects(
      () =>
        buildSchedule1PdfBytes2026(
          { ...schedule1Fixture2026(), [key]: undefined },
          destinations,
          filer,
        ),
      Error,
      message,
    );
  }
  await assertRejects(
    () =>
      buildSchedule1PdfBytes2026(
        {},
        { form1040_line8: 0, form1040_line10: 0 },
        filer,
      ),
    Error,
    "does not require",
  );
  await assertRejects(
    () =>
      buildSchedule1PdfBytes2026(schedule1Fixture2026(), destinations, {
        name: "",
        ssn: "invalid",
      }),
    Error,
    "identity",
  );
});
Deno.test("2026 Schedule 1 wraps a long single income type onto paginated statements", async () => {
  const description = "Synthetic source description ".repeat(150);
  const bytes = await buildSchedule1PdfBytes2026(
    {
      line8z_other: 500,
      line8z_description: description,
      agi_schedule1_line10: 500,
      agi_schedule1_line26: 0,
    },
    { form1040_line8: 500, form1040_line10: 0 },
    filer,
  );
  const doc = await PDFDocument.load(bytes);
  assert(doc.getPageCount() > 3);
  const text = await extract(bytes);
  assertStringIncludes(text, "See attached statement");
  assertEquals(text.match(/description/g)?.length, 150);
});
Deno.test("2026 connected educator and investment sources reach the retained Schedule 1 PDF calculation", async () => {
  const input = investmentGraphInput2026(150000);
  input.investment_income.f1099ints[0].box2 = 100.5;
  const educator = syntheticEducator2026();
  const {
    filing_status: _status,
    taxpayer_ssn: _taxpayer,
    spouse_ssn: _spouse,
    ...claim
  } = educator;
  // Synthetic fixture owners are rewritten together before entering the graph.
  const educatorClaim = JSON.parse(
    JSON.stringify(claim).replaceAll("111223333", "123456789"),
  );
  const result = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    {
      ...input,
      educator_expenses: educatorClaim,
      schedule_a: {
        ...input.schedule_a,
        source_scope_review: {
          ...input.schedule_a.source_scope_review,
          no_casualty_or_other_itemized_deductions: undefined,
          has_educator_expense_sources: true,
          no_casualty_or_other_itemized_except_educator: true,
        },
      },
    },
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line10_adjustments, 451);
  const retained = result.pending.schedule1
    .calculation_input_2026 as Schedule1Input2026;
  assertEquals(retained.line11_educator_expenses, 350);
  assertEquals(retained.line18_early_withdrawal, 101);
  const bytes = await buildSchedule1PdfBytes2026(retained, {
    form1040_line8: Number(result.pending.f1040.line8_additional_income ?? 0),
    form1040_line10: Number(result.pending.f1040.line10_adjustments),
  }, { name: "Synthetic Investor", ssn: "123456789" });
  const text = await extract(bytes);
  for (const value of ["350", "101", "451"]) assertStringIncludes(text, value);
});
