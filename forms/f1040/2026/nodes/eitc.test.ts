import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { eicGraphFixture2026 } from "./eitc.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { calculateEic2026 } from "./eitc.ts";
function run(input: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
}
function complete(input: Record<string, unknown>) {
  const result = run(input);
  assertEquals(result.diagnostics, []);
  return result.pending;
}
Deno.test("2026 EIC connects source reviews, child details, ACTC and settlement", () => {
  const p = complete(eicGraphFixture2026());
  assertEquals(p.f1040.line27a_eic, 3409);
  assertEquals(p.f8812.finalized_eic, 3409);
  assertEquals(p.f1040.line28_actc, 1125);
  assertEquals(p.f1040.line32a_refundable_credits, 4534);
  assertEquals(p.f1040.line35a_refund, 34534);
});
Deno.test("2026 childless EIC uses the annual table and opt-out", () => {
  const input = eicGraphFixture2026(10000, 0);
  assertEquals(complete(input).f1040.line27a_eic, 664);
  input.general.do_not_claim_eic = true;
  assertEquals(complete(input).f1040.line27a_eic, 0);
});
Deno.test("2026 EIC combat election changes line 1i without changing taxable wages or ACTC combat inclusion", () => {
  const base = eicGraphFixture2026(2500, 1);
  const input = {
    ...base,
    w2s: [{ ...base.w2s![0], box12_entries: [{ code: "Q", amount: 10000 }] }],
  };
  const p = complete(input);
  assertEquals(p.f1040.line11b_agi, 2500);
  assertEquals(p.f1040.line1z_total_wages, 2500);
  assertEquals(p.f1040.line1i_combat_pay, 10000);
  assertEquals(p.f1040.line27a_eic, 4259);
  assertEquals(p.f1040.line28_actc, 1500);
  const c = p.eitc.calculation_2026 as ReturnType<typeof calculateEic2026>;
  assertEquals(c.combat_pay_elected.taxpayer, true);
  const excluded = complete({
    ...input,
    eitc: { ...input.eitc, combat_pay_election: "exclude" },
  });
  assertEquals(excluded.f1040.line1i_combat_pay, 0);
  assertEquals(excluded.f1040.line27a_eic, 859);
  assertEquals(excluded.f1040.line28_actc, 1500);
});
Deno.test("2026 EIC missing eligibility reviews cause a diagnostic instead of a zero credit", () => {
  const input = eicGraphFixture2026();
  assert(
    run({ ...input, eitc: undefined }).diagnostics.some((d) =>
      d.nodeType === "eitc"
    ),
  );
  assert(
    run({ ...input, eitc: { ...input.eitc, child_reviews: [] } }).diagnostics
      .some((d) => d.nodeType === "eitc"),
  );
});
Deno.test("2026 three-child ACTC consumes finalized EIC and the actual W-2 payroll method", () => {
  const p = complete(eicGraphFixture2026(20000, 3));
  assertEquals(p.f1040.line27a_eic, 8231);
  assertEquals(p.f1040.line28_actc, 2625);
  const c = p.f8812.calculation_2026 as {
    lines: { partIIBLines: Record<string, number> };
  };
  assertEquals(c.lines.partIIBLines, {
    line21: 1530,
    line22: 0,
    line23: 1530,
    line24: 8231,
    line25: 0,
    line26: 2625,
  });
});
Deno.test("2026 ACTC payroll method removes Additional Medicare withholding and includes uncollected FICA", () => {
  const base = eicGraphFixture2026(10000, 3);
  const p = complete({
    ...base,
    general: { ...base.general, do_not_claim_eic: true },
    w2s: [{
      ...base.w2s![0],
      box3_ss_wages: 60000,
      box4_ss_withheld: 3720,
      box5_medicare_wages: 60000,
      box6_medicare_withheld: 920,
      box12_entries: [{ code: "A", amount: 100 }, { code: "B", amount: 20 }],
    }],
  });
  assertEquals(p.f1040.line27a_eic, 0);
  // Form 8959 line 19 includes code B: (920 + 20) - 60000 * 1.45% = 70.
  assertEquals(p.f1040.line25c_other_withheld, 70);
  assertEquals(p.f1040.line28_actc, 4690);
  const c = p.f8812.calculation_2026 as {
    lines: { partIIBLines: Record<string, number> };
  };
  assertEquals(c.lines.partIIBLines, {
    line21: 4570,
    line22: 120,
    line23: 4690,
    line24: 0,
    line25: 4690,
    line26: 4690,
  });
});
Deno.test("2026 ACTC payroll method requires actual withholding instead of estimating from wages", () => {
  const base = eicGraphFixture2026(20000, 3);
  const { box4_ss_withheld: _box4, ...w2 } = base.w2s![0];
  const result = run({ ...base, w2s: [w2] });
  assert(
    result.diagnostics.some((d) =>
      d.nodeType === "f8812" && d.message.includes("actual W-2 boxes")
    ),
  );
});

