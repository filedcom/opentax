import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { separateCareFixture2026 } from "./dependent-care-mfs.fixture.ts";
import { priorCareFixture2026 } from "./dependent-care-prior.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    care: r.pending.f2441.calculation_2026 as ReturnType<
      typeof calculateCareCredit2026
    >,
  };
}
Deno.test("Considered-unmarried care uses own earnings and full benefit limit without changing MFS filing status", () => {
  const { care, p } = complete(separateCareFixture2026());
  assertEquals(care.lines!.line19, 50000);
  assertEquals(care.lines!.line21, 7500);
  assertEquals(care.lines!.line25, 2000);
  assertEquals(care.lines!.line9a, 350);
  assertEquals(care.lines!.line11, 350);
  assertEquals(care.check_line_a, true);
  assertEquals(p.f1040.filing_status, FilingStatus.MFS);
  assertEquals(p.schedule3.line2_childcare_credit, 350);
  const high = complete(separateCareFixture2026(true, 9000, 9000));
  assertEquals(high.care.lines!.line25, 7500);
  assertEquals(high.p.f1040.line1e_taxable_dep_care, 1500);
});
Deno.test("Ordinary MFS care excludes at most 3750 and never grants current care credit", () => {
  const { care, p } = complete(separateCareFixture2026(false, 6000, 6000));
  assertEquals(care.lines!.line21, 3750);
  assertEquals(care.lines!.line25, 3750);
  assertEquals(care.lines!.line26, 2250);
  assertEquals(care.lines!.line9a, 0);
  assertEquals(care.lines!.line11, 0);
  assertEquals(care.check_line_a, false);
  assertEquals(p.f1040.line11b_agi, 52250);
  assertEquals(p.schedule3.line2_childcare_credit, 0);
  assertEquals(p.f1040.line1a_wages, 50000);
  assertEquals(p.f1040.line25a_w2_withheld, 30000);
  assertEquals(
    complete(separateCareFixture2026(false, 0)).care.file_form2441,
    false,
  );
});
Deno.test("External spouse wages constrain only the benefit worksheet, including reviewed zero earnings", () => {
  const low = complete(separateCareFixture2026(false, 6000, 6000, 2000));
  assertEquals(low.care.lines!.line19, 2000);
  assertEquals(low.care.lines!.line25, 2000);
  assertEquals(low.p.f1040.line11b_agi, 54000);
  const zero = complete(separateCareFixture2026(false, 6000, 6000, 0));
  assertEquals(zero.care.lines!.line19, 0);
  assertEquals(zero.care.lines!.line25, 0);
  assertEquals(zero.p.f1040.line11b_agi, 56000);
});
Deno.test("MFS without current eligibility still claims eligible prior-year care and checks line A", () => {
  const f = separateCareFixture2026(false, 0);
  const prior = priorCareFixture2026(true).form2441.claim.prior_year_expenses;
  prior.prior_return.filing_status = FilingStatus.MFS;
  prior.prior_return.form2441_line_a_considered_unmarried = true;
  f.form2441.claim.prior_year_expenses = prior;
  f.form2441.claim.qualifying_people = [];
  f.form2441.claim.expenses = [];
  f.form2441.claim.providers[0].amount_paid = 600;
  const { care, p } = complete(f);
  assertEquals(care.lines!.line9a, 0);
  assertEquals(care.lines!.line9b, 210);
  assertEquals(care.lines!.line9c, 210);
  assertEquals(care.lines!.line11, 210);
  assertEquals(care.check_line_a, true);
  assertEquals(care.current_credit_eligible, false);
  assertEquals(p.schedule3.line2_childcare_credit, 210);
  prior.prior_return.form2441_line_a_considered_unmarried = false;
  assert(run(f).diagnostics.length > 0);
});
Deno.test("MFS source review rejects home costs, spouse calendars and qualifying-home contradictions", () => {
  type F = ReturnType<typeof separateCareFixture2026>;
  for (
    const change of [
      (f: F) => {
        const r = f.form2441.claim.mfs_review;
        assert(r.kind === "considered_unmarried");
        r.taxpayer_paid_home_costs = 10000;
      },
      (f: F) => {
        const r = f.form2441.claim.mfs_review;
        assert(r.kind === "considered_unmarried");
        r.taxpayer_paid_home_costs = 20001;
      },
      (f: F) => {
        const r = f.form2441.claim.mfs_review;
        assert(r.kind === "considered_unmarried");
        r.spouse_home_periods[0].through = "2026-07-01";
      },
      (f: F) => {
        const r = f.form2441.claim.mfs_review;
        assert(r.kind === "considered_unmarried");
        r.spouse_home_periods.push(r.spouse_home_periods[0]);
      },
      (f: F) => {
        f.general.mfs_spouse_lived_with_taxpayer = false;
      },
      (f: F) => {
        const r = f.form2441.claim.mfs_review;
        assert(r.kind === "considered_unmarried");
        r.qualifying_person_tin = "999887777";
      },
      (f: F) => {
        f.form2441.claim.mfs_review = { kind: "not_mfs" };
      },
    ]
  ) {
    const f = separateCareFixture2026();
    change(f);
    assert(run(f).diagnostics.length > 0);
  }
  const wrong = dependentCareFixture2026();
  wrong.form2441.claim.mfs_review =
    separateCareFixture2026().form2441.claim.mfs_review;
  assert(run(wrong).diagnostics.length > 0);
  const noHome = separateCareFixture2026(false);
  assert(noHome.form2441.claim.mfs_review.kind === "not_considered_unmarried");
  noHome.form2441.claim.mfs_review.reason = {
    kind: "no_qualifying_main_home",
    record_reference: "home-review",
  };
  assert(run(noHome).diagnostics.length > 0);
});
Deno.test("External spouse W-2 identity, duplication and unsupported benefit earnings cannot bypass reconciliation", () => {
  for (
    const kind of [
      "wrong_owner",
      "duplicate",
      "benefits",
      "statutory",
      "credit_election",
      "false_residence",
    ] as const
  ) {
    const f = separateCareFixture2026(false), r = f.form2441.claim.mfs_review;
    assert(r.kind === "not_considered_unmarried");
    if (kind === "wrong_owner") {
      r.spouse_w2s[0].employee_ssn = f.general.taxpayer_ssn;
    }
    if (kind === "duplicate") r.spouse_w2s.push(r.spouse_w2s[0]);
    if (kind === "benefits") r.spouse_w2s[0].box10_dep_care = 1000;
    if (kind === "statutory") r.spouse_w2s[0].box13_statutory_employee = true;
    if (kind === "credit_election") {
      f.form2441.claim.combat_pay_elections.credit.spouse = true;
    }
    if (kind === "false_residence") {
      f.general.mfs_spouse_lived_with_taxpayer = false;
    }
    assert(run(f).diagnostics.length > 0, kind);
  }
});
Deno.test("Separate spouse independently elects combat pay for benefits without importing it into AGI", () => {
  const f = separateCareFixture2026(false, 6000, 6000, 1000),
    r = f.form2441.claim.mfs_review;
  assert(r.kind === "not_considered_unmarried");
  r.spouse_w2s[0].box12_entries = [{ code: Box12Code.Q, amount: 2000 }];
  assertEquals(complete(f).care.lines!.line25, 1000);
  f.form2441.claim.combat_pay_elections.benefits.spouse = true;
  const { care, p } = complete(f);
  assertEquals(care.lines!.line19, 3000);
  assertEquals(care.lines!.line25, 3000);
  assertEquals(p.f1040.line11b_agi, 53000);
  assertEquals(p.f1040.line1i_combat_pay ?? 0, 0);
});

