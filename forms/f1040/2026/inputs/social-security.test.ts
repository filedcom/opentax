import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { calculateSocialSecuritySources2026 as calculate } from "./social-security-source.ts";
import {
  socialSecurityGraphFixture2026,
  syntheticSocialSecurity2026,
} from "./social-security.fixture.ts";
const plan = buildExecutionPlan(sourceRegistry2026);
const context = { taxYear: 2026, formType: "f1040" };
function worksheet(fields: Partial<Parameters<typeof agi_2026.compute>[1]>) {
  const outputs =
    agi_2026.compute(context, { filing_status: FilingStatus.Single, ...fields })
      .outputs;
  return Object.assign(
    {},
    ...outputs.filter((o) => o.nodeType === "f1040").map((o) => o.fields),
  );
}
Deno.test("2026 benefits offset signed current copies across joint owners and retain premiums without netting", () => {
  const source = syntheticSocialSecurity2026();
  source.filing_status = FilingStatus.MFJ;
  source.spouse_ssn = "987654321";
  source.statements.push({
    ...source.statements[0],
    is_rrb: true,
    recipient: "spouse",
    recipient_tin: "987-65-4321",
    source_document_reference: "rrb-copy-2",
    claim_number: "rrb-claim",
    payer_name: "Railroad Retirement Board",
    box3_gross_benefits: 1000.25,
    box4_repaid: 1500,
    box5_net_benefits: -499.75,
    workers_compensation_offset_in_box3: 100,
    box6_federal_withheld: undefined,
    rrb_box10_federal_withheld: 20.25,
  });
  const c = calculate(source);
  assertEquals(c.net_benefits, 9500.25);
  assertEquals(c.federal_withholding, 920.5);
  assertEquals(c.medicare_premiums_paid, 4000);
  assertEquals(c.source_input.statements[1].recipient_tin, "987-65-4321");
});
Deno.test("2026 benefits reject mismatched boxes, RRB withholding confusion and unsupported worksheets", () => {
  for (
    const change of [
      { box5_net_benefits: 9999 },
      { is_rrb: true, rrb_box10_federal_withheld: 900.25 },
      {
        box3_gross_benefits: 0,
        box4_repaid: 1000,
        box5_net_benefits: -1000,
        workers_compensation_offset_in_box3: 0,
      },
      { workers_compensation_offset_in_box3: 12000.01 },
      { no_prior_year_lump_sum_payments: false },
      { no_disability_repayment_to_employer_or_insurer: false },
      { box6_federal_withheld: undefined },
      { box6_federal_withheld: .001 },
      { tax_year: 2025 },
      { recipient_tin: "999999999" },
      { recipient: "spouse" },
    ]
  ) {
    const s = syntheticSocialSecurity2026();
    Object.assign(s.statements[0], change);
    assertThrows(() => calculate(s));
  }
  const s = syntheticSocialSecurity2026();
  s.worksheet_scope_review.no_savings_bond_interest_exclusion = false as never;
  assertThrows(() => calculate(s));
});
Deno.test("2026 benefits preserve corrected-copy evidence and reject duplicate claims and superseded copies", () => {
  const s = syntheticSocialSecurity2026();
  s.statements[0].corrected = true;
  assertThrows(() => calculate(s), Error, "superseded");
  s.statements[0].replaces_statement_references = ["original-copy"];
  assertEquals(calculate(s).net_benefits, 10000);
  s.statements.push({
    ...s.statements[0],
    source_document_reference: "original-copy",
    corrected: false,
    replaces_statement_references: [],
  });
  assertThrows(() => calculate(s), Error, "Superseded");
  s.statements[1].source_document_reference = "different-reference";
  assertThrows(() => calculate(s), Error, "claim repeats");
  s.statements[1].claim_number = "another-claim";
  s.statements[1].source_document_reference = "ssa-copy-1";
  assertThrows(() => calculate(s), Error, "issued-copy reference");
});
Deno.test("2026 benefits worksheet covers statutory bands and signed income instead of clamping losses", () => {
  for (
    const [status, income, expected] of [
      [FilingStatus.Single, 10000, 0],
      [FilingStatus.Single, 15000, 2500],
      [FilingStatus.Single, 19000, 4500],
      [FilingStatus.Single, 20000, 5350],
      [FilingStatus.Single, 100000, 25500],
      [FilingStatus.MFJ, 17000, 0],
      [FilingStatus.MFJ, 23000, 3000],
      [FilingStatus.MFJ, 29000, 6000],
      [FilingStatus.MFJ, 30000, 6850],
      [FilingStatus.HOH, 20000, 5350],
      [FilingStatus.QSS, 20000, 5350],
    ] as const
  ) {
    assertEquals(
      worksheet({
        filing_status: status,
        line1a_wages: income,
        line6a_ss_gross: 30000,
      }).line6b_ss_taxable,
      expected,
    );
  }
  assertEquals(
    worksheet({ line6a_ss_gross: 100000, line3_schedule_c: -40000 })
      .line6b_ss_taxable,
    0,
  );
  assertEquals(
    worksheet({
      line6a_ss_gross: 30000,
      line1a_wages: 10000,
      tax_exempt_interest: 10000,
    }).line6b_ss_taxable,
    5350,
  );
  assertEquals(
    worksheet({
      line6a_ss_gross: 30000,
      line1a_wages: 20000,
      line8d_foreign_earned_income_exclusion: 10000,
    }).line6b_ss_taxable,
    5350,
  );
  assertEquals(
    worksheet({
      line6a_ss_gross: 30000,
      line1a_wages: 20000,
      line18_early_withdrawal: 1000,
    }).line6b_ss_taxable,
    4500,
  );
});
Deno.test("2026 benefits worksheet resolves MFS residence, low provisional income, zero benefits and IRA coordination", () => {
  assertThrows(
    () =>
      worksheet({ filing_status: FilingStatus.MFS, line6a_ss_gross: 10000 }),
    Error,
    "residence",
  );
  const base = {
    filing_status: FilingStatus.MFS,
    line6a_ss_gross: 10000,
    mfs_lived_with_spouse: true,
  };
  assertEquals(worksheet(base).line6b_ss_taxable, 4250);
  assertEquals(
    worksheet({ ...base, line3_schedule_c: -6000 }).line6b_ss_taxable,
    0,
  );
  assertEquals(
    worksheet({ ...base, line1a_wages: 5000 }).line6b_ss_taxable,
    8500,
  );
  const apart = worksheet({ ...base, mfs_lived_with_spouse: false });
  assertEquals(apart.line6b_ss_taxable, 0);
  assertEquals(apart.line6d_mfs_lived_apart, true);
  assertEquals(worksheet({ line6a_ss_gross: 0 }).line6b_ss_taxable, 0);
  assertThrows(() => worksheet({ line6a_ss_gross: -1 }));
  assertThrows(
    () => worksheet({ line6a_ss_gross: 10000, line20_ira_deduction: 1000 }),
    Error,
    "590-A",
  );
  assertThrows(
    () => worksheet({ line6a_ss_gross: 10000, line6b_ss_taxable: 10000 }),
    Error,
    "benefit limit",
  );
});
Deno.test("2026 benefits source graph resolves taxable benefits before student-loan MAGI and reconciles withholding", () => {
  const input = socialSecurityGraphFixture2026();
  const result = execute(plan, sourceRegistry2026, input, context);
  assertEquals(result.diagnostics, []);
  const f = result.pending.f1040;
  assertEquals(f.line6a_ss_gross, 10000);
  assertEquals(f.line6b_ss_taxable, 8500);
  assertEquals(f.line10_adjustments, 1083);
  assertEquals(f.line11b_agi, 92417);
  assertEquals(f.line25b_withheld_1099, 900);
  assertEquals(f.line25d_total_withholding, 30900);
  assertEquals(result.pending.form8960.magi, 92417);
  const w = result.pending.agi_aggregator
    .social_security_worksheet_2026 as Record<string, unknown>;
  assertEquals(w.adjustments_except_student_loan, 0);
  const lower = socialSecurityGraphFixture2026(20000);
  lower.ssa1099.statements[0].box3_gross_benefits = 32000;
  lower.ssa1099.statements[0].box5_net_benefits = 30000;
  const r = execute(plan, sourceRegistry2026, lower, context);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 5350);
  assertEquals(r.pending.f1040.line10_adjustments, 2500);
  assertEquals(r.pending.f1040.line11b_agi, 22850);
});
Deno.test("2026 benefits source graph sums cent amounts before rounding the printed lines", () => {
  const input = socialSecurityGraphFixture2026(0, FilingStatus.MFJ);
  input.ssa1099.statements.push({
    ...input.ssa1099.statements[0],
    recipient: "spouse",
    recipient_tin: "987654321",
    claim_number: "claim-2",
    source_document_reference: "ssa-copy-2",
    box3_gross_benefits: 0,
    box4_repaid: 499.5,
    box5_net_benefits: -499.5,
    workers_compensation_offset_in_box3: 0,
  });
  const r = execute(plan, sourceRegistry2026, input, context);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line6a_ss_gross, 9501);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(r.pending.f1040.line25b_withheld_1099, 1801);
});
