/** Generate only synthetic filled PDFs for the held, single full validation batch. */
import { join } from "@std/path";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../core/runtime/planner.ts";
import { execute } from "../core/runtime/executor.ts";
import { registry } from "../forms/f1040/2025/registry.ts";
import { buildPdfBytes } from "../forms/f1040/2025/pdf/builder.ts";
import { buildMefBundle } from "../forms/f1040/2025/mef/builder.ts";
import { buildPending } from "../forms/f1040/2025/mef/pending.ts";
import { pdfReviewFixtures } from "../forms/f1040/2025/pdf/review-fixtures.ts";
import { ALL_PDF_FORMS } from "../forms/f1040/2025/pdf/forms/index.ts";
import { sha256Hex } from "../forms/f1040/2025/prepared-source.ts";

const outputDir = Deno.args[0];
if (!outputDir || Deno.args.length !== 1) {
  throw new Error(
    "Usage: deno run --allow-read --allow-write --allow-net=www.irs.gov scripts/generate-ty2025-pdf-review.ts /new/output-directory",
  );
}

// Deliberately refuse an existing directory so a prior review is never replaced.
await Deno.mkdir(outputDir);
const plan = buildExecutionPlan(registry);
const cacheDir = join(outputDir, "irs-pdf-cache");
const registered = new Set(ALL_PDF_FORMS.map((form) => form.pendingKey));
const fixtureIds = new Set<string>();
const reviewManifest: Record<string, unknown>[] = [];

for (const fixture of pdfReviewFixtures) {
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
    filer: fixture.filer,
    attachments: [],
  });
  const pdf = await buildPdfBytes(
    bundle.pending,
    fixture.filer,
    cacheDir,
    bundle,
  );
  const xml = bundle.xml;
  const xmlFileContents = xml + "\n";
  const rendered = await PDFDocument.load(pdf);
  const pageCount = rendered.getPageCount();
  const sourceFileContents = JSON.stringify(
    {
      id: fixture.id,
      synthetic: true,
      inputs: fixture.inputs,
      filer: fixture.filer,
      expectedPdfForms: fixture.expectedPdfForms,
      reviewFocus: fixture.reviewFocus,
      pending: result.pending,
    },
    null,
    2,
  ) + "\n";
  reviewManifest.push({
    id: fixture.id,
    pdfFile: `${fixture.id}.pdf`,
    pdfSha256: await sha256Hex(pdf),
    xmlFile: `${fixture.id}.xml`,
    xmlSha256: await sha256Hex(new TextEncoder().encode(xmlFileContents)),
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
    pages: Array.from({ length: pageCount }, (_, index) => ({
      pageNumber: index + 1,
      observedForm: null,
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
  await Deno.writeFile(join(outputDir, `${fixture.id}.pdf`), pdf);
  await Deno.writeTextFile(
    join(outputDir, `${fixture.id}.xml`),
    xmlFileContents,
  );
  await Deno.writeTextFile(
    join(outputDir, `${fixture.id}.json`),
    sourceFileContents,
  );
}

await Deno.writeTextFile(
  join(outputDir, "review-manifest.json"),
  JSON.stringify(
    {
      synthetic: true,
      taxYear: 2025,
      fixtureCount: reviewManifest.length,
      cases: reviewManifest,
    },
    null,
    2,
  ) + "\n",
);
