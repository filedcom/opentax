import { patronSpouseW2 } from "../../../../pdf/reviews/general/composed-returns/review-8995a-patron-joint.fixture.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { projectOneBusiness8995A } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  calculateOneBusiness8995ALines,
  calculatePatronScheduleDLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
const seLinesForProfit = (profit: number) =>
  scheduleSELines(
    { net_profit_schedule_f: profit },
    CONFIG_BY_YEAR[2025].ssWageBase,
  )!.line13;
import { patronSourceAmounts } from "../../../../../nodes/inputs/deductions/business/qbi_patron/calculation.ts";

function prepared(kind: string) {
  const fixture = pdfReviewFixtures.find((f) =>
    f.id === `joint-form8995a-patron-${kind}`
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
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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

Deno.test("owned MFJ patron C/F sources and spouse wages phase in with actual SE/health and full XSD/PDF", async () => {
  const cases = [
    ["farm", 424367, .29767, 4516, 40657, 13552, 10000, 37105, 108716],
    ["c-health", 443031, .48431, 9156, 39750, 15720, 10000, 34030, 115962],
    ["income-cap", 439165, .44565, 19222, 28911, 5001, 415255, 439165, 30604],
  ] as const;
  for (
    const [kind, taxable, ratio, reduction, after, patron, dpad, qbi, tax]
      of cases
  ) {
    const { fixture, pending } = prepared(kind);
    const input = inputSchema.parse(pending.form8995a);
    const lines = calculateOneBusiness8995ALines(input);
    const amounts = patronSourceAmounts(input.patron_business_source!);
    assertEquals(amounts.filed_gross - amounts.filed_expenses, amounts.profit);
    assertEquals(lines.patronThreshold, 394600);
    assertEquals(lines.patronPhaseInRange, 100000);
    assertEquals(lines.line33, taxable);
    assertEquals(lines.phaseIn, ratio);
    assertEquals(lines.line25, reduction);
    assertEquals(lines.line26, after);
    assertEquals(lines.line14, patron);
    assertEquals(calculatePatronScheduleDLines(input).line6, patron);
    assertEquals(lines.line38, dpad);
    assertEquals(lines.line39, qbi);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line13_qbi_deduction, qbi);
    assertEquals(pending.schedule_se.w2_ss_wages, undefined);
    assertEquals((pending.w2.w2s as any[])[0].box3_ss_wages, 176100);
    assertEquals(
      pending.schedule1.line15_se_deduction,
      input.patron_business_source!.se_tax_deduction,
    );
    assertEquals(pending.f1040.line1a_wages, 230000.49);
    assertEquals(
      pending.f1040.line11_agi,
      amounts.profit + 230000.49 -
        input.patron_business_source!.se_tax_deduction -
        (kind === "c-health" ? 6000 : 0),
    );
    if (kind === "c-health") {
      assertEquals(
        input.patron_business_source!.health_insurance_deduction,
        6000,
      );
    }
    if (kind === "income-cap") {
      assertEquals(
        input.patron_business_source!.review.source_1099patr
          .box6_section199ag_deduction,
        540000,
      );
      assertEquals(Math.round(Number(pending.f1040.line15_taxable_income)), 0);
    }
    const print = projectOneBusiness8995A(input, pending);
    assertEquals(print.line21, 394600);
    assertEquals(print.line23, 100000);
    assertEquals(print.line24, Number((ratio * 100).toFixed(3)).toString());
    const bundle = await buildMefBundle(pending, options(fixture.filer));
    assertStringIncludes(
      bundle.xml,
      `<FilingStatusThresholdCd>394600</FilingStatusThresholdCd>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<PhaseInPct>${ratio.toFixed(5)}</PhaseInPct>`,
    );
    await assertSchema(bundle.xml);
    assert(
      (await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle))
        .length > 1000,
    );
  }
});

