import { assertMatch, assertRejects, assertStringIncludes } from "@std/assert";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import { exportMefCommand } from "./export.ts";

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

Deno.test("exportMefCommand returns valid MeF XML wrapper", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const xml = await exportMefCommand({ returnId, baseDir: tmpDir });
    assertStringIncludes(xml, "<Return ");
    assertStringIncludes(xml, 'returnVersion="2025v5.2"');
    assertStringIncludes(xml, "</Return>");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand with W-2 includes wages in f1040 XML", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 10000,
    });

    const xml = await exportMefCommand({ returnId, baseDir: tmpDir });
    assertStringIncludes(xml, "<IRS1040");
    assertMatch(xml, /85000/);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand empty return still produces valid XML", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const xml = await exportMefCommand({ returnId, baseDir: tmpDir });
    assertStringIncludes(xml, "<Return ");
    assertStringIncludes(xml, "</Return>");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand nonexistent returnId throws", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => exportMefCommand({ returnId: "nonexistent-id", baseDir: tmpDir }),
      Error,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
