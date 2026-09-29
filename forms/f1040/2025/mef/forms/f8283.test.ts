import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { SCENARIO_1040_02_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import {
  FMVMethod,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form8283 } from "./f8283.ts";

Deno.test("Form 8283 emits the sourced ATS Scenario 2 Section A donation", () => {
  const donation = SCENARIO_1040_02_FACTS.form8283;
  const xml = buildMefXml({
    f8283: {
      section_a_items: [{
        donee_organization_name: donation.donee,
        property_description: donation.propertyDescription,
        date_contributed: donation.donationDate,
        cost_or_adjusted_basis: donation.costBasis,
        fmv: donation.fairMarketValue,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      }],
    },
  }, testFiler());
  assertStringIncludes(xml, 'documentCnt="2"');
  assertStringIncludes(xml, '<IRS8283 documentId="IRS82831">');
  assertStringIncludes(xml, "<PropertyId>A</PropertyId>");
  assertStringIncludes(
    xml,
    "<DoneeOrganizationName><BusinessNameLine1Txt>Goodwill</BusinessNameLine1Txt></DoneeOrganizationName>",
  );
  assertStringIncludes(
    xml,
    "<DonatedPropertyDesc>Clothes and toys</DonatedPropertyDesc>",
  );
  assertStringIncludes(xml, "<ContributionDt>2025-11-13</ContributionDt>");
  assertStringIncludes(
    xml,
    "<DonorCostOrAdjustedBasisAmt>3470</DonorCostOrAdjustedBasisAmt>",
  );
  assertStringIncludes(xml, "<FairMarketValueAmt>700</FairMarketValueAmt>");
});

Deno.test("Form 8283 preserves multiple Section A rows and month-only acquisition dates", () => {
  const [xml] = form8283.build({
    section_a_items: [
      {
        property_description: "Furniture",
        date_acquired: "2022-05-19",
        date_contributed: "2025-06-03",
        donor_acquisition_description: "Purchase",
        fmv: 450,
        fmv_method: FMVMethod.ThriftShopValue,
        charitable_limit_category: "noncash_50",
        similar_item_group: "furniture",
        is_capital_gain_property: false,
      },
      {
        property_description: "Books",
        fmv: 125,
        fmv_method: FMVMethod.ComparableSales,
        charitable_limit_category: "noncash_50",
        similar_item_group: "books",
        is_capital_gain_property: false,
      },
    ],
  });
  assertStringIncludes(xml, "<PropertyId>A</PropertyId>");
  assertStringIncludes(xml, "<PropertyId>B</PropertyId>");
  assertStringIncludes(xml, "<DonorAcquiredDt>2022-05</DonorAcquiredDt>");
  assertStringIncludes(
    xml,
    "<FairMarketValueMethodDesc>Thrift shop value</FairMarketValueMethodDesc>",
  );
  assertStringIncludes(
    xml,
    "<FairMarketValueMethodDesc>Comparable sales</FairMarketValueMethodDesc>",
  );
});

async function acknowledgmentPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save();
}

async function signedFormSourceReview(bytes: Uint8Array) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return {
    reviewed_by: "Test reviewer",
    reviewed_on: "2025-09-01",
    pdf_sha256: Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
    appraiser_signature_present: true as const,
    donee_signature_present: true as const,
    matches_electronic_form_confirmed: true as const,
  };
}

function signedFormAttachment(bytes: Uint8Array) {
  return {
    fileName: "CompletedSignedForm8283.pdf",
    description: "Form 8283 completed signed Section B",
    bytes,
  };
}

async function withSignedForm<T extends object>(item: T, bytes: Uint8Array) {
  return {
    ...item,
    signed_form_attachment_file_name: "CompletedSignedForm8283.pdf",
    signed_form_source_review: await signedFormSourceReview(bytes),
  };
}

async function assertVehicleBundleXsd(xml: string): Promise<void> {
  const xsdPath = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
}

