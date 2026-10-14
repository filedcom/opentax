import { assertEquals } from "@std/assert";
import {
  compareAtsDocuments,
  DocumentCoverageResult,
} from "./ty2025-document-coverage.ts";
import { TY2025_ATS_CASES } from "./ty2025_cases.ts";

Deno.test("ATS document coverage counts repeated issued copies rather than unique roots", () => {
  const result = compareAtsDocuments(["1040", "W-2", "W-2"], [
    "IRS1040",
    "IRSW2",
  ]);
  assertEquals(result.requiredCopies, 3);
  assertEquals(result.requiredCopiesObserved, 2);
  assertEquals(result.allRequiredCopiesPresent, false);
  assertEquals(result.rows[1].missingCopies, 1);
  assertEquals(
    compareAtsDocuments(["1099-R", "1099-R"], ["IRS1099R", "IRS1099R"])
      .allRequiredCopiesPresent,
    true,
  );
});
Deno.test("ATS blocked preparation keeps document presence unknown", () => {
  const result = compareAtsDocuments(["1040", "W-2"], null);
  assertEquals(result.allRequiredCopiesPresent, false);
  assertEquals(
    result.rows.map((r) => [r.observedCopies, r.missingCopies, r.result]),
    [
      [null, null, DocumentCoverageResult.NotEvaluated],
      [null, null, DocumentCoverageResult.NotEvaluated],
    ],
  );
  assertEquals(
    compareAtsDocuments(["1040"], []).rows[0].result,
    DocumentCoverageResult.Missing,
  );
});
Deno.test("ATS unknown source forms never disappear from the completeness denominator", () => {
  const result = compareAtsDocuments(["1040", "Future form"], [
    "IRS1040",
    "IRSFutureForm",
  ]);
  assertEquals(result.requiredCopies, 2);
  assertEquals(result.unmappedSourceForms, ["Future form"]);
  assertEquals(result.additionalRoots, ["IRSFutureForm"]);
  assertEquals(result.allRequiredCopiesPresent, false);
  assertEquals(compareAtsDocuments([], []).allRequiredCopiesPresent, false);
});
Deno.test("ATS extra documents cannot substitute for a missing required form", () => {
  const result = compareAtsDocuments(["1040", "Schedule 3"], [
    "IRS1040",
    "IRSW2",
    "IRSW2",
  ]);
  assertEquals(result.requiredCopiesObserved, 1);
  assertEquals(result.rows[1].missingCopies, 1);
  assertEquals(result.allRequiredCopiesPresent, false);
});
Deno.test("ATS parent and numbered Schedule A documents stay distinct", () => {
  const result = compareAtsDocuments([
    "8911",
    "8911 Schedule A",
    "Schedule A",
    "8936 Schedule A",
  ], ["IRS8911", "IRS1040ScheduleA", "IRS8936ScheduleA"]);
  assertEquals(result.rows.map((r) => r.missingCopies), [0, 1, 0, 0]);
});
Deno.test("All eight retained Form1040 inventories have explicit native mappings", () => {
  const cases = TY2025_ATS_CASES.filter((s) => s.returnType === "1040");
  assertEquals(cases.length, 8);
  assertEquals(cases.reduce((sum, s) => sum + s.forms.length, 0), 56);
  for (const entry of cases) {
    assertEquals(
      compareAtsDocuments(entry.forms, null).unmappedSourceForms,
      [],
    );
  }
});
