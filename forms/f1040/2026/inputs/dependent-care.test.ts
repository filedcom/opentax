import { DependentRelationship } from "../../nodes/inputs/general/filing/general/index.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { dependentCare2026 } from "../../nodes/config/2026-dependent-care.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateForm2441,
  calculateForm2441Benefits,
  careProviderSchema,
  type Form2441FilingDetails,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import { dependentCareClaim2026Schema } from "./dependent-care.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("2026 care rate matches every printed interval endpoint and next dollar", () => {
  for (
    const status of [
      FilingStatus.Single,
      FilingStatus.MFJ,
      FilingStatus.MFS,
      FilingStatus.HOH,
      FilingStatus.QSS,
    ]
  ) {
    assertEquals(dependentCare2026.creditRate(-10000, status), .5);
    for (let step = 0; step < 15; step++) {
      const boundary = 15000 + step * 2000;
      assertEquals(
        dependentCare2026.creditRate(boundary, status),
        (50 - step) / 100,
      );
      assertEquals(
        dependentCare2026.creditRate(boundary + 1, status),
        (49 - step) / 100,
      );
    }
    const start = status === FilingStatus.MFJ ? 150000 : 75000;
    const interval = status === FilingStatus.MFJ ? 4000 : 2000;
    for (let step = 0; step < 15; step++) {
      assertEquals(
        dependentCare2026.creditRate(start + step * interval, status),
        (35 - step) / 100,
      );
      assertEquals(
        dependentCare2026.creditRate(start + step * interval + 1, status),
        (34 - step) / 100,
      );
    }
    assertEquals(dependentCare2026.creditRate(1000000, status), .2);
  }
});
Deno.test("Shared care arithmetic preserves 2025 rules and applies the 2026 MFS exception", () => {
  const f = dependentCareFixture2026();
  const details: Form2441FilingDetails = {
    filing_status: FilingStatus.Single,
    care_providers: f.form2441.claim.providers.map((p) =>
      careProviderSchema.parse(p)
    ),
    qualifying_people: [{
      first_name: "Child",
      last_name: "Investor",
      name_control: "INVE",
      ssn: "222334444",
      credit_expenses_paid: 0,
    }],
    taxpayer_earned_income: 30000,
    spouse_earned_income: 30000,
    tax_liability_limit: 5000,
    dependent_care_plan_limit: 7500,
    total_qualified_expenses_incurred: 8000,
  };
  assertEquals(calculateForm2441Benefits(details, 8000).line25, 5000);
  assertEquals(
    calculateForm2441Benefits(details, 8000, dependentCare2026).line25,
    7500,
  );
  details.filing_status = FilingStatus.MFS;
  details.mfs_eligibility_met = false;
  details.mfs_line19_income = 30000;
  assertEquals(
    calculateForm2441Benefits(details, 8000, dependentCare2026).line25,
    3750,
  );
  details.mfs_eligibility_met = true;
  assertEquals(
    calculateForm2441Benefits(details, 8000, dependentCare2026).line25,
    7500,
  );
  details.filing_status = FilingStatus.Single;
  details.qualifying_people[0].credit_expenses_paid = 3000;
  assertEquals(calculateForm2441(details, 15000, 0).line11, 1050);
  assertEquals(
    calculateForm2441(details, 15000, 0, dependentCare2026).line11,
    1500,
  );
});
Deno.test("Care credit uses calculated AGI and reduces child-credit tax capacity", () => {
  const p = complete(dependentCareFixture2026(30000));
  const c = p.f2441.calculation_2026 as { lines: Record<string, number> };
  assertEquals(c.lines.line8, .42);
  assertEquals(c.lines.line9a, 1260);
  assertEquals(p.schedule3.line2_childcare_credit, 1260);
  assertEquals(p.f1040.line20_nonrefundable_credits, 1260);
  const child = p.f8812.calculation_2026 as { lines: Record<string, number> };
  assertEquals(
    child.lines.line13,
    Number(p.f1040.line18_total_tax_before_credits) - 1260,
  );
  assertEquals(
    Number(p.f1040.line19_child_tax_credit) +
      Number(p.f1040.line20_nonrefundable_credits),
    p.f1040.line18_total_tax_before_credits,
  );
  assert(Number(p.f1040.line28_actc) > 0);
});
Deno.test("Care benefits enter AGI before credit and never double count excluded expenses", () => {
  const p = complete(dependentCareFixture2026(50000, 9000, 9000));
  const c = p.f2441.calculation_2026 as { lines: Record<string, number> };
  assertEquals(c.lines.line25, 7500);
  assertEquals(c.lines.line26, 1500);
  assertEquals(p.f1040.line1e_taxable_dep_care, 1500);
  assertEquals(p.f1040.line11b_agi, 51500);
  assertEquals(c.lines.line4, 51500);
  assertEquals(c.lines.line18, 50000);
  assertEquals(c.lines.line30, 1500);
  assertEquals(c.lines.line11, 0);
  const input = dependentCareFixture2026(50000, 9000, 9000);
  input.form2441.claim.benefits!.w2_box10_reviews[0].amount_already_in_box1 =
    1500;
  const q = complete(input);
  const d = q.f2441.calculation_2026 as { lines: Record<string, number> };
  assertEquals(d.lines.line12, 7500);
  assertEquals(d.lines.line18, 50000);
  assertEquals(d.lines.line4, 50000);
  assertEquals(q.f1040.line1e_taxable_dep_care, 0);
  assertEquals(q.f1040.line11b_agi, 50000);
});
Deno.test("Care plan limits, forfeiture and carryover use actual employer plan records", () => {
  const input = dependentCareFixture2026(50000, 7500, 9000);
  const b = input.form2441.claim.benefits!;
  b.plan_maximum_exclusion = 5000;
  b.carryover_used_in_2026 = 200;
  b.forfeited_or_carried_to_2027 = 100;
  const c = complete(input).f2441.calculation_2026 as {
    lines: Record<string, number>;
  };
  assertEquals(c.lines.line15, 7600);
  assertEquals(c.lines.line21, 5000);
  assertEquals(c.lines.line26, 2600);
});
Deno.test("Care intake rejects unsupported arrangements and contradictory source facts", () => {
  for (
    const change of [
      (i: ReturnType<typeof dependentCareFixture2026>) => {
        i.form2441.claim.providers[0].household_employee = true;
      },
      (i: ReturnType<typeof dependentCareFixture2026>) => {
        i.form2441.claim.expenses.push(i.form2441.claim.expenses[0]);
      },
      (i: ReturnType<typeof dependentCareFixture2026>) => {
        i.form2441.claim.providers[0].amount_paid = 1;
      },
      (i: ReturnType<typeof dependentCareFixture2026>) => {
        i.general.dependents[0].dob = "2010-01-01";
      },
      (i: ReturnType<typeof dependentCareFixture2026>) => {
        i.form2441.claim.benefits!.w2_box10_reviews = [];
      },
    ]
  ) {
    const i = dependentCareFixture2026(50000, 1000);
    change(i);
    assert(run(i).diagnostics.length > 0);
  }
  const { form2441: _care, ...missing } = dependentCareFixture2026(50000, 1000);
  assert(
    run(missing).diagnostics.some((d) =>
      JSON.stringify(d).includes("source review")
    ),
  );
  const i = dependentCareFixture2026();
  assertThrows(() =>
    dependentCareClaim2026Schema.parse({ ...i.form2441, agi: 10, line11: 500 })
  );
  assertThrows(() =>
    dependentCareClaim2026Schema.parse({
      claim: {
        ...i.form2441.claim,
        prior_year_expenses: { kind: "paid_2025_in_2026", credit: 210 },
      },
    })
  );
});

