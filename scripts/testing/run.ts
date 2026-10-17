import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
/** Exact-discovery verification; full runs require exclusive ownership and no skips. */
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import {
  assertRuntimeUnchanged,
  assertTestInventory,
  classifiedIgnoredTests,
  failureBaselineSchema,
  junitSummary,
  openFailures,
  skipPolicySchema,
  testRunExitCode,
} from "./contracts.ts";
import {
  graphPreflight,
  runtimeSnapshot,
  testInventory,
} from "./repository.ts";
import { acquireFullRunLock, releaseFullRunLock } from "./full-lock.ts";
import { selectAffected } from "./affected.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const FORMS_BASELINE = "scripts/testing/forms-failure-baseline.json";
const IRS_CACHE_XSD =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";

/** Node, export and return-processing tests: hermetic and fast enough for every pull request. */
function isFormsGateTest(path: string): boolean {
  return /^forms\/[^/]+\/(nodes|mef|validation)\//.test(path) ||
    /^forms\/[^/]+\/\d{4}\/(mef|return-processing)\//.test(path);
}
// PDF and XSD round trips can take minutes; a test is only stopped when hung.
const TEST_TIMEOUT_MS = 30 * 60 * 1000;

/** Streams a child's output into a new private evidence file. */
async function retain(stream: ReadableStream<Uint8Array>, path: string) {
  const file = await fs.open(path, "wx", 0o600);
  try {
    const reader = stream.getReader();
    for (
      let read = await reader.read();
      !read.done;
      read = await reader.read()
    ) {
      await file.write(read.value);
    }
  } finally {
    await file.close();
  }
}

