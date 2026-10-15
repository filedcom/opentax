import {
  assertTemplateDigest,
  loadPdfTemplate,
} from "../../pdf/template-cache.ts";

/** Use checked-out LFS bytes when available, otherwise the same pinned IRS bytes. */
export async function loadPinnedDraft2026(
  localPath: URL,
  url: string,
  sha256: string,
): Promise<Uint8Array> {
  let local: Uint8Array | undefined;
  try {
    local = await Deno.readFile(localPath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  if (local) {
    const text = new TextDecoder().decode(local.subarray(0, 256));
    if (text.startsWith("version https://git-lfs.github.com/spec/v1\n")) {
      if (!text.includes(`oid sha256:${sha256}\n`)) {
        throw new Error(
          "TY2026 draft LFS pointer differs from the reviewed source hash",
        );
      }
    } else {
      await assertTemplateDigest(local, url, sha256);
      return local;
    }
  }
  return loadPdfTemplate(url, ".state/pdf-cache/ty2026", sha256);
}
