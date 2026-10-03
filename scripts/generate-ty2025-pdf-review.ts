/** Generate only synthetic filled PDFs for the held, single full validation batch. */
import { join, resolve } from "@std/path";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../core/runtime/planner.ts";
import { execute } from "../core/runtime/executor.ts";
import { registry } from "../forms/f1040/2025/registry.ts";
import {
  buildPdfBytes,
  type PdfPageOrigin,
} from "../forms/f1040/2025/pdf/builder.ts";
import { buildMefBundle } from "../forms/f1040/2025/mef/builder.ts";
import { buildPending } from "../forms/f1040/2025/mef/pending.ts";
import { pdfReviewFixtures } from "../forms/f1040/2025/pdf/review-fixtures.ts";
import { ALL_PDF_FORMS } from "../forms/f1040/2025/pdf/forms/index.ts";
import { sha256Hex } from "../forms/f1040/2025/prepared-source.ts";
import {
  REVIEW_RETURN_TIMESTAMP,
  reviewFiler,
  reviewSourceFileContents,
} from "./ty2025-pdf-review-source.ts";
import { reviewTemplateCacheEvidence } from "./ty2025-pdf-review-template-cache.ts";
import { assertReviewPageOrigins } from "./ty2025-pdf-review-page-origins.ts";
import {
  assertReviewSchemaDigest,
  assertReviewSchemaTree,
} from "./ty2025-pdf-review-schema.ts";
import {
  createPrivateReviewDirectory,
  makeReviewCacheFilesPrivate,
  writePrivateReviewFile,
  writePrivateReviewTextFile,
} from "./ty2025-pdf-review-private-files.ts";
import { reviewScope } from "./ty2025-pdf-review-scope.ts";

const [outputDir, xsdArg, selectionFile] = Deno.args;
if (!outputDir || !xsdArg || Deno.args.length < 2 || Deno.args.length > 3) {
  throw new Error(
    "Usage: deno run --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov scripts/generate-ty2025-pdf-review.ts /new/output-directory /absolute/path/Return1040.xsd [/absolute/path/selection.json]",
  );
}
let selectedIds: string[] | undefined;
if (selectionFile) {
  const selection: unknown = JSON.parse(await Deno.readTextFile(selectionFile));
  const ids = selection !== null && typeof selection === "object" &&
      !Array.isArray(selection)
    ? (selection as Record<string, unknown>).includedFixtureIds
    : undefined;
  if (
    !Array.isArray(ids) ||
    !ids.every((id: unknown) => typeof id === "string")
  ) {
    throw new Error("Selection file needs an includedFixtureIds string array");
  }
  selectedIds = ids;
}
const scope = reviewScope(
  pdfReviewFixtures.map((fixture) => fixture.id),
  selectedIds,
);
const includedIds = new Set(scope.includedFixtureIds);
const xsdPath = resolve(xsdArg);
if (!(await Deno.stat(xsdPath)).isFile) {
  throw new Error(`TY2025 XSD is not a file: ${xsdPath}`);
}
const xsdSha256 = await sha256Hex(await Deno.readFile(xsdPath));
assertReviewSchemaDigest(xsdSha256);
await assertReviewSchemaTree(xsdPath);

async function validateXmlAgainstXsd(xml: string, fixtureId: string) {
  const xmlPath = await Deno.makeTempFile({ dir: outputDir, suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml, { mode: 0o600 });
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!result.success) {
      throw new Error(
        `${fixtureId}: TY2025 XSD validation failed: ${
          new TextDecoder().decode(result.stderr).trim()
        }`,
      );
    }
  } finally {
    await Deno.remove(xmlPath);
  }
}

// Deliberately refuse an existing directory so a prior review is never replaced.
await createPrivateReviewDirectory(outputDir);
const plan = buildExecutionPlan(registry);
const cacheDir = join(outputDir, "irs-pdf-cache");
await createPrivateReviewDirectory(cacheDir);
const registered = new Set(ALL_PDF_FORMS.map((form) => form.pendingKey));
const fixtureIds = new Set<string>();
const reviewManifest: Record<string, unknown>[] = [];

