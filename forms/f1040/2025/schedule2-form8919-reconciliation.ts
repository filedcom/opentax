import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import {
  calculateForm8919,
  inputSchema as form8919InputSchema,
} from "../nodes/intermediate/forms/form8919/index.ts";

/** Replay the sum of retained Form 8919 line 13 copies into Schedule 2 line 6. */
export function assertSchedule2Form8919Tax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const fields = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const source = pending.form8919;
  const tax = source === undefined ? 0 : calculateForm8919(
    form8919InputSchema.parse(source),
    CONFIG_BY_YEAR[2025].ssWageBase,
  ).reduce((sum, form) => sum + form.line13, 0);
  if ((fields?.line6_uncollected_8919 ?? 0) !== tax) {
    throw new Error(
      "Schedule 2 line 6 differs from retained Form 8919 tax",
    );
  }
}