Deno.test("joint patron source wages cross both actual MFJ threshold boundaries", async () => {
  for (const target of [394600, 394601, 494599, 494600, 494601]) {
    const { fixture } = prepared("farm");
    const inputs = structuredClone(fixture.inputs) as any;
    const wages = patronSpouseW2(inputs.w2[0], target - 194367 + .49);
    inputs.w2 = [wages];
    inputs.qbi_patron.spouse_w2_sources = [wages];
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending) as any;
    const lines = calculateOneBusiness8995ALines(
      inputSchema.parse(pending.form8995a),
    );
    assertEquals(lines.line33, target);
    assertEquals(lines.phaseInRequired, target > 394600 && target <= 494600);
    assertEquals(pending.schedule_se.w2_ss_wages, undefined);
    if (target === 394601) {
      assertEquals(lines.phaseIn, .00001);
      assertEquals(lines.line25, 0);
    }
    if (target === 494600) {
      assertEquals(lines.phaseIn, 1);
      assertEquals(lines.line13, lines.line11);
    }
    const bundle = await buildMefBundle(pending, options(fixture.filer));
    await assertSchema(bundle.xml);
    assert(
      (await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle))
        .length > 1000,
    );
  }
});

Deno.test("joint patron rejects wrong owners, detached spouse wages, health and final native/PDF joins", async () => {
  for (const kind of ["farm", "c-health", "income-cap"]) {
    const { fixture, pending: base } = prepared(kind);
    const paths = [
      ["w2", "w2s", 0, "employee_ssn"],
      ["w2", "w2s", 0, "source_document_reference"],
      ["w2", "w2s", 0, "box1_wages"],
      ["w2", "w2s", 0, "box3_ss_wages"],
      ["qbi_patron", "spouse_w2_sources", 0, "employee_ssn"],
      ["w2", "patron_filing_review", "reviewed_by"],
      ["general", "spouse_ssn"],
      ["general", "taxpayer_ssn"],
      ["general", "filing_status"],
      ["f1099patr", "f1099patrs", 0, "recipient_tin"],
      [
        kind === "c-health" ? "schedule_c" : "schedule_f",
        kind === "c-health" ? "schedule_cs" : "schedule_fs",
        0,
        "proprietor_recipient",
      ],
      ["schedule_se", "w2_ss_wages"],
      ["schedule1", "line15_se_deduction"],
      ["form8995a", "taxable_income"],
      ["form8995a_schedule_d", "filing_status"],
      ["f1040", "line11_agi"],
      ["f1040", "line13_qbi_deduction"],
      ["f1040", "line24_total_tax"],
      ...(kind === "c-health"
        ? [["form7206", "single_schedule_c_plan", "recipient"], [
          "form7206",
          "single_schedule_c_plan",
          "taxpayer_identity",
          "ssn",
        ]]
        : []),
    ];
    for (const path of paths) {
      const pending = structuredClone(base);
      let row: any = pending;
      for (const key of path.slice(0, -1)) row = row[key];
      const key = path.at(-1)!;
      row[key] = typeof row[key] === "number"
        ? row[key] + 1
        : key === "w2_ss_wages"
        ? 1
        : key === "employee_ssn" || key === "spouse_ssn"
        ? "111223333"
        : key === "recipient_tin" || key === "taxpayer_ssn" || key === "ssn"
        ? "444556666"
        : key === "proprietor_recipient" || key === "recipient"
        ? "S"
        : key === "filing_status"
        ? "single"
        : "CHANGED";
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

Deno.test("valid primary W2 owner substituted in both public and reviewed spouse copies rejects export", async () => {
  const { fixture } = prepared("farm");
  const inputs = structuredClone(fixture.inputs) as any;
  inputs.w2[0].employee_ssn = "111223333";
  inputs.qbi_patron.spouse_w2_sources[0].employee_ssn = "111223333";
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending) as any;
  await assertRejects(
    () => buildMefBundle(pending, options(fixture.filer)),
    Error,
  );
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer, ".pdf-cache"),
    Error,
  );
});
