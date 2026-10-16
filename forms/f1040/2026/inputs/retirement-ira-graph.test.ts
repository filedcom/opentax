import { assert, assertEquals, assertRejects } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { retirementIraGraph2026 } from "./retirement-ira.fixture.ts";
import { syntheticSocialSecurity2026 } from "./social-security.fixture.ts";
import { businessQbiFixture2026 } from "./business-qbi.fixture.ts";

Deno.test("2026 annual IRA source graph carries actual wages, taxable income, early tax and basis through settlement", async () => {
  const graph = retirementIraGraph2026(true);
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line4a_ira_gross, 16000);
  assertEquals(r.pending.f1040.line4b_ira_taxable, 14800);
  assertEquals(r.pending.f1040.line11b_agi, 54800);
  assertEquals(r.pending.f1040.line25b_withheld_1099, 1000);
  assertEquals(r.pending.schedule2.line5_form5329_early_tax, 555);
  assertEquals(r.pending.f1040.line23_other_taxes, 555);
  const calc = r.pending.f1099r.calculation_2026 as {
    ira_basis: {
      compensation: { own_eligible_compensation: number }[];
      calculation: { forms: { carryforward_2027: { amount: number } }[] };
    };
  };
  assertEquals(calc.ira_basis.compensation[0].own_eligible_compensation, 40000);
  assertEquals(
    calc.ira_basis.calculation.forms[0].carryforward_2027.amount,
    2800,
  );
});

Deno.test("2026 annual IRA basis changes taxable Social Security through actual AGI", async () => {
  const graph = retirementIraGraph2026();
  Object.assign(graph.general, { do_not_claim_eic: true });
  graph.w2s[0].box1_wages = 2000;
  const { filing_status: _s, taxpayer_ssn: _tin, ...ssa } =
    syntheticSocialSecurity2026();
  ssa.statements[0].recipient_tin = graph.general.taxpayer_ssn;
  const r = await executeDraftSources2026({ ...graph, ssa1099: ssa });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line6a_ss_gross, 10000);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(r.pending.f1040.line11b_agi, 16800);
});

Deno.test("2026 IRA graph derives contribution compensation from executed business sources when wages are absent", async () => {
  const graph = retirementIraGraph2026();
  const b = businessQbiFixture2026();
  b.taxpayer_tin = graph.general.taxpayer_ssn;
  b.businesses[0].owner_tin = graph.general.taxpayer_ssn;
  const { filing_status: _s, taxpayer_tin: _tin, w2s: _w, ...claim } = b;
  const e = graph.f1099r.claim.ira_basis!.owners[0].nondeductible_election!;
  e.wage_document_references = [];
  e.business_inventory_reference = b.record_reference;
  e.personal_service_business_references = ["consulting"];
  const r = await executeDraftSources2026({
    ...graph,
    w2s: [],
    schedule_c: { claim },
  });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line4b_ira_taxable, 14800);
  assertEquals(r.pending.f1040.line11b_agi, 24093);
});

Deno.test("2026 IRA graph rejects caller compensation or missing executed wage income", async () => {
  const graph = retirementIraGraph2026();
  const missing = await executeDraftSources2026({ ...graph, w2s: [] });
  assert(missing.diagnostics.some((d) => d.nodeType === "f1099r"));
  Object.assign(
    graph.f1099r.claim.ira_basis!.owners[0].nondeductible_election!,
    { own_eligible_compensation: 999999 },
  );
  await assertRejects(() => executeDraftSources2026(graph));
});
