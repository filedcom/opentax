import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { FilingStatus } from "../2025/mef/types.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";

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

Deno.test("two 1099-MISC box 3 payments retain descriptions through Form 1040 and exports", async () => {
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
      payer_name: "Settlement Co",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box3_other_income: 3_000,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Taxable settlement",
    }, {
      payer_name: "Benefit Co",
      payer_tin: "223456789",
      recipient_tin: "987654321",
      box3_other_income: 2_000,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Death benefit",
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line8_additional_income, 5_000);
  assertEquals(result.pending.schedule1?.line9_total_other_income, 5_000);
  const xml = buildMefXml(buildPending(result.pending), filer);
  await assertLocalReturnXsd(xml);
  assertEquals(
    xml.includes("<OtherIncomeCodeTxt>Taxable settlement</OtherIncomeCodeTxt>"),
    true,
  );
  assertEquals(
    xml.includes("<OtherIncomeCodeTxt>Death benefit</OtherIncomeCodeTxt>"),
    true,
  );
  assertEquals(xml.includes("<OtherIncomeTotalAmt"), true);
  const pdf = await PDFDocument.load(
    await buildPdfBytes(result.pending, filer),
  );
  assertEquals(pdf.getPageCount() >= 4, true);
});

Deno.test("1099-MISC box 3 other-income recipient must belong to the filer", async () => {
  const pending = buildPending({
    schedule1: {
      line9_total_other_income: 500,
      line10_total_additional_income: 500,
      f1099m_box3_other_income_sources: [{
        payer_name: "Settlement Co",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        description: "Taxable settlement",
        amount: 500,
      }],
    },
  });
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "recipient differs from the filer",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "recipient differs from the filer",
  );
});
