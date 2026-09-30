import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { FilingStatus } from "../2025/mef/types.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { PDFDocument } from "pdf-lib";
import { inputSchema as scheduleCInputSchema } from "../nodes/inputs/schedule_c/index.ts";

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
    schedule_c: {
      schedule_cs: [{
        business_reference: "law-office",
        proprietor_recipient: "T",
        line_f_accounting_method: "cash",
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
