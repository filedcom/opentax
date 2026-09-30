import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-8862-ctc-reinstatement"
)!;

Deno.test("reviewed Form 8862 CTC reinstatement reaches a complete return", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 2_200);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<IRS8862 ");
  assertStringIncludes(bundle.xml, "<IRS1040Schedule8812 ");
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 7);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-10-01-form8862-ctc-reinstatement/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});
