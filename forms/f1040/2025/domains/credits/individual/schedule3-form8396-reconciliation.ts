import { calculateForm8396 } from "../../../../nodes/intermediate/forms/credits/individual/form8396/calculation.ts";
import { sourceFromPending } from "../../../mef/forms/credits/individual/f8396.ts";

const lines = [
  "line1",
  "line2",
  "line3",
  "line4",
  "line5",
  "line6",
  "line7",
  "line8",
  "line9",
  "line10",
  "line12",
  "line13",
  "line14",
  "line15",
  "line16",
  "line17",
] as const;

/** Replay retained Form 8396 source and limit into Schedule 3 line 6g. */
export function assertSchedule3Form8396Credit(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule3 = pending.schedule3 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const filed = schedule3?.line6g_mortgage_interest_credit ?? 0;
  const fail = (): never => {
    throw new Error(
      "Schedule 3 line 6g differs from retained Form 8396 credit",
    );
  };
  const raw = pending.form8396;
  if (raw === undefined) {
    if (filed !== 0) fail();
    return;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  const form = raw as Readonly<Record<string, unknown>>;
  if (form.certificate_issuer_name === undefined) {
    if (filed !== 0) fail();
    return;
  }
  const worksheet1 = form.credit_limit_worksheet_line1;
  const worksheet2 = form.credit_limit_worksheet_line2;
  if (
    typeof worksheet1 !== "number" || !Number.isSafeInteger(worksheet1) ||
    worksheet1 < 0 || typeof worksheet2 !== "number" ||
    !Number.isSafeInteger(worksheet2) || worksheet2 < 0
  ) return fail();
  const source = sourceFromPending(
    form as Parameters<typeof sourceFromPending>[0],
  );
  const calculated = calculateForm8396(
    source,
    Math.max(0, worksheet1 - worksheet2),
  );
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    filed !== calculated.line9 ||
    lines.some((key) => form[key] !== calculated[key])
  ) fail();
}
