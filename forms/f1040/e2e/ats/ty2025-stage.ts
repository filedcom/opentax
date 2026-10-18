/**
 * Stage the TY2025 ATS scenarios as returns in the CLI store, each with its
 * attachments, retained source copies and residency review, so that
 * `opentax mef ats-run` can transmit them.
 *
 * Usage: bun run ats:stage [--store <returns dir>] [1040-01 1040-03 ...]
 */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import {
  scenarioFiles,
  scenarioModule,
} from "../../../../scripts/testing/ats.ts";
import { saveCliReturn } from "./ats-export.ts";
import { ATS_SCENARIO_INPUTS } from "./ty2025-check-replay.ts";
import { atsResidencyReview } from "./ty2025-submission.ts";

/** Scenario 2's Form 1098 issuer copy is raw bytes the JSON CLI store cannot hold yet. */
export const ATS_CLI_INPUT_GAP: ReadonlySet<string> = new Set(["1040-02"]);

export const ATS_STAGEABLE_SCENARIOS: readonly string[] = Object.keys(
  ATS_SCENARIO_INPUTS,
).filter((id) => !ATS_CLI_INPUT_GAP.has(id));

export type StagedReturn = {
  readonly scenario: string;
  readonly returnId: string;
};

export async function stageAtsReturns(
  baseDir: string,
  scenarios: readonly string[] = ATS_STAGEABLE_SCENARIOS,
): Promise<StagedReturn[]> {
  const staged: StagedReturn[] = [];
  for (const scenario of scenarios) {
    if (!ATS_STAGEABLE_SCENARIOS.includes(scenario)) {
      throw new Error(`No CLI-stageable TY2025 ATS scenario ${scenario}`);
    }
    const factory =
      ATS_SCENARIO_INPUTS[scenario as keyof typeof ATS_SCENARIO_INPUTS];
    const inputs = await factory() as Record<string, unknown>;
    const { attachments, retained } = await scenarioFiles(
      await scenarioModule(scenario),
    );
    const returnId = await saveCliReturn(
      baseDir,
      inputs,
      attachments,
      retained,
    );
    await fs.writeFile(
      join(baseDir, returnId, "residency-review.json"),
      JSON.stringify(atsResidencyReview(inputs), null, 2),
    );
    staged.push({ scenario, returnId });
  }
  return staged;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const storeAt = args.indexOf("--store");
  const baseDir = storeAt >= 0 ? args[storeAt + 1] : "./.state/returns";
  const scenarios = storeAt >= 0
    ? args.filter((_, i) => i !== storeAt && i !== storeAt + 1)
    : args;
  console.log(JSON.stringify(
    await stageAtsReturns(
      baseDir,
      scenarios.length > 0 ? scenarios : undefined,
    ),
    null,
    2,
  ));
}
