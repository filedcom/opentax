import {
  scopeReview2026,
  zeroExclusions2026,
} from "../nodes/schedule1a.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { hsaRolloverGraph2026 } from "./hsa-rollover.fixture.ts";
import { jointHsaGraph2026 } from "./hsa-graph.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import type { calculateHsaReturnSources2026 } from "./hsa-source.ts";
import { calculateHsaMedicalDistributions2026 } from "./hsa-medical-distributions.ts";
import { hsaRolloverElapsedDays } from "../../nodes/intermediate/forms/adjustments/health/form8889/rollover-timing.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
type G = ReturnType<typeof hsaRolloverGraph2026>;
type H = ReturnType<typeof calculateHsaReturnSources2026>;
async function run(g: G | Record<string, unknown>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return { p: r.pending, h: r.pending.hsa_accounts.calculation_2026 as H };
}
function receipt(g: G) {
  return g.hsa_accounts.claim.excess_returns.contribution_sources.claim
    .accounts[0].receipts.find((r) => r.kind === "reported_rollover")!;
}
function prior(g: G, date = "2025-06-30") {
  const r = g.hsa_accounts.claim.excess_returns.contribution_sources
    .rollover_review!;
  r.owners[0].prior_tax_free_rollovers = [{
    record_reference: "prior-rollover",
    distribution_received_on: date,
    source_trustee_tin: "123456789",
    source_account_number: "closed-hsa",
    source_payment_reference: "prior-payout",
    source_statement_reference: "prior-statement",
    destination_receipt_reference: "prior-receipt",
    deposited_on: date,
    amount: 100,
    filed_return_reference: "filed-2025-return",
    qualified_under_223f5_on_latest_filed_return_verified: true,
  }];
}
Deno.test("2026 HSA rollover reconciles payout and redeposit with unchanged contribution deduction", async () => {
  const g = hsaRolloverGraph2026(),
    before = structuredClone(g),
    { p, h } = await run(g),
    l = h.owners[0].form8889;
  assertEquals(g, before);
  assertEquals([
    l.line2,
    l.line9,
    l.line13,
    l.line14a,
    l.line14b,
    l.line14c,
    l.line15,
    l.line16,
    l.line17b,
  ], [4000, 1000, 3400, 2630, 1130, 1500, 500, 1000, 200]);
  assertEquals([
    p.schedule1.line8f_hsa_income,
    p.schedule1.line8z_hsa_excess_earnings,
    p.f1040.line11b_agi,
    p.f1040.line23_other_taxes,
  ], [1000, 30, 47630, 200]);
});
Deno.test("2026 HSA December payout accepts actual January redeposit without a 2026 rollover-box amount", async () => {
  const g = hsaRolloverGraph2026(true), { h } = await run(g);
  assertEquals(h.owners[0].form8889.line14b, 1130);
  const rows =
    h.calculation.annual_sources.medical_sources.excess_return_sources!
      .contribution_sources.rollovers;
  assertEquals(
    rows.map((r) => [r.distributed_on, r.deposited_on, r.elapsed_days]),
    [["2026-12-20", "2027-01-10", 21]],
  );
  assertEquals(
    g.hsa_accounts.claim.excess_returns.contribution_sources.claim.accounts[0]
      .form5498sa.box4_calendar_year_rollovers,
    0,
  );
});
Deno.test("2026 HSA rollover excludes the 60th-day deposit and rejects the 61st day", async () => {
  const g = hsaRolloverGraph2026();
  receipt(g).received_on = "2026-08-29";
  assertEquals((await run(g)).h.owners[0].form8889.line14b, 1130);
  receipt(g).received_on = "2026-08-30";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("60 days")
    ),
  );
  assertEquals(hsaRolloverElapsedDays("2024-01-01", "2024-03-01"), 60);
  assertThrows(
    () => hsaRolloverElapsedDays("2026-02-29", "2026-03-01"),
    Error,
    "calendar dates",
  );
});
Deno.test("2026 HSA prior rollover history applies to all owned accounts and allows the anniversary boundary", async () => {
  const g = hsaRolloverGraph2026();
  prior(g);
  g.hsa_accounts.claim.excess_returns.contribution_sources.rollover_review!
    .owners[0].prior_tax_free_rollovers[0].deposited_on = "2025-07-30";
  assertEquals((await run(g)).h.owners[0].form8889.line16, 1000);
  prior(g, "2025-07-01");
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("across owned HSAs")
    ),
  );
  // The old rollover was in a different, now-closed HSA: account changes do not reset the beneficiary's clock.
});
Deno.test("2026 HSA rollover validates identity, source links, classifications and complete history", async () => {
  const edits: Array<(g: G) => void> = [
    (g) => {
      receipt(g).originating_owner_tin = "400001038";
    },
    (g) => {
      receipt(g).originating_distribution_reference = "missing-payment";
    },
    (g) => {
      receipt(g).distribution_received_on = "2026-06-29";
    },
    (g) => {
      receipt(g).originating_account_type = "archer_msa";
    },
    (g) => {
      g.hsa_accounts.claim.excess_returns.contribution_sources.rollover_review!
        .owners[0].owner_tin = "400001038";
    },
    (g) => {
      g.hsa_accounts.claim.excess_returns.contribution_sources.rollover_review!
        .reviewed_on = "2027-01-01";
    },
    (g) => {
      delete g.hsa_accounts.claim.excess_returns.contribution_sources
        .rollover_review;
    },
    (g) => {
      g.hsa_accounts.claim.excess_returns.contribution_sources.rollover_review!
        .rollovers.push(
          structuredClone(
            g.hsa_accounts.claim.excess_returns.contribution_sources
              .rollover_review!.rollovers[0],
          ),
        );
    },
    (g) => {
      g.hsa_accounts.claim.treatment_review.owners[0]
        .no_rollover_or_mistaken_distribution_in_payments_verified = true;
    },
  ];
  for (const edit of edits) {
    const g = hsaRolloverGraph2026();
    edit(g);
    assert((await executeDraftSources2026(g)).diagnostics.length > 0);
  }
});
Deno.test("2026 HSA rollover cannot reuse medical-reimbursed or excess-return dollars", async () => {
  const g = hsaRolloverGraph2026();
  receipt(g).amount = 800;
  g.hsa_accounts.claim.excess_returns.contribution_sources.claim.accounts[0]
    .form5498sa.box4_calendar_year_rollovers = 800;
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("reuse the same distribution")
    ),
  );
  const excess = hsaRolloverGraph2026();
  const r = receipt(excess);
  r.originating_distribution_reference = "excess-payment";
  r.distribution_received_on = "2026-11-01";
  r.received_on = "2026-11-02";
  excess.hsa_accounts.claim.excess_returns.contribution_sources.rollover_review!
    .rollovers[0].distribution_payment_reference = "excess-payment";
  assert((await executeDraftSources2026(excess)).diagnostics.length > 0);
});
Deno.test("2026 HSA split redeposits of one payout aggregate source cents without counting as two rollovers", async () => {
  const g = hsaRolloverGraph2026(),
    f = g.hsa_accounts.claim.excess_returns.contribution_sources,
    r = receipt(g);
  r.amount = 250.25;
  f.claim.accounts[0].receipts.push({
    ...r,
    amount: 249.75,
    record_reference: "second-receipt",
    custodian_transaction_identifier: "second-deposit",
    received_on: "2026-07-11",
  });
  f.rollover_review!.rollovers.push({
    ...f.rollover_review!.rollovers[0],
    record_reference: "second-rollover-part",
    destination_receipt_reference: "second-receipt",
  });
  assertEquals((await run(g)).h.owners[0].form8889.line14b, 1130);
  r.amount = 1250.25;
  f.claim.accounts[0].form5498sa.box4_calendar_year_rollovers = 1500;
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("exceed their actual payout")
    ),
  );
});
Deno.test("2026 HSA two separate payouts cannot both use the annual rollover exclusion", async () => {
  const g = hsaRolloverGraph2026(),
    f = g.hsa_accounts.claim.excess_returns.contribution_sources,
    r = receipt(g);
  f.claim.accounts[0].receipts.push({
    ...r,
    amount: 100,
    record_reference: "second-receipt",
    custodian_transaction_identifier: "second-deposit",
    distribution_received_on: "2026-07-01",
    originating_distribution_reference: "july-payment",
  });
  f.claim.accounts[0].form5498sa.box4_calendar_year_rollovers = 600;
  f.rollover_review!.rollovers.push({
    ...f.rollover_review!.rollovers[0],
    record_reference: "second-rollover",
    distribution_payment_reference: "july-payment",
    destination_receipt_reference: "second-receipt",
  });
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("two distributions")
    ),
  );
});
Deno.test("2026 HSA rollover still qualifies when the beneficiary is not eligible to deduct contributions", async () => {
  const g = hsaRolloverGraph2026(),
    e = g.hsa_accounts.claim.excess_returns.contribution_sources
      .household_eligibility.owners[0];
  e.plans = [];
  for (const m of e.months) m.plan_references = [];
  const { h } = await run(g);
  assertEquals([h.owners[0].form8889.line13, h.owners[0].form8889.line14b], [
    0,
    1130,
  ]);
});
Deno.test("2026 HSA rollover and qualified IRA funding remain distinct exclusions and testing records", async () => {
  const { h, p } = await run(hsaRolloverGraph2026(false, true));
  assertEquals([
    h.owners[0].form8889.line10,
    h.owners[0].form8889.line14b,
    h.owners[0].form8889.line13,
    p.f1040.line4b_ira_taxable,
  ], [1000, 1130, 2400, 450]);
  assertEquals(h.owners[0].future_testing_obligations.length, 1);
  assertEquals(p.f1040.line23_other_taxes, 305);
});
Deno.test("2026 HSA rollover preserves payment-specific age-65 additional-tax exceptions", async () => {
  const g = hsaRolloverGraph2026(),
    f = g.hsa_accounts.claim.excess_returns.contribution_sources;
  g.general.taxpayer_dob = "1961-07-01";
  f.household_eligibility.owners[0].owner_dob = g.general.taxpayer_dob;
  f.claim.accounts[0].receipts.find((r) =>
    r.record_reference === "personal-current"
  )!.amount = 6000;
  f.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 2000;
  const { h } = await run({
    ...g,
    schedule1a: {
      tax_year: 2026,
      source_scope_review: scopeReview2026,
      part1_zero_exclusions_review: zeroExclusions2026,
    },
  });
  assertEquals([
    h.owners[0].form8889.line16,
    h.owners[0].form8889.line17a,
    h.owners[0].form8889.line17b,
  ], [1000, true, 40]);
});
Deno.test("2026 HSA public intake rejects a substituted distribution inventory and replay catches stale evidence", async () => {
  const g = hsaRolloverGraph2026();
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...g,
      hsa_accounts: {
        claim: {
          ...g.hsa_accounts.claim,
          excess_returns: {
            ...g.hsa_accounts.claim.excess_returns,
            contribution_sources: {
              ...g.hsa_accounts.claim.excess_returns.contribution_sources,
              rollover_distribution_sources: {},
            },
          },
        },
      },
    })
  );
  const { h } = await run(g),
    source = structuredClone(
      h.calculation.annual_sources.medical_sources.source_input,
    );
  source.excess_returns!.contribution_sources.rollover_distribution_sources!
    .claim.reviewed_on = "2027-04-14";
  assertThrows(
    () => calculateHsaMedicalDistributions2026(source),
    Error,
    "same actual distribution inventory",
  );
});
Deno.test("2026 joint HSA return excludes a rollover only for its actual beneficiary", async () => {
  const g = jointHsaGraph2026(),
    single = hsaRolloverGraph2026(),
    f = g.hsa_accounts.claim.excess_returns.contribution_sources,
    sf = single.hsa_accounts.claim.excess_returns.contribution_sources;
  f.claim.accounts[0].receipts.push(receipt(single));
  f.claim.accounts[0].form5498sa.box4_calendar_year_rollovers = 500;
  f.rollover_review = sf.rollover_review;
  g.hsa_accounts.claim.treatment_review.owners[0] =
    single.hsa_accounts.claim.treatment_review.owners[0];
  const { h } = await run(g);
  assertEquals(
    h.owners.map((o) => [o.owner, o.form8889.line16, o.form8889.line17b]),
    [["taxpayer", 1000, 200], ["spouse", 1500, 300]],
  );
});

