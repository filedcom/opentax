import { FilingStatus } from "../../nodes/types.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import {
  hsaGraph2026,
  inactiveHsaGraph2026,
  jointHsaGraph2026,
} from "./hsa-graph.fixture.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateHsaReturnSources2026 } from "./hsa-source.ts";
import { calculateForm5329Sources2026 } from "./form5329-source.ts";
import { hsaLastMonth2025HistorySchema } from "./hsa-testing-history.ts";
import { hsaLastMonth2025History } from "./hsa-testing-history.fixture.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { calculateForm1062Tax2026 } from "./form1062-tax.ts";
import { syntheticSocialSecurity2026 } from "./social-security.fixture.ts";
import { marketplaceGraph2026 } from "./marketplace-graph.fixture.ts";

async function run(g: Record<string, unknown>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
type Hsa = ReturnType<typeof calculateHsaReturnSources2026>;
function lapse(g: ReturnType<typeof hsaGraph2026>) {
  const e = g.hsa_accounts.claim.excess_returns.contribution_sources
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
}
Deno.test("2026 HSA graph binds actual income, medical expenses, deduction and distribution tax", async () => {
  const g = hsaGraph2026(), before = structuredClone(g), p = await run(g);
  const h = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals(g, before);
  assertEquals([
    h.owners[0].form8889.line13,
    h.owners[0].form8889.line14a,
    h.owners[0].form8889.line14b,
    h.owners[0].form8889.line15,
    h.owners[0].form8889.line16,
    h.owners[0].form8889.line17b,
  ], [3400, 2630, 630, 500, 1500, 300]);
  assertEquals([
    p.schedule1.line8f_hsa_income,
    p.schedule1.line8z_hsa_excess_earnings,
    p.schedule1.line13_hsa_deduction,
  ], [1500, 30, 3400]);
  assertEquals([p.f1040.line11b_agi, p.f1040.line23_other_taxes], [48130, 300]);
  assertEquals(h.owners[0].file_form8889, true);
});
Deno.test("2026 HSA qualified IRA funding reaches basis, HFD disclosure and combined Form 5329", async () => {
  const p = await run(hsaGraph2026(true));
  const h = p.hsa_accounts.calculation_2026 as Hsa;
  const f = p.form5329.calculation_2026 as ReturnType<
    typeof calculateForm5329Sources2026
  >;
  assertEquals([
    p.f1040.line4a_ira_gross,
    p.f1040.line4b_ira_taxable,
    p.f1040.line4c_other,
    p.f1040.line4c_other_text,
  ], [1500, 450, true, "HFD"]);
  assertEquals([h.owners[0].form8889.line10, h.owners[0].form8889.line13], [
    1000,
    2400,
  ]);
  assertEquals(h.owners[0].future_testing_obligations.length, 1);
  assertEquals(
    h.owners[0].qualified_funding_testing[0].testing.ends_on,
    "2027-06-30",
  );
  assertEquals(
    f.owners.map((
      o,
    ) => [o.owner, o.part1?.line4, o.part7?.line49, o.file_form5329]),
    [["taxpayer", 45, 60, true]],
  );
  assertEquals([
    p.schedule2.line5_form5329_early_tax,
    p.schedule2.line13c_hsa_distribution_tax,
    p.schedule2.line18_form5329_excess_tax,
    p.f1040.line23_other_taxes,
  ], [45, 300, 60, 405]);
  assertEquals(p.f1040.line11b_agi, 49580);
});
Deno.test("2026 HSA graph rejects missing accounts, IRA inventory and forged owner or source facts", async () => {
  const g = hsaGraph2026(true);
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...g,
      hsa_accounts: {
        ...g.hsa_accounts,
        wage_sources: [],
        taxpayer_ssn: "999887777",
      },
    })
  );
  const mutations: Array<(g: ReturnType<typeof hsaGraph2026>) => void> = [
    (g) => {
      g.general.taxpayer_dob = "1981-01-01";
    },
    (g) => {
      g.general.taxpayer_can_be_claimed_as_dependent = true;
    },
    (g) => {
      g.w2s[0].box12_entries![0].amount++;
    },
    (g) => {
      g.schedule_a.medical_payments[0].tax_free_funding_amount = 0;
    },
    (g) => {
      g.hsa_accounts.claim.testing_review.reviewed_on = "2027-05-30";
    },
    (g) => {
      g.f1099r!.claim.copies[0].box1_gross_distribution++;
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(g);
    mutate(bad);
    assert((await executeDraftSources2026(bad)).diagnostics.length > 0);
  }
  const { f1099r: _r, ...missingIra } = g;
  assert(
    (await executeDraftSources2026(missingIra)).diagnostics.some((d) =>
      d.message.includes("HSA")
    ),
  );
  const { hsa_accounts: _h, f1099r: _f, ...missingHsa } = g;
  assert(
    (await executeDraftSources2026(missingHsa)).diagnostics.some((d) =>
      d.message.includes("code W")
    ),
  );
});
Deno.test("2026 HSA graph recaptures independent prior and current testing failures exactly once", async () => {
  const g = hsaGraph2026(true),
    c = g.hsa_accounts.claim,
    h = hsaLastMonth2025History();
  c.testing_review.prior_last_month_histories = [
    hsaLastMonth2025HistorySchema.parse(h),
  ];
  const o = c.testing_review.owners[0];
  delete o
    .no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified;
  o.last_month_2025_history_reference = h.record_reference;
  o.no_prior_qualified_funding_testing_obligations_verified = true;
  lapse(g);
  const p = await run(g), r = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals(r.owners[0].form8889.line18, 3942);
  assertEquals(r.owners[0].form8889.line19, 1000);
  assertEquals(r.owners[0].form8889.line21, 494);
  assertEquals(p.schedule1.line8f_hsa_income, 6442);
  assertEquals(p.schedule2.line13d_hsa_eligibility_tax, 494);
  assertEquals(p.f1040.line4b_ira_taxable, 450);
});
Deno.test("2026 HSA source replay rejects substituted owner and wage inventories", async () => {
  const p = await run(hsaGraph2026(true));
  const f = p.form5329.calculation_2026 as ReturnType<
    typeof calculateForm5329Sources2026
  >;
  const bad = structuredClone(f.source_input);
  bad.hsa_sources_2026!.taxpayer_dob = "1981-01-01";
  assertThrows(() => calculateForm5329Sources2026(bad), Error, "birth date");
  const wage = structuredClone(f.source_input);
  wage.hsa_sources_2026!.wage_sources[0].box1_wages++;
  assertThrows(
    () => calculateForm5329Sources2026(wage),
    Error,
    "wage inventory",
  );
});
Deno.test("2026 HSA deduction and income feed Social Security and Marketplace MAGI", async () => {
  const g = hsaGraph2026();
  g.w2s[0].box1_wages = g.w2s[0].box5_medicare_wages = 24000;
  g.w2s[0].box6_medicare_withheld = 348;
  const { filing_status: _s, taxpayer_ssn: _t, ...ssa } =
    syntheticSocialSecurity2026();
  ssa.statements[0].recipient_tin = g.general.taxpayer_ssn;
  const { hsa_accounts: _h, ...plain } = structuredClone(g);
  plain.w2s[0].box12_entries = [];
  const without = await run({ ...plain, ssa1099: ssa }),
    withHsa = await run({ ...g, ssa1099: ssa });
  assert(
    Number(withHsa.f1040.line6b_ss_taxable) <
      Number(without.f1040.line6b_ss_taxable),
  );
  const m = marketplaceGraph2026(62400), source = hsaGraph2026();
  source.w2s[0].box1_wages = source.w2s[0].box5_medicare_wages = 62400;
  source.w2s[0].box6_medicare_withheld = 904.8;
  const mapped = JSON.parse(
    JSON.stringify({
      hsa_accounts: source.hsa_accounts,
      w2s: source.w2s,
      schedule_a: source.schedule_a,
    }).replaceAll(source.general.taxpayer_ssn, m.general.taxpayer_ssn),
  );
  const p = await run({
    ...m,
    ...mapped,
    general: { ...m.general, taxpayer_dob: source.general.taxpayer_dob },
  });
  assertEquals(p.form8962.taxpayer_modified_agi, 60530);
});
Deno.test("2026 HSA NIIT classification is required only when taxable HSA income crosses the threshold", async () => {
  const g = hsaGraph2026();
  g.w2s[0].box1_wages = g.w2s[0].box5_medicare_wages = 201870;
  g.w2s[0].box6_medicare_withheld = 2927.12;
  assertEquals((await run(g)).f1040.line11b_agi, 200000);
  g.w2s[0].box1_wages++;
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("section 1411")
    ),
  );
});
Deno.test("2026 Form 1062 keeps HSA distribution, testing and excess tax outside deferred regular tax", () => {
  const h = hsaGraph2026(true);
  lapse(h);
  const land = landGraphFixture2026(5000, [], 50000);
  const mapped = JSON.parse(
    JSON.stringify(h).replaceAll(
      h.general.taxpayer_ssn,
      land.general.taxpayer_ssn,
    ).replaceAll("XXX-XX-1037", land.general.taxpayer_ssn),
  );
  const g = { ...land, ...mapped };
  const { input } = form1062TaxFixture2026(g),
    r = calculateForm1062Tax2026(input);
  assertEquals(r.unchanged_return_facts.other_taxes, 527);
  for (
    const key of [
      "line13c_hsa_distribution_tax",
      "line13d_hsa_eligibility_tax",
      "line18_form5329_excess_tax",
    ] as const
  ) {
    const bad = structuredClone(input);
    bad.schedule2[key] = (bad.schedule2[key] ?? 0) + 1;
    assertThrows(() => calculateForm1062Tax2026(bad), Error, "Form 5329");
  }
});

