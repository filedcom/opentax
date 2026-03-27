import { assertEquals, assertMatch } from "@std/assert";
import { createReturnCommand } from "./create-return.ts";

Deno.test("createReturnCommand creates meta.json with correct fields", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const metaText = await Deno.readTextFile(`${tmpDir}/${result.returnId}/meta.json`);
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

    const inputsText = await Deno.readTextFile(`${tmpDir}/${result.returnId}/inputs.json`);
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
