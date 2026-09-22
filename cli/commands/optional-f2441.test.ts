import { assert, assertEquals, assertRejects } from "@std/assert";
import { createReturnCommand, getReturnCommand } from "./return.ts";
import { appendInput, deleteInput, loadInputs } from "../store/store.ts";
import { ExportExecutionError, exportMefCommand } from "./export.ts";
import { f2441 } from "../../forms/f1040/nodes/inputs/f2441/index.ts";
import { FilingStatus } from "../../forms/f1040/nodes/types.ts";

Deno.test("f2441 AGI context without source items is inactive, not malformed", () => {
  const parsed = f2441.inputSchema.safeParse({ agi: 85000 });
  assert(parsed.success);
  assertEquals(
    f2441.compute({ taxYear: 2025, formType: "f1040" }, parsed.data).outputs,
    [],
  );
  // Explicit malformed source collections still fail validation.
  for (const f2441s of [[], null, [{ qualifying_person_count: 0 }]]) {
    assertEquals(
      f2441.inputSchema.safeParse({ agi: 85000, f2441s }).success,
      false,
    );
  }
});

Deno.test("deleting the last f2441 source entry restores an inactive optional form", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const path = `${baseDir}/${returnId}`;
    await appendInput(path, "general", { filing_status: FilingStatus.Single });
    await appendInput(path, "w2", { box1_wages: 85000, box2_fed_withheld: 0 });
    const { id } = await appendInput(path, "f2441", {
      qualifying_person_count: 0,
    });
    const invalid = await getReturnCommand({ returnId, baseDir });
    assert(
      invalid.warnings.some((warning) => warning.startsWith("[EXECUTOR_")),
    );
    await deleteInput(path, id);
    // Empty source buckets mean no entries in store/start. This is distinct
    // from a directly supplied malformed downstream f2441s collection.
    assertEquals((await loadInputs(path)).f2441, []);
    const result = await getReturnCommand({ returnId, baseDir });
    assertEquals(
      result.warnings.filter((warning) => warning.startsWith("[EXECUTOR_")),
      [],
    );
    assertEquals(result.summary.line11_agi, 85000);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

for (const malformed of [false, true]) {
  Deno.test(`W-2 optional f2441 activation, malformed source=${malformed}`, async () => {
    const baseDir = await Deno.makeTempDir();
    try {
      const { returnId } = await createReturnCommand({ year: 2025, baseDir });
      const path = `${baseDir}/${returnId}`;
      await appendInput(path, "general", {
        filing_status: FilingStatus.Single,
      });
      await appendInput(path, "w2", {
        box1_wages: 85000,
        box2_fed_withheld: 10000,
      });
      if (malformed) {
        await appendInput(path, "f2441", { qualifying_person_count: 0 });
      }
      const result = await getReturnCommand({ returnId, baseDir });
      const errors = result.warnings.filter((warning) =>
        warning.startsWith("[EXECUTOR_")
      );
      if (malformed) {
        assert(errors.some((error) => error.includes("f2441")));
        await assertRejects(
          () => exportMefCommand({ returnId, baseDir, force: true }),
          ExportExecutionError,
        );
      } else {
        assertEquals(errors, []);
        assertEquals(result.summary.line11_agi, 85000);
      }
    } finally {
      await Deno.remove(baseDir, { recursive: true });
    }
  });
}
