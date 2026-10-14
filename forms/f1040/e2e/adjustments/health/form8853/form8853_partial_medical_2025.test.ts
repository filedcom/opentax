import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { form8853Pdf } from "../../../../2025/pdf/forms/adjustments/health/f8853.ts";
import { form8853 as nativeForm } from "../../../../2025/mef/forms/adjustments/health/f8853.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { MsaOwner } from "../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";

const source = {
  archer_msa_distributions: 3000,
  archer_msa_rollover: 0,
  archer_msa_qualified_expenses: 2000,
  archer_msa_exception: false,
  archer_distribution_filing_details: {
    owner: MsaOwner.Taxpayer,
    normal_distribution_code_1_confirmed: true as const,
    single_archer_msa_distribution_confirmed: true as const,
    gross_amount_confirmed_from_1099sa: true as const,
    qualified_expenses_unreimbursed_confirmed: true as const,
    no_other_form8853_activity_confirmed: true as const,
  },
};
const inputs = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
  },
  form8853: source,
};

Deno.test("2025 single taxpayer normal Archer distribution with partial medical use reaches 1040, native XSD, and filled PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.form8853?.archer_distribution_filing_details,
    source.archer_distribution_filing_details,
  );
  assertEquals(result.pending.schedule1?.line8e_archer_msa_dist, 1000);
  assertEquals(result.pending.schedule2?.line17e_archer_msa_tax, 200);
  assertEquals(result.pending.f1040?.line8_additional_income, 1000);
  assertEquals(result.pending.f1040?.line11_agi, 1000);
  assertEquals(result.pending.f1040?.line23_other_taxes, 200);
  assertEquals(result.pending.f1040?.line24_total_tax, 200);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(buildPending(result.pending), filer);
  assertStringIncludes(
    xml,
    "<TaxableArcherMSADistriAmt>1000</TaxableArcherMSADistriAmt>",
  );
  assertStringIncludes(
    xml,
    "<ArcherMSAAddnlDistriTaxAmt>200</ArcherMSAAddnlDistriTaxAmt>",
  );
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    await Deno.writeFile(pdfPath, await buildPdfBytes(result.pending, filer));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(text.code, 0, new TextDecoder().decode(text.stderr));
    const printed = new TextDecoder().decode(text.stdout);
    for (
      const [line, amount] of [
        ["6a", 3000],
        ["6b", 0],
        ["6c", 3000],
        ["7", 2000],
        ["8", 1000],
        ["9b", 200],
      ] as const
    ) {
      assertEquals(
        new RegExp(`\\b${line}\\s+${amount}\\b`).test(printed),
        true,
        `${line}: ${amount}`,
      );
    }
    assertStringIncludes(printed, "111223333");
  } finally {
    await Deno.remove(xmlPath);
    await Deno.remove(pdfPath);
  }
  for (
    const pending of [{}, {
      schedule1: { line8e_archer_msa_dist: 999 },
      schedule2: { line17e_archer_msa_tax: 200 },
    }, {
      schedule1: { line8e_archer_msa_dist: 1000 },
      schedule2: { line17e_archer_msa_tax: 199 },
    }] as Record<string, Record<string, unknown>>[]
  ) {
    assertThrows(
      () => nativeForm.build(source, { filer, pending }),
      Error,
      "conflicts with Schedule 1 or 2",
    );
    assertThrows(
      () => form8853Pdf.instances?.(source, filer, pending),
      Error,
      "conflicts with Schedule 1 or 2",
    );
  }
});