/** Optional environment inputs the tests read, for the requirements report. */
async function testEnvironmentInputs(
  root: string,
  tests: string[],
): Promise<string[]> {
  const names = new Set<string>();
  for (const path of tests) {
    const source = await fs.readFile(join(root, path), "utf8");
    for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}
const mode = process.argv.slice(2)[0] ?? "full";
if (!["full", "unit", "forms", "harness", "preflight"].includes(mode)) {
  throw new Error(`Unknown test mode: ${mode}`);
}
const changedFlag = process.argv.indexOf("--changed");
// Local fast path: only tests whose imports reach a change since this base.
const changedBase = changedFlag === -1
  ? null
  : process.argv[changedFlag + 1]?.replace(/^--.*/, "") || "origin/main";
if (changedBase !== null && !["unit", "forms"].includes(mode)) {
  throw new Error("--changed applies to the unit and forms modes");
}
// verify:changed type-checks once in the unit run, then passes this to the forms run.
const typecheck = !process.argv.includes("--typechecked");
if (!typecheck && changedBase === null) {
  throw new Error("--typechecked applies only with --changed");
}
const directory = join(root, ".state/research/testing");
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const evidence = await sys.makeTempDir({ dir: directory, prefix: `${mode}-` });
const lockPath = join(directory, "full.lock");
let lockOwned = false;
let code = 1;
const startedAt = new Date().toISOString();
let before: Awaited<ReturnType<typeof runtimeSnapshot>> = {};

async function requiredTools() {
  for (const tool of ["xmllint", "pdftotext", "pdftoppm"]) {
    const result = await new sys.Command(tool, {
      args: [tool === "xmllint" ? "--version" : "-v"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!result.success) {
      throw new Error(`Required full-run tool ${tool} exited ${result.code}`);
    }
  }
  const xsd = join(
    root,
    ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  );
  if (!(await sys.stat(xsd)).isFile) {
    throw new Error(`Required full-run Return1040 XSD missing: ${xsd}`);
  }
  return xsd;
}

try {
  before = await runtimeSnapshot(root);
  await sys.writeText(
    join(evidence, "runtime-before.json"),
    JSON.stringify(before, null, 2),
    { createNew: true, mode: 0o600 },
  );
  if (mode === "full") {
    await acquireFullRunLock(lockPath, {
      pid: process.pid,
      evidence,
      startedAt,
    });
    lockOwned = true;
  }
  const all = await testInventory(root);
  const candidates = mode === "harness"
    ? all.filter((path) =>
      path.startsWith("scripts/testing/") ||
      path === "benchmark/harness.test.ts"
    )
    : mode === "forms"
    ? all.filter(isFormsGateTest)
    : mode === "unit"
    ? all.filter((path) =>
      path.startsWith("core/") || path.startsWith("cli/utils/") ||
      path === "cli/network.test.ts" || path.startsWith("scripts/support/") ||
      path.startsWith("scripts/testing/") ||
      path === "benchmark/harness.test.ts"
    )
    : all;
  const gate = changedBase === null
    ? null
    : await selectAffected(root, changedBase, candidates);
  const selected = gate?.tests ?? candidates;
  if (gate) {
    console.log(
      `${selected.length} of ${candidates.length} ${mode} tests reach the ${gate.changed.length} file(s) changed since ${changedBase}${
        gate.everything ? " (a shared input changed, so all run)" : ""
      }`,
    );
  }
  // An empty changed-only selection is reported, never run as a passing test run.
  if (selected.length > 0 || gate === null) {
    assertTestInventory(selected, selected);
  }
  await sys.writeText(
    join(evidence, "discovery.json"),
    JSON.stringify(
      {
        mode,
        totalRepositoryModules: all.length,
        selected,
        excluded: all.filter((path) => !selected.includes(path)),
      },
      null,
      2,
    ),
    { createNew: true, mode: 0o600 },
  );
  const conditionalModules = [];
  for (const path of all) {
    const source = await fs.readFile(join(root, path), "utf8");
    if (/\bignore\s*:/.test(source)) conditionalModules.push(path);
  }
  const externalInputs = (await testEnvironmentInputs(root, all)).map((
    name,
  ) => ({ name, provided: Boolean(process.env[name]) }));
  const requiredXsd = mode === "full" ? await requiredTools() : null;
  await sys.writeText(
    join(evidence, "requirements.json"),
    JSON.stringify(
      {
        requiredXsd,
        conditionalModules,
        externalInputs,
        irsAcceptance: "unverified",
        independentTaxTruth: "not established by harness",
        scope: mode === "full"
          ? "Full typed tests; ignored cases cause failure"
          : "Selected verification; external filing requirements remain unproved",
      },
      null,
      2,
    ),
    { createNew: true, mode: 0o600 },
  );
  const graphModules = await graphPreflight(root, evidence, typecheck);
  if (mode === "preflight") {
    assertRuntimeUnchanged(before, await runtimeSnapshot(root));
    await sys.writeText(
      join(evidence, "terminal.json"),
      JSON.stringify({
        kind: "preflight",
        startedAt,
        endedAt: new Date().toISOString(),
        graphModules,
        testModules: all.length,
        testsExecuted: false,
        code: 0,
        runtimeUnchanged: true,
      }),
      { createNew: true, mode: 0o600 },
    );
    code = 0;
  } else if (selected.length === 0) {
    assertRuntimeUnchanged(before, await runtimeSnapshot(root));
    console.log(
      "No tests reach the change; module graph and type check passed",
    );
    code = 0;
  } else {
    const junitPath = join(evidence, "junit.xml");
    const child = new sys.Command(process.execPath, {
      args: [
        "test",
        // Each file gets a fresh global and module registry.
        mode === "full" || mode === "forms"
          ? `--parallel=${availableParallelism()}`
          : "--isolate",
        `--timeout=${TEST_TIMEOUT_MS}`,
        "--reporter=junit",
        `--reporter-outfile=${junitPath}`,
        // A bare argument is a name filter to bun test; ./ makes it a path.
        ...selected.map((path) => `./${path}`),
      ],
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const outputs = Promise.all([
      retain(child.stdout, join(evidence, "stdout.log")),
      retain(child.stderr, join(evidence, "stderr.log")),
    ]);
    const status = await child.status;
    await outputs;
    await sys.writeText(
      join(evidence, "child-status.json"),
      JSON.stringify({
        code: status.code,
        success: status.success,
        endedAt: new Date().toISOString(),
      }),
      { createNew: true, mode: 0o600 },
    );
    const after = await runtimeSnapshot(root);
    await sys.writeText(
      join(evidence, "runtime-after.json"),
      JSON.stringify(after, null, 2),
      { createNew: true, mode: 0o600 },
    );
    assertRuntimeUnchanged(before, after);
    assertTestInventory(
      selected,
      (await testInventory(root)).filter((path) => selected.includes(path)),
    );
    const summary = junitSummary(await fs.readFile(junitPath, "utf8"));
    assertTestInventory(selected, summary.modules);
    if (summary.ignored !== summary.ignoredTests.length) {
      throw new Error("Ignored JUnit cases do not match disabled count");
    }
    const skipPolicy = skipPolicySchema.parse(
      JSON.parse(
        await fs.readFile(
          new URL("./skip-policy.json", import.meta.url),
          "utf8",
        ),
      ),
    );
    const ignoredRequirements = classifiedIgnoredTests(
      summary.ignoredTests,
      mode === "full" ? skipPolicy : [],
    );
    const unavailable = ignoredRequirements.filter((test) =>
      test.disposition === "requirement-unavailable"
    ).length;
    code = testRunExitCode(
      status.code,
      summary.executed,
      unavailable,
      true,
      mode === "full",
    );
    if (mode === "forms") {
      const open = openFailures(
        summary.failedTests,
        failureBaselineSchema.parse(
          JSON.parse(await fs.readFile(join(root, FORMS_BASELINE), "utf8")),
        ).filter((entry) =>
          selected.includes(entry.module)
        ),
        new Date().toISOString().slice(0, 10),
        await fs.access(join(root, IRS_CACHE_XSD)).then(() => true, () =>
          false),
      );
      for (const problem of open) {
        console.error(problem);
      }
      console.log(
        `${summary.executed} form tests, ${summary.failedTests.length} failing, ${open.length} not in ${FORMS_BASELINE}`,
      );
      code = summary.executed > 0 && open.length === 0 ? 0 : 1;
    } else if (summary.failures !== 0) {
      code = 1;
    }
    await fs.chmod(junitPath, 0o600);
    await sys.writeText(
      join(evidence, "terminal.json"),
      JSON.stringify(
        {
          kind: "tests",
          mode,
          startedAt,
          endedAt: new Date().toISOString(),
          childCode: status.code,
          code,
          runtimeUnchanged: true,
          graphModules,
          selectedModules: selected.length,
          ignoredRequirements,
          fullScopeVerified: mode === "full" && summary.ignored === 0 &&
            code === 0,
          ...summary,
        },
        null,
        2,
      ),
      { createNew: true, mode: 0o600 },
    );
  }
} catch (error) {
  await sys.writeText(
    join(evidence, "failure.json"),
    JSON.stringify({
      startedAt,
      endedAt: new Date().toISOString(),
      mode,
      code: 1,
      error: error instanceof Error ? error.message : String(error),
    }),
    { createNew: true, mode: 0o600 },
  );
  console.error(error);
} finally {
  if (lockOwned) {
    try {
      await releaseFullRunLock(lockPath, {
        pid: process.pid,
        evidence,
        startedAt,
      });
    } catch (error) {
      code = 1;
      await sys.writeText(
        join(evidence, "lock-release-failure.json"),
        JSON.stringify({
          code,
          error: error instanceof Error ? error.message : String(error),
        }),
        { createNew: true, mode: 0o600 },
      );
      console.error(error);
    }
  }
}
await sys.writeText(
  join(evidence, "final-status.json"),
  JSON.stringify({ code, endedAt: new Date().toISOString() }),
  { createNew: true, mode: 0o600 },
);
console.log(`Verification evidence: ${evidence}`);
process.exit(code);