Deno.test("2026 HSA rollover joins different owned accounts without inventing destination distributions", async () => {
  const g = hsaRolloverGraph2026(),
    c = g.hsa_accounts.claim,
    f = c.excess_returns.contribution_sources,
    origin = f.claim.accounts[0],
    r = receipt(g);
  const destination = structuredClone(origin);
  origin.receipts = origin.receipts.filter((v) =>
    v.kind !== "reported_rollover"
  );
  origin.form5498sa.box4_calendar_year_rollovers = 0;
  Object.assign(destination, {
    record_reference: "destination-account",
    account_number: "destination-hsa",
    opened_on: "2026-07-01",
    ledger_statement_reference: "destination-ledger",
    receipts: [{ ...r, statement_reference: "destination-ledger" }],
  });
  Object.assign(destination.form5498sa, {
    source_document_reference: "destination-5498sa",
    account_number: "destination-hsa",
    box2_calendar_year_contributions: 0,
    box4_calendar_year_rollovers: 500,
    box5_year_end_fmv: 500,
  });
  f.claim.accounts.push(destination);
  c.claim.accounts.push({
    ...structuredClone(c.claim.accounts[0]),
    record_reference: "destination-distribution-ledger",
    account_number: "destination-hsa",
    opened_on: "2026-07-01",
    ledger_statement_reference: "destination-annual-ledger",
    payments: [],
  });
  const { h } = await run(g);
  assertEquals(h.owners[0].form8889.line14a, 2630);
  assertEquals(h.owners[0].form8889.line14b, 1130);
  const rows =
    h.calculation.annual_sources.medical_sources.excess_return_sources!
      .contribution_sources.rollovers;
  assertEquals(rows[0].destination_account_reference, "destination-account");
  assertEquals(rows[0].next_rollover_distribution_on_or_after, "2027-06-30");
});

