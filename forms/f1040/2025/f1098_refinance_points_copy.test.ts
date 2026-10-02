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

async function issuerCopy(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const form = doc.getForm();
  const copy = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${copy}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${copy}.LeftCol[0].f2_2[0]`]: "Refinance Lender",
      [`${copy}.LeftCol[0].f2_4[0]`]: "***-**-3333",
      [`${copy}.RightCol[0].f2_11[0]`]: "0",
      [`${copy}.RightCol[0].f2_12[0]`]: "",
      [`${copy}.RightCol[0].f2_13[0]`]: "",
      [`${copy}.RightCol[0].f2_14[0]`]: "",
      [`${copy}.RightCol[0].f2_15[0]`]: "",
      [`${copy}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.createTextField(field).setText(value);
  return doc.save();
}

Deno.test("Schedule A refinance points with zero Form 1098 boxes still bind exact lender Copy B", async () => {
  const bytes = await issuerCopy();
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const mortgage = {
    lender_name: "Refinance Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "2025 refinance lender Copy B",
    box1_mortgage_interest: 0,
    issuer_copy: {
      file_name: "Refinance1098.pdf",
      pdf_sha256: hash,
      bytes,
    },
  };
  const refinance = {
    mortgage_id: "refinance-2025-1",
    recipient_tin: "111-22-3333",
    lender_name: mortgage.lender_name,
    form1098_source_document_reference: mortgage.source_document_reference,
    closing_disclosure_reference: "2025 refinance closing disclosure",
    pub936_workpaper_reference: "2025 Pub. 936 points workpaper",
    refinance_close_year: 2025,
    refinance_close_month: 6,
    prior_qualified_home_debt: 100_000,
    refinanced_principal: 100_000,
    loan_term_months: 180,
    total_points_charged: 3_000,
    points_for_nondeductible_services: 1_000,
    monthly_payment_records: [7, 8, 9, 10, 11, 12].map((month) => ({
      month,
      document_reference: `2025 lender payment ${month}`,
    })),
    qualified_home_secured_verified: true,
    points_not_reported_in_box6_verified: true,
    points_paid_directly_verified: true,
    acquisition_debt_limit_verified: true,
  };
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    schedule_a: { force_itemized: true },
    f1098: [mortgage],
    mortgage_refinance_points: { refinances: [refinance] },
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  assertEquals(pending.schedule_a?.line_8c_points_no_1098, 67);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<Form1098PointsNotReportedAmt>67</Form1098PointsNotReportedAmt>",
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
      new TextDecoder().decode(extracted.stdout).includes("67"),
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
    "refinance points need the reviewed Form 1098 issuer Copy B",
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
});
