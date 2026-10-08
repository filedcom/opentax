/** Read-only audit of a human-completed TY2025 filled-PDF review manifest. */
import { join, resolve } from "@std/path";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { buildMefBundle } from "../../forms/f1040/2025/mef/builder.ts";
import { buildPending } from "../../forms/f1040/2025/mef/execution/pending.ts";
import { pdfReviewFixtures } from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { ALL_PDF_FORMS } from "../../forms/f1040/2025/pdf/forms/index.ts";
import {
  buildPdfBytes,
  type PdfPageOrigin,
} from "../../forms/f1040/2025/pdf/builder.ts";
import { sha256Hex } from "../../forms/f1040/2025/domains/execution/prepared-source.ts";
import {
  assertReviewSourceFileContents,
  REVIEW_RETURN_TIMESTAMP,
  reviewFiler,
  reviewSourceFileContents,
} from "./ty2025-pdf-review-source.ts";
import { assertReviewArtifactInventory } from "../verification/ty2025-pdf-review-inventory.ts";
import { assertReviewPdfReplay } from "./ty2025-pdf-review-replay.ts";
import { assertReviewTemplateCacheEvidence } from "./ty2025-pdf-review-template-cache.ts";
import {
  assertReviewedPageOrigin,
  assertReviewPageOrigins,
} from "./ty2025-pdf-review-page-origins.ts";
import {
  assertReviewSchemaDigest,
  assertReviewSchemaTree,
} from "./ty2025-pdf-review-schema.ts";
import { assertReviewScope } from "./ty2025-pdf-review-scope.ts";

const [directoryArg, xsdArg] = Deno.args;
if (!directoryArg || !xsdArg || Deno.args.length !== 2) {
  throw new Error(
    "Usage: deno run --allow-read --allow-run=xmllint scripts/research/check-ty2025-pdf-review.ts /review-directory /absolute/path/Return1040.xsd",
  );
}
const directory = resolve(directoryArg);
const xsdPath = resolve(xsdArg);
if (!(await Deno.stat(xsdPath)).isFile) {
  throw new Error(`TY2025 XSD is not a file: ${xsdPath}`);
}

type Data = Record<string, unknown>;

function object(value: unknown, label: string): Data {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Data;
}

function items(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer`);
  }
  return value as number;
}

function checked(value: unknown, label: string): void {
  if (value !== true) throw new Error(`${label} has not been checked`);
}

function expectedStrings(
  value: unknown,
  expected: readonly string[],
  label: string,
) {
  const actual = items(value, label).map((item, index) =>
    string(item, `${label}[${index}]`)
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} differs from the checked-in fixture`);
  }
}

async function artifact(
  caseId: string,
  entry: Data,
  extension: "pdf" | "xml" | "json",
  hashKey: string,
): Promise<Uint8Array> {
  const fileName = `${caseId}.${extension}`;
  if (
    entry[`${extension === "json" ? "source" : extension}File`] !== fileName
  ) {
    throw new Error(`${caseId}: expected ${fileName} in the manifest`);
  }
  const bytes = await Deno.readFile(join(directory, fileName));
  const digest = await sha256Hex(bytes);
  if (entry[hashKey] !== digest) {
    throw new Error(`${caseId}: ${fileName} SHA-256 differs from the manifest`);
  }
  return bytes;
}

