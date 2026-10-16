import { assert, assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
} from "../nodes/f8812.ts";
import {
  energyClaimFixture2026,
  energyGraphFixture2026,
} from "./energy.fixture.ts";
import {
  calculateEnergyCarryforward2026,
  reconcileEnergySource2026,
} from "./energy-source.ts";
import { FilingStatus } from "../../nodes/types.ts";

function source(): ChildCreditInput2026 {
  return {
    ...energyGraphFixture2026().f8812,
    taxpayer_ssn: "123456789",
    auto_filing_status: FilingStatus.Single,
    auto_qualifying_children: 1,
    auto_other_dependents: 0,
    auto_agi: 50000,
    auto_income_tax_liability: 4000,
    wage_income_from_agi: 50000,
    unsupported_earned_income_activity: false,
    energy_sources_2026: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "123456789",
      ...energyClaimFixture2026(),
    },
  };
}
function run(raw: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    raw,
    { taxYear: 2026, formType: "f1040" },
  );
}
Deno.test("2026 energy carryforward resolves Worksheet B before the final CTC and ACTC", () => {
  const r = calculateChildCredit2026(source());
  assertEquals(r.credit_limit_worksheet_b?.line14, 500);
  assertEquals(r.credit_limit_worksheet_b?.line15, 3500);
  assertEquals(r.energy_credit?.lines, {
    line1: 8000,
    line2: 3500,
    line3: 3500,
    line4: 4500,
  });
  assertEquals(r.lines?.line14, 500);
  assertEquals(r.lines?.line27, 1700);
  assertEquals(r.lines?.worksheetBLine14, 500);
  assertEquals(r.energy_credit?.carryforward_2027.amount, 4500);
  const limited = source();
  limited.energy_sources_2026!.claim.prior_return.line13_available_credit =
    2000;
  limited.energy_sources_2026!.claim.prior_return.line16_carryforward = 1000;
  const small = calculateChildCredit2026(limited);
  assertEquals(small.lines?.line14, 2200);
  assertEquals(small.lines?.line27, 0);
  assertEquals(small.energy_credit?.lines.line4, 0);
});
Deno.test("2026 energy keeps the full carryforward with zero tax and gives ODC its usual priority", () => {
  for (
    const [children, others, agi, tax, expected] of [
      [0, 0, 50000, 4000, 4000],
      [0, 1, 50000, 4000, 3500],
      [1, 0, 250000, 4000, 4000],
      [1, 0, 50000, 0, 0],
    ]
  ) {
    const r = calculateChildCredit2026({
      ...source(),
      auto_qualifying_children: children,
      auto_other_dependents: others,
      auto_agi: agi,
      auto_income_tax_liability: tax,
    });
    assertEquals(r.energy_credit?.lines.line3, expected);
    assertEquals(r.energy_credit?.lines.line4, 8000 - expected);
    assert(r.energy_credit?.file_form5695);
    if (children === 0 || agi === 250000) {
      assertEquals(r.credit_limit_worksheet_b, undefined);
    }
  }
});
Deno.test("2026 energy subtracts care and education, uses AMT, and honors ACTC opt-out", () => {
  const r = calculateChildCredit2026({
    ...source(),
    finalized_dependent_care_credit: 300,
    finalized_education_credit: 1500,
    schedule2_part1_tax: 1000,
    do_not_claim_actc: true,
  });
  assertEquals(r.energy_credit?.tax_limit_worksheet, {
    line1: 5000,
    earlier_credits: 1800,
    child_credit_reserved: 500,
    line2: 2300,
    line3: 2700,
  });
  assertEquals(r.lines?.line14, 500);
  assertEquals(r.lines?.line27, 0);
});
Deno.test("2026 Worksheet B uses payroll, EIC and excess withholding with three children", () => {
  const input: ChildCreditInput2026 = {
    ...source(),
    auto_qualifying_children: 3,
    wage_income_from_agi: 10000,
    finalized_eic: 1000,
    finalized_excess_social_security: 100,
    excess_social_security_from_w2: 100,
    payroll_sources_2026: [{
      source_reference: "w2",
      social_security_withheld: 4000,
      medicare_withheld: 500,
      rrta: false,
    }],
    medicare_payroll_2026: {
      wage_tax: 20,
      additional_wage_withheld: 10,
      has_rrta_or_self_employment: false,
    },
    schedule2_line16c: 200,
    schedule2_line17c: 300,
  };
  const r = calculateChildCredit2026(input), w = r.credit_limit_worksheet_b!;
  assertEquals([
    w.line5,
    w.line7,
    w.line8,
    w.line9,
    w.line10,
    w.line11,
    w.line13,
    w.line14,
    w.line15,
  ], [1125, 4510, 500, 5010, 1100, 3910, 3910, 2690, 1310]);
  assertEquals(r.lines?.line14, 2690);
  assertEquals(r.lines?.line27, 3910);
  const { finalized_eic: _eic, ...missing } = input;
  assertThrows(
    () => calculateChildCredit2026(missing),
    Error,
    "needs finalized EIC",
  );
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...input,
        payroll_sources_2026: [{ source_reference: "w2", rrta: false }],
      }),
    Error,
    "actual W-2 boxes 4 and 6",
  );
});
Deno.test("2026 Worksheet B rounds its earned method before the payroll branch decision", () => {
  const r = calculateChildCredit2026({
    ...source(),
    auto_qualifying_children: 3,
    wage_income_from_agi: 46499,
    auto_income_tax_liability: 10000,
  });
  assertEquals(r.credit_limit_worksheet_b?.line5, 6600);
  assertEquals(r.credit_limit_worksheet_b?.usesPayrollBranch, false);
  assertEquals(r.energy_credit?.lines.line3, 8000);
  assertEquals(r.lines?.line14, 2000);
  assertEquals(r.lines?.line27, 4600);
});
Deno.test("2026 carryforward reconciles prior lines, joint owners and rejects changed ownership", () => {
  const raw = source().energy_sources_2026!;
  assertThrows(
    () =>
      reconcileEnergySource2026({
        ...raw,
        claim: {
          ...raw.claim,
          prior_return: {
            ...raw.claim.prior_return,
            line16_carryforward: 7999,
          },
        },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () => reconcileEnergySource2026({ ...raw, taxpayer_ssn: "987654321" }),
    Error,
    "ownership changed",
  );
  const joint = {
    ...raw,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "987654321",
    claim: {
      ...raw.claim,
      prior_return: {
        ...raw.claim.prior_return,
        filing_status: FilingStatus.MFJ,
        spouse_ssn: "987654321",
      },
    },
  };
  assertEquals(
    reconcileEnergySource2026(joint).claim.prior_return.line16_carryforward,
    8000,
  );
  assertEquals(
    reconcileEnergySource2026({
      ...joint,
      taxpayer_ssn: "987654321",
      spouse_ssn: "123456789",
    }).claim.prior_return.line16_carryforward,
    8000,
  );
  assertThrows(
    () => reconcileEnergySource2026({ ...joint, spouse_ssn: "123456789" }),
    Error,
    "distinct joint-return owners",
  );
  assertThrows(
    () => calculateChildCredit2026({ ...source(), taxpayer_ssn: "987654321" }),
    Error,
    "current return owner",
  );
  assertThrows(() => calculateEnergyCarryforward2026(raw, 1.5, 0, 0));
});
Deno.test("2026 energy source cannot accept current expenditures, tax overrides or contradictory inventories", () => {
  const base = energyGraphFixture2026();
  for (
    const injected of [{ solar_electric_cost: 10000 }, {
      part_i_tax_limit: 9000,
    }, { line3: 9000 }]
  ) {
    assertEquals(
      sourceRegistry2026.start.inputSchema.safeParse({
        ...base,
        f5695: { ...base.f5695, ...injected },
      }).success,
      false,
    );
  }
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...source(),
        no_nonrefundable_credits_other_than_dependent_care_and_education: true,
      }),
    Error,
    "contradictory no-energy",
  );
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...source(),
        energy_inventory_reference: "wrong",
      }),
    Error,
    "matching energy inventory",
  );
  assertThrows(
    () =>
      calculateChildCredit2026({ ...source(), energy_sources_2026: undefined }),
    Error,
    "nonrefundable-credit inventory",
  );
});
Deno.test("2026 registered energy graph finalizes Schedule 3 once after resolving child credits", () => {
  for (const children of [0, 1, 3]) {
    const r = run(energyGraphFixture2026(50000, children));
    assertEquals(r.diagnostics, []);
    const p = r.pending,
      c = p.f8812.calculation_2026 as ReturnType<
        typeof calculateChildCredit2026
      >;
    assertEquals(
      p.schedule3_final.line5a_residential_clean_energy,
      c.energy_credit!.lines.line3,
    );
    assertEquals(
      p.f1040.line20_nonrefundable_credits,
      c.energy_credit!.lines.line3,
    );
    assertEquals(p.f1040.line19_child_tax_credit, c.lines?.line14 ?? 0);
    assertEquals(p.f1040.line28_actc, c.lines?.line27 ?? 0);
    assertEquals(p.f1040.line22_tax_after_credits, 0);
  }
});
