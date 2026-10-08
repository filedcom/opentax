import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { inputSchema as f1099gInputSchema } from "../../../nodes/inputs/f1099g/index.ts";
import { registry } from "../../registry.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { schedule1Pdf } from "../../pdf/forms/income/schedule1/schedule1.ts";
import { schedule1OtherIncomeRows } from "../../mef/forms/income/schedule1/schedule1_other_income_rows.ts";

const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const issued = [{
  payer_name: "Texas RTAA Agency",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  source_document_reference: "2025 issued RTAA 1099-G A",
  account_number: "RTAA-A",
  box_5_rtaa: 400,
}, {
  payer_name: "Oklahoma RTAA Agency",
  payer_tin: "987654321",
  recipient_tin: "111223333",
  source_document_reference: "2025 issued RTAA 1099-G B",
  account_number: "RTAA-B",
  box_5_rtaa: 600,
}];

function filing(f1099g: Record<string, unknown>[] = issued) {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    f1099g,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two issued RTAA copies reach Schedule 1 line 8z, Form 1040, native statement and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_rtaa, 1_000);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(bundle.xml, "RTAA payments 123456789");
  assertStringIncludes(bundle.xml, "RTAA payments 987654321");
  assertStringIncludes(bundle.xml, "<OtherIncomeTotalAmt");
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    filer,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected.line8z_other, 1_000);
  assertEquals(projected.line8z_description, "SEE STATEMENT");
  assertEquals(
    schedule1OtherIncomeRows(pending.schedule1!).filter((row) =>
      row.label.startsWith("RTAA payments")
    ),
    [
      { label: "RTAA payments 123456789", amount: 400 },
      { label: "RTAA payments 987654321", amount: 600 },
    ],
  );
  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
  const extraction = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const pdfWriter = extraction.stdin.getWriter();
  await pdfWriter.write(pdf);
  await pdfWriter.close();
  const printed = await extraction.output();
  assertEquals(printed.code, 0, new TextDecoder().decode(printed.stderr));
  const text = new TextDecoder().decode(printed.stdout);
  assertStringIncludes(text, "RTAA payments 123456789");
  assertStringIncludes(text, "RTAA payments 987654321");
  try {
    Deno.statSync(xsd);
  } catch {
    return;
  }
  const validator = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const xmlWriter = validator.stdin.getWriter();
  await xmlWriter.write(new TextEncoder().encode(bundle.xml));
  await xmlWriter.close();
  const checked = await validator.output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
});

Deno.test("RTAA export rejects changed rows, source copies, line total and recipient", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const schedule = pending.schedule1!;
  const sourceRows = schedule.f1099g_rtaa_sources as Array<
    Record<string, unknown>
  >;
  const changes = [
    {
      ...pending,
      schedule1: {
        ...schedule,
        f1099g_rtaa_sources: [
          { ...sourceRows[0], amount: 401 },
          sourceRows[1],
        ],
      },
    },
    {
      ...pending,
      schedule1: { ...schedule, line8z_rtaa: 999 },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{ ...issued[0], box_5_rtaa: 401 }, issued[1]],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [
          { ...issued[0], recipient_tin: "999887777" },
          issued[1],
        ],
      },
    },
  ];
  for (const changed of changes) {
    await assertRejects(
      () => buildMefBundle(changed, { filer, attachments: [] }),
      Error,
    );
    assertThrows(
      () =>
        schedule1Pdf.instances!(
          changed.schedule1!,
          filer,
          changed as unknown as Record<string, Record<string, unknown>>,
        ),
      Error,
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line8_additional_income: 999 },
      }, { filer, attachments: [] }),
    Error,
  );
  assertThrows(
    () => f1099gInputSchema.parse({ f1099gs: [{ box_5_rtaa: 400 }] }),
    Error,
    "Form 1099-G box 5 RTAA needs payer, recipient, and issued-copy identity",
  );
});
