import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import { scheduleSELines } from "../nodes/intermediate/forms/schedule_se/calculation.ts";

/** Replay retained Schedule SE line 12 into Schedule 2 line 4. */
export function assertSchedule2ScheduleSETax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const fields = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const source = pending.schedule_se as
    | Parameters<typeof scheduleSELines>[0]
    | undefined;
  const tax = source === undefined ? 0 : scheduleSELines(
    source,
    CONFIG_BY_YEAR[2025].ssWageBase,
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
