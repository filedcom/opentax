import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { appendInput } from "../store/store.ts";
import type { InputEntry } from "../store/types.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";

Deno.test("createReturnCommand creates meta.json with correct fields", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const metaText = await Deno.readTextFile(
      `${tmpDir}/${result.returnId}/meta.json`,
    );
    const meta = JSON.parse(metaText);

    assertEquals(meta.returnId, result.returnId);
    assertEquals(meta.year, 2025);
    assertMatch(meta.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createReturnCommand creates empty inputs.json", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const inputsText = await Deno.readTextFile(
      `${tmpDir}/${result.returnId}/inputs.json`,
    );
    const inputs = JSON.parse(inputsText);

    assertEquals(inputs, []);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createReturnCommand returns a returnId string", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });
    assertEquals(typeof result.returnId, "string");
    assertEquals(result.returnId.length > 0, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

Deno.test("getReturnCommand single W-2 returns line_1a = 85000", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    const entry: InputEntry = {
      id: "w2_01",
      nodeType: "w2",
      data: { box1: 85000 },
    };
    await appendInput(returnPath, entry);

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.returnId, returnId);
    assertEquals(result.year, 2025);
    assertEquals(result.lines.line_1a, 85000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand two W-2s returns line_1a = 130000", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, {
      id: "w2_01",
      nodeType: "w2",
      data: { box1: 85000 },
    });
    await appendInput(returnPath, {
      id: "w2_02",
      nodeType: "w2",
      data: { box1: 45000 },
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.lines.line_1a, 130000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand empty return returns line_1a = 0", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.returnId, returnId);
    assertEquals(result.year, 2025);
    assertEquals(result.lines.line_1a, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand nonexistent returnId throws descriptive error", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => getReturnCommand({ returnId: "nonexistent-id", baseDir: tmpDir }),
      Error,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
