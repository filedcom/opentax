import { type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  inputSchema,
  type SectionAItem,
  type SectionBItem,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  assertShortTermReductionSource,
  fmvReductionExplanation,
  needsFmvReductionStatement,
  sectionAFmvMethodDescription,
} from "../../mef/forms/f8283.ts";
import {
  assertElectedSectionAReconciled,
  assertElectedSectionBReconciled,
  assertOrdinarySectionAReconciled,
} from "../../mef/forms/f8283_election.ts";
import {
  carriedSectionAItem,
  reconcileForm8283Carryover,
} from "../../mef/forms/f8283_carryover.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Verified against the December 2025 IRS AcroForm, not the older f8283.pdf.
const page = "Form8283[0].Page1[0]";
const page2 = "Form8283[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});

const fields: PdfFieldEntry[] = [
  text("filer_name", "f1_1[0]"),
  text("filer_ssn", "f1_2[0]"),
  {
    kind: "checkbox",
    domainKey: "section_b_other_real_estate",
    pdfField: `${page}.Lines2d-h[0].c1_6[0]`,
  },
  text("section_b_description", "Table_Line3_ColsA-C[0].Row3A[0].f1_42[0]"),
  text("section_b_condition", "Table_Line3_ColsA-C[0].Row3A[0].f1_43[0]"),
  text("section_b_appraised_fmv", "Table_Line3_ColsA-C[0].Row3A[0].f1_44[0]"),
  ...[
    "acquired_date",
    "how_acquired",
    "basis",
    "bargain_sale_received",
    "conservation_basis",
    "claim",
  ].map((key, offset): PdfFieldEntry => ({
    kind: "text",
    domainKey: `section_b_${key}`,
    pdfField: `${page}.Table_Line3_ColsD-I[0].Row3A[0].f1_${51 + offset}[0]`,
  })),
  {
    kind: "text",
    domainKey: "page2_filer_name",
    pdfField: `${page2}.f2_1[0]`,
  },
  {
    kind: "text",
    domainKey: "page2_filer_ssn",
    pdfField: `${page2}.f2_2[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_unrelated_use_yes",
    pdfField: `${page2}.c2_4[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_unrelated_use_no",
    pdfField: `${page2}.c2_4[1]`,
  },
  ...([
    ["appraiser_signed_date", "f2_14[0]"],
    ["appraiser_name", "f2_15[0]"],
    ["appraiser_id", "f2_16[0]"],
    ["appraiser_address", "f2_17[0]"],
    ["donee_received_date", "f2_18[0]"],
    ["donee_name", "f2_19[0]"],
    ["donee_ein", "f2_20[0]"],
    ["donee_street", "f2_21[0]"],
    ["donee_city_state_zip", "f2_22[0]"],
  ] as const).map(([key, field]) => ({
    kind: "text" as const,
    domainKey: `section_b_${key}`,
    pdfField: `${page2}.${field}`,
  })),
];

for (let row = 0; row < 4; row++) {
  const letter = "ABCD"[row];
  const first = 5 + row * 3;
  const second = 17 + row * 6;
  const colABC = `${page}.Table_Line1_ColsA-C[0].Row1${letter}[0]`;
  const colB = `${colABC}.ColB[0]`;
  const colDI = `${page}.Table_Line1_ColsD-I[0].Row1${letter}[0]`;
  fields.push(
    text(
      `row${row + 1}_donee`,
      `Table_Line1_ColsA-C[0].Row1${letter}[0].f1_${first}[0]`,
    ),
    {
      kind: "checkbox",
      domainKey: `row${row + 1}_vehicle`,
      pdfField: `${colB}.c1_${row + 2}[0]`,
    },
    {
      kind: "text",
      domainKey: `row${row + 1}_vin`,
      pdfField: `${colB}.f1_${first + 1}[0]`,
    },
    {
      kind: "text",
      domainKey: `row${row + 1}_description`,
      pdfField: `${colABC}.f1_${first + 2}[0]`,
    },
    ...[
      "contribution_date",
      "acquired_date",
      "how_acquired",
      "basis",
      "claim",
      "fmv_method",
    ].map((key, offset): PdfFieldEntry => ({
      kind: "text",
      domainKey: `row${row + 1}_${key}`,
      pdfField: `${colDI}.f1_${second + offset}[0]`,
    })),
  );
}

function identity(filer: FilerIdentity | undefined): {
  filer_name: string;
  filer_ssn: string;
} {
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 8283 PDF needs filer name and SSN");
  }
  const ssn = filer.primarySSN.replace(/\D/g, "");
  if (!/^\d{9}$/.test(ssn)) {
    throw new Error("Form 8283 PDF needs a nine-digit filer SSN");
  }
  return { filer_name: filer.nameLine1, filer_ssn: ssn };
}

