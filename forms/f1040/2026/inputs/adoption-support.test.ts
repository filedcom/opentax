import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { adoptionEducationFixture2026 } from "./adoption-support.fixture.ts";
import { childTaxFixture2026 } from "./child-tax.fixture.ts";
import type { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import type { resolveChildTax2026 } from "./child-tax.ts";
import { adoptionSupportWages2026 } from "./adoption-support.ts";
import { FilingStatus } from "../../nodes/types.ts";
function run(raw: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    raw,
    { taxYear: 2026, formType: "f1040" },
  );
}
function complete(raw: Record<string, unknown>) {
  const r = run(raw);
  assertEquals(r.diagnostics, []);
  assert(Number.isSafeInteger(r.pending.f1040.line37_amount_owed));
  return r.pending;
}

function education(p: ReturnType<typeof complete>) {
  return p.f8863.calculation_2026 as ReturnType<
    typeof calculateEducationCredit2026
  >;
}
function child(p: ReturnType<typeof complete>) {
  return p.f8615.calculation_2026 as ReturnType<typeof resolveChildTax2026>;
}
Deno.test("2026 adoption support uses paid compensation without adding excluded benefits to AGI", () => {
  const input = adoptionEducationFixture2026(),
    before = structuredClone(input),
    p = complete(input),
    e = education(p);
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 14000);
  assertEquals(
    e.earned_income_workpaper?.adoption?.current_adoption_compensation,
    4000,
  );
  assertEquals(p.f1040.line11b_agi, 10000);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 0);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  assertEquals(p.f1040.line30_refundable_adoption, 5120);
  assertEquals(input, before);
  const review = input.f8863.claim.refundable_review;
  assert(review.kind === "under24_nonjoint");
  review.support_records[0].amount = 28000.01;
  assertEquals(complete(input).f1040.line29_refundable_aotc, 0);
});
Deno.test("2026 special-needs exclusion restores actual support wages without manufacturing compensation", () => {
  const input = adoptionEducationFixture2026(true),
    review = input.f8863.claim.refundable_review;
  assert(review.kind === "under24_nonjoint");
  review.support_records[0].amount = 19000;
  const p = complete(input), e = education(p);
  assertEquals(p.f1040.line1z_total_wages, -7670);
  assertEquals(p.f1040.line11b_agi, -7670);
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 10000);
  assertEquals(
    e.earned_income_workpaper?.adoption?.current_adoption_compensation,
    0,
  );
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  delete input.form8839.claim.programs[0].personal_services_review;
  assertEquals(
    education(complete(input)).earned_income_workpaper
      ?.earned_income_for_support,
    10000,
  );
});
Deno.test("2026 taxable pending foreign benefits are counted once in support compensation", () => {
  const input = adoptionEducationFixture2026();
  input.form8839.claim.children[0].origin = "foreign";
  input.form8839.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "pending-foreign",
  };
  const p = complete(input), e = education(p);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 4000);
  assertEquals(p.f1040.line11b_agi, 14000);
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 14000);
  assertEquals(
    e.earned_income_workpaper?.adoption?.wages_before_adoption_adjustment,
    10000,
  );
});
Deno.test("2026 support compensation sums actual benefit payments before rounding", () => {
  const input = adoptionEducationFixture2026();
  const ch = input.form8839.claim.children[0];
  const first = ch.current_benefits[0];
  first.amount = 2000.49;
  first.expense_allocations[0].amount = 2000.49;
  ch.current_benefits.push({
    ...structuredClone(first),
    record_reference: "second-employer-payment",
  });
  input.w2s[0].box12_entries[0].amount = 4000.98;
  const e = education(complete(input));
  assertEquals(e.earned_income_workpaper?.adoption?.payments.length, 2);
  assertEquals(
    e.earned_income_workpaper?.adoption?.current_adoption_compensation,
    4001,
  );
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 14001);
});
Deno.test("2026 adoption support requires actual inventory, employer evidence and return ownership", () => {
  const input = adoptionEducationFixture2026(),
    p = complete(input),
    e = education(p);
  assert(e.earned_income_workpaper?.adoption);
  const a = e.earned_income_workpaper.adoption.adoption,
    bridge = { source: a.source_input, income: a.income };
  assertThrows(
    () =>
      adoptionSupportWages2026(
        bridge,
        {
          filing_status: a.source_input.filing_status,
          taxpayer_ssn: "987654321",
        },
        10000,
        a.source_input.claim.record_reference,
      ),
    Error,
    "actual return owners",
  );
  assertThrows(
    () =>
      adoptionSupportWages2026(
        bridge,
        a.source_input,
        9999,
        a.source_input.claim.record_reference,
      ),
    Error,
    "actual issued wages",
  );
  input.f8863.claim.adoption_inventory_reference = "wrong-review";
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("actual adoption inventory")
    ),
  );
  input.f8863.claim.adoption_inventory_reference =
    input.form8839.claim.record_reference;
  delete input.form8839.claim.programs[0].personal_services_review;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("employer personal-services review")
    ),
  );
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...input,
      f8863: { ...input.f8863, adoption_income_2026: bridge },
    })
  );
});
Deno.test("2026 child-tax support compensation stays separate from taxable unearned income and reconciles education", () => {
  const input = adoptionEducationFixture2026(),
    c = childTaxFixture2026(10000, 10000);
  c.f8615.claim!.adoption_inventory_reference =
    input.form8839.claim.record_reference;
  c.f8615.claim!.support_records[0].amount = 26000;
  const combined = {
    ...input,
    f8615: c.f8615,
    investment_income: c.investment_income,
  };
  let p = complete(combined), k = child(p);
  assertEquals(k.eligibility?.earned_income_for_support, 14000);
  assertEquals(k.eligibility?.gross_unearned_income, 10000);
  assertEquals(k.eligibility?.line1_unearned_income, 10000);
  assertEquals(k.eligibility?.applies, false);
  assertEquals(
    education(p).earned_income_workpaper?.earned_income_for_support,
    14000,
  );
  c.f8615.claim!.support_records[0].amount = 30000;
  assert(
    run(combined).diagnostics.some((d) =>
      d.message.includes("same filer, school, support")
    ),
  );
  const review = input.f8863.claim.refundable_review;
  assert(review.kind === "under24_nonjoint");
  review.support_records[0].amount = 30000;
  p = complete(combined);
  k = child(p);
  assertEquals(k.eligibility?.applies, true);
  assertEquals(k.eligibility?.line1_unearned_income, 10000);
  assertEquals(p.f1040.line29_refundable_aotc, 0);
});
Deno.test("2026 negative adoption wages preserve child unearned income and taxable dependent deduction", () => {
  const input = adoptionEducationFixture2026(true),
    c = childTaxFixture2026(10000, 15000);
  const { f8863: _omit, ...base } = input;
  c.f8615.claim!.adoption_inventory_reference =
    input.form8839.claim.record_reference;
  const p = complete({
    ...base,
    general: {
      ...base.general,
      taxpayer_can_be_claimed_as_dependent: true,
      dependents: [],
    },
    f8615: c.f8615,
    investment_income: c.investment_income,
  });
  const k = child(p);
  assertEquals(k.eligibility?.earned_income_for_support, 10000);
  assertEquals(k.eligibility?.gross_unearned_income, 15000);
  assertEquals(k.eligibility?.line1_unearned_income, 15000);
  assertEquals(p.f1040.line12e_standard_or_itemized, 1350);
  assertEquals(k.eligibility?.applies, true);
});
Deno.test("2026 separate child-tax return retains spouse identity without adding spouse compensation", () => {
  const { f8863: _omit, ...base } = adoptionEducationFixture2026();
  const c = childTaxFixture2026(10000, 10000);
  c.f8615.claim!.adoption_inventory_reference =
    base.form8839.claim.record_reference;
  const p = complete({
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFS,
      spouse_ssn: "555-66-7777",
      spouse_first_name: "Separate",
      spouse_last_name: "Spouse",
      mfs_spouse_itemizing: false,
      mfs_spouse_lived_with_taxpayer: true,
    },
    f8615: c.f8615,
    investment_income: c.investment_income,
  });
  const k = child(p);
  assertEquals(k.source_input.child_context.spouse_ssn, "555667777");
  assertEquals(k.eligibility?.earned_income_for_support, 14000);
  assertEquals(k.eligibility?.line1_unearned_income, 10000);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 4000);
  assertEquals(p.f1040.line30_refundable_adoption, 0);
});
