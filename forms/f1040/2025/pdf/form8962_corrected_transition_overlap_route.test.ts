import { assertEquals, assertThrows } from "@std/assert";
import { z } from "zod";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { form8962 as form8962Mef } from "../mef/forms/f8962.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8962Pdf } from "./forms/f8962.ts";

const policy = (
  number: string,
  active: readonly boolean[],
  premium: number,
  aptc: number,
  reference: string,
  hash: string,
) => ({
  issuer_name: "Texas Marketplace",
  policy_number: number,
  coverage_state: "TX",
  covered_individual_ssns: ["111223333"],
  monthly_premiums: active.map((covered) => covered ? premium : 0),
  monthly_slcsps: active.map((covered) => covered ? 600 : 0),
  monthly_aptcs: active.map((covered) => covered ? aptc : 0),
  annual_premium: active.filter(Boolean).length * premium,
  annual_slcsp: active.filter(Boolean).length * 600,
  annual_aptc: active.filter(Boolean).length * aptc,
  slcsp_corrections: [{
    month: 6,
    basis: "marketplace_error" as const,
    corrected_slcsp: 650,
    determination_source: "marketplace_contact" as const,
    determination_reference: reference,
    determination_record_sha256: hash,
    determined_on: "2026-01-15",
  }],
});
const policies = [
  policy(
    "TX-FIRST",
    Array.from({ length: 12 }, (_, month) => month <= 5),
    500,
    200,
    "marketplace-first-june",
    "a".repeat(64),
  ),
  policy(
    "TX-SECOND",
    Array.from({ length: 12 }, (_, month) => month >= 5),
    400,
    150,
    "marketplace-second-june",
    "b".repeat(64),
  ),
];
const inputs = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Main St",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    taxpayer_can_be_claimed_as_dependent: false,
    digital_assets: false,
  },
  w2: [{
    box1_wages: 75_300,
    box2_fed_withheld: 12_000,
    box3_ss_wages: 75_300,
    box4_ss_withheld: 4_668.60,
    box5_medicare_wages: 75_300,
    box6_medicare_withheld: 1_091.85,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "2 Payroll Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
    box12_entries: [],
  }],
  f1095a: policies,
};

Deno.test("independently corrected transition-month SLCSP reaches Form 8962, return, MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form8962;
  const rows = z.array(z.object({
    premium: z.number(),
    slcsp: z.number(),
    aptc: z.number(),
  })).parse(fields.monthly_ptc_rows);
  assertEquals(rows[5].premium, 900);
  assertEquals(rows[5].slcsp, 650);
  assertEquals(rows[5].aptc, 350);
  assertEquals(fields.total_premium_tax_credit, 854);
  assertEquals(fields.total_advance_ptc, 2_250);
  assertEquals(fields.excess_advance_premium, 1_396);
  assertEquals(result.pending.schedule2.line1a_excess_advance_premium, 1_396);
  assertEquals(result.pending.f1040.line17_additional_taxes, 1_396);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040!);
  const pdfPending = {
    general: pending.general!,
    f1095a: pending.f1095a!,
    f1040: pending.f1040!,
    schedule2: pending.schedule2!,
  };
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes("<MonthlyPremiumSLCSPAmt>650</MonthlyPremiumSLCSPAmt>"),
    true,
  );
  const projected = form8962Pdf.projectFields!(fields, pdfPending);
  assertEquals(projected.pdf_month_6_premium, "900");
  assertEquals(projected.pdf_month_6_slcsp, "650");
  assertEquals(
    form8962Pdf.instances?.(projected, filer, pdfPending)?.length,
    1,
  );
  assertEquals(
    (await buildPdfBytes(pending, filer, ".pdf-cache", bundle)).length > 0,
    true,
  );

  const changedBenchmark = {
    ...pending,
    f1095a: {
      f1095as: [policies[0], {
        ...policies[1],
        slcsp_corrections: [{
          ...policies[1].slcsp_corrections[0],
          corrected_slcsp: 660,
        }],
      }],
    },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: changedBenchmark }),
    Error,
  );
  assertThrows(
    () =>
      form8962Pdf.projectFields!(fields, {
        ...pdfPending,
        f1095a: changedBenchmark.f1095a,
      }),
    Error,
  );
  const reusedEvidence = {
    ...pending,
    f1095a: {
      f1095as: [policies[0], {
        ...policies[1],
        slcsp_corrections: [{
          ...policies[1].slcsp_corrections[0],
          determination_reference:
            policies[0].slcsp_corrections[0].determination_reference,
        }],
      }],
    },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: reusedEvidence }),
    Error,
  );
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line17_additional_taxes: 1_395 },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: changedReturn }),
    Error,
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pdfPending,
        f1040: changedReturn.f1040,
      }),
    Error,
  );
});