function needyTransferVehicle(
  vin = "1HGBH41JXMN109186",
  fileName = "Form1098C-Civic.pdf",
) {
  return {
    property_description: "2020 Honda Civic, good condition, 60,000 miles",
    is_vehicle: true,
    vehicle_vin: vin,
    vehicle_acknowledgment_attachment_file_name: fileName,
    date_contributed: "2025-06-01",
    date_acquired: "2025-01-01",
    donor_acquisition_description: "Purchase",
    fmv: 20_000,
    deduction_claimed: 4_500,
    cost_or_adjusted_basis: 4_500,
    charitable_limit_category: "noncash_50" as const,
    similar_item_group: "vehicles",
    is_capital_gain_property: false,
    short_term_ordinary_income_reduction_confirmed: true as const,
    vehicle_needy_transfer_acknowledgment: {
      copy_received_from_donee: true as const,
      donee_certified: true as const,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
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
  } as const;
}

function sectionBMaterialImprovementVehicle() {
  return {
    property_description: "2018 Honda Civic, fair condition, 90,000 miles",
    property_type: SectionBPropertyType.Vehicle,
    physical_condition: "Fair condition; engine needs replacement",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 15_000,
    deduction_claimed: 15_000,
    cost_or_adjusted_basis: 18_000,
    charitable_limit_category: "noncash_50" as const,
    similar_item_group: "vehicles",
    is_capital_gain_property: false,
    short_term_ordinary_income_reduction_confirmed: true as const,
    vehicle_vin: "1HGBH41JXMN109186",
    vehicle_acknowledgment_attachment_file_name: "Form1098C-Improvement.pdf",
    vehicle_material_improvement_acknowledgment: {
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
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true,
      intended_improvement_description: "Replace failed engine with new engine",
      major_repair_or_addition_confirmed: true,
      significant_value_increase_confirmed: true,
      no_additional_donor_payment_confirmed: true,
      vehicle_year: 2018,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Fair condition",
      odometer_miles: 90_000,
      goods_or_services_received: false,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-05-28",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      signature_attachment_file_name: "Form8283AppraiserSignature.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Charity",
      ein: "987654321",
      received_date: "2025-06-01",
      signed_by_donee: true as const,
      unrelated_use: false,
      signature_attachment_file_name: "Form8283DoneeSignature.pdf",
      us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
  } as const;
}

function sectionBHighValueEquipmentGift() {
  const vehicle = sectionBMaterialImprovementVehicle();
  return {
    property_description: "Industrial printing press",
    property_type: SectionBPropertyType.Equipment,
    physical_condition: "Operational, professionally maintained",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 600_000,
    deduction_claimed: 600_000,
    cost_or_adjusted_basis: 620_000,
    charitable_limit_category: "noncash_50" as const,
    similar_item_group: "industrial printing presses",
    is_capital_gain_property: false,
    qualified_appraisal: {
      ...vehicle.qualified_appraisal,
      attachment_file_name: "QualifiedAppraisal-Press.pdf",
    },
    donee_acknowledgment: vehicle.donee_acknowledgment,
  } as const;
}

Deno.test("Form 8283 Section B does not file an unexplained reduction below appraised FMV", () => {
  const gift = sectionBHighValueEquipmentGift();
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...gift,
          fmv: 650_000,
        }],
      }),
    Error,
    "needs a sourced FMV-reduction computation and statement",
  );
});

Deno.test("Form 8283 similar books across three donees need three Section B documents", () => {
  const base = sectionBHighValueEquipmentGift();
  const gifts = [
    ["City College", "111111111", 2_000],
    ["State University", "222222222", 2_500],
    ["Public Library", "333333333", 900],
  ] as const;
  const sectionB = gifts.map(([organization_name, ein, amount], index) => ({
    ...base,
    property_description: `Books lot ${index + 1}`,
    property_type: SectionBPropertyType.Collectibles,
    fmv: amount,
    deduction_claimed: amount,
    similar_item_group: "books",
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
    qualified_appraisal: {
      ...base.qualified_appraisal,
      attachment_file_name: undefined,
    },
    donee_acknowledgment: {
      ...base.donee_acknowledgment,
      organization_name,
      ein,
      signature_attachment_file_name: `Donee-${index + 1}.pdf`,
    },
  }));
  const documents = form8283.build({ section_b_items: sectionB }, {
    attachmentDescriptionsByFileName: {
      "Form8283AppraiserSignature.pdf":
        "Form 8283 appraiser signature document",
      "Donee-1.pdf": "Form 8283 Donee signature document",
      "Donee-2.pdf": "Form 8283 Donee signature document",
      "Donee-3.pdf": "Form 8283 Donee signature document",
    },
  });
  assertEquals(documents.length, 3);
  for (const [index, document] of documents.entries()) {
    assertStringIncludes(
      document,
      `<DeductionClaimedAmt>${gifts[index]![2]}</DeductionClaimedAmt>`,
    );
    assertStringIncludes(
      document,
      `<BusinessNameLine1Txt>${gifts[index]![0]}</BusinessNameLine1Txt>`,
    );
  }
});

Deno.test("Form 8283 similar equipment above $500,000 shares a full group appraisal attachment", () => {
  const base = sectionBHighValueEquipmentGift();
  const sectionB = [1, 2].map((index) => ({
    ...base,
    fmv: 300_000,
    deduction_claimed: 300_000,
    similar_item_group: "industrial equipment",
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
    qualified_appraisal: {
      ...base.qualified_appraisal,
      attachment_file_name: "QualifiedAppraisal-EquipmentGroup.pdf",
      covers_similar_item_group_confirmed: true as const,
    },
    donee_acknowledgment: {
      ...base.donee_acknowledgment,
      organization_name: `Charity ${index}`,
      ein: index === 1 ? "111111111" : "222222222",
      signature_attachment_file_name: `Donee-${index}.pdf`,
    },
  }));
  const documents = form8283.build({ section_b_items: sectionB }, {
    attachmentDescriptionsByFileName: {
      "Form8283AppraiserSignature.pdf":
        "Form 8283 appraiser signature document",
      "Donee-1.pdf": "Form 8283 Donee signature document",
      "Donee-2.pdf": "Form 8283 Donee signature document",
      "QualifiedAppraisal-EquipmentGroup.pdf":
        "Qualified Appraisal industrial equipment group",
    },
    documentIdsByAttachmentFileName: {
      "Form8283AppraiserSignature.pdf": "PDF-APPRAISER",
      "Donee-1.pdf": "PDF-DONEE1",
      "Donee-2.pdf": "PDF-DONEE2",
      "QualifiedAppraisal-EquipmentGroup.pdf": "PDF-GROUP",
    },
  });
  assertEquals(documents.length, 2);
  for (const document of documents) {
    assertStringIncludes(document, "PDF-GROUP");
  }
});

