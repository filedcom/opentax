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

async function lenderCopy(
  lender: string,
  principal: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const form = doc.getForm();
  const copy = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${copy}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${copy}.LeftCol[0].f2_2[0]`]: lender,
      [`${copy}.LeftCol[0].f2_4[0]`]: "***-**-3333",
      [`${copy}.RightCol[0].f2_11[0]`]: "1000",
      [`${copy}.RightCol[0].f2_12[0]`]: String(principal),
      [`${copy}.RightCol[0].f2_13[0]`]: "01/15/2020",
      [`${copy}.RightCol[0].f2_14[0]`]: "",
      [`${copy}.RightCol[0].f2_15[0]`]: "",
      [`${copy}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.createTextField(field).setText(value);
  return doc.save();
}

async function threeLoans(principal: number) {
  return Promise.all([1, 2, 3].map(async (number) => {
    const lender = `Example Lender ${number}`;
    const bytes = await lenderCopy(lender, principal);
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    return {
      lender_name: lender,
      recipient_tin: "111-22-3333",
      source_document_reference: `2025 ${lender} Copy B`,
      box1_mortgage_interest: 1_000,
      box1_current_year_deductible_interest: 1_000,
      box1_deduction_workpaper_reference: `${lender} Pub. 936 review`,
      box2_outstanding_principal: principal,
      box3_origination_date: "01/15/2020",
      issuer_copy: {
        file_name: `Lender${number}1098.pdf`,
        pdf_sha256: hash,
        bytes,
      },
    };
  }));
}

async function resultFor(principal: number) {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    schedule_a: { force_itemized: true },
    f1098: await threeLoans(principal),
  });
  assertEquals(result.diagnostics, []);
  return {
    pending: buildPending(result.pending),
    filer: extractFilerIdentity(result.pending.f1040)!,
  };
}

Deno.test("three sourced mortgages under the debt limit print, while over-limit full interest fails closed", async () => {
  const { pending, filer } = await resultFor(200_000);
  assertEquals(pending.schedule_a?.line_8a_mortgage_interest_1098, 3_000);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>3000</RptHomeMortgIntAndPointsAmt>",
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
      new TextDecoder().decode(extracted.stdout).includes("3000"),
      true,
    );
  } finally {
    await Deno.remove(pdfPath);
  }

  const atLimit = await resultFor(250_000);
  assertEquals(
    buildMefXml(atLimit.pending, atLimit.filer).includes(
      "<RptHomeMortgIntAndPointsAmt>3000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );

  const overLimit = await resultFor(300_000);
  const message = "three or more post-2017 mortgages over $750,000";
  assertThrows(
    () => buildMefXml(overLimit.pending, overLimit.filer),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildMefBundle(overLimit.pending, {
        filer: overLimit.filer,
        attachments: [],
      }),
    Error,
    message,
  );
  await assertRejects(
    () => buildPdfBytes(overLimit.pending, overLimit.filer, ".pdf-cache"),
    Error,
    message,
  );
});
