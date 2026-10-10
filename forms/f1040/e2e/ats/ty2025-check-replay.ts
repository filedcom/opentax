import { compareAtsDocuments } from "./ty2025-document-coverage.ts";
import { z } from "zod";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { f1040_2025 } from "../../2025/index.ts";
import { scenario104001Input } from "./scenario_1040_01_input.ts";
import { scenario104002Input } from "./scenario_1040_02_input.ts";
import { scenario104003Input } from "./scenario_1040_03_input.ts";
import { scenario104004Input } from "./scenario_1040_04_input.ts";
import { scenario104005PartialInput } from "./scenario_1040_05_input.ts";
import { scenario104008Input } from "./scenario_1040_08_input.ts";
import { scenario104012PartialInput } from "./scenario_1040_12_input.ts";
import { scenario104013CurrentLawInput } from "./scenario_1040_13_input.ts";
import { TY2025_ATS_CASES } from "./ty2025_cases.ts";

export enum TargetBasis {
  Printed = "printed-source",
  Derived = "source-arithmetic",
  Provisional = "provisional-source-interpretation",
}
export enum CheckResult {
  Match = "match",
  Different = "different",
  NotProduced = "not-produced",
}
const targetSchema = z.object({
  path: z.string().min(1),
  expected: z.union([z.number(), z.boolean()]),
  basis: z.nativeEnum(TargetBasis),
  sourceLocation: z.string().min(1),
});
const scenarioSchema = z.object({
  id: z.string(),
  targets: z.array(targetSchema).min(1),
});
const target = (
  path: string,
  expected: number | boolean,
  basis: TargetBasis,
  sourceLocation: string,
) => targetSchema.parse({ path, expected, basis, sourceLocation });
const printed1040 = (field: string, expected: number) =>
  target(`f1040.${field}`, expected, TargetBasis.Printed, "Form 1040 pp. 2–3");
