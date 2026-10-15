import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  buildScheduleAPdfBytes2026,
  type DeductionSelectionInput2026,
  scheduleAPrintData2026,
} from "./schedule_a.ts";
import {
  scheduleADeductionFixture2026,
  scheduleAFixture2026,
} from "./schedule_a.fixture.ts";
import {
  syntheticMedical2026,
  syntheticPropertyTax2026,
  syntheticScheduleA2026,
} from "../schedule-a.fixture.ts";
import type { calculateScheduleA2026 } from "../schedule-a.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
const filer = { name: "Synthetic Itemizer", ssn: "111223333" };
const destinations = {
  form1040_line11b: 100000,
  form1040_line12e: 74900,
  form1040_line12f: 0,
  form1040_line13a: 0,
  form1040_line13b: 0,
};
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
Deno.test("2026 Schedule A prints reviewed expenses, charity floor, educator remainder and seller identity", async () => {
  const source = scheduleAFixture2026(),
    deduction = scheduleADeductionFixture2026(source);
  const data = scheduleAPrintData2026(source, deduction, destinations);
  assertEquals([
    data.calculation.lines.line4,
    data.calculation.lines.line7,
    data.calculation.lines.line8b,
    data.calculation.lines.line8d,
    data.calculation.lines.line11,
    data.calculation.lines.line13,
    data.calculation.lines.line17k,
  ], [9000, 30750, 24000, 1200, 10000, 9500, 450]);
  assertEquals(data.line18WorksheetRequired, false);
  assertEquals(data.line19Election, false);
  const bytes = await buildScheduleAPdfBytes2026(
    source,
    deduction,
    destinations,
    filer,
  );
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 3);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(bytes);
  for (
    const value of [
      "74900",
      "30750",
      "24000",
      "1200",
      "10000",
      "9500",
      "450",
      "See attached seller details",
      "Synthetic Home Seller",
      "123456789",
      "100 Seller Street, Boston MA 02108",
    ]
  ) assertStringIncludes(text, value);
  assertEquals(text.match(/DRAFT - NOT FOR FILING/g)?.length, 3);
});
Deno.test("2026 Schedule A screening question differs from the actual overall limitation", async () => {
  for (const agi of [384350, 384351, 1000000]) {
    const source = {
      ...syntheticScheduleA2026(),
      agi,
      tax_payments: [syntheticPropertyTax2026()],
      medical_payments: agi === 1000000
        ? [{ ...syntheticMedical2026(), amount_paid: 103000 }]
        : [],
    };
    const deduction = scheduleADeductionFixture2026(source);
    const allowed = agi === 1000000 ? 32637 : 29250;
    const dest = {
      ...destinations,
      form1040_line11b: agi,
      form1040_line12e: allowed,
    };
    const data = scheduleAPrintData2026(source, deduction, dest);
    assertEquals(data.line18WorksheetRequired, agi > 384350);
    assertEquals(
      data.resolution.itemizedLimit.reduction,
      agi === 1000000 ? 1863 : 0,
    );
    const text = await extract(
      await buildScheduleAPdfBytes2026(source, deduction, dest, filer),
    );
    assertStringIncludes(text, String(allowed));
  }
});
Deno.test("2026 Schedule A election is retained only for a smaller voluntarily selected deduction", async () => {
  const source = {
    ...syntheticScheduleA2026(),
    tax_payments: [{
      ...syntheticPropertyTax2026(),
      amount_paid: 1000,
      nondeductible_assessments_or_service_charges: 0,
      current_payment_refund: 0,
    }],
  };
  const deduction = {
    ...scheduleADeductionFixture2026(source),
    force_itemized: true,
  };
  const dest = { ...destinations, form1040_line12e: 1000 };
  assertEquals(
    scheduleAPrintData2026(source, deduction, dest).line19Election,
    true,
  );
  assertEquals(
    scheduleAPrintData2026(source, {
      ...deduction,
      force_itemized: false,
      standard_deduction_eligible: false,
    }, dest).line19Election,
    false,
  );
  await buildScheduleAPdfBytes2026(source, deduction, dest, filer);
  assertThrows(
    () =>
      scheduleAPrintData2026(source, { ...deduction, force_itemized: false }, {
        ...dest,
        form1040_line12e: 16100,
      }),
    Error,
    "does not select",
  );
});
Deno.test("2026 Schedule A rejects stale source selection, return totals and identity", async () => {
  const source = scheduleAFixture2026(),
    deduction = scheduleADeductionFixture2026(source);
  for (
    const key of [
      "agi",
      "itemized_before_overall_limit",
      "itemized_taxes",
      "nonitemizer_cash_contributions",
    ] as const
  ) {
    assertThrows(
      () =>
        scheduleAPrintData2026(source, {
          ...deduction,
          [key]: (deduction[key] ?? 0) + 1,
        }, destinations),
      Error,
      "selection disagrees",
    );
  }
  for (
    const key of Object.keys(destinations) as (keyof typeof destinations)[]
  ) {
    assertThrows(
      () =>
        scheduleAPrintData2026(source, deduction, {
          ...destinations,
          [key]: destinations[key] + 1,
        }),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildScheduleAPdfBytes2026(source, deduction, destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
  assertThrows(
    () =>
      scheduleAPrintData2026(source, {
        ...deduction,
        qbi_activity_pending: true,
      }, destinations),
    Error,
    "QBI source owner",
  );
});
Deno.test("2026 Schedule A retains connected investment withholding and selected deduction inputs", async () => {
  const input = investmentGraphInput2026(250000);
  input.investment_income.f1099ints[0].box1 = 50000;
  Object.assign(input.investment_income.f1099ints[0], {
    box17: 30000,
    box15: "CA",
    box16: "state-payer",
  });
  const result = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const calculation = result.pending.schedule_a.calculation_2026 as ReturnType<
    typeof calculateScheduleA2026
  >;
  const deduction = result.pending.standard_deduction
    .calculation_input_2026 as DeductionSelectionInput2026;
  assertEquals(
    calculateDeductionSelection2026(deduction).resolution.selected
      .line12eStandardOrItemized,
    30000,
  );
  const f = result.pending.f1040;
  const bytes = await buildScheduleAPdfBytes2026(
    calculation.source_input,
    deduction,
    {
      form1040_line11b: Number(f.line11b_agi),
      form1040_line12e: Number(f.line12e_standard_or_itemized),
      form1040_line12f: Number(f.line12f_nonitemizer_charity ?? 0),
      form1040_line13a: Number(f.line13a_schedule1a ?? 0),
      form1040_line13b: Number(f.line13b_qbi ?? 0),
    },
    { name: "Synthetic Investor", ssn: "123456789" },
  );
  assertStringIncludes(await extract(bytes), "30000");
});
Deno.test("2026 Schedule A paginates long seller details without discarding the address", async () => {
  const source = scheduleAFixture2026();
  source.mortgage_source_2026!.loans[0].interest_statements[0].seller_address =
    "Synthetic seller address ".repeat(220);
  const bytes = await buildScheduleAPdfBytes2026(
    source,
    scheduleADeductionFixture2026(source),
    destinations,
    filer,
  );
  assert((await PDFDocument.load(bytes)).getPageCount() > 3);
  assertEquals(
    (await extract(bytes)).split("\f").slice(2).join("\n").match(/address/g)
      ?.length,
    220,
  );
});
