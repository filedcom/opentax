import {
  calculateSection453aInterest,
  inputSchema,
} from "../../../../nodes/inputs/taxes/interest/f453a_interest/index.ts";

/** Require the retained obligation inventory for any Schedule 2 line 15 claim. */
export function assertSection453aSchedule2Line(
  filedAmount: unknown,
  source: unknown,
  filerSsn: unknown,
): void {
  if (source === undefined) {
    if (typeof filedAmount === "number" && filedAmount > 0) {
      throw new Error(
        "Schedule 2 line 15 needs a retained section 453A obligation workpaper",
      );
    }
    return;
  }
  const parsed = inputSchema.parse(source);
  if (
    typeof filerSsn !== "string" ||
    parsed.seller_taxpayer_ssn !== filerSsn.replaceAll("-", "")
  ) {
    throw new Error(
      "Schedule 2 line 15 section 453A workpaper seller differs from the filer",
    );
  }
  const calculated = calculateSection453aInterest(source);
  if ((filedAmount ?? 0) !== calculated) {
    throw new Error(
      "Schedule 2 line 15 differs from its section 453A obligation workpaper",
    );
  }
}
