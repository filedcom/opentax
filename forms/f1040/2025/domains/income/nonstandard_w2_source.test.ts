import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { registry } from "../../registry.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-refund"
)!;

Deno.test("handwritten W-2 source reaches a TY2025 nonstandard IRSW2 document", async () => {
  const [original] = fixture.inputs.w2 as Record<string, unknown>[];
  const reference = "2025 handwritten W-2 source copy";
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    w2: [{
      ...original,
      source_document_reference: reference,
      nonstandard_document_review: {
        kind: "handwritten",
        source_document_reference: reference,
        reviewer_confirmed_nonstandard: true,
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, fixture.filer);
  assertStringIncludes(
    xml,
    "<StandardOrNonStandardCd>N</StandardOrNonStandardCd>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
      /75,?000/.test(new TextDecoder().decode(extracted.stdout)),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }
  const changed = structuredClone(pending);
  const copy = (changed.w2 as unknown as {
    w2s: Record<string, unknown>[];
  }).w2s[0]!;
  copy.source_document_reference = "different copy";
  assertThrows(
    () => buildMefXml(changed, fixture.filer),
    Error,
    "Nonstandard W-2 review must match the retained issued-copy reference",
  );
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    "Nonstandard W-2 review must match the retained issued-copy reference",
  );
});
