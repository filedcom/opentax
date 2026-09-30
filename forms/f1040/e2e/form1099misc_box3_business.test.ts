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
import { inputSchema as scheduleFInputSchema } from "../nodes/intermediate/forms/schedule_f/index.ts";

const filer = {
  primarySSN: "987654321",
  nameLine1: "MORGAN EXAMPLE",
  nameControl: "EXAM",
  firstName: "Morgan",
  lastName: "Example",
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

Deno.test("1099-MISC box 3 business and farm payments reach their own reviewed activities", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "987654321",
      taxpayer_dob: "1980-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    f1099m: [{
      payer_name: "Consulting Client",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box3_other_income: 3_000,
      box3_other_income_routing: "schedule_c",
      schedule_c_business_reference: "consulting",
    }, {
      payer_name: "Farm Customer",
      payer_tin: "223456789",
      recipient_tin: "987654321",
      box3_other_income: 2_000,
      box3_other_income_routing: "schedule_f",
      farm_id: "north",
    }],
    schedule_c: [{
      business_reference: "consulting",
      proprietor_recipient: "T",
      line_a_principal_business: "CONSULTING",
      line_b_business_code: "541990",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 3_000,
    }],
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        proprietor_recipient: "T",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line8_other_income: 2_000,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line8_additional_income, 5_000);
  assertEquals(
    scheduleCInputSchema.parse(result.pending.schedule_c)
      .f1099m_receipt_sources?.[0].box,
    "box3_other_income",
  );
  assertEquals(
    scheduleFInputSchema.parse(result.pending.schedule_f)
      .farm_sources?.[0].kind,
    "1099m_box3_other_income",
  );
  const xml = buildMefXml(buildPending(result.pending), filer);
  await assertLocalReturnXsd(xml);
  assertEquals(
    xml.includes("<TotalGrossReceiptsAmt>3000</TotalGrossReceiptsAmt>"),
    true,
  );
  const pdf = await PDFDocument.load(
    await buildPdfBytes(result.pending, filer),
  );
  assertEquals(pdf.getPageCount() >= 6, true);
});

Deno.test("1099-MISC box 3 farm recipient must belong to the filer", async () => {
  const pending = buildPending({
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        proprietor_recipient: "T",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line8_other_income: 500,
      }],
      farm_sources: [{
        farm_id: "north",
        kind: "1099m_box3_other_income",
        amount: 500,
        payer_name: "Farm Customer",
        payer_tin: "123456789",
        recipient_tin: "111223333",
      }],
    },
  });
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "farm recipient differs from the Schedule F proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "farm recipient differs from the Schedule F proprietor",
  );
});

Deno.test("1099-NEC farm recipient must match its named proprietor", async () => {
  const pending = buildPending({
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        proprietor_recipient: "T",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line8_other_income: 500,
      }],
      farm_sources: [{
        farm_id: "north",
        kind: "1099nec_farm_income",
        amount: 500,
        payer_name: "Farm Customer",
        payer_tin: "123456789",
        recipient_tin: "111223333",
      }],
    },
  });
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "farm recipient differs from the Schedule F proprietor",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "farm recipient differs from the Schedule F proprietor",
  );
});