const wage = (amount: number, withholding: number) => [
  target(
    "f1040.line1a_wages",
    amount,
    TargetBasis.Derived,
    "Issued W-2 box 1, excluding statutory employee receipts",
  ),
  target(
    "f1040.line25a_w2_withheld",
    withholding,
    TargetBasis.Derived,
    "Sum of issued W-2 box 2 amounts",
  ),
];
// Deliberately fixed independently of executor results. Printed contradictions
// remain targets; changing an expected value to match the engine hides evidence.
export const ATS_REPLAY_TARGETS = z.array(scenarioSchema).parse([
  {
    id: "1040-01",
    targets: [
      ...wage(42470, 2713),
      target(
        "schedule2.line9_household_employment",
        474,
        TargetBasis.Derived,
        "Schedule H: 3,100 × 12.4% rounded + 3,100 × 2.9% rounded",
      ),
    ],
  },
  {
    id: "1040-02",
    targets: [
      ...wage(8513, 1164),
      target(
        "schedule1.line3_schedule_c",
        26979,
        TargetBasis.Derived,
        "Schedule C: statutory receipts29,513 less expenses2,534",
      ),
    ],
  },
  {
    id: "1040-03",
    targets: [
      target(
        "f1040.line5a_pension_gross",
        53778,
        TargetBasis.Printed,
        "1099-R p.4 box1",
      ),
      target(
        "f1040.line5b_pension_taxable",
        43100,
        TargetBasis.Printed,
        "1099-R p.4 box2a",
      ),
      target(
        "f1040.line25b_withheld_1099",
        3405,
        TargetBasis.Printed,
        "1099-R p.4 box4",
      ),
      target(
        "schedule1.line6_schedule_f",
        3251,
        TargetBasis.Derived,
        "Schedule F pp.13–14:8,111 less4,860",
      ),
      target(
        "schedule2.line4_se_tax",
        827,
        TargetBasis.Derived,
        "Farm optional election: rounded2/3 ×8,111 earnings; filed SE component tax",
      ),
      target(
        "schedule1.line15_se_deduction",
        414,
        TargetBasis.Derived,
        "Half of filed827 SE tax, rounded",
      ),
    ],
  },
  { id: "1040-04", targets: wage(36014, 4581) },
  {
    id: "1040-05",
    targets: [
      ...wage(31232, 1754),
      target(
        "f1040.taxpayer_blind",
        true,
        TargetBasis.Printed,
        "Form1040 p.2 blindness mark",
      ),
      target(
        "f1040.digital_assets",
        false,
        TargetBasis.Printed,
        "Form1040 p.2 digital-assets No",
      ),
    ],
  },
  {
    id: "1040-08",
    targets: [
      target(
        "f1040.line5a_pension_gross",
        20300,
        TargetBasis.Printed,
        "Code G 1099-R gross distribution",
      ),
      target(
        "f1040.line5b_pension_taxable",
        10300,
        TargetBasis.Printed,
        "Code G 1099-R taxable distribution",
      ),
      target(
        "f1040.line5c_pension_rollover",
        true,
        TargetBasis.Printed,
        "Form1040 p.2 line5c",
      ),
      target(
        "f1040.line6a_ss_gross",
        1000,
        TargetBasis.Printed,
        "Cover sheet Social Security benefits",
      ),
      target(
        "f1040.line7a_cap_gain_distrib",
        7500,
        TargetBasis.Printed,
        "Cover sheet REIT capital-gain distribution",
      ),
      target(
        "f1040.line9_total_income",
        17800,
        TargetBasis.Provisional,
        "Source-backed provisional interpretation; printed QCD unresolved",
      ),
      target(
        "f1040.line12a_standard_deduction",
        17350,
        TargetBasis.Provisional,
        "MFS taxpayer age72; QCD/source questions unresolved",
      ),
      target(
        "f1040.line15_taxable_income",
        450,
        TargetBasis.Provisional,
        "17,800 less17,350 under provisional interpretation",
      ),
      target(
        "f1040.line24_total_tax",
        0,
        TargetBasis.Provisional,
        "Provisional qualified-gain return; not printed acceptance target",
      ),
      target(
        "f1040.line25b_withheld_1099",
        2555,
        TargetBasis.Printed,
        "Code G 1099-R box4",
      ),
      target(
        "f1040.line35a_refund",
        2555,
        TargetBasis.Provisional,
        "Provisional zero-tax return; QCD unresolved",
      ),
    ],
  },
  {
    id: "1040-12",
    targets: [
      printed1040("line1a_wages", 100836),
      printed1040("line8_additional_income", 24328),
      printed1040("line9_total_income", 125164),
      printed1040("line10_adjustments", 2719),
      printed1040("line11_agi", 122445),
      printed1040("line12a_standard_deduction", 15000),
      printed1040("line15_taxable_income", 107445),
      printed1040("line16_income_tax", 18634),
      printed1040("line23_other_taxes", 3438),
      printed1040("line24_total_tax", 22072),
      printed1040("line25a_w2_withheld", 14444),
      printed1040("line37_amount_owed", 7628),
      target(
        "schedule1.line15_se_deduction",
        1719,
        TargetBasis.Printed,
        "Schedule SE p.10 line13",
      ),
      target(
        "schedule1.line17_se_health_insurance",
        1000,
        TargetBasis.Printed,
        "Form7206 printed deduction; eligibility/source records incomplete",
      ),
    ],
  },
  {
    id: "1040-13",
    targets: [
      printed1040("line1a_wages", 31620),
      printed1040("line11_agi", 31620),
      printed1040("line12a_standard_deduction", 30000),
      printed1040("line15_taxable_income", 1620),
      printed1040("line16_income_tax", 162),
      printed1040("line20_nonrefundable_credits", 162),
      printed1040("line24_total_tax", 0),
      printed1040("line25a_w2_withheld", 609),
      printed1040("line34_overpayment", 609),
      printed1040("line35a_refund", 609),
      target(
        "schedule3.line6j_alt_fuel_vehicle_refueling",
        162,
        TargetBasis.Printed,
        "Schedule3 line6j; printed stale tax limit remains unresolved",
      ),
    ],
  },
]);
const inputs = {
  "1040-01": scenario104001Input,
  "1040-02": scenario104002Input,
  "1040-03": scenario104003Input,
  "1040-04": scenario104004Input,
  "1040-05": scenario104005PartialInput,
  "1040-08": scenario104008Input,
  "1040-12": scenario104012PartialInput,
  "1040-13": scenario104013CurrentLawInput,
} as const;

