import { PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { issuedRpeStatementBytes } from "../../../../../nodes/inputs/deductions/business/k1_rpe_aggregation_source.ts";
import {
  calculateTwoBusinessAggregationLines,
  type Form8995AInput,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

export const AGGREGATION_DISCLOSURE_FILE =
  "Form8995AAggregationAnnualDisclosure.pdf";
export const AGGREGATION_DISCLOSURE_DESCRIPTION =
  "Form 8995-A annual aggregation disclosure";

export function aggregationChangeDescription(
  input: Form8995AInput,
): string | undefined {
  const { source } = calculateTwoBusinessAggregationLines(input);
  const events = source.annual_disclosure.businesses.flatMap((b) =>
    b.events.map((e) =>
      `${
        input.rpe_aggregation_source
          ? source.members.find((m) =>
            m.business_reference === b.business_reference
          )!.business_name
          : b.entity_name
      } ${e.event.replaceAll("_", " ")} ${e.date}`
    )
  );
  if (!events.length) return undefined;
  const description = events.join("; ");
  return description.length <= 160
    ? description
    : "Current-year business changes are detailed in the attached annual aggregation disclosure.";
}

export async function appendAggregationAnnualDisclosure(
  document: PDFDocument,
  input: Form8995AInput,
  filer?: FilerIdentity,
  includeIssuedCopy = true,
): Promise<void> {
  const { source, schedule } = calculateTwoBusinessAggregationLines(input);
  if (
    !filer || filer.primarySSN.replaceAll("-", "") !== source.common_owner_ssn
  ) {
    throw new Error(
      "Form 8995-A annual aggregation disclosure needs matching filer ownership",
    );
  }
  const disclosure = source.annual_disclosure;
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]);
  let y = 712;
  let pageNumber = 0;
  const header = () => {
    pageNumber++;
    page.drawText("Form 8995-A - Annual aggregation disclosure", {
      x: 40,
      y: 752,
      size: 12,
      font: bold,
    });
    page.drawText(
      `${
        filer.nameLine1 ?? filer.fullName ?? ""
      }   TIN ${source.common_owner_ssn}   TY2025   Page ${pageNumber}`,
      { x: 40, y: 734, size: 9, font },
    );
    y = 712;
  };
  header();
  const write = (text: string) => {
    const words = text.split(/\s+/);
    let line = "";
    const flush = () => {
      if (y < 55) {
        page = document.addPage([612, 792]);
        header();
      }
      page.drawText(line, { x: 40, y, size: 9, font });
      y -= 13;
      line = "";
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, 9) > 530 && line) flush();
      line = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(line, 9) > 530) {
        throw new Error(
          "Aggregation disclosure source token does not fit the statement page",
        );
      }
    }
    if (line) flush();
    y -= 4;
  };
  write(`Aggregation 1: ${source.group_name}. ${source.group_description}`);
  write(
    input.rpe_aggregation_source
      ? `RPE election: ${source.election_history.status}; issuer ${input.rpe_aggregation_source.issuer_name}, EIN ${input.rpe_aggregation_source.issuer_ein}. Calendar tax-year end: ${source.tax_year_end}. RPE timely original-return election and no Commissioner disaggregation reviewed; taxpayer preserves this intact issued aggregation.`
      : `Election: ${source.election_history.status}. Calendar tax-year end: ${source.tax_year_end}. Timely original-return election and no Commissioner disaggregation reviewed.`,
  );
  write(
    `Annual review: ${disclosure.disclosure_source_reference}; ${disclosure.reviewed_by}; ${disclosure.review_date}. Complete current-year business event inventory reviewed. ${
      input.rpe_aggregation_source
        ? `RPE aggregation: ${source.group_name}; issued K-1 ${input.rpe_aggregation_source.issued_k1_reference}, section199A statement ${input.rpe_aggregation_source.issued_section199a_statement_reference}. Actual issued disclosure ${input.rpe_aggregation_source.issued_statement_pdf.file_name} is retained and attached.`
        : "RPE aggregations: none."
    }`,
  );
  for (const factor of source.operational_factors) {
    write(
      `Operational factor ${factor.factor}: ${factor.explanation}. Source: ${factor.source_reference}.`,
    );
  }
  for (const [index, member] of source.members.entries()) {
    const business = disclosure.businesses.find((b) =>
      b.business_reference === member.business_reference
    )!;
    const row = schedule.rows[index];
    write(
      `${
        input.rpe_aggregation_source ? member.business_name + ": " : ""
      }${business.entity_name}, EIN ${business.entity_ein}: ${business.business_description}. Business reference: ${business.business_reference}.`,
    );
    write(
      input.rpe_aggregation_source
        ? `RPE directly operates this business from ${member.ownership_start_date} through December 31, 2025; ownership record ${member.ownership_source_reference}. Shareholder ${source.common_owner_ssn}, share 100%, owned issuer shares from ${input.rpe_aggregation_source.recipient_ownership_start_date}; shareholder record ${input.rpe_aggregation_source.recipient_ownership_source_reference}.`
        : `Direct owner ${source.common_owner_ssn}, share 100%, owned from ${member.ownership_start_date} through December 31, 2025. Ownership record: ${member.ownership_source_reference}.`,
    );
    if (!business.events.length) {
      write(
        "Current-year formation, acquisition, disposition or cessation events: none (reviewed complete inventory).",
      );
    }
    for (const event of business.events) {
      write(
        `Current-year event: ${
          event.event.replaceAll("_", " ")
        } on ${event.date}; record ${event.source_reference}.`,
      );
    }
    write(
      `QBI ${row.qbi}; W-2 wages ${row.w2Wages}; UBIA ${row.ubia}. Attributable half-SE ${member.qbi_adjustments.deductible_se_tax}; health ${member.qbi_adjustments.self_employed_health_insurance}; retirement ${member.qbi_adjustments.qualified_retirement_plan}. Allocation: ${member.qbi_adjustments.allocation_method_description}; record ${member.qbi_adjustments.allocation_worksheet_reference}.`,
    );
  }
  write(
    `Aggregation totals: QBI ${schedule.totalQbi}; W-2 wages ${schedule.totalW2Wages}; UBIA ${schedule.totalUbia}.`,
  );
  if (input.rpe_aggregation_source && includeIssuedCopy) {
    const issued = await PDFDocument.load(
      await checkedIssuedRpeStatementBytes(input),
    );
    if (
      issued.getPageCount() === 0 || issued.getForm().getFields().length !== 0
    ) {
      throw Error(
        "RPE aggregation disclosure needs a printable finalized issued PDF copy",
      );
    }
    const copies = await document.copyPages(issued, issued.getPageIndices());
    copies.forEach((copy) => document.addPage(copy));
  }
}

export async function checkedIssuedRpeStatementBytes(
  input: Form8995AInput,
): Promise<Uint8Array> {
  if (!input.rpe_aggregation_source) {
    throw Error("Issued RPE statement source required");
  }
  const bytes = issuedRpeStatementBytes(input.rpe_aggregation_source);
  const document = await PDFDocument.load(bytes);
  const widgets = document.getPages().some((page) =>
    page.node.Annots()?.asArray().some((ref) =>
      document.context.lookup(ref, PDFDict).get(PDFName.of("Subtype"))
        ?.toString() === "/Widget"
    )
  );
  if (
    document.getPageCount() === 0 ||
    document.getForm().getFields().length !== 0 || widgets
  ) {
    throw Error(
      "RPE aggregation disclosure needs a printable finalized issued PDF copy",
    );
  }
  return bytes;
}

export async function aggregationAnnualDisclosureBytes(
  input: Form8995AInput,
  filer?: FilerIdentity,
): Promise<Uint8Array> {
  const document = await PDFDocument.create({ updateMetadata: false });
  await appendAggregationAnnualDisclosure(document, input, filer, false);
  return document.save();
}
