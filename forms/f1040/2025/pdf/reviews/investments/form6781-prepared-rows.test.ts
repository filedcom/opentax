import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { preparedSourceSha256 } from "../../../domains/execution/prepared-source.ts";
import { buildPdfBytes } from "../../builder.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-form6781-two-section1256-accounts"
)!;

Deno.test("Form 6781 PDF uses only broker rows bound to its prepared MeF source", async () => {
  const inputs = {
    ...fixture.inputs,
    w2: (fixture.inputs.w2 as Record<string, unknown>[]).map((wage) => ({
      ...wage,
      employee_ssn: (fixture.inputs.general as Record<string, unknown>)
        .taxpayer_ssn,
    })),
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(bundle.xml.includes("Broker A Form 1099-B"), true);
  const drifted = {
    ...pending,
    accounts: [
      { account_identification: "Different broker A", gain_loss: 12_000 },
      { account_identification: "Different broker B", gain_loss: -2_000 },
    ],
  };
  assertEquals(
    await preparedSourceSha256(drifted, fixture.filer),
    bundle.sourceSha256,
  );
  await assertRejects(
    () => buildPdfBytes(drifted, fixture.filer, ".pdf-cache", bundle),
    Error,
    "top-level accounts rows are not bound to the prepared form source",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
});
