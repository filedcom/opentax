import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { mixedCfLossHealthFixtures } from "./pdf/review-mixed-cf-loss-health.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { assertIndependentOwnerHealth } from "./form7206_independent_owner_source.ts";
import { form7206 } from "./mef/forms/f7206.ts";
import { form7206Pdf } from "./pdf/forms/f7206.ts";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../nodes/inputs/f5884/index.ts";
const fixtures = mixedCfLossHealthFixtures(
  pdfReviewFixtures.filter((f) =>
    f.id.startsWith("owned-controlled-mixed-cf-wotc-")
  ),
);
const expected = [
  [9600, 460868.37, 21822, 2400, 111277],
  [181669, 288799.37, 0, 2400, 74182],
  [0, 470468.37, 20032, 2400, 114922],
  [6000, 475386.37, 18972, 2400, 94998],
  [192587, 288799.37, 0, 2400, 52346],
  [0, 481386.37, 17548, 2400, 97374],
];
Deno.test("actual mixed C/F loss-owner established plans settle source SE health QBI current credit full XSD PDF", async () => {
  assertEquals(fixtures.length, 6);
  for (const [index, f] of fixtures.entries()) {
    const r = f1040_2025.executeReturn(f.inputs),
      p = normalizeAllPending(r.pending) as any;
    assertEquals(r.diagnostics, []);
    const h = assertIndependentOwnerHealth(p, f.filer);
    assertEquals([
      h.deduction,
      p.f1040.line11_agi,
      p.f1040.line13_qbi_deduction,
      p.f3800.allowed_credit,
      p.f1040.line24_total_tax,
    ], expected[index]);
    const loss = index < 3 ? 0 : 1, positive = 1 - loss;
    assertEquals(
      h.rows[loss].nonpositive_business_income_source?.net_profit,
      -11201,
    );
    assertEquals(h.rows[loss].line14, 0);
    assertEquals(h.rows[loss].independent_plan_required, false);
    assertEquals(
      h.rows[loss].calculation_plan.sole_positive_business_verified,
      false,
    );
    assertEquals(h.rows[positive].independent_plan_required, true);
    assertEquals(p.schedule_se.owner_instances.map((o: any) => o.recipient), [
      index < 3 ? "S" : "T",
    ]);
    assertEquals(p.schedule1.line15_se_deduction, index < 3 ? 13532 : 2614);
    assertEquals(
      p.form7206.schedule_se_source.net_profit_schedule_c,
      index < 3 ? -11201 : 195201,
    );
    assertEquals(
      p.form7206.schedule_se_source.net_profit_schedule_f,
      index < 3 ? 195201 : -11201,
    );
    assertEquals(calculateForm5884(creditSchema.parse(p.f5884)).line2, 2400);
    assertEquals(p.schedule_c.wotc_wage_reductions[0].credit_amount, 1200);
    assertEquals(p.schedule_f.wotc_wage_reductions[0].credit_amount, 1200);
    const prep = await f1040_2025.prepareReturn(r.pending, f.filer);
    if (index === 1 || index === 4) {
      assertEquals(
        prep.bundle.xml.includes(
          "<TotQlfyBusinessIncomeOrLossAmt>-11201</TotQlfyBusinessIncomeOrLossAmt>",
        ),
        true,
      );
      assertEquals(
        prep.bundle.xml.includes(
          "<TotQlfyBusLossCarryforwardAmt>11201</TotQlfyBusLossCarryforwardAmt>",
        ),
        true,
      );
    }
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(prep.bundle.xml));
    await writer.close();
    const out = await child.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    assertEquals((prep.bundle.xml.match(/<IRS7206 /g) || []).length, 1);
    assertEquals(
      (prep.bundle.xml.match(/<IRS1040ScheduleSE /g) || []).length,
      1,
    );
    assertEquals((await prep.renderPdf()).length > 0, true);
  }
});
Deno.test("mixed C/F loss-owner source capacities and retained source records reject public native PDF conflicts", async () => {
  for (const f of [fixtures[0], fixtures[3]]) {
    for (
      const mutate of [
        (i: any) =>
          i.form7206.independent_schedule_c_plans.plans[0]
            .issued_premium_records[0].paid_premium++,
        (i: any) =>
          i.form7206.independent_schedule_c_plans.plans[1].issued_policy_record
            .policyholder_ssn = "999887777",
        (i: any) =>
          i.form7206.independent_schedule_c_plans.business_plan_reviews[0]
            .plan_identifiers = [],
        (i: any) => i.f1099g[0].recipient_tin = "999887777",
        (i: any) => i.f1099nec[0].box1_nec++,
        (i: any) =>
          i.f5884.controlled_group.joint_filed_members_review
            .common_control_confirmed = false,
        (i: any) =>
          i.schedule_f.schedule_fs[0].farm_optional_method_elected = true,
      ]
    ) {
      const input = structuredClone(f.inputs);
      mutate(input);
      const r = f1040_2025.executeReturn(input);
      if (!r.diagnostics.some((d) => d.severity === "error")) {
        await assertRejects(() => f1040_2025.prepareReturn(r.pending, f.filer));
      }
    }
    const original = normalizeAllPending(
        f1040_2025.executeReturn(f.inputs).pending,
      ),
      loss = f.id.startsWith("owned-loss-c") ? 0 : 1;
    for (
      const mutate of [
        (p: any) => p.form7206.independent_plan_filing_rows[loss].line14 = 1,
        (p: any) =>
          p.form7206.independent_plan_filing_rows[loss]
            .independent_plan_required = true,
        (p: any) =>
          p.form7206.independent_plan_filing_rows[loss].calculation_plan
            .sole_positive_business_verified = true,
        (p: any) => p.form7206.schedule_se_source.net_profit_schedule_c = 0,
        (p: any) =>
          p.form7206.schedule_f_source.businesses[0].line34_net_profit++,
        (p: any) =>
          p.form7206.schedule_c_source.businesses[0].line31_net_profit++,
        (p: any) => p.schedule_se.owner_business_sources[loss].net_profit = 0,
        (p: any) => p.schedule1.line17_se_health_insurance++,
        (p: any) => p.f1040.line11_agi++,
        (p: any) => p.f1040.line13_qbi_deduction++,
        (p: any) => p.schedule_f.wotc_wage_reductions[0].credit_amount = 0,
      ]
    ) {
      const p = structuredClone(original);
      mutate(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
      assertThrows(() => assertIndependentOwnerHealth(p, f.filer));
      assertThrows(() =>
        form7206.build(p.form7206 as any, { pending: p, filer: f.filer })
      );
      assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
    }
    const detached = structuredClone(original.form7206) as any;
    detached.independent_schedule_c_plans.plans[0].plan_identifier = "Detached";
    assertThrows(() =>
      form7206.build(detached, { pending: original, filer: f.filer })
    );
    assertThrows(() => form7206Pdf.projectFields!(detached, original));
  }
});
