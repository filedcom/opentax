import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { form8826InterpreterInputs } from "./pdf/review-8826-interpreter.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { inputSchema as cSchema } from "../nodes/inputs/schedule_c/model.ts";
import { inputSchema as creditSchema } from "../nodes/inputs/f8826/index.ts";
import { inputSchema as parentSchema } from "../nodes/inputs/f3800/index.ts";

Deno.test("actual interpreter invoice and full expense reduction reconcile full partial zero credit packets", async () => {
  const root = ".state/research/2026-10-06-form8826-interpreter-source";
  await Deno.mkdir(root, { recursive: true });
  for (
    const [id, receipts] of [["full", 80000], ["partial", 22000], [
      "zero",
      6000,
    ]] as const
  ) {
    const inputs = form8826InterpreterInputs(receipts);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line3_schedule_c, receipts - 2625);
    assertEquals(
      cSchema.parse(pending.schedule_c).schedule_cs[0].line_27b_other_expenses,
      2625,
    );
    assertEquals(
      creditSchema.parse(pending.f8826).self_source_evidence!
        .interpreter_expenditures[0].amount,
      5000,
    );
    assertEquals(
      parentSchema.parse(pending.f3800).f8826_credit_entries![0].credit_amount,
      2375,
    );
    assertEquals(typeof pending.f3800.allowed_credit, "number");
    const allowed = Number(pending.f3800.allowed_credit);
    assertEquals(pending.f1040.line20_nonrefundable_credits, allowed);
    assertEquals(allowed >= 0 && allowed <= 2375, true);
    if (id === "full") assertEquals(allowed, 2375);
    if (id === "partial") assertEquals(allowed > 0 && allowed < 2375, true);
    if (id === "zero") assertEquals(allowed, 0);
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      extractFilerIdentity(inputs.general)!,
    );
    assertStringIncludes(prepared.bundle.xml, "<IRS8826 ");
    assertStringIncludes(
      prepared.bundle.xml,
      "<ShareOfCreditAmt>2375</ShareOfCreditAmt>",
    );
    const xmlFile = `${root}/${id}.xml`;
    await Deno.writeTextFile(xmlFile, prepared.bundle.xml);
    const xsd =
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlFile],
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/${id}.json`,
      JSON.stringify({ inputs, pending }, null, 2),
    );
    const parsed = await PDFDocument.load(pdf);
    assertEquals(parsed.getForm().getFields().length, 0);
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", `${root}/${id}.pdf`, "-"],
      stdout: "piped",
    }).output();
    assertEquals(text.code, 0);
    assertStringIncludes(
      new TextDecoder().decode(text.stdout),
      "Disabled Access Credit",
    );
    console.log({
      id,
      pages: parsed.getPageCount(),
      profit: receipts - 2625,
      credit: allowed,
      agi: pending.f1040.line11_agi,
      qbi: pending.f1040.line13_qbi_deduction,
      tax: pending.f1040.line24_total_tax,
    });
  }
});

Deno.test("interpreter source conflicts reject native and direct printable exports", async () => {
  const inputs = form8826InterpreterInputs();
  const result = f1040_2025.executeReturn(inputs);
  const filer = extractFilerIdentity(inputs.general)!;
  const mutations: ((p: any) => void)[] = [
    (p) => p.f8826.self_source_evidence.interpreter_expenditures[0].amount++,
    (p) =>
      p.f8826.self_source_evidence.business_reference = "Detached-business",
    (p) => p.f8826.self_source_evidence.prior_year_gross_receipts++,
    (p) => p.schedule_c.schedule_cs[0].line_27b_other_expenses++,
    (p) =>
      p.f8826.self_source_evidence.schedule_c_line27b.credit_reduction_amount++,
    (p) => p.f3800.f8826_credit_entries[0].credit_amount++,
    (p) => p.f1040.line20_nonrefundable_credits++,
  ];
  for (const mutate of mutations) {
    const pending = normalizeAllPending(structuredClone(result.pending));
    mutate(pending);
    await assertRejects(() => f1040_2025.prepareReturn!(pending, filer));
    await assertRejects(() => buildPdfBytes(pending, filer));
  }
});
