import { FilingStatus } from "../../nodes/types.ts";
import { jointBusinessGraphFixture2026 } from "./business-qbi.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { businessLossGraphFixture2026 } from "./business-loss-graph.fixture.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateForm461_2026 } from "../nodes/form461.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { businessQbiCalculator2026 } from "./business-qbi.ts";
const run = (f: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, f, {
    taxYear: 2026,
    formType: "f1040",
  });
Deno.test("2026 Form 461 posts once through AGI and separates allowed QBI loss from suspended origin", () => {
  const r = run(businessLossGraphFixture2026());
  assertEquals(r.diagnostics, []);
  const p = r.pending;
  assertEquals(p.schedule1.line8p_excess_business_loss, 144000);
  assertEquals(p.f1040.line8_additional_income, -256000);
  assertEquals(p.f1040.line11b_agi, 144000);
  assertEquals(p.f1040.line15_taxable_income, 127900);
  const selected = p.standard_deduction.resolution_2026 as any;
  // The selected form retains both current qualified loss and the distinct 461 origin.
  const qbi = selected.selected.qbi.forms.form8995;
  assertEquals(qbi.lines.line18, 256000);
  assertEquals(qbi.loss_attribution.qualified_suspended_loss, 144000);
  assertEquals(qbi.rows[0].qbi, -256000);
  assertEquals(qbi.loss_attribution.activities[0].allowed_loss, 256000);
});
Deno.test("2026 filing-only Form 461 preserves losses and exact filing boundaries", () => {
  for (
    const [loss, file] of [[128000, false], [128001, true], [
      256000,
      true,
    ]] as const
  ) {
    const r = run(businessLossGraphFixture2026([-loss], 300000));
    assertEquals(r.diagnostics, []);
    const c = (r.pending.form461.calculation_2026 as ReturnType<
      typeof calculateForm461_2026
    >).calculation!;
    assertEquals(c.file_form461, file);
    assertEquals(c.schedule1_line8p, 0);
    assertEquals(r.pending.f1040.line11b_agi, 300000 - loss);
  }
  const f = businessLossGraphFixture2026([-128001]);
  delete (f.schedule_c.claim as any).loss_limit_review;
  assert(
    run(f).diagnostics.some((d) =>
      d.message.includes("complete business-loss review")
    ),
  );
});
Deno.test("2026 loss allocation conserves dollars across multiple businesses and source order", () => {
  const f = businessLossGraphFixture2026([-300001, -100000, 50000]);
  const a = run(f);
  assertEquals(a.diagnostics, []);
  f.schedule_c.claim.businesses.reverse();
  f.schedule_c.claim.qbi_review.businesses.reverse();
  const b = run(f);
  assertEquals(b.diagnostics, []);
  const q = (r: typeof a) =>
    (r.pending.standard_deduction.resolution_2026 as any).selected
      .qbi.forms.form8995;
  assertEquals(q(a).lines.line18, 256000);
  assertEquals(q(a).loss_attribution.qualified_suspended_loss, 94001);
  const rows = (r: typeof a) =>
    q(r).rows.map((
      x: any,
    ) => [x.business_reference, x.allocated_excess_business_loss]).sort();
  assertEquals(rows(a), [["business-1", 70501], ["business-2", 23500], [
    "business-3",
    0,
  ]]);
  assertEquals(rows(a), rows(b));
});
Deno.test("2026 AGI rejects a business-loss addback without retained source evidence", () => {
  assertThrows(
    () =>
      agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
        filing_status: businessLossGraphFixture2026().general.filing_status,
        line8p_excess_business_loss: 1,
      }),
    Error,
    "retained source",
  );
  const r = run(businessLossGraphFixture2026());
  const c = (r.pending.form461.calculation_2026 as ReturnType<
    typeof calculateForm461_2026
  >).calculation!;
  const raw =
    (r.pending.schedule_c.calculation_2026 as any).calculation.source_input;
  assertThrows(
    () => businessQbiCalculator2026(raw, 0),
    Error,
    "reconciled Form 461",
  );
  assertThrows(
    () =>
      businessQbiCalculator2026(raw, 0, {
        ...c.source_input,
        business_sources: {
          ...c.source_input.business_sources!,
          record_reference: "changed",
        },
      }),
    Error,
    "identical business sources",
  );
});
Deno.test("2026 statutory-employee QBI remains outside the business-loss allocation", () => {
  const f = businessLossGraphFixture2026([-400000]);
  const stat = structuredClone(f.schedule_c.claim.businesses[0]);
  stat.business_reference = "statutory";
  stat.kind = "statutory_employee";
  stat.receipts = [];
  stat.expenses = [];
  f.schedule_c.claim.businesses.push(stat);
  f.schedule_c.claim.qbi_review.businesses.push({
    ...f.schedule_c.claim.qbi_review.businesses[0],
    business_reference: "statutory",
  });
  const w = f.w2s[0] as any;
  w.box13_statutory_employee = true;
  w.schedule_c_business_reference = "statutory";
  const r = run(f);
  assertEquals(r.diagnostics, []);
  const q =
    (r.pending.standard_deduction.resolution_2026 as any).selected.qbi.forms
      .form8995;
  assertEquals(r.pending.f1040.line11b_agi, 144000);
  assertEquals(
    q.rows.map((r: any) => [r.qbi, r.allocated_excess_business_loss]),
    [[-256000, 144000], [400000, 0]],
  );
  assertEquals(r.pending.f1040.line13b_qbi, 25580);
});
Deno.test("2026 joint Form 461 uses one threshold for both owners", () => {
  const f = businessLossGraphFixture2026([-250000, -262001], 650000);
  f.schedule_c.claim.businesses[1].owner_tin = "987654321";
  const r = run({ ...f, general: jointBusinessGraphFixture2026().general });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.schedule1.line8p_excess_business_loss, 1);
  assertEquals(r.pending.f1040.line11b_agi, 138000);
  assertEquals(
    (r.pending.standard_deduction.resolution_2026 as any).selected.qbi.forms
      .form8995.lines.line18,
    512000,
  );
});
Deno.test("2026 business-loss adjustment enters Social Security income before taxable benefits are calculated", () => {
  const r = run(businessLossGraphFixture2026([-400000], 300000));
  assertEquals(r.diagnostics, []);
  const loss = (r.pending.form461.calculation_2026 as ReturnType<
    typeof calculateForm461_2026
  >).calculation!;
  const business =
    (r.pending.schedule_c.calculation_2026 as any).calculation.source_input;
  const input = {
    filing_status: business.filing_status,
    line1a_wages: 300000,
    line3_schedule_c: -400000,
    line6a_ss_gross: 20000,
    line8p_excess_business_loss: 144000,
    business_sources_2026: business,
    business_loss_sources_2026: loss.source_input,
  };
  const out =
    agi_2026.compute({ taxYear: 2026, formType: "f1040" }, input).outputs;
  const ret = Object.assign(
    {},
    ...out.filter((x) => x.nodeType === "f1040").map((x) => x.fields),
  );
  assertEquals(ret.line6b_ss_taxable, 17000);
  assertEquals(ret.line9_total_income, 61000);
  for (
    const changed of [
      { line8p_excess_business_loss: 144001 },
      { line3_schedule_c: -400001 },
      { line7_capital_gain: 1 },
      { line15_se_deduction: 1 },
    ]
  ) {
    assertThrows(
      () =>
        agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
          ...input,
          ...changed,
        }),
      Error,
      "disagrees",
    );
  }
});
Deno.test("2026 separate-filer loss workpaper preserves spouse header without combining spouse businesses", () => {
  const f = businessLossGraphFixture2026();
  const r = run({
    ...f,
    general: {
      ...f.general,
      filing_status: FilingStatus.MFS,
      spouse_ssn: "987654321",
      spouse_first_name: "Synthetic",
      spouse_last_name: "Spouse",
      mfs_spouse_itemizing: false,
    },
  });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.schedule1.line8p_excess_business_loss, 144000);
  const c = (r.pending.form461.calculation_2026 as ReturnType<
    typeof calculateForm461_2026
  >).calculation!;
  assertEquals(c.lines.line15, 256000);
  assertEquals(c.source_input.spouse_ssn, "987654321");
});
