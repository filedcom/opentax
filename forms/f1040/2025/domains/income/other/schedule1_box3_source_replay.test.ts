import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";

const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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

function calculated() {
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
    f1099g: [{
      payer_name: "Texas RTAA Agency",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      source_document_reference: "2025 issued RTAA 1099-G",
      box_5_rtaa: 400,
    }],
    f1099m: [{
      payer_name: "Payer One",
      payer_tin: "234567890",
      recipient_tin: "111223333",
      box3_other_income: 300,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Award settlement",
    }, {
      payer_name: "Payer Two",
      payer_tin: "345678901",
      recipient_tin: "111223333",
      box3_other_income: 500,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Research stipend",
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("two 1099-MISC line 8z descriptions and RTAA survive native statement", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_rtaa, 400);
  const rows = result.pending.schedule1?.f1099m_box3_other_income_sources as
    | Array<{ description: string }>
    | undefined;
  assertEquals(rows?.map((row) => row.description), [
    "Award settlement",
    "Research stipend",
  ]);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_200);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer: extractFilerIdentity(general),
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "Award settlement");
  assertStringIncludes(bundle.xml, "Research stipend");
  assertStringIncludes(bundle.xml, "RTAA payments 123456789");
  assertStringIncludes(bundle.xml, "<OtherIncomeTotalAmt");
  const pdf = await buildPdfBytes(
    buildPending(result.pending),
    extractFilerIdentity(general),
  );
  assertEquals(pdf.length > 0, true);
  const extracted = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const pdfWriter = extracted.stdin.getWriter();
  await pdfWriter.write(pdf);
  await pdfWriter.close();
  const extractedOutput = await extracted.output();
  assertEquals(
    extractedOutput.code,
    0,
    new TextDecoder().decode(extractedOutput.stderr),
  );
  const pdfText = new TextDecoder().decode(extractedOutput.stdout);
  assertStringIncludes(pdfText, "Award settlement");
  assertStringIncludes(pdfText, "Research stipend");
  assertStringIncludes(pdfText, "RTAA payments 123456789");
  try {
    Deno.statSync(xsd);
  } catch {
    throw new Error(`Missing verification prerequisite: ${xsd}`);
  }
  const validator = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validator.stdin.getWriter();
  await writer.write(new TextEncoder().encode(bundle.xml));
  await writer.close();
  const output = await validator.output();
  assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
});

Deno.test("final exports reject changed 1099-MISC line 8z description and amount", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const rows = pending.schedule1!.f1099m_box3_other_income_sources as Array<{
    payer_name: string;
    payer_tin: string;
    recipient_tin: string;
    description: string;
    amount: number;
  }>;
  const changes: Array<[typeof rows, string]> = [
    [
      [{ ...rows[0], description: "Invented type" }, rows[1]],
      "Schedule 1 1099-MISC box 3 row differs from its issued source",
    ],
    [
      [{ ...rows[0], amount: 301 }, rows[1]],
      "Schedule 1 1099-MISC box 3 row differs from its issued source",
    ],
    [
      [rows[0]],
      "Schedule 1 needs one 1099-MISC box 3 row per issued other-income source",
    ],
    [
      [rows[0], rows[0]],
      "Schedule 1 1099-MISC box 3 row differs from its issued source",
    ],
  ];
  for (const [changedRows, reason] of changes) {
    const altered = {
      ...pending,
      schedule1: {
        ...pending.schedule1!,
        f1099m_box3_other_income_sources: changedRows,
      },
    };
    await assertRejects(
      () => buildMefBundle(altered, { filer, attachments: [] }),
      Error,
      reason,
    );
    await assertRejects(
      () => buildPdfBytes(altered, filer),
      Error,
      reason,
    );
  }
});

Deno.test("final exports reject an unreviewed 1099-MISC box 3 exclusion", async () => {
  const result = calculated();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const misc = (pending as unknown as {
    f1099m: { f1099ms: Array<Record<string, unknown>> };
  }).f1099m;
  const filer = extractFilerIdentity(general);
  const altered = {
    ...pending,
    f1099m: {
      ...misc,
      f1099ms: [
        ...misc.f1099ms,
        {
          payer_name: "Payer Three",
          payer_tin: "456789012",
          recipient_tin: "111223333",
          box3_other_income: 10_000,
          box3_other_income_routing: "excluded",
        },
      ],
    },
  };
  const reason =
    "1099-MISC box 3 exclusion needs reviewed payment and prior-deduction facts";
  await assertRejects(
    () => buildMefBundle(altered, { filer, attachments: [] }),
    Error,
    reason,
  );
  await assertRejects(() => buildPdfBytes(altered, filer), Error, reason);
});
