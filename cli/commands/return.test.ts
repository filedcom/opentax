import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { appendInput } from "../store/store.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";

Deno.test("createReturnCommand creates return.json with meta and inputs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const result = await createReturnCommand({ year: 2025, baseDir: tmpDir });

    const returnJson = JSON.parse(
      await Deno.readTextFile(`${tmpDir}/${result.returnId}/return.json`),
    );

    assertEquals(returnJson.meta.returnId, result.returnId);
    assertEquals(returnJson.meta.year, 2025);
    assertMatch(returnJson.meta.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assertEquals(typeof returnJson.inputs, "object");
    assertEquals(Array.isArray(returnJson.inputs), false);
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

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 0,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });

    assertEquals(result.returnId, returnId);
    assertEquals(result.year, 2025);
    assertEquals(result.summary.line1z_total_wages, 85000);
    assertEquals(result.summary.line9_total_income, 85000);
    assertEquals(Array.isArray(result.forms), true);
    assertEquals(Array.isArray(result.warnings), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("getReturnCommand two W-2s returns line_1a = 130000", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 0,
    });
    await appendInput(returnPath, "w2", {
      box1_wages: 45000,
      box2_fed_withheld: 0,
    });

    const result = await getReturnCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.summary.line1z_total_wages, 130000);
    assertEquals(result.summary.line9_total_income, 130000);
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
    assertEquals(result.summary.line1z_total_wages, 0);
    assertEquals(result.summary.line9_total_income, 0);
    assertEquals(result.summary.line24_total_tax, 0);
    assertEquals(result.forms.length >= 0, true);
    assertEquals(result.warnings.length >= 0, true);
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
