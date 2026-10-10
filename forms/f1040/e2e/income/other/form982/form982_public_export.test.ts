import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../2025/pdf/review-fixtures.ts";
import { form982Pdf } from "../../../../2025/pdf/forms/income/other/f982.ts";
import { FilingStatus } from "../../../../mef/header.ts";

// Deferred finding 149: the two cap cases deliberately retain normative
// expectations and currently fail; do not bless the over-excluded output.
const cases = [
  {
    id: "retained",
    status: "single",
    principal: 15000,
    balance: 200000,
    qualified: 200000,
    basis: 200000,
    excluded: 15000,
    taxable: 0,
    tax: 7955,
    interest: 0,
    treatment: "taxable",
  },
  {
    id: "mixed-loan-basis-limit",
    status: "single",
    principal: 100000,
    balance: 200000,
    qualified: 150000,
    basis: 30000,
    excluded: 50000,
    taxable: 50000,
    tax: 19067,
    interest: 0,
    treatment: "taxable",
  },
  {
    id: "separate-cap",
    status: "mfs",
    principal: 400000,
    balance: 600000,
    qualified: 600000,
    basis: 100000,
    excluded: 175000,
    taxable: 225000,
    tax: 69035,
    interest: 0,
    treatment: "taxable",
  },
  {
    id: "joint-cap",
    status: "mfj",
    principal: 800000,
    balance: 1000000,
    qualified: 1000000,
    basis: 200000,
    excluded: 550000,
    taxable: 250000,
    tax: 56134,
    interest: 0,
    treatment: "taxable",
  },
  {
    id: "zero-basis",
    status: "single",
    principal: 15000,
    balance: 200000,
    qualified: 200000,
    basis: 0,
    excluded: 15000,
    taxable: 0,
    tax: 7955,
    interest: 0,
    treatment: "taxable",
  },
  {
    id: "taxable-interest",
    status: "single",
    principal: 15000,
    balance: 200000,
    qualified: 200000,
    basis: 200000,
    excluded: 15000,
    taxable: 2000,
    tax: 8395,
    interest: 2000,
    treatment: "taxable",
  },
  {
    id: "deductible-interest",
    status: "single",
    principal: 15000,
    balance: 200000,
    qualified: 200000,
    basis: 200000,
    excluded: 15000,
    taxable: 0,
    tax: 7955,
    interest: 2000,
    treatment: "cash_basis_deductible_if_paid",
  },
] as const;
// Tax-table amounts below $100,000 taxable income use IRS Publication 1040.
// https://www.irs.gov/publications/p1040
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const evidenceDir = Deno.args.find((arg) => arg.startsWith("--evidence-dir="))
  ?.slice("--evidence-dir=".length);
for (const c of cases) {
  Deno.test(`Form982 public QPRI native and PDF: ${c.id}`, async () => {
    const general = {
      ...base.inputs.general as Record<string, unknown>,
      filing_status: c.status,
      ...(c.status !== "single"
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Example",
          spouse_ssn: "222334444",
          spouse_dob: "1986-02-01",
        }
        : {}),
    };
    const filer = {
      ...base.filer,
      filingStatus: c.status === "mfj"
        ? FilingStatus.MarriedFilingJointly
        : c.status === "mfs"
        ? FilingStatus.MarriedFilingSeparately
        : FilingStatus.Single,
      ...(c.status !== "single"
        ? {
          spouse: {
            ssn: "222334444",
            firstName: "Sam",
            lastName: "Example",
            nameControl: "EXAM",
          },
        }
        : {}),
      ...(c.status === "mfj" ? { nameLine1: "ALEX & SAM EXAMPLE" } : {}),
    };
    const debt = {
      creditor_name: "Synthetic mortgage lender",
      box1_date: "2025-06-15",
      box2_cod_amount: c.principal + c.interest,
      box3_interest: c.interest,
      box3_interest_treatment: c.treatment,
      box3_interest_treatment_source:
        "Synthetic interest classification review",
      box5_personally_liable: true,
      property_disposition_status: "retained",
      routing: "excluded",
      exclusion_type: "qpri",
      qpri_mfs: c.status === "mfs",
      qpri_actual_discharge_date: "2025-06-15",
      qpri_discharged_principal_amount: c.principal,
      qpri_total_loan_balance_before_discharge: c.balance,
      qpri_qualified_loan_balance_before_discharge: c.qualified,
      qpri_main_home_security_confirmed: true,
      qpri_discharge_reason: "financial_condition",
      qpri_discharge_reason_source:
        "Synthetic lender workout and loan-use review",
      principal_residence_retained: true,
      principal_residence_basis: c.basis,
    };
    const inputs = { general, w2: base.inputs.w2, f1099c: [debt] };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const projected = form982Pdf.projectFields!(
      pending.form982!,
      result.pending,
    );
    const xml = buildMefXml(pending, filer);
    const validator = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validator.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const checked = await validator.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const pdf = await buildPdfBytes(pending, filer);
    if (evidenceDir) {
      await Deno.mkdir(evidenceDir, { recursive: true });
      await Deno.writeTextFile(
        `${evidenceDir}/${c.id}.json`,
        JSON.stringify(
          { inputs, filer, pending: result.pending, expected: c, projected },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${evidenceDir}/${c.id}.xml`, xml);
      await Deno.writeFile(`${evidenceDir}/${c.id}.pdf`, pdf);
    }
    const changed = {
      ...pending,
      form982: { ...pending.form982, principal_residence_basis: c.basis + 1 },
    };
    assertThrows(
      () => buildMefXml(changed, filer),
      Error,
      "differs from its original 1099-C deposit",
    );
    await assertRejects(
      () => buildPdfBytes(changed, filer),
      Error,
      "differs from its original 1099-C deposit",
    );
    assertEquals(pending.schedule1?.line8c_cod_income ?? 0, c.taxable);
    assertEquals(pending.f1040?.line11_agi, 75000 + c.taxable);
    assertEquals(pending.f1040?.line24_total_tax, c.tax);
    assertEquals(projected.qpri_checkbox, true);
    assertEquals(projected.line2_excluded_cod, c.excluded);
    assertEquals(
      projected.line10b_principal_residence_basis_reduction,
      Math.min(c.basis, c.excluded),
    );
    assertStringIncludes(
      xml,
      `<TotalDischargedIndebtednessAmt>${c.excluded}</TotalDischargedIndebtednessAmt>`,
    );
    assertStringIncludes(
      xml,
      `<ExcludedToReducePrinResAmt>${
        Math.min(c.basis, c.excluded)
      }</ExcludedToReducePrinResAmt>`,
    );
  });
}

Deno.test("Form982 other exclusions remain guarded at both final exporters", async () => {
  for (
    const exclusion_type of [
      "bankruptcy",
      "insolvency",
      "farm_debt",
      "real_property_business",
    ]
  ) {
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      f1099c: [{
        creditor_name: "Synthetic lender",
        box2_cod_amount: 15000,
        routing: "excluded",
        exclusion_type,
        insolvency_amount: 15000,
      }],
    });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertThrows(
      () => buildMefXml(pending, base.filer),
      Error,
      // Native currently rejects earlier because non-QPRI has no QPRI flag.
      "Form 982 QPRI filing-status cap conflicts with the return",
    );
    await assertRejects(
      () => buildPdfBytes(pending, base.filer),
      Error,
      "tax-attribute reduction details",
    );
  }
});
