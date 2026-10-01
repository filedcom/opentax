import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-section-a-capital-gain-reduction-gift"
)!;
const plan = buildExecutionPlan(registry);

async function syntheticEvidence(label: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(`Synthetic test evidence: ${label}`, {
    x: 48,
    y: 740,
    size: 11,
    font,
  });
  return document.save();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

for (
  const route of [
    "material improvement",
    "significant use",
    "needy transfer",
  ] as const
) {
  Deno.test(`Section B ${route} vehicle joins full return, attachments, XSD and PDF`, async () => {
    const acknowledgment = await syntheticEvidence(
      `City Charity certified ${route} for 2018 Honda Civic`,
    );
    const signature = await syntheticEvidence(
      "mock appraiser Jane Smith and City Charity signatures",
    );
    const completedForm = await syntheticEvidence(
      "test-only Form 8283 with mock appraiser and donee signatures",
    );
    const vehicle = {
      property_description: "2018 Honda Civic, fair condition, 90,000 miles",
      property_type: "vehicle",
      physical_condition: "Fair condition; engine needs replacement",
      date_acquired: "2018-05-15",
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv: 15_000,
      deduction_claimed: 15_000,
      cost_or_adjusted_basis: 18_000,
      charitable_limit_category: "noncash_50",
      similar_item_group: "vehicles",
      is_capital_gain_property: false,
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
        intended_improvement_description: "Replace failed engine",
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
      signed_form_attachment_file_name: "CompletedSignedForm8283.pdf",
      signed_form_source_review: {
        reviewed_by: "Synthetic test reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(completedForm),
        appraiser_signature_present: true,
        donee_signature_present: true,
        matches_electronic_form_confirmed: true,
      },
      qualified_appraisal: {
        appraiser_first_name: "Jane",
        appraiser_last_name: "Smith",
        signed_date: "2025-05-28",
        appraiser_ein: "123456789",
        signed_by_appraiser: true,
        signature_attachment_file_name: "AppraiserSignature.pdf",
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
        signed_by_donee: true,
        unrelated_use: false,
        signature_attachment_file_name: "DoneeSignature.pdf",
        us_address: {
          line1: "1 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
      },
    };
    const shared = vehicle.vehicle_material_improvement_acknowledgment;
    const routeVehicle = route === "material improvement"
      ? vehicle
      : route === "significant use"
      ? {
        ...vehicle,
        vehicle_acknowledgment_attachment_file_name:
          "Form1098C-SignificantUse.pdf",
        vehicle_material_improvement_acknowledgment: undefined,
        vehicle_significant_use_acknowledgment: {
          ...shared,
          intended_improvement_description: undefined,
          major_repair_or_addition_confirmed: undefined,
          significant_value_increase_confirmed: undefined,
          no_additional_donor_payment_confirmed: undefined,
          intended_use_description: "Deliver meals to needy residents daily",
          intended_use_duration: "one year",
          regularly_conducted_charitable_activity_confirmed: true,
          substantial_nonincidental_use_confirmed: true,
        },
      }
      : {
        ...vehicle,
        vehicle_acknowledgment_attachment_file_name:
          "Form1098C-NeedyTransfer.pdf",
        vehicle_material_improvement_acknowledgment: undefined,
        vehicle_needy_transfer_acknowledgment: {
          ...shared,
          no_transfer_before_completion_confirmed: undefined,
          intended_improvement_description: undefined,
          major_repair_or_addition_confirmed: undefined,
          significant_value_increase_confirmed: undefined,
          no_additional_donor_payment_confirmed: undefined,
          vehicle_to_be_transferred_to_needy_confirmed: true,
          transfer_for_significantly_below_fmv_confirmed: true,
          direct_charitable_transportation_purpose_confirmed: true,
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
      f8283: { section_b_items: [routeVehicle] },
    };
    const result = execute(plan, registry, inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      15_000,
    );
    assertEquals(result.pending.f1040.line12e_itemized_deductions, 51_000);
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: base.filer,
      attachments: [
        {
          fileName: routeVehicle.vehicle_acknowledgment_attachment_file_name,
          description: `Form1098C ${route} certification`,
          bytes: acknowledgment,
        },
        {
          fileName: vehicle.qualified_appraisal.signature_attachment_file_name,
          description: "Form 8283 appraiser signature document",
          bytes: signature,
        },
        {
          fileName: vehicle.donee_acknowledgment.signature_attachment_file_name,
          description: "Form 8283 Donee signature document",
          bytes: signature,
        },
        {
          fileName: vehicle.signed_form_attachment_file_name,
          description: "Form 8283 completed signed Section B",
          bytes: completedForm,
        },
      ],
    });
    assertStringIncludes(bundle.xml, "<VehicleInd>X</VehicleInd>");
    assertStringIncludes(
      bundle.xml,
      route === "needy transfer"
        ? "<CertifiesVehTrnsfrToNeedyInd>X</CertifiesVehTrnsfrToNeedyInd>"
        : "<CertifiesVehicleNotTrnsfrInd>X</CertifiesVehicleNotTrnsfrInd>",
    );
    assertStringIncludes(
      bundle.xml,
      "<AppraisedFairMarketValueAmt>15000</AppraisedFairMarketValueAmt>",
    );
    assertStringIncludes(
      bundle.xml,
      "<DeductionClaimedAmt>15000</DeductionClaimedAmt>",
    );
    assertStringIncludes(
      bundle.xml,
      "<OtherThanByCashOrCheckAmt>15000</OtherThanByCashOrCheckAmt>",
    );
    assertStringIncludes(
      bundle.xml,
      "<TotalItemizedOrStandardDedAmt>51000</TotalItemizedOrStandardDedAmt>",
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
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 6);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-vehicle/",
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(
        `${directory}${route.replaceAll(" ", "-")}.pdf`,
        pdf,
      );
    }
  });
}