Deno.test("Form 8283 combined $500,000 group threshold rejects missing full appraisal even when each item is below it", () => {
  const base = sectionBHighValueEquipmentGift();
  const items = [1, 2].map(() => ({
    ...base,
    fmv: 300_000,
    deduction_claimed: 300_000,
    similar_item_group: "industrial equipment",
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
    qualified_appraisal: {
      ...base.qualified_appraisal,
      attachment_file_name: undefined,
      covers_similar_item_group_confirmed: true as const,
    },
  }));
  assertThrows(
    () => form8283.build({ section_b_items: items }),
    Error,
    "Similar-item group claimed above $500,000 needs a full qualified-appraisal PDF",
  );
});

Deno.test("Form 8283 Section A includes VIN without a donee PDF for a vehicle claimed at $500 or less", async () => {
  const bundle = await buildMefBundle({
    f8283: {
      section_a_items: [{
        property_description: "2014 sedan, fair condition, 90,000 miles",
        fmv: 500,
        charitable_limit_category: "noncash_50",
        similar_item_group: "vehicles",
        is_capital_gain_property: false,
        is_vehicle: true,
        vehicle_vin: "1HGBH41JXMN109186",
      }],
    },
  }, {
    filer: testFiler(),
    attachments: [],
  });
  const xml = bundle.xml;
  assertStringIncludes(
    xml,
    "<DonatedPropertyVehicleInd>X</DonatedPropertyVehicleInd>",
  );
  assertStringIncludes(xml, "<VIN>1HGBH41JXMN109186</VIN>");
  assertEquals(bundle.attachments.length, 0);
});

Deno.test("Form 8283 vehicle rejects missing or misdescribed donee PDF", async () => {
  const vehicle = needyTransferVehicle(
    "1HGBH41JXMN109186",
    "Form1098C-Sedan.pdf",
  );
  const pending = { f8283: { section_a_items: [vehicle] } };
  assertThrows(
    () =>
      form8283.build({
        section_a_items: [{
          ...vehicle,
          vehicle_acknowledgment_attachment_file_name: undefined,
        }],
      }),
    Error,
    "donee-issued Form 1098-C",
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer: testFiler(), attachments: [] }),
    Error,
    "matching PDF",
  );
  const bytes = await acknowledgmentPdf();
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: testFiler(),
        attachments: [{
          fileName: "Form1098C-Sedan.pdf",
          description: "Unrelated attachment",
          bytes,
        }],
      }),
    Error,
    "IRS-approved description",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: testFiler(),
        attachments: [{
          fileName: "Form1098C-Sedan.pdf",
          description: "Form1098C Sedan acknowledgment",
          bytes: new Uint8Array([1, 2, 3]),
        }],
      }),
    Error,
    "not a complete PDF",
  );
});

Deno.test("Form 8283 links a separate donee PDF for each Section A vehicle over $500", async () => {
  const bytes = await acknowledgmentPdf();
  const xml = (await buildMefBundle({
    f8283: {
      section_a_items: [
        {
          ...needyTransferVehicle("1HGBH41JXMN109186", "Form1098C-First.pdf"),
          deduction_claimed: 2_000,
          cost_or_adjusted_basis: 2_000,
        },
        {
          ...needyTransferVehicle("1HGBH41JXMN109187", "Form1098C-Second.pdf"),
          deduction_claimed: 2_000,
          cost_or_adjusted_basis: 2_000,
        },
      ],
    },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "Form1098C-First.pdf",
        description: "Form1098C First vehicle",
        bytes,
      },
      {
        fileName: "Form1098C-Second.pdf",
        description: "Form1098C Second vehicle",
        bytes,
      },
    ],
  })).xml;
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment6 BinaryAttachment7"',
  );
  assertStringIncludes(xml, "<Desc>Form1098C First vehicle</Desc>");
  assertStringIncludes(xml, "<Desc>Form1098C Second vehicle</Desc>");
});

Deno.test("Form 8283 accepts a donee-issued written acknowledgment PDF instead of Form 1098-C", async () => {
  const fileName = "DoneeAcknowledgment-Civic.pdf";
  const xml = (await buildMefBundle({
    f8283: {
      section_a_items: [needyTransferVehicle(undefined, fileName)],
    },
  }, {
    filer: testFiler(),
    attachments: [{
      fileName,
      description:
        "DoneeOrganizationContemporaneousWrittenAcknowledgment Civic needy transfer",
      bytes: await acknowledgmentPdf(),
    }],
  })).xml;
  assertStringIncludes(
    xml,
    '<BinaryAttachment documentId="BinaryAttachment4">',
  );
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment4"');
  assertStringIncludes(
    xml,
    "<Desc>DoneeOrganizationContemporaneousWrittenAcknowledgment Civic needy transfer</Desc>",
  );
});

