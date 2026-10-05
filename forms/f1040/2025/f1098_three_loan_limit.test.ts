import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const jointBase = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-w2s"
)!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function lenderCopy(
  lender: string,
  principal: number,
  recipientLastFour = "3333",
  originationDate = "01/15/2020",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const form = doc.getForm();
  const copy = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${copy}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${copy}.LeftCol[0].f2_2[0]`]: lender,
      [`${copy}.LeftCol[0].f2_4[0]`]: `***-**-${recipientLastFour}`,
      [`${copy}.RightCol[0].f2_11[0]`]: "1000",
      [`${copy}.RightCol[0].f2_12[0]`]: String(principal),
      [`${copy}.RightCol[0].f2_13[0]`]: originationDate,
      [`${copy}.RightCol[0].f2_14[0]`]: "",
      [`${copy}.RightCol[0].f2_15[0]`]: "",
      [`${copy}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.createTextField(field).setText(value);
  return doc.save();
}

function threeLoans(
  principal: number,
  deductible = 1_000,
  joint = false,
  loanCount = 3,
  purchase2025 = false,
) {
  return Promise.all(
    [1, 2, 3].slice(0, loanCount).map(async (number) => {
      const lender = `Example Lender ${number}`;
      const originationDate = purchase2025 && number === 1
        ? "07/15/2025"
        : "01/15/2020";
      const recipientTin = joint && number === 3
        ? "444-55-6666"
        : "111-22-3333";
      const bytes = await lenderCopy(
        lender,
        principal,
        recipientTin.slice(-4),
        originationDate,
      );
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      return {
        lender_name: lender,
        recipient_tin: recipientTin,
        source_document_reference: `2025 ${lender} Copy B`,
        box1_mortgage_interest: 1_000,
        box1_current_year_deductible_interest: deductible,
        box1_deduction_workpaper_reference: `${lender} Pub. 936 review`,
        box2_outstanding_principal: principal,
        box3_origination_date: originationDate,
        issuer_copy: {
          file_name: `Lender${number}1098.pdf`,
          pdf_sha256: hash,
          bytes,
        },
      };
    }),
  );
}

async function resultFor(
  principal: number,
  deductible = 1_000,
  reviewedBalance?: number,
  joint = false,
  loanCount = 3,
  purchase2025 = false,
) {
  const result = f1040_2025.executeReturn({
    ...(joint ? jointBase.inputs : base.inputs),
    schedule_a: { force_itemized: true },
    f1098: await threeLoans(
      principal,
      deductible,
      joint,
      loanCount,
      purchase2025,
    ),
    ...(reviewedBalance === undefined ? {} : {
      f1098_mortgage_limit_review: {
        mortgage_limit_review: {
          table1_workpaper_reference: "2025 three-loan Pub. 936 Table 1",
          all_qualified_home_mortgages_included_verified: true,
          all_post_2017_acquisition_debt_verified: true,
          ...(joint ? { filing_status_verified: "mfj" } : {
            single_filing_status_verified: true,
          }),
          loans: [1, 2, 3].slice(0, loanCount).map((number) => ({
            source_document_reference: `2025 Example Lender ${number} Copy B`,
            ...(purchase2025 && number === 1
              ? {
                property_reference: "new-principal-residence",
                purchase_closing_disclosure_reference:
                  "2025 principal residence closing disclosure",
                principal_residence_purchase_verified: true,
                no_additional_advances_verified: true,
              }
              : purchase2025
              ? {
                property_reference: "former-main-home-second-home",
                second_home_review: {
                  occupancy_record_reference:
                    "2025 prior-home occupancy and rental ledger",
                  qualified_second_home_election_verified: true,
                  held_out_for_rent_or_resale: false,
                  fair_rental_days: 0,
                  personal_use_days: 0,
                },
              }
              : {}),
            monthly_balance_records: Array.from(
              { length: 12 },
              (_, index) => ({
                month: index + 1,
                closing_balance: purchase2025 && number === 1 && index < 6
                  ? 0
                  : reviewedBalance,
                lender_statement_reference: `Example Lender ${number} month ${
                  index + 1
                }`,
              }),
            ),
          })),
        },
      },
    }),
  });
  assertEquals(result.diagnostics, []);
  return {
    pending: buildPending(result.pending),
    filer: extractFilerIdentity(result.pending.f1040)!,
  };
}

