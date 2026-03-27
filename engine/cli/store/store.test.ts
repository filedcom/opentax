import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { createReturn, loadInputs, loadMeta, appendInput, nextId } from "./store.ts";
import type { InputEntry } from "./types.ts";

// ---- nextId (pure, no I/O) ----

Deno.test("nextId: empty list returns w2_01", () => {
  assertEquals(nextId([], "w2"), "w2_01");
});

Deno.test("nextId: one existing w2 returns w2_02", () => {
  const entries: InputEntry[] = [
    { id: "w2_01", nodeType: "w2", data: { box1: 85000 } },
  ];
  assertEquals(nextId(entries, "w2"), "w2_02");
});

Deno.test("nextId: two existing w2s returns w2_03", () => {
  const entries: InputEntry[] = [
    { id: "w2_01", nodeType: "w2", data: { box1: 85000 } },
    { id: "w2_02", nodeType: "w2", data: { box1: 45000 } },
  ];
  assertEquals(nextId(entries, "w2"), "w2_03");
});

Deno.test("nextId: different nodeType resets counter (1099int_01)", () => {
  const entries: InputEntry[] = [
    { id: "w2_01", nodeType: "w2", data: { box1: 85000 } },
  ];
  assertEquals(nextId(entries, "1099int"), "1099int_01");
});

// ---- createReturn ----

Deno.test("createReturn: creates meta.json with returnId, year, createdAt", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);

  assertEquals(typeof returnId, "string");
  assertEquals(returnId.length, 36); // UUID length

  const meta = JSON.parse(await Deno.readTextFile(`${returnPath}/meta.json`));
  assertEquals(meta.returnId, returnId);
  assertEquals(meta.year, 2025);
  assertMatch(meta.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

Deno.test("createReturn: creates inputs.json as empty array", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);

  const inputs = JSON.parse(await Deno.readTextFile(`${returnPath}/inputs.json`));
  assertEquals(inputs, []);
});

Deno.test("createReturn: returnPath is baseDir/returnId", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);

  assertEquals(returnPath, `${tmpDir}/${returnId}`);
});

// ---- loadMeta ----

Deno.test("loadMeta: returns MetaJson from meta.json", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnId, returnPath } = await createReturn(2025, tmpDir);
  const meta = await loadMeta(returnPath);

  assertEquals(meta.returnId, returnId);
  assertEquals(meta.year, 2025);
  assertEquals(typeof meta.createdAt, "string");
});

Deno.test("loadMeta: throws descriptive error for nonexistent path", async () => {
  await assertRejects(
    () => loadMeta("/nonexistent/path/that/does/not/exist"),
    Error,
    "meta.json not found at /nonexistent/path/that/does/not/exist",
  );
});

// ---- loadInputs ----

Deno.test("loadInputs: returns empty array for fresh return", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);
  const inputs = await loadInputs(returnPath);

  assertEquals(inputs, []);
});

Deno.test("loadInputs: throws descriptive error for nonexistent path", async () => {
  await assertRejects(
    () => loadInputs("/nonexistent/path/that/does/not/exist"),
    Error,
    "inputs.json not found at /nonexistent/path/that/does/not/exist",
  );
});

// ---- appendInput ----

Deno.test("appendInput: appends entry to inputs.json", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);
  const entry: InputEntry = { id: "w2_01", nodeType: "w2", data: { box1: 85000 } };

  await appendInput(returnPath, entry);

  const inputs = await loadInputs(returnPath);
  assertEquals(inputs.length, 1);
  assertEquals(inputs[0], entry);
});

Deno.test("appendInput: two appends produce array of length 2", async () => {
  const tmpDir = await Deno.makeTempDir();
  const { returnPath } = await createReturn(2025, tmpDir);
  const entry1: InputEntry = { id: "w2_01", nodeType: "w2", data: { box1: 85000 } };
  const entry2: InputEntry = { id: "w2_02", nodeType: "w2", data: { box1: 45000 } };

  await appendInput(returnPath, entry1);
  await appendInput(returnPath, entry2);

  const inputs = await loadInputs(returnPath);
  assertEquals(inputs.length, 2);
  assertEquals(inputs[0], entry1);
  assertEquals(inputs[1], entry2);
});
