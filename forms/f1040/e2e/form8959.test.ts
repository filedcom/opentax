import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";
import { Box12Code } from "../nodes/inputs/w2/index.ts";

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("four Form CT-2 quarters reach Form 8959 and Form 1040 withholding", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Representative",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "Rail Union",
      employer_ein: "123456789",
      box1_wages: 220_000,
      box2_fed_withheld: 30_000,
    }],
    ct2: [
      {
        recipient: "taxpayer",
        recipient_ssn: "123-45-6789",
        tax_year: 2025,
        quarter: 1,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "123-45-6789",
        tax_year: 2025,
        quarter: 2,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "123-45-6789",
        tax_year: 2025,
        quarter: 3,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "123-45-6789",
        tax_year: 2025,
        quarter: 4,
        line2_tier1_medicare_compensation: 70_000,
        line3_additional_medicare_compensation: 20_000,
        line3_additional_medicare_tax_paid: 180,
        payment_reference: "EFTPS-Q4-2025-001",
      },
    ],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line14_rrta_wages, 220_000);
  assertEquals(result.pending.f1040?.line1a_wages, 220_000);
  assertEquals(result.pending.form8959?.line23_rrta_withheld, 180);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 180);
  assertEquals(result.pending.f1040?.line25c_additional_medicare_withheld, 180);
});

Deno.test("uncollected W-2 Medicare tax restores Form 8959 regular withholding", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "ACME",
      employer_ein: "123456789",
      box1_wages: 210_000,
      box2_fed_withheld: 0,
      box5_medicare_wages: 210_000,
      box6_medicare_withheld: 3_015,
      box12_entries: [
        { code: Box12Code.B, amount: 20 },
        { code: Box12Code.N, amount: 10 },
      ],
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line19_medicare_withheld, 3_045);
  assertEquals(result.pending.form8959?.line22_additional_withheld, 0);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 90);
});

Deno.test("W-2, substitute W-2, and household Medicare wages reach one Form 8959", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "ACME",
      employer_ein: "123456789",
      box1_wages: 100_000,
      box2_fed_withheld: 0,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
    }],
    f4852: [{
      form_type: "W2",
      payer_name: "Other Employer",
      wages: 70_000,
      medicare_wages: 70_000,
      medicare_withheld: 1_015,
    }],
    household_wages: [{
      wages_received: 40_000,
      medicare_wages: 40_000,
      medicare_tax_withheld: 580,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line1_medicare_wages, 210_000);
  assertEquals(result.pending.form8959?.line19_medicare_withheld, 3_045);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 90);
  assertEquals(result.pending.form8959?.line24_total_withheld, 0);
});

Deno.test("W-2 box 5 drives Form 8959 when it exceeds box 1", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "ACME",
      employer_ein: "123456789",
      box1_wages: 190_000,
      box2_fed_withheld: 20_000,
      box5_medicare_wages: 220_000,
      box6_medicare_withheld: 3_370,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1a_wages, 190_000);
  assertEquals(result.pending.form8959?.line1_medicare_wages, 220_000);
  assertEquals(result.pending.form8959?.line20_medicare_wages, 220_000);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 180);
  assertEquals(result.pending.f1040?.line25c_additional_medicare_withheld, 180);
});

Deno.test("qualifying surviving spouse uses the $200,000 Medicare threshold", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.QSS,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "ACME",
      employer_ein: "123456789",
      box1_wages: 205_000,
      box2_fed_withheld: 20_000,
      box5_medicare_wages: 205_000,
      box6_medicare_withheld: 3_017.50,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line5_threshold, 200_000);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 45);
  assertEquals(result.pending.f1040?.line25c_additional_medicare_withheld, 45);
});

Deno.test("a single W-2 above $200,000 keeps Form 8959 on a joint return with zero tax", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
      spouse_first_name: "Sam",
      spouse_last_name: "Worker",
      spouse_ssn: "987-65-4321",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "ACME",
      employer_ein: "123456789",
      box1_wages: 220_000,
      box2_fed_withheld: 20_000,
      box5_medicare_wages: 220_000,
      box6_medicare_withheld: 3_190,
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.form8959?.single_w2_over_withholding_threshold,
    true,
  );
  assertEquals(result.pending.form8959?.line18_total_tax, 0);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, undefined);
});

Deno.test("a single RRTA W-2 above $200,000 keeps Form 8959 on a joint return", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Worker",
      taxpayer_ssn: "123-45-6789",
      spouse_first_name: "Sam",
      spouse_last_name: "Worker",
      spouse_ssn: "987-65-4321",
    },
    w2: [{
      employee_ssn: "123-45-6789",
      employer_name: "RAIL",
      employer_ein: "123456789",
      box1_wages: 220_000,
      box2_fed_withheld: 20_000,
      box14_entries: [{
        description: "RRTA compensation",
        amount: 220_000,
        is_state_sdi_pfml: false,
      }],
    }],
  }, ctx);
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.form8959?.single_w2_over_withholding_threshold,
    true,
  );
  assertEquals(result.pending.form8959?.line14_rrta_wages, 220_000);
  assertEquals(result.pending.form8959?.line18_total_tax, 0);
});