Deno.test("one or more sourced mortgages apply one reviewed Pub. 936 limit in native and PDF exports", async () => {
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
  const message = "post-2017 mortgage debt over $750,000";
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

  const reviewed = await resultFor(300_000, 833, 300_000);
  assertEquals(
    reviewed.pending.schedule_a?.line_8a_mortgage_interest_1098,
    2_499,
  );
  const reviewedBundle = await buildMefBundle(reviewed.pending, {
    filer: reviewed.filer,
    attachments: [],
  });
  assertEquals(
    reviewedBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>2499</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const reviewedXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(reviewedXmlPath, reviewedBundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, reviewedXmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(reviewedXmlPath);
  }
  const reviewedPdf = await buildPdfBytes(
    reviewedBundle.pending,
    reviewed.filer,
    ".pdf-cache",
    reviewedBundle,
  );
  assertEquals((await PDFDocument.load(reviewedPdf)).getPageCount(), 3);

  const oneUnreviewed = await resultFor(900_000, 1_000, undefined, false, 1);
  assertThrows(
    () => buildMefXml(oneUnreviewed.pending, oneUnreviewed.filer),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildPdfBytes(oneUnreviewed.pending, oneUnreviewed.filer, ".pdf-cache"),
    Error,
    message,
  );
  const oneReviewed = await resultFor(900_000, 833, 900_000, false, 1);
  const oneBundle = await buildMefBundle(oneReviewed.pending, {
    filer: oneReviewed.filer,
    attachments: [],
  });
  assertEquals(
    oneBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>833</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const oneXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(oneXmlPath, oneBundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, oneXmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(oneXmlPath);
  }
  const onePdf = await buildPdfBytes(
    oneBundle.pending,
    oneReviewed.filer,
    ".pdf-cache",
    oneBundle,
  );
  assertEquals((await PDFDocument.load(onePdf)).getPageCount(), 3);
  const onePdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(onePdfPath, onePdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", onePdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    assertEquals(
      new TextDecoder().decode(extracted.stdout).includes("833"),
      true,
    );
  } finally {
    await Deno.remove(onePdfPath);
  }
  const oneBelowAverageLimit = await resultFor(
    900_000,
    1_000,
    600_000,
    false,
    1,
  );
  assertEquals(
    buildMefXml(
      oneBelowAverageLimit.pending,
      oneBelowAverageLimit.filer,
    ).includes(
      "<RptHomeMortgIntAndPointsAmt>1000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );

  const purchaseUnreviewed = await resultFor(
    900_000,
    1_000,
    undefined,
    false,
    1,
    true,
  );
  assertThrows(
    () => buildMefXml(purchaseUnreviewed.pending, purchaseUnreviewed.filer),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        purchaseUnreviewed.pending,
        purchaseUnreviewed.filer,
        ".pdf-cache",
      ),
    Error,
    message,
  );
  const purchaseReviewed = await resultFor(
    900_000,
    833,
    900_000,
    false,
    1,
    true,
  );
  const purchaseBundle = await buildMefBundle(purchaseReviewed.pending, {
    filer: purchaseReviewed.filer,
    attachments: [],
  });
  assertEquals(
    purchaseBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>833</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const purchaseXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(purchaseXmlPath, purchaseBundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, purchaseXmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(purchaseXmlPath);
  }
  const purchasePdf = await buildPdfBytes(
    purchaseBundle.pending,
    purchaseReviewed.filer,
    ".pdf-cache",
    purchaseBundle,
  );
  assertEquals((await PDFDocument.load(purchasePdf)).getPageCount(), 3);
  const purchasePdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(purchasePdfPath, purchasePdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", purchasePdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    assertEquals(
      new TextDecoder().decode(extracted.stdout).includes("833"),
      true,
    );
  } finally {
    await Deno.remove(purchasePdfPath);
  }

  const purchaseWithExisting = await resultFor(
    500_000,
    750,
    500_000,
    false,
    2,
    true,
  );
  const purchaseWithExistingBundle = await buildMefBundle(
    purchaseWithExisting.pending,
    { filer: purchaseWithExisting.filer, attachments: [] },
  );
  assertEquals(
    purchaseWithExistingBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>1500</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const purchaseWithExistingPdf = await buildPdfBytes(
    purchaseWithExistingBundle.pending,
    purchaseWithExisting.filer,
    ".pdf-cache",
    purchaseWithExistingBundle,
  );
  assertEquals(
    (await PDFDocument.load(purchaseWithExistingPdf)).getPageCount(),
    3,
  );

  const purchaseWithTwoSecondHomeLoans = await resultFor(
    300_000,
    833,
    300_000,
    false,
    3,
    true,
  );
  assertEquals(
    purchaseWithTwoSecondHomeLoans.pending.schedule_a
      ?.line_8a_mortgage_interest_1098,
    2_499,
  );
  const multiPropertyBundle = await buildMefBundle(
    purchaseWithTwoSecondHomeLoans.pending,
    {
      filer: purchaseWithTwoSecondHomeLoans.filer,
      attachments: [],
    },
  );
  assertEquals(
    multiPropertyBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>2499</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const multiPropertyXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(multiPropertyXmlPath, multiPropertyBundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, multiPropertyXmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(multiPropertyXmlPath);
  }
  const multiPropertyPdf = await buildPdfBytes(
    multiPropertyBundle.pending,
    purchaseWithTwoSecondHomeLoans.filer,
    ".pdf-cache",
    multiPropertyBundle,
  );
  assertEquals((await PDFDocument.load(multiPropertyPdf)).getPageCount(), 3);
  const multiPropertyPdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(multiPropertyPdfPath, multiPropertyPdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", multiPropertyPdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    assertEquals(
      new TextDecoder().decode(extracted.stdout).includes("2499"),
      true,
    );
  } finally {
    await Deno.remove(multiPropertyPdfPath);
  }

  const underLimitPurchaseUnreviewed = await resultFor(
    300_000,
    1_000,
    undefined,
    false,
    2,
    true,
  );
  assertThrows(
    () =>
      buildMefXml(
        underLimitPurchaseUnreviewed.pending,
        underLimitPurchaseUnreviewed.filer,
      ),
    Error,
    "purchase plus existing mortgage needs one qualified-home",
  );
  const underLimitPurchaseReviewed = await resultFor(
    300_000,
    1_000,
    300_000,
    false,
    2,
    true,
  );
  const underLimitBundle = await buildMefBundle(
    underLimitPurchaseReviewed.pending,
    { filer: underLimitPurchaseReviewed.filer, attachments: [] },
  );
  assertEquals(
    underLimitBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>2000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const underLimitPdf = await buildPdfBytes(
    underLimitBundle.pending,
    underLimitPurchaseReviewed.filer,
    ".pdf-cache",
    underLimitBundle,
  );
  assertEquals((await PDFDocument.load(underLimitPdf)).getPageCount(), 3);

  const jointUnreviewed = await resultFor(300_000, 1_000, undefined, true);
  assertThrows(
    () => buildMefXml(jointUnreviewed.pending, jointUnreviewed.filer),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        jointUnreviewed.pending,
        jointUnreviewed.filer,
        ".pdf-cache",
      ),
    Error,
    message,
  );
  const jointReviewed = await resultFor(300_000, 833, 300_000, true);
  const jointBundle = await buildMefBundle(jointReviewed.pending, {
    filer: jointReviewed.filer,
    attachments: [],
  });
  assertEquals(
    jointBundle.xml.includes(
      "<RptHomeMortgIntAndPointsAmt>2499</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const jointXmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(jointXmlPath, jointBundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, jointXmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(jointXmlPath);
  }
  const jointPdf = await buildPdfBytes(
    jointBundle.pending,
    jointReviewed.filer,
    ".pdf-cache",
    jointBundle,
  );
  assertEquals((await PDFDocument.load(jointPdf)).getPageCount(), 3);
  const jointPdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(jointPdfPath, jointPdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", jointPdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    assertEquals(
      new TextDecoder().decode(extracted.stdout).includes("2499"),
      true,
    );
  } finally {
    await Deno.remove(jointPdfPath);
  }

  const belowAverageLimit = await resultFor(300_000, 1_000, 200_000);
  assertEquals(
    buildMefXml(belowAverageLimit.pending, belowAverageLimit.filer).includes(
      "<RptHomeMortgIntAndPointsAmt>3000</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  await assertRejects(
    () => buildPdfBytes(overLimit.pending, overLimit.filer, ".pdf-cache"),
    Error,
    message,
  );

  const partialUnderLimit = await resultFor(200_000, 900);
  assertEquals(
    buildMefXml(partialUnderLimit.pending, partialUnderLimit.filer).includes(
      "<RptHomeMortgIntAndPointsAmt>2700</RptHomeMortgIntAndPointsAmt>",
    ),
    true,
  );
  const partialOverLimit = await resultFor(300_000, 900);
  assertThrows(
    () => buildMefXml(partialOverLimit.pending, partialOverLimit.filer),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildMefBundle(partialOverLimit.pending, {
        filer: partialOverLimit.filer,
        attachments: [],
      }),
    Error,
    message,
  );
  await assertRejects(
    () =>
      buildPdfBytes(
        partialOverLimit.pending,
        partialOverLimit.filer,
        ".pdf-cache",
      ),
    Error,
    message,
  );
});
