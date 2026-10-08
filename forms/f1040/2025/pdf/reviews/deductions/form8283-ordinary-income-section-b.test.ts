import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  inputSchema as form8283SourceSchema,
  SectionBPropertyType,
} from "../../../../nodes/inputs/f8283/index.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import type { MefFormsPending } from "../../../mef/types.ts";
import { buildPdfBytes } from "../../builder.ts";
import { form8283Pdf } from "../../forms/deductions/f8283.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-section-a-capital-gain-reduction-gift"
)!;

async function evidence(label: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawText(`Synthetic test evidence: ${label}`, {
    x: 48,
    y: 740,
    font: await pdf.embedFont(StandardFonts.Helvetica),
    size: 11,
  });
  return pdf.save();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

for (
  const [propertyType, appraisedFmv, basis, reason] of [
    [
      SectionBPropertyType.Equipment,
      18_000,
      12_000,
      "purchased_short_term_capital_asset",
    ],
    [
      SectionBPropertyType.ArtUnder20000,
      18_000,
      12_000,
      "purchased_short_term_capital_asset",
    ],
    [
      SectionBPropertyType.ArtAtLeast20000,
      25_000,
      22_000,
      "purchased_short_term_capital_asset",
    ],
    [
      SectionBPropertyType.Collectibles,
      18_000,
      12_000,
      "purchased_short_term_capital_asset",
    ],
    [
      SectionBPropertyType.Securities,
      18_000,
      12_000,
      "purchased_short_term_capital_asset",
    ],
    [
      SectionBPropertyType.OtherRealEstate,
      18_000,
      12_000,
      "purchased_short_term_capital_asset",
    ],
    [SectionBPropertyType.Equipment, 18_000, 12_000, "purchased_inventory"],
  ] as const
) {
  Deno.test(`Section B ${reason} ${propertyType} source routing and reviewed native/PDF`, async () => {
    const acquiredDate = reason === "purchased_inventory"
      ? "2023-01-15"
      : "2025-01-15";
    const securityDescription = "100 Common shares of Cedar Grove Inc";
    const purchase = await evidence(
      `invoice and basis $${basis}, ${acquiredDate}; ${
        propertyType === "securities"
          ? `${securityDescription}, issuer EIN 111223333`
          : "inventory cost ledger INV-15"
      }`,
    );
    const appraisal = await evidence(
      `signed appraisal: ${
        propertyType === "securities" ? securityDescription : propertyType
      } FMV $${appraisedFmv}`,
    );
    const signedForm = await evidence(
      `completed signed Form 8283 for ${
        propertyType === "securities" ? securityDescription : propertyType
      }`,
    );
    const reduction = await evidence(
      `FMV $${appraisedFmv} less ordinary-income gain $${
        appraisedFmv - basis
      } equals claim $${basis}`,
    );
    const appraiserSignature = await evidence("appraiser signature");
    const doneeSignature = await evidence("donee signature");
    const address = {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    };
    const item = {
      property_description: propertyType === "equipment"
        ? reason === "purchased_inventory"
          ? "Retail audio equipment stock, serial INV-15"
          : "Unused personal audio equipment, serial ST-8283"
        : propertyType === "art_under_20000" ||
            propertyType === "art_at_least_20000"
        ? "Purchased framed painting, catalog ST-8283"
        : propertyType === "other_real_estate"
        ? "Purchased unimproved vacant investment parcel ST-8283"
        : propertyType === "securities"
        ? securityDescription
        : "Purchased rare coin, catalog ST-8283",
      property_type: propertyType,
      physical_condition: propertyType === "securities"
        ? undefined
        : propertyType === "other_real_estate"
        ? "Unimproved vacant land"
        : "Good used condition",
      ...(propertyType === "securities"
        ? {
          nonpublic_security: {
            issuer_name: "Cedar Grove Inc",
            issuer_ein: "111223333",
            share_class: "Common",
            shares_contributed: 100,
            nonpublicly_traded_confirmed: true,
            c_corporation_stock_confirmed: true,
            single_purchase_lot_confirmed: true,
          },
        }
        : {}),
      ...(propertyType === "other_real_estate"
        ? { investment_land_unimproved_confirmed: true }
        : {}),
      date_acquired: acquiredDate,
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv: appraisedFmv,
      deduction_claimed: basis,
      cost_or_adjusted_basis: basis,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
      signed_form_attachment_file_name: "Signed8283.pdf",
      signed_form_source_review: {
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(signedForm),
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
        us_address: address,
        signature_attachment_file_name: "AppraiserSignature.pdf",
        attachment_file_name: "FullAppraisal.pdf",
        full_appraisal_source_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(appraisal),
          signed_appraisal_confirmed: true,
          donated_property_matches_confirmed: true,
          appraised_fmv_matches_confirmed: true,
        },
      },
      donee_acknowledgment: {
        organization_name: "City Charity",
        ein: "987654321",
        received_date: "2025-06-01",
        signed_by_donee: true,
        unrelated_use: false,
        us_address: address,
        signature_attachment_file_name: "DoneeSignature.pdf",
      },
      ordinary_income_reduction: {
        reason,
        gain_removed: appraisedFmv - basis,
        purchase_record_attachment_file_name: "PurchaseRecord.pdf",
        ...(reason === "purchased_inventory"
          ? { inventory_cost_record_reference: "INV-15" }
          : {}),
        purchase_record_review: reason === "purchased_inventory"
          ? {
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2025-09-01",
            pdf_sha256: await sha256(purchase),
            property_dates_basis_match_confirmed: true,
            inventory_cost_record_matches_pdf_confirmed: true,
            held_for_sale_to_customers_confirmed: true,
            cost_basis_not_previously_deducted_confirmed: true,
            no_enhanced_corporate_deduction_confirmed: true,
          }
          : {
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2025-09-01",
            pdf_sha256: await sha256(purchase),
            property_dates_basis_match_confirmed: true,
            ...(propertyType === "securities"
              ? { security_issuer_and_lot_match_confirmed: true }
              : {}),
            capital_asset_not_inventory_confirmed: true,
            no_depreciation_or_recapture_confirmed: true,
            donor_did_not_create_property_confirmed: true,
          },
        reduction_statement_attachment_file_name: "ReductionStatement.pdf",
        reduction_statement_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(reduction),
          property_and_fmv_match_confirmed: true,
          basis_and_gain_match_confirmed: true,
          reduced_claim_matches_confirmed: true,
        },
      },
    } as const;
    if (reason === "purchased_inventory") {
      assertEquals(
        form8283SourceSchema.safeParse({ section_b_items: [item] }).success,
        false,
      );
      return;
    }
    const result = execute(buildExecutionPlan(registry), registry, {
      ...base.inputs,
      schedule_a: {
        line_5a_state_income_tax: 24_000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: { section_b_items: [item] },
    }, { taxYear: 2025, formType: "f1040" });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      basis,
    );
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      24_000 + basis,
    );
    const pending = buildPending(result.pending);
    const pdfPending = {
      f8283: pending.f8283!,
      schedule_a: pending.schedule_a!,
      f1040: pending.f1040!,
    };
    // These negative cases deliberately violate the parsed Form 8283 input.
    const invalidGift = (gift: unknown): MefFormsPending => ({
      ...pending,
      f8283: { section_b_items: [gift] },
    } as MefFormsPending);
    const attachments = [
      {
        fileName: "PurchaseRecord.pdf",
        description: "Form 8283 Section B purchase and basis record",
        bytes: purchase,
      },
      {
        fileName: "FullAppraisal.pdf",
        description: `Qualified Appraisal for Section B ${propertyType}`,
        bytes: appraisal,
      },
      {
        fileName: "Signed8283.pdf",
        description: "Form 8283 completed signed Section B",
        bytes: signedForm,
      },
      {
        fileName: "ReductionStatement.pdf",
        description: "Form 8283 Section B FMV reduction statement",
        bytes: reduction,
      },
      {
        fileName: "AppraiserSignature.pdf",
        description: "Form 8283 appraiser signature document",
        bytes: appraiserSignature,
      },
      {
        fileName: "DoneeSignature.pdf",
        description: "Form 8283 Donee signature document",
        bytes: doneeSignature,
      },
    ];
    const bundle = await buildMefBundle(pending, {
      filer: base.filer,
      attachments,
    });
    assertStringIncludes(
      bundle.xml,
      `<AppraisedFairMarketValueAmt>${appraisedFmv}</AppraisedFairMarketValueAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<DeductionClaimedAmt>${basis}</DeductionClaimedAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<OtherThanByCashOrCheckAmt>${basis}</OtherThanByCashOrCheckAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      propertyType === "equipment"
        ? "<EquipmentInd>X</EquipmentInd>"
        : propertyType === "art_under_20000"
        ? "<ArtWorthLssThan20000DollarsInd>X</ArtWorthLssThan20000DollarsInd>"
        : propertyType === "art_at_least_20000"
        ? "<ArtWorthAtLeast20000DollarsInd>X</ArtWorthAtLeast20000DollarsInd>"
        : propertyType === "other_real_estate"
        ? "<OtherRealEstateInd>X</OtherRealEstateInd>"
        : propertyType === "securities"
        ? "<SecuritiesInd>X</SecuritiesInd>"
        : "<CollectiblesInd>X</CollectiblesInd>",
    );
    const [projected] = form8283Pdf.instances!(
      pending.f8283!,
      base.filer,
      pdfPending,
    );
    assertEquals(
      projected.section_b_collectibles,
      propertyType === "collectibles",
    );
    assertEquals(projected.section_b_securities, propertyType === "securities");
    if (propertyType === "securities") {
      assertStringIncludes(
        (projected.reduction_statements as string[])[0],
        "issuer EIN 111223333",
      );
    }
    assertEquals(
      projected.section_b_art_at_least_20000,
      propertyType === "art_at_least_20000",
    );
    assertEquals(
      projected.section_b_other_real_estate,
      propertyType === "other_real_estate",
    );
    assertEquals(projected.section_b_claim, basis);
    const filled = await buildPdfBytes(
      pending,
      base.filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(filled)).getPageCount() > 0, true);
    await assertRejects(
      () =>
        buildMefBundle(pending, {
          filer: base.filer,
          attachments: attachments.map((entry) =>
            entry.fileName === "ReductionStatement.pdf"
              ? { ...entry, bytes: purchase }
              : entry
          ),
        }),
      Error,
      "bytes differ from reviewed SHA-256",
    );
    await assertRejects(
      () =>
        buildMefBundle(pending, {
          filer: base.filer,
          attachments: attachments.map((entry) =>
            entry.fileName === "FullAppraisal.pdf"
              ? { ...entry, bytes: purchase }
              : entry
          ),
        }),
      Error,
    );
    await assertRejects(
      () =>
        buildMefBundle(pending, {
          filer: base.filer,
          attachments: attachments.map((entry) =>
            entry.fileName === "Signed8283.pdf"
              ? { ...entry, bytes: purchase }
              : entry
          ),
        }),
      Error,
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          f1040: { ...pending.f1040, line12e_itemized_deductions: 35_999 },
        }, { filer: base.filer, attachments }),
      Error,
      "itemized total",
    );
    if (propertyType === "other_real_estate") {
      await assertRejects(
        () =>
          buildMefBundle(
            invalidGift({
              ...item,
              investment_land_unimproved_confirmed: undefined,
            }),
            { filer: base.filer, attachments },
          ),
        Error,
        "short-term unimproved land",
      );
      await assertRejects(
        () =>
          buildMefBundle(
            invalidGift({
              ...item,
              date_acquired: "2023-01-15",
            }),
            { filer: base.filer, attachments },
          ),
        Error,
        "short-term unimproved land",
      );
    }
    if (propertyType === "securities") {
      await assertRejects(
        () =>
          buildMefBundle(
            invalidGift({
              ...item,
              ordinary_income_reduction: {
                ...item.ordinary_income_reduction,
                purchase_record_review: {
                  ...item.ordinary_income_reduction.purchase_record_review,
                  security_issuer_and_lot_match_confirmed: undefined,
                },
              },
            }),
            { filer: base.filer, attachments },
          ),
        Error,
      );
      await assertRejects(
        () =>
          buildMefBundle(
            invalidGift({
              ...item,
              nonpublic_security: {
                ...item.nonpublic_security,
                nonpublicly_traded_confirmed: false,
              },
            }),
            { filer: base.filer, attachments },
          ),
        Error,
      );
      await assertRejects(
        () =>
          buildMefBundle(
            invalidGift({
              ...item,
              property_description: "100 Preferred shares of Cedar Grove Inc",
            }),
            { filer: base.filer, attachments },
          ),
        Error,
      );
    }
  });
}