Deno.test("MFS disabled spouse uses separate income records and monthly deemed earnings for benefits", async () => {
  const { separateDisabledSpouseFixture2026 } = await import(
    "./dependent-care-mfs.fixture.ts"
  );
  const f = await separateDisabledSpouseFixture2026();
  const { care, p } = complete(f);
  assertEquals(care.lines!.line19, 3300);
  assertEquals(care.lines!.line25, 3300);
  assertEquals(care.lines!.line26, 2700);
  assertEquals(care.lines!.line9a, 0);
  assertEquals(
    care.benefit.details!.student_or_disabled_deemed_income_used,
    true,
  );
  assertEquals(p.f1040.line1a_wages, 50000);
  assertEquals(p.f1040.line11b_agi, 52700);
  assertEquals(p.f1040.line25a_w2_withheld, 30000);
  const ledger = f.form2441.claim.earned_income;
  assert(ledger.method === "monthly");
  ledger.spouse!.months[4].w2_wages = 401;
  assert(run(f).diagnostics.length > 0);
});
Deno.test("MFS home-cost noneligibility is derived from payment evidence", () => {
  const f = separateCareFixture2026(false), r = f.form2441.claim.mfs_review;
  assert(r.kind === "not_considered_unmarried");
  f.general.mfs_spouse_lived_with_taxpayer = false;
  r.reason = {
    kind: "home_costs_not_over_half",
    record_reference: "home-cost-ledger",
    total_home_costs: 20000,
    taxpayer_paid_home_costs: 10000,
  };
  assertEquals(complete(f).care.lines!.line21, 3750);
  r.reason.taxpayer_paid_home_costs = 10001;
  assert(run(f).diagnostics.length > 0);
});
