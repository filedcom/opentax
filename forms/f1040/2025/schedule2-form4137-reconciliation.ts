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

/** Replay Form 4137 unreported tips into Form 1040 line 1c and AGI. */
export function assertLine1cForm4137Income(
  pending: Readonly<Record<string, unknown>>,
): void {
  if (pending.f1040 === undefined) return;
  const source = pending.form4137;
  const income = source === undefined ? 0 : calculateForm4137(
    form4137InputSchema.parse(source),
    CONFIG_BY_YEAR[2025].ssWageBase,
  ).reduce((sum, form) => sum + form.unreportedTips, 0);
  const filed = (pending.f1040 as Readonly<Record<string, unknown>> | undefined)
    ?.line1c_unreported_tips ?? 0;
  const agi = (pending.agi_aggregator as
    | Readonly<Record<string, unknown>>
    | undefined)?.line1c_unreported_tips;
  if (
    !Number.isFinite(income) || filed !== income ||
    (income > 0 && agi !== income) ||
    (income === 0 && agi !== undefined && agi !== 0)
  ) {
    throw new Error(
      "Form 1040 line 1c and AGI tips differ from retained Form 4137 income",
    );
  }
}
