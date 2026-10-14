import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import type { Form8621Lines } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { projectForm8621Packet } from "./f8621_packet_source.ts";
import { appendForm8621ExcessStatement } from "./f8621_excess_statement.ts";
import { calculateMtmDisposition } from "../../../../../nodes/inputs/income/foreign/f8621/mtm_disposition.ts";

const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const page3 = "topmostSubform[0].Page3[0].";
const page4 = "topmostSubform[0].Page4[0].";
const page4Field = (index: number): string => {
  const row = Math.floor(index / 6);
  const table = row < 4
    ? "Table_17-20[0]"
    : row < 8
    ? "Table_Lines21-24[0]"
    : "Table_Lines25-26[0]";
  const tableRow = row < 4 ? row + 2 : row < 8 ? row - 2 : row - 6;
  return `${page4}${table}.Row${tableRow}[0].f4_${index + 1}[0]`;
};

const text = (name: string): PdfFieldEntry => ({
  kind: "text",
  domainKey: name,
  pdfField: name,
});
const checkbox = (name: string): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey: name,
  pdfField: name,
});

const fields: readonly PdfFieldEntry[] = [
  ...[
    "NameAddress[0].f1_1[0]",
    "NameAddress[0].f1_2[0]",
    "NameAddress[0].f1_3[0]",
    "NameAddress[0].f1_4[0]",
    "NameAddress[0].f1_5[0]",
    "NameAddress[0].f1_6[0]",
    "NameAddress[0].f1_7[0]",
    "NameAddress[0].ShareholderTaxYear[0].f1_9[0]",
    "f1_8[0]",
    "NameAddress2[0].f1_14[0]",
    "NameAddress2[0].f1_15[0]",
    "f1_16[0]",
    "f1_17[0]",
    "TaxYearOfPFIC[0].f1_18[0]",
    "TaxYearOfPFIC[0].f1_19[0]",
    "TaxYearOfPFIC[0].f1_20[0]",
    "TaxYearOfPFIC[0].f1_21[0]",
    "TaxYearOfPFIC[0].f1_22[0]",
    "f1_23[0]",
    "f1_24[0]",
    "f1_25[0]",
    "f1_26[0]",
    "f1_27[0]",
    "f1_28[0]",
    "f1_29[0]",
  ].map((name) => text(`${page1}${name}`)),
  ...[
    "c1_1[0]",
    "c1_4[0]",
    ...Array.from({ length: 4 }, (_, index) => `c1_5[${index}]`),
    ...Array.from({ length: 6 }, (_, index) => `c1_${index + 6}[0]`),
  ].map((name) => checkbox(`${page1}${name}`)),
  ...Array.from(
    { length: 25 },
    (_, index) => text(`${page2}f2_${index + 1}[0]`),
  ),
  ...Array.from(
    { length: 13 },
    (_, index) => text(`${page3}f3_${index + 1}[0]`),
  ),
  ...Array.from({ length: 60 }, (_, index) => text(page4Field(index))),
];

const partVFields = Array.from(
  { length: 13 },
  (_, index) => text(`${page3}f3_${index + 1}[0]`),
);
const continuationDescriptor: PdfFormDescriptor = {
  pendingKey: "form8621",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8621--2025.pdf",
  fields: partVFields,
  pageIndices: () => [2],
};
const partVIFields = Array.from(
  { length: 60 },
  (_, index) => text(page4Field(index)),
);
const partVIContinuationDescriptor: PdfFormDescriptor = {
  pendingKey: "form8621",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8621--2025.pdf",
  fields: partVIFields,
  pageIndices: () => [3],
};

function lineFrom(fields: Record<string, unknown>): Form8621Lines {
  const line = fields._form8621_line as Form8621Lines | undefined;
  if (!line || !line.item || !Array.isArray(line.excessEvents)) {
    throw new Error("Form 8621 PDF instance needs its calculated holding");
  }
  return line;
}

