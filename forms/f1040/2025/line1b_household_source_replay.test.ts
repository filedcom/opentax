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

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function calculated() {
  return execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      household_wages: [
        { wages_received: 1_200, employer_name: "Household One" },
        { wages_received: 800, employer_name: "Household Two" },
      ],
    },
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("two household wage sources reach line 1b, native XML/XSD and PDF", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1b_household_wages, 2_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<HouseholdEmployeeWagesAmt>2000</HouseholdEmployeeWagesAmt>",
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
  assertStringIncludes(new TextDecoder().decode(extracted.stdout), "2000");
});

Deno.test("line 1b exports reject changed or missing household wage sources", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = pending.household_wages!;
  for (
    const changed of [
      {
        ...pending,
        household_wages: {
          household_wages: [
            { ...source.household_wages[0], wages_received: 1_300 },
            source.household_wages[1],
          ],
        },
      },
      { ...pending, household_wages: undefined },
      {
        ...pending,
        agi_aggregator: {
          ...pending.agi_aggregator,
          line1b_household_wages: 2_100,
        },
      },
    ]
  ) {
    assertThrows(
      () => buildMefXml(changed, base.filer),
      Error,
      "Form 1040 line 1b and AGI household wages differ",
    );
    await assertRejects(
      () => buildPdfBytes(changed, base.filer),
      Error,
      "Form 1040 line 1b and AGI household wages differ",
    );
  }
});

Deno.test("line 1b household federal withholding needs an issued wage source", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general: base.inputs.general,
      household_wages: [{
        wages_received: 2_000,
        federal_income_tax_withheld: 100,
        employer_name: "Household Employer",
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1b_household_wages, 2_000);
  assertEquals(result.pending.f1040?.line25a_w2_withheld, 100);
  const pending = buildPending(result.pending);
  assertThrows(
    () => buildMefXml(pending, base.filer),
    Error,
    "Household federal withholding must use a W-2 or Form 4852 line 1a source",
  );
  await assertRejects(
    () => buildPdfBytes(pending, base.filer),
    Error,
    "Household federal withholding must use a W-2 or Form 4852 line 1a source",
  );
});
