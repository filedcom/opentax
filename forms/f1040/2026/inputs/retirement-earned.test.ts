import { assertEquals, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateForm8959_2026 } from "../nodes/form8959.ts";
import { calculateChildCredit2026 } from "../nodes/f8812.ts";
import { calculateEic2026 } from "../nodes/eitc.ts";
import { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { calculateDependentCareBenefits2026 } from "./dependent-care.ts";
import {
  disabilityBusinessCareGraph2026,
  disabilityCareGraph2026,
  disabilityForFiler2026,
  disabilityMovingGraph2026,
  disabilityWageGraph2026,
  jointDisabilityCareGraph2026,
  monthlyDisabilityCareGraph2026,
} from "./retirement-earned.fixture.ts";
import { retirementCreditWages2026 } from "./retirement-earned.ts";
import { agi_2026, inputSchema as agiSchema } from "../nodes/agi.ts";
import { childTaxFixture2026 } from "./child-tax.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import { resolveChildTax2026 } from "./child-tax.ts";

Deno.test("2026 dependent deduction and child-tax screening separate disability wages from pension income", async () => {
  const f = childTaxFixture2026(1000, 5000);
  const s = disabilityForFiler2026(
    f.general.taxpayer_ssn,
    f.general.taxpayer_dob,
  );
  const r = await executeDraftSources2026({ ...f, f1099r: { claim: s.claim } });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line12e_standard_or_itemized, 8451);
  const child = r.pending.f8615.calculation_2026 as ReturnType<
    typeof resolveChildTax2026
  >;
  assertEquals(child.eligibility?.earned_income_for_support, 8001);
  assertEquals(child.eligibility?.gross_unearned_income, 8000);
});

Deno.test("2026 under-24 education review uses disability wages and excludes post-retirement pension", async () => {
  const f = educationFixture2026("aotc", 7000);
  f.general.taxpayer_dob = "2005-06-01";
  f.f8863.claim.refundable_review = {
    kind: "under24_nonjoint",
    record_reference: "support-review",
    at_least_one_parent_alive: true,
    full_time_student_months: [1, 2, 3, 4, 5],
    enrollment_record_reference: "enrollment",
    complete_support_inventory: true,
    support_records: [{
      record_reference: "annual-support",
      amount: 28003,
      payer: "parent",
      category: "housing",
    }],
  };
  const s = disabilityForFiler2026(
    f.general.taxpayer_ssn,
    f.general.taxpayer_dob,
  );
  const child = childTaxFixture2026().f8615;
  child.claim!.support_records[0].amount = 28003;
  const r = await executeDraftSources2026({
    ...f,
    f8615: child,
    f1099r: { claim: s.claim },
  });
  assertEquals(r.diagnostics, []);
  const education = r.pending.f8863.calculation_2026 as ReturnType<
    typeof calculateEducationCredit2026
  >;
  assertEquals(
    education.earned_income_workpaper?.earned_income_for_support,
    14001,
  );
  assertEquals(education.lines?.line8, 0);
});

Deno.test("2026 disability and moving components share line 1h without overwriting or rounding disability twice", async () => {
  const r = await executeDraftSources2026(disabilityMovingGraph2026());
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line1h_other_earned, 7957);
  assertEquals(r.pending.f1040.line1z_total_wages, 57957);
  assertEquals(r.pending.f1040.line11b_agi, 60957);
  const agi = agiSchema.parse(r.pending.agi_aggregator);
  assertThrows(
    () =>
      agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
        ...agi,
        moving_sources_2026: undefined,
      }),
    Error,
    "line 1h",
  );
});

Deno.test("2026 business and disability earnings reach EIC and care once with the Schedule SE deduction", async () => {
  const r = await executeDraftSources2026(disabilityBusinessCareGraph2026());
  assertEquals(r.diagnostics, []);
  const e = r.pending.eitc.calculation_2026 as ReturnType<
    typeof calculateEic2026
  >;
  const c = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(e.earned_income_for_eic, 26294);
  assertEquals(c.lines?.line4, 26294);
  assertEquals(c.benefit.expected_wage_income, 17001);
  assertEquals(r.pending.f1040.line11b_agi, 29294);
});

Deno.test("2026 joint care allocates disability wages to the receiving spouse and checks both identities", async () => {
  const r = await executeDraftSources2026(jointDisabilityCareGraph2026());
  assertEquals(r.diagnostics, []);
  const c = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(c.lines?.line4, 50000);
  assertEquals(c.lines?.line5, 7801);
  assertEquals(c.benefit.expected_wage_income, 57801);
  const s = c.benefit.retirement_earned_income_workpaper!;
  assertEquals(s.owners.map((o) => o.wages), [0, 7000.5]);
  for (
    const patch of [{ spouse_ssn: "555667777" }, { spouse_dob: "1970-06-15" }, {
      taxpayer_dob: "1970-06-15",
    }]
  ) {
    assertThrows(
      () =>
        retirementCreditWages2026(
          s.source_input,
          s.source_input.filing_status,
          { ...s.source_input, ...patch },
        ),
      Error,
      "owners and birth dates",
    );
  }
});

