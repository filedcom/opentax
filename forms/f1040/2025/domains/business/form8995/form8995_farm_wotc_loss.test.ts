import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../../../../nodes/inputs/f5884/index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertFarmWotcReturn } from "./form8995_farm_wotc_reconciliation.ts";
import { calculateFarmWotcLines } from "../../../../nodes/intermediate/forms/form8995a/farm-wotc.ts";
import { inputSchema } from "../../../../nodes/intermediate/forms/form8995a/index.ts";
import { form8995aScheduleC } from "../../../mef/forms/business/f8995a/f8995a_schedule_c.ts";
import { form8995aScheduleCPdf } from "../../../pdf/forms/business/f8995a_schedule_c.ts";
import { form8995 } from "../../../mef/forms/business/f8995/f8995.ts";
import { form8995Pdf } from "../../../pdf/forms/business/f8995/f8995.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-farm-wotc-loss")
);
Deno.test("actual loss farm full reduction owner SE QBI carryforward and current-use amounts", () => {
  assertEquals(fixtures.length, 6);
  const expected = [
    [-10000, 30001, 1413, 3718, 0, 2400, 19595],
    [-2000, 0, 0, 0, 2000, 0, 0],
    [-2000, 0, 0, 0, 2000, 2400, 5106],
    [70000, 0, 938, 3734, 0, 2400, 104228],
    [-1999, 0, 0, 0, 1999, 2400, 120170],
    [-18001, 20001, 142, 72, 0, 29, 283],
  ];
  for (const [i, f] of fixtures.entries()) {
    const r = f1040_2025.executeReturn(f.inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, []);
    assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer);
    const a = p.form8995a
      ? calculateFarmWotcLines(inputSchema.parse(p.form8995a))
      : undefined;
    assertEquals([
      p.schedule1.line6_schedule_f,
      p.schedule1.line3_schedule_c ?? 0,
      p.schedule1.line15_se_deduction,
      p.f1040.line13_qbi_deduction,
      a?.lossSchedule?.line6 ?? p.form8995.line16,
      p.f3800.allowed_credit,
      p.f1040.line24_total_tax,
    ], expected[i]);
    const farm = (p.schedule_f.schedule_fs as any[])[0];
    assertEquals(
      farm.line16_feed,
      (f.inputs.schedule_f as any).schedule_fs[0].line16_feed,
    );
    assertEquals(farm.line22_labor_hired, i === 5 ? 480000 : 6000.49);
    assertEquals(
      calculateForm5884(creditSchema.parse(p.f5884)).line2,
      i === 5 ? 192000 : 2400,
    );
    if (a) {
      assertEquals(a.rows[0].lines.line2, 0);
      assertEquals(a.rows[0].lines.line4, 0);
      assertEquals(a.lossSchedule!.rows[0].line1a, i === 4 ? -10000 : -10001);
      assertEquals(
        r.carryforwards.qbi_loss_carryforward_8995a ?? 0,
        a.lossSchedule!.line6,
      );
      assertEquals(a.parent.line40, 0); // Form8995-A line40 is REIT/PTP, not ordinary QBI loss.
    } else {assertEquals(
        r.carryforwards.qbi_loss_carryforward ?? 0,
        p.form8995.line16,
      );}
  }
});
Deno.test("loss farm public rejects wage-credit source omission and resolved-loss scope conflicts", async () => {
  const f = fixtures[0];
  for (
    const change of [
      (i: any) => delete i.general.form461_scope_review,
      (i: any) => i.general.form461_scope_review.line6_schedule_f_amount++,
      (i: any) => i.schedule_f.schedule_fs[0].line36_at_risk = "b",
      (i: any) =>
        i.schedule_f.schedule_fs[0].line_e_material_participation = false,
      (i: any) =>
        i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.owner_ssn =
          "444556666",
      (i: any) => i.f5884.f5884s[0].wage_records[0].qualified_wages--,
      (i: any) => i.f1099g[0].box_7_agriculture++,
    ]
  ) {
    const inputs = structuredClone(f.inputs);
    change(inputs);
    const r = f1040_2025.executeReturn(inputs);
    if (!r.diagnostics.some((d) => d.severity === "error")) {
      await assertRejects(() => f1040_2025.prepareReturn(r.pending, f.filer));
    }
  }
});
Deno.test("loss netting companion and zero-deduction loss rows reject native PDF tampering", () => {
  for (const f of fixtures) {
    const original = normalizeAllPending(
      f1040_2025.executeReturn(f.inputs).pending,
    );
    for (
      const change of [
        (p: any) => p.f3800.allowed_credit++,
        (p: any) => p.schedule1.line6_schedule_f++,
        (p: any) => p.schedule_f.schedule_fs[0].line16_feed++,
        (p: any) => p.schedule_se.owner_business_sources[0].net_profit++,
        (p: any) => p.f1040.line13_qbi_deduction++,
      ]
    ) {
      const p = structuredClone(original);
      change(p);
      assertThrows(() =>
        assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer)
      );
    }
    if (original.form8995a) {
      for (
        const change of [
          (p: any) => delete p.form8995a_schedule_c,
          (p: any) => p.form8995a_schedule_c.taxable_income++,
          (p: any) =>
            p.form8995a_schedule_c.farm_wotc_filing_source.businesses[0]
              .determined_wage_reduction--,
        ]
      ) {
        const p = structuredClone(original);
        change(p);
        assertThrows(() => assertFarmWotcReturn(p.form8995a, p, f.filer));
        assertThrows(() =>
          form8995aScheduleC.build((p.form8995a_schedule_c ?? {}) as any, {
            pending: p,
            filer: f.filer,
          })
        );
        assertThrows(() =>
          form8995aScheduleCPdf.projectFields!(
            p.form8995a_schedule_c ?? original.form8995a_schedule_c,
            p,
          )
        );
      }
    } else {
      const fields = structuredClone(original.form8995);
      fields.line16 = Number(fields.line16) + 1;
      assertThrows(() =>
        form8995.build(fields as any, { pending: original, filer: f.filer })
      );
      assertThrows(() => form8995Pdf.projectFields!(fields, original));
    }
  }
});