Deno.test("Form 8283 Section B emits separate signed appraisal and donee documents", () => {
  const gift = {
    property_description: "Antique desk",
    property_type: SectionBPropertyType.Collectibles,
    physical_condition: "Good condition",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-08-21",
    fmv: 8_000,
    deduction_claimed: 8_000,
    cost_or_adjusted_basis: 2_500,
    charitable_limit_category: "noncash_50" as const,
    similar_item_group: "furniture",
    is_capital_gain_property: false,
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-08-20",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      covers_similar_item_group_confirmed: true as const,
      signature_attachment_file_name: "Form8283AppraiserSignature.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Museum",
      ein: "987654321",
      received_date: "2025-08-21",
      signed_by_donee: true as const,
      unrelated_use: false,
      signature_attachment_file_name: "Form8283DoneeSignature.pdf",
      us_address: {
        line1: "2 Museum Way",
        city: "Austin",
        state: "TX",
        zip: "78702",
      },
    },
  };
  const docs = form8283.build({
    section_b_items: [
      {
        ...gift,
        signed_form_attachment_file_name: "SignedDesk8283.pdf",
        signed_form_source_review: {
          reviewed_by: "Test reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: "a".repeat(64),
          appraiser_signature_present: true,
          donee_signature_present: true,
          matches_electronic_form_confirmed: true,
        },
      },
      {
        ...gift,
        property_description: "Antique chair",
        signed_form_attachment_file_name: "SignedChair8283.pdf",
        signed_form_source_review: {
          reviewed_by: "Test reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: "b".repeat(64),
          appraiser_signature_present: true,
          donee_signature_present: true,
          matches_electronic_form_confirmed: true,
        },
      },
    ],
  }, {
    attachmentDescriptionsByFileName: {
      "Form8283AppraiserSignature.pdf":
        "Form 8283 appraiser signature document",
      "Form8283DoneeSignature.pdf": "Form 8283 Donee signature document",
      "SignedDesk8283.pdf": "Form 8283 completed signed Section B",
      "SignedChair8283.pdf": "Form 8283 completed signed Section B",
    },
    documentIdsByAttachmentFileName: {
      "Form8283AppraiserSignature.pdf": "BinaryAttachmentAppraiser",
      "Form8283DoneeSignature.pdf": "BinaryAttachmentDonee",
      "SignedDesk8283.pdf": "SignedDesk",
      "SignedChair8283.pdf": "SignedChair",
    },
    attachmentSha256ByFileName: {
      "SignedDesk8283.pdf": "a".repeat(64),
      "SignedChair8283.pdf": "b".repeat(64),
    },
    documentIdsByPendingKey: {},
  });
  assertEquals(docs.length, 2);
  assertStringIncludes(docs[0], "<CollectiblesInd>X</CollectiblesInd>");
  assertStringIncludes(docs[0], "<DonorAcquiredDt>2018-05</DonorAcquiredDt>");
  assertStringIncludes(
    docs[0],
    "<DeductionClaimedAmt>8000</DeductionClaimedAmt>",
  );
  assertStringIncludes(
    docs[0],
    "<AppraiserSignedDt>2025-08-20</AppraiserSignedDt>",
  );
  assertStringIncludes(docs[0], "<DoneeEIN>987654321</DoneeEIN>");
  assertStringIncludes(
    docs[0],
    'referenceDocumentId="SignedDesk BinaryAttachmentAppraiser BinaryAttachmentDonee"',
  );
  assertStringIncludes(docs[1], "Antique chair");
  assertStringIncludes(
    docs[1],
    'referenceDocumentId="SignedChair BinaryAttachmentAppraiser BinaryAttachmentDonee"',
  );
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...gift,
          property_type: SectionBPropertyType.ArtAtLeast20000,
          fmv: 25_000,
          deduction_claimed: 25_000,
        }],
      }),
    Error,
    "linked appraisal or vehicle acknowledgment attachment",
  );
});

