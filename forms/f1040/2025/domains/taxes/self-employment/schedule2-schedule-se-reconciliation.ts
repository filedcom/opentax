import { assertOwnedScheduleSE } from "./schedule-se/schedule-se-owner-source.ts";
import { CONFIG_BY_YEAR } from "../../../../nodes/config/index.ts";
import { scheduleSELines } from "../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { withMinisterialEarnings } from "../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/ministerial.ts";

/** Replay retained Schedule SE line 12 into Schedule 2 line 4. */
export function assertSchedule2ScheduleSETax(
  pending: Readonly<Record<string, unknown>>,
  taxYear: number,
): void {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  const fields = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const source = pending.schedule_se as
    | (Parameters<typeof scheduleSELines>[0] & {
      readonly ministerial_sources?: unknown;
    })
    | undefined;
  const owned = assertOwnedScheduleSE(
    pending as Record<string, Record<string, unknown>>,
    taxYear,
  );
  // Line 2 carries sourced ministerial earnings beside Schedule C profit.
  const tax = owned ? owned.tax : source === undefined ? 0 : scheduleSELines(
    withMinisterialEarnings(source),
    cfg.ssWageBase,
    cfg,
  )?.line12 ?? 0;
  const filed = fields?.line4_se_tax ?? 0;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    Math.round(filed * 100) !== Math.round(tax * 100)
  ) {
    throw new Error(
      "Schedule 2 line 4 differs from retained Schedule SE tax",
    );
  }
}
