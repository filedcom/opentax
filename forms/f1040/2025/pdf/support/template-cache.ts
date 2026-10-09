import { join } from "@std/path";

async function assertTemplateDigest(
  bytes: Uint8Array,
  url: string,
  expected?: string,
): Promise<void> {
  if (!expected) return;
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
  );
  const actual = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actual !== expected) {
    throw new Error(
      `IRS PDF template digest mismatch: ${url}; expected ${expected}, got ${actual}`,
    );
  }
}

/** A changed template must be reviewed before it can replace pinned bytes. */
export async function loadPdfTemplate(
  url: string,
  cacheDir: string,
  expectedSha256?: string,
): Promise<Uint8Array> {
  if (expectedSha256 !== undefined && !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`Invalid IRS PDF template SHA-256: ${url}`);
  }
  const slug = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const cachePath = join(cacheDir, `${slug}.pdf`);
  let cached: Uint8Array | undefined;
  try {
    cached = await Deno.readFile(cachePath);
  } catch {
    // Preserve the existing cache-miss behavior; digest failures never refetch.
  }
  if (cached !== undefined) {
    await assertTemplateDigest(cached, url, expectedSha256);
    return cached;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch IRS PDF: ${url} (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await assertTemplateDigest(bytes, url, expectedSha256);
  await Deno.mkdir(cacheDir, { recursive: true });
  await Deno.writeFile(cachePath, bytes);
  return bytes;
}
