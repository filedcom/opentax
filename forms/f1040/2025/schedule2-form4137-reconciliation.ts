import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import {
  calculateForm4137,
  inputSchema as form4137InputSchema,
} from "../nodes/intermediate/forms/form4137/index.ts";

/** Match the filed line 5 tax to all retained taxpayer/spouse Form 4137 copies. */
export function assertSchedule2Form4137Tax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const fields = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const source = pending.form4137;
  const tax = source === undefined ? 0 : calculateForm4137(
    form4137InputSchema.parse(source),
    CONFIG_BY_YEAR[2025].ssWageBase,
  ).reduce((sum, form) => sum + form.totalTax, 0);
  if ((fields?.line5_unreported_tip_tax ?? 0) !== tax) {
    throw new Error(
      "Schedule 2 line 5 differs from retained Form 4137 tax",
    );
  }
}