Deno.test("Form 8283 Section B return validates against TY2025 IRS XSD", async () => {
  const signedBytes = await acknowledgmentPdf();
  const bundle = await buildMefBundle({
    f8283: {
      section_b_items: [{
        property_description: "Antique desk",
        property_type: SectionBPropertyType.Collectibles,
        physical_condition: "Good condition",
        date_acquired: "2018-05-15",
        donor_acquisition_description: "Purchase",
        date_contributed: "2025-08-21",
        fmv: 8_000,
        deduction_claimed: 8_000,
        cost_or_adjusted_basis: 2_500,
        charitable_limit_category: "noncash_50",
        similar_item_group: "furniture",
        is_capital_gain_property: false,
        signed_form_attachment_file_name: "CompletedSignedForm8283.pdf",
        signed_form_source_review: await signedFormSourceReview(signedBytes),
        qualified_appraisal: {
          appraiser_first_name: "Jane",
          appraiser_last_name: "Smith",
          signed_date: "2025-08-20",
          appraiser_ein: "123456789",
          signed_by_appraiser: true,
          signature_attachment_file_name: "Form8283AppraiserSignature.pdf",
          us_address: {
            line1: "1 Art Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
        },
        donee_acknowledgment: {
          organization_name: "City Museum",
          ein: "987654321",
          received_date: "2025-08-21",
          signed_by_donee: true,
          unrelated_use: false,
          signature_attachment_file_name: "Form8283DoneeSignature.pdf",
          us_address: {
            line1: "2 Museum Way",
            city: "Austin",
            state: "TX",
            zip: "78702",
          },
        },
      }],
    },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "Form8283AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes: await acknowledgmentPdf(),
      },
      {
        fileName: "Form8283DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes: await acknowledgmentPdf(),
      },
      signedFormAttachment(signedBytes),
    ],
  });
  const xml = bundle.xml;
  assertEquals(bundle.attachments.length, 3);
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment4 BinaryAttachment2 BinaryAttachment3"',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment DeductionsTakenUnderSection170Stmt DoneesSignatureUnavailableStmt"',
  );
  assertStringIncludes(
    xml,
    "<Desc>Form 8283 appraiser signature document</Desc>",
  );
  assertStringIncludes(
    xml,
    "<Desc>Form 8283 Donee signature document</Desc>",
  );
  const xsdPath = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8283 Section B material-improvement vehicle links appraisal, donee, and 1098-C evidence", async () => {
  const vehicle = sectionBMaterialImprovementVehicle();
  const bytes = await acknowledgmentPdf();
  const bundle = await buildMefBundle({
    f8283: { section_b_items: [await withSignedForm(vehicle, bytes)] },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "Form1098C-Improvement.pdf",
        description: "Form1098C material improvement certification",
        bytes,
      },
      {
        fileName: "Form8283AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes,
      },
      {
        fileName: "Form8283DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes,
      },
      signedFormAttachment(bytes),
    ],
  });
  const xml = bundle.xml;
  assertEquals(bundle.attachments.length, 4);
  assertStringIncludes(xml, "<VehicleInd>X</VehicleInd>");
  assertStringIncludes(
    xml,
    "<AppraisedFairMarketValueAmt>15000</AppraisedFairMarketValueAmt>",
  );
  assertStringIncludes(xml, "<DeductionClaimedAmt>15000</DeductionClaimedAmt>");
  assertStringIncludes(
    xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  assertStringIncludes(
    xml,
    "<CertifiesDetailedImprvDesc>Replace failed engine with new engine</CertifiesDetailedImprvDesc>",
  );
  assertStringIncludes(xml, "<VIN>1HGBH41JXMN109186</VIN>");
  assertStringIncludes(
    xml,
    'referenceDocumentName="ContemporaneousWrittenAcknowledgmentStatement ContributionsOfMotorVehiclesBoatsAndAirplanesStatement"',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment3 BinaryAttachment6 BinaryAttachment4 BinaryAttachment5"',
  );
  assertStringIncludes(
    xml,
    "<Desc>Form1098C material improvement certification</Desc>",
  );
  await assertVehicleBundleXsd(xml);
});

for (const certification of ["significant use", "needy transfer"] as const) {
  Deno.test(`Form 8283 Section B ${certification} vehicle emits its exception certification`, async () => {
    const vehicle = sectionBMaterialImprovementVehicle();
    const shared = {
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
      acknowledgment_furnished_date: "2025-06-20",
      vehicle_year: 2018,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Fair condition",
      odometer_miles: 90_000,
      goods_or_services_received: false,
    } as const;
    const item = certification === "significant use"
      ? {
        ...vehicle,
        vehicle_acknowledgment_attachment_file_name: "Form1098C-Exception.pdf",
        vehicle_material_improvement_acknowledgment: undefined,
        vehicle_significant_use_acknowledgment: {
          ...shared,
          no_transfer_before_completion_confirmed: true as const,
          intended_use_description: "Deliver meals to needy residents daily",
          intended_use_duration: "one year",
          regularly_conducted_charitable_activity_confirmed: true as const,
          substantial_nonincidental_use_confirmed: true as const,
        },
      }
      : {
        ...vehicle,
        vehicle_acknowledgment_attachment_file_name: "Form1098C-Exception.pdf",
        vehicle_material_improvement_acknowledgment: undefined,
        vehicle_needy_transfer_acknowledgment: {
          ...shared,
          vehicle_to_be_transferred_to_needy_confirmed: true as const,
          transfer_for_significantly_below_fmv_confirmed: true as const,
          direct_charitable_transportation_purpose_confirmed: true as const,
        },
      };
    const bytes = await acknowledgmentPdf();
    const bundle = await buildMefBundle({
      f8283: { section_b_items: [await withSignedForm(item, bytes)] },
    }, {
      filer: testFiler(),
      attachments: [
        {
          fileName: "Form1098C-Exception.pdf",
          description: `Form1098C ${certification} certification`,
          bytes,
        },
        {
          fileName: "Form8283AppraiserSignature.pdf",
          description: "Form 8283 appraiser signature document",
          bytes,
        },
        {
          fileName: "Form8283DoneeSignature.pdf",
          description: "Form 8283 Donee signature document",
          bytes,
        },
        signedFormAttachment(bytes),
      ],
    });
    const certificationTag = certification === "significant use"
      ? "CertifiesVehicleNotTrnsfrInd"
      : "CertifiesVehTrnsfrToNeedyInd";
    assertStringIncludes(
      bundle.xml,
      `<${certificationTag}>X</${certificationTag}>`,
    );
    assertStringIncludes(
      bundle.xml,
      'referenceDocumentName="ContemporaneousWrittenAcknowledgmentStatement ContributionsOfMotorVehiclesBoatsAndAirplanesStatement"',
    );
    await assertVehicleBundleXsd(bundle.xml);
  });
}

