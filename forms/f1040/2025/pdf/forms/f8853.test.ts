import { assertEquals } from "@std/assert";
import { form8853Pdf } from "./f8853.ts";

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";

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
