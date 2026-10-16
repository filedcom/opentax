import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  hsaNonreportableGraph2026,
  onlyNonreportableHsaGraph2026,
} from "./hsa-nonreportable.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import type { calculateHsaReturnSources2026 } from "./hsa-source.ts";
import { calculateHsaMedicalDistributions2026 } from "./hsa-medical-distributions.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
type G = ReturnType<typeof hsaNonreportableGraph2026>;
type H = ReturnType<typeof calculateHsaReturnSources2026>;
async function run(g: G) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  const h = r.pending.hsa_accounts.calculation_2026 as H;
  return {
    p: r.pending,
    h,
    f: h.calculation.annual_sources.medical_sources.excess_return_sources!
      .contribution_sources,
  };
}
function debit(g: G) {
  return g.hsa_accounts.claim.claim.accounts[0].nonreportable_payments!;
}
function funding(g: G) {
  return g.hsa_accounts.claim.excess_returns.contribution_sources;
}
function repayment(g: G) {
  return funding(g).claim.accounts[0].receipts.find((r) =>
    r.kind === "mistaken_distribution_repayment"
  )!;
}
async function rejects(g: G, message: string) {
  const r = await executeDraftSources2026(g);
  assert(
    r.diagnostics.some((d) => d.message.includes(message)),
    JSON.stringify(r.diagnostics),
  );
}

