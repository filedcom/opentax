import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema } from "../../../../nodes/inputs/f8283/index.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";
export async function dispositionDigest(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
let template: Promise<Uint8Array> | undefined;
async function completedDonee8282(source: Record<string, any>) {
  template ??= (async () => {
    const response = await fetch(
      "https://www.irs.gov/pub/irs-prior/f8282--2021.pdf",
    );
    if (!response.ok) throw new Error(`IRS8282 template ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  })();
  const pdf = await PDFDocument.load(await template);
  // The two official form pages are the donor copy; instructions remain in the original template.
  pdf.removePage(3);
  pdf.removePage(2);
  pdf.setCreationDate(new Date("2025-09-01T00:00:00Z"));
  pdf.setModificationDate(new Date("2025-09-01T00:00:00Z"));
  pdf.setProducer("OpenTax simulated donee-source contract fixture");
  const form = pdf.getForm(),
    p1 = "topmostSubform[0].Page1[0]",
    p2 = "topmostSubform[0].Page2[0]",
    a = `${p2}.Pg2Table1[0].RowA[0]`;
  const fields: Record<string, string> = {
    [`${p1}.f1_1[0]`]: source.donee_name,
    [`${p1}.f1_2[0]`]: source.donee_ein.slice(0, 2),
    [`${p1}.f1_3[0]`]: source.donee_ein.slice(2),
    [`${p1}.f1_4[0]`]: source.donee_us_address.line1,
    [`${p1}.f1_5[0]`]:
      `${source.donee_us_address.city}, ${source.donee_us_address.state} ${source.donee_us_address.zip}`,
    [`${p1}.f1_6[0]`]: source.original_donor_name,
    [`${p1}.f1_7[0]`]: source.original_donor_ssn,
    [`${p1}.f1_8[0]`]: "1 Example Way",
    [`${p1}.f1_9[0]`]: "Austin, TX 78701",
    [`${a}.ACol1[0].f2_1[0]`]: source.property_description,
    [`${a}.ACol1[0].f2_2[0]`]: source.actual_use_description[0],
    [`${a}.ACol1[0].f2_3[0]`]: source.actual_use_description[1],
    [`${p2}.Pg2Table2[0].Row8[0].f2_61[0]`]: String(source.gross_proceeds),
    [`${p2}.f2_66[0]`]: source.officer_title,
    [`${p2}.f2_67[0]`]: source.officer_name,
  };
  source.intended_use_and_no_certification_description.forEach((
    value: string,
    i: number,
  ) => fields[`${a}.ACol4[0].f2_${4 + i}[0]`] = value);
  for (
    const [row, first, date] of [[5, 25, source.received_date], [
      6,
      37,
      source.received_date,
    ], [7, 49, source.disposition_date]] as const
  ) {
    [date.slice(5, 7), date.slice(8, 10), date.slice(2, 4)].forEach((
      value,
      i,
    ) =>
      fields[`${p2}.Pg2Table2[0].Row${row}[0].ColA[0].f2_${first + i}[0]`] =
        value
    );
  }
  for (const [key, value] of Object.entries(fields)) {
    form.getTextField(key).setText(value);
  }
  form.getCheckBox(`${a}.c2_1[0]`).check();
  form.getCheckBox(`${a}.c2_2[1]`).check();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPage(0).drawText(
    "TEST DONOR COPY - simulated donee facts/signature, not external authentication",
    { x: 36, y: 40, size: 9, font },
  );
  pdf.getPage(1).drawText("/s/ Taylor Charity - simulated", {
    x: 95,
    y: 110,
    size: 8,
    font,
  });
  pdf.getPage(1).drawText(source.disposition_notice_furnished_date, {
    x: 468,
    y: 110,
    size: 8,
    font,
  });
  form.updateFieldAppearances(font);
  return pdf.save();
}
export async function reviewedContributionYearDisposition(
  count = 1,
  smallGrouped = false,
  jointOwners = false,
  sectionA = false,
) {
  const base = await reviewedGiftInventory(
    count,
    false,
    false,
    false,
    false,
    jointOwners,
  );
  const attachments: typeof base.attachments = [];
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < count; i++) {
    const row = structuredClone(base.items[i]) as Record<string, any>;
    const fmv = 9100 + i * 100, basis = (smallGrouped ? 2100 : 6100) + i * 100;
    const source = {
      purchase_record_reference: `Disposition purchase EQ-${i + 1}`,
      donee_disposition_record_reference: `City Charity ${
        i + 1
      } Form8282 donor copy EQ-${i + 1}`,
      exempt_use_certification_inventory_reference: `City Charity ${
        i + 1
      } certification inventory EQ-${i + 1}`,
      donee_name: row.donee_acknowledgment.organization_name,
      donee_ein: row.donee_acknowledgment.ein,
      donee_us_address: row.donee_acknowledgment.us_address,
      original_donor_name: row.donor_ownership_review.donor_name,
      original_donor_ssn: row.donor_ownership_review.donor_ssn,
      property_description: row.property_description,
      received_date: "2025-06-01",
      disposition_date: "2025-08-15",
      disposition_method: "sale",
      gross_proceeds: 4300 + i * 75,
      disposition_notice_furnished_date: "2025-09-01",
      officer_name: "Taylor Charity",
      officer_title: "Director",
      actual_use_description: [
        "Held for intended program; sold instead.",
        "No exempt use before sale.",
      ],
      intended_use_and_no_certification_description: [
        "Intended use: exempt music program.",
        "Voluntary fundraising sale instead.",
        "No use/impossibility certification.",
      ],
      original_donee_sale_and_donor_copy_reviewed: true,
      no_exempt_use_certification_present: true,
      no_signed_substantial_related_use_certification: true,
      no_signed_impossible_intended_use_certification: true,
      tangible_personal_property_verified: true,
      purchased_personal_use_not_depreciable_or_inventory: true,
      hypothetical_fmv_sale_gain_entirely_long_term_verified: true,
      donee_50_percent_limit_organization_verified: true,
      no_other_reduction_reason_verified: true,
    };
    const facts = {
      property: row.property_description,
      propertyType: "equipment",
      fmv,
      basis,
      donorName: source.original_donor_name,
      donorSsn: source.original_donor_ssn,
      filerName: jointOwners ? "ALEX AND SAM EXAMPLE" : "ALEX EXAMPLE",
      filerSsn: "111223333",
      doneeName: source.donee_name,
      doneeEin: source.donee_ein,
      acquired: "2010-01-15",
      contributed: "2025-06-01",
    };
    const records = [
      await giftSourceRecord("Purchased personal-use property basis", facts, [
        "Purchase2010, no depreciation or prior deduction; outright full owned interest.",
      ]),
      await completedDonee8282(source),
      await giftSourceRecord(
        "Donee certification and donor-copy inventory",
        facts,
        [
          `Original acknowledgment intended related use. Sold2025-08-15 for$${source.gross_proceeds}; donor copy furnished2025-09-01.`,
          "Taylor Charity,Director: no actual exempt use, no substantial-use certification and no impossibility certification; voluntary fundraising sale.",
          "Official Form8282 PartIV unsigned; ordinary report declaration signed separately. Simulated source inventory, no external authentication.",
        ],
      ),
      await completed8283Source(facts),
      await giftSourceRecord("Qualified appraisal", facts, [
        "Appraisal signed2025-05-28, effective2025-06-01; full identified property and comparable sales.",
      ]),
      await giftSourceRecord("FMV reduction computation", facts, [
        `Section170(e)(1)(B)(i)(II): FMV${fmv} minus appreciation${
          fmv - basis
        } equals basis claim${basis}.`,
        `Sale proceeds${source.gross_proceeds} do not cap a nonvehicle basis deduction. Original Form8283 No intended-unrelated-use answer retained.`,
      ]),
      await giftSourceRecord("Appraiser declaration signature", facts, [
        "/s/ Jane Smith2025-05-28 - simulated signature.",
      ]),
      await giftSourceRecord("Original donee acknowledgment", facts, [
        "/s/ Taylor Charity,Director2025-06-01 - simulated signature. Intended exempt program use at receipt; no goods/services. Original unrelated-use answer No. Subsequent disposition independently documented.",
      ]),
    ];
    const names = records.map((_, n) =>
      `Disposition-${i + 1}-Record-${n + 1}.pdf`
    );
    records.forEach((bytes, n) =>
      attachments.push({
        fileName: names[n],
        description: ([
          "Form 8283 Section B reduction source record: purchase",
          "Form 8283 Section B reduction source record: donee Form8282",
          "Form 8283 Section B reduction source record: certification inventory",
          "Form 8283 completed signed Section B",
          "Qualified Appraisal for Section B",
          "Form 8283 Section B reduction source record: computation",
          "Form 8283 appraiser signature document",
          "Form 8283 Donee signature document",
        ][n]) + `: lot${i + 1}`,
        bytes,
      })
    );
    row.date_acquired = facts.acquired;
    row.fmv = fmv;
    row.cost_or_adjusted_basis = basis;
    row.deduction_claimed = basis;
    row.is_capital_gain_property = true;
    row.ordinary_income_reduction = undefined;
    row.donor_ownership_review.ownership_record_reference =
      source.purchase_record_reference;
    row.signed_form_attachment_file_name = names[3];
    row.signed_form_source_review.pdf_sha256 = await dispositionDigest(
      records[3],
    );
    Object.assign(row.signed_form_source_review.reviewed_form_fields, {
      date_acquired: facts.acquired,
      fmv,
      cost_or_adjusted_basis: basis,
      deduction_claimed: basis,
    });
    row.qualified_appraisal.attachment_file_name = names[4];
    row.qualified_appraisal.full_appraisal_source_review.pdf_sha256 =
      await dispositionDigest(records[4]);
    row.qualified_appraisal.signature_attachment_file_name = names[6];
    row.donee_acknowledgment.signature_attachment_file_name = names[7];
    row.special_fmv_reduction = {
      reason: "contribution_year_disposition",
      source,
      source_documents: await Promise.all(
        [
          source.purchase_record_reference,
          source.donee_disposition_record_reference,
          source.exempt_use_certification_inventory_reference,
        ].map(async (reference, n) => ({
          source_reference: reference,
          attachment_file_name: names[n],
          pdf_sha256: await dispositionDigest(records[n]),
        })),
      ),
      source_documents_review: {
        reviewed_by: "Test reviewer",
        reviewed_on: "2025-09-01",
        property_owner_dates_basis_and_reason_match_confirmed: true,
      },
      reduction_statement_attachment_file_name: names[5],
      reduction_statement_sha256: await dispositionDigest(records[5]),
    };
    (source as Record<string, any>).retained_source_documents =
      row.special_fmv_reduction.source_documents;
    rows.push(row);
  }
  const parsed = inputSchema.parse(
    sectionA
      ? {
        section_a_items: rows.map((row) => ({
          donor_ownership_review: row.donor_ownership_review,
          property_description: row.property_description,
          date_acquired: row.date_acquired,
          date_contributed: row.date_contributed,
          donor_acquisition_description: row.donor_acquisition_description,
          fmv: row.fmv,
          deduction_claimed: row.deduction_claimed,
          cost_or_adjusted_basis: row.cost_or_adjusted_basis,
          charitable_limit_category: row.charitable_limit_category,
          is_capital_gain_property: row.is_capital_gain_property,
          donee_organization_name: row.donee_acknowledgment.organization_name,
          donee_organization_us_address: row.donee_acknowledgment.us_address,
          fmv_method: "appraisal",
          contribution_year_disposition_reduction:
            row.special_fmv_reduction.source,
        })),
      }
      : { section_b_items: rows },
  );
  if (sectionA) {
    attachments.splice(3);
    for (const attachment of attachments) {
      attachment.description = attachment.description.replace(
        "Section B",
        "Section A",
      );
    }
  }
  return {
    ...base,
    inputs: { ...base.inputs, f8283: parsed },
    items: parsed.section_b_items!,
    attachments,
  };
}