Deno.test("Form 8283 Section B vehicle refuses missing or mismatched exception evidence", async () => {
  const vehicle = sectionBMaterialImprovementVehicle();
  const bytes = await acknowledgmentPdf();
  const attachments = [
    {
      fileName: "Form1098C-Improvement.pdf",
      description: "Form1098C material improvement certification",
      bytes,
    },
    {
      fileName: "Form8283AppraiserSignature.pdf",
      description: "Form 8283 appraiser signature document",
      bytes,
    },
    {
      fileName: "Form8283DoneeSignature.pdf",
      description: "Form 8283 Donee signature document",
      bytes,
    },
  ];
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...vehicle,
          vehicle_material_improvement_acknowledgment: undefined,
        }],
      }),
    Error,
    "exactly one donee",
  );
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...vehicle,
          vehicle_material_improvement_acknowledgment: {
            ...vehicle.vehicle_material_improvement_acknowledgment,
            acknowledgment_furnished_date: "2025-07-02",
          },
        }],
      }),
    Error,
    "within 30 days",
  );
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...vehicle,
          donee_acknowledgment: {
            ...vehicle.donee_acknowledgment,
            organization_name: "Different Charity",
          },
        }],
      }),
    Error,
    "same organization",
  );
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...vehicle,
          vehicle_acknowledgment_attachment_file_name: undefined,
        }],
      }),
    Error,
    "donee-issued Form 1098-C",
  );
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [vehicle] } }, {
        filer: testFiler(),
        attachments: attachments.slice(1),
      }),
    Error,
    "matching PDF",
  );
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [vehicle] } }, {
        filer: testFiler(),
        attachments: [{
          ...attachments[0],
          description: "Unrelated file",
        }, ...attachments.slice(1)],
      }),
    Error,
    "IRS-approved description",
  );
});

Deno.test("Form 8283 Section B over $500,000 attaches the complete qualified appraisal separately from signatures", async () => {
  const gift = sectionBHighValueEquipmentGift();
  const bytes = await acknowledgmentPdf();
  const bundle = await buildMefBundle({
    f8283: { section_b_items: [await withSignedForm(gift, bytes)] },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "QualifiedAppraisal-Press.pdf",
        description: "Qualified Appraisal industrial printing press",
        bytes,
      },
      {
        fileName: "Form8283AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes,
      },
      {
        fileName: "Form8283DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes,
      },
      signedFormAttachment(bytes),
    ],
  });
  const xml = bundle.xml;
  assertEquals(bundle.attachments.length, 4);
  assertStringIncludes(xml, "<EquipmentInd>X</EquipmentInd>");
  assertStringIncludes(
    xml,
    "<DeductionClaimedAmt>600000</DeductionClaimedAmt>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment2 BinaryAttachment5 BinaryAttachment3 BinaryAttachment4"',
  );
  assertStringIncludes(
    xml,
    "<Desc>Qualified Appraisal industrial printing press</Desc>",
  );
  await assertVehicleBundleXsd(xml);
});

Deno.test("Form 8283 Section B high-value vehicle requires both its donee copy and full appraisal", async () => {
  const vehicle = sectionBMaterialImprovementVehicle();
  const gift = {
    ...vehicle,
    property_description: "2022 Ferrari SF90, excellent condition, 5,000 miles",
    physical_condition: "Excellent condition",
    date_acquired: "2022-05-15",
    cost_or_adjusted_basis: 700_000,
    fmv: 600_000,
    deduction_claimed: 600_000,
    vehicle_vin: "ZFF95NLA0N0275432",
    vehicle_material_improvement_acknowledgment: {
      ...vehicle.vehicle_material_improvement_acknowledgment,
      vehicle_year: 2022,
      vehicle_make: "Ferrari",
      vehicle_model: "SF90",
      vehicle_condition: "Excellent condition",
      odometer_miles: 5_000,
    },
    qualified_appraisal: {
      ...vehicle.qualified_appraisal,
      attachment_file_name: "QualifiedAppraisal-Ferrari.pdf",
    },
  };
  const bytes = await acknowledgmentPdf();
  const bundle = await buildMefBundle({
    f8283: { section_b_items: [await withSignedForm(gift, bytes)] },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "Form1098C-Improvement.pdf",
        description: "Form1098C material improvement certification",
        bytes,
      },
      {
        fileName: "QualifiedAppraisal-Ferrari.pdf",
        description: "Qualified Appraisal donated vehicle",
        bytes,
      },
      {
        fileName: "Form8283AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes,
      },
      {
        fileName: "Form8283DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes,
      },
      signedFormAttachment(bytes),
    ],
  });
  assertEquals(bundle.attachments.length, 5);
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentId="BinaryAttachment3 BinaryAttachment4 BinaryAttachment7 BinaryAttachment5 BinaryAttachment6"',
  );
  assertStringIncludes(
    bundle.xml,
    "<Desc>Qualified Appraisal donated vehicle</Desc>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  await assertVehicleBundleXsd(bundle.xml);
});

Deno.test("Form 8283 high-value gift rejects absent or misdescribed appraisal PDF", async () => {
  const gift = sectionBHighValueEquipmentGift();
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...gift,
          qualified_appraisal: {
            ...gift.qualified_appraisal,
            attachment_file_name: undefined,
          },
        }],
      }),
    Error,
    "needs the full qualified-appraisal PDF",
  );
  const bytes = await acknowledgmentPdf();
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [gift] } }, {
        filer: testFiler(),
        attachments: [
          {
            fileName: "QualifiedAppraisal-Press.pdf",
            description: "Unrelated appraisal",
            bytes,
          },
          {
            fileName: "Form8283AppraiserSignature.pdf",
            description: "Form 8283 appraiser signature document",
            bytes,
          },
          {
            fileName: "Form8283DoneeSignature.pdf",
            description: "Form 8283 Donee signature document",
            bytes,
          },
        ],
      }),
    Error,
    "description beginning Qualified Appraisal",
  );
});