function printedDate(
  value: string | undefined,
  monthOnly = false,
): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Form 8283 PDF needs a valid ISO calendar date");
  }
  const [year, month, day] = value.split("-");
  return monthOnly ? `${month}/${year}` : `${month}/${day}/${year}`;
}

function doneeLine(item: {
  donee_organization_name?: string;
  donee_organization_us_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
}): string {
  const address = item.donee_organization_us_address;
  if (!address) throw new Error("Form 8283 PDF needs a donee address");
  return [
    item.donee_organization_name,
    `${
      [address.line1, address.line2].filter(Boolean).join(" ")
    }, ${address.city}, ${address.state} ${address.zip}`,
  ].join("\n");
}

function assertUnreducedSectionACompanion(item: SectionAItem): void {
  const address = item.donee_organization_us_address;
  const acquired = printedDate(item.date_acquired);
  const contributed = printedDate(item.date_contributed);
  if (
    item.is_vehicle === true ||
    item.short_term_ordinary_income_reduction_confirmed === true ||
    item.capital_gain_reduction_election_confirmed === true ||
    item.is_capital_gain_property !== false ||
    item.charitable_limit_category !== "noncash_50" ||
    !item.property_description?.trim() ||
    !item.donee_organization_name?.trim() ||
    !address?.line1.trim() || !address.city.trim() ||
    !address.state.trim() || !address.zip.trim() ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    !acquired || !contributed ||
    !item.date_contributed?.startsWith("2025-") ||
    (item.date_acquired ?? "") > (item.date_contributed ?? "") ||
    item.fmv === undefined || item.fmv <= 0 || item.fmv > 5_000 ||
    item.deduction_claimed !== item.fmv ||
    item.cost_or_adjusted_basis === undefined ||
    item.cost_or_adjusted_basis < item.fmv ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) {
    throw new Error(
      "Form 8283 PDF unreduced companion needs a complete purchased noncapital Section A gift claimed at FMV",
    );
  }
}

function street(address: {
  line1: string;
  line2?: string;
}): string {
  return [address.line1, address.line2].filter(Boolean).join(" ");
}

function cityStateZip(address: {
  city: string;
  state: string;
  zip: string;
}): string {
  return `${address.city}, ${address.state} ${address.zip}`;
}

