import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { priorCareFixture2026 } from "./dependent-care-prior.fixture.ts";
import { calculatePriorCareCredit2026 } from "./dependent-care-prior.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import {
  calculateForm2441,
  careProviderSchema,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import { dependentCare2026 } from "../../nodes/config/2026-dependent-care.ts";
import { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { FilingStatus } from "../../nodes/types.ts";

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
const worksheet = (f: ReturnType<typeof priorCareFixture2026>) =>
  calculatePriorCareCredit2026(
    f.form2441.claim.prior_year_expenses,
    f.general,
    f.form2441.claim.providers,
  )!;

Deno.test("Prior care worksheet reuses 2025 rates and reconciles every printed line", () => {
  const f = priorCareFixture2026();
  assertEquals(worksheet(f).lines, {
    line1: 2000,
    line2: 600,
    line3: 2600,
    line4: 3000,
    line5: 0,
    line6: 3000,
    line7: 15000,
    line8: 2600,
    line9: 2000,
    line10: 600,
    line11: 15000,
    line12: .35,
    line13: 210,
  });
  const p = f.form2441.claim.prior_year_expenses.prior_return;
  for (let step = 0; step < 15; step++) {
    p.form1040_line11a_agi = 15000 + step * 2000;
    assertEquals(worksheet(f).lines.line12, (35 - step) / 100);
    p.form1040_line11a_agi++;
    assertEquals(worksheet(f).lines.line12, (34 - step) / 100);
  }
  p.form1040_line11a_agi = 1000000;
  assertEquals(worksheet(f).lines.line13, 120);
});

Deno.test("Prior care cap, income, benefits and exhausted limits follow Worksheet A", () => {
  const f = priorCareFixture2026(),
    p = f.form2441.claim.prior_year_expenses.prior_return;
  p.form2441_line3_expenses = p.form2441_line6_credit_expenses = 2900;
  assertEquals(worksheet(f).lines.line13, 35);
  p.form2441_line3_expenses = p.form2441_line6_credit_expenses = 3000;
  assertEquals(worksheet(f).lines.line13, 0);
  p.form2441_line3_expenses = p.form2441_line6_credit_expenses = 2000;
  p.form2441_line4_earned_income = p.form2441_line5_earned_income = 2200;
  assertEquals(worksheet(f).lines.line13, 70);
  p.form2441_line25_excluded_benefits = 900;
  assertEquals(worksheet(f).lines.line13, 35);
  p.form2441_line3_expenses = p.form2441_line6_credit_expenses = 0;
  p.form2441_line25_excluded_benefits = 5000;
  assertEquals(worksheet(f).lines.line6, -2000);
  assertEquals(worksheet(f).lines.line10, -2000);
  assertEquals(worksheet(f).lines.line13, 0);
  p.qualifying_people.push({ ...p.qualifying_people[0], ssn: "222334445" });
  p.form2441_line25_excluded_benefits = 0;
  assertEquals(worksheet(f).lines.line4, 6000);
  assertEquals(worksheet(f).lines.line13, 210);
});

Deno.test("Current and prior care combine once before tax limit and child credit", () => {
  const p = complete(priorCareFixture2026());
  const r = p.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(r.lines!.line9a, 1050);
  assertEquals(r.lines!.line9b, 210);
  assertEquals(r.lines!.line9c, 1260);
  assertEquals(p.schedule3.line2_childcare_credit, 1260);
  assertEquals(p.f1040.line20_nonrefundable_credits, 1260);
  const child = p.f8812.calculation_2026 as { lines: Record<string, number> };
  assertEquals(
    child.lines.line13,
    Number(p.f1040.line18_total_tax_before_credits) - 1260,
  );
  const limited = calculateCareCredit2026({
    ...r.source_input,
    regular_tax: 100,
    schedule2_part1_tax: 0,
  });
  assertEquals(limited.lines!.line11, 100);
  const zero = calculateCareCredit2026({
    ...r.source_input,
    regular_tax: 0,
    schedule2_part1_tax: 0,
  });
  assertEquals(zero.lines!.line11, 0);
  assertEquals(zero.file_form2441, false);
});

Deno.test("Prior-only care needs no current qualifying person or fabricated current expense", () => {
  const p = complete(priorCareFixture2026(true));
  const r = p.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(r.benefit.details!.qualifying_people, []);
  assertEquals(r.lines!.line27, 0);
  assertEquals(r.lines!.line3, 0);
  assertEquals(r.lines!.line9a, 0);
  assertEquals(r.lines!.line11, 210);
  assertEquals(r.file_form2441, true);
  assertEquals(r.part3, false);
  // Default 2025 contract remains strict; only 2026 opts into zero current people.
  const legacy = {
    ...r.benefit.details!,
    care_providers: priorCareFixture2026(true).form2441.claim.providers.map((
      p,
    ) => careProviderSchema.parse(p)),
  };
  assertThrows(() => calculateForm2441(legacy, 50000, 0));
  assertEquals(
    calculateForm2441(legacy, 50000, 0, dependentCare2026).line11,
    0,
  );
});

Deno.test("Full current benefit exclusion does not erase the prior expense credit", () => {
  const f = dependentCareFixture2026(50000, 7500, 9000);
  f.form2441.claim.prior_year_expenses =
    priorCareFixture2026().form2441.claim.prior_year_expenses;
  f.form2441.claim.providers[0].amount_paid += 600;
  const p = complete(f);
  const r = p.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  assertEquals(r.lines!.line25, 7500);
  assertEquals(r.lines!.line9a, 0);
  assertEquals(r.lines!.line9b, 210);
  assertEquals(r.lines!.line11, 210);
  assertEquals(p.f1040.line1e_taxable_dep_care, 0);
});

Deno.test("Prior care rejects inconsistent sources and cross-year double counting", () => {
  type Fixture = ReturnType<typeof priorCareFixture2026>;
  const changes: ((f: Fixture) => void)[] = [
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return.taxpayer_ssn =
        "999887777";
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return.filing_status =
        FilingStatus.MFJ;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return.filing_status =
        FilingStatus.MFS;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return
        .form2441_line5_earned_income = 1;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return
        .form2441_line6_credit_expenses = 700;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return
        .form2441_line3_expenses = 4000;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments[0].provider_index = 1;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments[0].person_ssn = "999887777";
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments[0].incurred_start_date =
        "2026-01-01";
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments[0].incurred_end_date =
        "2025-01-01";
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments[0].paid_date = "2025-12-31";
    },
    (f) => {
      f.form2441.claim.providers[0].amount_paid = 6000;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.payments.push(
        f.form2441.claim.prior_year_expenses.payments[0],
      );
    },
    (f) => {
      f.form2441.claim.expenses[0].receipt_reference =
        f.form2441.claim.prior_year_expenses.payments[0].receipt_reference;
    },
    (f) => {
      f.form2441.claim.prior_year_expenses.prior_return.qualifying_people.push(
        f.form2441.claim.prior_year_expenses.prior_return.qualifying_people[0],
      );
    },
  ];
  for (const [i, change] of changes.entries()) {
    const f = priorCareFixture2026();
    change(f);
    assert(run(f).diagnostics.length > 0, `invalid source case ${i}`);
  }
  const f = priorCareFixture2026();
  assertThrows(() =>
    calculatePriorCareCredit2026(
      { ...f.form2441.claim.prior_year_expenses, line13: 500 } as never,
      f.general,
      f.form2441.claim.providers,
    )
  );
});

Deno.test("Prior joint return must have the same spouses and uses their smaller income", () => {
  const f = priorCareFixture2026();
  const p = f.form2441.claim.prior_year_expenses.prior_return;
  p.filing_status = FilingStatus.MFJ;
  p.spouse_ssn = "444556666";
  p.form2441_line5_earned_income = 2300;
  const filer = {
    ...f.general,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "444-55-6666",
  };
  const calc = () =>
    calculatePriorCareCredit2026(
      f.form2441.claim.prior_year_expenses,
      filer,
      f.form2441.claim.providers,
    )!;
  assertEquals(calc().lines.line13, 105);
  filer.spouse_ssn = "444-55-6667";
  assertThrows(calc, Error, "Changed joint filing unit");
});
