/** ATS readiness: each TY2025 and TY2026 IRS Assurance Testing scenario scored on what an ATS accept needs offline. */
import {
  ATS_SCENARIO_INPUTS,
  replayAtsChecks,
} from "../../forms/f1040/e2e/ats/ty2025-check-replay.ts";
import {
  exportedReturn,
  type RetainedDocument,
  validateAgainstXsd,
  xsdAvailable,
} from "../../forms/f1040/e2e/ats/ats-export.ts";
import type { MefPdfAttachment } from "../../forms/f1040/2025/mef/form-descriptor.ts";
import {
  scoreTy2026Scenarios,
  type Ty2026ScenarioScore,
  ty2026Passes,
} from "../../forms/f1040/e2e/ats/ty2026-ats.ts";

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
type ScenarioModule = Record<string, unknown>;

export async function scenarioModule(id: string): Promise<ScenarioModule> {
  return await import(
    `../../forms/f1040/e2e/ats/scenario_${id.replace("-", "_")}_input.ts`
  );
}

/** The files a scenario files with its return: `*Attachments()` and `*RetainedSourceDocuments()`. */
export async function scenarioFiles(module: ScenarioModule) {
  const call = async <T>(suffix: string): Promise<T[]> =>
    (await Promise.all(
      Object.entries(module)
        .filter(([name, value]) =>
          name.endsWith(suffix) && typeof value === "function"
        )
        .map(([, value]) => (value as () => T[] | Promise<T[]>)()),
    )).flat();
  return {
    attachments: await call<MefPdfAttachment>("Attachments"),
    retained: await call<RetainedDocument>("RetainedSourceDocuments"),
  };
}

/** A scenario's documented packet conflicts: `SCENARIO_1040_NN_RECONCILIATION.conflicts`. */
function documentedConflicts(module: ScenarioModule): readonly Conflict[] {
  return Object.entries(module)
    .filter(([name]) => name.endsWith("_RECONCILIATION"))
    .flatMap(([, value]) => {
      const conflicts = (value as { conflicts?: unknown }).conflicts;
      return Array.isArray(conflicts) ? conflicts as Conflict[] : [];
    })
    .filter((c) => typeof c.page === "number");
}

/** Reject-level findings and XSD validity, built the way export builds the return. */
async function filing(
  inputs: Record<string, unknown>,
  module: ScenarioModule,
): Promise<{ findings: string[]; schemaValid: boolean | null }> {
  const { attachments, retained } = await scenarioFiles(module);
  try {
    const { xml, rejects } = await exportedReturn(
      inputs,
      attachments,
      retained,
    );
    const findings = rejects.map((rule) => `rule ${rule}`);
    if (!(await xsdAvailable())) return { findings, schemaValid: null };
    const valid = await validateAgainstXsd(xml).then(() => true, () => false);
    return { findings, schemaValid: valid };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      findings: [`xml ${message.replace(/\s+/g, " ").trim().slice(0, 160)}`],
      schemaValid: null,
    };
  }
}

export async function scoreScenarios(): Promise<ScenarioScore[]> {
  const replay = await replayAtsChecks();
  return await Promise.all(
    Object.entries(ATS_SCENARIO_INPUTS).map(async ([id, factory]) => {
      const inputs = await factory() as Record<string, unknown>;
      const checks = replay.scenarios.find((s) => s.id === id)?.checks ?? [];
      const module = await scenarioModule(id);
      const conflicts = documentedConflicts(module);
      const { findings, schemaValid } = await filing(inputs, module);
      return {
        id,
        findings,
        schemaValid,
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

function ty2026Row(score: Ty2026ScenarioScore): string {
  const schema = score.schemaValid === null
    ? "n/a"
    : score.schemaValid
    ? "valid"
    : "INVALID";
  const unexplained = score.valuesCompared - score.valuesMatched -
    score.valuesConflicting - score.valuesUnrepresentable;
  const gaps = [...score.schemaGaps, ...score.unsupportedFacts];
  return `${
    ty2026Passes(score) ? "PASS" : "FAIL"
  }  ${score.id}  values ${score.valuesMatched}/${score.valuesCompared} match, ${score.valuesConflicting} packet conflicts, ${score.valuesUnrepresentable} not in 2026v1.0, ${unexplained} unexplained  xsd ${schema}  blockers: ${
    score.findings.length === 0 ? "none" : score.findings.join("; ")
  }${gaps.length ? `  gaps: ${gaps.join("; ")}` : ""}`;
}

async function main(args: string[]): Promise<number> {
  const scores = await scoreScenarios();
  const ty2026 = await scoreTy2026Scenarios();
  if (args.includes("--json")) {
    console.log(JSON.stringify(
      [...scores.map((s) => ({ ...s, taxYear: 2025 })), ...ty2026],
      null,
      2,
    ));
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
    console.log("");
    for (const score of ty2026) console.log(ty2026Row(score));
    console.log(
      `${ty2026.filter(ty2026Passes).length} of ${ty2026.length} TY2026 ATS scenarios pass (2026v1.0 schema and rules)`,
    );
  }
  // A readiness report, not a gate: scenarios are still being completed.
  return 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
