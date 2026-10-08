import { assertRejects } from "@std/assert";
import { join } from "@std/path";
import { assertReviewArtifactInventory } from "./ty2025-pdf-review-inventory.ts";

Deno.test("review packet inventory rejects unlisted and missing artifacts", async () => {
  const directory = await Deno.makeTempDir();
  try {
    for (
      const name of [
        "review-manifest.json",
        "case-one.pdf",
        "case-one.xml",
        "case-one.json",
      ]
    ) {
      await Deno.writeTextFile(join(directory, name), "synthetic");
    }
    await Deno.mkdir(join(directory, "irs-pdf-cache"));
    await assertReviewArtifactInventory(directory, ["case-one"]);

    await Deno.writeTextFile(join(directory, "unlisted.pdf"), "synthetic");
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Unexpected review packet entry: unlisted.pdf",
    );
    await Deno.remove(join(directory, "unlisted.pdf"));

    await Deno.remove(join(directory, "case-one.xml"));
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is missing: case-one.xml",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("review packet inventory rejects directory and symlink artifacts", async () => {
  const directory = await Deno.makeTempDir();
  try {
    for (
      const name of [
        "review-manifest.json",
        "case-one.pdf",
        "case-one.xml",
        "case-one.json",
      ]
    ) {
      await Deno.writeTextFile(join(directory, name), "synthetic");
    }
    await Deno.remove(join(directory, "case-one.pdf"));
    await Deno.mkdir(join(directory, "case-one.pdf"));
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is not a regular file: case-one.pdf",
    );
    await Deno.remove(join(directory, "case-one.pdf"));
    await Deno.symlink(
      join(directory, "case-one.xml"),
      join(directory, "case-one.pdf"),
    );
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is not a regular file: case-one.pdf",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
