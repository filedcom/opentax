import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
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

async function syntheticDoneeAcknowledgment(
  lines: readonly string[] = [
    "Synthetic donee written acknowledgment - test fixture only",
    "City Charity, 1 Main St, Austin, TX 78701, EIN 98-7654321",
    "2020 Honda Civic VIN 1HGBH41JXMN109186, donated 2025-06-01",
    "Unrelated-party sale 2025-07-01, gross proceeds $15,000",
    "Acknowledgment furnished 2025-07-15; no goods or services received",
  ],
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  lines.forEach((line, index) => {
    page.drawText(line, { x: 48, y: 740 - 24 * index, size: 11, font });
  });
  return document.save();
}

async function assertLocalXsd(xml: string): Promise<void> {
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
}

Deno.test("sold Section A vehicle joins graph, acknowledgment, native XML and filled PDF", async () => {
  const acknowledgmentBytes = await syntheticDoneeAcknowledgment();
  const pdfSha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", acknowledgmentBytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const reviewedVehicle = {
    ...vehicle,
    vehicle_sale_pdf_review: {
      reviewed_by: "Pat Preparer",
      reviewed_on: "2026-02-01",
      taxpayer_ssn: base.filer.primarySSN.replaceAll("-", ""),
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
    },
  };
  const inputs = {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [reviewedVehicle] },
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
      bytes: acknowledgmentBytes,
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
  await assertLocalXsd(bundle.xml);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  const filled = await PDFDocument.load(pdf);
  assertEquals(filled.getPageCount(), 5);
  const changedAcknowledgmentBytes = await syntheticDoneeAcknowledgment([
    "Changed proceeds",
  ]);
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: [{
          fileName: vehicle.vehicle_acknowledgment_attachment_file_name,
          description:
            "DoneeOrganizationContemporaneousWrittenAcknowledgment vehicle sale",
          bytes: changedAcknowledgmentBytes,
        }],
      }),
    Error,
    "reviewed PDF",
  );
  await assertRejects(
    () =>
      buildPdfBytes(pending, base.filer, ".pdf-cache", {
        ...bundle,
        attachments: [{
          ...bundle.attachments[0],
          bytes: new Uint8Array(acknowledgmentBytes).reverse(),
        }],
      }),
    Error,
    "readable PDF",
  );
});