for (
  const route of [
    {
      type: "art_at_least_20000",
      description: "Oil painting, early twentieth century",
      condition: "Good condition; minor frame wear",
      xmlTag: "ArtWorthAtLeast20000DollarsInd",
    },
    {
      type: "art_under_20000",
      description: "Oil painting, early twentieth century",
      condition: "Good condition; minor frame wear",
      xmlTag: "ArtWorthLssThan20000DollarsInd",
    },
    {
      type: "equipment",
      description: "Used industrial printing press",
      condition: "Operational, professionally maintained",
      xmlTag: "EquipmentInd",
    },
    {
      type: "collectibles",
      description: "Rare coin collection, circulated grade",
      condition: "Circulated, professionally graded",
      xmlTag: "CollectiblesInd",
    },
    {
      type: "clothing_household",
      description: "Used leather sofa",
      condition: "Good used condition; light wear",
      xmlTag: "ClothingHouseholdItemsInd",
    },
  ] as const
) {
  Deno.test(`Section B purchased ${route.type} joins full return, signed form, XSD and PDF`, async () => {
    const artHigh = route.type === "art_at_least_20000";
    const claim = artHigh ? 25_000 : 12_000;
    const signature = await syntheticEvidence(
      "mock appraiser Jane Smith and City Charity signatures",
    );
    const completedForm = await syntheticEvidence(
      `test-only ${route.type} Form 8283 with mock appraiser and donee signatures`,
    );
    const fullAppraisal = artHigh
      ? await syntheticEvidence("test-only complete signed art appraisal")
      : undefined;
    const equipment = {
      property_description: route.description,
      property_type: route.type,
      physical_condition: route.condition,
      good_used_condition_confirmed: route.type === "clothing_household"
        ? true
        : undefined,
      date_acquired: "2018-05-15",
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv: claim,
      deduction_claimed: claim,
      cost_or_adjusted_basis: artHigh ? 35_000 : 18_000,
      charitable_limit_category: "noncash_50",
      similar_item_group: route.type,
      is_capital_gain_property: false,
      signed_form_attachment_file_name:
        `${route.type}-CompletedSignedForm8283.pdf`,
      signed_form_source_review: {
        reviewed_by: "Synthetic test reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(completedForm),
        appraiser_signature_present: true,
        donee_signature_present: true,
        matches_electronic_form_confirmed: true,
      },
      qualified_appraisal: {
        appraiser_first_name: "Jane",
        appraiser_last_name: "Smith",
        signed_date: "2025-05-28",
        appraiser_ein: "123456789",
        signed_by_appraiser: true,
        signature_attachment_file_name: "EquipmentAppraiserSignature.pdf",
        attachment_file_name: artHigh ? "FullArtAppraisal.pdf" : undefined,
        full_appraisal_source_review: fullAppraisal
          ? {
            reviewed_by: "Synthetic test reviewer",
            reviewed_on: "2025-09-01",
            pdf_sha256: await sha256(fullAppraisal),
            signed_appraisal_confirmed: true,
            donated_property_matches_confirmed: true,
            appraised_fmv_matches_confirmed: true,
          }
          : undefined,
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
        signed_by_donee: true,
        unrelated_use: false,
        signature_attachment_file_name: "EquipmentDoneeSignature.pdf",
        us_address: {
          line1: "1 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
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
      f8283: { section_b_items: [equipment] },
    };
    const result = execute(plan, registry, inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      claim,
    );
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      36_000 + claim,
    );
    const pending = buildPending(result.pending);
    const attachments = [
      {
        fileName: equipment.qualified_appraisal.signature_attachment_file_name,
        description: "Form 8283 appraiser signature document",
        bytes: signature,
      },
      {
        fileName: equipment.donee_acknowledgment.signature_attachment_file_name,
        description: "Form 8283 Donee signature document",
        bytes: signature,
      },
      {
        fileName: equipment.signed_form_attachment_file_name,
        description: "Form 8283 completed signed Section B",
        bytes: completedForm,
      },
      ...(fullAppraisal
        ? [{
          fileName: "FullArtAppraisal.pdf",
          description: "Qualified Appraisal for art valued at $20,000 or more",
          bytes: fullAppraisal,
        }]
        : []),
    ];
    const bundle = await buildMefBundle(pending, {
      filer: base.filer,
      attachments,
    });
    if (fullAppraisal) {
      await assertRejects(
        () =>
          buildMefBundle(pending, {
            filer: base.filer,
            attachments: attachments.map((attachment) =>
              attachment.fileName === "FullArtAppraisal.pdf"
                ? { ...attachment, bytes: signature }
                : attachment
            ),
          }),
        Error,
        "full qualified-appraisal PDF bytes do not match",
      );
    }
    assertEquals(bundle.attachments.length, artHigh ? 4 : 3);
    assertStringIncludes(bundle.xml, `<${route.xmlTag}>X</${route.xmlTag}>`);
    assertStringIncludes(
      bundle.xml,
      `<AppraisedFairMarketValueAmt>${claim}</AppraisedFairMarketValueAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<DeductionClaimedAmt>${claim}</DeductionClaimedAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<OtherThanByCashOrCheckAmt>${claim}</OtherThanByCashOrCheckAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<TotalItemizedOrStandardDedAmt>${
        36_000 + claim
      }</TotalItemizedOrStandardDedAmt>`,
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
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 6);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-${route.type}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
    }
  });
}
