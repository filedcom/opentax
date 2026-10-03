import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";
import { inputSchema as w2gInputSchema } from "../../nodes/inputs/w2g/index.ts";
import { buildPdfBytes } from "./builder.ts";
import { w2gPdf } from "./forms/w2g.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

Deno.test("prepared PDF rechecks W-2G payer-copy content after attachment digests change", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-withheld-w2g"
  );
  if (!fixture) throw new Error("Missing withheld W-2G review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const [issued] = w2gInputSchema.parse(pending.w2g).w2gs;
  if (!issued) throw new Error("Missing issued W-2G source");
  const [projected] = w2gPdf.instances?.(
    { w2gs: [issued] },
    fixture.filer,
    { f1040: { line25c_total: pending.f1040?.line25c_total } },
  ) ?? [];
  if (!projected) throw new Error("Missing W-2G copy projection");

  async function issuedCopy(withheld: number): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.addPage([612, 792]);
    for (const field of w2gPdf.fields) {
      if (field.kind !== "text" || field.domainKey === "payer_phone") continue;
      const value = field.domainKey === "box4_federal_withheld"
        ? withheld
        : projected[field.domainKey];
      pdf.getForm().createTextField(field.pdfField).setText(
        String(value ?? ""),
      );
    }
    return pdf.save();
  }

  const fileName = "IssuedW2G.pdf";
  const validBytes = await issuedCopy(2_400);
  const validHash = await sha256Hex(validBytes);
  const sourcedPending = {
    ...pending,
    w2g: {
      w2gs: [{
        ...issued,
        issued_copy_attachment_file_name: fileName,
        issued_copy_pdf_sha256: validHash,
      }],
    },
  };
  const bundle = await buildMefBundle(sourcedPending, {
    filer: fixture.filer,
    attachments: [{
      fileName,
      description: "Payer-issued Form W-2G recipient copy",
      bytes: validBytes,
    }],
  });

  const changedBytes = await issuedCopy(2_399);
  const changedHash = await sha256Hex(changedBytes);
  const changedPending = {
    ...sourcedPending,
    w2g: {
      w2gs: [{
        ...issued,
        issued_copy_attachment_file_name: fileName,
        issued_copy_pdf_sha256: changedHash,
      }],
    },
  };
  const changedBundle = {
    ...bundle,
    pending: changedPending,
    sourceSha256: await preparedSourceSha256(changedPending, fixture.filer),
    attachments: [{ ...bundle.attachments[0], bytes: changedBytes }],
    attachmentSha256ByFileName: { [fileName]: changedHash },
  };
  await assertRejects(
    () =>
      buildPdfBytes(changedPending, fixture.filer, ".pdf-cache", changedBundle),
    Error,
    "W-2G payer copy box4_federal_withheld differs",
  );
});
