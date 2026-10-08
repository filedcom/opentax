import {
  inputSchema as f8859InputSchema,
  totalCarryforward,
} from "../../../nodes/inputs/f8859/index.ts";

/** Replay retained Form 8859 carryforward and allowed credit into Schedule 3. */
export function assertSchedule3Form8859Credit(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule3 = pending.schedule3 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const filed = schedule3?.line6h_dc_homebuyer_credit ?? 0;
  const raw = pending.f8859;
  const fail = (): never => {
    throw new Error(
      "Schedule 3 line 6h differs from retained Form 8859 credit",
    );
  };
  if (raw === undefined) {
    if (filed !== 0) fail();
    return;
  }
  const source = f8859InputSchema.parse(raw);
  const total = totalCarryforward(source.f8859s);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  const form = raw as Readonly<Record<string, unknown>>;
  const cents = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return fail();
    }
    const rounded = Math.round(value * 100);
    if (
      !Number.isSafeInteger(rounded) ||
      Math.abs(value * 100 - rounded) > 0.000001
    ) {
      return fail();
    }
    return rounded;
  };
  if (total === 0) {
    if (filed !== 0) fail();
    return;
  }
  const sourceCents = cents(total);
  const line1 = cents(form.line1_carryforward);
  const line2 = cents(form.line2_limit);
  const line3 = cents(form.line3_allowed_credit);
  const line4 = cents(form.line4_carryforward);
  if (
    cents(filed) !== line3 || line1 !== sourceCents ||
    line3 > line1 || line3 > line2 || line4 !== line1 - line3
  ) fail();
}
