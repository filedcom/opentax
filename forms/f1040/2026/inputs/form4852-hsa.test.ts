import { assert, assertEquals, assertThrows } from "@std/assert";
import { form4852HsaGraph2026 as fixture } from "./form4852-hsa.fixture.ts";
import { hsaGraph2026 } from "./hsa-graph.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { calculateHsaReturnSources2026 } from "./hsa-source.ts";
import { reconcileHsaQualifiedFunding2026 } from "./hsa-qualified-funding.ts";
async function run(g = fixture()) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    h: r.pending.hsa_accounts.calculation_2026 as ReturnType<
      typeof calculateHsaReturnSources2026
    >,
    r: r.pending.f1099r.calculation_2026 as ReturnType<
      typeof calculateRetirementSources2026
    >,
  };
}
Deno.test("2026 Form 4852 IRA HSA funding reuses ordinary qualification and annual basis settlement", async () => {
  const { p, h, r } = await run();
  const issued = await executeDraftSources2026(hsaGraph2026(true));
  assertEquals(issued.diagnostics, []);
  assertEquals(p.f1040, issued.pending.f1040);
  assertEquals([
    p.f1040.line4a_ira_gross,
    p.f1040.line4b_ira_taxable,
    p.f1040.line4c_other_text,
  ], [1500, 450, "HFD"]);
  assertEquals(h.owners[0].form8889.line10, 1000);
  const f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.carryforward_2027?.amount, 150);
  assertEquals(f.hsa_basis_preservation?.[0].basis_consumed, 0);
  assertEquals(f.raw_qualified_hsa_funding, 1000);
  assertEquals(f.raw_withdrawn, 500);
  const a = h.contribution_sources.qualified_funding_review!.ira_accounts[0];
  assertEquals(a.form4852_source_reference, "ira-copy");
  assertEquals(a.current_issued_copy_after_corrections_verified, undefined);
});
Deno.test("2026 HSA substitute references cannot invent an issuer copy or omit the actual Form 4852", async () => {
  const { h } = await run();
  const raw = structuredClone(h.source_input);
  delete raw.form4852_sources_2026;
  assertThrows(
    () => calculateHsaReturnSources2026(raw),
    Error,
    "actual Form 4852",
  );
  const f = structuredClone(h.contribution_sources);
  f.qualified_funding_review!.ira_accounts[0]
    .current_issued_copy_after_corrections_verified = true;
  assertThrows(
    () => reconcileHsaQualifiedFunding2026(f),
    Error,
    "actual Form 4852 copy",
  );
  delete f.qualified_funding_review!.ira_accounts[0]
    .current_issued_copy_after_corrections_verified;
  f.qualified_funding_review!.ira_accounts[0].form1099r
    .box1_gross_distribution = 1600;
  assertThrows(
    () => reconcileHsaQualifiedFunding2026(f),
    Error,
    "actual Form 4852 copy",
  );
});
Deno.test("2026 substitute HSA funding requires exact dated payments and actual account evidence", async () => {
  const edits: Array<(g: ReturnType<typeof fixture>) => void> = [
    (g) =>
      g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.substitute_ira_accounts![0].payments[0]
        .paid_on = "2026-06-02",
    (g) =>
      g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.substitute_ira_accounts![0].payments[1]
        .paid_on = "2026-09-02",
    (g) =>
      g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.substitute_ira_accounts![0]
        .form4852_source_reference = "missing",
    (g) =>
      g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.substitute_ira_accounts![0].trustee_tin =
          "123456780",
    (g) =>
      g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.reviewed_on = "2027-03-01",
    (g) => {
      const a = g.hsa_accounts.claim.excess_returns.contribution_sources
        .qualified_funding_review!.substitute_ira_accounts![0];
      a.payments[0].gross_amount--;
      a.payments[1].gross_amount++;
    },
    (g) => {
      const p =
        g.f1099r!.claim.ira_basis!.owners[0].statement_payment_ledgers![0]
          .payments[0];
      p.cash_paid_to_owner = 1000;
      delete p.hsa_receipt_reference;
    },
  ];
  for (const edit of edits) {
    const g = fixture();
    edit(g);
    assert((await executeDraftSources2026(g)).diagnostics.length > 0);
  }
});
Deno.test("2026 substitute HSA funding retains current testing-period income and tax after a coverage loss", async () => {
  const g = fixture(),
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
  const { h, p } = await run(g);
  assertEquals(h.owners[0].form8889.line19, 1000);
  assertEquals(p.f1040.line4b_ira_taxable, 450);
});
Deno.test("2026 HSA-only substitute preserves IRA basis without an ordinary withdrawal or Form 8606", async () => {
  const g = fixture(), s = g.f4852.claim.records[0], r = g.f1099r!.claim;
  if (s.kind !== "1099r") throw Error();
  s.amounts.gross_distribution = 1000;
  s.distribution_sources.pop();
  g.hsa_accounts.claim.excess_returns.contribution_sources
    .qualified_funding_review!.substitute_ira_accounts![0].payments.pop();
  r.ira_basis!.owners[0].statement_payment_ledgers![0].payments.pop();
  delete r.reviews[0].early_distribution;
  const { p, r: result } = await run(g),
    f = result.ira_basis!.calculation.forms[0];
  assertEquals([p.f1040.line4a_ira_gross, p.f1040.line4b_ira_taxable], [
    1000,
    0,
  ]);
  assertEquals(f.requires_form8606, false);
  assertEquals(f.carryforward_2027?.amount, 200);
  assertEquals(result.line5_early_tax, 0);
});
