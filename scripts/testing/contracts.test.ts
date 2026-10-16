import { test } from "bun:test";
import { verificationInputPaths } from "./repository.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  assertGraphCoverage,
  assertHealthyModuleGraph,
  assertRuntimeUnchanged,
  assertTestInventory,
  classifiedIgnoredTests,
  discoveredTestModules,
  junitSummary,
  testRunExitCode,
} from "./contracts.ts";

test("graph exit zero does not excuse module or dependency resolution errors", () => {
  assertEquals(
    assertHealthyModuleGraph({ modules: [{ specifier: "file:///ok.ts" }] }),
    1,
  );
  assertThrows(
    () =>
      assertHealthyModuleGraph({
        modules: [{ specifier: "jsr:broken", error: "manifest failed" }],
      }),
    Error,
    "manifest failed",
  );
  assertThrows(
    () =>
      assertHealthyModuleGraph({
        modules: [{
          specifier: "file:///ok",
          dependencies: [{ code: { error: "unresolved import" } }],
        }],
      }),
    Error,
    "unresolved import",
  );
  assertThrows(() => assertHealthyModuleGraph({ modules: [] }));
});

test("test discovery catches nested standard names and rejects dropped duplicate or zero inventories", () => {
  assertEquals(
    discoveredTestModules([
      "a/test.ts",
      "b/x.test.ts",
      "c/x_test.ts",
      "d/__tests__/example.ts",
      "not-test.ts",
    ]),
    ["a/test.ts", "b/x.test.ts", "c/x_test.ts", "d/__tests__/example.ts"],
  );
  assertThrows(() =>
    assertTestInventory(["a.test.ts", "b.test.ts"], ["a.test.ts"])
  );
  assertThrows(() =>
    assertTestInventory(["a.test.ts"], ["a.test.ts", "a.test.ts"])
  );
  assertThrows(() => assertTestInventory([], []));
});

test("run result requires terminal success executed tests and unchanged runtime", () => {
  const a = "a".repeat(64), b = "b".repeat(64);
  assertRuntimeUnchanged({ "a.ts": a }, { "a.ts": a });
  assertThrows(() => assertRuntimeUnchanged({ "a.ts": a }, { "a.ts": b }));
  assertThrows(() => assertRuntimeUnchanged({ "a.ts": a }, {}));
  assertEquals(testRunExitCode(9, 100, 0, true, true), 1);
  assertEquals(testRunExitCode(0, 0, 0, true, true), 1);
  assertEquals(testRunExitCode(0, 100, 0, false, true), 1);
  assertEquals(testRunExitCode(0, 100, 1, true, true), 1);
  assertEquals(testRunExitCode(0, 100, 1, true, false), 0);
});

test("JUnit reporting preserves ignored and failed requirements separately", () => {
  const report = junitSummary(
    '<testsuites tests="4" failures="1" skipped="1"><testsuite name="a.test.ts" tests="4" skipped="1" failures="1"><testcase name="positive"/><testcase name="ignored"><skipped/></testcase><testcase name="failed"><failure/></testcase><testsuite name="group" tests="1" skipped="0" failures="0"><testcase name="nested"/></testsuite></testsuite></testsuites>',
  );
  assertEquals(report.modules, ["a.test.ts"]);
  assertEquals(report.executed, 3);
  assertEquals(report.ignored, 1);
  assertEquals(report.failures, 1);
  assertThrows(() => junitSummary("<testsuites/>"));
});

test("ignored policy requires exact module and test identities, reason, and never marks skips verified", () => {
  const ignored = [{ module: "a.test.ts", name: "private source" }];
  assertEquals(
    classifiedIgnoredTests(ignored, [])[0].disposition,
    "requirement-unavailable",
  );
  const policy = [{
    module: "a.test.ts",
    name: "private source",
    reason: "Explicitly excluded requirement",
    disposition: "intentionally-excluded" as const,
  }];
  assertEquals(classifiedIgnoredTests(ignored, policy)[0].verified, false);
  assertEquals(
    classifiedIgnoredTests(ignored, policy)[0].disposition,
    "intentionally-excluded",
  );
  assertThrows(() => classifiedIgnoredTests(ignored, [...policy, ...policy]));
  assertThrows(() => classifiedIgnoredTests([], policy));
});

test("JUnit rejects truncated XML missing cases and false failure attributes", () => {
  for (
    const xml of [
      '<testsuites tests="3" failures="0" skipped="0"><testsuite name="a" tests="3" failures="0" skipped="0"/></testsuites>',
      '<testsuites tests="1" failures="0" skipped="0"><testsuite name="a" tests="1" failures="0" skipped="0"><testcase name="failed"><failure/></testcase></testsuite></testsuites>',
      '<testsuites tests="1" failures="0" skipped="0"><testsuite name="a" tests="1" failures="0" skipped="0"><testcase name="ignored"><skipped/></testcase></testsuite></testsuites>',
      '<testsuites tests="3" failures="0" skipped="0"><testsuite name="a" tests="3" failures="0" skipped="0">',
      '<testsuites tests="9" failures="0" skipped="0"><testsuite name="a" tests="1" failures="0" skipped="0"><testcase name="one"/></testsuite></testsuites>',
      '<testsuites tests="2" failures="0" skipped="0"><testsuite name="a" tests="2" failures="0" skipped="0"><testcase name="one"/><testsuite name="g" tests="2" failures="0" skipped="0"><testcase name="two"/></testsuite></testsuite></testsuites>',
    ]
  ) assertThrows(() => junitSummary(xml));
  assertGraphCoverage(["file:///one.ts"], {
    modules: [{ specifier: "file:///one.ts" }],
  });
  assertThrows(() =>
    assertGraphCoverage(["file:///one.ts", "file:///two.ts"], {
      modules: [{ specifier: "file:///one.ts" }],
    })
  );
});

test("verification includes source and oracle JSON and detects changed fixture bytes", () => {
  assertEquals(
    verificationInputPaths([
      "forms/source.json",
      "benchmark/cases/correct.json",
      ".state/field-dumps/map.json",
      "scripts/testing/skip-policy.json",
      "docs/notes.md",
      "product_board.md",
    ]),
    [
      "forms/source.json",
      "benchmark/cases/correct.json",
      ".state/field-dumps/map.json",
      "scripts/testing/skip-policy.json",
    ],
  );
  assertThrows(() =>
    assertRuntimeUnchanged({ "forms/source.json": "a".repeat(64) }, {
      "forms/source.json": "b".repeat(64),
    })
  );
});
