import { element } from "../../../../../../mef/xml.ts";

// IRS8995A lines 21/23 and IRS8995AScheduleA lines 6/8/19/21 enumerate only
// the TY2025 amounts in both 2025v5.4 and 2026v1.0 (rules F8995A-004-06,
// F8995A-007, SA-F8995A-003-06, SA-F8995A-006).
const THRESHOLD_CODES: ReadonlySet<number> = new Set([197_300, 394_600]);
const PHASE_IN_RANGE_CODES: ReadonlySet<number> = new Set([50_000, 100_000]);

function schemaCode(
  tag: string,
  codes: ReadonlySet<number>,
  value: number | undefined,
): string {
  if (value !== undefined && !codes.has(value)) {
    throw new Error(
      `Form 8995-A ${tag} ${value} is not a value the MeF schema enumerates; export waits for a schema that carries the return year's amounts`,
    );
  }
  return element(tag, value);
}

export function thresholdCodeElement(value: number | undefined): string {
  return schemaCode("FilingStatusThresholdCd", THRESHOLD_CODES, value);
}

export function phaseInRangeCodeElement(value: number | undefined): string {
  return schemaCode("FilingStatusPhaseInRangeCd", PHASE_IN_RANGE_CODES, value);
}