function sectionBInstance(
  item: SectionBItem,
  filer: FilerIdentity | undefined,
): Record<string, unknown> {
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  if (
    item.property_type !== SectionBPropertyType.OtherRealEstate ||
    item.capital_gain_reduction_election_confirmed !== true ||
    !item.property_description?.trim() || !item.physical_condition?.trim() ||
    !item.date_acquired || !item.date_contributed ||
    !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined || !appraisal || !donee ||
    !appraisal.signature_attachment_file_name ||
    !donee.signature_attachment_file_name ||
    !item.reduction_statement_attachment_file_name ||
    donee.received_date !== item.date_contributed
  ) {
    throw new Error(
      "Form 8283 Section B PDF needs one complete investment-land election source with named signature PDFs",
    );
  }
  const person = identity(filer);
  const reduction = item.fmv - item.deduction_claimed;
  return {
    ...person,
    page2_filer_name: person.filer_name,
    page2_filer_ssn: person.filer_ssn,
    section_b_other_real_estate: true,
    section_b_description: item.property_description,
    section_b_condition: item.physical_condition,
    section_b_appraised_fmv: item.fmv,
    section_b_acquired_date: printedDate(item.date_acquired, true),
    section_b_how_acquired: item.donor_acquisition_description,
    section_b_basis: item.cost_or_adjusted_basis,
    section_b_claim: item.deduction_claimed,
    section_b_appraiser_signed_date: printedDate(appraisal.signed_date),
    section_b_appraiser_name:
      `${appraisal.appraiser_first_name} ${appraisal.appraiser_last_name}`,
    section_b_appraiser_id: appraisal.appraiser_ein ?? appraisal.appraiser_ssn,
    section_b_appraiser_address: [
      street(appraisal.us_address),
      cityStateZip(appraisal.us_address),
    ].join("; "),
    section_b_donee_received_date: printedDate(donee.received_date),
    section_b_unrelated_use_yes: donee.unrelated_use,
    section_b_unrelated_use_no: !donee.unrelated_use,
    section_b_donee_name: donee.organization_name,
    section_b_donee_ein: donee.ein,
    section_b_donee_street: street(donee.us_address),
    section_b_donee_city_state_zip: cityStateZip(donee.us_address),
    reduction_statements: [
      `Section B item A: unimproved investment land appraised at FMV $${
        item.fmv.toFixed(2)
      }. The confirmed 50% limit election removes long-term appreciation $${
        reduction.toFixed(2)
      }, leaving adjusted basis and claimed contribution $${
        item.deduction_claimed.toFixed(2)
      }. Source names the separate reduction statement ${item.reduction_statement_attachment_file_name} and signature PDFs ${appraisal.signature_attachment_file_name} and ${donee.signature_attachment_file_name}. A separately reviewed completed signed Form 8283 PDF is still required for MeF filing. This generated PDF does not reproduce signatures and is not a signed paper Form 8283.`,
    ],
  };
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  value: string,
  y: number,
): number {
  const maxWidth = 516;
  let line = "";
  for (const word of value.split(/\s+/)) {
    if (font.widthOfTextAtSize(word, 10) > maxWidth) {
      if (line) {
        page.drawText(line, { x: 48, y, size: 10, font });
        y -= 15;
        line = "";
      }
      let remaining = word;
      while (remaining) {
        let count = remaining.length;
        while (
          count > 1 &&
          font.widthOfTextAtSize(remaining.slice(0, count), 10) > maxWidth
        ) count--;
        const part = remaining.slice(0, count);
        remaining = remaining.slice(count);
        if (remaining) {
          page.drawText(part, { x: 48, y, size: 10, font });
          y -= 15;
        } else line = part;
      }
    } else {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 10) > maxWidth && line) {
        page.drawText(line, { x: 48, y, size: 10, font });
        y -= 15;
        line = word;
      } else line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x: 48, y, size: 10, font });
    y -= 15;
  }
  return y;
}

