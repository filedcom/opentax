import { independentHealthFamily } from "../../../../pdf/reviews/adjustments/health/form7206-independent-owner.fixture.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { assertIndependentOwnerHealth } from "./form7206_independent_owner_source.ts";
import { form7206 } from "../../../../mef/forms/adjustments/health/f7206.ts";
import { form7206Pdf } from "../../../../pdf/forms/adjustments/health/f7206.ts";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../../../../../nodes/inputs/credits/business/f5884/index.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-two-farm-health-")
);
const expected = [
  [15600, 302729.86, 14546, 4800, 52033],
  [88329, 230000.86, 0, 4800, 38233],
  [10900, 307429.86, 15486, 4800, 52936],
  [0, 318329.86, 17666, 4800, 55028],
  [15600, 480053.37, 32337, 4800, 118927],
  [15600, 995328.86, 119066, 183719, 85590],
  [9600, 463252.37, 21189, 4800, 109884],
];
Deno.test("independent actual two-farm health full limited excluded phase and current-use packets validate full XSD and PDF", async () => {
  assertEquals(fixtures.length, 7);
  for (const [index, fixture] of fixtures.entries()) {
    const r = f1040_2025.executeReturn(fixture.inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, []);
    const health = assertIndependentOwnerHealth(p, fixture.filer);
    assertEquals([
      health.deduction,
      p.f1040.line11_agi,
      p.f1040.line13_qbi_deduction,
      Number(p.f3800?.allowed_credit ?? 0),
      p.f1040.line24_total_tax,
    ], expected[index]);
    assertEquals(health.rows.length, 2);
    assertEquals(
      p.schedule1.line15_se_deduction,
      index === 4 ? 17149 : index === 5 ? 13074 : index === 6 ? 13548 : 4473,
    );
    {
      assertEquals(
        calculateForm5884(creditSchema.parse(p.f5884)).line2,
        index === 5 ? 384000 : 4800,
      );
    }
    assertEquals(health.rows.map((row) => row.recipient_ssn), [
      "111223333",
      "444556666",
    ]);
    if (index === 6) {
      assertEquals(
        health.rows[0].nonpositive_business_income_source?.net_profit,
        -10001,
      );
      assertEquals(
        health.rows[0].calculation_plan.schedule_c_line31_net_profit,
        -10001,
      );
      assertEquals(
        health.rows[0].calculation_plan.sole_positive_business_verified,
        false,
      );
      assertEquals(health.rows[0].independent_plan_required, false);
      assertEquals(health.rows[0].line14, 0);
      assertEquals(
        (p.schedule_se.owner_instances as any[]).map((o) => o.owner_ssn),
        ["444556666"],
      );
    }
    if (index === 0) {
      assertEquals(health.rows.map((row) => row.line14), [6000, 9600]);
      assertEquals(
        health.source.plans[0].premium_months[0].paid_premium,
        500.04,
      );
    }
    console.log(
      fixture.id,
      JSON.stringify({
        health: health.rows.map((row) => row.line14),
        agi: p.f1040.line11_agi,
        qbi: p.f1040.line13_qbi_deduction,
        use: Number(p.f3800?.allowed_credit ?? 0),
        tax: p.f1040.line24_total_tax,
      }),
    );
    const prepared = await f1040_2025.prepareReturn(r.pending, fixture.filer);
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
    await writer.write(new TextEncoder().encode(prepared.bundle.xml));
    await writer.close();
    const output = await child.output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
    assertEquals(
      (prepared.bundle.xml.match(/<IRS7206 /g) ?? []).length,
      index === 6 ? 1 : 2,
    );
    assertEquals((await prepared.renderPdf()).length > 0, true);
  }
});
Deno.test("mixed two-farm health rejects actual owner issuer month business payroll and prepared source conflicts", async () => {
  const fixture = fixtures[0];
  for (
    const mutate of [
      (i: any) =>
        delete i.form7206.independent_schedule_c_plans.plans[1]
          .issued_policy_record,
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1]
          .issued_premium_records[0].payer_ssn = "111223333",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1]
          .issued_premium_records[1].paid_on = "2025-02-30",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1]
          .issued_premium_records[0].paid_premium++,
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1].issued_policy_record
          .policy_number = "Foreign policy",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[1].business_reference =
          "Primary-WOTC-Farm",
      (i: any) =>
        i.form7206.independent_schedule_c_plans.business_plan_reviews[1]
          .plan_identifiers = [],
      (i: any) => i.f1099g[0].recipient_tin = "999887777",
      (i: any) =>
        i.f5884.f5884s[1].direct_employer_review.proprietor_ssn = "111223333",
      (i: any) =>
        i.schedule_f.schedule_fs[0].farm_optional_method_elected = true,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review.businesses[0]
          .other_spouse_no_direct_interest_confirmed = false,
    ]
  ) {
    const input = structuredClone(fixture.inputs);
    mutate(input);
    const r = f1040_2025.executeReturn(input);
    if (!r.diagnostics.some((d) => d.severity === "error")) {
      await assertRejects(() =>
        f1040_2025.prepareReturn(r.pending, fixture.filer)
      );
    }
  }
  for (const fixture of [fixtures[0], fixtures[4], fixtures[5], fixtures[6]]) {
    const original = normalizeAllPending(
      f1040_2025.executeReturn(fixture.inputs).pending,
    );
    for (
      const mutate of [
        (p: any) => p.form7206.independent_plan_filing_rows[1].line14++,
        (p: any) =>
          p.form7206.schedule_f_source.businesses[1].line34_net_profit++,
        (p: any) =>
          p.form7206.independent_schedule_c_plans.plans[1].issued_policy_record
            .policyholder_ssn = "111223333",
        (p: any) => p.f1099g.f1099gs[0].payer_name = "Detached issuer",
        (p: any) =>
          p.f1099nec.f1099necs[1].source_document_reference = "Detached source",
        (p: any) => p.schedule1.line17_se_health_insurance++,
        (p: any) => p.schedule1.line6_schedule_f++,
        (p: any) => p.schedule_se.owner_business_sources[1].net_profit++,
        (p: any) => p.f1040.line11_agi++,
        (p: any) =>
          p.form8995.joint_owner_health_plans_source.plans[1].plan_identifier =
            "Detached plan",
      ]
    ) {
      const p = structuredClone(original);
      mutate(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, fixture.filer));
      assertThrows(() => assertIndependentOwnerHealth(p, fixture.filer));
      assertThrows(() =>
        form7206.build(p.form7206 as any, { pending: p, filer: fixture.filer })
      );
      assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
    }
    const detached = structuredClone(original.form7206) as any;
    detached.independent_schedule_c_plans.plans[1].plan_identifier =
      "Detached descriptor";
    assertThrows(() =>
      form7206.build(detached, { pending: original, filer: fixture.filer })
    );
    assertThrows(() => form7206Pdf.projectFields!(detached, original));
  }
});

Deno.test("two-farm health rejects fabricated absent business kinds and loss-owner capacity", async () => {
  const fixture = fixtures[6];
  const original = normalizeAllPending(
    f1040_2025.executeReturn(fixture.inputs).pending,
  );
  for (
    const mutate of [
      (p: any) =>
        p.form7206.schedule_c_source = {
          unadjusted_source: true,
          businesses: [],
        },
      (p: any) => p.form7206.independent_plan_filing_rows[0].line14 = 1,
      (p: any) =>
        p.form7206.independent_plan_filing_rows[0].independent_plan_required =
          true,
      (p: any) =>
        p.form7206.independent_plan_filing_rows[0].calculation_plan
          .sole_positive_business_verified = true,
    ]
  ) {
    const p = structuredClone(original);
    mutate(p);
    await assertRejects(() => f1040_2025.prepareReturn(p, fixture.filer));
    assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
  }
  const pairedC = independentHealthFamily();
  const p = structuredClone(pairedC.pending) as any;
  p.form7206.schedule_f_source = { regular_source: true, businesses: [] };
  await assertRejects(() => f1040_2025.prepareReturn(p, pairedC.filer));
  assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
});