Deno.test("unreduced needy-transfer vehicle joins certification, native XML and filled PDF", async () => {
  const acknowledgmentBytes = await syntheticDoneeAcknowledgment([
    "Synthetic donee written acknowledgment - test fixture only",
    "City Charity, 1 Main St, Austin, TX 78701, EIN 98-7654321",
    "2020 Honda Civic VIN 1HGBH41JXMN109186, donated 2025-06-01",
    "Certified transfer to needy recipient for significantly below FMV",
    "Acknowledgment furnished 2025-06-20; no goods or services received",
  ]);
  const pdfSha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", acknowledgmentBytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const needyVehicle = {
    ...vehicle,
    fmv: 4_000,
    deduction_claimed: 4_000,
    cost_or_adjusted_basis: 5_000,
    vehicle_sale_acknowledgment: undefined,
    vehicle_needy_pdf_review: {
      reviewed_by: "Pat Preparer",
      reviewed_on: "2026-02-01",
      taxpayer_ssn: base.filer.primarySSN.replaceAll("-", ""),
      pdf_sha256: pdfSha256,
      donee_name: "City Charity",
      donee_ein: "987654321",
      vehicle_vin: "1HGBH41JXMN109186",
      contribution_date: "2025-06-01",
      acknowledgment_furnished_date: "2025-06-20",
      copy_b_or_equivalent_confirmed: true,
      needy_transfer_box5b_confirmed: true,
      no_goods_or_services_confirmed: true,
      reviewed_pdf_matches_source_confirmed: true,
    },
    vehicle_needy_transfer_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: vehicle.donee_organization_us_address,
      acknowledgment_furnished_date: "2025-06-20",
      vehicle_to_be_transferred_to_needy_confirmed: true,
      transfer_for_significantly_below_fmv_confirmed: true,
      direct_charitable_transportation_purpose_confirmed: true,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false,
    },
  };
  const result = execute(plan, registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [needyVehicle] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 4_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 40_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [{
      fileName: needyVehicle.vehicle_acknowledgment_attachment_file_name,
      description:
        "DoneeOrganizationContemporaneousWrittenAcknowledgment needy transfer",
      bytes: acknowledgmentBytes,
    }],
  });
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>4000</OtherThanByCashOrCheckAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalItemizedOrStandardDedAmt>40000</TotalItemizedOrStandardDedAmt>",
  );
  assertStringIncludes(bundle.xml, "<VIN>1HGBH41JXMN109186</VIN>");
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehTrnsfrToNeedyInd>X</CertifiesVehTrnsfrToNeedyInd>",
  );
  assertEquals(bundle.xml.includes("<FairMarketValueStatement "), false);
  await assertLocalXsd(bundle.xml);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  const filled = await PDFDocument.load(pdf);
  assertEquals(filled.getPageCount(), 4);
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: [{
          fileName: needyVehicle.vehicle_acknowledgment_attachment_file_name,
          description:
            "DoneeOrganizationContemporaneousWrittenAcknowledgment needy transfer",
          bytes: new Uint8Array(acknowledgmentBytes).reverse(),
        }],
      }),
    Error,
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          ...pending.f8283,
          section_a_items: [{
            ...pending.f8283!.section_a_items![0],
            vehicle_needy_pdf_review: {
              ...pending.f8283!.section_a_items![0].vehicle_needy_pdf_review!,
              vehicle_vin: "999887777",
            },
          }],
        },
      }, {
        filer: base.filer,
        attachments: [{
          fileName: needyVehicle.vehicle_acknowledgment_attachment_file_name,
          description:
            "DoneeOrganizationContemporaneousWrittenAcknowledgment needy transfer",
          bytes: acknowledgmentBytes,
        }],
      }),
    Error,
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          ...pending.f8283,
          section_a_items: [{
            ...pending.f8283!.section_a_items![0],
            vehicle_needy_pdf_review: undefined,
          }],
        },
      }, {
        filer: base.filer,
        attachments: [{
          fileName: needyVehicle.vehicle_acknowledgment_attachment_file_name,
          description:
            "DoneeOrganizationContemporaneousWrittenAcknowledgment needy transfer",
          bytes: acknowledgmentBytes,
        }],
      }),
    Error,
  );
});

Deno.test("Section A significant-use vehicle joins reviewed box 5a/5c PDF through final native and PDF return", async () => {
  const acknowledgmentBytes = await syntheticDoneeAcknowledgment([
    "Synthetic donee written acknowledgment - test fixture only",
    "City Charity, 1 Main St, Austin, TX 78701, EIN 98-7654321",
    "2020 Honda Civic VIN 1HGBH41JXMN109186, donated 2025-06-01",
    "Box 5a: no transfer before significant intervening charitable use",
    "Box 5c: deliver meals daily to needy residents for one year",
    "Acknowledgment furnished 2025-06-20; no goods or services received",
  ]);
  const pdfSha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", acknowledgmentBytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const significantUse = {
    ...vehicle,
    fmv: 4_000,
    deduction_claimed: 4_000,
    cost_or_adjusted_basis: 5_000,
    vehicle_sale_acknowledgment: undefined,
    vehicle_significant_use_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: vehicle.donee_organization_us_address,
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true,
      intended_use_description: "Deliver meals daily to needy residents",
      intended_use_duration: "one year",
      regularly_conducted_charitable_activity_confirmed: true,
      substantial_nonincidental_use_confirmed: true,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false,
    },
    vehicle_significant_use_pdf_review: {
      reviewed_by: "Pat Preparer",
      reviewed_on: "2026-02-01",
      taxpayer_ssn: base.filer.primarySSN.replaceAll("-", ""),
      pdf_sha256: pdfSha256,
      donee_name: "City Charity",
      donee_ein: "987654321",
      vehicle_vin: "1HGBH41JXMN109186",
      contribution_date: "2025-06-01",
      acknowledgment_furnished_date: "2025-06-20",
      intended_use_description: "Deliver meals daily to needy residents",
      intended_use_duration: "one year",
      copy_b_or_equivalent_confirmed: true,
      no_transfer_before_use_box5a_confirmed: true,
      significant_use_box5c_confirmed: true,
      no_goods_or_services_confirmed: true,
      reviewed_pdf_matches_source_confirmed: true,
    },
  };
  const result = execute(plan, registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [significantUse] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 4_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 40_000);
  const pending = buildPending(result.pending);
  const attachment = {
    fileName: significantUse.vehicle_acknowledgment_attachment_file_name,
    description:
      "DoneeOrganizationContemporaneousWrittenAcknowledgment significant use",
    bytes: acknowledgmentBytes,
  };
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [attachment],
  });
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>4000</OtherThanByCashOrCheckAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          ...pending.f8283,
          section_a_items: [{
            ...pending.f8283!.section_a_items![0],
            cost_or_adjusted_basis: 3_000,
          }],
        },
      }, { filer: base.filer, attachments: [attachment] }),
    Error,
    "complete purchased vehicle",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: [{
          ...attachment,
          bytes: new Uint8Array(acknowledgmentBytes).reverse(),
        }],
      }),
    Error,
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          ...pending.f8283,
          section_a_items: [{
            ...pending.f8283!.section_a_items![0],
            vehicle_significant_use_pdf_review: {
              ...pending.f8283!.section_a_items![0]
                .vehicle_significant_use_pdf_review!,
              intended_use_duration: "two years",
            },
          }],
        },
      }, { filer: base.filer, attachments: [attachment] }),
    Error,
  );
});

