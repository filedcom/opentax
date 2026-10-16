import { assertEquals, assertThrows } from "@std/assert";
import { ableNiitGraph2026 } from "./able-niit.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { FilingStatus } from "../../nodes/types.ts";
async function run(g: Record<string, unknown>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    n: r.pending.form8960.calculation_2026 as ReturnType<
      typeof calculateForm8960_2026
    >,
  };
}
Deno.test("2026 ABLE earnings affect NIIT MAGI but not the investment numerator", async () => {
  for (
    const [wages, magi, tax] of [[179800, 200000, 0], [180800, 201000, 38], [
      300000,
      320200,
      760,
    ]]
  ) {
    const { p, n } = await run(ableNiitGraph2026(wages));
    assertEquals(p.f1040.line11b_agi, magi);
    assertEquals(p.schedule1.line8q_able_taxable_earnings, 200);
    assertEquals(p.schedule2.line5_form5329_early_tax, 20);
    assertEquals(p.schedule2.line6_niit, tax);
    assertEquals(n.tax, tax);
    assertEquals(n.able_noninvestment_income_workpaper, {
      owners: [{
        owner_tin: "123456789",
        account_number: "able-account",
        distribution_reference: "issued-1099qa",
        taxable_earnings: 200,
      }],
      income_already_in_magi: 200,
      net_investment_income: 0,
    });
    if (magi > 200000) {
      assertEquals(n.lines?.line12_net_investment_income, 20000);
    }
  }
});
Deno.test("2026 NIIT rejects stale or missing ABLE source earnings and mismatched owners below and above threshold", async () => {
  const { n } = await run(ableNiitGraph2026());
  for (const magi of [190000, 320200]) {
    const raw = { ...n.source_input, magi };
    assertThrows(
      () => calculateForm8960_2026({ ...raw, able_sources_2026: undefined }),
      Error,
      "NIIT ABLE sources",
    );
    assertThrows(
      () =>
        calculateForm8960_2026({ ...raw, able_taxable_earnings_from_agi: 201 }),
      Error,
      "NIIT ABLE sources",
    );
    const changed = structuredClone(raw);
    changed.able_sources_2026!.claim.accounts[0].current_year_distributions!
      .qualified_expenses[0].amount = 500;
    assertThrows(
      () => calculateForm8960_2026(changed),
      Error,
      "NIIT ABLE sources",
    );
    const independent = {
      ...raw,
      investment_sources_2026: undefined,
      capital_sources_2026: undefined,
      taxable_interest_from_agi: 0,
    };
    assertThrows(
      () =>
        calculateForm8960_2026({ ...independent, taxpayer_ssn: "400001099" }),
      Error,
      "NIIT ABLE sources",
    );
    assertThrows(
      () =>
        calculateForm8960_2026({
          ...independent,
          filing_status: FilingStatus.HOH,
        }),
      Error,
      "NIIT ABLE sources",
    );
  }
});
Deno.test("2026 ABLE qualified distributions remain zero income above the NIIT threshold", async () => {
  const g = ableNiitGraph2026();
  g.able_accounts.claim.accounts[0].current_year_distributions!
    .qualified_expenses[0].amount = 2000;
  const { n, p } = await run(g);
  assertEquals(p.f1040.line11b_agi, 320000);
  assertEquals(
    n.able_noninvestment_income_workpaper?.income_already_in_magi,
    0,
  );
  assertEquals(n.tax, 760);
  assertEquals(p.schedule2.line5_form5329_early_tax, 0);
});
Deno.test("2026 joint NIIT retains both ABLE owners without a second threshold or investment inclusion", async () => {
  const g = ableNiitGraph2026();
  const a = g.able_accounts.claim.accounts[0];
  const other = JSON.parse(
    JSON.stringify(a),
    (k, v) =>
      typeof v !== "string"
        ? v
        : v === g.general.taxpayer_ssn
        ? "400001038"
        : /ref|account_number/.test(k)
        ? `spouse-${v}`
        : v,
  );
  g.able_accounts.claim.accounts.push(other);
  const { n, p } = await run({
    ...g,
    general: {
      ...g.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "400001038",
      spouse_dob: "1980-02-01",
      spouse_first_name: "Synthetic",
      spouse_last_name: "Spouse",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
    },
  });
  assertEquals(
    n.able_noninvestment_income_workpaper?.owners.map(
      (o) => [o.owner_tin, o.taxable_earnings],
    ),
    [["123456789", 200], ["400001038", 200]],
  );
  assertEquals(p.f1040.line11b_agi, 320400);
  assertEquals(n.lines?.line14_threshold, 250000);
  assertEquals(n.tax, 760);
  assertEquals(p.schedule2.line5_form5329_early_tax, 40);
});
Deno.test("2026 ABLE taxable earnings remain in the reviewed investment state-tax allocation denominator", async () => {
  const { n } = await run(ableNiitGraph2026());
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
  assertEquals(itemized.lines?.line9b_state_local_tax, 1874);
  assertEquals(itemized.lines?.line12_net_investment_income, 18126);
  assertEquals(itemized.tax, 689);
});
