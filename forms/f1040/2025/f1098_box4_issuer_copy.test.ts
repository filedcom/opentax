import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function issuerCopy(box4: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const form = doc.getForm();
  const copy = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${copy}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${copy}.LeftCol[0].f2_2[0]`]: "Example Home Lender",
      [`${copy}.LeftCol[0].f2_4[0]`]: "***-**-3333",
      [`${copy}.RightCol[0].f2_11[0]`]: "0",
      [`${copy}.RightCol[0].f2_12[0]`]: "",
      [`${copy}.RightCol[0].f2_13[0]`]: "",
      [`${copy}.RightCol[0].f2_14[0]`]: box4,
      [`${copy}.RightCol[0].f2_15[0]`]: "",
      [`${copy}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.createTextField(field).setText(value);
  return doc.save();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.test("taxable Form 1098 box 4 recovery binds exact issuer copy through Schedule 1 native and PDF", async () => {
  const bytes = await issuerCopy("2000");
  const mortgage = {
    lender_name: "Example Home Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "2025 Example Home Lender box 4 Copy B",
    box1_mortgage_interest: 0,
    box4_refund_overpaid: 2_000,
    box4_prior_year_refund: true,
    box4_taxable_recovery_verified_amount: 1_200,
    box4_recovery_workpaper_reference: "2025 Pub. 525 tax-benefit workpaper",
    issuer_copy: {
      file_name: "Recovery1098.pdf",
      pdf_sha256: await sha256(bytes),
      bytes,
    },
  };
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f1098: [mortgage],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(bundle.xml.includes("Form 1098 mortgage interest refund"), true);
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const filled = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 5);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, filled);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const rendered = new TextDecoder().decode(extracted.stdout);
    assertEquals(rendered.includes("Form 1098 mortgage interest refund"), true);
    assertEquals(rendered.includes("1200"), true);
  } finally {
    await Deno.remove(pdfPath);
  }

  const withoutCopy = {
    ...pending,
    f1098: { f1098s: [{ ...mortgage, issuer_copy: undefined }] },
  };
  assertThrows(
    () => buildMefXml(withoutCopy, filer),
    Error,
    "box 4 taxable recovery needs the reviewed issuer Copy B",
  );
  await assertRejects(
    () => buildMefBundle(withoutCopy, { filer, attachments: [] }),
    Error,
    "reviewed issuer Copy B bytes",
  );
  await assertRejects(
    () => buildPdfBytes(withoutCopy, filer, ".pdf-cache"),
    Error,
    "reviewed issuer Copy B bytes",
  );

  const changedBytes = await issuerCopy("1999");
  const alteredCopy = {
    ...pending,
    f1098: {
      f1098s: [{
        ...mortgage,
        issuer_copy: {
          ...mortgage.issuer_copy,
          bytes: changedBytes,
          pdf_sha256: await sha256(changedBytes),
        },
      }],
    },
  };
  await assertRejects(
    () => buildMefBundle(alteredCopy, { filer, attachments: [] }),
    Error,
    "box4_refund_overpaid differs",
  );
  await assertRejects(
    () => buildPdfBytes(alteredCopy, filer, ".pdf-cache"),
    Error,
    "box4_refund_overpaid differs",
  );
});
