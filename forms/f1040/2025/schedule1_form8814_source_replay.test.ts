import { assertEquals, assertRejects } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { assertSchedule1Form8814Source } from "./filer-source-reconciliation.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-form8814-child-gain-with-schedule-d"
)!;
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

Deno.test("Schedule 1 line 8z Form 8814 amount replays retained child election at both exports", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...fixture.inputs,
      w2: (fixture.inputs.w2 as Array<Record<string, unknown>>).map((item) => ({
        ...item,
        employee_ssn: fixture.filer.primarySSN,
      })),
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const sourceAmount = Number(result.pending.schedule1?.line8z_form8814);
  assertEquals(Number.isSafeInteger(sourceAmount) && sourceAmount > 0, true);
  const pending = buildPending(result.pending);
  assertSchedule1Form8814Source(pending);
  const sourceTax = pending.form8814!.items!.reduce(
    (sum, line) => sum + line.line15,
    0,
  );
  assertEquals(pending.f1040?.form8814_tax, sourceTax);
  const positive = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(positive.xml.includes("FORM 8814"), true);
  const pdf = await buildPdfBytes(pending, fixture.filer);
  const extracted = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const pdfWriter = extracted.stdin.getWriter();
  await pdfWriter.write(pdf);
  await pdfWriter.close();
  const pdfOutput = await extracted.output();
  assertEquals(pdfOutput.code, 0, new TextDecoder().decode(pdfOutput.stderr));
  assertEquals(
    new TextDecoder().decode(pdfOutput.stdout).includes("FORM 8814"),
    true,
  );
  let xsdAvailable = true;
  try {
    Deno.statSync(xsd);
  } catch {
    xsdAvailable = false;
  }
  if (xsdAvailable) {
    const validator = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validator.stdin.getWriter();
    await writer.write(new TextEncoder().encode(positive.xml));
    await writer.close();
    const output = await validator.output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  }
  const altered = {
    ...pending,
    schedule1: { ...pending.schedule1!, line8z_form8814: sourceAmount + 1 },
  };
  await assertRejects(
    () => buildPdfBytes(altered, fixture.filer),
    Error,
    "Schedule 1 Form 8814 line 8z differs from retained child elections",
  );
  await assertRejects(
    () => buildMefBundle(altered, { filer: fixture.filer, attachments: [] }),
    Error,
    "Schedule 1 Form 8814 line 8z differs from retained child elections",
  );
  const lines = pending.form8814!.items!;
  const mismatchedCalculation = {
    ...pending,
    form8814: {
      items: [{ ...lines[0], line12: sourceAmount + 1 }],
    },
    schedule1: { ...pending.schedule1!, line8z_form8814: sourceAmount + 1 },
  };
  await assertRejects(
    () =>
      buildMefBundle(mismatchedCalculation, {
        filer: fixture.filer,
        attachments: [],
      }),
    Error,
    "Form 8814 line 12 differs from reviewed child election",
  );
  await assertRejects(
    () => buildPdfBytes(mismatchedCalculation, fixture.filer),
    Error,
    "Form 8814 line 12 differs from reviewed child election",
  );
  const alteredTax = {
    ...pending,
    f1040: { ...pending.f1040!, form8814_tax: sourceTax + 1 },
  };
  await assertRejects(
    () => buildMefBundle(alteredTax, { filer: fixture.filer, attachments: [] }),
    Error,
    "Form 1040 child-election tax differs from retained Form 8814 lines 15",
  );
  await assertRejects(
    () => buildPdfBytes(alteredTax, fixture.filer),
    Error,
    "Form 1040 child-election tax differs from retained Form 8814 lines 15",
  );
  const alteredLine15 = {
    ...pending,
    form8814: {
      items: [{ ...lines[0], line15: lines[0].line15 + 1 }],
    },
  };
  await assertRejects(
    () =>
      buildMefBundle(alteredLine15, { filer: fixture.filer, attachments: [] }),
    Error,
    "Form 8814 line 15 tax differs from reviewed child election",
  );
  await assertRejects(
    () => buildPdfBytes(alteredLine15, fixture.filer),
    Error,
    "Form 8814 line 15 tax differs from reviewed child election",
  );
});
