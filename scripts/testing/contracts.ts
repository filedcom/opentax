import { z } from "zod";
import { XMLParser, XMLValidator } from "fast-xml-parser";

const graphSchema = z.object({
  modules: z.array(
    z.object({ specifier: z.string(), error: z.string().optional() })
      .passthrough(),
  ).min(1),
}).passthrough();

export function assertHealthyModuleGraph(value: unknown): number {
  const graph = graphSchema.parse(value);
  const errors: string[] = [];
  function inspect(item: unknown): void {
    if (Array.isArray(item)) {
      for (const child of item) inspect(child);
      return;
    }
    if (item === null || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (key === "error" && child) errors.push(String(child));
      inspect(child);
    }
  }
  inspect(graph);
  if (errors.length) {
    throw new Error(
      `Module graph has ${errors.length} error(s): ${errors.join("; ")}`,
    );
  }
  return graph.modules.length;
}

export function discoveredTestModules(paths: string[]): string[] {
  return paths.filter((path) =>
    /(?:^|\/)(?:.*[._])?test\.(?:[cm]?[jt]sx?)$/.test(path) ||
    /\/__tests__\/.*\.(?:[cm]?[jt]sx?)$/.test(path)
  ).sort();
}

export function assertTestInventory(
  expected: string[],
  actual: string[],
): void {
  if (expected.length === 0 || actual.length === 0) {
    throw new Error("Zero test modules are not a passing run");
  }
  if (new Set(actual).size !== actual.length) {
    throw new Error("Duplicate test modules");
  }
  if (
    JSON.stringify([...expected].sort()) !== JSON.stringify([...actual].sort())
  ) throw new Error("Test module inventory changed");
}

export const runtimeSnapshotSchema = z.record(
  z.string().regex(/^[a-f0-9]{64}$/),
);
export function assertRuntimeUnchanged(
  before: z.infer<typeof runtimeSnapshotSchema>,
  after: z.infer<typeof runtimeSnapshotSchema>,
): void {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort();
  const changed = paths.filter((path) => before[path] !== after[path]);
  if (changed.length) {
    throw new Error(
      `Runtime changed during verification: ${changed.join(", ")}`,
    );
  }
}

export function testRunExitCode(
  childCode: number,
  executed: number,
  ignored: number,
  unchanged: boolean,
  strict: boolean,
): number {
  return childCode === 0 && executed > 0 && unchanged &&
      (!strict || ignored === 0)
    ? 0
    : 1;
}

const testcaseSchema = z.object({ "@_name": z.string() }).passthrough();
type Testcase = z.infer<typeof testcaseSchema>;
const counts = {
  "@_tests": z.coerce.number().int().nonnegative(),
  "@_failures": z.coerce.number().int().nonnegative(),
  "@_skipped": z.coerce.number().int().nonnegative(),
};
type Suite = {
  "@_name": string;
  "@_tests": number;
  "@_failures": number;
  "@_skipped": number;
  testcase?: Testcase | Testcase[];
  testsuite?: Suite | Suite[];
};
// Bun nests a testsuite per describe() block inside each file's testsuite.
const suiteSchema: z.ZodType<Suite, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    "@_name": z.string(),
    ...counts,
    testcase: z.union([testcaseSchema, z.array(testcaseSchema)]).optional(),
    testsuite: z.union([suiteSchema, z.array(suiteSchema)]).optional(),
  }).passthrough()
);
const junitSchema = z.object({
  testsuites: z.object({
    ...counts,
    testsuite: z.union([suiteSchema, z.array(suiteSchema)]),
  }),
});

function list<T>(value: T | T[] | undefined): T[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

/** Every testcase of a file, including those inside describe() blocks. */
function suiteCases(suite: Suite): Testcase[] {
  return [
    ...list(suite.testcase),
    ...list(suite.testsuite).flatMap(suiteCases),
  ];
}

/** Bun's JUnit report, with every count checked against the cases it lists. */
export function junitSummary(xml: string) {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Invalid JUnit XML: ${validation.err.msg}`);
  }
  const parsed = junitSchema.parse(
    new XMLParser({ ignoreAttributes: false }).parse(xml),
  );
  const suites = list(parsed.testsuites.testsuite);
  const check = (suite: Suite): void => {
    const cases = suiteCases(suite);
    if (
      suite["@_tests"] !== cases.length ||
      suite["@_skipped"] !== cases.filter((test) => "skipped" in test).length ||
      suite["@_failures"] !==
        cases.filter((test) => "failure" in test || "error" in test).length
    ) throw new Error(`JUnit testcase counts disagree for ${suite["@_name"]}`);
    list(suite.testsuite).forEach(check);
  };
  suites.forEach(check);
  for (const field of ["@_tests", "@_failures", "@_skipped"] as const) {
    if (
      parsed.testsuites[field] !==
        suites.reduce((sum, suite) => sum + suite[field], 0)
    ) throw new Error(`JUnit aggregate ${field} disagrees`);
  }
  const module = (suite: Suite) => suite["@_name"].replace(/^\.\//, "");
  const ignoredTests = suites.flatMap((suite) =>
    suiteCases(suite).filter((test) => "skipped" in test).map((test) => ({
      module: module(suite),
      name: test["@_name"],
    }))
  );
  return {
    modules: suites.map(module),
    executed: suites.reduce(
      (sum, suite) => sum + suite["@_tests"] - suite["@_skipped"],
      0,
    ),
    ignored: suites.reduce((sum, suite) => sum + suite["@_skipped"], 0),
    failures: suites.reduce((sum, suite) => sum + suite["@_failures"], 0),
    suites,
    ignoredTests,
  };
}

export const skipPolicySchema = z.array(
  z.object({
    module: z.string().min(1),
    name: z.string().min(1),
    reason: z.string().min(1),
    disposition: z.literal("intentionally-excluded"),
  }).strict(),
);
export function classifiedIgnoredTests(
  ignored: Array<{ module: string; name: string }>,
  policy: z.infer<typeof skipPolicySchema>,
) {
  const identities = policy.map((entry) =>
    JSON.stringify([entry.module, entry.name])
  );
  if (new Set(identities).size !== identities.length) {
    throw new Error("Duplicate ignored-test policy entry");
  }
  for (const entry of policy) {
    if (
      !ignored.some((test) =>
        test.module === entry.module && test.name === entry.name
      )
    ) {
      throw new Error(
        `Stale ignored-test exclusion: ${entry.module}: ${entry.name}`,
      );
    }
  }
  return ignored.map((test) => {
    const exclusion = policy.find((entry) =>
      entry.module === test.module && entry.name === test.name
    );
    return {
      ...test,
      disposition: exclusion
        ? "intentionally-excluded"
        : "requirement-unavailable",
      reason: exclusion?.reason ??
        "Test's prerequisite guard was not satisfied; inspect the exact test and requirements report",
      verified: false as const,
    };
  });
}

export function assertGraphCoverage(
  expectedSpecifiers: string[],
  value: unknown,
): void {
  const graph = graphSchema.parse(value);
  const actual = new Set(graph.modules.map((module) => module.specifier));
  const missing = expectedSpecifiers.filter((specifier) =>
    !actual.has(specifier)
  );
  if (expectedSpecifiers.length === 0 || missing.length) {
    throw new Error(`Incomplete module graph: ${missing.join(", ")}`);
  }
}
