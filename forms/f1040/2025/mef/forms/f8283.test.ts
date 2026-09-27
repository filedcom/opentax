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
      },
      {
        property_description: "Books",
        fmv: 125,
        fmv_method: FMVMethod.ComparableSales,
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
    fmv: 20_000,
    deduction_claimed: 4_500,
    vehicle_needy_transfer_acknowledgment: {
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
}

Deno.test("Form 8283 Section A includes VIN without a donee PDF for a vehicle claimed at $500 or less", async () => {
  const bundle = await buildMefBundle({
    f8283: {
      section_a_items: [{
        property_description: "2014 sedan, fair condition, 90,000 miles",
        fmv: 500,
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
        needyTransferVehicle("1HGBH41JXMN109186", "Form1098C-First.pdf"),
        needyTransferVehicle("1HGBH41JXMN109187", "Form1098C-Second.pdf"),
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
    'referenceDocumentId="BinaryAttachment2 BinaryAttachment3"',
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
    '<BinaryAttachment documentId="BinaryAttachment2">',
  );
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment2"');
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
  const docs = form8283.build({
    section_b_items: [gift, { ...gift, property_description: "Antique chair" }],
  }, {
    attachmentDescriptionsByFileName: {
      "Form8283AppraiserSignature.pdf":
        "Form 8283 appraiser signature document",
      "Form8283DoneeSignature.pdf": "Form 8283 Donee signature document",
    },
    documentIdsByAttachmentFileName: {
      "Form8283AppraiserSignature.pdf": "BinaryAttachmentAppraiser",
      "Form8283DoneeSignature.pdf": "BinaryAttachmentDonee",
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
    'referenceDocumentId="BinaryAttachmentAppraiser BinaryAttachmentDonee"',
  );
  assertStringIncludes(docs[1], "Antique chair");
  assertStringIncludes(
    docs[1],
    'referenceDocumentId="BinaryAttachmentAppraiser BinaryAttachmentDonee"',
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
    ],
  });
  const xml = bundle.xml;
  assertEquals(bundle.attachments.length, 2);
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachment2 BinaryAttachment3"',
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
  assertStringIncludes(xml, "<FairMarketValueAmt>20000</FairMarketValueAmt>");
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

Deno.test("Form 8283 links both native vehicle statement and donee-issued PDF", async () => {
  const bundle = await buildMefBundle({
    f8283: {
      section_a_items: [{
        property_description: "2020 Honda Civic, good condition, 60,000 miles",
        is_vehicle: true,
        vehicle_vin: "1HGBH41JXMN109186",
        vehicle_acknowledgment_attachment_file_name: "Form1098C-Civic.pdf",
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
