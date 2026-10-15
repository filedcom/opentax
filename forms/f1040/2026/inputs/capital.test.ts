import { categoryCapitalFixture2026 } from "./capital.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  capitalFixture2026,
  capitalSale2026,
  mixedCapitalFixture2026,
} from "./capital.fixture.ts";
import {
  capitalLossCarryover,
  resolveCapitalSources2026,
} from "./capital-source.ts";
import { calculateCapitalGains2026 } from "../nodes/capital-gains.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { syntheticInvestmentClaim2026 } from "./investment.fixture.ts";
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
    capital: r.pending.capital_gains.calculation_2026 as ReturnType<
      typeof calculateCapitalGains2026
    >,
  };
}
Deno.test("Mixed capital sources preserve direct cents, derive B/E adjustments and reconcile AGI, tax and NIIT", () => {
  const { p, capital: c } = complete(mixedCapitalFixture2026());
  assertEquals(c.rows.map((r) => r.part), ["A", "A", "D", "H", "F", "J"]);
  assertEquals(c.file_rows.map((r) => r.part), ["D", "H", "F"]);
  assertEquals([c.line7, c.line15, c.line16, c.preferential_gain], [
    -99,
    6400,
    6301,
    6301,
  ]);
  assertEquals(c.groups.line8b.adjustment, -500);
  assertEquals(c.groups.line10.adjustment, -100);
  assertEquals(p.f1040.line7a_capital_gain, 6301);
  assertEquals(p.f1040.line7b_schedule_d_not_required, false);
  assertEquals(p.f1040.line11b_agi, 256301);
  assertEquals(p.f1040.line25b_withheld_1099, 101);
  assertEquals(p.schedule2.line6_niit, 239);
});
Deno.test("Capital distributions join the complete disposition inventory once", () => {
  const f = mixedCapitalFixture2026(),
    investment = syntheticInvestmentClaim2026();
  investment.f1099divs[0].box2a = 1000;
  const combined = {
    ...investment,
    capital_gain_inventory_review: {
      record_reference: "div-review",
      capital_transaction_inventory_reference:
        f.capital_gains.claim.record_reference,
    },
  };
  const { capital: c, p } = complete({ ...f, investment_income: combined });
  assertEquals(c.line15, 7400);
  assertEquals(p.f1040.line7a_capital_gain, 7301);
  assert(
    run({ ...f, investment_income: investment }).diagnostics.some((d) =>
      d.nodeType === "capital_gains"
    ),
  );
  assert(
    run({ general: f.general, w2s: f.w2s, investment_income: combined })
      .diagnostics.some((d) => d.nodeType === "capital_gains"),
  );
});
Deno.test("Wash-sale source adjustment uses complete loss review and retains reported basis", () => {
  const f = capitalFixture2026(), s = f.capital_gains.claim.sales[0];
  assert(s.reporting.kind === "1099-B");
  s.tax_basis = 2000;
  s.reporting.box1e_basis = 1800;
  s.reporting.box1d_proceeds = 1000;
  s.actual_proceeds_before_additional_expenses = 1000;
  s.reporting.box1g_wash_sale = 300;
  s.wash_sale_review.disallowed_loss = 700;
  const c = complete(f).capital;
  assertEquals(c.rows[0].adjustment_codes, "BW");
  assertEquals(c.rows[0].adjustment_amount, 500);
  assertEquals(c.return_gain, -300);
  s.wash_sale_review.disallowed_loss = 1200;
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Prior return carryover derives short and long losses and retains negative taxable income", () => {
  const f = capitalFixture2026();
  f.capital_gains.claim.sales = [];
  f.capital_gains.claim.carryover = {
    kind: "prior_return",
    tax_year: 2025,
    return_reference: "filed-2025",
    taxpayer_tin: "123456789",
    filing_status: FilingStatus.Single,
    ownership_and_filing_unit_unchanged: true,
    form1040_line11b: 20000,
    form1040_line14: 16000,
    form1040_line15: 4000,
    schedule_d_line7: -5000,
    schedule_d_line15: -4000,
    schedule_d_line21: -3000,
  };
  const c = complete(f).capital;
  assertEquals(c.carry.short_term, 2000);
  assertEquals(c.carry.long_term, 4000);
  assertEquals(c.return_gain, -3000);
  f.capital_gains.claim.carryover.form1040_line11b = 14000;
  f.capital_gains.claim.carryover.form1040_line15 = 0;
  assertEquals(complete(f).capital.carry, {
    short_term: 4000,
    long_term: 4000,
    deducted_against_income: 1000,
  });
  f.capital_gains.claim.carryover.form1040_line15 = 1;
  assert(run(f).diagnostics.length > 0);
  assertEquals(capitalLossCarryover(10000, 2000, -9000, 3000), {
    short_term: 0,
    long_term: 4000,
    deducted_against_income: 3000,
  });
});
Deno.test("Capital losses use the separate-filer limit and reduce NIIT investment income", () => {
  const f = capitalFixture2026(), s = f.capital_gains.claim.sales[0];
  assert(s.reporting.kind === "1099-B");
  s.tax_basis = 10000;
  s.reporting.box1e_basis = 10000;
  const c = calculateCapitalGains2026({
    filing_status: FilingStatus.MFS,
    taxpayer_ssn: "123456789",
    digital_assets_answer: false,
    claim: f.capital_gains.claim,
  });
  assertEquals(c.return_gain, -1500);
  const investment = syntheticInvestmentClaim2026();
  investment.f1099ints[0].box1 = 5000;
  const combined = {
    ...investment,
    capital_gain_inventory_review: {
      record_reference: "income-review",
      capital_transaction_inventory_reference:
        f.capital_gains.claim.record_reference,
    },
  };
  const { p } = complete({ ...f, investment_income: combined });
  assertEquals(p.f1040.line7a_capital_gain, -3000);
  assertEquals(p.schedule2.line6_niit, 106);
});
Deno.test("Holding period uses the day after acquisition and unknown broker terms need dated evidence", () => {
  const f = capitalFixture2026(), s = f.capital_gains.claim.sales[0];
  assert(s.reporting.kind === "1099-B");
  s.date_acquired = "2025-09-01";
  s.reporting.box2_term = "unknown";
  assertEquals(complete(f).capital.rows[0].part, "A");
  s.date_sold = "2026-09-02";
  assertEquals(complete(f).capital.rows[0].part, "D");
});
Deno.test("Invalid ownership, duplicates, corrections, date, basis, digital answer and special sources stop the graph", () => {
  for (
    const kind of [
      "owner",
      "duplicate",
      "correction",
      "date",
      "basis",
      "term",
      "digital",
      "special",
    ]
  ) {
    const f = kind === "digital"
        ? mixedCapitalFixture2026()
        : capitalFixture2026(),
      s = f.capital_gains.claim.sales[0];
    assert(s.reporting.kind === "1099-B");
    if (kind === "owner") s.owner_tin = "999887777";
    if (kind === "duplicate") {
      f.capital_gains.claim.sales.push({ ...s, sale_reference: "different" });
    }
    if (kind === "correction") {
      s.reporting.corrected = true;
      s.reporting.superseded_document_references = [
        s.reporting.source_document_reference,
      ];
    }
    if (kind === "date") s.date_sold = "2025-12-31";
    if (kind === "basis") delete s.reporting.box1e_basis;
    if (kind === "term") s.reporting.box2_term = "long";
    if (kind === "digital") f.general.digital_assets = false;
    if (kind === "special") {
      (s.reporting as Record<string, unknown>).box1f_market_discount = 1;
    }
    assert(run(f).diagnostics.length > 0, kind);
  }
  const f = capitalFixture2026(), s = capitalSale2026();
  assertThrows(() =>
    resolveCapitalSources2026({ ...f.capital_gains.claim, sales: [s, s] }, {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "123456789",
    })
  );
});
Deno.test("Outgoing capital-loss carryforward waits for final deductions and preserves unused loss", () => {
  const f = capitalFixture2026(10000), s = f.capital_gains.claim.sales[0];
  assert(s.reporting.kind === "1099-B");
  s.tax_basis = 10000;
  s.reporting.box1e_basis = 10000;
  s.actual_proceeds_before_additional_expenses = 1000;
  s.reporting.box1d_proceeds = 1000;
  const { p } = complete(f);
  const c = p.capital_loss_carryover.calculation_2026 as {
    short_term: number;
    long_term: number;
    deducted_against_income: number;
  };
  assertEquals(c.short_term, 9000);
  assertEquals(c.long_term, 0);
  assertEquals(c.deducted_against_income, 0);
  assertEquals(p.f1040.line7a_capital_gain, -3000);
  assertEquals(p.f1040.line15_taxable_income, 0);
});

Deno.test("All twelve reporting categories retain their distinct Form 8949 groups", () => {
  const c = complete(categoryCapitalFixture2026()).capital;
  assertEquals(c.file_rows.map((r) => r.part), [
    "A",
    "B",
    "C",
    "G",
    "H",
    "I",
    "D",
    "E",
    "F",
    "J",
    "K",
    "L",
  ]);
  assertEquals(c.line7, 5998);
  assertEquals(c.line15, 5998);
  assertEquals(c.return_gain, 11996);
  assertEquals(c.preferential_gain, 5998);
});
