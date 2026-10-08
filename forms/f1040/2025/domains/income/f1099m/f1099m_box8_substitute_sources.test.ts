import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { assertSchedule1Box8SourceIdentity } from "../../identity/filer-source-reconciliation.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { schedule1Pdf } from "../../../pdf/forms/income/schedule1/schedule1.ts";

const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "987-65-4321",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const filer = {
  primarySSN: "987654321",
  filingStatus: FilingStatus.Single,
} as FilerIdentity;

const sources = [
  {
    payer_name: "Broker One",
    payer_tin: "123456789",
    recipient_tin: "987654321",
    box8_substitute_payments: 300,
  },
  {
    payer_name: "Broker Two",
    payer_tin: "234567890",
    recipient_tin: "987654321",
    box8_substitute_payments: 450,
  },
];
const issued = sources.map((source, index) => ({
  ...source,
  source_document_reference: `issued 1099-MISC box 8 copy ${index + 1}`,
}));
const rows = sources.map((item) => ({
  payer_name: item.payer_name,
  payer_tin: item.payer_tin,
  recipient_tin: item.recipient_tin,
  amount: item.box8_substitute_payments,
}));
const pending = {
  f1099m: { f1099ms: sources },
  schedule1: {
    line8z_substitute_payments: 750,
    f1099m_box8_substitute_sources: rows,
  },
};

Deno.test("1099-MISC box 8 sources reconcile one to one with Schedule 1", () => {
  assertEquals(assertSchedule1Box8SourceIdentity(pending, filer), undefined);
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: { ...pending.schedule1, line8z_substitute_payments: 749 },
      }, filer),
    Error,
    "differ from 1099-MISC box 8 sources",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: {
          ...pending.schedule1,
          f1099m_box8_substitute_sources: [
            rows[0],
            { ...rows[1], payer_tin: "000000000" },
          ],
        },
      }, filer),
    Error,
    "row differs from its 1099-MISC source",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        f1099m: {
          f1099ms: [{ ...sources[0], recipient_tin: "111223333" }, sources[1]],
        },
      }, filer),
    Error,
    "source identity or amount is invalid",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: {
          ...pending.schedule1,
          f1099m_box8_substitute_sources: [rows[0]],
        },
      }, filer),
    Error,
    "one row per 1099-MISC box 8 source",
  );
});

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
    f1099m: issued,
  }, { taxYear: 2025, formType: "f1040" });
}

function mixedFiling() {
  const plan = buildExecutionPlan(registry);
  return execute(plan, registry, {
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
    f1099m: issued,
    f1099g: [{
      payer_name: "RTAA Agency",
      payer_tin: "345678901",
      recipient_tin: "987654321",
      source_document_reference: "issued RTAA copy",
      box_5_rtaa: 400,
    }, {
      payer_name: "Grant Agency",
      payer_tin: "456789012",
      recipient_tin: "987654321",
      source_document_reference: "issued taxable grant copy",
      box_6_taxable_grants: 600,
      box_6_schedule1_nonbusiness_reviewed: true,
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two 1099-MISC box 8 copies retain payer rows through 1040, native statement, and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_substitute_payments, 750);
  assertEquals(result.pending.f1040?.line8_additional_income, 750);
  const pending = buildPending(result.pending);
  const actualFiler = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, {
    filer: actualFiler,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "Substitute payments 123456789");
  assertStringIncludes(bundle.xml, "Substitute payments 234567890");
  assertEquals((bundle.xml.match(/<OtherIncomeTypeStmt>/g) ?? []).length, 2);
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    actualFiler,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected.line8z_other, 750);
  assertEquals(projected.line8z_description, "SEE STATEMENT");
  const pdf = await buildPdfBytes(pending, actualFiler, ".pdf-cache", bundle);
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
  assertStringIncludes(text, "Substitute payments 123456789");
  assertStringIncludes(text, "Substitute payments 234567890");
  assertStringIncludes(text, "2025 Schedule 1 (Form 1040) line 8z");
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

Deno.test("box 8, RTAA, and taxable grant rows combine once in a full return", async () => {
  const result = mixedFiling();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_substitute_payments, 750);
  assertEquals(result.pending.schedule1?.line8z_rtaa, 400);
  assertEquals(result.pending.schedule1?.line8z_taxable_grants, 600);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_750);
  const pending = buildPending(result.pending);
  const actualFiler = extractFilerIdentity(general);
  const bundle = await buildMefBundle(pending, {
    filer: actualFiler,
    attachments: [],
  });
  for (
    const label of [
      "Substitute payments 123456789",
      "Substitute payments 234567890",
      "RTAA payments 345678901",
      "Taxable grant 456789012",
    ]
  ) assertStringIncludes(bundle.xml, label);
  assertEquals((bundle.xml.match(/<OtherIncomeTypeStmt>/g) ?? []).length, 4);
  const [projected] = schedule1Pdf.instances!(
    pending.schedule1!,
    actualFiler,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(projected.line8z_other, 1_750);
  assertEquals(projected.line8z_description, "SEE STATEMENT");
  const pdf = await buildPdfBytes(pending, actualFiler, ".pdf-cache", bundle);
  const extraction = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = extraction.stdin.getWriter();
  await writer.write(pdf);
  await writer.close();
  const output = await extraction.output();
  assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  const text = new TextDecoder().decode(output.stdout);
  for (
    const label of [
      "Substitute payments 123456789",
      "Substitute payments 234567890",
      "RTAA payments 345678901",
      "Taxable grant 456789012",
    ]
  ) assertStringIncludes(text, label);
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

Deno.test("altered 1099-MISC box 8 copy or statement row rejects native and PDF exports", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const actualFiler = extractFilerIdentity(general);
  const validBundle = await buildMefBundle(pending, {
    filer: actualFiler,
    attachments: [],
  });
  const originalRows = pending.schedule1!
    .f1099m_box8_substitute_sources as Array<Record<string, unknown>>;
  const changes = [
    {
      ...pending,
      schedule1: {
        ...pending.schedule1!,
        f1099m_box8_substitute_sources: [
          { ...originalRows[0], amount: 301 },
          originalRows[1],
        ],
      },
    },
    {
      ...pending,
      f1099m: {
        f1099ms: [{ ...issued[0], recipient_tin: "111223333" }, issued[1]],
      },
    },
  ];
  for (const changed of changes) {
    await assertRejects(() =>
      buildMefBundle(changed, { filer: actualFiler, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(changed, actualFiler, ".pdf-cache", validBundle)
    );
  }
});