Deno.test("2026 joint EIC evaluates each spouse's combat election independently and rounds combined pay once", () => {
  const base = eicGraphFixture2026(2500, 1);
  const joint = {
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "444556666",
      spouse_first_name: "Joint",
      spouse_last_name: "Investor",
      spouse_dob: "1982-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
    },
    eitc: {
      ...base.eitc,
      spouse_residency_record_reference: "synthetic-spouse-residence",
    },
    w2s: [
      { ...base.w2s![0], box12_entries: [{ code: "Q", amount: 10000.25 }] },
      {
        ...base.w2s![0],
        employer_ein: "120000004",
        employee_ssn: "444556666",
        source_document_reference: "synthetic-spouse-w2",
        box1_wages: 0,
        box2_fed_withheld: 0,
        box3_ss_wages: 0,
        box4_ss_withheld: 0,
        box5_medicare_wages: 0,
        box6_medicare_withheld: 0,
        box12_entries: [{ code: "Q", amount: 50000.25 }],
      },
    ],
  };
  const p = complete(joint);
  const c = p.eitc.calculation_2026 as ReturnType<typeof calculateEic2026>;
  assertEquals(c.combat_pay_elected, { taxpayer: true, spouse: false });
  assertEquals(p.f1040.line1i_combat_pay, 10000);
  assertEquals(p.f1040.line27a_eic, 4259);
  if (!("combat_pay_comparisons" in c)) {
    throw new Error("Missing election comparison");
  }
  assertEquals(
    c.combat_pay_comparisons.find((x) => x.taxpayer && x.spouse)?.amount,
    60001,
  );
  assertEquals(p.f1040.line11b_agi, 2500);
});
Deno.test("2026 EIC rejects unreviewed filer and self-only child SSN cases", () => {
  const base = eicGraphFixture2026();
  const { taxpayer_tin_issued_by_due_date: _review, ...general } = base.general;
  assert(
    run({ ...base, general }).diagnostics.some((d) =>
      d.nodeType === "eitc" && d.message.includes("SSN issuance")
    ),
  );
  const child = {
    ...base.general.dependents[0],
    ssn_valid_for_employment: false,
  };
  assert(
    run({
      ...base,
      general: { ...base.general, dependents: [child] },
      eitc: { ...base.eitc, child_reviews: [] },
    }).diagnostics.some((d) =>
      d.nodeType === "eitc" && d.message.includes("self-only")
    ),
  );
});
Deno.test("2026 EIC rejects unsupported source activity and claimant-supplied totals", () => {
  const base = eicGraphFixture2026();
  const badReview = sourceRegistry2026.start.inputSchema.safeParse({
    ...base,
    eitc: { ...base.eitc, credit_amount: 5000 },
  });
  assertEquals(badReview.success, false);
  const statutory = run({
    ...base,
    w2s: [{
      ...base.w2s![0],
      box13_statutory_employee: true,
      schedule_c_business_reference: "synthetic-business",
    }],
  });
  assert(
    statutory.diagnostics.some((d) =>
      d.nodeType === "eitc" && d.message.includes("statutory-employee")
    ),
  );
});

Deno.test("2026 dependent-parent EIC stops for review instead of silently treating the filer as childless", () => {
  const base = eicGraphFixture2026(4000, 1);
  const result = run({
    ...base,
    general: {
      ...base.general,
      taxpayer_can_be_claimed_as_dependent: true,
      dependents: base.general.dependents.map((d) => ({
        ...d,
        claim_as_dependent: false,
      })),
    },
  });
  assert(
    result.diagnostics.some((d) =>
      d.nodeType === "eitc" && d.message.includes("dependent filer")
    ),
  );
  const childless = eicGraphFixture2026(4000, 0);
  // Dependent standard-deduction source routing is separate and unfinished;
  // inspect the EIC result without claiming a complete dependent return.
  const noChild = run({
    ...childless,
    general: {
      ...childless.general,
      taxpayer_can_be_claimed_as_dependent: true,
    },
  });
  assertEquals(noChild.diagnostics.filter((d) => d.nodeType === "eitc"), []);
  assertEquals(
    (noChild.pending.eitc.calculation_2026 as ReturnType<
      typeof calculateEic2026
    >).disposition,
    "filer_is_dependent",
  );
  assertEquals(noChild.pending.f8812.finalized_eic, 0);
});
