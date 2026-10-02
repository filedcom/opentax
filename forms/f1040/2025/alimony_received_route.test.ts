import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { fillFormPdf } from "./pdf/builder.ts";
import { schedule1Pdf } from "./pdf/forms/schedule1.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const source = {
  amount: 4_800,
  agreement_reference: "reviewed-2017-agreement",
  divorce_agreement_date: "2017-06-15",
  post_2018_modification_excludes_alimony: false,
};

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

Deno.test("one retained pre-2019 agreement reaches Schedule 1, Form 1040, native XML, and the filled PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, alimony_received: [source] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line2a_alimony_received, 4_800);
  assertEquals(result.pending.f1040.line8_additional_income, 4_800);
  assertEquals(result.pending.f1040.line9_total_income, 79_800);
  assertEquals(result.pending.f1040.line11_agi, 79_800);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<AlimonyReceivedGrp><AlimonyReceivedAmt>4800</AlimonyReceivedAmt><DivorceOrSeparationAgreementDt>2017-06</DivorceOrSeparationAgreementDt></AlimonyReceivedGrp>",
  );
  assertStringIncludes(
    xml,
    "<TotalAlimonyReceivedAmt>4800</TotalAlimonyReceivedAmt>",
  );
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const projected = schedule1Pdf.instances?.(
    pending.schedule1!,
    base.filer,
    result.pending,
  )?.[0];
  assertEquals(projected?.print_line2b_alimony_agreement_month, "06/2017");
  const bytes = await fillFormPdf(
    schedule1Pdf,
    projected!,
    base.filer,
    ".pdf-cache",
    result.pending,
  );
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, bytes!);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "4800");
    assertStringIncludes(text, "06/2017");
  } finally {
    await Deno.remove(pdfPath);
  }
});

Deno.test("alimony source rejects missing date, post-2018 modification ambiguity, and multiple agreements", () => {
  const run = (rows: Record<string, unknown>[]) =>
    execute(
      buildExecutionPlan(registry),
      registry,
      { ...base.inputs, alimony_received: rows },
      { taxYear: 2025, formType: "f1040" },
    );
  assertEquals(
    run([{ ...source, divorce_agreement_date: undefined }]).diagnostics
      .length > 0,
    true,
  );
  assertEquals(
    run([{
      ...source,
      post_2018_modification_excludes_alimony: undefined,
    }]).diagnostics.length > 0,
    true,
  );
  assertStringIncludes(
    run([source, { ...source, agreement_reference: "other-agreement" }])
      .diagnostics[0]?.message ?? "",
    "Multiple taxable alimony agreements",
  );
  const excluded = run([{
    ...source,
    post_2018_modification_excludes_alimony: true,
  }]);
  assertEquals(excluded.pending.schedule1?.line2a_alimony_received, undefined);
  const later = run([{ ...source, divorce_agreement_date: "2020-06-15" }]);
  assertEquals(later.pending.schedule1?.line2a_alimony_received, undefined);
});

Deno.test("Schedule 1 native and PDF reject an alimony amount changed after source calculation", () => {
  const all = {
    alimony_received: { alimony_receiveds: [source] },
    schedule1: { line2a_alimony_received: 4_799 },
  };
  assertThrows(
    () => buildMefXml(all, base.filer),
    Error,
    "line 2a differs from taxable alimony sources",
  );
  assertThrows(
    () => schedule1Pdf.instances?.(all.schedule1, base.filer, all),
    Error,
    "line 2a differs from taxable alimony sources",
  );
});
