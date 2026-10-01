import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { form8962 as form8962Mef } from "../mef/forms/f8962.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8962Pdf } from "./forms/f8962.ts";

const firstMonths = Array.from({ length: 12 }, (_, month) => month <= 5);
const secondMonths = Array.from({ length: 12 }, (_, month) => month >= 5);
const policy = (
  number: string,
  active: readonly boolean[],
  premium: number,
  aptc: number,
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
});
const policies = [
  policy("TX-FIRST", firstMonths, 500, 200),
  policy("TX-SECOND", secondMonths, 400, 150),
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

Deno.test("one-person June policy transition combines A/C once and SLCSP once through Form 1040, MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form8962;
  assertEquals(fields.monthly_ptc_rows[5].premium, 900);
  assertEquals(fields.monthly_ptc_rows[5].slcsp, 600);
  assertEquals(fields.monthly_ptc_rows[5].aptc, 350);
  assertEquals(fields.total_premium_tax_credit, 804);
  assertEquals(fields.total_advance_ptc, 2_250);
  assertEquals(fields.excess_advance_premium, 1_446);
  assertEquals(result.pending.schedule2.line1a_excess_advance_premium, 1_446);
  assertEquals(result.pending.f1040.line17_additional_taxes, 1_446);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes("<MonthlyPremiumAmt>900</MonthlyPremiumAmt>"),
    true,
  );
  assertEquals(
    bundle.xml.includes("<MonthlyPremiumSLCSPAmt>600</MonthlyPremiumSLCSPAmt>"),
    true,
  );
  const projected = form8962Pdf.projectFields!(fields, pending);
  assertEquals(projected.pdf_month_6_premium, "900");
  assertEquals(projected.pdf_month_6_slcsp, "600");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  assertEquals(
    (await buildPdfBytes(pending, filer, ".pdf-cache", bundle)).length > 0,
    true,
  );

  const twoOverlapMonths = {
    ...pending,
    f1095a: {
      f1095as: [
        policies[0],
        policy(
          "TX-SECOND",
          secondMonths.map((active, month) => active || month === 4),
          400,
          150,
        ),
      ],
    },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: twoOverlapMonths }),
    Error,
  );
  assertThrows(
    () => form8962Pdf.projectFields!(fields, twoOverlapMonths),
    Error,
  );
  const changedSlcsp = {
    ...pending,
    f1095a: {
      f1095as: [policies[0], {
        ...policies[1],
        monthly_slcsps: policies[1].monthly_slcsps.map((amount, month) =>
          month === 5 ? 601 : amount
        ),
        annual_slcsp: policies[1].annual_slcsp + 1,
      }],
    },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: changedSlcsp }),
    Error,
  );
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, changedSlcsp),
    Error,
  );
  const changedAptc = {
    ...pending,
    f1095a: {
      f1095as: [policies[0], {
        ...policies[1],
        monthly_aptcs: policies[1].monthly_aptcs.map((amount, month) =>
          month === 5 ? 151 : amount
        ),
        annual_aptc: policies[1].annual_aptc + 1,
      }],
    },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: changedAptc }),
    Error,
  );
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, changedAptc),
    Error,
  );
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line17_additional_taxes: 1_445 },
  };
  assertThrows(
    () => form8962Mef.build(fields, { filer, pending: changedReturn }),
    Error,
  );
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, changedReturn),
    Error,
  );
});
