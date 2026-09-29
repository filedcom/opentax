/** Generate only synthetic filled PDFs for the held, single full validation batch. */
import { join } from "@std/path";
import { buildExecutionPlan } from "../core/runtime/planner.ts";
import { execute } from "../core/runtime/executor.ts";
import { registry } from "../forms/f1040/2025/registry.ts";
import { buildPdfBytes } from "../forms/f1040/2025/pdf/builder.ts";
import { buildMefBundle } from "../forms/f1040/2025/mef/builder.ts";
import { buildPending } from "../forms/f1040/2025/mef/pending.ts";
import { pdfReviewFixtures } from "../forms/f1040/2025/pdf/review-fixtures.ts";

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

for (const fixture of pdfReviewFixtures) {
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
  await Deno.writeFile(join(outputDir, `${fixture.id}.pdf`), pdf);
  await Deno.writeTextFile(join(outputDir, `${fixture.id}.xml`), xml + "\n");
  await Deno.writeTextFile(
    join(outputDir, `${fixture.id}.json`),
    JSON.stringify(
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
    ) + "\n",
  );
}
