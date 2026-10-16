import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../scripts/support/sys.ts";
import {
  assertEquals,
  assertMatch,
  assertRejects,
  assertThrows,
} from "@std/assert";
import {
  appendInput,
  buildEngineInputs,
  createReturn,
  loadInputs,
  loadMeta,
  nextId,
} from "./store.ts";
import type { InputsJson, NodeInputEntry } from "./types.ts";

// ---- nextId (pure, no I/O) ----

test("nextId: empty list returns w2_01", () => {
  assertEquals(nextId([], "w2"), "w2_01");
});

test("nextId: one existing w2 entry returns w2_02", () => {
  const entries: NodeInputEntry[] = [
    { id: "w2_01", fields: { box1: 85000 } },
  ];
  assertEquals(nextId(entries, "w2"), "w2_02");
});

test("nextId: two existing w2 entries returns w2_03", () => {
  const entries: NodeInputEntry[] = [
    { id: "w2_01", fields: { box1: 85000 } },
    { id: "w2_02", fields: { box1: 45000 } },
  ];
  assertEquals(nextId(entries, "w2"), "w2_03");
});

test("nextId: nodeType with no existing entries returns nodeType_01", () => {
  assertEquals(nextId([], "1099int"), "1099int_01");
});

test("buildEngineInputs rejects repeated singleton and overlapping start claims", () => {
  assertThrows(
    () =>
      buildEngineInputs({
        general: [
          { id: "general_01", fields: { filing_status: "single" } },
          { id: "general_02", fields: { filing_status: "mfj" } },
        ],
      }, new Set(["general"])),
    Error,
    "Singleton input general has 2 entries",
  );
  assertThrows(
    () =>
      buildEngineInputs({
        start: [
          { id: "start_01", fields: { general: { filing_status: "single" } } },
          { id: "start_02", fields: { general: { filing_status: "mfj" } } },
        ],
      }),
    Error,
    "Duplicate start input general",
  );
  assertThrows(
    () =>
      buildEngineInputs({
        start: [{
          id: "start_01",
          fields: { w2: [{ box1_wages: 100 }] },
        }],
        w2: [{ id: "w2_01", fields: { box1_wages: 200 } }],
      }),
    Error,
    "Duplicate input w2",
  );
  assertEquals(
    buildEngineInputs({
      start: [
        { id: "start_01", fields: { general: { filing_status: "single" } } },
        { id: "start_02", fields: { w2: [{ box1_wages: 100 }] } },
      ],
    }),
    { general: { filing_status: "single" }, w2: [{ box1_wages: 100 }] },
  );
});

// ---- createReturn ----

test("createReturn: writes a single return.json with meta and inputs keys", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);

  const returnJson = JSON.parse(
    await fs.readFile(`${returnPath}/return.json`, "utf8"),
  );

  assertEquals(typeof returnJson.meta, "object");
  assertEquals(typeof returnJson.inputs, "object");
  assertEquals(returnJson.meta.returnId, returnId);
  assertEquals(returnJson.meta.year, 2025);
  assertMatch(
    returnJson.meta.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  );
  assertEquals(Array.isArray(returnJson.inputs), false);
  assertEquals(Object.keys(returnJson.inputs).length, 0);
});

test("createReturn: does NOT create separate meta.json or inputs.json", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  await assertRejects(() => sys.stat(`${returnPath}/meta.json`));
  await assertRejects(() => sys.stat(`${returnPath}/inputs.json`));
});

test("createReturn: returnPath is baseDir/returnId", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);
  assertEquals(returnPath, `${tmpDir}/${returnId}`);
});

// ---- loadMeta ----

test("loadMeta: returns MetaJson from return.json", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);
  const meta = await loadMeta(returnPath);

  assertEquals(meta.returnId, returnId);
  assertEquals(meta.year, 2025);
  assertEquals(typeof meta.createdAt, "string");
});

test("loadMeta: throws descriptive error for nonexistent path", async () => {
  await assertRejects(
    () => loadMeta("/nonexistent/path/that/does/not/exist"),
    Error,
    "File not found:",
  );
});

// ---- loadInputs ----

test("loadInputs: returns empty object for fresh return", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);
  const inputs = await loadInputs(returnPath);

  assertEquals(typeof inputs, "object");
  assertEquals(Array.isArray(inputs), false);
  assertEquals(Object.keys(inputs).length, 0);
});

test("loadInputs: throws descriptive error for nonexistent path", async () => {
  await assertRejects(
    () => loadInputs("/nonexistent/path/that/does/not/exist"),
    Error,
    "File not found:",
  );
});

// ---- appendInput ----

test("appendInput: first w2 creates w2 bucket with one entry", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  const { id } = await appendInput(returnPath, "w2", { box1: 85000 });

  const inputs: InputsJson = await loadInputs(returnPath);
  assertEquals(Array.isArray(inputs["w2"]), true);
  assertEquals(inputs["w2"].length, 1);
  assertEquals(inputs["w2"][0].id, id);
  assertEquals(inputs["w2"][0].fields["box1"], 85000);
});

test("appendInput: second w2 appends to existing w2 bucket", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  const { id: id1 } = await appendInput(returnPath, "w2", { box1: 85000 });
  const { id: id2 } = await appendInput(returnPath, "w2", { box1: 45000 });

  const inputs: InputsJson = await loadInputs(returnPath);
  assertEquals(inputs["w2"].length, 2);
  assertEquals(inputs["w2"][0].id, id1);
  assertEquals(inputs["w2"][1].id, id2);
});

test("appendInput: different nodeTypes go into separate buckets", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  await appendInput(returnPath, "w2", { box1: 85000 });
  await appendInput(returnPath, "int1099", { payer: "Chase", amount: 320 });
  await appendInput(returnPath, "general", {
    filing_status: "mfj",
    tax_year: 2025,
  });

  const inputs: InputsJson = await loadInputs(returnPath);
  assertEquals(inputs["w2"].length, 1);
  assertEquals(inputs["int1099"].length, 1);
  assertEquals(inputs["general"].length, 1);
  assertEquals(Object.keys(inputs).length, 3);
});

test("appendInput: meta is preserved unchanged after appending inputs", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);

  await appendInput(returnPath, "w2", { box1: 85000 });

  const meta = await loadMeta(returnPath);
  assertEquals(meta.returnId, returnId);
  assertEquals(meta.year, 2025);
});

test("appendInput: entries use 'fields' key not 'data'", async () => {
  const tmpDir = await sys.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  await appendInput(returnPath, "w2", { box1: 85000 });

  const inputs: InputsJson = await loadInputs(returnPath);
  const entry = inputs["w2"][0];
  assertEquals("fields" in entry, true);
  assertEquals("data" in entry, false);
  assertEquals(entry.fields["box1"], 85000);
});