const manifest = object(
  JSON.parse(await Deno.readTextFile(join(directory, "review-manifest.json"))),
  "review manifest",
);
if (manifest.taxYear !== 2025) throw new Error("Review batch is not TY2025");
if (manifest.reviewReturnTimestamp !== REVIEW_RETURN_TIMESTAMP) {
  throw new Error(
    "Review batch header timestamp differs from the review source",
  );
}
const schemaDigest = await sha256Hex(await Deno.readFile(xsdPath));
assertReviewSchemaDigest(schemaDigest);
await assertReviewSchemaTree(xsdPath);
if (manifest.xsdSha256 !== schemaDigest) {
  throw new Error("TY2025 XSD SHA-256 differs from the recorded schema");
}
const cases = items(manifest.cases, "review cases");
if (integer(manifest.fixtureCount, "fixtureCount") !== cases.length) {
  throw new Error("Manifest fixture count differs from its case list");
}
const fixtures = new Map(
  pdfReviewFixtures.map((fixture) => [fixture.id, fixture]),
);
if (fixtures.size !== pdfReviewFixtures.length) {
  throw new Error("Checked-in review fixture IDs are not unique");
}
const scope = assertReviewScope(manifest.scope, [...fixtures.keys()]);
if (cases.length !== scope.includedFixtureIds.length) {
  throw new Error("Review batch does not contain its declared fixtures");
}
await assertReviewArtifactInventory(directory, scope.includedFixtureIds);
const templateCache = join(directory, "irs-pdf-cache");
const templateCacheInfo = await Deno.stat(templateCache).catch(() => undefined);
if (!templateCacheInfo?.isDirectory) {
  throw new Error("Retained IRS PDF template cache is not a directory");
}
await assertReviewTemplateCacheEvidence(
  templateCache,
  ALL_PDF_FORMS.map((form) => form.pdfUrl),
  manifest.templateCache,
);
const seen = new Set<string>();
let reviewedPages = 0;