Deno.test("2026 joint HSA graph shares family capacity and retains distinct owner forms", async () => {
  const g = jointHsaGraph2026(),
    p = await run(g),
    h = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals(
    h.owners.map((
      o,
    ) => [
      o.owner,
      o.form8889.line13,
      o.form8889.line17b,
      o.filed_part_vii.line49,
    ]),
    [["taxpayer", 3375, 300, 2], ["spouse", 3375, 300, 2]],
  );
  assertEquals(p.schedule1.line13_hsa_deduction, 6750);
  assertEquals(p.schedule2.line18_form5329_excess_tax, 4);
  assertEquals(p.f1040.line11b_agi, 96310);
});
Deno.test("2026 HSA reviewed inactive accounts create no deduction, income or owner attachment", async () => {
  const p = await run(inactiveHsaGraph2026()),
    h = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals(h.owners[0].file_form8889, false);
  assertEquals(p.f1040.line11b_agi, 50000);
  assertEquals(p.f1040.line23_other_taxes, 0);
});

Deno.test("2026 MFS HSA graph retains spouse coverage evidence without spouse return amounts", async () => {
  const g = jointHsaGraph2026(),
    c = g.hsa_accounts.claim,
    f = c.excess_returns.contribution_sources;
  const spouse = f.claim.accounts.pop()!;
  f.limit_review.separate_return_spouse_accounts = {
    record_reference: "spouse-accounts",
    complete_spouse_hsa_account_inventory_verified: true,
    accounts: [{
      trustee_tin: spouse.trustee_tin,
      account_number: spouse.account_number,
      source_document_reference: "spouse-statement",
    }],
  };
  c.claim.copies = c.claim.copies.filter((v) =>
    v.owner_tin === g.general.taxpayer_ssn
  );
  c.claim.accounts = c.claim.accounts.filter((v) =>
    v.owner_tin === g.general.taxpayer_ssn
  );
  c.medical_expenses = c.medical_expenses.filter((v) =>
    v.hsa_owner_tin === g.general.taxpayer_ssn
  );
  c.treatment_review.owners.pop();
  c.history_review.owners.pop();
  c.testing_review.owners.pop();
  c.excess_returns.review.owners.pop();
  c.excess_returns.review.withdrawals.pop();
  g.w2s.pop();
  g.schedule_a.medical_payments.pop();
  const {
    spouse_citizen_national_or_work_authorized: _spouseWork,
    ...general
  } = g.general;
  const p = await run({
    ...g,
    general: {
      ...general,
      filing_status: FilingStatus.MFS,
      mfs_spouse_itemizing: false,
      mfs_spouse_lived_with_taxpayer: false,
    },
  });
  const h = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals(h.owners.map((v) => [v.owner, v.form8889.line13]), [[
    "taxpayer",
    3375,
  ]]);
  assertEquals(p.schedule2.line18_form5329_excess_tax, 2);
});
Deno.test("2026 employer-only HSA graph files an owner form without inventing a personal deduction", async () => {
  const g = inactiveHsaGraph2026(),
    source = hsaGraph2026(),
    f = g.hsa_accounts.claim.excess_returns.contribution_sources;
  const receipts = source.hsa_accounts.claim.excess_returns.contribution_sources
    .claim.accounts[0].receipts.filter((r) => r.kind === "employer_cash");
  f.claim.accounts[0].receipts = receipts;
  f.claim.accounts[0].form5498sa.box2_calendar_year_contributions = 1500;
  g.w2s[0].box12_entries = source.w2s[0].box12_entries;
  const p = await run(g), h = p.hsa_accounts.calculation_2026 as Hsa;
  assertEquals([
    h.owners[0].file_form8889,
    h.owners[0].form8889.line9,
    h.owners[0].form8889.line13,
  ], [true, 1000, 0]);
  assertEquals(p.f1040.line11b_agi, 50000);
});
