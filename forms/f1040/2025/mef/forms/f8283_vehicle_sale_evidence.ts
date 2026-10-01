import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { inputSchema as form8283SourceSchema } from "../../../nodes/inputs/f8283/index.ts";

type SectionAItem = NonNullable<
  z.infer<typeof form8283SourceSchema>["section_a_items"]
>[number];

export const vehicleSalePdfReviewSchema = z.object({
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  donee_name: z.string().trim().min(1),
  donee_ein: z.string().regex(/^\d{9}$/),
  vehicle_vin: z.string().regex(/^[A-Z0-9]{17}$/),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gross_proceeds: z.number().positive(),
  acknowledgment_furnished_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  copy_b_or_equivalent_confirmed: z.literal(true),
  unrelated_sale_certification_confirmed: z.literal(true),
  deduction_limited_to_gross_proceeds_stated: z.literal(true),
  no_goods_or_services_confirmed: z.literal(true),
  reviewed_pdf_matches_source_confirmed: z.literal(true),
}).strict();

export type VehicleSalePdfReview = z.infer<typeof vehicleSalePdfReviewSchema>;

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
  try {
    await PDFDocument.load(attachment.bytes);
  } catch {
    throw new Error("Form 8283 vehicle acknowledgment is not a readable PDF");
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