for (const [index, rawCase] of cases.entries()) {
  const entry = object(rawCase, `case ${index + 1}`);
  const id = string(entry.id, `case ${index + 1} ID`);
  if (id !== scope.includedFixtureIds[index]) {
    throw new Error(`Review case ${index + 1} differs from declared scope`);
  }
  const fixture = fixtures.get(id);
  if (!fixture) throw new Error(`Unknown review case ${id}`);
  const filer = reviewFiler(fixture.filer);
  if (seen.has(id)) throw new Error(`Duplicate review case ${id}`);
  seen.add(id);
  expectedStrings(
    entry.expectedPdfForms,
    fixture.expectedPdfForms,
    `${id} expected PDF forms`,
  );
  expectedStrings(
    entry.reviewFocus,
    fixture.reviewFocus,
    `${id} review focus`,
  );
  checked(entry.xsdValidated, `${id} recorded XSD result`);

  const expectedOwners: Data[] = [{
    role: "primary",
    name: fixture.filer.nameLine1,
    ssn: fixture.filer.primarySSN,
  }];
  if (fixture.filer.spouse) {
    expectedOwners.push({
      role: "spouse",
      name:
        `${fixture.filer.spouse.firstName} ${fixture.filer.spouse.lastName}`,
      ssn: fixture.filer.spouse.ssn,
    });
  }
  if (JSON.stringify(entry.expectedOwners) !== JSON.stringify(expectedOwners)) {
    throw new Error(
      `${id}: expected owners differ from the checked-in fixture`,
    );
  }

  const pdf = await artifact(id, entry, "pdf", "pdfSha256");
  const xml = await artifact(id, entry, "xml", "xmlSha256");
  const source = await artifact(id, entry, "json", "sourceSha256");
  const sourceData = object(
    JSON.parse(new TextDecoder().decode(source)),
    `${id} source`,
  );
  if (sourceData.id !== id) {
    throw new Error(`${id}: source identity differs`);
  }
  expectedStrings(
    sourceData.expectedPdfForms,
    fixture.expectedPdfForms,
    `${id} source PDF forms`,
  );
  expectedStrings(
    sourceData.reviewFocus,
    fixture.reviewFocus,
    `${id} source review focus`,
  );
  if (
    JSON.stringify(sourceData.filer) !== JSON.stringify(filer) ||
    JSON.stringify(sourceData.inputs) !== JSON.stringify(fixture.inputs)
  ) {
    throw new Error(
      `${id}: source identity or inputs differ from the checked-in fixture`,
    );
  }
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  if (result.diagnostics.length > 0) {
    throw new Error(`${id}: current source calculation has diagnostics`);
  }
  if (JSON.stringify(sourceData.pending) !== JSON.stringify(result.pending)) {
    throw new Error(
      `${id}: saved pending data differs from current source calculation`,
    );
  }
  assertReviewSourceFileContents(
    id,
    source,
    reviewSourceFileContents(fixture, filer, result.pending),
  );
  const rebuilt = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [...(fixture.attachments ?? [])],
    retainedSourceDocuments: fixture.retainedSourceDocuments,
  });
  if (new TextDecoder().decode(xml) !== rebuilt.xml + "\n") {
    throw new Error(`${id}: saved XML differs from current source calculation`);
  }
  const replayedPageOrigins: PdfPageOrigin[] = [];
  const replayedPdf = await buildPdfBytes(
    rebuilt.pending,
    filer,
    templateCache,
    rebuilt,
    replayedPageOrigins,
  );
  await assertReviewPdfReplay(id, replayedPdf, entry.pdfSha256);

  const validation = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsdPath, join(directory, `${id}.xml`)],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!validation.success) {
    throw new Error(
      `${id}: current XSD validation failed: ${
        new TextDecoder().decode(validation.stderr).trim()
      }`,
    );
  }
  if (xml.length === 0) throw new Error(`${id}: native XML is empty`);

  const pageCount = (await PDFDocument.load(pdf)).getPageCount();
  if (
    pageCount === 0 || integer(entry.pageCount, `${id} pageCount`) !== pageCount
  ) {
    throw new Error(`${id}: PDF page count differs from the manifest`);
  }
  if (replayedPageOrigins.length !== pageCount) {
    throw new Error(`${id}: replayed PDF page origin count differs from pages`);
  }
  assertReviewPageOrigins(
    id,
    replayedPageOrigins,
    fixture.expectedPdfForms,
    entry.pageOrigins,
  );
  const pages = items(entry.pages, `${id} pages`);
  if (pages.length !== pageCount) {
    throw new Error(`${id}: one review slot is required for every PDF page`);
  }
  const expectedCopies = new Map<string, number>();
  for (const key of fixture.expectedPdfForms) {
    expectedCopies.set(key, (expectedCopies.get(key) ?? 0) + 1);
  }
  const observedCopies = new Map<string, Set<number>>();
  const ownerRoles = new Set(expectedOwners.map((owner) => owner.role));
  const checklist = [
    "formAndYearChecked",
    "ownerChecked",
    "amountsAndXmlChecked",
    "checkboxesChecked",
    "continuationAndPageOrderChecked",
    "clippingAndLegibilityChecked",
  ];
  for (const [pageIndex, rawPage] of pages.entries()) {
    const label = `${id} page ${pageIndex + 1}`;
    const page = object(rawPage, label);
    if (integer(page.pageNumber, `${label} number`) !== pageIndex + 1) {
      throw new Error(`${label}: page number is out of order`);
    }
    const form = string(page.observedForm, `${label} observed form`);
    const copy = integer(page.observedFormCopy, `${label} observed form copy`);
    assertReviewedPageOrigin(id, form, copy, replayedPageOrigins[pageIndex]);
    const maxCopies = expectedCopies.get(form);
    if (maxCopies === undefined || copy < 1 || copy > maxCopies) {
      throw new Error(`${label}: observed form/copy is not expected`);
    }
    const owner = string(page.observedOwner, `${label} observed owner role`);
    if (!ownerRoles.has(owner)) {
      throw new Error(`${label}: observed owner is not an expected role`);
    }
    for (const field of checklist) checked(page[field], `${label} ${field}`);
    if (typeof page.reviewerNotes !== "string") {
      throw new Error(`${label}: reviewer notes must be a string`);
    }
    const copies = observedCopies.get(form) ?? new Set<number>();
    copies.add(copy);
    observedCopies.set(form, copies);
    reviewedPages++;
  }
  for (const [form, count] of expectedCopies) {
    if (observedCopies.get(form)?.size !== count) {
      throw new Error(
        `${id}: not every expected ${form} copy has a reviewed page`,
      );
    }
  }
}

if (seen.size !== scope.includedFixtureIds.length) {
  throw new Error(
    "One or more declared fixtures are absent from the review batch",
  );
}
console.log(
  `Review checklist complete (${scope.kind} scope): ${seen.size} cases, ${reviewedPages} pages; artifact hashes and TY2025 XSD validation confirmed.`,
);
