import { assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";
import { assertForm3800PrintableDetailCapacity } from "./f3800_capacity.ts";

const lines = calculateForm3800Nonpassive({
  filingStatus: FilingStatus.Single,
  regularTax: 100,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 100,
  specifiedCredit: 0,
}, ZERO_FORM3800_PASSIVE_ACTIVITY);

function printableParts(partV: number, partVI: number): Form3800DocumentParts {
  return {
    lines,
    transferStatementIds: [],
    currentRows: [{
      line: "1h" as const,
      metadata: { sourceCount: partV },
      entityCredits: [],
      xml: "<Form8820CYCreditsGrp/>",
    }],
    currentAmounts: [],
    carryoverRows: [],
    currentDetails: Array.from({ length: partV }, (_, index) => ({
      line: "1h" as const,
      credit: 100,
      appliedCredit: 0,
      passThroughEin: String(100_000_000 + index),
    })),
    carryoverDetails: Array.from({ length: partVI }, () => ({
      line: "1h" as const,
      xml: "<Frm8820CYCyovCrGrp/>",
    })),
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  };
}

Deno.test("Form 3800 nine-page printable capacity accepts all 15 Part V and 35 Part VI slots", () => {
  assertForm3800PrintableDetailCapacity(printableParts(15, 35));
});

Deno.test("Form 3800 nine-page printable capacity rejects unsupported overflow", () => {
  assertThrows(
    () => assertForm3800PrintableDetailCapacity(printableParts(16, 35)),
    Error,
    "Part V has 16 breakdown rows",
  );
  assertThrows(
    () => assertForm3800PrintableDetailCapacity(printableParts(15, 36)),
    Error,
    "Part VI has 36 breakdown rows",
  );
});

Deno.test("Form 3800 printable capacity rejects a missing aggregate source before output", () => {
  const parts = printableParts(2, 0);
  assertThrows(
    () =>
      assertForm3800PrintableDetailCapacity({
        ...parts,
        currentDetails: parts.currentDetails.slice(0, 1),
      }),
    Error,
    "source count does not reconcile",
  );
});
