import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import {
  createPrivateReviewDirectory,
  makeReviewCacheFilesPrivate,
  writePrivateReviewFile,
  writePrivateReviewTextFile,
} from "./ty2025-pdf-review-private-files.ts";

test("PDF review artifacts use private permissions and refuse overwrite", async () => {
  const parent = await sys.makeTempDir();
  const directory = join(parent, "review");
  try {
    await createPrivateReviewDirectory(directory);
    await writePrivateReviewFile(
      directory,
      "filled.pdf",
      new TextEncoder().encode("%PDF-test"),
    );
    await writePrivateReviewTextFile(directory, "source.json", "{}\n");
    const cacheDirectory = join(directory, "irs-pdf-cache");
    await createPrivateReviewDirectory(cacheDirectory);
    const templatePath = join(cacheDirectory, "irs.pdf");
    await sys.writeText(templatePath, "%PDF-test", { mode: 0o644 });
    await makeReviewCacheFilesPrivate(cacheDirectory);
    if (process.platform !== "win32") {
      assertEquals((await sys.stat(directory)).mode! & 0o777, 0o700);
      assertEquals(
        (await sys.stat(join(directory, "filled.pdf"))).mode! & 0o777,
        0o600,
      );
      assertEquals(
        (await sys.stat(join(directory, "source.json"))).mode! & 0o777,
        0o600,
      );
      assertEquals((await sys.stat(cacheDirectory)).mode! & 0o777, 0o700);
      assertEquals((await sys.stat(templatePath)).mode! & 0o777, 0o600);
    }
    await assertRejects(
      () => writePrivateReviewTextFile(directory, "source.json", "changed\n"),
    );
    assertEquals(
      await fs.readFile(join(directory, "source.json"), "utf8"),
      "{}\n",
    );
  } finally {
    await sys.remove(parent, { recursive: true });
  }
});
