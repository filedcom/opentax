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
  "../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

export type ScenarioScore = {
  readonly id: string;
  /** Reject-level findings: calculation errors, XML build stops, IRS rules. */
  readonly findings: readonly string[];
  /** null when the XML was not built or no local IRS schema is available. */
  readonly schemaValid: boolean | null;
  readonly valuesMatched: number;
  /** Mismatches recorded as packet errors, with page, in the scenario's reconciliation. */
  readonly valuesConflicting: number;
  readonly valuesCompared: number;
};

/**
 * A scenario passes when it files cleanly, validates, and every packet value either
 * matches or is a documented packet conflict.
 */
export function passes(score: ScenarioScore): boolean {
  return score.findings.length === 0 && score.schemaValid !== false &&
    score.valuesMatched + score.valuesConflicting === score.valuesCompared;
}

type Conflict = { page: number; printed: unknown; current: unknown };

/** A scenario's documented packet conflicts: `SCENARIO_1040_NN_RECONCILIATION.conflicts`. */
async function documentedConflicts(id: string): Promise<readonly Conflict[]> {
  const module: Record<string, unknown> = await import(
    `../../forms/f1040/e2e/ats/scenario_${id.replace("-", "_")}_input.ts`
  );
  return Object.entries(module)
    .filter(([name]) => name.endsWith("_RECONCILIATION"))
    .flatMap(([, value]) => {
      const conflicts = (value as { conflicts?: unknown }).conflicts;
      return Array.isArray(conflicts) ? conflicts as Conflict[] : [];
    })
    .filter((c) => typeof c.page === "number");
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
        const conflicts = await documentedConflicts(id);
        const findings = await returnFindings(inputs);
        return {
          id,
          findings,
          schemaValid: findings.some((f) => !f.startsWith("rule "))
            ? null
            : await schemaValid(inputs, dir, id),
          // MeF omits zero amounts, so an unproduced value the packet prints as 0 matches.
          valuesMatched: checks.filter((c) =>
            c.result === "match" ||
            (c.result === "not-produced" && c.expected === 0)
          ).length,
          valuesConflicting: checks.filter((c) =>
            c.result === "different" &&
            conflicts.some((k) =>
              k.printed === c.expected && k.current === c.actual
            )
          ).length,
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
  const unexplained = score.valuesCompared - score.valuesMatched -
    score.valuesConflicting;
  return `${
    passes(score) ? "PASS" : "FAIL"
  }  ${score.id}  values ${score.valuesMatched}/${score.valuesCompared} match, ${score.valuesConflicting} packet conflicts, ${unexplained} unexplained  xsd ${schema}  blockers: ${findings}`;
}

async function main(args: string[]): Promise<number> {
  const scores = await scoreScenarios();
  if (args.includes("--json")) {
    console.log(JSON.stringify(scores, null, 2));
  } else {
    for (const score of scores) console.log(row(score));
    const matched = scores.reduce((n, s) => n + s.valuesMatched, 0);
    const conflicting = scores.reduce((n, s) => n + s.valuesConflicting, 0);
    const compared = scores.reduce((n, s) => n + s.valuesCompared, 0);
    console.log(
      `${
        scores.filter(passes).length
      } of ${scores.length} TY2025 ATS scenarios pass; ${matched}/${compared} packet values match, ${conflicting} are documented packet conflicts`,
    );
  }
  // A readiness report, not a gate: scenarios are still being completed.
  return 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
