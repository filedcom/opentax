import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../../../mef/header.ts";
import { MsaOwner } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { buildPdfBytes } from "../../../builder.ts";
import { form8853Pdf } from "./f8853.ts";

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const archerSource = {
  archer_msa_distributions: 3_000,
  archer_msa_rollover: 0,
  archer_msa_qualified_expenses: 3_000,
  archer_msa_exception: false,
  archer_distribution_filing_details: {
    owner: MsaOwner.Taxpayer,
    single_archer_msa_distribution_confirmed: true as const,
    gross_amount_confirmed_from_1099sa: true as const,
    qualified_expenses_unreimbursed_confirmed: true as const,
    no_other_form8853_activity_confirmed: true as const,
  },
};

Deno.test("2025 Form 8853 Archer and Medicare distributions use their printed lines", () => {
  const byKey = new Map(
    form8853Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("archer_msa_distributions"), `${page1}.f1_8[0]`);
  assertEquals(byKey.get("archer_msa_rollover"), `${page1}.f1_9[0]`);
  assertEquals(byKey.get("archer_msa_qualified_expenses"), `${page1}.f1_11[0]`);
  assertEquals(
    byKey.get("medicare_advantage_distributions"),
    `${page1}.f1_14[0]`,
  );
  assertEquals(
    byKey.get("medicare_advantage_qualified_expenses"),
    `${page1}.f1_15[0]`,
  );
});

Deno.test("2025 Form 8853 LTC source amounts use lines 17, 18, 19, 22, and 24", () => {
  const byKey = new Map(
    form8853Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("ltc_gross_payments"), `${page2}.f2_5[0]`);
  assertEquals(byKey.get("ltc_qualified_contract_amount"), `${page2}.f2_6[0]`);
  assertEquals(byKey.get("ltc_accelerated_death_benefits"), `${page2}.f2_7[0]`);
  assertEquals(byKey.get("ltc_actual_costs"), `${page2}.f2_10[0]`);
  assertEquals(byKey.get("ltc_reimbursements"), `${page2}.f2_12[0]`);
  assertEquals(byKey.has("ltc_period_days"), false);
});

Deno.test("2025 Form 8853 PDF projects filed Archer lines and holder identity", () => {
  const instances = form8853Pdf.instances?.(archerSource, filer, {}) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(instances[0].archer_msa_distributions, 3_000);
  assertEquals(instances[0].archer_msa_rollover, 0);
  assertEquals(instances[0].line6c_archer_msa_net_distribution, 3_000);
  assertEquals(instances[0].archer_msa_qualified_expenses, 3_000);
  assertEquals(instances[0].line8_taxable_archer_msa_distribution, 0);
  assertEquals(form8853Pdf.pageIndices?.(instances[0]), [0]);
  assertEquals(
    form8853Pdf.filerFields?.map((field) => field.domainKey),
    ["nameLine1", "primarySSN"],
  );
  assertThrows(
    () =>
      form8853Pdf.instances?.(
        { ...archerSource, archer_msa_rollover: 1 },
        filer,
        {},
      ),
    Error,
    "no rollover",
  );
});

Deno.test("2025 Form 8853 filed PDF prints the Archer lines on one page", async () => {
  const bytes = await buildPdfBytes({ form8853: archerSource }, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    const printed = new TextDecoder().decode(result.stdout);
    assertStringIncludes(printed, "SMITH JOHN A");
    assertStringIncludes(printed, "123456789");
    for (const line of ["6a", "6b", "6c", "7", "8"]) {
      const value = line === "6b" || line === "8" ? "0" : "3000";
      assertEquals(new RegExp(`\\b${line}\\s+${value}\\b`).test(printed), true);
    }
  } finally {
    await Deno.remove(path);
  }
});
