import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema as form8283InputSchema } from "../../nodes/inputs/f8283/index.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { form8283Pdf } from "./forms/f8283.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

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

for (const reduced of [false, true]) {
  Deno.test(`two similar Section B art gifts${reduced ? " with one short-term reduction" : ""} reconcile Schedule A, Form 1040, MeF, and PDF`, async () => {
    const address = {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    };
    const attachments: {
      fileName: string;
      description: string;
      bytes: Uint8Array;
    }[] = [];
    const items: Array<
      Record<string, unknown> & {
        donee_acknowledgment: Record<string, unknown>;
        ordinary_income_reduction?: Record<string, unknown>;
      }
    > = [];
    for (
      const [index, amount, doneeEin] of [
        [1, 22_000, "987654321"],
        [2, 24_000, "987654322"],
      ] as const
    ) {
      const appraisedFmv = reduced && index === 2 ? 27_000 : amount;
      const signedForm = await evidence(`signed Form 8283 for art ${index}`);
      const appraisal = await evidence(
        `signed appraisal for art ${index}: $${appraisedFmv}`,
      );
      const appraiserSignature = await evidence(`appraiser signature ${index}`);
      const doneeSignature = await evidence(`donee signature ${index}`);
      const purchase = reduced && index === 2
        ? await evidence("purchase art 2 basis $24000")
        : undefined;
      const reduction = reduced && index === 2
        ? await evidence("art 2 FMV $27000 minus gain $3000 equals $24000")
        : undefined;
      attachments.push(
        {
          fileName: `Signed8283-${index}.pdf`,
          description: `Form 8283 completed signed Section B: art ${index}`,
          bytes: signedForm,
        },
        {
          fileName: `Appraisal-${index}.pdf`,
          description:
            `Qualified Appraisal for Section B art_at_least_20000 item ${index}`,
          bytes: appraisal,
        },
        {
          fileName: `AppraiserSignature-${index}.pdf`,
          description: `Form 8283 appraiser signature document: art ${index}`,
          bytes: appraiserSignature,
        },
        {
          fileName: `DoneeSignature-${index}.pdf`,
          description: `Form 8283 Donee signature document: art ${index}`,
          bytes: doneeSignature,
        },
      );
      items.push({
        property_description: `Purchased framed painting catalog ART-${index}`,
        property_type: "art_at_least_20000",
        similar_item_group: "framed paintings",
        physical_condition: "Excellent",
        date_acquired: "2025-01-15",
        donor_acquisition_description: "Purchase",
        date_contributed: "2025-06-01",
        fmv: appraisedFmv,
        deduction_claimed: amount,
        cost_or_adjusted_basis: amount,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
        signed_form_attachment_file_name: `Signed8283-${index}.pdf`,
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
          signature_attachment_file_name: `AppraiserSignature-${index}.pdf`,
          attachment_file_name: `Appraisal-${index}.pdf`,
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
          organization_name: `City Museum ${index}`,
          ein: doneeEin,
          received_date: "2025-06-01",
          signed_by_donee: true,
          unrelated_use: false,
          us_address: address,
          signature_attachment_file_name: `DoneeSignature-${index}.pdf`,
        },
        ...(purchase && reduction
          ? {
            ordinary_income_reduction: {
              reason: "purchased_short_term_capital_asset",
              gain_removed: 3_000,
              purchase_record_attachment_file_name: "PurchaseRecord-2.pdf",
              purchase_record_review: {
                reviewed_by: "Synthetic reviewer",
                reviewed_on: "2025-09-01",
                pdf_sha256: await sha256(purchase),
                property_dates_basis_match_confirmed: true,
                capital_asset_not_inventory_confirmed: true,
                no_depreciation_or_recapture_confirmed: true,
                donor_did_not_create_property_confirmed: true,
              },
              reduction_statement_attachment_file_name:
                "ReductionStatement-2.pdf",
              reduction_statement_review: {
                reviewed_by: "Synthetic reviewer",
                reviewed_on: "2025-09-01",
                pdf_sha256: await sha256(reduction),
                property_and_fmv_match_confirmed: true,
                basis_and_gain_match_confirmed: true,
                reduced_claim_matches_confirmed: true,
              },
            },
          }
          : {}),
      });
      if (purchase && reduction) {
        attachments.push(
          {
            fileName: "PurchaseRecord-2.pdf",
            description: "Form 8283 Section B purchase and basis record",
            bytes: purchase,
          },
          {
            fileName: "ReductionStatement-2.pdf",
            description: "Form 8283 Section B FMV reduction statement",
            bytes: reduction,
          },
        );
      }
    }
    const typedItems = form8283InputSchema.parse({ section_b_items: items })
      .section_b_items!;
    const result = execute(buildExecutionPlan(registry), registry, {
      ...base.inputs,
      schedule_a: {
        line_5a_state_income_tax: 24_000,
        line_8a_mortgage_interest_1098: 12_000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: { section_b_items: items },
    }, { taxYear: 2025, formType: "f1040" });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      46_000,
    );
    assertEquals(result.pending.f1040.line12e_itemized_deductions, 82_000);
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: base.filer,
      attachments,
    });
    assertEquals(
      bundle.xml.match(
        /<ArtWorthAtLeast20000DollarsInd>X<\/ArtWorthAtLeast20000DollarsInd>/g,
      )?.length,
      2,
    );
    assertStringIncludes(
      bundle.xml,
      "<OtherThanByCashOrCheckAmt>46000</OtherThanByCashOrCheckAmt>",
    );
    if (reduced) {
      assertStringIncludes(
        bundle.xml,
        "<AppraisedFairMarketValueAmt>27000</AppraisedFairMarketValueAmt>",
      );
      assertStringIncludes(
        bundle.xml,
        "<DeductionClaimedAmt>24000</DeductionClaimedAmt>",
      );
    }
    const projected = form8283Pdf.instances!(
      pending.f8283!,
      base.filer,
      {
        f8283: pending.f8283!,
        schedule_a: pending.schedule_a!,
        f1040: pending.f1040!,
      },
    );
    assertEquals(projected.length, 2);
    assertEquals(projected.map((item) => item.section_b_claim), [
      22_000,
      24_000,
    ]);
    if (reduced) {
      assertEquals(projected[1]?.section_b_appraised_fmv, 27_000);
      assertStringIncludes(
        String(projected[1]?.reduction_statements),
        "section 170(e)(1)(A)",
      );
    }
    await assertRejects(
      () =>
        buildMefBundle(pending, {
          filer: base.filer,
          attachments: attachments.map((entry) =>
            entry.fileName === "Appraisal-2.pdf"
              ? { ...entry, bytes: attachments[1]!.bytes }
              : entry
          ),
        }),
      Error,
      "bytes do not match",
    );
    await assertRejects(
      () =>
        buildMefBundle(pending, {
          filer: base.filer,
          attachments: attachments.map((entry) =>
            entry.fileName === "Signed8283-2.pdf"
              ? { ...entry, bytes: attachments[0]!.bytes }
              : entry
          ),
        }),
      Error,
      "bytes do not match",
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          f1040: { ...pending.f1040, line12e_itemized_deductions: 81_999 },
        }, { filer: base.filer, attachments }),
      Error,
      "itemized total",
    );
    await assertRejects(
      () =>
        buildMefBundle({
          ...pending,
          f8283: {
            section_b_items: [typedItems[0], {
              ...typedItems[1],
              donee_acknowledgment: {
                ...typedItems[1]!.donee_acknowledgment!,
                ein: "987654321",
              },
            }],
          },
        }, { filer: base.filer, attachments }),
      Error,
      reduced
        ? "two separately sourced Section B gifts"
        : "distinct signed/appraised similar-art sources and donees",
    );
    if (reduced) {
      await assertRejects(
        () =>
          buildMefBundle(pending, {
            filer: base.filer,
            attachments: attachments.map((entry) =>
              entry.fileName === "ReductionStatement-2.pdf"
                ? { ...entry, bytes: attachments[0]!.bytes }
                : entry
            ),
          }),
        Error,
        "bytes differ",
      );
      await assertRejects(
        () =>
          buildMefBundle({
            ...pending,
            f8283: {
              section_b_items: [typedItems[0], {
                ...typedItems[1],
                ordinary_income_reduction: {
                  ...typedItems[1]!.ordinary_income_reduction!,
                  gain_removed: 2_999,
                },
              }],
            },
          }, { filer: base.filer, attachments }),
        Error,
        "ordinary-income",
      );
    }
  });
}
