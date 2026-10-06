import { PDFDocument, StandardFonts } from "pdf-lib";

/** Coherent test documents. Typed simulated signatures do not authenticate an
 * outside taxpayer's appraisal, donee acknowledgment or signed IRS form. */
export interface GiftDocumentFacts {
  property: string;
  propertyType: string;
  fmv: number;
  basis: number;
  claim?: number;
  donorName: string;
  donorSsn: string;
  filerName?: string;
  filerSsn?: string;
  howAcquired?: string;
  doneeName: string;
  doneeEin: string;
  doneeAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  acquired: string;
  contributed: string;
}
function stableMetadata(pdf: PDFDocument) {
  pdf.setCreationDate(new Date("2025-09-01T00:00:00Z"));
  pdf.setModificationDate(new Date("2025-09-01T00:00:00Z"));
  pdf.setProducer("OpenTax source-contract test fixture");
}
export async function giftSourceRecord(
  title: string,
  facts: GiftDocumentFacts,
  details: readonly string[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  stableMetadata(pdf);
  let page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const wrap = (text: string, size: number) => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > 532) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  let y = 746;
  for (const line of wrap(title, 16)) {
    page.drawText(line, { x: 40, y, size: 16, font });
    y -= 20;
  }
  y -= 15;
  const paragraphs = [
    "TEST SOURCE DOCUMENT - simulated facts/signatures; not external authentication",
    `Property: ${facts.property}`,
    `Owner: ${facts.donorName}, SSN ${facts.donorSsn}`,
    `Donee: ${facts.doneeName}, EIN ${facts.doneeEin}`,
    facts.doneeAddress
      ? `Donee address: ${facts.doneeAddress.line1}, ${facts.doneeAddress.city}, ${facts.doneeAddress.state} ${facts.doneeAddress.zip}`
      : "Donee address: 1 Main St, Austin, TX 78701",
    `Acquired: ${facts.acquired}; contributed/received: ${facts.contributed}`,
    `Original FMV: $${facts.fmv}; adjusted basis: $${facts.basis}; claimed deduction: $${
      facts.claim ?? facts.basis
    }`,
    ...details,
    ...(/qualified.*appraisal/i.test(title)
      ? [
        `Physical condition: good used condition; identified ${facts.propertyType} property inspected before the contribution.`,
        "Report date2025-05-28; purpose is substantiation of the noncash charitable contribution, not computation of the AGI limitation.",
        "Full owned interest transferred outright with no use/disposition restrictions, retained rights, consideration or goods/services.",
        "Jane Smith, EIN123456789,1 Main St,Austin,TX78701, is the independent regular paid appraiser signing this test report.",
        "Simulated qualification record APPRAISER-2025: recognized personal-property appraisal designation, valuation coursework and20 years of relevant experience.",
        "The appraiser is unrelated to donor/donee and the acquisition transaction; the fee is a fixed$600 and is not tied to FMV or the deduction.",
        `Comparable-sale test records COMP-A,COMP-B,COMP-C dated2025-05-01/10/20 show matched condition/category prices$${
          (facts.fmv * .95).toFixed(2)
        },$${facts.fmv.toFixed(2)},$${(facts.fmv * 1.05).toFixed(2)}.`,
        `Equal-size/category comparable indications bracket$${facts.fmv}; the central matched-sale indication is the appraised FMV on${facts.contributed}.`,
        "Comparable records and qualification/signature statements are simulated fixture evidence; no outside issuer or appraiser authentication is claimed.",
      ]
      : []),
  ];
  for (const paragraph of paragraphs) {
    for (const line of wrap(paragraph, 10)) {
      if (y < 50) {
        page = pdf.addPage([612, 792]);
        y = 746;
        page.drawText("TEST SOURCE DOCUMENT - continued simulated record", {
          x: 40,
          y,
          size: 10,
          font,
        });
        y -= 25;
      }
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 15;
    }
    y -= 7;
  }
  return pdf.save();
}

