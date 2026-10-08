const CALCULATION_LINES = [
  "line8_total_investment_income",
  "line11_total_deductions",
  "line12_net_investment_income",
  "line13_magi",
  "line14_threshold",
  "line15_magi_excess",
  "line16_taxable_base",
  "line17_niit",
] as const;

/** Require a coherent retained Form 8960 tax before filing Schedule 2 line 12. */
export function assertSchedule2Form8960Tax(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const filed = schedule2?.line12_niit ?? 0;
  const raw = pending.form8960;
  const form = raw && typeof raw === "object"
    ? raw as Readonly<Record<string, unknown>>
    : undefined;
  const reported = form?.line17_niit ?? 0;
  if (filed === 0 && reported === 0) return;
  if (
    !form ||
    CALCULATION_LINES.some((key) =>
      typeof form[key] !== "number" || !Number.isFinite(form[key])
    )
  ) {
    throw new Error(
      "Schedule 2 line 12 differs from calculated Form 8960 tax",
    );
  }
  const line = (key: typeof CALCULATION_LINES[number]): number =>
    form[key] as number;
  const nii = Math.max(
    0,
    line("line8_total_investment_income") - line("line11_total_deductions"),
  );
  const excess = Math.max(0, line("line13_magi") - line("line14_threshold"));
  const base = Math.min(nii, excess);
  const tax = Math.round(base * 0.038 * 100) / 100;
  if (
    line("line12_net_investment_income") !== nii ||
    line("line15_magi_excess") !== excess ||
    line("line16_taxable_base") !== base ||
    line("line17_niit") !== tax || filed !== tax
  ) {
    throw new Error(
      "Schedule 2 line 12 differs from calculated Form 8960 tax",
    );
  }
}