Deno.test("Form 8283 $500,000 boundary does not require a full appraisal attachment", async () => {
  const highValue = sectionBHighValueEquipmentGift();
  const gift = {
    ...highValue,
    fmv: 500_000,
    deduction_claimed: 500_000,
    qualified_appraisal: {
      ...highValue.qualified_appraisal,
      attachment_file_name: undefined,
    },
  };
  const bytes = await acknowledgmentPdf();
  const bundle = await buildMefBundle({
    f8283: { section_b_items: [await withSignedForm(gift, bytes)] },
  }, {
    filer: testFiler(),
    attachments: [
      {
        fileName: "Form8283AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes,
      },
      {
        fileName: "Form8283DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes,
      },
      signedFormAttachment(bytes),
    ],
  });
  assertEquals(bundle.attachments.length, 3);
  assertEquals(bundle.xml.includes("Qualified Appraisal"), false);
  assertStringIncludes(
    bundle.xml,
    "<DeductionClaimedAmt>500000</DeductionClaimedAmt>",
  );
});

Deno.test("Form 8283 Section B requires both correctly described signature PDFs", async () => {
  const gift = {
    property_description: "Antique desk",
    property_type: SectionBPropertyType.Collectibles,
    physical_condition: "Good condition",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-08-21",
    fmv: 8_000,
    deduction_claimed: 8_000,
    cost_or_adjusted_basis: 2_500,
    charitable_limit_category: "noncash_50" as const,
    similar_item_group: "furniture",
    is_capital_gain_property: false,
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-08-20",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      signature_attachment_file_name: "Form8283AppraiserSignature.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Museum",
      ein: "987654321",
      received_date: "2025-08-21",
      signed_by_donee: true as const,
      unrelated_use: false,
      signature_attachment_file_name: "Form8283DoneeSignature.pdf",
      us_address: {
        line1: "2 Museum Way",
        city: "Austin",
        state: "TX",
        zip: "78702",
      },
    },
  };
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...gift,
          qualified_appraisal: {
            ...gift.qualified_appraisal,
            signature_attachment_file_name: undefined,
          },
        }],
      }),
    Error,
    "needs Form 8283 appraiser signature document PDF",
  );
  const bytes = await acknowledgmentPdf();
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [gift] } }, {
        filer: testFiler(),
        attachments: [{
          fileName: "Form8283AppraiserSignature.pdf",
          description: "Form 8283 appraiser signature document",
          bytes,
        }],
      }),
    Error,
    "matching PDF described exactly as Form 8283 Donee signature document",
  );
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [gift] } }, {
        filer: testFiler(),
        attachments: [
          {
            fileName: "Form8283AppraiserSignature.pdf",
            description: "Appraiser signature",
            bytes,
          },
          {
            fileName: "Form8283DoneeSignature.pdf",
            description: "Form 8283 Donee signature document",
            bytes,
          },
        ],
      }),
    Error,
    "matching PDF described exactly as Form 8283 appraiser signature document",
  );
});

Deno.test("Form 8283 still rejects gifts needing unlinked evidence", () => {
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          property_description: "Art",
          fmv: 6_000,
          deduction_claimed: 6_000,
          charitable_limit_category: "noncash_50",
          similar_item_group: "art",
          is_capital_gain_property: false,
        }],
      }),
    Error,
    "needs property, acquisition, qualified appraisal",
  );
  assertThrows(
    () =>
      form8283.build({
        section_a_items: [{
          property_description: "Car",
          fmv: 1_000,
          charitable_limit_category: "noncash_50",
          similar_item_group: "vehicles",
          is_capital_gain_property: false,
          is_vehicle: true,
        }],
      }),
    Error,
    "claimed deduction",
  );
  assertEquals(form8283.build({}), []);
});

Deno.test("Form 8283 needy-transfer vehicle links Form 1098-C and emits native box 5b certification", async () => {
  const bundle = await buildMefBundle({
    f8283: { section_a_items: [needyTransferVehicle()] },
  }, {
    filer: testFiler(),
    attachments: [{
      fileName: "Form1098C-Civic.pdf",
      description: "Form1098C Civic needy transfer certification",
      bytes: await acknowledgmentPdf(),
    }],
  });
  const xml = bundle.xml;
  assertStringIncludes(
    xml,
    "<CertifiesVehTrnsfrToNeedyInd>X</CertifiesVehTrnsfrToNeedyInd>",
  );
  assertEquals(xml.includes("<CertifiesVehSoldToUnrltPrtyInd>"), false);
  assertEquals(xml.includes("<GrossProceedsFromSaleOfVehAmt>"), false);
  assertStringIncludes(xml, ">4500</FairMarketValueAmt>");
  const fmvStatementId = /<FairMarketValueStatement documentId="([^"]+)"/
    .exec(xml)?.[1];
  assertEquals(typeof fmvStatementId, "string");
  assertStringIncludes(
    xml,
    `<FairMarketValueAmt referenceDocumentId="${fmvStatementId}" referenceDocumentName="FairMarketValueStatement QualifiedConservationContributionStmt">4500</FairMarketValueAmt>`,
  );
  assertStringIncludes(
    xml,
    "short-term appreciation of $15500.00",
  );
  assertStringIncludes(
    xml,
    "<Desc>Form1098C Civic needy transfer certification</Desc>",
  );
  assertStringIncludes(
    xml,
    "<AttachmentLocationTxt>Form1098C-Civic.pdf</AttachmentLocationTxt>",
  );
  assertEquals(bundle.attachments.length, 1);
});

