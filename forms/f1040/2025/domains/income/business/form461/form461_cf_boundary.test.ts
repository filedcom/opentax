import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form461 as native } from "../../../../mef/forms/income/business/f461.ts";
import { form461Pdf } from "../../../../pdf/forms/income/business/f461.ts";
import { filedForm461Schema } from "../../../../../nodes/intermediate/forms/income/business/form461/index.ts";
const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form461-schedule-c-excess-business-loss"
)!;

// Full-return boundaries, not assertions that the current SE/QBI/AGI amounts
// are correct. The independent discrepancies are retained in future_todo.
for (
  const [id, c, farm, line16, carry, blocked] of [
    ["farm-profit", -200000, 210000, 323000, 0, "Form 8995 positive filing"],
    ["shop-profit", 210000, -200000, 323000, 0, "Form 8995 positive filing"],
    ["two-losses", -200000, -200000, -87000, 87000, "Form 1040 line 8 differs"],
  ] as const
) {
  Deno.test(`Form 461 signed C/F ${id} verifies form amounts and retains full-return rejection`, async () => {
    const input: any = structuredClone(base.inputs);
    Object.assign(input.general, {
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    });
    Object.assign(input.w2[0], {
      box1_wages: 120000,
      box3_ss_wages: 120000,
      box4_ss_withheld: 7440,
      box5_medicare_wages: 120000,
      box6_medicare_withheld: 1740,
    });
    Object.assign(input.general.form461_scope_review, {
      line2_schedule_c_amount: c,
      line6_schedule_f_amount: farm,
    });
    Object.assign(input.schedule_c[0], {
      line_1_gross_receipts: Math.max(0, c),
      line_27b_other_expenses: undefined,
      part_v_other_expenses: c < 0
        ? [{ description: "Reviewed shop operating expenses", amount: -c }]
        : [],
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
    });
    input.schedule_f = {
      schedule_fs: [{
        farm_id: "grain",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "Example Grain Farm",
        line_e_material_participation: true,
        accounting_method: "cash",
        line_f_made_1099_payments: false,
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: Math.max(0, farm),
        line32_other_expenses: farm < 0
          ? [{ description: "Reviewed farm operating expenses", amount: -farm }]
          : [],
        line36_at_risk: "a",
        qbi_no_other_adjustments_confirmed: true,
      }],
    };

    const result = f1040_2025.executeReturn(input);
    const pending = normalizeAllPending(result.pending);
    assertEquals(
      result.diagnostics.map((d) => d.nodeType),
      id === "two-losses" ? ["form8995"] : [],
    );
    const filed = filedForm461Schema.parse(pending.form461);
    assertEquals([
      filed.line2_business_income_loss,
      filed.line6_net_farm_profit_loss,
      filed.line9_total_income_loss,
      filed.line15_threshold,
      filed.line16_excess_business_loss,
    ], [c, farm, c + farm, 313000, line16]);
    assertEquals(pending.schedule1?.line8p_excess_business_loss ?? 0, carry);
    assertEquals(
      result.carryforwards.excess_business_loss_nol_origin ?? 0,
      carry,
    );
    assertStringIncludes(
      native.build(filed, { filer: base.filer, pending }),
      `<ExcessBusinessLossAmt>${line16}</ExcessBusinessLossAmt>`,
    );
    assertEquals(
      form461Pdf.instances?.(filed, base.filer, pending)?.[0]
        .line16_excess_business_loss,
      line16,
    );
    for (
      const field of [
        "line2_business_income_loss",
        "line6_net_farm_profit_loss",
        "line15_threshold",
        "line16_excess_business_loss",
      ] as const
    ) {
      const changed = { ...filed, [field]: filed[field] + 1 };
      assertThrows(() => native.build(changed, { filer: base.filer, pending }));
      assertThrows(() => form461Pdf.instances?.(changed, base.filer, pending));
    }
    await assertRejects(
      () => f1040_2025.prepareReturn(pending, base.filer),
      Error,
      blocked,
    );
    await assertRejects(
      () => buildPdfBytes(pending, base.filer, ".pdf-cache"),
      Error,
      blocked,
    );
  });
}
