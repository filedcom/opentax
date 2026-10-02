import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { schedule1Pdf } from "./pdf/forms/schedule1.ts";

const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
  payer_name: "Texas Grant Agency",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  source_document_reference: "issued grant A",
  box_6_taxable_grants: 400,
  box_6_schedule1_nonbusiness_reviewed: true,
}, {
  payer_name: "Oklahoma Grant Agency",
  payer_tin: "987654321",
  recipient_tin: "111223333",
  source_document_reference: "issued grant B",
  box_6_taxable_grants: 600,
  box_6_schedule1_nonbusiness_reviewed: true,
}];

function filing() {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: general.taxpayer_ssn,
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    f1099g: issued,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two taxable grant copies retain payer rows through 1040, native statement, and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_taxable_grants, 1_000);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(bundle.xml, "Taxable grant 123456789");
  assertStringIncludes(bundle.xml, "Taxable grant 987654321");
  assertEquals((bundle.xml.match(/<OtherIncomeTypeStmt>/g) ?? []).length, 2);
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    filer,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected.line8z_other, 1_000);
  assertEquals(projected.line8z_description, "SEE STATEMENT");
  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
  const extracted = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = extracted.stdin.getWriter();
  await writer.write(pdf);
  await writer.close();
  const text = new TextDecoder().decode((await extracted.output()).stdout);
  assertStringIncludes(text, "Taxable grant 123456789");
  assertStringIncludes(text, "Taxable grant 987654321");
  const statementHeading = "2025 Schedule 1 (Form 1040) line 8z";
  assertStringIncludes(text, statementHeading);
  const statement = text.slice(text.indexOf(statementHeading));
  assertStringIncludes(statement, "Alex Example");
  assertEquals(statement.includes("EXAMPLE ALEX"), false);
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
  const output = await validator.output();
  assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
});

Deno.test("changed taxable grant rows, copies, or totals reject in both exports", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const rows = pending.schedule1!.f1099g_taxable_grant_sources as Array<
    Record<string, unknown>
  >;
  const changes = [
    {
      ...pending,
      schedule1: { ...pending.schedule1!, line8z_taxable_grants: 999 },
    },
    {
      ...pending,
      schedule1: {
        ...pending.schedule1!,
        f1099g_taxable_grant_sources: [{ ...rows[0], amount: 401 }, rows[1]],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{ ...issued[0], box_6_taxable_grants: 401 }, issued[1]],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{ ...issued[0], recipient_tin: "999887777" }, issued[1]],
      },
    },
  ];
  for (const changed of changes) {
    await assertRejects(() =>
      buildMefBundle(changed, { filer, attachments: [] })
    );
    assertThrows(() =>
      schedule1Pdf.instances!(
        changed.schedule1!,
        filer,
        changed as unknown as Record<string, Record<string, unknown>>,
      )
    );
  }
});