Deno.test("Form 8283 significant-use vehicle links donee PDF and emits boxes 5a and 5c", async () => {
  const item = {
    ...needyTransferVehicle(),
    deduction_claimed: 4_800,
    cost_or_adjusted_basis: 4_800,
    vehicle_needy_transfer_acknowledgment: undefined,
    vehicle_significant_use_acknowledgment: {
      copy_received_from_donee: true as const,
      donee_certified: true as const,
      donee_name: "Meals Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
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
  } as const;
  const bundle = await buildMefBundle({
    f8283: { section_a_items: [item] },
  }, {
    filer: testFiler(),
    attachments: [{
      fileName: "Form1098C-Civic.pdf",
      description: "Form1098C Civic significant use certification",
      bytes: await acknowledgmentPdf(),
    }],
  });
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CertifiesDetailedImprvDesc>Deliver meals daily to needy residents; intended duration: one year</CertifiesDetailedImprvDesc>",
  );
  assertEquals(bundle.xml.includes("<GrossProceedsFromSaleOfVehAmt>"), false);
  assertEquals(bundle.xml.includes("<CertifiesVehTrnsfrToNeedyInd>"), false);
  assertStringIncludes(
    bundle.xml,
    "<AttachmentLocationTxt>Form1098C-Civic.pdf</AttachmentLocationTxt>",
  );
  await assertVehicleBundleXsd(bundle.xml);
});

Deno.test("Form 8283 material-improvement vehicle emits donee's box 5c detail", async () => {
  const item = {
    ...needyTransferVehicle(),
    vehicle_needy_transfer_acknowledgment: undefined,
    vehicle_material_improvement_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "Repair Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
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
  } as const;
  const bundle = await buildMefBundle({
    f8283: { section_a_items: [item] },
  }, {
    filer: testFiler(),
    attachments: [{
      fileName: "Form1098C-Civic.pdf",
      description: "Form1098C Civic material improvement certification",
      bytes: await acknowledgmentPdf(),
    }],
  });
  assertStringIncludes(
    bundle.xml,
    "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CertifiesDetailedImprvDesc>Replace failed engine with new engine</CertifiesDetailedImprvDesc>",
  );
  assertEquals(bundle.xml.includes("<CertifiesVehSoldToUnrltPrtyInd>"), false);
  await assertVehicleBundleXsd(bundle.xml);
});

Deno.test("Form 8283 links both native vehicle statement and donee-issued PDF", async () => {
  const bundle = await buildMefBundle({
    f8283: {
      section_a_items: [{
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
        vehicle_acknowledgment_attachment_file_name: "Form1098C-Civic.pdf",
        date_contributed: "2025-06-01",
        date_acquired: "2020-01-01",
        donor_acquisition_description: "Purchase",
        fmv: 20_000,
        deduction_claimed: 15_000,
        cost_or_adjusted_basis: 25_000,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
        fmv_method: FMVMethod.ComparableSales,
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
      }],
    },
  }, {
    filer: testFiler(),
    attachments: [{
      fileName: "Form1098C-Civic.pdf",
      description: "Form1098C Civic acknowledgment from City Charity",
      bytes: await acknowledgmentPdf(),
    }],
  });
  const xml = bundle.xml;
  assertStringIncludes(xml, "<ContriVehicleBoatAirplaneStmt documentId=");
  const statementId = /<ContriVehicleBoatAirplaneStmt documentId="([^"]+)"/
    .exec(
      xml,
    )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  assertStringIncludes(
    xml,
    'referenceDocumentName="ContributionsOfMotorVehiclesBoatsAndAirplanesStatement ContemporaneousWrittenAcknowledgmentStatement"',
  );
  assertStringIncludes(
    xml,
    "<GrossProceedsFromSaleOfVehAmt>15000</GrossProceedsFromSaleOfVehAmt>",
  );
  assertStringIncludes(xml, ">15000</FairMarketValueAmt>");
  const fmvStatementId = /<FairMarketValueStatement documentId="([^"]+)"/
    .exec(xml)?.[1];
  assertEquals(typeof fmvStatementId, "string");
  assertStringIncludes(
    xml,
    `<FairMarketValueAmt referenceDocumentId="${fmvStatementId}" referenceDocumentName="FairMarketValueStatement QualifiedConservationContributionStmt">15000</FairMarketValueAmt>`,
  );
  assertStringIncludes(xml, "unreduced FMV $20000.00");
  assertStringIncludes(xml, "gross proceeds $15000.00");
  assertEquals(
    xml.includes("<FairMarketValueAmt>20000</FairMarketValueAmt>"),
    false,
  );
  assertStringIncludes(xml, "<VIN>1HGBH41JXMN109186</VIN>");
  assertStringIncludes(
    xml,
    "<Desc>Form1098C Civic acknowledgment from City Charity</Desc>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment DeductionsTakenUnderSection170Stmt DoneesSignatureUnavailableStmt"',
  );
  assertEquals(bundle.attachments.length, 1);
  await assertVehicleBundleXsd(xml);
});
