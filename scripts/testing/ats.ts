/** ATS readiness: each IRS Assurance Testing scenario scored on what an ATS accept needs offline. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../support/sys.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import {
  ATS_SCENARIO_INPUTS,
  replayAtsChecks,
} from "../../forms/f1040/e2e/ats/ty2025-check-replay.ts";
import { returnFindings, signed } from "./mef.ts";

const RETURN_XSD = new URL(
  "../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

export type ScenarioScore = {
  readonly id: string;
  /** Reject-level findings: calculation errors, XML build stops, IRS rules. */
  readonly findings: readonly string[];
  /** null when the XML was not built or no local IRS schema is available. */
  readonly schemaValid: boolean | null;
  readonly valuesMatched: number;
  readonly valuesCompared: number;
};

/** A scenario passes when it files cleanly, validates, and matches every packet value. */
export function passes(score: ScenarioScore): boolean {
  return score.findings.length === 0 && score.schemaValid !== false &&
    score.valuesMatched === score.valuesCompared;
}

async function schemaValid(
  inputs: Record<string, unknown>,
  dir: string,
  id: string,
): Promise<boolean | null> {
  if (!(await fs.access(RETURN_XSD).then(() => true, () => false))) {
    return null;
  }
  const result = f1040_2025.executeReturn(signed(inputs));
  const pending = normalizeAllPending(result.pending);
  const xml = await f1040_2025.prepareReturn(
    pending,
    extractFilerIdentity(pending.f1040 ?? {}),
    [],
  ).then((prepared) => prepared.bundle.xml, () => null);
  if (xml === null) return null;
  const path = join(dir, `${id}.xml`);
  await fs.writeFile(path, xml);
  const out = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", RETURN_XSD, path],
    stdout: "null",
    stderr: "null",
  }).output();
  return out.code === 0;
}

export async function scoreScenarios(): Promise<ScenarioScore[]> {
  const replay = await replayAtsChecks();
  const dir = await sys.makeTempDir({ prefix: "opentax-ats-" });
  try {
    return await Promise.all(
      Object.entries(ATS_SCENARIO_INPUTS).map(async ([id, factory]) => {
        const inputs = factory() as Record<string, unknown>;
        const checks = replay.scenarios.find((s) => s.id === id)?.checks ?? [];
        const findings = await returnFindings(inputs);
        return {
          id,
          findings,
          schemaValid: findings.some((f) => !f.startsWith("rule "))
            ? null
            : await schemaValid(inputs, dir, id),
          valuesMatched: checks.filter((c) => c.result === "match").length,
          valuesCompared: checks.length,
        };
      }),
    );
  } finally {
    await sys.remove(dir, { recursive: true });
  }
}

function row(score: ScenarioScore): string {
  const schema = score.schemaValid === null
    ? "n/a"
    : score.schemaValid
    ? "valid"
    : "INVALID";
  const findings = score.findings.length === 0
    ? "none"
    : score.findings.slice(0, 3).join("; ") +
      (score.findings.length > 3 ? ` (+${score.findings.length - 3})` : "");
  return `${passes(score) ? "PASS" : "FAIL"}  ${score.id}  values ${score.valuesMatched}/${score.valuesCompared}  xsd ${schema}  blockers: ${findings}`;
}

async function main(args: string[]): Promise<number> {
  const scores = await scoreScenarios();
  if (args.includes("--json")) {
    console.log(JSON.stringify(scores, null, 2));
  } else {
    for (const score of scores) console.log(row(score));
    const matched = scores.reduce((n, s) => n + s.valuesMatched, 0);
    const compared = scores.reduce((n, s) => n + s.valuesCompared, 0);
    console.log(
      `${scores.filter(passes).length} of ${scores.length} TY2025 ATS scenarios pass; ${matched}/${compared} packet values match`,
    );
  }
  // A readiness report, not a gate: scenarios are still being completed.
  return 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
