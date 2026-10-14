import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  createPrivateReviewDirectory,
  makeReviewCacheFilesPrivate,
  writePrivateReviewFile,
  writePrivateReviewTextFile,
} from "./ty2025-pdf-review-private-files.ts";

Deno.test("PDF review artifacts use private permissions and refuse overwrite", async () => {
  const parent = await Deno.makeTempDir();
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
    await Deno.writeTextFile(templatePath, "%PDF-test", { mode: 0o644 });
    await makeReviewCacheFilesPrivate(cacheDirectory);
    if (Deno.build.os !== "windows") {
      assertEquals((await Deno.stat(directory)).mode! & 0o777, 0o700);
      assertEquals(
        (await Deno.stat(join(directory, "filled.pdf"))).mode! & 0o777,
        0o600,
      );
      assertEquals(
        (await Deno.stat(join(directory, "source.json"))).mode! & 0o777,
        0o600,
      );
      assertEquals((await Deno.stat(cacheDirectory)).mode! & 0o777, 0o700);
      assertEquals((await Deno.stat(templatePath)).mode! & 0o777, 0o600);
    }
    await assertRejects(
      () => writePrivateReviewTextFile(directory, "source.json", "changed\n"),
    );
    assertEquals(
      await Deno.readTextFile(join(directory, "source.json")),
      "{}\n",
    );
  } finally {
    await Deno.remove(parent, { recursive: true });
  }
});
