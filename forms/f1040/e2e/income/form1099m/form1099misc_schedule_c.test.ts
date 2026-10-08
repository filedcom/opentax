import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import { buildPending } from "../../../2025/mef/execution/pending.ts";
import { FilingStatus } from "../../../2025/mef/types.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { PDFDocument } from "pdf-lib";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/index.ts";
import { inputSchema as form1099mInputSchema } from "../../../nodes/inputs/f1099m/index.ts";

const filer = {
  primarySSN: "987654321",
  nameLine1: "MORGAN ATTORNEY",
  nameControl: "ATTO",
  firstName: "Morgan",
  lastName: "Attorney",
  firstNameWithInitial: "Morgan",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

async function assertLocalReturnXsd(xml: string): Promise<void> {
  const schema = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(schema);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      result.success,
      true,
      new TextDecoder().decode(result.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("1099-MISC box 10 client funds do not inflate Form 1040 income", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Attorney",
      taxpayer_ssn: "987654321",
      taxpayer_dob: "1980-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    f1099m: [{
      payer_name: "Settlement Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box10_attorney_proceeds: 15_000,
      box10_attorney_fee_receipts: 5_000,
      box10_attorney_client_funds: 10_000,
      box10_attorney_business_reference: "law-office",
      box10_allocation_review_reference: "2025 settlement ledger",
    }],
    schedule_c: [{
      business_reference: "law-office",
      proprietor_recipient: "T",
      line_a_principal_business: "LEGAL SERVICES",
      line_b_business_code: "541110",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 5_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(
    scheduleCInputSchema.parse(result.pending.schedule_c).attorney_fee_sources
      ?.[0].amount,
    5_000,
  );
  assertEquals(result.pending.schedule1?.line8z_attorney_proceeds, undefined);
  assertEquals(result.pending.f1040?.line8_additional_income, 5_000);
  const xml = buildMefXml(buildPending(result.pending), filer);
  await assertLocalReturnXsd(xml);
  assertEquals(
    xml.includes("<TotalGrossReceiptsAmt>5000</TotalGrossReceiptsAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<OtherIncomeTotalAmt>15000</OtherIncomeTotalAmt>"),
    false,
  );
  const pdf = await PDFDocument.load(
    await buildPdfBytes(result.pending, filer),
  );
  assertEquals(pdf.getPageCount() >= 4, true);
});

Deno.test("1099-MISC box 10 rejects a recipient who differs from the Schedule C proprietor", async () => {
  const pending = buildPending({
    schedule1: { line3_schedule_c: 5_000 },
    schedule_c: {
      schedule_cs: [{
        business_reference: "law-office",
        proprietor_recipient: "T",
        line_a_principal_business: "LEGAL SERVICES",
        line_b_business_code: "541110",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 5_000,
      }],
      attorney_fee_sources: [{
        business_reference: "law-office",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        amount: 5_000,
        allocation_review_reference: "2025 settlement ledger",
      }],
    },
  });
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "recipient differs from the Schedule C proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "recipient differs from the Schedule C proprietor",
  );
});

Deno.test("two 1099-MISC medical receipts reconcile to one Schedule C and Form 1040", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Attorney",
      taxpayer_ssn: "987654321",
      taxpayer_dob: "1980-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    f1099m: [
      {
        payer_name: "Clinic One",
        payer_tin: "123456789",
        recipient_tin: "987654321",
        schedule_c_business_reference: "clinic",
        box6_medical_payments: 3_000,
      },
      {
        payer_name: "Clinic Two",
        payer_tin: "223456789",
        recipient_tin: "987654321",
        schedule_c_business_reference: "clinic",
        box6_medical_payments: 2_000,
      },
    ],
    schedule_c: [{
      business_reference: "clinic",
      proprietor_recipient: "T",
      line_a_principal_business: "MEDICAL SERVICES",
      line_b_business_code: "621111",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 5_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const scheduleC = scheduleCInputSchema.parse(result.pending.schedule_c);
  assertEquals(scheduleC.f1099m_receipt_sources?.map((row) => row.amount), [
    3_000,
    2_000,
  ]);
  assertEquals(result.pending.f1040?.line8_additional_income, 5_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, filer);
  await assertLocalReturnXsd(xml);
  assertEquals(
    xml.includes("<TotalGrossReceiptsAmt>5000</TotalGrossReceiptsAmt>"),
    true,
  );
  const pdfBytes = await buildPdfBytes(result.pending, filer);
  const pdf = await PDFDocument.load(pdfBytes);
  assertEquals(pdf.getPageCount() >= 4, true);

  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdfBytes);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
    }).output();
    assertEquals(extracted.code, 0);
    const printed = new TextDecoder().decode(extracted.stdout);
    assertEquals(printed.includes("MEDICAL SERVICES"), true);
    assertEquals(printed.includes("5000"), true);
  } finally {
    await Deno.remove(pdfPath);
  }

  const misc = form1099mInputSchema.parse(result.pending.f1099m);
  const changedPayerCopy = {
    ...pending,
    f1099m: {
      f1099ms: misc.f1099ms.map((row, index) =>
        index === 1 ? { ...row, box6_medical_payments: 2_100 } : row
      ),
    },
  };
  assertThrows(
    () => buildMefXml(changedPayerCopy, filer),
    Error,
    "1099-MISC Schedule C sources differ from retained payer copies",
  );
  await assertRejects(
    () => buildPdfBytes(changedPayerCopy, filer),
    Error,
    "1099-MISC Schedule C sources differ from retained payer copies",
  );
  const changedBusinessRow = {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      f1099m_receipt_sources: (scheduleC.f1099m_receipt_sources ?? []).map(
        (row, index) => index === 0 ? { ...row, payer_tin: "999999999" } : row,
      ),
    },
  };
  assertThrows(
    () => buildMefXml(changedBusinessRow, filer),
    Error,
    "1099-MISC Schedule C sources differ from retained payer copies",
  );
});

Deno.test("1099-MISC receipt source and old top-level totals cannot bypass Schedule C export", async () => {
  const business = {
    business_reference: "clinic",
    proprietor_recipient: "T",
    line_a_principal_business: "MEDICAL SERVICES",
    line_b_business_code: "621111",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 5_000,
  };
  const wrongRecipient = buildPending({
    schedule1: { line3_schedule_c: 5_000 },
    f1099m: {
      f1099ms: [{
        payer_name: "Clinic Payer",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        schedule_c_business_reference: "clinic",
        box6_medical_payments: 5_000,
      }],
    },
    schedule_c: {
      schedule_cs: [business],
      f1099m_receipt_sources: [{
        business_reference: "clinic",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        box: "box6_medical_payments",
        amount: 5_000,
      }],
    },
  });
  assertThrows(
    () => buildMefXml(wrongRecipient, filer),
    Error,
    "recipient differs from the Schedule C proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(wrongRecipient, filer),
    Error,
    "recipient differs from the Schedule C proprietor",
  );

  const oldTotal = buildPending({
    schedule1: { line3_schedule_c: 5_000 },
    schedule_c: { schedule_cs: [business], line1_gross_receipts: 5_000 },
  });
  assertThrows(
    () => buildMefXml(oldTotal, filer),
    Error,
    "top-level gross receipts need business-linked source rows",
  );
  await assertRejects(
    () => buildPdfBytes(oldTotal, filer),
    Error,
    "top-level gross receipts need business-linked source rows",
  );
});
