import { assertEquals, assertThrows } from "@std/assert";
import {
  assertMigrationActualSources,
  assertMigrationGraphCoverage,
  assertMigrationLiteralPaths,
  assertMigrationProof,
  assertMigrationResourceResolution,
  type MigrationProof,
} from "./migration.ts";

function proof(): MigrationProof {
  return {
    version: 1,
    moves: [{ old: "flat/a.test.ts", new: "credits/a.test.ts" }],
    files: [{
      old: "flat/a.test.ts",
      new: "credits/a.test.ts",
      beforeSource: 'import "./b.ts";\nconst amount = 100;\n',
      afterSource: 'import "../b.ts";\nconst amount = 100;\n',
      edits: [{
        start: 8,
        end: 14,
        before: "./b.ts",
        after: "../b.ts",
        kind: "import",
      }],
    }],
    resources: [{
      oldFile: "flat/a.test.ts",
      newFile: "credits/a.test.ts",
      beforeLiteral: "../../.pdf-cache/x.pdf",
      afterLiteral: "../../.pdf-cache/x.pdf",
      beforeResolved: "file:///repo/.pdf-cache/x.pdf",
      afterResolved: "file:///repo/.pdf-cache/x.pdf",
    }],
    testModules: { before: ["flat/a.test.ts"], after: ["credits/a.test.ts"] },
    inventory: {
      before: ["flat/a.test.ts", "b.ts"],
      after: ["credits/a.test.ts", "b.ts"],
    },
    additions: [],
    intentionalChanges: [],
  };
}

Deno.test("migration replays path edits while retaining source, resources and test inventory", () => {
  assertEquals(
    assertMigrationProof(proof(), {
      modules: [{ specifier: "file:///repo/b.ts" }],
    }),
    {
      movedFiles: 1,
      verifiedSources: 1,
      verifiedResources: 1,
      retainedTestModules: 1,
      graphModules: 1,
    },
  );
});

Deno.test("migration rejects a disappearing test even when the remaining graph is healthy", () => {
  const value = proof();
  value.testModules.after = [];
  assertThrows(() => assertMigrationProof(value), Error, "Zero test modules");
});

Deno.test("migration rejects a tax value change outside path edits", () => {
  const value = proof();
  value.files[0].afterSource = value.files[0].afterSource.replace("100", "200");
  assertThrows(
    () => assertMigrationProof(value),
    Error,
    "outside documented path edits",
  );
});

Deno.test("migration rejects a successful graph command's embedded dependency failure", () => {
  assertThrows(
    () =>
      assertMigrationProof(proof(), {
        modules: [{
          specifier: "jsr:@std/csv@1/parse",
          error: "manifest unavailable",
        }],
      }),
    Error,
    "Module graph has",
  );
});

Deno.test("migration rejects a moved cache or fixture resource target", () => {
  const value = proof();
  value.resources[0].afterResolved = "file:///repo/credits/.pdf-cache/x.pdf";
  assertThrows(
    () => assertMigrationProof(value),
    Error,
    "Resource target changed",
  );
});

Deno.test("migration rejects duplicate destinations and missing retained files", () => {
  const duplicate = proof();
  duplicate.moves.push({ old: "b.ts", new: "credits/a.test.ts" });
  assertThrows(
    () => assertMigrationProof(duplicate),
    Error,
    "Duplicate destination",
  );
  const missing = proof();
  missing.inventory!.after = ["credits/a.test.ts"];
  assertThrows(() => assertMigrationProof(missing), Error, "not bijective");
});

Deno.test("migration rejects incorrect and overlapping source spans", () => {
  const incorrect = proof();
  incorrect.files[0].edits[0].before = "nope.ts";
  assertThrows(() => assertMigrationProof(incorrect), Error, "does not match");
  const overlapping = proof();
  overlapping.files[0].edits.push({
    start: 9,
    end: 12,
    before: "/b.",
    after: "/c.",
    kind: "import",
  });
  assertThrows(
    () => assertMigrationProof(overlapping),
    Error,
    "overlapping edits",
  );
});

Deno.test("migration graph coverage rejects a healthy partial graph", () => {
  const graph = { modules: [{ specifier: "file:///repo/b.ts" }] };
  assertThrows(
    () => assertMigrationGraphCoverage(proof(), graph, "/repo"),
    Error,
    "omits modules: credits/a.test.ts",
  );
  assertMigrationGraphCoverage(proof(), {
    modules: [
      { specifier: "file:///repo/b.ts" },
      { specifier: "file:///repo/credits/a.test.ts" },
    ],
  }, "/repo");
});

Deno.test("migration resources can follow an explicitly moved internal fixture", () => {
  const value = proof();
  value.moves.push({ old: "fixtures/x.json", new: "credits/fixtures/x.json" });
  value.files.push({
    old: "fixtures/x.json",
    new: "credits/fixtures/x.json",
    beforeSource: "{}",
    afterSource: "{}",
    edits: [],
  });
  value.inventory!.before.push("fixtures/x.json");
  value.inventory!.after.push("credits/fixtures/x.json");
  value.resources = [{
    oldFile: "flat/a.test.ts",
    newFile: "credits/a.test.ts",
    beforeLiteral: "../fixtures/x.json",
    afterLiteral: "./fixtures/x.json",
    beforeResolved: "/repo/fixtures/x.json",
    afterResolved: "/repo/credits/fixtures/x.json",
    beforeTarget: "fixtures/x.json",
    afterTarget: "credits/fixtures/x.json",
  }];
  assertEquals(assertMigrationProof(value).verifiedResources, 1);
  assertMigrationResourceResolution(value, "/repo");
  value.resources[0].afterResolved = "/different/credits/fixtures/x.json";
  assertThrows(
    () => assertMigrationProof(value),
    Error,
    "Resource target changed",
  );
});

