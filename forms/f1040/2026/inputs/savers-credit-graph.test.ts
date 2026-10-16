import { assert, assertEquals, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { saverGraph2026 } from "./savers-credit-graph.fixture.ts";
import type { calculateSaversCredit2026 } from "./savers-credit-source.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { energyClaimFixture2026 } from "./energy.fixture.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { calculateForm1062Tax2026 } from "./form1062-tax.ts";

Deno.test("2026 saver graph binds actual wages and capped tax before child credits", async () => {
  for (const children of [0, 1]) {
    const g = saverGraph2026(24000, children),
      r = await executeDraftSources2026(g);
    assertEquals(r.diagnostics, []);
    const saver = r.pending.form8880.calculation_2026 as ReturnType<
      typeof calculateSaversCredit2026
    >;
    const child = r.pending.f8812.calculation_2026 as ReturnType<
      typeof calculateChildCredit2026
    >;
    assertEquals(saver.columns[0].line2, 2000);
    assertEquals(saver.lines.line8, r.pending.f1040.line11b_agi);
    assertEquals(
      saver.lines.line12,
      r.pending.f1040.line18_total_tax_before_credits,
    );
    assertEquals(
      child.source_input.finalized_savers_credit,
      saver.lines.line12,
    );
    assertEquals(child.lines?.line14 ?? 0, 0);
    assertEquals(
      r.pending.schedule3_final.line4_retirement_savings_credit,
      saver.lines.line12,
    );
    assertEquals(
      r.pending.f1040.line20_nonrefundable_credits,
      saver.lines.line12,
    );
    if (children) assert((child.lines?.line27 ?? 0) > 0);
  }
});
Deno.test("2026 saver graph refuses caller totals and stale owner or competing-credit reviews", async () => {
  const base = saverGraph2026(24000, 1);
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...base,
      form8880: { ...base.form8880, agi: 1, finalized_tax: { line18: 99999 } },
    })
  );
  for (
    const mutate of [
      (g: ReturnType<typeof saverGraph2026>) => {
        g.form8880.claim.owners[0].owner_tin = "999887777";
      },
      (g: ReturnType<typeof saverGraph2026>) => {
        g.f8812.savers_inventory_reference = "different";
      },
      (g: ReturnType<typeof saverGraph2026>) => {
        Object.assign(g.f8812, {
          no_nonrefundable_credits_other_than_dependent_care_and_education:
            true,
        });
      },
    ]
  ) {
    const g = structuredClone(base);
    mutate(g);
    assert((await executeDraftSources2026(g)).diagnostics.length > 0);
  }
});
Deno.test("2026 saver credit consumes tax before energy carryforward and requires linked inventory", async () => {
  const b = saverGraph2026(30000, 1), e = energyClaimFixture2026(8000);
  const {
    no_nonrefundable_credits_other_than_child_dependent_care_and_education:
      _old,
    ...claim
  } = e.claim;
  const g = {
    ...b,
    f5695: {
      claim: {
        ...claim,
        savers_inventory_reference: b.form8880.claim.record_reference,
        no_nonrefundable_credits_other_than_reviewed_sources: true as const,
      },
    },
    f8812: { ...b.f8812, energy_inventory_reference: claim.record_reference },
  };
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  const c = r.pending.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.source_input.finalized_savers_credit, 200);
  assertEquals(c.energy_credit?.tax_limit_worksheet.earlier_credits, 200);
  assertEquals(c.energy_credit?.lines.line3, 723);
  assertEquals(c.energy_credit?.carryforward_2027.amount, 7277);
  g.f5695.claim.savers_inventory_reference = "stale";
  assert((await executeDraftSources2026(g)).diagnostics.length > 0);
});
Deno.test("2026 Form 1062 replays saver tax capacity with actual AGI and rejects stale sources", () => {
  const g = {
    ...landGraphFixture2026(5000, [], 24000),
    ...saverGraph2026(24000),
  };
  const { input } = form1062TaxFixture2026(g);
  const r = calculateForm1062Tax2026(input);
  assertEquals(r.actual.credits.savers?.lines.line12, 200);
  assertEquals(
    r.without_elected_gain.credits.savers?.lines.line8,
    input.return_lines.line11b_agi,
  );
  assertEquals(
    r.without_elected_gain.credits.savers?.source_input.finalized_tax.line18,
    r.without_elected_gain.income.line16IncomeTax +
      r.without_elected_gain.amt.lines.line11,
  );
  for (
    const mutate of [
      (x: typeof input) => {
        x.savers!.agi++;
      },
      (x: typeof input) => {
        x.savers!.wage_sources[0].box12_entries![0].amount++;
      },
      (x: typeof input) => {
        x.savers!.finalized_tax.schedule3_line2++;
      },
      (x: typeof input) => {
        x.child.finalized_savers_credit++;
      },
      (x: typeof input) => {
        x.review.savers_inventory_reference = "stale";
      },
    ]
  ) {
    const bad = structuredClone(input);
    mutate(bad);
    assertThrows(() => calculateForm1062Tax2026(bad));
  }
});
