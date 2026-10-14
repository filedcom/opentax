import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { form8962Pdf } from "../../../../2025/pdf/forms/credits/health/f8962.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";

const owner = "111223333";
const general = {
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
  taxpayer_can_be_claimed_as_dependent: false,
};
const w2 = {
  employee_ssn: "111-22-3333",
  box1_wages: 75_300,
  box2_fed_withheld: 10_000,
  box3_ss_wages: 75_300,
  box4_ss_withheld: 4_668.6,
  box5_medicare_wages: 75_300,
  box6_medicare_withheld: 1_091.85,
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employer_address_line1: "2 Payroll Road",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78702",
  box12_entries: [],
};
const correctionMonths = [1, 4, 7, 10];
const policies = correctionMonths.map((month, policyIndex) => {
  const active = Array.from(
    { length: 12 },
    (_, index) => Math.floor(index / 3) === policyIndex,
  );
  return {
    issuer_name: "Texas Marketplace",
    policy_number: `TX-QUARTER-${policyIndex + 1}`,
    coverage_state: "TX",
    covered_individual_ssns: [owner],
    monthly_premiums: active.map((yes) => yes ? 500 : 0),
    monthly_slcsps: active.map((yes) => yes ? 600 : 0),
    monthly_aptcs: active.map((yes) => yes ? 200 : 0),
    annual_premium: 1_500,
    annual_slcsp: 1_800,
    annual_aptc: 600,
    slcsp_corrections: [{
      month,
      basis: "marketplace_error",
      corrected_slcsp: 650,
      determination_source: "marketplace_contact",
      determination_reference: `TX-MKT-${month}`,
      determination_record_sha256: String(policyIndex + 1).repeat(64),
      determined_on: "2026-02-01",
    }],
  };
});

function filedReturn() {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2],
    f1095a: policies,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("four sequential corrected policies reconcile Form 1095-A months, Form 8962, Form 1040, MeF and PDF", () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  assertEquals(pending.form8962?.total_premium_tax_credit, 1_004);
  assertEquals(pending.form8962?.total_advance_ptc, 2_400);
  assertEquals(pending.form8962?.excess_advance_premium, 1_396);
  assertEquals(pending.schedule2?.line1a_excess_advance_premium, 1_396);
  assertEquals(pending.f1040?.line17_additional_taxes, 1_396);
  const filer = extractFilerIdentity(pending.f1040);
  const xml = buildMefXml(pending, filer);
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1396</PremiumTaxCreditTaxLiabAmt>",
  );
  const fields = form8962Pdf.projectFields?.(pending.form8962!, pending) ?? {};
  for (const month of correctionMonths) {
    assertEquals(fields[`pdf_month_${month}_slcsp`], "650");
  }
  assertEquals(form8962Pdf.instances?.(fields, filer, pending)?.length, 1);
});

Deno.test("four-policy SLCSP route rejects wrong policy month, missing review and final tax drift", () => {
  const { pending } = filedReturn();
  const filer = extractFilerIdentity(pending.f1040);
  const fields = form8962Pdf.projectFields?.(pending.form8962!, pending) ?? {};
  const changed = [
    (() => {
      const copy = structuredClone(pending);
      (copy.f1095a as { f1095as: typeof policies }).f1095as[3]
        .slcsp_corrections[0].month = 7;
      return copy;
    })(),
    (() => {
      const copy = structuredClone(pending);
      (copy.f1095a as { f1095as: typeof policies }).f1095as[2]
        .slcsp_corrections[0].determination_record_sha256 = "";
      return copy;
    })(),
    (() => {
      const copy = structuredClone(pending);
      (copy.f1040 as { line17_additional_taxes: number })
        .line17_additional_taxes = 1_395;
      return copy;
    })(),
  ];
  for (const altered of changed) {
    assertThrows(() => buildMefXml(altered, filer));
    assertThrows(() => form8962Pdf.instances?.(fields, filer, altered));
  }
});
