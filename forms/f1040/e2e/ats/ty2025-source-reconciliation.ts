import { SCENARIO_1040_01_RECONCILIATION as s1 } from "./scenario_1040_01_input.ts";
import { SCENARIO_1040_02_RECONCILIATION as s2 } from "./scenario_1040_02_input.ts";
import { SCENARIO_1040_03_RECONCILIATION as s3 } from "./scenario_1040_03_input.ts";
import { SCENARIO_1040_04_RECONCILIATION as s4 } from "./scenario_1040_04_input.ts";
import { SCENARIO_1040_05_RECONCILIATION as s5 } from "./scenario_1040_05_input.ts";
import { SCENARIO_1040_08_RECONCILIATION as s8 } from "./scenario_1040_08_input.ts";
import { SCENARIO_1040_12_RECONCILIATION as s12 } from "./scenario_1040_12_input.ts";
import { SCENARIO_1040_13_RECONCILIATION as s13 } from "./scenario_1040_13_input.ts";

const notes: Readonly<Record<string, readonly string[]>> = {
  "1040-01": s1.missing,
  "1040-02": s2.missing,
  "1040-03": s3.notAtsReadyBecause,
  "1040-04": s4.packetConflicts,
  "1040-05": s5.packetConflicts,
  "1040-08": s8.missing,
  "1040-12": s12.missing,
  "1040-13": s13.missing,
};

/** Reviewed fixture gaps are not calculation failures or additional ATS checks.
 * Preserve all known notes even when native preparation stops at its first guard.
 */
export function atsSourceReconciliation(id: string) {
  const knownNotes = notes[id];
  if (!knownNotes) throw new Error(`Missing ATS source reconciliation: ${id}`);
  return {
    scope:
      "Known source gaps and interpretation notes; not a complete requirements inventory or an additional check denominator.",
    completeRequirementsInventoried: false as const,
    notes: [...knownNotes],
  };
}
