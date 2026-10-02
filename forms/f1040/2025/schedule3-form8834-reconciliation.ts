import {
  form8834SourceCredit,
  inputSchema as f8834InputSchema,
} from "../nodes/inputs/f8834/index.ts";

/** Replay retained Form 8834 credit and limitation math into Schedule 3. */
export function assertSchedule3Form8834Credit(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule3 = pending.schedule3 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const filed = schedule3?.line6i_qualified_electric_vehicle_credit ?? 0;
  const fail = (): never => {
    throw new Error(
      "Schedule 3 line 6i differs from retained Form 8834 credit",
    );
  };
  const raw = pending.f8834;
  if (raw === undefined) {
    if (filed !== 0) fail();
    return;
  }
  const source = form8834SourceCredit(f8834InputSchema.parse(raw));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  const form = raw as Readonly<Record<string, unknown>>;
  const cents = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return fail();
    }
    const amount = Math.round(value * 100);
    if (
      !Number.isSafeInteger(amount) ||
      Math.abs(value * 100 - amount) > 0.000001
    ) return fail();
    return amount;
  };
  if (source === 0) {
    if (filed !== 0) fail();
    return;
  }
  const line1 = cents(form.line1_source_credit);
  const line2 = cents(form.line2_regular_tax);
  const line3a = cents(form.line3a_foreign_tax_credit);
  const line3b = cents(form.line3b_other_credits);
  const line3c = cents(form.line3c_total_credits);
  const line4 = cents(form.line4_net_regular_tax);
  const line5 = cents(form.line5_tentative_minimum_tax);
  const line6 = cents(form.line6_adjusted_regular_tax);
  const line7 = cents(form.line7_allowed_credit);
  if (
    line1 !== cents(source) || line3c !== line3a + line3b ||
    line4 !== Math.max(0, line2 - line3c) ||
    line6 !== Math.max(0, line4 - line5) ||
    line7 !== Math.min(line1, line6) || cents(filed) !== line7
  ) fail();
}
