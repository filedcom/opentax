import { inputSchema as scheduleCSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { bonusFilerFixture } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import {
  currentYearInput,
  currentYearMultiInput,
} from "./current-year.fixture.ts";
import { filedCurrentYearSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";

Deno.test("Current-year MACRS returns reconcile property credits, Schedule C, SE, QBI and native rows", async () => {
  for (
    const [late, construction, bonus, residual, depreciation, total, credit]
      of [
        [false, false, 3760, 5640, 1128, 4888, 600],
        [true, false, 3760, 5640, 282, 4042, 600],
        [false, true, 2800, 4200, 840, 3640, 3000],
      ] as const
  ) {
    const input = currentYearInput(late, construction);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    const filed = filedCurrentYearSchema.parse(p.form4562);
    assertEquals(
      filed.current_year_activities[0].line22_total_depreciation,
      total,
    );
    assertEquals(p.f1040.line11_agi, 59293);
    assertEquals(p.f1040.line13_qbi_deduction, 1859);
    assertEquals(p.f1040.line16_income_tax, 4763);
    assertEquals(p.f1040.line23_other_taxes, 1413);
    assertEquals(p.f3800.allowed_credit, credit);
    assertEquals(p.f1040.line24_total_tax, 6176 - credit);
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    const xml = prepared.bundle.xml;
    for (
      const [tag, value] of [
        ["SpecialAllowanceAmt", bonus],
        ["BasisForDepreciationAmt", residual],
        ["DepreciationDeductionAmt", depreciation],
        ["TotalDepreciationAmt", total],
        ["DepreciationConventionCd", late ? "MQ" : "HY"],
        ["DepreciationMethodCd", "200 DB"],
      ] as const
    ) assertStringIncludes(xml, `<${tag}>${value}</${tag}>`);
    assertStringIncludes(xml, "<GDS5YearProperty>");
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Current-year export rejects changed class rows, totals, owner and source joins", async () => {
  const result = f1040_2025.executeReturn(currentYearInput());
  const p = result.pending;
  const filed = filedCurrentYearSchema.parse(p.form4562);
  const a = filed.current_year_activities[0];
  const row = a.gds_rows[0];
  for (
    const patch of [
      { basis: 5641 },
      { deduction: 1129 },
      { convention: "MQ" },
      { recovery_period: 7 },
      { method: "150 DB" },
    ]
  ) {
    await assertRejects(() =>
      f1040_2025.prepareReturn({
        ...p,
        form4562: {
          ...filed,
          current_year_activities: [{ ...a, gds_rows: [{ ...row, ...patch }] }],
        },
      }, bonusFilerFixture.filer)
    );
  }
  for (
    const patch of [
      { line14_special_depreciation_allowance: 3761 },
      { line22_total_depreciation: 4889 },
      { proprietor_ssn: "999887777" },
      { business_reference: "wrong-business" },
    ]
  ) {
    await assertRejects(() =>
      f1040_2025.prepareReturn({
        ...p,
        form4562: { ...filed, current_year_activities: [{ ...a, ...patch }] },
      }, bonusFilerFixture.filer)
    );
  }
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...p,
      schedule_c: {
        ...p.schedule_c,
        schedule_cs: scheduleCSchema.parse(p.schedule_c).schedule_cs.map((
          c,
        ) => ({
          ...c,
          line_13_depreciation: 4889,
        })),
      },
    }, bonusFilerFixture.filer)
  );
  const input = currentYearInput();
  const mismatch = f1040_2025.executeReturn({
    ...input,
    form4562: {
      current_year_inventory: {
        ...input.form4562.current_year_inventory,
        assets: input.form4562.current_year_inventory.assets.map((asset) => ({
          ...asset,
          source_document_ref: "unrelated-invoice",
        })),
      },
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(mismatch.pending, bonusFilerFixture.filer)
  );
});

Deno.test("Current-year complete inventories file six classes, multiple quarters and multiple activities", async () => {
  for (
    const [mode, convention, deduction, credit, copies, rows] of [
      ["mixed-bonus", "MQ", 23970, 1800, 2, 1],
      ["six-classes", "HY", 28870, 600, 1, 6],
      ["mixed-quarters", "MQ", 28200, 3600, 1, 1],
    ] as const
  ) {
    const input = currentYearMultiInput(mode);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    const filed = filedCurrentYearSchema.parse(p.form4562);
    assertEquals(filed.convention, convention);
    assertEquals(filed.current_year_activities.length, copies);
    assertEquals(
      filed.current_year_activities.reduce(
        (sum, a) => sum + a.line22_total_depreciation,
        0,
      ),
      deduction,
    );
    assertEquals(
      filed.current_year_activities.reduce(
        (sum, a) => sum + a.gds_rows.length,
        0,
      ),
      rows,
    );
    assertEquals(p.f1040.line11_agi, mode === "mixed-bonus" ? 77881 : 59293);
    assertEquals(
      p.f1040.line13_qbi_deduction ?? 0,
      mode === "mixed-bonus" ? 5576 : 1859,
    );
    assertEquals(
      p.f1040.line24_total_tax,
      (mode === "mixed-bonus" ? 11599 : 6176) - credit,
    );
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4562 /g) ?? []).length,
      copies,
    );
    if (mode === "six-classes") {
      for (const period of [3, 5, 7, 10, 15, 20]) {
        assertStringIncludes(prepared.bundle.xml, `<GDS${period}YearProperty>`);
      }
    }
  }
});

Deno.test("Profitable activities reject missing QBI allocation reviews", async () => {
  const source = currentYearMultiInput("mixed-bonus");
  const result = f1040_2025.executeReturn({
    ...source,
    schedule_c: source.schedule_c.map((c) => ({
      ...c,
      qbi_se_tax_allocation_review: undefined,
    })),
  });
  assertEquals(result.diagnostics, []);
  await assertRejects(() =>
    f1040_2025.prepareReturn(result.pending, bonusFilerFixture.filer)
  );
});
