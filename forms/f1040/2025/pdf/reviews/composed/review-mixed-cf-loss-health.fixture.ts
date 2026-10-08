import type { PdfReviewFixture } from "../../review-fixtures.ts";
import { mixedCfHealthFixtures } from "./review-mixed-cf-health.fixture.ts";

/** Issued reviewed examples establish source joins, not external authentication. */
export function mixedCfLossHealthFixtures(
  bases: readonly PdfReviewFixture[],
): PdfReviewFixture[] {
  const base = bases.find((f) => f.id.endsWith("phase-loss"));
  if (!base) {
    throw new Error("Mixed C/F health needs the actual controlled loss source");
  }
  return [false, true].flatMap((reverse) => {
    const source = structuredClone(base);
    const i = source.inputs as any;
    if (reverse) {
      // Change actual issued receipt and expense leaves; no scalar profit/SE/QBI inputs.
      const c = i.schedule_c[0], f = i.schedule_f.schedule_fs[0];
      const oldC = c.line_1_gross_receipts;
      c.line_1_gross_receipts = f.line4b_ag_program_payments_taxable +
        f.line8_other_income;
      f.line4b_ag_program_payments_taxable = oldC - f.line8_other_income;
      f.line4a_ag_program_payments = f.line4b_ag_program_payments_taxable;
      f.line16_feed = c.line_22_supplies;
      c.line_22_supplies = 0;
      i.f1099nec.find((n: any) => n.for_routing === "schedule_c").box1_nec =
        c.line_1_gross_receipts;
      i.f1099g[0].box_7_agriculture = f.line4b_ag_program_payments_taxable;
      delete i.schedule_f.farm_sources;
      i.general.form461_scope_review.line2_schedule_c_amount = 195201;
      i.general.form461_scope_review.line6_schedule_f_amount = -11201;
    }
    return mixedCfHealthFixtures([source, source, source]).filter((f) =>
      ["full", "income-limited", "excluded-all"].some((s) =>
        f.id === `owned-mixed-cf-health-${s}`
      )
    ).map((f) => {
      if (f.id.endsWith("income-limited")) {
        for (
          const plan of (f.inputs as any).form7206.independent_schedule_c_plans
            .plans
        ) {
          for (const month of plan.premium_months) {
            month.paid_premium = 20000.49;
          }
          for (const record of plan.issued_premium_records) {
            record.paid_premium = 20000.49;
          }
        }
      }
      return ({
        ...f,
        id: f.id.replace(
          "owned-mixed-cf-health",
          reverse
            ? "owned-positive-c-loss-f-health"
            : "owned-loss-c-positive-f-health",
        ),
        expectedPdfForms: (() => {
          const keys = base.expectedPdfForms.filter((k) =>
            !["form8995a", "form8995a_schedule_c"].includes(k)
          );
          if (f.id.endsWith("income-limited")) keys.push("form8995");
          else keys.push("form8995a", "form8995a_schedule_c");
          keys.push("form7206");
          return keys;
        })(),
        reviewFocus: [
          "Actual owned loss C/positive F or positive C/loss F receipts, expense leaves, employer payroll and common-control allocation retained",
          "Loss owner paid established plan remains source-bound with zero capacity; sole positive owner SE and health copies retain actual owner identity",
          "Full determined wage reductions precede separate owner SE, health, negative QBI netting and current-credit use; external authenticity remains open",
        ],
      });
    });
  });
}
