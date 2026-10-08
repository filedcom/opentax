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
const suiteSchema = z.object({
  "@_name": z.string(),
  "@_tests": z.coerce.number().int().nonnegative(),
  "@_disabled": z.coerce.number().int().nonnegative().default(0),
  "@_failures": z.coerce.number().int().nonnegative(),
  "@_errors": z.coerce.number().int().nonnegative(),
  testcase: z.union([testcaseSchema, z.array(testcaseSchema)]).optional(),
}).passthrough();
const junitSchema = z.object({
  testsuites: z.object({
    "@_tests": z.coerce.number().int().nonnegative(),
    "@_failures": z.coerce.number().int().nonnegative(),
    "@_errors": z.coerce.number().int().nonnegative(),
    testsuite: z.union([suiteSchema, z.array(suiteSchema)]),
  }),
});

export function junitSummary(xml: string) {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Invalid JUnit XML: ${validation.err.msg}`);
  }
  const parsed = junitSchema.parse(
    new XMLParser({ ignoreAttributes: false }).parse(xml),
  );
  const suites = Array.isArray(parsed.testsuites.testsuite)
    ? parsed.testsuites.testsuite
    : [parsed.testsuites.testsuite];
  for (const suite of suites) {
    const cases = Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
      ? [suite.testcase]
      : [];
    const disabled = cases.filter((test) => "skipped" in test).length;
    const failures = cases.filter((test) => "failure" in test).length;
    const errors = cases.filter((test) => "error" in test).length;
    if (
      suite["@_tests"] !== cases.length || suite["@_disabled"] !== disabled ||
      suite["@_failures"] !== failures || suite["@_errors"] !== errors
    ) throw new Error(`JUnit testcase counts disagree for ${suite["@_name"]}`);
  }
  for (const field of ["@_tests", "@_failures", "@_errors"] as const) {
    if (
      parsed.testsuites[field] !==
        suites.reduce((sum, suite) => sum + suite[field], 0)
    ) throw new Error(`JUnit aggregate ${field} disagrees`);
  }
  const ignoredTests = suites.flatMap((suite) => {
    const cases = Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
      ? [suite.testcase]
      : [];
    return cases.filter((test) => "skipped" in test).map((test) => ({
      module: suite["@_name"].replace(/^\.\//, ""),
      name: test["@_name"],
    }));
  });
  return {
    modules: suites.map((suite) => suite["@_name"].replace(/^\.\//, "")),
    executed: suites.reduce(
      (sum, suite) => sum + suite["@_tests"] - suite["@_disabled"],
      0,
    ),
    ignored: suites.reduce((sum, suite) => sum + suite["@_disabled"], 0),
    failures: suites.reduce(
      (sum, suite) => sum + suite["@_failures"] + suite["@_errors"],
      0,
    ),
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