Deno.test("Joint care credits use separate spouses' earnings and the two-child cap", () => {
  const base = dependentCareFixture2026(80000);
  const child = base.general.dependents[0];
  const spouseSsn = "444556666";
  const input = {
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: spouseSsn,
      spouse_first_name: "Joint",
      spouse_last_name: "Investor",
      spouse_dob: "1982-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      dependents: [child, { ...child, first_name: "Second", ssn: "222334445" }],
    },
    w2s: [base.w2s[0], {
      ...base.w2s[0],
      employee_ssn: spouseSsn,
      source_document_reference: "spouse-care-w2",
      employer_ein: "120000044",
      box1_wages: 1000,
      box2_fed_withheld: 0,
      box3_ss_wages: 1000,
      box4_ss_withheld: 62,
      box5_medicare_wages: 1000,
      box6_medicare_withheld: 14.5,
    }],
  };
  // Both children qualify even though all expenses are for the first child.
  input.form2441.claim.qualifying_people.push({
    ...input.form2441.claim.qualifying_people[0],
    tin: "222334445",
  });
  const c = complete(input).f2441.calculation_2026 as {
    lines: Record<string, number>;
  };
  assertEquals(c.lines.line3, 6000);
  assertEquals(c.lines.line4, 80000);
  assertEquals(c.lines.line5, 1000);
  assertEquals(c.lines.line8, .35);
  assertEquals(c.lines.line11, 350);
  input.w2s[1].box1_wages = 0;
  assertEquals(
    (complete(input).f2441.calculation_2026 as {
      lines: Record<string, number>;
    }).lines.line11,
    0,
  );
});

