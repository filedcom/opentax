import {
  inputSchema as f8912InputSchema,
  sourceLinesFromInput,
} from "../../../nodes/inputs/f8912/index.ts";

/** Replay Form 8912 bond source and allowed credit into Schedule 3 line 6k. */
export function assertSchedule3Form8912Credit(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule3 = pending.schedule3 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const filed = schedule3?.line6k_tax_credit_bonds ?? 0;
  const fail = (): never => {
    throw new Error(
      "Schedule 3 line 6k differs from retained Form 8912 credit",
    );
  };
  const raw = pending.f8912;
  if (raw === undefined) {
    if (filed !== 0) fail();
    return;
  }
  const source = sourceLinesFromInput(f8912InputSchema.parse(raw));
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
  if (source.line4 <= 0) {
    if (filed !== 0) fail();
    return;
  }
  const credit = cents(form.allowed_credit);
  if (
    cents(filed) !== credit || credit > cents(source.line4) ||
    cents(form.unused_credit) !== cents(source.line4) - credit
  ) fail();
}
