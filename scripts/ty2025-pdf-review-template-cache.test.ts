import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  assertReviewTemplateCacheEvidence,
  reviewTemplateCacheEvidence,
} from "./ty2025-pdf-review-template-cache.ts";

const sourceUrl = "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf";
const cacheName = "https_www_irs_gov_pub_irs_prior_f1040_2025_pdf.pdf";

Deno.test("review template cache records an exact IRS URL and detects altered bytes", async () => {
  const directory = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(directory, cacheName), "%PDF-1.7 original");
    const recorded = await reviewTemplateCacheEvidence(directory, [sourceUrl]);
    assertEquals(recorded.length, 1);
    assertEquals(recorded[0].fileName, cacheName);
    assertEquals(recorded[0].sourceUrl, sourceUrl);
    await assertReviewTemplateCacheEvidence(directory, [sourceUrl], recorded);

    await Deno.writeTextFile(join(directory, cacheName), "%PDF-1.7 altered");
    await assertRejects(
      () => assertReviewTemplateCacheEvidence(directory, [sourceUrl], recorded),
      Error,
      "IRS template cache differs from review manifest evidence",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("review template cache rejects unknown or non-IRS entries", async () => {
  const directory = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(join(directory, cacheName), "%PDF-1.7 original");
    await assertRejects(
      () =>
        reviewTemplateCacheEvidence(directory, [
          "https://example.com/pub/f1040.pdf",
        ]),
      Error,
      "not an IRS PDF URL",
    );
    await Deno.writeTextFile(join(directory, "unlisted.pdf"), "%PDF-1.7");
    await assertRejects(
      () => reviewTemplateCacheEvidence(directory, [sourceUrl]),
      Error,
      "Unexpected IRS template cache entry",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
