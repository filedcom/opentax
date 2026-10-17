import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  irsPackageStatus,
  IrsStatus,
  readIrsManifest,
  undeclaredIrsReferences,
} from "./irs.ts";

const manifest = {
  packages: [{
    id: "mef-test",
    use: "test",
    source: "test",
    path: "mef/2099v1.0",
    files: {
      // A digest the test file below does not match.
      "Ind1040/Return1040.xsd":
        "a2c1fe6e5e4bf5a3f2b7d8a8bc0aaf8b2d2ec3a4c3cd9e40bf3c43c8b7c4c0b3",
    },
  }],
};

test("a package is missing until its files exist, and altered when a digest differs", async () => {
  const base = mkdtempSync(join(tmpdir(), "irs-"));
  assertEquals(
    (await irsPackageStatus(manifest, base))[0].status,
    IrsStatus.Missing,
  );
  mkdirSync(join(base, "irs/mef/2099v1.0/Ind1040"), { recursive: true });
  writeFileSync(
    join(base, "irs/mef/2099v1.0/Ind1040/Return1040.xsd"),
    "schema",
  );
  assertEquals(
    (await irsPackageStatus(manifest, base))[0].status,
    IrsStatus.Altered,
  );
});

test("code may name only irs/ locations the manifest declares", () => {
  const sources = new Map([
    ["a.ts", `"irs/mef/2099v1.0/Ind1040/Return1040.xsd"`],
    ["b.ts", `"../../irs/mef/2098v1.0/Common/efileTypes.xsd"`],
  ]);
  assertEquals(undeclaredIrsReferences(sources, manifest), [
    "b.ts: irs/mef/2098v1.0 is not in irs/manifest.json",
  ]);
});

test("the repository manifest parses and declares the 2025v5.4 schemas", async () => {
  const real = await readIrsManifest();
  assertEquals(real.packages.some((p) => p.path === "mef/2025v5.4"), true);
});