export function compareAtsTarget(
  pending: unknown,
  check: z.infer<typeof targetSchema>,
) {
  const actual = check.path.split(".").reduce<unknown>(
    (value, key) =>
      value !== null && typeof value === "object" && key in value
        ? (value as Record<string, unknown>)[key]
        : undefined,
    pending,
  );
  return {
    ...check,
    actual: actual ?? null,
    result: actual === undefined || actual === null
      ? CheckResult.NotProduced
      : actual === check.expected
      ? CheckResult.Match
      : CheckResult.Different,
  };
}
export enum PreparationResult {
  GraphBlocked = "graph-blocked",
  NativeBlocked = "native-blocked",
  PartialPrepared = "partial-prepared",
}
async function replayPreparation(
  execution: ReturnType<typeof f1040_2025.executeReturn>,
) {
  if (execution.diagnostics.some((d) => d.severity === "error")) {
    return {
      result: PreparationResult.GraphBlocked,
      documentRoots: [],
      reason: "Resolve graph diagnostics before preparation",
    };
  }
  try {
    const prepared = await f1040_2025.prepareReturn(
      execution.pending,
      extractFilerIdentity(execution.pending.f1040),
    );
    return {
      result: PreparationResult.PartialPrepared,
      documentRoots: [
        ...prepared.bundle.xml.matchAll(
          /<([A-Za-z0-9]+)\b[^>]*\bdocumentId="/g,
        ),
      ].map((m) => m[1]),
      reason:
        "Preparation of a partial fixture does not establish required-source completeness, XSD, PDF or IRS acceptance",
    };
  } catch (error) {
    return {
      result: PreparationResult.NativeBlocked,
      documentRoots: [],
      reason: String(error),
    };
  }
}
export async function replayAtsChecks() {
  const scenarios = await Promise.all(
    ATS_REPLAY_TARGETS.map(async (scenario) => {
      const source = TY2025_ATS_CASES.find((s) => s.id === scenario.id)!;
      const factory = inputs[scenario.id as keyof typeof inputs];
      if (!source || !factory) {
        throw new Error(`Missing ATS source/input ${scenario.id}`);
      }
      const execution = f1040_2025.executeReturn(factory());
      const preparation = await replayPreparation(execution);
      return {
        id: scenario.id,
        sourceUrl: source.sourceUrl,
        interpretation: scenario.id === "1040-13"
          ? "Current-law reconstruction; printed ATS targets preserved"
          : "Partial source fixture",
        requiredSourceDocuments: source.forms,
        diagnostics: execution.diagnostics,
        preparation,
        documentCoverage: compareAtsDocuments(
          source.forms,
          preparation.result === PreparationResult.PartialPrepared
            ? preparation.documentRoots
            : null,
        ),
        checks: scenario.targets.map((check) =>
          compareAtsTarget(execution.pending, check)
        ),
      };
    }),
  );
  const checks = scenarios.flatMap((s) => s.checks);
  return {
    scope:
      "Selected calculation observations from partial fixtures; not IRS business-rule assertions, native/PDF proof, or complete ATS scenarios.",
    denominator: checks.length,
    counts: Object.fromEntries(
      Object.values(CheckResult).map((state) => [
        state,
        checks.filter((c) => c.result === state).length,
      ]),
    ),
    byBasis: Object.fromEntries(
      Object.values(TargetBasis).map((
        basis,
      ) => [
        basis,
        Object.fromEntries(
          Object.values(CheckResult).map((state) => [
            state,
            checks.filter((c) => c.basis === basis && c.result === state)
              .length,
          ]),
        ),
      ]),
    ),
    scenarios,
  };
}
if (import.meta.main) {
  const report = JSON.stringify(await replayAtsChecks(), null, 2) + "\n";
  if (Deno.args[0]) await Deno.writeTextFile(Deno.args[0], report);
  else console.log(report);
}
