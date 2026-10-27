import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../2025/registry.ts";

const plan = buildExecutionPlan(registry);

function reitDividend(payer: string, box1a: number, box5: number) {
  return {
    payerName: payer,
    source_document_reference: `${payer} 1099-DIV`,
    isNominee: false,
    box11: false,
    box1a,
    box1b: 6_000,
    box5,
    section199a_holding_review: {
      ex_dividend_date: "2025-06-15",
      qualified_held_days_in_91_day_window: 91,
      diminished_risk_days_excluded: 0,
      no_related_payment_obligation_confirmed: true,
      review_reference: `${payer} holding review`,
      reviewed_on: "2026-02-01",
    },
  };
}

function filing(f1099divs: ReturnType<typeof reitDividend>[]) {
  return execute(plan, registry, {
    general: { filing_status: "single" },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    f1099div: f1099divs,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
}

// Above the 2025 threshold, so Form 8995-A applies. Line 28 is the sum of
// qualified REIT dividends with no business, wage or UBIA requirement
// (i8995-A, Part IV); line 31 is 20% of it.
test("E2E: Form 8995-A sums REIT dividends from several 1099-DIVs that are part of box 1a", () => {
  const result = filing([
    reitDividend("Example Broker A", 10_000, 1_000),
    reitDividend("Example Broker B", 10_000, 1_000),
  ]);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line13_qbi_deduction, 400);
  assertEquals(result.pending.f1040?.line15_taxable_income, 303_850);
});

test("E2E: Form 8995-A takes one 1099-DIV REIT amount above 1,500", () => {
  const result = filing([reitDividend("Example Broker A", 20_000, 5_000)]);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line13_qbi_deduction, 1_000);
});
