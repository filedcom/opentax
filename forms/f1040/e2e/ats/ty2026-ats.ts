/** TY2026 ATS readiness: each TY2026 Form 1040 packet built, validated and compared offline. */
import { XMLParser } from "fast-xml-parser";
import { catalog } from "../../../../catalog.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  type RetainedDocument,
  validateAgainstXsd,
  xsdAvailable,
} from "./ats-export.ts";
import { compareAtsW2Values, type W2Target } from "./ty2025-w2-value-coverage.ts";
import {
  SCENARIO_1040_05_TY2026_FACTS,
  TY2026_ATS_CASES,
} from "./ty2026_cases.ts";
import { ty2026Scenario104005Input } from "./ty2026_scenario_1040_05_input.ts";
import {
  SCENARIO_1040_01_TY2026_RECONCILIATION,
  SCENARIO_1040_01_TY2026_TARGETS,
  SCENARIO_1040_01_TY2026_W2_TARGETS,
  ty2026Scenario104001Input,
} from "./ty2026_scenario_1040_01_input.ts";
import {
  SCENARIO_1040_02_TY2026_RECONCILIATION,
  SCENARIO_1040_02_TY2026_TARGETS,
  SCENARIO_1040_02_TY2026_W2_TARGETS,
  ty2026Scenario104002Input,
} from "./ty2026_scenario_1040_02_input.ts";
import {
  SCENARIO_1040_03_TY2026_RECONCILIATION,
  SCENARIO_1040_03_TY2026_TARGETS,
  ty2026Scenario104003Input,
} from "./ty2026_scenario_1040_03_input.ts";
import {
  SCENARIO_1040_04_TY2026_RECONCILIATION,
  SCENARIO_1040_04_TY2026_TARGETS,
  SCENARIO_1040_04_TY2026_W2_TARGETS,
  ty2026Scenario104004Input,
  ty2026Scenario104004RetainedSourceDocuments,
} from "./ty2026_scenario_1040_04_input.ts";
import {
  SCENARIO_1040_06_TY2026_RECONCILIATION,
  SCENARIO_1040_06_TY2026_TARGETS,
  SCENARIO_1040_06_TY2026_W2_TARGETS,
  ty2026Scenario104006Input,
} from "./ty2026_scenario_1040_06_input.ts";
import {
  SCENARIO_1040_12_TY2026_RECONCILIATION,
  SCENARIO_1040_12_TY2026_TARGETS,
  SCENARIO_1040_12_TY2026_W2_TARGETS,
  ty2026Scenario104012Input,
} from "./ty2026_scenario_1040_12_input.ts";
import {
  SCENARIO_1040_13_TY2026_RECONCILIATION,
  SCENARIO_1040_13_TY2026_TARGETS,
  SCENARIO_1040_13_TY2026_W2_TARGETS,
  ty2026Scenario104013Input,
} from "./ty2026_scenario_1040_13_input.ts";
import {
  SCENARIO_1040_14_TY2026_RECONCILIATION,
  SCENARIO_1040_14_TY2026_TARGETS,
  SCENARIO_1040_14_TY2026_W2_TARGETS,
  ty2026Scenario104014Input,
} from "./ty2026_scenario_1040_14_input.ts";

/**
 * One printed packet value. `path` walks the MeF ReturnData from the form's
 * document (`Doc/Group[i]/Element`); null means 2026v1.0 has no element for it.
 */
export type Ty2026PacketTarget = {
  readonly page: number;
  readonly line: string;
  readonly path: string | null;
  readonly expected: number | string;
};

type Conflict = {
  readonly page: number;
  readonly line: string;
  readonly printed: number;
  readonly current: number;
};

type Ty2026Fixture = {
  readonly input: () =>
    | Record<string, unknown>
    | Promise<Record<string, unknown>>;
  readonly targets: readonly Ty2026PacketTarget[];
  readonly w2Targets: readonly W2Target[];
  readonly conflicts: readonly Conflict[];
  /** Untransmitted source copies the export verifies (Form 8862 notices). */
  readonly retained?: () => readonly RetainedDocument[];
};