export const form8283Pdf: PdfFormDescriptor = {
  pendingKey: "f8283",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
  fields,
  pageIndices: (instance) =>
    instance.section_b_other_real_estate === true ? [0, 1] : [0],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    if (Array.isArray(raw.section_a_items) && raw.section_a_items.length > 4) {
      throw new Error(
        "Form 8283 PDF supports only four current Section A items; continuation pages remain unsupported",
      );
    }
    const source = inputSchema.parse(raw);
    if (source.carryover_evidence !== undefined) {
      const reconciled = reconcileForm8283Carryover(
        source,
        { pending: allPending, filer },
      );
      return reconciled.map(({ evidence }) => {
        const item = carriedSectionAItem(evidence);
        return {
          ...identity(filer),
          row1_donee: doneeLine(item),
          row1_vehicle: false,
          row1_description: item.property_description,
          row1_contribution_date: printedDate(item.date_contributed),
          row1_acquired_date: printedDate(item.date_acquired, true),
          row1_how_acquired: item.donor_acquisition_description,
          row1_basis: item.cost_or_adjusted_basis,
          row1_claim: item.deduction_claimed,
          row1_fmv_method: sectionAFmvMethodDescription(item),
          reduction_statements: needsFmvReductionStatement(item)
            ? [fmvReductionExplanation(item, 0)]
            : [],
        };
      });
    }
    const sectionA = source.section_a_items ?? [];
    const sectionB = source.section_b_items ?? [];
    if (sectionB.length > 0) {
      if (sectionA.length > 0 || sectionB.length !== 1) {
        throw new Error(
          "Form 8283 PDF Section B supports one standalone item without Section A",
        );
      }
      assertElectedSectionBReconciled({ pending: allPending });
      if (
        JSON.stringify(source) !==
          JSON.stringify(inputSchema.parse(allPending?.f8283))
      ) {
        throw new Error("Form 8283 PDF source differs from the pending return");
      }
      return [sectionBInstance(sectionB[0], filer)];
    }
    if (sectionA.length === 0) return [];
    if (sectionA.some((item) => item.is_vehicle === true)) {
      throw new Error(
        "Form 8283 PDF vehicle acknowledgment route is not yet mapped",
      );
    }
    const elected = sectionA.some((item) =>
      item.capital_gain_reduction_election_confirmed === true
    );
    const shortTermReduction = sectionA.some((item) =>
      item.short_term_ordinary_income_reduction_confirmed === true &&
      needsFmvReductionStatement(item)
    );
    if (
      !elected &&
      !shortTermReduction && sectionA.length !== 1
    ) {
      throw new Error(
        "Form 8283 PDF needs a reconciled Section A election, sourced short-term reduction, or one ordinary gift",
      );
    }
    if (elected) assertElectedSectionAReconciled({ pending: allPending });
    if (!elected && !shortTermReduction) {
      assertUnreducedSectionACompanion(sectionA[0]);
      assertOrdinarySectionAReconciled({ pending: allPending });
    }
    for (const item of sectionA) {
      if (!elected && !needsFmvReductionStatement(item)) {
        assertUnreducedSectionACompanion(item);
      } else {
        assertShortTermReductionSource(item);
      }
    }
    if (
      JSON.stringify(source) !==
        JSON.stringify(inputSchema.parse(allPending?.f8283))
    ) {
      throw new Error("Form 8283 PDF source differs from the pending return");
    }
    const instance: Record<string, unknown> = {
      ...identity(filer),
      reduction_statements: sectionA.flatMap((item, index) =>
        needsFmvReductionStatement(item)
          ? [fmvReductionExplanation(item, index)]
          : []
      ),
    };
    sectionA.forEach((item, index) => {
      const prefix = `row${index + 1}_`;
      instance[`${prefix}donee`] = doneeLine(item);
      instance[`${prefix}vehicle`] = false;
      instance[`${prefix}description`] = item.property_description;
      instance[`${prefix}contribution_date`] = printedDate(
        item.date_contributed,
      );
      instance[`${prefix}acquired_date`] = printedDate(
        item.date_acquired,
        true,
      );
      instance[`${prefix}how_acquired`] = item.donor_acquisition_description;
      instance[`${prefix}basis`] = item.cost_or_adjusted_basis;
      instance[`${prefix}claim`] = item.deduction_claimed ?? item.fmv;
      instance[`${prefix}fmv_method`] = sectionAFmvMethodDescription(item);
    });
    return [instance];
  },
  async appendSupplementalPages(document, instance) {
    const statements = instance.reduction_statements as string[] | undefined;
    if (!statements?.length) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const page = document.addPage([612, 792]);
    page.drawText(
      instance.section_b_other_real_estate === true
        ? "Form 8283 Section B - Election and attachment record"
        : "Form 8283 Section A - Fair market value reductions",
      {
        x: 48,
        y: 742,
        size: 14,
        font: bold,
        color: rgb(0, 0, 0),
      },
    );
    page.drawText(`${instance.filer_name}    SSN: ${instance.filer_ssn}`, {
      x: 48,
      y: 718,
      size: 10,
      font,
    });
    let y = 685;
    for (const statement of statements) {
      y = drawWrappedText(page, font, statement, y) - 20;
      if (y < 48) {
        throw new Error(
          "Form 8283 PDF reduction explanations exceed one supplemental page",
        );
      }
    }
  },
};
