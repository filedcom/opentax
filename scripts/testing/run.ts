/** Exact-discovery verification; full runs require exclusive ownership and no skips. */
import { dirname, fromFileUrl, join } from "@std/path";
import {
  assertRuntimeUnchanged,
  assertTestInventory,
  classifiedIgnoredTests,
  junitSummary,
  skipPolicySchema,
  testRunExitCode,
} from "./contracts.ts";
import {
  graphPreflight,
  runtimeSnapshot,
  testInventory,
} from "./repository.ts";
import { acquireFullRunLock, releaseFullRunLock } from "./full-lock.ts";
import { TEST_PERMISSIONS } from "./permissions.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const mode = Deno.args[0] ?? "full";
if (!["full", "unit", "harness", "preflight"].includes(mode)) {
  throw new Error(`Unknown test mode: ${mode}`);
}
const directory = join(root, ".state/research/testing");
await Deno.mkdir(directory, { recursive: true, mode: 0o700 });
const evidence = await Deno.makeTempDir({ dir: directory, prefix: `${mode}-` });
const lockPath = join(directory, "full.lock");
let lockOwned = false;
let code = 1;
const startedAt = new Date().toISOString();
let before: Awaited<ReturnType<typeof runtimeSnapshot>> = {};

async function requiredTools() {
  for (const tool of ["xmllint", "pdftotext", "pdftoppm"]) {
    const result = await new Deno.Command(tool, {
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
  if (!(await Deno.stat(xsd)).isFile) {
    throw new Error(`Required full-run Return1040 XSD missing: ${xsd}`);
  }
  return xsd;
}

try {
  before = await runtimeSnapshot(root);
  await Deno.writeTextFile(
    join(evidence, "runtime-before.json"),
    JSON.stringify(before, null, 2),
    { createNew: true, mode: 0o600 },
  );
  if (mode === "full") {
    await acquireFullRunLock(lockPath, { pid: Deno.pid, evidence, startedAt });
    lockOwned = true;
  }
  const all = await testInventory(root);
  const selected = mode === "harness"
    ? all.filter((path) =>
      path.startsWith("scripts/testing/") ||
      path === "benchmark/harness.test.ts"
    )
    : mode === "unit"
    ? all.filter((path) =>
      path.startsWith("core/") || path.startsWith("cli/utils/") ||
      path.startsWith("scripts/testing/") ||
      path === "benchmark/harness.test.ts"
    )
    : all;
  assertTestInventory(selected, selected);
  await Deno.writeTextFile(
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
    const source = await Deno.readTextFile(join(root, path));
    if (/\bignore\s*:/.test(source)) conditionalModules.push(path);
  }
  const envFlag = TEST_PERMISSIONS.find((flag) =>
    flag.startsWith("--allow-env=")
  );
  const externalInputs =
    (envFlag?.slice("--allow-env=".length).split(",") ?? []).map((name) => ({
      name,
      provided: Boolean(Deno.env.get(name)),
    }));
  const requiredXsd = mode === "full" ? await requiredTools() : null;
  await Deno.writeTextFile(
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
  const graphModules = await graphPreflight(root, evidence);
  if (mode === "preflight") {
    assertRuntimeUnchanged(before, await runtimeSnapshot(root));
    await Deno.writeTextFile(
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
  } else {
    const junitPath = join(evidence, "junit.xml");
    const child = new Deno.Command("deno", {
      args: [
        "test",
        ...TEST_PERMISSIONS,
        "--reporter=junit",
        `--junit-path=${junitPath}`,
        ...selected,
      ],
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const stdout = await Deno.open(join(evidence, "stdout.log"), {
      write: true,
      createNew: true,
      mode: 0o600,
    });
    const stderr = await Deno.open(join(evidence, "stderr.log"), {
      write: true,
      createNew: true,
      mode: 0o600,
    });
    const outputs = Promise.all([
      child.stdout.pipeTo(stdout.writable),
      child.stderr.pipeTo(stderr.writable),
    ]);
    const status = await child.status;
    await outputs;
    await Deno.writeTextFile(
      join(evidence, "child-status.json"),
      JSON.stringify({
        code: status.code,
        success: status.success,
        endedAt: new Date().toISOString(),
      }),
      { createNew: true, mode: 0o600 },
    );
    const after = await runtimeSnapshot(root);
    await Deno.writeTextFile(
      join(evidence, "runtime-after.json"),
      JSON.stringify(after, null, 2),
      { createNew: true, mode: 0o600 },
    );
    assertRuntimeUnchanged(before, after);
    assertTestInventory(
      selected,
      (await testInventory(root)).filter((path) => selected.includes(path)),
    );
    const summary = junitSummary(await Deno.readTextFile(junitPath));
    assertTestInventory(selected, summary.modules);
    if (summary.ignored !== summary.ignoredTests.length) {
      throw new Error("Ignored JUnit cases do not match disabled count");
    }
    const skipPolicy = skipPolicySchema.parse(
      JSON.parse(
        await Deno.readTextFile(new URL("./skip-policy.json", import.meta.url)),
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
    if (summary.failures !== 0) {
      code = 1;
    }
    await Deno.chmod(junitPath, 0o600);
    await Deno.writeTextFile(
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
  await Deno.writeTextFile(
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
        pid: Deno.pid,
        evidence,
        startedAt,
      });
    } catch (error) {
      code = 1;
      await Deno.writeTextFile(
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
await Deno.writeTextFile(
  join(evidence, "final-status.json"),
  JSON.stringify({ code, endedAt: new Date().toISOString() }),
  { createNew: true, mode: 0o600 },
);
console.log(`Verification evidence: ${evidence}`);
Deno.exit(code);