export const RETURN_1040_2026_XSD = new URL(
  "../../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

/**
 * ReturnTs is the processing date: IND-002 and IND-689-01 read it, so the
 * return is signed and processed on a fixed 2027 filing-season day.
 */
export const TY2026_ATS_PROCESSING_TIMESTAMP = "2027-02-01T12:00:00Z";
const SIGNATURE_DATE = "2027-02-01";

const S5 = SCENARIO_1040_05_TY2026_FACTS;
const S5_TARGETS: readonly Ty2026PacketTarget[] = (
  [
    [0, S5.form8888.first, "1"],
    [1, S5.form8888.second, "2"],
  ] as const
).flatMap(([i, account, typeCd]) => [
  ["RoutingTransitNum", account.routingNumber],
  ["DepositorAccountNum", account.accountNumber],
  ["BankAccountTypeCd", typeCd],
].map(([element, expected]) => ({
  page: 5,
  line: `Form 8888 account ${i + 1} ${element}`,
  path: `IRS8888/DirectDepositInfoGroup[${i}]/${element}`,
  expected,
})));

export const TY2026_ATS_FIXTURES: Readonly<Record<string, Ty2026Fixture>> = {
  "1040-01": {
    input: ty2026Scenario104001Input,
    targets: SCENARIO_1040_01_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_01_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_01_TY2026_RECONCILIATION.conflicts,
  },
  "1040-02": {
    input: ty2026Scenario104002Input,
    targets: SCENARIO_1040_02_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_02_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_02_TY2026_RECONCILIATION.conflicts,
  },
  "1040-03": {
    input: ty2026Scenario104003Input,
    targets: SCENARIO_1040_03_TY2026_TARGETS,
    w2Targets: [],
    conflicts: SCENARIO_1040_03_TY2026_RECONCILIATION.conflicts,
  },
  "1040-04": {
    input: ty2026Scenario104004Input,
    targets: SCENARIO_1040_04_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_04_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_04_TY2026_RECONCILIATION.conflicts,
    retained: ty2026Scenario104004RetainedSourceDocuments,
  },
  "1040-05": {
    input: ty2026Scenario104005Input,
    targets: S5_TARGETS,
    w2Targets: [{
      sourcePage: 4,
      employerName: S5.w2.employerName,
      fields: {
        EmployeeSSN: S5.w2.employeeSsn,
        EmployerEIN: S5.w2.employerEin,
        WagesAmt: S5.w2.box1Wages,
        WithholdingAmt: S5.w2.box2FederalWithholding,
        SocialSecurityWagesAmt: S5.w2.box3SocialSecurityWages,
        SocialSecurityTaxAmt: S5.w2.box4SocialSecurityWithholding,
        MedicareWagesAndTipsAmt: S5.w2.box5MedicareWages,
        MedicareTaxWithheldAmt: S5.w2.box6MedicareWithholding,
        StatutoryEmployeeInd: false,
        RetirementPlanInd: false,
      },
    }],
    conflicts: [],
  },
  "1040-06": {
    input: ty2026Scenario104006Input,
    targets: SCENARIO_1040_06_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_06_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_06_TY2026_RECONCILIATION.conflicts,
  },
  "1040-12": {
    input: ty2026Scenario104012Input,
    targets: SCENARIO_1040_12_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_12_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_12_TY2026_RECONCILIATION.conflicts,
  },
  "1040-13": {
    input: ty2026Scenario104013Input,
    targets: SCENARIO_1040_13_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_13_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_13_TY2026_RECONCILIATION.conflicts,
  },
  "1040-14": {
    input: ty2026Scenario104014Input,
    targets: SCENARIO_1040_14_TY2026_TARGETS,
    w2Targets: SCENARIO_1040_14_TY2026_W2_TARGETS,
    conflicts: SCENARIO_1040_14_TY2026_RECONCILIATION.conflicts,
  },
};

export type Ty2026ValueResult =
  | "match"
  | "conflict"
  | "different"
  | "unrepresentable"
  | "not-produced";

export type Ty2026ScenarioScore = {
  readonly id: string;
  readonly taxYear: 2026;
  readonly unsupportedFacts: readonly string[];
  readonly schemaGaps: readonly string[];
  /** Reject-level findings: graph errors, XML build stops, IRS rules. */
  readonly findings: readonly string[];
  /** null when there is no fixture, the XML was not built or the schema is absent. */
  readonly schemaValid: boolean | null;
  readonly valuesMatched: number;
  readonly valuesConflicting: number;
  /** Printed values with no 2026v1.0 schema element. */
  readonly valuesUnrepresentable: number;
  readonly valuesCompared: number;
};

/** Build the TY2026 return as `return export --type mef` does; reject-level rule ids. */
export async function exportedTy2026Return(
  inputs: Record<string, unknown>,
  retained: readonly RetainedDocument[] = [],
) {
  const def = catalog["f1040:2026"];
  const input = signed(inputs);
  const result = def.executeReturn({
    ...input,
    general: {
      ...(input.general as Record<string, unknown>),
      taxpayer_signature_date: SIGNATURE_DATE,
    },
  });
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((d) => `${d.nodeType}: ${d.message}`).join("; "));
  }
  const pending = normalizeAllPending(result.pending);
  const identity = extractFilerIdentity(pending.f1040 ?? {});
  const filer = identity &&
    { ...identity, timestamp: TY2026_ATS_PROCESSING_TIMESTAMP };
  const xml = (await def.prepareReturn(pending, filer, [], retained)).bundle
    .xml;
  const rejects = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(xml),
  ).entries.filter((e) =>
    e.severity === "reject" || e.severity === "reject_and_stop"
  ).map((e) => e.ruleNumber).sort();
  return { pending, xml, rejects };
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
});

