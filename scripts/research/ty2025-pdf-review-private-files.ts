import { join } from "@std/path";

/** Keep full return sources and filled PDFs private to the local reviewer. */
export async function createPrivateReviewDirectory(
  path: string,
): Promise<void> {
  await Deno.mkdir(path, { mode: 0o700 });
}

export async function writePrivateReviewFile(
  directory: string,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  await Deno.writeFile(join(directory, name), bytes, {
    createNew: true,
    mode: 0o600,
  });
}

export async function writePrivateReviewTextFile(
  directory: string,
  name: string,
  contents: string,
): Promise<void> {
  await Deno.writeTextFile(join(directory, name), contents, {
    createNew: true,
    mode: 0o600,
  });
}

/** PDF templates are public, but keep every file in the review packet private. */
export async function makeReviewCacheFilesPrivate(
  directory: string,
): Promise<void> {
  for await (const entry of Deno.readDir(directory)) {
    if (!entry.isFile || entry.isSymlink) {
      throw new Error(`Unexpected review template cache entry: ${entry.name}`);
    }
    await Deno.chmod(join(directory, entry.name), 0o600);
  }
}
