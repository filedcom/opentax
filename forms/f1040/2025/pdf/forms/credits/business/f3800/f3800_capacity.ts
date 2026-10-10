import type { Form3800DocumentParts } from "../../../../../mef/forms/credits/business/f3800/f3800_document.ts";

/** Slots printed on the official TY2025 Form 3800 pages 8 and 9. */
export const FORM3800_PRINTED_PART_V_ROWS = 15;
export const FORM3800_PRINTED_PART_VI_ROWS = 35;

/** Reconcile current-source counts before paginating detail pages. */
export function assertForm3800PrintableDetailCapacity(
  parts: Form3800DocumentParts,
): void {
  const aggregateLines = new Set(
    parts.currentRows.flatMap((row) =>
      row.metadata.sourceCount > 1 ? [row.line] : []
    ),
  );
  const partVRows = [
    ...parts.currentDetails,
    ...parts.passiveCurrentDetails,
  ].filter((row) => aggregateLines.has(row.line));
  for (const row of parts.currentRows) {
    const count = row.metadata.sourceCount;
    if (
      count > 1 &&
      partVRows.filter((detail) => detail.line === row.line).length !== count
    ) {
      throw new Error(
        `Form 3800 printable Part V line ${row.line} source count does not reconcile`,
      );
    }
  }
}