export const form8621Pdf: PdfFormDescriptor = {
  pendingKey: "form8621",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8621--2025.pdf",
  fields,
  pageIndices(fields) {
    const line = lineFrom(fields);
    if (line.item.regime === PficRegime.EXCESS_DISTRIBUTION) {
      return line.excessEvents.some((event) => event.amount_usd > 0)
        ? [0, 2]
        : [0];
    }
    return line.item.parent_source?.section1294_prior_status
      ? [0, 1, 3]
      : [0, 1];
  },
  instances(_fields, filer, allPending) {
    if (!allPending?.form8621) return [];
    if (!filer) throw new Error("Form 8621 PDF needs filer identity");
    const packet = projectForm8621Packet(allPending, filer);
    return packet.forms.map((form, index) => {
      const line = packet.lines[index];
      return {
        ...form.page1,
        ...form.page2,
        ...(form.partV[0] ?? {}),
        ...(form.partVI[0] ?? {}),
        _form8621_partv_continuations: form.partV.slice(1),
        _form8621_partvi_continuations: form.partVI.slice(1),
        _form8621_line: line,
      };
    });
  },
  async appendSupplementalPages(
    document,
    fields,
    filer,
    _all,
    _prepared,
    cacheDir,
  ) {
    const continuations = fields._form8621_partv_continuations;
    if (!Array.isArray(continuations)) {
      throw new Error("Form 8621 Part V continuation source is missing");
    }
    const { fillFormPdf } = await import("../../../builder.ts");
    for (const continuation of continuations) {
      const bytes = await fillFormPdf(
        continuationDescriptor,
        continuation,
        filer,
        cacheDir ?? ".pdf-cache",
      );
      if (!bytes) throw new Error("Form 8621 Part V continuation is blank");
      const filled = await PDFDocument.load(bytes, { updateMetadata: false });
      const [page] = await document.copyPages(filled, [2]);
      document.addPage(page);
    }
    const partVI = fields._form8621_partvi_continuations;
    if (!Array.isArray(partVI)) {
      throw new Error("Form 8621 Part VI continuation source is missing");
    }
    for (const continuation of partVI) {
      const bytes = await fillFormPdf(
        partVIContinuationDescriptor,
        continuation,
        filer,
        cacheDir ?? ".pdf-cache",
      );
      if (!bytes) throw new Error("Form 8621 Part VI continuation is blank");
      const filled = await PDFDocument.load(bytes, { updateMetadata: false });
      const [page] = await document.copyPages(filled, [3]);
      document.addPage(page);
    }
    const line = lineFrom(fields);
    const sales = line.item.mtm_dispositions ?? [];
    if (sales.length > 1) {
      const font = await document.embedFont(StandardFonts.Helvetica);
      const bold = await document.embedFont(StandardFonts.HelveticaBold);
      const name = filer?.fullName ?? filer?.nameLine1;
      const ssn = filer?.primarySSN?.replaceAll("-", "");
      if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
        throw new Error("Form 8621 MTM statement needs filer identity");
      }
      const title =
        `Form 8621 Part IV - multiple dispositions - ${line.item.company_name}`;
      const identity =
        `${name} | SSN ${ssn} | 2025 | ${line.item.company_ein_or_ref}`;
      if (
        bold.widthOfTextAtSize(`${title} (continued)`, 9) > 528 ||
        font.widthOfTextAtSize(identity, 9) > 528
      ) {
        throw new Error("Form 8621 MTM statement heading is too long");
      }
      let page = document.addPage([612, 792]);
      let y = 748;
      const heading = (continued: boolean) => {
        page.drawText(continued ? `${title} (continued)` : title, {
          x: 42,
          y,
          size: 9,
          font: bold,
        });
        y -= 23;
        page.drawText(identity, { x: 42, y, size: 9, font });
        y -= 29;
      };
      heading(false);
      const draw = (value: string, heading = false) => {
        const face = heading ? bold : font;
        if (face.widthOfTextAtSize(value, 9) > 528) {
          throw new Error("Form 8621 MTM statement has an overlong source row");
        }
        if (y < 55) {
          page = document.addPage([612, 792]);
          y = 748;
          headingPage();
        }
        page.drawText(value, { x: 42, y, size: 9, font: face });
        y -= heading ? 23 : 17;
      };
      const headingPage = () => heading(true);
      for (const sale of sales) {
        const result = calculateMtmDisposition(sale);
        draw(
          `${sale.transaction_id} | ${sale.disposition_date} | ${sale.shares_disposed} shares`,
          true,
        );
        draw(
          `13a FMV ${sale.fair_market_value_usd} | 13b basis ${sale.adjusted_basis_usd} | 13c gain/(loss) ${result.difference}`,
        );
        draw(
          `14a unreversed inclusions ${sale.unreversed_inclusions_usd} | 14b ordinary loss ${
            Math.min(0, result.ordinary)
          } | 14c other loss ${result.otherLoss}`,
        );
        draw(`Sources: ${sale.broker_record_id} / ${sale.basis_record_id}`);
        y -= 10;
      }
    }
    await appendForm8621ExcessStatement(document, [lineFrom(fields)], filer);
  },
};
