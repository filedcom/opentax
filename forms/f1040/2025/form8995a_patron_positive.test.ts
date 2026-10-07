import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
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
Deno.test("public patron farm, owned C health and capped cooperative pass-through file full XSD and PDF", async () => {
  for (const kind of ["farm", "c-health", "income-cap"]) {
    const { fixture, pending } = prepared(kind);
    const input = inputSchema.parse(pending.form8995a);
    const amounts = patronSourceAmounts(input.patron_business_source!);
    const parent = calculateOneBusiness8995ALines(input);
    const schedule = calculatePatronScheduleDLines(input);
    assertEquals(amounts.filed_gross - amounts.filed_expenses, amounts.profit);
    assertEquals(
      pending.schedule1[
        kind === "c-health" ? "line3_schedule_c" : "line6_schedule_f"
      ],
      amounts.profit,
    );
    assertEquals(
      pending.schedule_se[
        kind === "c-health" ? "net_profit_schedule_c" : "net_profit_schedule_f"
      ],
      amounts.profit,
    );
    assertEquals(
      amounts.raw_profit,
      kind === "farm"
        ? 399999.99
        : kind === "c-health"
        ? 349999.99
        : 50000.48999999999,
    );
    assertEquals(
      amounts.profit,
      kind === "farm" ? 399999 : kind === "c-health" ? 349999 : 49999,
    );
    assertEquals(parent.line14, schedule.line6);
    assertEquals(parent.line39, pending.f1040.line13_qbi_deduction);
    assertEquals(
      schedule.line2,
      Math.round(input.qbi! * amounts.receipt_share),
    );
    assertEquals(schedule.line4, Math.round(amounts.raw_qualified_wages));
    assertEquals(schedule.line3, Math.round(schedule.line2 * .09));
    assertEquals(schedule.line5, Math.round(schedule.line4 * .50));
    assertEquals(
      input.qbi,
      Math.round(
        amounts.profit - input.patron_business_source!.se_tax_deduction -
          input.patron_business_source!.health_insurance_deduction,
      ),
    );
    assertEquals(
      parent.line38,
      kind === "income-cap" ? parent.line33 - parent.line37 : 10000,
    );
    if (kind === "c-health") {
      assertEquals(
        input.patron_business_source!.health_insurance_deduction,
        6000,
      );
    }
    if (kind === "income-cap") {
      assertEquals(parent.line39, parent.line33);
    }
    const bundle = await buildMefBundle(pending, options(fixture.filer));
    assertStringIncludes(bundle.xml, "<IRS8995AScheduleD ");
    assertEquals(bundle.xml.includes("<IRS8995 "), false);
    await assertSchema(bundle.xml);
    assert(
      (await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle))
        .length > 1000,
    );
  }
});
Deno.test("patron native and PDF reject detached issued copies, wage books, notices, adjustments and final joins", async () => {
  for (const kind of ["farm", "c-health"]) {
    const { fixture, pending: base } = prepared(kind);
    const paths = [
      ["qbi_patron", "source_1099patr", "box7_qualified_payments"],
      ["qbi_patron", "allocation_worksheet_reference"],
      ["qbi_patron", "employee_w2_records", 0, "eligible_199a_wages"],
      ["qbi_patron", "box6_written_notice_review", "designated_199ag_amount"],
      ["f1099patr", "f1099patrs", 0, "source_document_reference"],
      ["f1099patr", "f1099patrs", 0, "recipient_tin"],
      [
        kind === "farm" ? "schedule_f" : "schedule_c",
        kind === "farm" ? "schedule_fs" : "schedule_cs",
        0,
        kind === "farm" ? "line22_labor_hired" : "line_26_wages",
      ],
      ["schedule_se", "net_profit_schedule_" + (kind === "farm" ? "f" : "c")],
      ["schedule1", "line15_se_deduction"],
      ["f1040", "line11_agi"],
      ["f1040", "line13_qbi_deduction"],
      ["f1040", "line16_income_tax"],
      ["f1040", "line23_other_taxes"],
      ["f1040", "line24_total_tax"],
      ["f1040", "line14_deductions_qbi_total"],
      [
        kind === "farm" ? "schedule_f" : "schedule_c",
        "patron_filing_review",
        "reviewed_by",
      ],
      ["form8995a_schedule_d", "qbi"],
      ...(kind === "c-health"
        ? [[
          "form7206",
          "single_schedule_c_plan",
          "premium_months",
          0,
          "paid_premium",
        ]]
        : []),
    ];
    for (const path of paths) {
      const pending = structuredClone(base);
      let object: any = pending;
      for (const key of path.slice(0, -1)) object = object[key];
      const key = path.at(-1)!;
      object[key] = typeof object[key] === "number"
        ? object[key] + 1
        : "CHANGED-SOURCE";
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
