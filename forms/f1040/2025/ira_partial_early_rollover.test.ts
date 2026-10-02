import { assertEquals, assertStringIncludes } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import {
  DistributionCode,
  inputSchema as f1099rInputSchema,
  RolloverCode,
} from "../nodes/inputs/f1099r/index.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-ira-rollover"
)!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

Deno.test("partial early IRA rollover reconciles Form 1040, Form 5329, native XML, and PDF", async () => {
  const original = f1099rInputSchema.parse({ f1099rs: base.inputs.f1099r })
    .f1099rs[0]!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1099r: [{
        ...original,
        source_document_reference: "2025 issued early IRA Form 1099-R",
        account_number: "IRA-EARLY-1",
        ts: "T" as const,
        box7_distribution_code: DistributionCode.Code1,
        box1_gross_distribution: 10_000,
        box2a_taxable_amount: 10_000,
        rollover_code: RolloverCode.X,
        partial_rollover_amount: 6_000,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line4a_ira_gross, 10_000);
  assertEquals(result.pending.f1040.line4b_ira_taxable, 4_000);
  assertEquals(result.pending.f1040.line4c_ira_rollover, true);
  assertEquals(
    (result.pending.form5329.owner_entries as Array<Record<string, unknown>>)[0]
      ?.early_distribution,
    4_000,
  );
  assertEquals(result.pending.f1040.line23_other_taxes, 400);

  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<IRADistributionsAmt>10000</IRADistributionsAmt>");
  assertStringIncludes(xml, "<TaxableIRAAmt>4000</TaxableIRAAmt>");
  assertStringIncludes(
    xml,
    "<EarlyDistributionsAmt>4000</EarlyDistributionsAmt>",
  );
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }

  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, await buildPdfBytes(pending, base.filer));
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "10000");
    assertStringIncludes(text, "4000");
    assertStringIncludes(text, "400");
  } finally {
    await Deno.remove(pdfPath);
  }
});
