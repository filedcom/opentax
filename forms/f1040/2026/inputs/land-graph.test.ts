import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import type { calculateLandReturn2026 } from "../nodes/land-dispositions.ts";
import type { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { capitalSale2026 } from "./capital.fixture.ts";

const run = (f: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, f, {
    taxYear: 2026,
    formType: "f1040",
  });
Deno.test("2026 land graph posts capital and ordinary gain once with one combined QBI owner", () => {
  const r = run(landGraphFixture2026());
  assertEquals(r.diagnostics, []);
  const p = r.pending;
  assertEquals(p.f1040.line7a_capital_gain, 40000);
  assertEquals(p.schedule1.line4_other_gains, 5000);
  assertEquals(p.schedule1.line3_schedule_c, 10000);
  assertEquals(p.f1040.line11b_agi, 94293);
  assertEquals(p.f1040.line13b_qbi, 2859);
  assertEquals(p.capital_gains.calculation_2026, undefined);
  const c = (p.land_dispositions.calculation_2026 as ReturnType<
    typeof calculateLandReturn2026
  >).calculation!;
  assertEquals(c.rows.map((r) => r.qbi), [9293, 5000]);
});
Deno.test("2026 land loss graph allocates mixed losses before finalizing history and QBI", () => {
  const r = run(landGraphFixture2026(-400000, [-200000], 400000));
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.schedule1.line8p_excess_business_loss, 344000);
  assertEquals(r.pending.f1040.line11b_agi, 144000);
  const c = (r.pending.land_dispositions.calculation_2026 as ReturnType<
    typeof calculateLandReturn2026
  >).calculation!;
  assertEquals(c.qbi, -256000);
  assertEquals(c.land.loss.finalized_loss!.amount_taken_into_account, 170667);
});
Deno.test("2026 land-only graph includes ordinary QBI without a Schedule C source", () => {
  const r = run(landGraphFixture2026(45000, [], 40000));
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line11b_agi, 85000);
  assertEquals(r.pending.f1040.line13b_qbi, 1000);
});
Deno.test("2026 land graph rejects missing inventories, conflicting reviews and calculated overrides", () => {
  const f = landGraphFixture2026();
  for (
    const bad of [
      { ...f, land_dispositions: undefined },
      { ...f, capital_gains: undefined },
      {
        ...f,
        land_dispositions: {
          claim: { ...f.land_dispositions.claim, finalized_loss: 1 },
        },
      },
      {
        ...f,
        schedule_c: {
          claim: {
            ...f.schedule_c!.claim,
            qbi_review: {
              ...f.schedule_c!.claim.qbi_review,
              linked_land_qbi_inventory_reference: "other-land",
            },
          },
        },
      },
      {
        ...f,
        schedule_c: {
          claim: {
            ...f.schedule_c!.claim,
            qbi_review: {
              ...f.schedule_c!.claim.qbi_review,
              no_current_qbi_sources_other_than_listed_businesses: true,
            },
          },
        },
      },
    ]
  ) assert(run(bad).diagnostics.length > 0);
});

Deno.test("2026 land graph separates nonpassive land from investment gains in NIIT", () => {
  const f = landGraphFixture2026(45000, [], 155000);
  const sale = capitalSale2026("investment");
  f.capital_gains.claim.sales = [sale];
  const r = run(f);
  assertEquals(r.diagnostics, []);
  const niit = r.pending.form8960.calculation_2026 as ReturnType<
    typeof calculateForm8960_2026
  >;
  assertEquals(niit.shared_input.line5b_net_gain_adjustment, -45000);
  assertEquals(niit.shared_input.line5a_net_gain, 45200);
  assertEquals(niit.source_input.ordinary_disposition_gain_from_agi, 5000);
  assertEquals(niit.file_form8960, true);
  assert(niit.tax > 0);
});

Deno.test("2026 land graph retains advanced loss, child-tax and EIC boundaries", () => {
  const farm = landGraphFixture2026(-400000, [], 400000);
  farm.land_dispositions.claim.loss_allocation_review.land_activities[0]
    .farming_business = true;
  assert(run(farm).diagnostics.some((d) => d.message.includes("Form 172")));
  const child = landGraphFixture2026();
  assert(
    run({ ...child, general: { ...child.general, taxpayer_dob: "2010-06-01" } })
      .diagnostics.some((d) => d.message.includes("child-tax")),
  );
  const eic = landGraphFixture2026(1000, [], 1000);
  assert(
    run({ ...eic, general: { ...eic.general, do_not_claim_eic: false } })
      .diagnostics.some((d) => d.message.includes("EIC needs")),
  );
  assert(
    run(landGraphFixture2026(-400000, [], 0)).diagnostics.some((d) =>
      d.message.includes("NOL/carryover")
    ),
  );
});
