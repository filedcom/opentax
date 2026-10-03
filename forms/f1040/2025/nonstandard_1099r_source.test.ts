import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-direct-pension-rollover"
)!;

Deno.test("altered 1099-R source reaches nonstandard TY2025 native and PDF return", async () => {
  const [original] = fixture.inputs.f1099r as Record<string, unknown>[];
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    f1099r: [{
      ...original,
      altered_or_handwritten: true,
      source_document_reference: "2025 altered pension copy",
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(
    xml,
    "<StandardOrNonStandardCd>N</StandardOrNonStandardCd>",
  );
  assertStringIncludes(
    xml,
    "<PensionsAnnuitiesAmt>20000</PensionsAnnuitiesAmt>",
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
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
  const pdf = await buildPdfBytes(pending, fixture.filer);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    assertEquals(
      /20,?000/.test(new TextDecoder().decode(extracted.stdout)),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }
  const changed = structuredClone(pending);
  const source = (changed.f1099r as unknown as {
    f1099rs: Record<string, unknown>[];
  }).f1099rs[0]!;
  source.source_document_reference = undefined;
  assertThrows(
    () => buildMefXml(changed, fixture.filer),
    Error,
    "1099-R owner review needs valid payer source rows",
  );
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    "Nonstandard 1099-R needs a retained payer-copy reference",
  );
});
