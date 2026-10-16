import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { assertRejects } from "@std/assert";
import { join } from "node:path";
import { assertReviewArtifactInventory } from "./ty2025-pdf-review-inventory.ts";

test("review packet inventory rejects unlisted and missing artifacts", async () => {
  const directory = await sys.makeTempDir();
  try {
    for (
      const name of [
        "review-manifest.json",
        "case-one.pdf",
        "case-one.xml",
        "case-one.json",
      ]
    ) {
      await fs.writeFile(join(directory, name), "synthetic");
    }
    await fs.mkdir(join(directory, "irs-pdf-cache"));
    await assertReviewArtifactInventory(directory, ["case-one"]);

    await fs.writeFile(join(directory, "unlisted.pdf"), "synthetic");
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Unexpected review packet entry: unlisted.pdf",
    );
    await sys.remove(join(directory, "unlisted.pdf"));

    await sys.remove(join(directory, "case-one.xml"));
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is missing: case-one.xml",
    );
  } finally {
    await sys.remove(directory, { recursive: true });
  }
});

test("review packet inventory rejects directory and symlink artifacts", async () => {
  const directory = await sys.makeTempDir();
  try {
    for (
      const name of [
        "review-manifest.json",
        "case-one.pdf",
        "case-one.xml",
        "case-one.json",
      ]
    ) {
      await fs.writeFile(join(directory, name), "synthetic");
    }
    await sys.remove(join(directory, "case-one.pdf"));
    await fs.mkdir(join(directory, "case-one.pdf"));
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is not a regular file: case-one.pdf",
    );
    await sys.remove(join(directory, "case-one.pdf"));
    await fs.symlink(
      join(directory, "case-one.xml"),
      join(directory, "case-one.pdf"),
    );
    await assertRejects(
      () => assertReviewArtifactInventory(directory, ["case-one"]),
      Error,
      "Review packet artifact is not a regular file: case-one.pdf",
    );
  } finally {
    await sys.remove(directory, { recursive: true });
  }
});
