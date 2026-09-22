import {
  assertEquals,
  assertMatch,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { exists } from "@std/fs";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import {
  ExportExecutionError,
  exportMefCommand,
  exportPdfCommand,
  ExportRejectedError,
} from "./export.ts";
import { FilingStatus } from "../../forms/f1040/nodes/types.ts";

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

Deno.test("exportMefCommand blocks empty finalized return with --force", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand with W-2 includes wages in f1040 XML (force)", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
    });
    await appendInput(returnPath, "f2441", {});

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 10000,
    });

    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
    });
    assertStringIncludes(xml, "<IRS1040");
    assertMatch(xml, /85000/);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand draft empty return labels diagnostic XML", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
      draft: true,
    });
    assertStringIncludes(xml, "DRAFT/INCOMPLETE");
    assertStringIncludes(xml, "<Return ");
    assertStringIncludes(xml, "</Return>");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks calculation diagnostics before reject rules", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir }),
      ExportExecutionError,
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks finalized export on any executor diagnostic, even with --force", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: "not-a-number",
      box2_fed_withheld: 1000,
    });

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
      "Finalized export blocked by",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand blocks missing filing status diagnostics instead of whitelisting them", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 10000,
    });

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir, force: true }),
      ExportExecutionError,
      "Finalized export blocked by",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportPdfCommand blocks executor diagnostics before writing or overwriting PDF", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    const outputPath = `${tmpDir}/export.pdf`;
    const original = new TextEncoder().encode("keep me");
    await Deno.writeFile(outputPath, original);

    await appendInput(returnPath, "w2", {
      box1_wages: "not-a-number",
      box2_fed_withheld: 1000,
    });

    await assertRejects(
      () =>
        exportPdfCommand({
          returnId,
          baseDir: tmpDir,
          force: true,
          outputPath,
        }),
      ExportExecutionError,
    );
    assertEquals(await Deno.readFile(outputPath), original);

    const unwrittenPath = `${tmpDir}/should-not-exist.pdf`;
    await assertRejects(
      () =>
        exportPdfCommand({
          returnId,
          baseDir: tmpDir,
          force: true,
          outputPath: unwrittenPath,
        }),
      ExportExecutionError,
    );
    assertEquals(await exists(unwrittenPath), false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("exportMefCommand preserves business-rule force override after clean calculation", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;

    await appendInput(returnPath, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
    });
    await appendInput(returnPath, "f2441", {});
    await appendInput(returnPath, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 10000,
    });

    await assertRejects(
      () => exportMefCommand({ returnId, baseDir: tmpDir }),
      ExportRejectedError,
    );

    const xml = await exportMefCommand({
      returnId,
      baseDir: tmpDir,
      force: true,
    });
    assertStringIncludes(xml, "<IRS1040");
    assertMatch(xml, /85000/);
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