Deno.test("migration rejects forged recorded resolution for an incorrect path literal", () => {
  const value = proof();
  value.resources[0].beforeLiteral = "../.pdf-cache/x.pdf";
  value.resources[0].afterLiteral = "./.pdf-cache/x.pdf";
  value.resources[0].beforeResolved = "/repo/.pdf-cache/x.pdf";
  value.resources[0].afterResolved = "/repo/.pdf-cache/x.pdf";
  assertThrows(
    () => assertMigrationResourceResolution(value, "/repo"),
    Error,
    "literal resolution mismatch",
  );
});

Deno.test("migration rejects a test hidden from both claimed test inventories", () => {
  const value = proof();
  value.inventory!.before.push("hidden.test.ts");
  value.inventory!.after.push("hidden.test.ts");
  assertThrows(
    () => assertMigrationProof(value),
    Error,
    "Test module inventory changed",
  );
});

Deno.test("migration rejects a numeric tax edit mislabeled as an import", () => {
  const value = proof();
  const start = value.files[0].beforeSource.indexOf("100");
  value.files[0].edits.push({
    start,
    end: start + 3,
    before: "100",
    after: "200",
    kind: "import",
  });
  value.files[0].afterSource = value.files[0].afterSource.replace("100", "200");
  assertThrows(() => assertMigrationProof(value), Error, "Non-path edit");
});

Deno.test("migration preserves directory URL trailing slash semantics", () => {
  const value = proof();
  value.resources[0].beforeLiteral = "../fixtures/";
  value.resources[0].afterLiteral = "../fixtures/";
  value.resources[0].beforeResolved = "/repo/fixtures";
  value.resources[0].afterResolved = "/repo/fixtures";
  assertMigrationResourceResolution(value, "/repo");
  value.resources[0].afterLiteral = "../fixtures";
  assertThrows(
    () => assertMigrationResourceResolution(value, "/repo"),
    Error,
    "directory URL semantics changed",
  );
});

Deno.test("migration independently catches dynamic filenames missed by the static graph", () => {
  const value = proof();
  value.files[0].afterSource = value.files[0].beforeSource;
  value.files[0].edits = [];
  value.moves.push({ old: "flat/b.ts", new: "retirement/b.ts" });
  value.files.push({
    old: "flat/b.ts",
    new: "retirement/b.ts",
    beforeSource: "export {};",
    afterSource: "export {};",
    edits: [],
  });
  value.inventory = {
    before: ["flat/a.test.ts", "flat/b.ts"],
    after: ["credits/a.test.ts", "retirement/b.ts"],
  };
  assertThrows(
    () => assertMigrationLiteralPaths(value),
    Error,
    "literal path target changed",
  );
  value.files[0].afterSource = value.files[0].beforeSource.replace(
    "./b.ts",
    "../retirement/b.ts",
  );
  value.files[0].edits = [{
    start: 8,
    end: 14,
    before: "./b.ts",
    after: "../retirement/b.ts",
    kind: "import",
  }];
  assertEquals(assertMigrationLiteralPaths(value), 1);
});

Deno.test("migration rejects a stale source proof after the actual source changes", async () => {
  const value = proof();
  const actual = new Map([[value.files[0].new, value.files[0].afterSource]]);
  assertEquals(await assertMigrationActualSources(value, actual), 0);
  actual.set(
    value.files[0].new,
    value.files[0].afterSource.replace("100", "200"),
  );
  let rejected = false;
  try {
    await assertMigrationActualSources(value, actual);
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("differs from proof");
  }
  assertEquals(rejected, true);
});

Deno.test("migration refuses an intentional exemption for changed tax source", async () => {
  const value = proof();
  value.intentionalChanges = [{
    path: value.files[0].new,
    sha256: "0".repeat(64),
    reason: "Pretend this tax change is tooling",
  }];
  let rejected = false;
  try {
    await assertMigrationActualSources(value, new Map());
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("outside reviewed tooling");
  }
  assertEquals(rejected, true);
});

Deno.test("migration requires exact bytes even for an explicitly reviewed generator change", async () => {
  const value = proof();
  const path = "scripts/maintenance/parse-rules.ts";
  value.files[0].new = path;
  const source = "export const updatedGenerator = true;";
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  const digest = Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  value.intentionalChanges = [{
    path,
    sha256: digest,
    reason: "Domain-aware rule generator reviewed separately",
  }];
  assertEquals(
    await assertMigrationActualSources(value, new Map([[path, source]])),
    1,
  );
  let rejected = false;
  try {
    await assertMigrationActualSources(
      value,
      new Map([[path, source + "// tampered"]]),
    );
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("hash differs");
  }
  assertEquals(rejected, true);
});

Deno.test("migration rejects a numeric edit in an untouched original tax module", async () => {
  const value = proof();
  const hash = async (source: string) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    return Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
  };
  const path = "forms/f1040/untouched.ts";
  const original = "export const tax = 100;";
  value.originalManifest = {
    [value.files[0].old]: await hash(value.files[0].beforeSource),
    [path]: await hash(original),
  };
  const sources = new Map([[value.files[0].new, value.files[0].afterSource], [
    path,
    original,
  ]]);
  assertEquals(await assertMigrationActualSources(value, sources), 0);
  sources.set(path, "export const tax = 200;");
  let rejected = false;
  try {
    await assertMigrationActualSources(value, sources);
  } catch (error) {
    rejected = error instanceof Error &&
      error.message.includes("Untouched original source changed");
  }
  assertEquals(rejected, true);
});