Deno.test("2026 HSA direct transfers and repaid mistakes stay out of contribution and distribution totals", async () => {
  const g = hsaNonreportableGraph2026(),
    before = structuredClone(g),
    { h, p, f } = await run(g);
  assertEquals(g, before);
  const l = h.owners[0].form8889;
  assertEquals([
    l.line2,
    l.line9,
    l.line10,
    l.line13,
    l.line14a,
    l.line14b,
    l.line14c,
    l.line15,
    l.line16,
    l.line17b,
  ], [4000, 1000, 1000, 2400, 2630, 1130, 1500, 500, 1000, 200]);
  assertEquals([p.schedule1.line8f_hsa_income, p.f1040.line23_other_taxes], [
    1000,
    305,
  ]);
  assertEquals(f.nonreportable.map((v) => [v.kind, v.amount, v.received_on]), [
    ["trustee_transfer", 1250.25, "2026-06-12"],
    ["mistaken_distribution", 400.35, "2026-11-15"],
  ]);
  assertEquals(f.nonreportable[1].repayment_due_on, "2027-04-15");
  assertEquals(f.rollovers.length, 1);
  assertEquals(
    f.source_input.claim.accounts[1].form5498sa.box4_calendar_year_rollovers,
    0,
  );
});
Deno.test("2026 HSA nonreportable-only activity creates no deduction income excise tax or Form 8889", async () => {
  const { h, f } = await run(onlyNonreportableHsaGraph2026());
  assertEquals(f.nonreportable.length, 2);
  assertEquals(h.owners[0].file_form8889, false);
  assertEquals([
    h.owners[0].form8889.line13,
    h.owners[0].form8889.line14a,
    h.owners[0].form8889.line14b,
    h.owners[0].form8889.line16,
    h.owners[0].form8889.line17b,
  ], [0, 0, 0, 0, 0]);
});
Deno.test("2026 HSA corrected gross reconciles both excluded debits without reducing line 14b twice", async () => {
  for (const crossYear of [false, true]) {
    const { h, f } = await run(hsaNonreportableGraph2026(true, crossYear));
    assertEquals(h.owners[0].form8889.line14a, 2630);
    assertEquals(h.owners[0].form8889.line14b, 1130);
    assertEquals(
      f.nonreportable[1].received_on,
      crossYear ? "2027-04-15" : "2026-11-15",
    );
    assertEquals(
      h.calculation.annual_sources.medical_sources.distribution_sources
        .retired_copy_references,
      ["1099sa"],
    );
  }
});
Deno.test("2026 HSA mistake repayment accepts the ordinary deadline and rejects a day late", async () => {
  const g = hsaNonreportableGraph2026(false, true);
  await run(g);
  repayment(g).received_on = "2027-04-16";
  const p = debit(g)[1];
  if (p.kind !== "mistaken_distribution") throw Error();
  p.custodian_accepted_on = "2027-04-16";
  await rejects(g, "timely accepted");
});
Deno.test("2026 HSA repayment deadline follows first knowledge and the weekend holiday rule", async () => {
  const g = hsaNonreportableGraph2026(false, true), p = debit(g)[1];
  if (p.kind !== "mistaken_distribution") throw Error();
  p.first_knew_or_should_have_known_on = "2027-01-01";
  p.representation_signed_on = "2027-01-02";
  assertEquals(
    (await run(g)).f.nonreportable[1].repayment_due_on,
    "2028-04-18",
  );
});
Deno.test("2026 HSA direct transfer is independent of the annual rollover and 60-day rules", async () => {
  const g = hsaNonreportableGraph2026();
  const r = funding(g).claim.accounts[1].receipts[0];
  r.received_on = "2026-12-01";
  assertEquals((await run(g)).f.nonreportable[0].received_on, "2026-12-01");
});
Deno.test("2026 HSA direct transfer reconciles a December debit with a January receipt", async () => {
  const g = hsaNonreportableGraph2026();
  debit(g)[0].distributed_on = "2026-12-30";
  funding(g).claim.accounts[1].receipts[0].received_on = "2027-01-03";
  const { h, f } = await run(g);
  assertEquals(h.owners[0].form8889.line14a, 2630);
  assertEquals(f.nonreportable[0].received_on, "2027-01-03");
});
Deno.test("2026 HSA nonreportable labels alone cannot establish tax treatment", async () => {
  const g = hsaNonreportableGraph2026();
  delete funding(g).nonreportable_review;
  await rejects(g, "tax-treatment reconciliation");
  const empty = hsaNonreportableGraph2026();
  debit(empty).splice(0, 1);
  assert((await executeDraftSources2026(empty)).diagnostics.length > 0);
});
Deno.test("2026 HSA nonreportable reconciliation rejects omitted duplicate and mismatched receipts", async () => {
  const changes: Array<(g: G) => void> = [
    (g) => {
      funding(g).claim.accounts[1].receipts = [];
    },
    (g) => {
      funding(g).claim.accounts[1].receipts[0].amount += .01;
    },
    (g) => {
      repayment(g).source_account_or_payment_reference = "invented-debit";
    },
    (g) => {
      repayment(g).received_on = "2026-09-30";
    },
    (g) => {
      debit(g).push({
        ...debit(g)[0],
        record_reference: "second-debit",
        custodian_transaction_identifier: "second-txn",
      });
    },
    (g) => {
      funding(g).claim.accounts[1].receipts.push({
        ...funding(g).claim.accounts[1].receipts[0],
        record_reference: "unused-receipt",
        custodian_transaction_identifier: "unused-txn",
      });
    },
  ];
  for (const change of changes) {
    const g = hsaNonreportableGraph2026();
    change(g);
    assert((await executeDraftSources2026(g)).diagnostics.length > 0);
  }
});
Deno.test("2026 HSA transfers reject MSA and same-account routes without fabricating their source treatment", async () => {
  const msa = hsaNonreportableGraph2026(),
    r = funding(msa).claim.accounts[1].receipts[0];
  if (r.kind !== "trustee_transfer") throw Error();
  r.originating_account_type = "archer_msa";
  await rejects(msa, "distinct same-beneficiary HSA accounts");
  const same = hsaNonreportableGraph2026(), f = funding(same);
  f.claim.accounts[0].receipts.push(...f.claim.accounts[1].receipts);
  f.claim.accounts[1].receipts = [];
  await rejects(same, "distinct same-beneficiary HSA accounts");
});
Deno.test("2026 HSA mistake evidence rejects impossible knowledge representation and acceptance dates", async () => {
  for (
    const key of [
      "first_knew_or_should_have_known_on",
      "representation_signed_on",
      "custodian_accepted_on",
    ] as const
  ) {
    for (const date of ["2026-01-01", "2027-12-31"]) {
      const g = hsaNonreportableGraph2026(), p = debit(g)[1];
      if (p.kind !== "mistaken_distribution") throw Error();
      p[key] = date;
      await rejects(g, "timely accepted");
    }
  }
});
Deno.test("2026 HSA reportable and nonreportable payments cannot share actual custodian transactions", async () => {
  const g = hsaNonreportableGraph2026();
  debit(g)[0].custodian_transaction_identifier =
    g.hsa_accounts.claim.claim.accounts[0].payments[0]
      .custodian_transaction_identifier;
  await rejects(g, "duplicates a ledger transaction");
});
Deno.test("2026 HSA nonreportable corrections reject wrong lineage stale copies and unexplained gross differences", async () => {
  const changes: Array<(g: G) => void> = [
    (g) => {
      g.hsa_accounts.claim.claim.copies.find((f) =>
        f.source_document_reference === "1099sa"
      )!.box1_gross_distribution += 1;
    },
    (g) => {
      g.hsa_accounts.claim.claim.copies.find((f) =>
        f.source_document_reference === "1099sa-corrected"
      )!.issued_on = "2027-02-01";
    },
    (g) => {
      const r = debit(g)[0].reporting;
      if (r.kind === "corrected") {
        r.original_form1099sa_source_reference = "invented-statement";
      }
    },
  ];
  for (const change of changes) {
    const g = hsaNonreportableGraph2026(true, true);
    change(g);
    assert((await executeDraftSources2026(g)).diagnostics.length > 0);
  }
});
Deno.test("2026 HSA nonreportable payments cannot fund medical or rollover exclusions", async () => {
  const medical = hsaNonreportableGraph2026();
  medical.hsa_accounts.claim.medical_expenses[0].allocations[0]
    .distribution_payment_reference = "mistake-debit";
  assert((await executeDraftSources2026(medical)).diagnostics.length > 0);
  const rollover = hsaNonreportableGraph2026();
  funding(rollover).rollover_review!.rollovers[0]
    .distribution_payment_reference = "direct-transfer-debit";
  await rejects(rollover, "actual payout");
});
Deno.test("2026 HSA nonreportable sources bind actual public inventory and reject forged standalone replay", async () => {
  const g = hsaNonreportableGraph2026();
  const forged = structuredClone(g);
  Object.assign(funding(forged), { nonreportable_distribution_sources: {} });
  assertEquals(
    sourceRegistry2026.hsa_accounts.inputSchema.safeParse(forged.hsa_accounts)
      .success,
    false,
  );
  const { h } = await run(g);
  // Test the actual medical workpaper retained under the annual calculation.
  const medical = structuredClone(
    h.calculation.annual_sources.medical_sources.source_input,
  );
  delete medical.excess_returns;
  assertThrows(
    () => calculateHsaMedicalDistributions2026(medical),
    Error,
    "linked annual funding",
  );
});