function xmlValue(data: unknown, path: string): unknown {
  return path.split("/").reduce<unknown>((node, step) => {
    const [, name, index] = step.match(/^([A-Za-z0-9]+)(?:\[(\d+)\])?$/) ?? [];
    if (node === null || typeof node !== "object" || !name) return undefined;
    const value = (node as Record<string, unknown>)[name];
    const list = Array.isArray(value) ? value : [value];
    return list[Number(index ?? 0)];
  }, data);
}

function compareTarget(
  returnData: unknown,
  target: Ty2026PacketTarget,
  conflicts: readonly Conflict[],
): Ty2026ValueResult {
  if (target.path === null) return "unrepresentable";
  if (returnData === undefined) return "not-produced";
  const raw = xmlValue(returnData, target.path);
  // MeF omits zero amounts, so an absent element the packet prints as 0 matches.
  if (raw === undefined) return target.expected === 0 ? "match" : "not-produced";
  const actual = typeof target.expected === "number" ? Number(raw) : raw;
  if (actual === target.expected) return "match";
  return conflicts.some((c) =>
      c.line === target.line && c.printed === target.expected &&
      c.current === actual
    )
    ? "conflict"
    : "different";
}

async function filing(fixture: Ty2026Fixture) {
  try {
    const { xml, rejects } = await exportedTy2026Return(
      await fixture.input(),
      fixture.retained?.() ?? [],
    );
    const schemaValid = await xsdAvailable(RETURN_1040_2026_XSD)
      ? await validateAgainstXsd(xml, RETURN_1040_2026_XSD).then(
        () => true,
        () => false,
      )
      : null;
    return { xml, findings: rejects.map((r) => `rule ${r}`), schemaValid };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      xml: null,
      findings: [`xml ${message.replace(/\s+/g, " ").trim().slice(0, 200)}`],
      schemaValid: null,
    };
  }
}

/** Every packet value compared, with its result; for reports and tests. */
export async function ty2026ScenarioValues(id: string) {
  const fixture = TY2026_ATS_FIXTURES[id];
  if (!fixture) return null;
  const built = await filing(fixture);
  const parsed = built.xml === null ? undefined : parser.parse(built.xml);
  const returnData = parsed?.Return?.ReturnData;
  const values = fixture.targets.map((target) => ({
    ...target,
    result: compareTarget(returnData, target, fixture.conflicts),
  }));
  const w2 = compareAtsW2Values(built.xml, fixture.w2Targets).rows.map((
    row,
  ) => ({
    page: row.sourcePage,
    line: `W-2 ${row.employerName} ${row.field}`,
    path: `IRSW2/${row.field}`,
    expected: row.expected,
    result: (row.result === "match"
      ? "match"
      : row.result === "different"
      ? "different"
      : "not-produced") as Ty2026ValueResult,
  }));
  return { ...built, values: [...values, ...w2] };
}

export async function scoreTy2026Scenarios(): Promise<Ty2026ScenarioScore[]> {
  const scores: Ty2026ScenarioScore[] = [];
  for (const c of TY2026_ATS_CASES.filter((c) => c.returnType === "1040")) {
    const built = await ty2026ScenarioValues(c.id);
    const count = (result: Ty2026ValueResult) =>
      built?.values.filter((v) => v.result === result).length ?? 0;
    scores.push({
      id: c.id,
      taxYear: 2026,
      unsupportedFacts: c.unsupportedFacts,
      schemaGaps: c.schemaGaps,
      findings: built?.findings ?? ["no fixture transcribed"],
      schemaValid: built?.schemaValid ?? null,
      valuesMatched: count("match"),
      valuesConflicting: count("conflict"),
      valuesUnrepresentable: count("unrepresentable"),
      valuesCompared: built?.values.length ?? 0,
    });
  }
  return scores;
}

/**
 * Passes when it files cleanly, validates against 2026v1.0, and every printed
 * value either matches or is a documented packet conflict.
 */
export function ty2026Passes(score: Ty2026ScenarioScore): boolean {
  return score.valuesCompared > 0 && score.findings.length === 0 &&
    score.schemaValid !== false && score.unsupportedFacts.length === 0 &&
    score.schemaGaps.length === 0 && score.valuesUnrepresentable === 0 &&
    score.valuesMatched + score.valuesConflicting === score.valuesCompared;
}