Deno.test("2026 disability wages count once for EIC and child credits without increasing W-2 payroll wages", async () => {
  const f = disabilityWageGraph2026(), r = await executeDraftSources2026(f);
  assertEquals(r.diagnostics, []);
  const p = r.pending;
  assertEquals(p.f1040.line1a_wages, 10000);
  assertEquals(p.f1040.line1h_other_earned, 7001);
  assertEquals(p.f1040.line1z_total_wages, 17001);
  assertEquals(p.f1040.line5b_pension_taxable, 3000);
  assertEquals(p.f1040.line11b_agi, 20001);
  const e = p.eitc.calculation_2026 as ReturnType<typeof calculateEic2026>;
  assertEquals(e.earned_income_for_eic, 17001);
  assertEquals(e.retirement_earned_income_workpaper?.wages, 7000.5);
  assertEquals(e.credit_amount, 4427);
  assertEquals(p.eitc.wage_income_from_agi, 17001);
  assertEquals(p.f8812.wage_income_from_agi, 17001);
  assertEquals(
    (p.form8959.calculation_2026 as ReturnType<typeof calculateForm8959_2026>)
      .lines.line1,
    10000,
  );
});
Deno.test("2026 three-child ACTC payroll alternative includes only actual W-2 withholding", async () => {
  const r = await executeDraftSources2026(disabilityWageGraph2026(1000, 3));
  assertEquals(r.diagnostics, []);
  const child = r.pending.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(child.earned_income_worksheet?.form1040_line1z_wages, 8001);
  assertEquals(child.lines?.partIIBLines?.line21, 77);
});
Deno.test("2026 EIC disability review rejects missing, contradictory and wrong-owner retirement evidence", async () => {
  const r = await executeDraftSources2026(disabilityWageGraph2026());
  assertEquals(r.diagnostics, []);
  const e =
    (r.pending.eitc.calculation_2026 as ReturnType<typeof calculateEic2026>)
      .source_input;
  for (
    const patch of [
      { retirement_inventory_reference: "other-inventory" },
      { retirement_inventory_reference: undefined },
      { no_retirement_disability_inmate_or_workfare_wages: true },
      { no_inmate_or_workfare_wages: undefined },
      { taxpayer_ssn: "555667777" },
      { wage_income_from_agi: 7000 },
    ]
  ) assertThrows(() => calculateEic2026({ ...e, ...patch } as typeof e));
  const agi = agiSchema.parse(r.pending.agi_aggregator);
  assertThrows(
    () =>
      agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
        ...agi,
        line1h_other_earned: 7000,
      }),
    Error,
    "line 1h",
  );
});
Deno.test("2026 care annual earnings include disability wages but exclude pension payments", async () => {
  const r = await executeDraftSources2026(disabilityCareGraph2026());
  assertEquals(r.diagnostics, []);
  const c = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(c.lines?.line4, 57001);
  assertEquals(c.benefit.expected_wage_income, 57001);
  assertEquals(
    c.benefit.retirement_earned_income_workpaper?.owners[0].wages_by_month
      .slice(4, 6),
    [3500.25, 3500.25],
  );
  const bad = structuredClone(c.source_input);
  bad.benefit_source.claim!.ordinary_w2_earnings_only = true;
  assertThrows(() => calculateCareCredit2026(bad), Error, "W-2-only");
  const mismatch = structuredClone(c.source_input);
  mismatch.retirement_sources_2026!.claim.record_reference = "other";
  assertThrows(
    () => calculateCareCredit2026(mismatch),
    Error,
    "same retirement",
  );
  const method = structuredClone(c.source_input.benefit_source);
  method.claim!.earned_income = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  assertThrows(
    () => calculateDependentCareBenefits2026(method),
    Error,
    "annual income method",
  );
});
Deno.test("2026 monthly care uses dated disability wages before student floors and taxable-benefit allocation", async () => {
  const r = await executeDraftSources2026(monthlyDisabilityCareGraph2026());
  assertEquals(r.diagnostics, []);
  const c = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(c.lines?.line18, 1450);
  assertEquals(c.lines?.line25, 1450);
  assertEquals(c.lines?.line26, 550);
  assertEquals(c.lines?.line4, 2000);
  assertEquals(c.benefit.expected_wage_income, 850);
  assertEquals(
    c.benefit.earned_income_worksheets?.benefits.monthly?.[4].taxpayer_actual,
    100,
  );
  assertEquals(
    c.benefit.earned_income_worksheets?.benefits.monthly?.[5].taxpayer_actual,
    200,
  );
  assertEquals(
    c.benefit.earned_income_worksheets?.credit.monthly?.[5].taxpayer_actual,
    750,
  );
  assertEquals(r.pending.f1040.line1h_other_earned, 300);
  assertEquals(r.pending.f1040.line1e_taxable_dep_care, 550);
  assertEquals(r.pending.f1040.line5b_pension_taxable, 500);
  assertEquals(r.pending.f1040.line11b_agi, 1350);
});
