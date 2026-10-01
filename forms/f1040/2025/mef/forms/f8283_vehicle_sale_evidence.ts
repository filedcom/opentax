import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import type { MefPdfAttachment } from "../form-descriptor.ts";
import {
  inputSchema as form8283SourceSchema,
  vehicleNeedyPdfReviewSchema,
  vehicleSalePdfReviewSchema,
} from "../../../nodes/inputs/f8283/index.ts";

type SectionAItem = NonNullable<
  z.infer<typeof form8283SourceSchema>["section_a_items"]
>[number];

export type VehicleSalePdfReview = z.infer<typeof vehicleSalePdfReviewSchema>;

/** Check a box-5b donee certification against the exact prepared attachment. */
export async function verifyVehicleNeedyAcknowledgmentEvidence(
  item: SectionAItem,
  reviewInput: unknown,
  attachment: VehicleSaleAttachment,
  filerSsn: string,
): Promise<void> {
  const review = vehicleNeedyPdfReviewSchema.parse(reviewInput);
  const ack = item.vehicle_needy_transfer_acknowledgment;
  if (
    item.is_vehicle !== true || !ack || !item.vehicle_vin ||
    !item.date_contributed ||
    !item.vehicle_acknowledgment_attachment_file_name ||
    item.deduction_claimed === undefined || item.deduction_claimed <= 500 ||
    item.fmv === undefined || item.deduction_claimed > item.fmv ||
    !validIsoDate(item.date_contributed) || !validIsoDate(review.reviewed_on) ||
    !validIsoDate(ack.acknowledgment_furnished_date) ||
    ack.acknowledgment_furnished_date < item.date_contributed ||
    review.reviewed_on < ack.acknowledgment_furnished_date ||
    (Date.parse(`${ack.acknowledgment_furnished_date}T00:00:00Z`) -
            Date.parse(`${item.date_contributed}T00:00:00Z`)) / 86_400_000 >
      30 ||
    filerSsn.replaceAll("-", "") !== review.taxpayer_ssn ||
    attachment.fileName !== item.vehicle_acknowledgment_attachment_file_name ||
    !/^(?:Form1098C|DoneeOrganizationContemporaneousWrittenAcknowledgment)/
      .test(attachment.description) ||
    !attachment.documentId.trim() ||
    review.donee_name !== ack.donee_name ||
    review.donee_ein !== ack.donee_ein ||
    item.donee_organization_name !== ack.donee_name ||
    item.donee_organization_us_address?.line1 !== ack.donee_us_address.line1 ||
    (item.donee_organization_us_address?.line2 ?? "") !==
      (ack.donee_us_address.line2 ?? "") ||
    item.donee_organization_us_address?.city !== ack.donee_us_address.city ||
    item.donee_organization_us_address?.state !== ack.donee_us_address.state ||
    item.donee_organization_us_address?.zip !== ack.donee_us_address.zip ||
    review.vehicle_vin !== item.vehicle_vin ||
    review.contribution_date !== item.date_contributed ||
    review.acknowledgment_furnished_date !==
      ack.acknowledgment_furnished_date ||
    ack.vehicle_to_be_transferred_to_needy_confirmed !== true ||
    ack.transfer_for_significantly_below_fmv_confirmed !== true ||
    ack.direct_charitable_transportation_purpose_confirmed !== true ||
    ack.goods_or_services_received !== false
  ) {
    throw new Error(
      "Form 8283 needy-transfer acknowledgment review differs from owner, donee, VIN, date, certification, or prepared attachment",
    );
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(attachment.bytes);
  } catch {
    throw new Error(
      "Form 8283 needy-transfer acknowledgment is not a readable PDF",
    );
  }
  if (pdf.getPageCount() === 0) {
    throw new Error("Form 8283 needy-transfer acknowledgment needs a PDF page");
  }
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", attachment.bytes),
  );
  const actualSha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actualSha256 !== review.pdf_sha256) {
    throw new Error(
      "Form 8283 needy-transfer acknowledgment PDF differs from the exact reviewed bytes",
    );
  }
}

export interface VehicleSaleAttachment {
  readonly fileName: string;
  readonly description: string;
  readonly documentId: string;
  readonly bytes: Uint8Array;
}

function validIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value;
}

