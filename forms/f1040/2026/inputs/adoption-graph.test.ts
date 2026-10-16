import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { adoptionGraphFixture2026 } from "./adoption-graph.fixture.ts";
import { socialSecurityGraphFixture2026 } from "./social-security.fixture.ts";
import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
function run(raw: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    raw,
    ctx,
  );
}
function complete(raw: Record<string, unknown>) {
  const r = run(raw);
  assertEquals(r.diagnostics, []);
  assert(Number.isSafeInteger(r.pending.f1040.line37_amount_owed));
  return r.pending;
}
Deno.test("2026 public adoption source binds actual W-2, filer and dependent records through final settlement", () => {
  const input = adoptionGraphFixture2026(),
    before = structuredClone(input),
    p = complete(input);
  assertEquals(p.f1040.line1a_wages, 50000);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 0);
  assertEquals(p.f1040.line11b_agi, 50000);
  assertEquals(p.f1040.line19_child_tax_credit, 500);
  assertEquals(p.f1040.line28_actc, 1700);
  assertEquals(p.f1040.line30_refundable_adoption, 5120);
  assertEquals(
    p.f1040.line20_nonrefundable_credits,
    Number(p.f1040.line18_total_tax_before_credits) - 500,
  );
  assertEquals(p.f1040.line24a_total_tax, 0);
  assertEquals(input, before);
});
Deno.test("2026 public adoption source requires code T evidence and rejects entered MAGI and line totals", () => {
  const input = adoptionGraphFixture2026();
  const { form8839: _missing, ...missing } = input;
  assert(
    run(missing).diagnostics.some((d) => d.message.includes("source review")),
  );
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...input,
      form8839: { ...input.form8839, wage_sources: input.w2s },
    })
  );
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...input,
      form8839: { ...input.form8839, magi: 0 },
    })
  );
  const child = input.form8839.claim.children[0];
  child.date_of_birth = "2020-01-01";
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("actual dependent source")
    ),
  );
});
Deno.test("2026 special-needs negative wages complete through ordinary source consumers and EIC", () => {
  const input = adoptionGraphFixture2026(10000, 0, true),
    eic = eicGraphFixture2026(10000);
  const p = complete({
    ...input,
    general: {
      ...input.general,
      do_not_claim_eic: false,
      main_home_in_us_over_half_year: true,
    },
    eitc: eic.eitc,
  });
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, -17670);
  assertEquals(p.f1040.line1z_total_wages, -7670);
  assertEquals(p.f1040.line11b_agi, -7670);
  assertEquals(p.f1040.line27a_eic, 0);
  assertEquals(p.f1040.line28_actc, 0);
  assertEquals(p.f1040.line30_refundable_adoption, 5120);
});
Deno.test("2026 Social Security adoption review identifies the actual exclusion source", () => {
  const input = adoptionGraphFixture2026(26000),
    ssa = socialSecurityGraphFixture2026(26000).ssa1099;
  const r = run({ ...input, ssa1099: ssa });
  assert(
    r.diagnostics.some((d) => d.message.includes("actual exclusion source")),
  );
  const { no_adoption_benefit_exclusion: _old, ...review } =
    ssa.worksheet_scope_review;
  const claim = {
    ...ssa,
    worksheet_scope_review: {
      ...review,
      adoption_inventory_reference: input.form8839.claim.record_reference,
    },
  };
  const p = complete({ ...input, ssa1099: claim });
  assertEquals(p.f1040.line6b_ss_taxable, 5350);
  assertEquals(p.f1040.line11b_agi, 31350);
  claim.worksheet_scope_review.adoption_inventory_reference = "wrong-case";
  assert(
    run({ ...input, ssa1099: claim }).diagnostics.some((d) =>
      d.message.includes("actual exclusion source")
    ),
  );
});
Deno.test("2026 adoption without employer benefits works without wage sources", () => {
  const input = adoptionGraphFixture2026(50000, 0);
  input.form8839.claim.programs = [];
  const p = complete({ ...input, w2s: [] });
  assertEquals(p.f1040.line1z_total_wages, 0);
  assertEquals(p.f1040.line30_refundable_adoption, 5120);
  assertEquals(p.f1040.line20_nonrefundable_credits, 0);
});
Deno.test("2026 care accepts reconciled excluded benefits and rejects unresolved adoption wage adjustments", () => {
  const input = adoptionGraphFixture2026(), care = dependentCareFixture2026();
  input.general.dependents[0].dob = care.general.dependents[0].dob;
  input.form8839.claim.children[0].date_of_birth =
    care.general.dependents[0].dob;
  const combined = { ...input, form2441: care.form2441 };
  complete(combined);
  input.form8839.claim.children[0].origin = "foreign";
  input.form8839.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "pending-foreign-adoption",
  };
  assert(
    run(combined).diagnostics.some((d) =>
      d.message.includes("Form 2441 needs reconciliation")
    ),
  );
});
Deno.test("2026 education preserves adult adoption claims and requires under-24 compensation reconciliation", () => {
  const input = adoptionGraphFixture2026(), education = educationFixture2026();
  const combined = { ...input, f8863: education.f8863 };
  complete(combined);
  input.general.taxpayer_dob = "2005-01-02";
  assert(
    run(combined).diagnostics.some((d) =>
      d.message.includes(
        "Adoption support review needs the actual adoption inventory",
      )
    ),
  );
});