Deno.test("2026 HSA rollover does not absorb prior excess as a taxable distribution", async () => {
  const g = hsaRolloverGraph2026(),
    c = g.hsa_accounts.claim,
    a = c.excess_returns.contribution_sources.claim.accounts[0];
  c.history_review.owners[0].prior_excess = {
    kind: "filed_2025",
    tax_year: 2025,
    owner_tin: g.general.taxpayer_ssn,
    filed_return_reference: "filed-2025-return",
    filed_on: "2026-04-15",
    latest_original_or_amended_return_verified: true,
    no_pending_prior_year_corrections_verified: true,
    complete_2025_owner_account_inventory_verified: true,
    no_timely_returned_2025_contributions_in_2026_receipts_verified: true,
    part_vii: {
      line42: 0,
      line43: 0,
      line44: 0,
      line45: 0,
      line46: 0,
      line47: 6000,
      line48: 6000,
      line49: 360,
    },
    accounts: [{
      owner_tin: g.general.taxpayer_ssn,
      trustee_tin: a.trustee_tin,
      account_number: a.account_number,
      value_statement_reference: "prior-value",
      valued_on: "2025-12-31",
      fair_market_value: 8000,
      current_value_after_corrections_verified: true,
    }],
  };
  const { h, p } = await run(g), o = h.owners[0];
  assertEquals([
    o.filed_part_vii.line44,
    o.filed_part_vii.line48,
    o.filed_part_vii.line49,
    o.carryforward_for_2027,
  ], [1000, 5000, 300, 5000]);
  assertEquals(p.schedule2.line18_form5329_excess_tax, 300);
});
