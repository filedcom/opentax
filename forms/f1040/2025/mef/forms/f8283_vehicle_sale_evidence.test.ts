import { assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  type VehicleSalePdfReview,
  verifyVehicleSaleAcknowledgmentEvidence,
} from "./f8283_vehicle_sale_evidence.ts";

const item: Parameters<typeof verifyVehicleSaleAcknowledgmentEvidence>[0] = {
  property_description: "2020 Honda Civic",
  donee_organization_name: "City Charity",
  donee_organization_us_address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  is_vehicle: true,
  vehicle_vin: "1HGBH41JXMN109186",
  vehicle_acknowledgment_attachment_file_name: "City-Charity-1098C.pdf",
  date_contributed: "2025-06-01",
  fmv: 20_000,
  deduction_claimed: 15_000,
  vehicle_sale_acknowledgment: {
    copy_received_from_donee: true,
    donee_certified: true,
    donee_name: "City Charity",
    donee_ein: "987654321",
    donee_us_address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    acknowledgment_received_date: "2025-07-15",
    sale_to_unrelated_party: true,
    sale_date: "2025-07-01",
    gross_proceeds: 15_000,
    vehicle_year: 2020,
    vehicle_make: "Honda",
    vehicle_model: "Civic",
    vehicle_condition: "Good condition",
    odometer_miles: 60_000,
    goods_or_services_received: false,
  },
};

async function caseForReview() {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  const bytes = await document.save();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const pdfSha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const review: VehicleSalePdfReview = {
    reviewed_by: "Pat Preparer",
    reviewed_on: "2026-02-01",
    taxpayer_ssn: "123456789",
    pdf_sha256: pdfSha256,
    donee_name: "City Charity",
    donee_ein: "987654321",
    vehicle_vin: "1HGBH41JXMN109186",
    sale_date: "2025-07-01",
    gross_proceeds: 15_000,
    acknowledgment_furnished_date: "2025-07-15",
    copy_b_or_equivalent_confirmed: true,
    unrelated_sale_certification_confirmed: true,
    deduction_limited_to_gross_proceeds_stated: true,
    no_goods_or_services_confirmed: true,
    reviewed_pdf_matches_source_confirmed: true,
  };
  const attachment = {
    fileName: "City-Charity-1098C.pdf",
    description: "Form1098C donee vehicle sale",
    documentId: "binary-vehicle-1",
    bytes,
  };
  return { review, attachment };
}

Deno.test("vehicle sale acknowledgment review binds exact PDF bytes to VIN, donee and proceeds", async () => {
  const { review, attachment } = await caseForReview();
  await verifyVehicleSaleAcknowledgmentEvidence(
    item,
    review,
    attachment,
    "123456789",
  );
});

Deno.test("vehicle sale acknowledgment prerequisite rejects bytes, amount, owner, and document drift", async () => {
  const { review, attachment } = await caseForReview();
  const changedDocument = await PDFDocument.create();
  changedDocument.addPage([300, 300]);
  const changedBytes = await changedDocument.save();
  await assertRejects(() =>
    verifyVehicleSaleAcknowledgmentEvidence(
      item,
      review,
      { ...attachment, bytes: changedBytes },
      "123456789",
    )
  );
  await assertRejects(() =>
    verifyVehicleSaleAcknowledgmentEvidence(
      item,
      { ...review, gross_proceeds: 14_999 },
      attachment,
      "123456789",
    )
  );
  await assertRejects(() =>
    verifyVehicleSaleAcknowledgmentEvidence(
      item,
      review,
      attachment,
      "999887777",
    )
  );
  await assertRejects(() =>
    verifyVehicleSaleAcknowledgmentEvidence(
      item,
      review,
      { ...attachment, documentId: "" },
      "123456789",
    )
  );
  await assertRejects(() =>
    verifyVehicleSaleAcknowledgmentEvidence(
      item,
      review,
      { ...attachment, bytes: new Uint8Array([1, 2, 3]) },
      "123456789",
    )
  );
});
