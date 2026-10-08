import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { registry } from "../../../registry.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "single-form8919-nec-wages-and-additional-medicare"
)!;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function calculated() {
  return execute(
    buildExecutionPlan(registry),
    registry,
    base.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("Form 8919 wages reach Form 1040 line 1g, native XML/XSD and PDF", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1g_wages_8919, 210_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<TotalWagesWithNoWithholdingAmt>210000</TotalWagesWithNoWithholdingAmt>",
  );
  const validator = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const xmlWriter = validator.stdin.getWriter();
  await xmlWriter.write(new TextEncoder().encode(xml));
  await xmlWriter.close();
  const checked = await validator.output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  const pdf = await buildPdfBytes(pending, base.filer);
  const reader = new Deno.Command("pdftotext", {
    args: ["-layout", "-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const pdfWriter = reader.stdin.getWriter();
  await pdfWriter.write(pdf);
  await pdfWriter.close();
  const extracted = await reader.output();
  assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
  assertStringIncludes(new TextDecoder().decode(extracted.stdout), "210000");
});

Deno.test("line 1g rejects a changed firm and issued 1099-NEC whose tax still rounds the same", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = pending.form8919!;
  const changed = {
    ...pending,
    form8919: {
      ...source,
      forms: [{
        ...source.forms![0],
        employers: [{ ...source.forms![0].employers[0], wages: 210_001 }],
      }],
      form1099_sources: [{ ...source.form1099_sources![0], amount: 210_001 }],
    },
    f1099nec: {
      f1099necs: [{ ...pending.f1099nec!.f1099necs[0], box1_nec: 210_001 }],
    },
  };
  assertThrows(
    () => buildMefXml(changed, base.filer),
    Error,
    "Form 1040 line 1g and AGI wages differ from retained Form 8919 line 6",
  );
  await assertRejects(
    () => buildPdfBytes(changed, base.filer),
    Error,
    "Form 1040 line 1g and AGI wages differ from retained Form 8919 line 6",
  );
  const wrongAgi = {
    ...pending,
    agi_aggregator: {
      ...pending.agi_aggregator,
      line1g_wages_8919: 210_001,
    },
  };
  assertThrows(
    () => buildMefXml(wrongAgi, base.filer),
    Error,
    "Form 1040 line 1g and AGI wages differ",
  );
  await assertRejects(
    () => buildPdfBytes(wrongAgi, base.filer),
    Error,
    "Form 1040 line 1g and AGI wages differ",
  );
});
