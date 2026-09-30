import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";
import { buildPdfBytes } from "./builder.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-section-a-capital-gain-reduction-gift"
)!;
const plan = buildExecutionPlan(registry);

const vehicle = {
  property_description: "2020 Honda Civic, good condition, 60,000 miles",
  donee_organization_name: "City Charity",
  donee_organization_us_address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  is_vehicle: true,
  vehicle_vin: "1HGBH41JXMN109186",
  vehicle_acknowledgment_attachment_file_name: "DoneeAcknowledgment-Civic.pdf",
  date_acquired: "2020-01-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 20_000,
  deduction_claimed: 15_000,
  cost_or_adjusted_basis: 25_000,
  charitable_limit_category: "noncash_50",
  similar_item_group: "vehicles",
  is_capital_gain_property: false,
  fmv_method: "comparable_sales",
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

async function syntheticDoneeAcknowledgment(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  [
    "Synthetic donee written acknowledgment - test fixture only",
    "City Charity, 1 Main St, Austin, TX 78701, EIN 98-7654321",
    "2020 Honda Civic VIN 1HGBH41JXMN109186, donated 2025-06-01",
    "Unrelated-party sale 2025-07-01, gross proceeds $15,000",
    "Acknowledgment furnished 2025-07-15; no goods or services received",
  ].forEach((line, index) => {
    page.drawText(line, { x: 48, y: 740 - 24 * index, size: 11, font });
  });
  return document.save();
}

Deno.test("sold Section A vehicle joins graph, acknowledgment, native XML and filled PDF", async () => {
  const inputs = {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [vehicle] },
  };
  const result = execute(plan, registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 15_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 51_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [{
      fileName: vehicle.vehicle_acknowledgment_attachment_file_name,
      description:
        "DoneeOrganizationContemporaneousWrittenAcknowledgment vehicle sale",
      bytes: await syntheticDoneeAcknowledgment(),
    }],
  });
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>15000</OtherThanByCashOrCheckAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalItemizedOrStandardDedAmt>51000</TotalItemizedOrStandardDedAmt>",
  );
  assertStringIncludes(bundle.xml, "<VIN>1HGBH41JXMN109186</VIN>");
  assertStringIncludes(bundle.xml, "gross proceeds $15000.00");
  assertStringIncludes(
    bundle.xml,
    "DoneeOrganizationContemporaneousWrittenAcknowledgment vehicle sale",
  );
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  const filled = await PDFDocument.load(pdf);
  assertEquals(filled.getPageCount(), 5);
});