Deno.test("Care expenses cannot bypass the tax limit or claim excluded benefits twice", () => {
  const zero = complete(dependentCareFixture2026(10000));
  const z = zero.f2441.calculation_2026 as {
    lines: Record<string, number>;
    file_form2441: boolean;
  };
  assertEquals(z.lines.line9a, 1500);
  assertEquals(z.lines.line11, 0);
  assertEquals(z.file_form2441, false);
  const i = dependentCareFixture2026(50000, 2000, 6000);
  const b = complete(i).f2441.calculation_2026 as {
    lines: Record<string, number>;
  };
  assertEquals(b.lines.line28, 2000);
  assertEquals(b.lines.line30, 4000);
  assertEquals(b.lines.line3, 1000);
  assertEquals(b.lines.line11, 350);
  i.form2441.claim.benefits!.carryover_used_in_2026 = 1000;
  i.form2441.claim.benefits!.forfeited_or_carried_to_2027 = 2500;
  assert(
    run(i).diagnostics.some((d) =>
      JSON.stringify(d).includes("included on line 12")
    ),
  );
});

Deno.test("Care eligibility rejects contradictory dependent and provider identities", () => {
  const unrelated = dependentCareFixture2026();
  unrelated.general.dependents[0].relationship = DependentRelationship.Other;
  assert(run(unrelated).diagnostics.length > 0);
  const elsewhere = dependentCareFixture2026();
  const otherReturn = {
    ...elsewhere,
    general: {
      ...elsewhere.general,
      dependents: elsewhere.general.dependents.map((d) => ({
        ...d,
        dependent_on_another_return: true,
      })),
    },
  };
  assert(run(otherReturn).diagnostics.length > 0);
  const family = dependentCareFixture2026();
  family.form2441.claim.providers[0] = {
    kind: "person",
    first_name: "Child1",
    last_name: "Investor",
    name_control: "INVE",
    ssn: family.general.dependents[0].ssn,
    us_address:
      careProviderSchema.parse(family.form2441.claim.providers[0]).us_address,
    amount_paid: 6000,
    household_employee: false,
  };
  assert(
    run(family).diagnostics.some((d) =>
      JSON.stringify(d).includes("listed dependent")
    ),
  );
});
