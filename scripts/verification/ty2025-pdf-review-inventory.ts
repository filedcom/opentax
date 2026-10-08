import { join } from "@std/path";

/** Require the generated review packet to contain exactly its declared artifacts. */
export async function assertReviewArtifactInventory(
  directory: string,
  caseIds: readonly string[],
): Promise<void> {
  const expectedFiles = new Set(["review-manifest.json"]);
  for (const id of caseIds) {
    for (const extension of ["pdf", "xml", "json"]) {
      expectedFiles.add(`${id}.${extension}`);
    }
  }
  const foundFiles = new Set<string>();
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name === "irs-pdf-cache" && entry.isDirectory) continue;
    if (!expectedFiles.has(entry.name)) {
      throw new Error(`Unexpected review packet entry: ${entry.name}`);
    }
    if (!entry.isFile) {
      throw new Error(
        `Review packet artifact is not a regular file: ${entry.name}`,
      );
    }
    foundFiles.add(entry.name);
  }
  for (const fileName of expectedFiles) {
    if (!foundFiles.has(fileName)) {
      throw new Error(`Review packet artifact is missing: ${fileName}`);
    }
    const info = await Deno.lstat(join(directory, fileName));
    if (!info.isFile || info.isSymlink) {
      throw new Error(
        `Review packet artifact is not a regular file: ${fileName}`,
      );
    }
  }
}
