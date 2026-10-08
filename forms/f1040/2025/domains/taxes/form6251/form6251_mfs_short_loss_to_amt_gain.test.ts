import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { registry } from "../../../registry.ts";
import { f1040_2025 } from "../../../index.ts";
import { form6251 as mef6251 } from "../../../mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../pdf/forms/taxes/f6251.ts";
import { priorIsoSaleFixture } from "./form6251_prior_iso_sale.fixture.ts";

const general = {
  filing_status: "mfs" as const,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Taxpayer",
  spouse_ssn: "444-55-6666",
  spouse_dob: "1987-03-10",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  taxpayer_can_be_claimed_as_dependent: false,
};
const brokerLot = {
  part: "A",
  description: "Short-term asset with separate AMT basis",
  source_transaction_id: "broker-mfs-short-loss-to-gain",
  broker_statement_reference: "2025 issued broker short-term lot",
  date_acquired: "2025-02-01",
  date_sold: "2025-06-20",
  proceeds: 1_000,
  cost_basis: 1_500,
  amt_cost_basis: 500,
};

function filedReturn() {
  const iso = priorIsoSaleFixture(general.taxpayer_ssn);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: iso.w2,
    f3921: iso.f3921,
    f8949: [brokerLot],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  return { result, filed, filer: extractFilerIdentity(general) };
}

Deno.test("MFS short-term loss-to-AMT-gain lot reaches Form 6251 and final return", async () => {
  const { result, filed, filer } = filedReturn();
  assertEquals(result.pending.f1040?.line7_capital_gain, -500);
  assertEquals(filed.line2k_disposition, 1_000);
  assertEquals(filed.line13, undefined);
  assertEquals(filed.line15, undefined);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertEquals(result.pending.f1040?.line17_additional_taxes, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer }),
    "<PropertyDispositionAmt>1000</PropertyDispositionAmt>",
  );
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<PropertyDispositionAmt>1000</PropertyDispositionAmt>");
  assertStringIncludes(prepared.bundle.xml, "<SpouseSSN>444556666</SpouseSSN>");
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)?.line2k_disposition,
    1_000,
  );
});

Deno.test("MFS short-term crossover rejects changed source and filed totals", () => {
  const { result, filed, filer } = filedReturn();
  for (const pending of [
    { ...result.pending, f8949: { f8949s: [{ ...brokerLot, amt_cost_basis: 501 }] } },
    { ...result.pending, schedule2: { ...result.pending.schedule2, line2_amt: 0 } },
    { ...result.pending, f1040: { ...result.pending.f1040, line7_capital_gain: -499 } },
    { ...result.pending, f1040: { ...result.pending.f1040, line17_additional_taxes: 0 } },
  ]) {
    assertThrows(() => mef6251.build(filed, { pending, filer }));
    assertThrows(() => form6251Pdf.projectFields?.(filed, pending));
  }
});

Deno.test("MFS short-term crossover validates prepared XML and filled Form 6251 PDF", async () => {
  const { result, filer } = filedReturn();
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  const tempDir = await Deno.makeTempDir({ prefix: "opentax-6251-mfs-" });
  try {
    const xmlPath = `${tempDir}/return.xml`;
    const pdfPath = `${tempDir}/return.pdf`;
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    await Deno.writeFile(pdfPath, await prepared.renderPdf());
    const schema = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validation.code, 0, new TextDecoder().decode(validation.stderr));
    assertStringIncludes(prepared.bundle.xml, "<SpouseSSN>444556666</SpouseSSN>");
    const extraction = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extraction.code, 0, new TextDecoder().decode(extraction.stderr));
    const pages = new TextDecoder().decode(extraction.stdout).split("\f");
    assertEquals(/and full name here:\s+Sam Taxpayer/.test(pages[0] ?? ""), true);
    assertEquals((pages[0] ?? "").includes("4 4 4 5 5 6 6 6 6"), true);
    const form6251 = pages.find((page) => page.includes("Alternative Minimum Tax—Individuals"));
    if (!form6251) throw new Error("Filled packet lacks Form 6251");
    assertEquals(/Disposition of property[^\n]*2k\s+1000/.test(form6251), true);
    assertEquals(/11\s+64822/.test(form6251), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
