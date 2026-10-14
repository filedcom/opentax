import {
  assertForm8814CalculatedLines,
  type Form8814Lines,
} from "../../../../../nodes/inputs/income/investments/f8814/index.ts";

/** Form 8814 line 15 is added after Schedule J's elected line 23. */
export function scheduleJChildElectionTax(
  pending: Readonly<Record<string, unknown>>,
): number {
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  const filed = f1040?.form8814_tax;
  if (filed === undefined && pending.form8814 === undefined) return 0;
  const lines = (pending.form8814 as { items?: Form8814Lines[] } | undefined)
    ?.items;
  const owner = f1040?.taxpayer_ssn;
  if (
    !Array.isArray(lines) || lines.length === 0 ||
    typeof owner !== "string" ||
    typeof filed !== "number" || !Number.isSafeInteger(filed) || filed < 0
  ) {
    throw new Error("Schedule J needs retained Form 8814 child election tax");
  }
  assertForm8814CalculatedLines(lines, owner);
  if (lines.reduce((sum, line) => sum + line.line15, 0) !== filed) {
    throw new Error("Schedule J Form 8814 tax differs from child elections");
  }
  return filed;
}
