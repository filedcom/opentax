import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { FilingStatus } from "../2025/mef/types.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { inputSchema as scheduleCInputSchema } from "../nodes/inputs/schedule_c/index.ts";

const filer = {
  primarySSN: "987654321",
  nameLine1: "MORGAN CONSULTANT",
  nameControl: "CONS",
  firstName: "Morgan",
  lastName: "Consultant",
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
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("two 1099-NEC payers reconcile to a reviewed Schedule C and Form 1040", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Consultant",
      taxpayer_ssn: "987654321",
      taxpayer_dob: "1980-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    f1099nec: [
      {
        payer_name: "Client One",
        payer_tin: "123456789",
        recipient_ssn: "987654321",
        box1_nec: 3_000,
        for_routing: "schedule_c",
        schedule_c_business_reference: "consulting",
      },
      {
        payer_name: "Client Two",
        payer_tin: "223456789",
        recipient_ssn: "987654321",
        box1_nec: 2_000,
        for_routing: "schedule_c",
        schedule_c_business_reference: "consulting",
      },
    ],
    schedule_c: [{
      business_reference: "consulting",
      proprietor_recipient: "T",
      line_a_principal_business: "CONSULTING",
      line_b_business_code: "541990",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 5_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const scheduleC = scheduleCInputSchema.parse(result.pending.schedule_c);
  assertEquals(scheduleC.f1099nec_receipt_sources?.map((row) => row.amount), [
    3_000,
    2_000,
  ]);
  assertEquals(result.pending.f1040?.line8_additional_income, 5_000);
  const xml = buildMefXml(buildPending(result.pending), filer);
  await assertLocalReturnXsd(xml);
  assertEquals(
    xml.includes("<TotalGrossReceiptsAmt>5000</TotalGrossReceiptsAmt>"),
    true,
  );
  const pdf = await PDFDocument.load(
    await buildPdfBytes(result.pending, filer),
  );
  assertEquals(pdf.getPageCount() >= 4, true);
});

Deno.test("1099-NEC export rejects a recipient who differs from the business proprietor", async () => {
  const pending = buildPending({
    schedule_c: {
      schedule_cs: [{
        business_reference: "consulting",
        proprietor_recipient: "T",
        line_f_accounting_method: "cash",
        line_1_gross_receipts: 5_000,
      }],
      f1099nec_receipt_sources: [{
        business_reference: "consulting",
        payer_name: "Client One",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        amount: 5_000,
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

Deno.test("1099-NEC and 1099-MISC receipts cannot exceed one business's gross receipts", async () => {
  const pending = buildPending({
    schedule_c: {
      schedule_cs: [{
        business_reference: "consulting",
        proprietor_recipient: "T",
        line_f_accounting_method: "cash",
        line_1_gross_receipts: 5_000,
      }],
      f1099nec_receipt_sources: [{
        business_reference: "consulting",
        payer_name: "Client One",
        payer_tin: "123456789",
        recipient_tin: "987654321",
        amount: 3_000,
      }],
      f1099m_receipt_sources: [{
        business_reference: "consulting",
        payer_tin: "223456789",
        recipient_tin: "987654321",
        box: "box1_rents",
        amount: 3_000,
      }],
    },
  });
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "sources exceed Schedule C gross receipts",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "sources exceed Schedule C gross receipts",
  );
});