let template: Promise<Uint8Array> | undefined;
export async function completed8283Source(
  facts: GiftDocumentFacts,
  additionalRows: readonly GiftDocumentFacts[] = [],
): Promise<Uint8Array> {
  template ??= (async () => {
    const cached =
      ".pdf-cache/https_www_irs_gov_pub_irs_prior_f8283_2025_pdf.pdf";
    try {
      return await Deno.readFile(cached);
    } catch {
      const response = await fetch(
        "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
      );
      if (!response.ok) throw new Error(`IRS8283 template: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
  })();
  const pdf = await PDFDocument.load(await template);
  stableMetadata(pdf);
  const form = pdf.getForm();
  const p1 = "Form8283[0].Page1[0]", p2 = "Form8283[0].Page2[0]";
  const values: Record<string, string> = {
    [`${p1}.f1_1[0]`]: facts.filerName ?? facts.donorName,
    [`${p1}.f1_2[0]`]: facts.filerSsn ?? facts.donorSsn,
    [`${p2}.f2_1[0]`]: facts.filerName ?? facts.donorName,
    [`${p2}.f2_2[0]`]: facts.filerSsn ?? facts.donorSsn,
    [`${p1}.Table_Line3_ColsA-C[0].Row3A[0].f1_42[0]`]: facts.property,
    [`${p1}.Table_Line3_ColsA-C[0].Row3A[0].f1_43[0]`]: "Good used condition",
    [`${p1}.Table_Line3_ColsA-C[0].Row3A[0].f1_44[0]`]: String(facts.fmv),
    [`${p1}.Table_Line3_ColsD-I[0].Row3A[0].f1_51[0]`]: `${
      facts.acquired.slice(5, 7)
    }/${facts.acquired.slice(0, 4)}`,
    [`${p1}.Table_Line3_ColsD-I[0].Row3A[0].f1_52[0]`]: facts.howAcquired ??
      "Purchase",
    [`${p1}.Table_Line3_ColsD-I[0].Row3A[0].f1_53[0]`]: String(facts.basis),
    [`${p1}.Table_Line3_ColsD-I[0].Row3A[0].f1_54[0]`]: "0",
    [`${p1}.Table_Line3_ColsD-I[0].Row3A[0].f1_56[0]`]: String(
      facts.claim ?? facts.basis,
    ),
    [`${p2}.f2_13[0]`]: "Jane Smith",
    [`${p2}.f2_14[0]`]: "Qualified appraiser",
    [`${p2}.f2_15[0]`]: "1 Main St",
    [`${p2}.f2_16[0]`]: "123456789",
    [`${p2}.f2_17[0]`]: "Austin, TX 78701",
    [`${p2}.f2_18[0]`]: facts.contributed,
    [`${p2}.f2_19[0]`]: facts.doneeName,
    [`${p2}.f2_20[0]`]: facts.doneeEin,
    [`${p2}.f2_21[0]`]: facts.doneeAddress?.line1 ?? "1 Main St",
    [`${p2}.f2_22[0]`]: facts.doneeAddress
      ? `${facts.doneeAddress.city}, ${facts.doneeAddress.state} ${facts.doneeAddress.zip}`
      : "Austin, TX 78701",
    [`${p2}.f2_23[0]`]: "Director",
  };
  for (const [index, row] of additionalRows.entries()) {
    const letter = "BC"[index];
    if (!letter) {
      throw new Error("Official8283 supports three SectionB rows percopy");
    }
    [row.property, "Good used condition", String(row.fmv)].forEach(
      (value, offset) => {
        values[
          `${p1}.Table_Line3_ColsA-C[0].Line3${letter}[0].f1_${
            45 + 3 * index + offset
          }[0]`
        ] = value;
      },
    );
    [
      `${row.acquired.slice(5, 7)}/${row.acquired.slice(0, 4)}`,
      row.howAcquired ?? "Purchase",
      String(row.basis),
      "0",
      "",
      String(row.claim ?? row.basis),
    ].forEach((value, offset) => {
      values[
        `${p1}.Table_Line3_ColsD-I[0].Row3${letter}[0].f1_${
          57 + 6 * index + offset
        }[0]`
      ] = value;
    });
  }
  const lowValueRows = [facts, ...additionalRows].map((row, index) => ({
    row,
    index,
  }))
    .filter(({ row }) => row.fmv <= 500);
  values[`${p2}.f2_12[0]`] = lowValueRows.map(({ index }) =>
    `Property ${"ABC"[index]}`
  ).join("; ");
  for (const [key, value] of Object.entries(values)) {
    form.getTextField(key).setText(value);
  }
  const propertyBoxes: Record<string, string> = {
    art_under_20000: `${p1}.Lines2a-c[0].c1_6[2]`,
    art_at_least_20000: `${p1}.Lines2a-c[0].c1_6[0]`,
    equipment: `${p1}.Lines2d-h[0].c1_6[1]`,
    collectibles: `${p1}.Lines2d-h[0].c1_6[3]`,
    other: `${p1}.Lines2i-l[0].c1_6[3]`,
  };
  form.getCheckBox(propertyBoxes[facts.propertyType]).check();
  form.getCheckBox(`${p2}.c2_4[1]`).check();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  const page = pdf.getPages()[1];
  page.drawText("/s/ Jane Smith (simulated fixture)", {
    x: 155,
    y: 251,
    size: 9,
    font,
  });
  page.drawText("2025-05-28", { x: 500, y: 251, size: 9, font });
  if (lowValueRows.length) {
    page.drawText(`/s/ ${facts.donorName} (simulated fixture)`, {
      x: 155,
      y: 371,
      size: 9,
      font,
    });
    page.drawText("2025-05-28", { x: 500, y: 371, size: 9, font });
  }
  page.drawText(facts.contributed, { x: 470, y: 38, size: 9, font });
  page.drawText("/s/ Taylor Charity (simulated fixture)", {
    x: 40,
    y: 38,
    size: 9,
    font,
  });
  for (const p of pdf.getPages()) {
    p.drawText("TEST FIXTURE - not externally authenticated", {
      x: 40,
      y: 16,
      size: 8,
      font,
    });
  }
  const bytes = await pdf.save();
  const reopened = await PDFDocument.load(bytes);
  for (const [key, value] of Object.entries(values)) {
    if ((reopened.getForm().getTextField(key).getText() ?? "") !== value) {
      throw new Error(`8283 source field ${key}`);
    }
  }
  return bytes;
}
