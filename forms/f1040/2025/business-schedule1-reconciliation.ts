import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../nodes/owned-business-filing.ts";
import { patronFiledBusinessLines } from "../nodes/inputs/qbi_patron/calculation.ts";
import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
  wotcReductionsByBusiness,
} from "../nodes/inputs/schedule_c/model.ts";
import {
  calculateScheduleFAtRiskNet,
  inputSchema as scheduleFSchema,
  wotcReductionsByFarm,
} from "../nodes/intermediate/forms/schedule_f/index.ts";

/** Replay each attached business schedule's filed net to Schedule 1. */
export function assertBusinessSchedule1Amounts(
  pending: Record<string, unknown>,
): void {
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const filed = (key: string): number => {
    const value = schedule1?.[key];
    if (value === undefined || value === null) return 0;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Schedule 1 ${key} is not a finite amount`);
    }
    return value;
  };
  if (pending.schedule_c !== undefined) {
    const source = scheduleCSchema.parse(pending.schedule_c);
    const items = projectScheduleCItems(source);
    if (items.length > 0) {
      const reductions = wotcReductionsByBusiness({
        schedule_cs: items,
        wotc_wage_reductions: source.wotc_wage_reductions,
      });
      const expected = items.reduce(
        (sum, item) =>
          sum +
          (source.patron_filing_review
            ? patronFiledBusinessLines("schedule_c", item).profit
            : filedOwnedScheduleC(
              item,
              false,
              reductions.get(item.business_reference ?? "") ?? 0,
            )?.profit ?? calculateScheduleCAtRiskNet(
              item,
              reductions.get(item.business_reference ?? "") ?? 0,
            ).atRiskNet),
        0,
      );
      if (Math.abs(filed("line3_schedule_c") - expected) >= 0.01) {
        throw new Error(
          "Schedule 1 line 3 differs from filed Schedule C net profit or loss",
        );
      }
    }
  }
  if (pending.schedule_f !== undefined) {
    const source = scheduleFSchema.parse(pending.schedule_f);
    if (source.schedule_fs.length > 0) {
      const reductions = wotcReductionsByFarm(source);
      const expected = source.schedule_fs.reduce(
        (sum, farm) =>
          sum +
          (source.patron_filing_review
            ? patronFiledBusinessLines("schedule_f", farm).profit
            : filedOwnedScheduleF(
              farm,
              source.farm_optional_method_elected === true,
              reductions.get(farm.farm_id ?? "") ?? 0,
            )?.profit ?? calculateScheduleFAtRiskNet(
              farm,
              reductions.get(farm.farm_id ?? "") ?? 0,
            ).atRiskNet),
        0,
      );
      if (Math.abs(filed("line6_schedule_f") - expected) >= 0.01) {
        throw new Error(
          "Schedule 1 line 6 differs from filed Schedule F net profit or loss",
        );
      }
    }
  }
}
