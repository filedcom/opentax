import { join } from "@std/path";
import { sha256Hex } from "../forms/f1040/2025/prepared-source.ts";

export interface ReviewTemplateCacheEntry {
  readonly fileName: string;
  readonly sourceUrl: string;
  readonly sha256: string;
}

function cacheFileName(url: string): string {
  return url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_") + ".pdf";
}

/** Describe the exact IRS templates retained by the filled-PDF generator. */
export async function reviewTemplateCacheEvidence(
  cacheDirectory: string,
  registeredUrls: readonly string[],
): Promise<ReviewTemplateCacheEntry[]> {
  const directoryInfo = await Deno.lstat(cacheDirectory);
  if (!directoryInfo.isDirectory || directoryInfo.isSymlink) {
    throw new Error("IRS template cache is not a regular directory");
  }
  const sourceByFileName = new Map<string, string>();
  for (const sourceUrl of registeredUrls) {
    const url = new URL(sourceUrl);
    if (
      url.protocol !== "https:" || url.hostname !== "www.irs.gov" ||
      !url.pathname.startsWith("/pub/") || !url.pathname.endsWith(".pdf") ||
      url.search || url.hash
    ) {
      throw new Error(
        "Review template source is not an IRS PDF URL: " + sourceUrl,
      );
    }
    const fileName = cacheFileName(sourceUrl);
    const prior = sourceByFileName.get(fileName);
    if (prior && prior !== sourceUrl) {
      throw new Error("Review template cache filename collision: " + fileName);
    }
    sourceByFileName.set(fileName, sourceUrl);
  }
  const evidence: ReviewTemplateCacheEntry[] = [];
  for await (const entry of Deno.readDir(cacheDirectory)) {
    const sourceUrl = sourceByFileName.get(entry.name);
    if (!sourceUrl || !entry.isFile || entry.isSymlink) {
      throw new Error("Unexpected IRS template cache entry: " + entry.name);
    }
    const cachePath = join(cacheDirectory, entry.name);
    const fileInfo = await Deno.lstat(cachePath);
    if (!fileInfo.isFile || fileInfo.isSymlink) {
      throw new Error("Unexpected IRS template cache entry: " + entry.name);
    }
    const bytes = await Deno.readFile(cachePath);
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      throw new Error("IRS template cache entry is not a PDF: " + entry.name);
    }
    evidence.push({
      fileName: entry.name,
      sourceUrl,
      sha256: await sha256Hex(bytes),
    });
  }
  if (evidence.length === 0) {
    throw new Error("Review packet has no retained IRS PDF templates");
  }
  return evidence.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export async function assertReviewTemplateCacheEvidence(
  cacheDirectory: string,
  registeredUrls: readonly string[],
  recorded: unknown,
): Promise<void> {
  const current = await reviewTemplateCacheEvidence(
    cacheDirectory,
    registeredUrls,
  );
  if (JSON.stringify(recorded) !== JSON.stringify(current)) {
    throw new Error("IRS template cache differs from review manifest evidence");
  }
}
