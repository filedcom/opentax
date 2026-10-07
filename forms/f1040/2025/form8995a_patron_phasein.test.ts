import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { projectOneBusiness8995A } from "./pdf/forms/f8995a.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  calculateOneBusiness8995ALines,
  calculatePatronScheduleDLines,
  inputSchema,
} from "../nodes/intermediate/forms/form8995a/index.ts";
import { scheduleSELines } from "../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
const seLinesForProfit = (profit: number) =>
  scheduleSELines(
    { net_profit_schedule_f: profit },
    CONFIG_BY_YEAR[2025].ssWageBase,
  )!.line13;
import { patronSourceAmounts } from "../nodes/inputs/qbi_patron/calculation.ts";

function prepared(kind: string) {
  const fixture = pdfReviewFixtures.find((f) =>
    f.id === `single-form8995a-patron-${kind}`
  )!;
  const result = f1040_2025.executeReturn(structuredClone(fixture.inputs));
  assertEquals(result.diagnostics, []);
  return {
    fixture,
    pending: buildPending(result.pending) as Record<
      string,
      Record<string, unknown>
    >,
  };
}
const options = (filer: typeof pdfReviewFixtures[number]["filer"]) => ({
  filer,
  year: 2025 as const,
  returnType: "1040",
  schemaVersion: "2025v5.4",
  attachments: [],
});
async function assertSchema(xml: string) {
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const process = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const result = await process.output();
  assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
}

Deno.test("actual patron sources phase in wages before Schedule D and DPAD with full XML/PDF", async () => {
  const expected = [
    ["phase-farm", 210117, .25634, 3889, 41284, 13552, 10000, 37732, 62678],
    [
      "phase-c-health",
      228781,
      .62962,
      11903,
      37003,
      15720,
      10000,
      31283,
      69598,
    ],
    [
      "phase-income-cap",
      224915,
      .55230,
      23822,
      24311,
      5001,
      205605,
      224915,
      28984,
    ],
    ["phase-unbound", 219983, 0, 0, 0, 11787, 10000, 45360, 63566],
  ] as const;
  for (
    const [kind, taxable, ratio, reduction, after, patron, dpad, qbi, tax]
      of expected
  ) {
    const { fixture, pending } = prepared(kind);
    const input = inputSchema.parse(pending.form8995a);
    const lines = calculateOneBusiness8995ALines(input);
    const schedule = calculatePatronScheduleDLines(input);
    const amounts = patronSourceAmounts(input.patron_business_source!);
    assertEquals(amounts.filed_gross - amounts.filed_expenses, amounts.profit);
    assertEquals(lines.line33, taxable);
    assertEquals(lines.phaseIn, ratio);
    assertEquals(lines.line25, reduction);
    assertEquals(lines.line26, after);
    assertEquals(lines.line14, patron);
    assertEquals(schedule.line6, patron);
    assertEquals(lines.line38, dpad);
    assertEquals(lines.line39, qbi);
    assertEquals(pending.f1040.line13_qbi_deduction, qbi);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(lines.line15, Math.max(0, lines.line13 - lines.line14));
    assertEquals(lines.line39, lines.line37 + lines.line38);
    if (lines.phaseInRequired) {
      assertEquals(lines.line19, lines.line3 - lines.line10);
      assertEquals(lines.line25, Math.round(lines.line19! * ratio));
      assertEquals(lines.line12, lines.line3 - lines.line25!);
      assertEquals(lines.line13, Math.max(lines.line11, lines.line12!));
    } else assertEquals(lines.line13, lines.line3);
    if (kind === "phase-c-health") {
      assertEquals(
        input.patron_business_source!.health_insurance_deduction,
        6000,
      );
    }
    if (kind === "phase-income-cap") {
      assertEquals(
        input.patron_business_source!.review.source_1099patr
          .box6_section199ag_deduction,
        270000,
      );
      assertEquals(pending.f1040.line15_taxable_income, 0);
    }
    const bundle = await buildMefBundle(pending, options(fixture.filer));
    assertStringIncludes(bundle.xml, "<IRS8995AScheduleD ");
    assertEquals(bundle.xml.includes("<PhaseInPct>"), lines.phaseInRequired);
    if (lines.phaseInRequired) {
      assertStringIncludes(
        bundle.xml,
        `<PhaseInPct>${ratio.toFixed(5)}</PhaseInPct>`,
      );
      assertEquals(
        projectOneBusiness8995A(input, pending).line24,
        (ratio * 100).toFixed(3).replace(/\.?0+$/, ""),
      );
    }
    await assertSchema(bundle.xml);
    assert(
      (await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle))
        .length > 1000,
    );
  }
});

