import { z } from "zod";

// Source inventory names map to actual TY2025 native document roots.
const roots = {
  "1040": "IRS1040",
  "W-2": "IRSW2",
  "1099-R": "IRS1099R",
  "Schedule 1": "IRS1040Schedule1",
  "Schedule 2": "IRS1040Schedule2",
  "Schedule 3": "IRS1040Schedule3",
  "Schedule A": "IRS1040ScheduleA",
  "Schedule C": "IRS1040ScheduleC",
  "Schedule D": "IRS1040ScheduleD",
  "Schedule E": "IRS1040ScheduleE",
  "Schedule F": "IRS1040ScheduleF",
  "Schedule H": "IRS1040ScheduleH",
  "Schedule SE": "IRS1040ScheduleSE",
  "Schedule EIC": "IRS1040ScheduleEIC",
  "Schedule 8812": "IRS1040Schedule8812",
  "2441": "IRS2441",
  "3800": "IRS3800",
  "4835": "IRS4835",
  "5695": "IRS5695",
  "6251": "IRS6251",
  "7206": "IRS7206",
  "7217": "IRS7217",
  "8283": "IRS8283",
  "8835": "IRS8835",
  "8862": "IRS8862",
  "8863": "IRS8863",
  "8911": "IRS8911",
  "8911 Schedule A": "IRS8911ScheduleA",
  "8936": "IRS8936",
  "8936 Schedule A": "IRS8936ScheduleA",
} as const;
export enum DocumentCoverageResult {
  Present = "present",
  Missing = "missing",
  NotEvaluated = "not-evaluated",
  Unmapped = "unmapped",
}
const rowSchema = z.object({
  sourceForm: z.string(),
  nativeRoot: z.string().nullable(),
  requiredCopies: z.number().int().positive(),
  observedCopies: z.number().int().nonnegative().nullable(),
  missingCopies: z.number().int().nonnegative().nullable(),
  result: z.nativeEnum(DocumentCoverageResult),
});

/** A blocked preparation has no observable bundle, not proof of missing forms.
 * Copy presence alone never establishes correct ownership, values or acceptance.
 */
export function compareAtsDocuments(
  sourceForms: readonly string[],
  preparedRoots: readonly string[] | null,
) {
  const rows = [...new Set(sourceForms)].map((sourceForm) => {
    const nativeRoot = Object.hasOwn(roots, sourceForm)
      ? roots[sourceForm as keyof typeof roots]
      : null;
    const requiredCopies = sourceForms.filter((f) => f === sourceForm).length;
    const observedCopies = nativeRoot && preparedRoots !== null
      ? preparedRoots.filter((r) => r === nativeRoot).length
      : null;
    const missingCopies = observedCopies === null
      ? null
      : Math.max(0, requiredCopies - observedCopies);
    return rowSchema.parse({
      sourceForm,
      nativeRoot,
      requiredCopies,
      observedCopies,
      missingCopies,
      result: !nativeRoot
        ? DocumentCoverageResult.Unmapped
        : observedCopies === null
        ? DocumentCoverageResult.NotEvaluated
        : missingCopies === 0
        ? DocumentCoverageResult.Present
        : DocumentCoverageResult.Missing,
    });
  });
  return {
    scope:
      "Native document copy presence only; not source, owner, content, PDF, attachment, business-rule or IRS acceptance verification",
    requiredCopies: sourceForms.length,
    requiredCopiesObserved: rows.reduce(
      (sum, row) => sum + Math.min(row.requiredCopies, row.observedCopies ?? 0),
      0,
    ),
    allRequiredCopiesPresent: rows.length > 0 && rows.every(
      (row) => row.result === DocumentCoverageResult.Present,
    ),
    unmappedSourceForms: rows.filter((r) =>
      r.result === DocumentCoverageResult.Unmapped
    ).map((r) => r.sourceForm),
    additionalRoots:
      preparedRoots?.filter((r) => !rows.some((row) => row.nativeRoot === r)) ??
        [],
    rows,
  };
}
