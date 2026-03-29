import { assertEquals, assertRejects } from "@std/assert";
import { loadInputs } from "../store/store.ts";
import { formAddCommand } from "./form.ts";
import { createReturnCommand } from "./return.ts";

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
      dataJson: '{"box1_wages": 85000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });

    assertEquals(result.id, "w2_01");
    assertEquals(result.nodeType, "w2");

    const inputs = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(inputs["w2"].length, 1);
    assertEquals(inputs["w2"][0].id, "w2_01");
    assertEquals(inputs["w2"][0].fields["box1_wages"], 85000);
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
      dataJson: '{"box1_wages": 85000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });
    await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1_wages": 45000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });

    const inputs = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(inputs["w2"].length, 2);
    assertEquals(inputs["w2"][0].id, "w2_01");
    assertEquals(inputs["w2"][1].id, "w2_02");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand invalid data (missing box1_wages) rejects with validation error", async () => {
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