Deno.test("public patron whole-dollar threshold boundaries retain source and filed equations", async () => {
  for (const target of [197300, 197301, 247299, 247300, 247301]) {
    const original = prepared("phase-farm").fixture;
    const inputs = structuredClone(original.inputs) as any;
    let lo = 200000, hi = 350000, profit = 0;
    // Solve for business books' filed profit; the issued PATR/wage sources remain unchanged.
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const se = seLinesForProfit(mid);
      const taxable = mid - se - 15750;
      if (taxable === target) {
        profit = mid;
        break;
      }
      if (taxable < target) lo = mid + 1;
      else hi = mid - 1;
    }
    assert(profit > 0, `source profit exists for ${target}`);
    inputs.schedule_f.schedule_fs[0].line2_sales_products_raised = profit -
      139999 + .49;
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    const lines = calculateOneBusiness8995ALines(
      inputSchema.parse(pending.form8995a),
    );
    assertEquals(lines.line33, target);
    assertEquals(lines.phaseInRequired, target > 197300 && target <= 247300);
    if (target === 197301) {
      assertEquals(lines.phaseIn, .00002);
      assertEquals(lines.line25, 0);
    }
    if (target === 247300) {
      assertEquals(lines.phaseIn, 1);
      assertEquals(lines.line13, lines.line11);
    }
    const bundle = await buildMefBundle(pending, options(original.filer));
    await assertSchema(bundle.xml);
    assert(
      (await buildPdfBytes(pending, original.filer, ".pdf-cache", bundle))
        .length > 1000,
    );
  }
});

Deno.test("phase-in patron rejects detached sources, percentages' operands and final native/PDF joins", async () => {
  for (const kind of ["phase-farm", "phase-c-health", "phase-income-cap"]) {
    const { fixture, pending: base } = prepared(kind);
    for (
      const path of [
        ["form8995a", "taxable_income"],
        ["form8995a", "w2_wages"],
        [
          "form8995a",
          "patron_filing_details",
          "qbi_allocable_to_qualified_payments",
        ],
        ["form8995a", "patron_business_source", "se_tax_deduction"],
        ["form8995a_schedule_d", "taxable_income"],
        ["qbi_patron", "source_1099patr", "box7_qualified_payments"],
        ["f1099patr", "f1099patrs", 0, "source_document_reference"],
        ["qbi_patron", "box6_written_notice_review", "designated_199ag_amount"],
        ["f1040", "line11_agi"],
        ["f1040", "line13_qbi_deduction"],
        ["f1040", "line16_income_tax"],
        ["f1040", "line24_total_tax"],
      ]
    ) {
      const pending = structuredClone(base);
      let row: any = pending;
      for (const key of path.slice(0, -1)) row = row[key];
      const key = path.at(-1)!;
      row[key] = typeof row[key] === "number" ? row[key] + 1 : "CHANGED";
      await assertRejects(
        () => buildMefBundle(pending, options(fixture.filer)),
        Error,
        undefined,
        path.join("."),
      );
      await assertRejects(
        () => buildPdfBytes(pending, fixture.filer, ".pdf-cache"),
        Error,
        undefined,
        path.join("."),
      );
    }
  }
});
