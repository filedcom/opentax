import { assertEquals, assertThrows } from "@std/assert";
import { hsaNiitGraph2026 } from "./hsa-niit.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { FilingStatus } from "../../nodes/types.ts";
async function run(g: ReturnType<typeof hsaNiitGraph2026>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  const n = r.pending.form8960.calculation_2026 as ReturnType<
    typeof calculateForm8960_2026
  >;
  return { p: r.pending, n };
}
Deno.test("2026 HSA income and deduction change NIIT MAGI without changing its investment numerator", async () => {
  for (
    const [wages, magi, tax] of [[181870, 200000, 0], [182870, 201000, 38], [
      300000,
      318130,
      760,
    ]]
  ) {
    const { p, n } = await run(hsaNiitGraph2026(wages));
    assertEquals(p.f1040.line11b_agi, magi);
    assertEquals(n.source_input.magi, magi);
    assertEquals(n.tax, tax);
    assertEquals(p.schedule2.line6_niit, tax);
    if (magi > 200000) {
      assertEquals(n.lines?.line8_total_investment_income, 20000);
      assertEquals(n.lines?.line12_net_investment_income, 20000);
      assertEquals(n.lines?.line11_total_deductions, 0);
    }
    assertEquals(n.hsa_noninvestment_income_workpaper, {
      owners: [{
        owner_tin: "400001037",
        taxable_distributions: 1500,
        testing_period_income: 0,
      }],
      returned_excess_earnings: 30,
      employer_excess_compensation: 0,
      income_already_in_magi: 1530,
      deduction_already_in_magi: 3400,
      net_investment_income: 0,
      additional_niit_deduction: 0,
    });
  }
});
Deno.test("2026 joint HSA NIIT preserves both owner sources and one return threshold", async () => {
  const { n, p } = await run(hsaNiitGraph2026(300000, true));
  assertEquals(
    n.hsa_noninvestment_income_workpaper?.owners.map((
      o,
    ) => [o.owner_tin, o.taxable_distributions]),
    [["400001037", 1500], ["400001038", 1500]],
  );
  assertEquals(n.lines?.line14_threshold, 250000);
  assertEquals(p.f1040.line11b_agi, 366310);
  assertEquals(n.tax, 760);
});
Deno.test("2026 NIIT source replay rejects missing altered or mismatched HSA amounts even below threshold", async () => {
  const { n } = await run(hsaNiitGraph2026());
  for (const magi of [190000, 318130]) {
    const raw = { ...n.source_input, magi };
    for (
      const key of [
        "hsa_taxable_income_from_agi",
        "hsa_deduction_from_agi",
      ] as const
    ) {
      assertThrows(
        () => calculateForm8960_2026({ ...raw, [key]: raw[key] + 1 }),
        Error,
        "NIIT HSA sources",
      );
    }
    assertThrows(
      () => calculateForm8960_2026({ ...raw, hsa_sources_2026: undefined }),
      Error,
      "NIIT HSA sources",
    );
    assertThrows(
      () =>
        calculateForm8960_2026({
          ...raw,
          investment_sources_2026: undefined,
          capital_sources_2026: undefined,
          taxable_interest_from_agi: 0,
          taxpayer_ssn: "123456789",
        }),
      Error,
      "NIIT HSA sources",
    );
    assertThrows(
      () =>
        calculateForm8960_2026({
          ...raw,
          investment_sources_2026: undefined,
          capital_sources_2026: undefined,
          taxable_interest_from_agi: 0,
          filing_status: FilingStatus.HOH,
        }),
      Error,
      "NIIT HSA sources",
    );
  }
});
Deno.test("2026 HSA testing-period recapture remains in MAGI without investment income or a second IRA inclusion", async () => {
  const g = hsaNiitGraph2026(300000, false, true),
    e = g.hsa_accounts.claim.excess_returns.contribution_sources
      .household_eligibility.owners[0];
  const renewed = structuredClone(e.plans[0]);
  e.plans[0].effective_through = "2026-06-15";
  renewed.effective_from = "2026-07-02";
  renewed.source_document_reference = "renewed-plan";
  e.plans.push(renewed);
  e.months[6].plan_references = [];
  for (const m of e.months.slice(7)) {
    m.plan_references = [renewed.source_document_reference];
  }
  const { n, p } = await run(g);
  assertEquals(
    n.hsa_noninvestment_income_workpaper?.owners[0].testing_period_income,
    1000,
  );
  assertEquals(
    n.hsa_noninvestment_income_workpaper?.income_already_in_magi,
    2530,
  );
  assertEquals(p.f1040.line4b_ira_taxable, 450);
  assertEquals(n.tax, 760);
  assertEquals(n.lines?.line12_net_investment_income, 20000);
});
Deno.test("2026 HSA source deduction is not an allocable NIIT expense and taxable income remains in the SALT ratio", async () => {
  const { n } = await run(hsaNiitGraph2026());
  const itemized = calculateForm8960_2026({
    ...n.source_input,
    taking_standard_deduction: false,
    itemized_before_overall_limit: 30000,
    itemized_after_overall_limit: 30000,
    schedule_a_tax_facts: {
      tax_election: "income",
      income_taxes: 30000,
      total_taxes_before_limit: 30000,
      allowed_taxes: 30000,
    },
  });
  assertEquals(itemized.lines?.line9b_state_local_tax, 1886); // 30,000 × 20,000 / 318,130
  assertEquals(itemized.lines?.line12_net_investment_income, 18114);
  assertEquals(itemized.tax, 688);
});
Deno.test("2026 employer HSA excess is compensation for NIIT and reconciles amounts already in wages", async () => {
  for (const included of [0, 200]) {
    const g = hsaNiitGraph2026(),
      c = g.hsa_accounts.claim.excess_returns,
      a = c.contribution_sources.claim.accounts[0];
    a.receipts.find((r) => r.record_reference === "payroll-current")!.amount =
      5000;
    a.receipts.find((r) => r.record_reference === "personal-current")!.amount =
      700;
    a.form5498sa.box2_calendar_year_contributions = 6200;
    g.w2s[0].box12_entries![0].amount = 5500;
    c.review.withdrawals[0].contribution_kind = "employer_cash";
    c.review.withdrawals[0].contribution_allocations[0].receipt_reference =
      "payroll-current";
    if (included) {
      c.review.owners[0].w2_inclusions = [{
        source_document_reference: g.w2s[0].source_document_reference,
        employer_ein: g.w2s[0].employer_ein,
        payroll_reconciliation_reference: "excess-in-wages",
        box1_wages_before_hsa_excess_inclusion: 300000 - included,
        amount_included_for_2026_hsa_excess: included,
        complete_box1_reconciliation_verified: true,
      }];
    }
    const { n, p } = await run(g);
    assertEquals(
      n.hsa_noninvestment_income_workpaper?.employer_excess_compensation,
      600 - included,
    );
    assertEquals(
      n.hsa_noninvestment_income_workpaper?.deduction_already_in_magi,
      0,
    );
    assertEquals(p.f1040.line11b_agi, 322130 - included);
    assertEquals(n.lines?.line12_net_investment_income, 20000);
    assertEquals(n.tax, 760);
  }
});
