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
import { inputSchema as form8959Schema } from "../../../../nodes/intermediate/forms/taxes/employment/form8959/index.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const employer = (base.inputs.w2 as Array<Record<string, unknown>>)[0];
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function calculated() {
  return execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      form4137: {
        taxpayer_ssn: "111223333",
        forms: [{
          recipient: "taxpayer",
          employers: [{
            name: employer.employer_name,
            ein: "12-3456789",
            tips_received: 1_500,
            tips_reported: 0,
          }],
          ss_wages_from_w2: 75_000,
        }],
        w2_tip_sources: [{
          employee_ssn: "111223333",
          employer_name: employer.employer_name,
          employer_ein: "123456789",
          allocated_tips: 0,
          ss_wages_and_tips: 75_000,
        }],
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("unreported Form 4137 tips reach Form 1040 line 1c, native XML/XSD and PDF", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1c_unreported_tips, 1_500);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 115);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<TipIncomeAmt>1500</TipIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotalTipsReceivedMinusRptAmt>1500</TotalTipsReceivedMinusRptAmt>",
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
  assertStringIncludes(new TextDecoder().decode(extracted.stdout), "1500");
});

Deno.test("line 1c final exports reject Form 4137 income even when tax rounds unchanged", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = pending.form4137!;
  const tampered = {
    ...pending,
    form4137: {
      ...source,
      forms: [{
        ...source.forms![0],
        employers: [{
          ...source.forms![0].employers[0],
          tips_received: 1_501,
        }],
      }],
    },
  };
  assertThrows(
    () => buildMefXml(tampered, base.filer),
    Error,
    "Form 1040 line 1c and AGI tips differ from retained Form 4137 income",
  );
  await assertRejects(
    () => buildPdfBytes(tampered, base.filer),
    Error,
    "Form 1040 line 1c and AGI tips differ from retained Form 4137 income",
  );
  const wrongAgi = {
    ...pending,
    agi_aggregator: {
      ...pending.agi_aggregator,
      line1c_unreported_tips: 1_501,
    },
  };
  assertThrows(
    () => buildMefXml(wrongAgi, base.filer),
    Error,
    "Form 1040 line 1c and AGI tips differ",
  );
  await assertRejects(
    () => buildPdfBytes(wrongAgi, base.filer),
    Error,
    "Form 1040 line 1c and AGI tips differ",
  );
});

Deno.test("Form 4137 rejects Form 8959 deposit drift hidden by whole-dollar rounding", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = form8959Schema.passthrough().parse(pending.form8959);
  const amount = source.unreported_tips!;
  assertEquals(typeof amount, "number");
  // The retained employment form and every printed dollar stay unchanged.
  // Only replay against the original calculation detects this deposit change.
  const changed = {
    ...pending,
    form8959: { ...source, unreported_tips: amount + 0.01 },
  };
  assertThrows(
    () => buildMefXml(changed, base.filer),
    Error,
    "unreported_tips differs from original source records",
  );
  await assertRejects(
    () => buildPdfBytes(changed, base.filer),
    Error,
    "unreported_tips differs from original source records",
  );
});