/** Stage an exact-byte human review of a donee's vehicle sale acknowledgment. */
export async function verifyVehicleSaleAcknowledgmentEvidence(
  item: SectionAItem,
  reviewInput: unknown,
  attachment: VehicleSaleAttachment,
  filerSsn: string,
): Promise<void> {
  const review = vehicleSalePdfReviewSchema.parse(reviewInput);
  const acknowledgment = item.vehicle_sale_acknowledgment;
  if (
    item.is_vehicle !== true || !acknowledgment ||
    !item.vehicle_vin || !item.vehicle_acknowledgment_attachment_file_name ||
    !item.date_contributed || item.fmv === undefined ||
    item.deduction_claimed === undefined ||
    item.deduction_claimed <= 500 ||
    item.deduction_claimed > Math.min(
        item.fmv,
        acknowledgment.gross_proceeds,
      ) ||
    !validIsoDate(item.date_contributed) ||
    !validIsoDate(review.reviewed_on) ||
    !validIsoDate(acknowledgment.sale_date) ||
    !validIsoDate(acknowledgment.acknowledgment_received_date) ||
    acknowledgment.acknowledgment_received_date < acknowledgment.sale_date ||
    review.reviewed_on < acknowledgment.acknowledgment_received_date ||
    item.date_contributed > acknowledgment.sale_date ||
    (Date.parse(`${acknowledgment.acknowledgment_received_date}T00:00:00Z`) -
            Date.parse(`${acknowledgment.sale_date}T00:00:00Z`)) /
          86_400_000 > 30 ||
    filerSsn.replaceAll("-", "") !== review.taxpayer_ssn ||
    attachment.fileName !== item.vehicle_acknowledgment_attachment_file_name ||
    !/^(?:Form1098C|DoneeOrganizationContemporaneousWrittenAcknowledgment)/
      .test(attachment.description) ||
    !attachment.documentId.trim() ||
    review.donee_name !== acknowledgment.donee_name ||
    review.donee_ein !== acknowledgment.donee_ein ||
    item.donee_organization_name !== acknowledgment.donee_name ||
    item.donee_organization_us_address?.line1 !==
      acknowledgment.donee_us_address.line1 ||
    (item.donee_organization_us_address?.line2 ?? "") !==
      (acknowledgment.donee_us_address.line2 ?? "") ||
    item.donee_organization_us_address?.city !==
      acknowledgment.donee_us_address.city ||
    item.donee_organization_us_address?.state !==
      acknowledgment.donee_us_address.state ||
    item.donee_organization_us_address?.zip !==
      acknowledgment.donee_us_address.zip ||
    review.vehicle_vin !== item.vehicle_vin ||
    review.sale_date !== acknowledgment.sale_date ||
    review.gross_proceeds !== acknowledgment.gross_proceeds ||
    review.acknowledgment_furnished_date !==
      acknowledgment.acknowledgment_received_date ||
    acknowledgment.sale_to_unrelated_party !== true ||
    acknowledgment.goods_or_services_received !== false
  ) {
    throw new Error(
      "Form 8283 vehicle sale acknowledgment review differs from owner, donee, VIN, certified proceeds, or attached document",
    );
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(attachment.bytes);
  } catch {
    throw new Error("Form 8283 vehicle acknowledgment is not a readable PDF");
  }
  if (pdf.getPageCount() === 0) {
    throw new Error("Form 8283 vehicle acknowledgment needs a PDF page");
  }
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", attachment.bytes),
  );
  const actualSha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actualSha256 !== review.pdf_sha256) {
    throw new Error(
      "Form 8283 vehicle acknowledgment PDF differs from the exact reviewed bytes",
    );
  }
}

/** Verify Section A vehicle certifications against their prepared PDF links. */
export async function assertPreparedVehicleAcknowledgments(
  sourceInput: unknown,
  attachments: ReadonlyArray<MefPdfAttachment>,
  preparedXml: string,
  filerSsn: string,
): Promise<void> {
  if (!sourceInput) return;
  const source = form8283SourceSchema.parse(sourceInput);
  const linked = [...preparedXml.matchAll(
    /<BinaryAttachment documentId="([^"]+)">([\s\S]*?)<\/BinaryAttachment>/g,
  )];
  for (const item of source.section_a_items ?? []) {
    if (
      !item.vehicle_sale_acknowledgment &&
      !item.vehicle_needy_transfer_acknowledgment
    ) continue;
    const fileName = item.vehicle_acknowledgment_attachment_file_name;
    const attachment = attachments.find((row) => row.fileName === fileName);
    const reference = linked.find((match) =>
      match[2].includes(
        `<AttachmentLocationTxt>${fileName}</AttachmentLocationTxt>`,
      )
    );
    if (!attachment || !reference || !fileName) {
      throw new Error(
        "Form 8283 vehicle PDF lacks an exact prepared MeF attachment link",
      );
    }
    if (item.vehicle_sale_acknowledgment) {
      await verifyVehicleSaleAcknowledgmentEvidence(
        item,
        item.vehicle_sale_pdf_review,
        { ...attachment, documentId: reference[1] },
        filerSsn,
      );
    } else {
      await verifyVehicleNeedyAcknowledgmentEvidence(
        item,
        item.vehicle_needy_pdf_review,
        { ...attachment, documentId: reference[1] },
        filerSsn,
      );
    }
  }
}