Deno.test("Section A material-improvement vehicle joins reviewed box 5a/5c PDF through final return", async () => {
  const acknowledgmentBytes = await syntheticDoneeAcknowledgment([
    "Synthetic donee written acknowledgment - test fixture only",
    "City Charity, 1 Main St, Austin, TX 78701, EIN 98-7654321",
    "2020 Honda Civic VIN 1HGBH41JXMN109186, donated 2025-06-01",
    "Box 5a: no transfer before material improvement",
    "Box 5c: replace failed engine with new engine; major repair raises value",
    "No additional donor payment; furnished 2025-06-20; no goods or services",
  ]);
  const pdfSha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", acknowledgmentBytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const improvement = {
    ...vehicle,
    fmv: 4_000,
    deduction_claimed: 4_000,
    cost_or_adjusted_basis: 5_000,
    vehicle_sale_acknowledgment: undefined,
    vehicle_material_improvement_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: vehicle.donee_organization_us_address,
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true,
      intended_improvement_description: "Replace failed engine with new engine",
      major_repair_or_addition_confirmed: true,
      significant_value_increase_confirmed: true,
      no_additional_donor_payment_confirmed: true,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false,
    },
    vehicle_material_improvement_pdf_review: {
      reviewed_by: "Pat Preparer",
      reviewed_on: "2026-02-01",
      taxpayer_ssn: base.filer.primarySSN.replaceAll("-", ""),
      pdf_sha256: pdfSha256,
      donee_name: "City Charity",
      donee_ein: "987654321",
      vehicle_vin: "1HGBH41JXMN109186",
      contribution_date: "2025-06-01",
      acknowledgment_furnished_date: "2025-06-20",
      intended_improvement_description: "Replace failed engine with new engine",
      copy_b_or_equivalent_confirmed: true,
      no_transfer_before_improvement_box5a_confirmed: true,
      material_improvement_box5c_confirmed: true,
      no_additional_donor_payment_confirmed: true,
      no_goods_or_services_confirmed: true,
      reviewed_pdf_matches_source_confirmed: true,
    },
  };
  const result = execute(plan, registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [improvement] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 4_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 40_000);
  const pending = buildPending(result.pending);
  const attachment = {
    fileName: improvement.vehicle_acknowledgment_attachment_file_name,
    description:
      "DoneeOrganizationContemporaneousWrittenAcknowledgment material improvement",
    bytes: acknowledgmentBytes,
  };
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [attachment],
  });
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CertifiesDetailedImprvDesc>Replace failed engine with new engine</CertifiesDetailedImprvDesc>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>4000</OtherThanByCashOrCheckAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: [{
          ...attachment,
          bytes: new Uint8Array(acknowledgmentBytes).reverse(),
        }],
      }),
    Error,
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          ...pending.f8283,
          section_a_items: [{
            ...pending.f8283!.section_a_items![0],
            vehicle_material_improvement_pdf_review: {
              ...pending.f8283!.section_a_items![0]
                .vehicle_material_improvement_pdf_review!,
              intended_improvement_description: "Routine oil change",
            },
          }],
        },
      }, { filer: base.filer, attachments: [attachment] }),
    Error,
  );
});
