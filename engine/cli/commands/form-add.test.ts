import { assertEquals, assertRejects } from "@std/assert";
import { createReturnCommand } from "./create-return.ts";
import { formAddCommand } from "./form-add.ts";
import { loadInputs } from "../store/store.ts";

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

Deno.test("formAddCommand valid W-2 appends entry with id w2_01", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const result = await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1": 85000}',
      baseDir: tmpDir,
    });

    assertEquals(result.id, "w2_01");
    assertEquals(result.nodeType, "w2");

    const entries = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(entries.length, 1);
    assertEquals(entries[0].id, "w2_01");
    assertEquals(entries[0].nodeType, "w2");
    assertEquals(entries[0].data, { box1: 85000 });
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand two W-2 appends produce w2_01 and w2_02", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1": 85000}',
      baseDir: tmpDir,
    });
    await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1": 45000}',
      baseDir: tmpDir,
    });

    const entries = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(entries.length, 2);
    assertEquals(entries[0].id, "w2_01");
    assertEquals(entries[1].id, "w2_02");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand invalid data (missing box1) rejects with validation error", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "w2",
          dataJson: '{"employer": "Acme"}',
          baseDir: tmpDir,
        }),
      Error,
      "Validation error",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand malformed JSON string rejects with Invalid JSON", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "w2",
          dataJson: "not-valid-json",
          baseDir: tmpDir,
        }),
      Error,
      "Invalid JSON",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand unknown nodeType rejects with Unknown node type", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "1099div",
          dataJson: '{"box1": 500}',
          baseDir: tmpDir,
        }),
      Error,
      "Unknown node type",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
