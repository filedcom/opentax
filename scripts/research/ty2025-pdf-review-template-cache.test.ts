import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import {
  assertReviewTemplateCacheEvidence,
  reviewTemplateCacheEvidence,
} from "./ty2025-pdf-review-template-cache.ts";

const sourceUrl = "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf";
const cacheName = "https_www_irs_gov_pub_irs_prior_f1040_2025_pdf.pdf";

test("review template cache records an exact IRS URL and detects altered bytes", async () => {
  const directory = await sys.makeTempDir();
  try {
    await fs.writeFile(join(directory, cacheName), "%PDF-1.7 original");
    const recorded = await reviewTemplateCacheEvidence(directory, [sourceUrl]);
    assertEquals(recorded.length, 1);
    assertEquals(recorded[0].fileName, cacheName);
    assertEquals(recorded[0].sourceUrl, sourceUrl);
    await assertReviewTemplateCacheEvidence(directory, [sourceUrl], recorded);

    await fs.writeFile(join(directory, cacheName), "%PDF-1.7 altered");
    await assertRejects(
      () => assertReviewTemplateCacheEvidence(directory, [sourceUrl], recorded),
      Error,
      "IRS template cache differs from review manifest evidence",
    );
  } finally {
    await sys.remove(directory, { recursive: true });
  }
});

test("review template cache rejects unknown or non-IRS entries", async () => {
  const directory = await sys.makeTempDir();
  try {
    await fs.writeFile(join(directory, cacheName), "%PDF-1.7 original");
    await assertRejects(
      () =>
        reviewTemplateCacheEvidence(directory, [
          "https://example.com/pub/f1040.pdf",
        ]),
      Error,
      "not an IRS PDF URL",
    );
    await fs.writeFile(join(directory, "unlisted.pdf"), "%PDF-1.7");
    await assertRejects(
      () => reviewTemplateCacheEvidence(directory, [sourceUrl]),
      Error,
      "Unexpected IRS template cache entry",
    );
  } finally {
    await sys.remove(directory, { recursive: true });
  }
});

test("review template cache rejects symlinked directories and files", async () => {
  const parent = await sys.makeTempDir();
  try {
    const cache = join(parent, "cache");
    await fs.mkdir(cache);
    const template = join(parent, "template.pdf");
    await fs.writeFile(template, "%PDF-1.7 original");
    await fs.symlink(template, join(cache, cacheName));
    await assertRejects(
      () => reviewTemplateCacheEvidence(cache, [sourceUrl]),
      Error,
      "Unexpected IRS template cache entry",
    );

    const linkedCache = join(parent, "linked-cache");
    await fs.symlink(cache, linkedCache);
    await assertRejects(
      () => reviewTemplateCacheEvidence(linkedCache, [sourceUrl]),
      Error,
      "IRS template cache is not a regular directory",
    );
  } finally {
    await sys.remove(parent, { recursive: true });
  }
});
