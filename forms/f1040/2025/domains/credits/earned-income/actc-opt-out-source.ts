import { actcOptOutAnswer, inputSchema } from "../../../../nodes/inputs/credits/child/f8812/index.ts";

/** Read the Form 1040 line 28 election from retained Schedule 8812 source. */
export function retainedActcOptOut(
  rawSource: unknown,
  line28Actc: unknown,
): boolean {
  if (rawSource === undefined) return false;
  const source = inputSchema.parse(rawSource);
  const optedOut = actcOptOutAnswer(source.f8812s ?? []);
  const filedAmount = Array.isArray(line28Actc)
    ? line28Actc.at(-1)
    : line28Actc;
  if (
    optedOut && filedAmount !== undefined && filedAmount !== null &&
    filedAmount !== 0
  ) {
    throw new Error("Form 1040 ACTC opt-out requires zero line 28 credit");
  }
  return optedOut;
}
