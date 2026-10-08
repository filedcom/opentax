import { canonicalForm1098CopyDocument } from "../../../pdf/reviews/composed/review-1098-copy.fixture.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { f1040_2025 } from "../../../index.ts";
import { buildMefBundle, buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const xsdPath = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function issuerCopy(borrowerTin = "***-**-3333"): Promise<Uint8Array> {
  const doc = await canonicalForm1098CopyDocument();
  const form = doc.getForm();
  const copy = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${copy}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${copy}.LeftCol[0].f2_2[0]`]: "Example Home Lender",
      [`${copy}.LeftCol[0].f2_4[0]`]: borrowerTin,
      [`${copy}.RightCol[0].f2_11[0]`]: "20000",
      [`${copy}.RightCol[0].f2_12[0]`]: "",
      [`${copy}.RightCol[0].f2_13[0]`]: "",
      [`${copy}.RightCol[0].f2_14[0]`]: "",
      [`${copy}.RightCol[0].f2_15[0]`]: "",
      [`${copy}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.getTextField(field).setText(value);
  return doc.save();
}

Deno.test("positive Form 1098 box 1 needs a filer-owned exact issuer copy through native and PDF Schedule A", async () => {
  const bytes = await issuerCopy();
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const mortgage = {
    lender_name: "Example Home Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "2025 Example Home Lender Copy B account 1",
    box1_mortgage_interest: 20_000,
    box1_current_year_deductible_interest: 20_000,
    box1_deduction_workpaper_reference: "2025 Pub. 936 interest workpaper",
    issuer_copy: {
      file_name: "ExampleHomeLender1098.pdf",
      pdf_sha256: hash,
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
  assertEquals(
    bundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>20000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
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
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, filled);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    assertEquals(
      new TextDecoder().decode(extracted.stdout).includes("20000"),
      true,
    );
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
    "needs an identified issuer Copy B",
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
  const wrongOwnerBytes = await issuerCopy("***-**-4444");
  const wrongOwnerHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(wrongOwnerBytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const wrongOwner = {
    ...pending,
    f1098: {
      f1098s: [{
        ...mortgage,
        recipient_tin: "222-33-4444",
        issuer_copy: {
          ...mortgage.issuer_copy,
          pdf_sha256: wrongOwnerHash,
          bytes: wrongOwnerBytes,
        },
      }],
    },
  };
  await assertRejects(
    () => buildMefBundle(wrongOwner, { filer, attachments: [] }),
    Error,
    "owned by the taxpayer or joint-filing spouse",
  );
  await assertRejects(
    () => buildPdfBytes(wrongOwner, filer, ".pdf-cache"),
    Error,
    "owned by the taxpayer or joint-filing spouse",
  );
});

Deno.test("unclaimed Form 1098 box 1 interest remains calculation-only with the standard deduction", async () => {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f1098: [{
      box1_mortgage_interest: 5_000,
      box1_current_year_deductible_interest: 5_000,
      box1_deduction_workpaper_reference: "2025 Pub. 936 interest workpaper",
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line12e_itemized_deductions, undefined);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(bundle.xml.includes("<IRS1040ScheduleA"), false);
  const filled = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 2);
});