for (const fixture of pdfReviewFixtures) {
  if (!includedIds.has(fixture.id)) continue;
  const filer = reviewFiler(fixture.filer);
  if (fixtureIds.has(fixture.id)) {
    throw new Error(`Duplicate filled-PDF review fixture: ${fixture.id}`);
  }
  fixtureIds.add(fixture.id);
  if (
    fixture.reviewFocus.length === 0 || fixture.expectedPdfForms.length === 0
  ) {
    throw new Error(
      `${fixture.id}: expected forms and review focus are required`,
    );
  }
  for (const key of fixture.expectedPdfForms) {
    if (!registered.has(key)) {
      throw new Error(`${fixture.id}: unregistered expected PDF form ${key}`);
    }
  }
  const result = execute(plan, registry, { ...fixture.inputs }, {
    taxYear: 2025,
    formType: "f1040",
  });
  if (result.diagnostics.length > 0) {
    throw new Error(
      `${fixture.id}: executor diagnostics: ${
        JSON.stringify(result.diagnostics)
      }`,
    );
  }
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  await validateXmlAgainstXsd(bundle.xml, fixture.id);
  const pageOrigins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    cacheDir,
    bundle,
    pageOrigins,
  );
  await makeReviewCacheFilesPrivate(cacheDir);
  const xml = bundle.xml;
  const xmlFileContents = xml + "\n";
  const rendered = await PDFDocument.load(pdf);
  const pageCount = rendered.getPageCount();
  if (pageOrigins.length !== pageCount) {
    throw new Error(
      `${fixture.id}: PDF page origin count differs from PDF pages`,
    );
  }
  assertReviewPageOrigins(
    fixture.id,
    pageOrigins,
    fixture.expectedPdfForms,
    pageOrigins,
  );
  const sourceFileContents = reviewSourceFileContents(
    fixture,
    filer,
    result.pending,
  );
  reviewManifest.push({
    id: fixture.id,
    pdfFile: `${fixture.id}.pdf`,
    pdfSha256: await sha256Hex(pdf),
    xmlFile: `${fixture.id}.xml`,
    xmlSha256: await sha256Hex(new TextEncoder().encode(xmlFileContents)),
    xsdValidated: true,
    sourceFile: `${fixture.id}.json`,
    sourceSha256: await sha256Hex(new TextEncoder().encode(sourceFileContents)),
    expectedPdfForms: fixture.expectedPdfForms,
    expectedOwners: [
      {
        role: "primary",
        name: fixture.filer.nameLine1,
        ssn: fixture.filer.primarySSN,
      },
      ...(fixture.filer.spouse
        ? [{
          role: "spouse",
          name:
            `${fixture.filer.spouse.firstName} ${fixture.filer.spouse.lastName}`,
          ssn: fixture.filer.spouse.ssn,
        }]
        : []),
    ],
    reviewFocus: fixture.reviewFocus,
    pageCount,
    pageOrigins,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      pageNumber: index + 1,
      observedForm: null,
      observedFormCopy: null,
      observedOwner: null,
      formAndYearChecked: false,
      ownerChecked: false,
      amountsAndXmlChecked: false,
      checkboxesChecked: false,
      continuationAndPageOrderChecked: false,
      clippingAndLegibilityChecked: false,
      reviewerNotes: "",
    })),
  });
  await writePrivateReviewFile(outputDir, `${fixture.id}.pdf`, pdf);
  await writePrivateReviewTextFile(
    outputDir,
    `${fixture.id}.xml`,
    xmlFileContents,
  );
  await writePrivateReviewTextFile(
    outputDir,
    `${fixture.id}.json`,
    sourceFileContents,
  );
}

await writePrivateReviewTextFile(
  outputDir,
  "review-manifest.json",
  JSON.stringify(
    {
      taxYear: 2025,
      scope,
      reviewReturnTimestamp: REVIEW_RETURN_TIMESTAMP,
      xsdSha256,
      templateCache: await reviewTemplateCacheEvidence(
        cacheDir,
        ALL_PDF_FORMS.map((form) => form.pdfUrl),
      ),
      fixtureCount: reviewManifest.length,
      cases: reviewManifest,
    },
    null,
    2,
  ) + "\n",
);
