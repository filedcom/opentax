import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema as form8283InputSchema } from "../../../../nodes/inputs/f8283/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../../nodes/types.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";

const inventoryFiler: FilerIdentity = {
  primarySSN: "111223333",
  firstName: "Alex",
  lastName: "Example",
  firstNameWithInitial: "Alex",
  fullName: "Alex Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

const inventoryGeneral = {
  filing_status: SourceFilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  child_eic_filer_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    relationship_age_residence_record_reference:
      "Synthetic 2025 filer family and residence review",
  },
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "Synthetic IRS account transcript review",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
    spouse_status_record_reference: "Synthetic 2025 spouse status review",
  },
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};

const base = {
  filer: inventoryFiler,
  inputs: {
    general: inventoryGeneral,
    w2: [{
      box1_wages: 100000,
      box2_fed_withheld: 16000,
      employee_ssn: "111-22-3333",
      box3_ss_wages: 100000,
      box4_ss_withheld: 6200,
      box5_medicare_wages: 100000,
      box6_medicare_withheld: 1450,
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Employer Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
  },
};

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function reviewedGiftInventory(
  count: number,
  sameDonee = false,
  mixed = false,
  smallGrouped = false,
  withSectionA = false,
  jointOwners = false,
  sharedAppraisal = false,
  sharedSignedForm = false,
  lowValueGrouped = false,
) {
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
      ordinary_income_reduction: Record<string, unknown>;
    }
  > = [];
  for (let index = 1; index <= count; index++) {
    const fmv = lowValueGrouped && index === 1
        ? 400
        : smallGrouped
        ? 4000 + 100 * index
        : 9000 + 100 * index,
      basis = lowValueGrouped && index === 1
        ? 200
        : smallGrouped
        ? 2000 + 100 * index
        : 6000 + 100 * index;
    const doneeEin = sameDonee ? "987654321" : String(987654320 + index);
    const names = {
      purchase: `Purchase-${index}.pdf`,
      appraisal: `Appraisal-${index}.pdf`,
      signed: `Signed8283-${index}.pdf`,
      reduction: `Reduction-${index}.pdf`,
      appraiser: `Appraiser-${index}.pdf`,
      donee: `Donee-${index}.pdf`,
    };
    const property = mixed && index % 2 === 0
      ? `Purchased painting lot ART-${index}`
      : `Purchased audio equipment lot EQ-${index}`;
    const donorName = jointOwners && index % 2 === 1
      ? "Sam Example"
      : "Alex Example";
    const donorSsn = jointOwners && index % 2 === 1 ? "444556666" : "111223333";
    const sourceFacts = {
      property,
      propertyType: mixed && index % 2 === 0 ? "art_under_20000" : "equipment",
      fmv,
      basis,
      donorName,
      donorSsn,
      filerName: jointOwners ? "ALEX AND SAM EXAMPLE" : "ALEX EXAMPLE",
      filerSsn: "111223333",
      doneeName: `City Charity ${sameDonee ? 1 : index}`,
      doneeEin,
      acquired: "2025-01-15",
      contributed: "2025-06-01",
    };
    const purchase = await giftSourceRecord(
      "Purchase and adjusted basis",
      sourceFacts,
      [
        "Purchase invoice: full title transferred to donor on acquisition date.",
        `Purchase paid: $${basis}; no depreciation, prior deduction or recapture.`,
        "Personally held capital asset; not inventory; not created by donor.",
      ],
    );
    const appraisal = await giftSourceRecord(
      "Qualified appraisal",
      sourceFacts,
      [
        "Effective valuation date: 2025-06-01; signed appraisal: 2025-05-28.",
        "Appraiser: Jane Smith, EIN123456789, 1 Main St, Austin TX78701.",
        `Comparable-sales valuation: $${fmv}; subject property identified above.`,
        "/s/ Jane Smith - simulated fixture signature.",
      ],
    );
    const signed = await completed8283Source(sourceFacts);
    const reduction = await giftSourceRecord(
      "FMV reduction computation",
      sourceFacts,
      [
        `Section170(e)(1)(A): short-term ordinary gain $${fmv - basis}.`,
        `FMV $${fmv} minus gain $${fmv - basis} = claimed basis $${basis}.`,
        "Hypothetical gain wholly ordinary; no other reduction applies.",
      ],
    );
    const appraiser = await giftSourceRecord(
      "Appraiser declaration signature record",
      sourceFacts,
      [
        "Jane Smith, EIN123456789; 1 Main St, Austin TX78701.",
        "Appraisal qualification/declaration reviewed for identified property.",
        "/s/ Jane Smith - simulated fixture signature; 2025-05-28.",
      ],
    );
    const donee = await giftSourceRecord(
      "Donee acknowledgment signature record",
      sourceFacts,
      [
        "Full property received2025-06-01; no goods or services supplied.",
        "Donee use related to exempt purpose; no contribution-year disposition.",
        "/s/ Taylor Charity, Director - simulated fixture signature;2025-06-01.",
      ],
    );
    attachments.push(
      {
        fileName: names.purchase,
        description:
          `Form 8283 Section B purchase and basis record: lot ${index}`,
        bytes: purchase,
      },
      {
        fileName: names.appraisal,
        description: `Qualified Appraisal for Section B ${property}`,
        bytes: appraisal,
      },
      {
        fileName: names.signed,
        description: `Form 8283 completed signed Section B: lot ${index}`,
        bytes: signed,
      },
      {
        fileName: names.reduction,
        description:
          `Form 8283 Section B FMV reduction statement: lot ${index}`,
        bytes: reduction,
      },
      {
        fileName: names.appraiser,
        description: `Form 8283 appraiser signature document: lot ${index}`,
        bytes: appraiser,
      },
      {
        fileName: names.donee,
        description: `Form 8283 Donee signature document: lot ${index}`,
        bytes: donee,
      },
    );
    items.push({
      donor_ownership_review: {
        donor_name: donorName,
        donor_ssn: donorSsn,
        ownership_record_reference: names.purchase,
        outright_full_owned_interest_contributed_verified: true,
      },
      property_description: mixed && index % 2 === 0
        ? `Purchased painting lot ART-${index}`
        : `Purchased audio equipment lot EQ-${index}`,
      property_type: mixed && index % 2 === 0 ? "art_under_20000" : "equipment",
      similar_item_group: mixed && index % 2 === 0
        ? "paintings"
        : "audio equipment",
      physical_condition: "Good used condition",
      date_acquired: "2025-01-15",
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv,
      deduction_claimed: basis,
      cost_or_adjusted_basis: basis,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
      ...(fmv <= 500
        ? {
          donor_statement_source_review: {
            property_id: "A",
            donor_name: donorName,
            donor_ssn: donorSsn,
            signed_date: "2025-05-28",
            donor_signature_present: true,
            identified_property_appraised_at_most_500_confirmed: true,
            completed_before_donee_acknowledgment_confirmed: true,
          },
        }
        : {}),
      signed_form_attachment_file_name: names.signed,
      signed_form_source_review: {
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(signed),
        appraiser_signature_present: true,
        donee_signature_present: true,
        matches_electronic_form_confirmed: true,
        reviewed_form_fields: {
          property_description: mixed && index % 2 === 0
            ? `Purchased painting lot ART-${index}`
            : `Purchased audio equipment lot EQ-${index}`,
          property_type: mixed && index % 2 === 0
            ? "art_under_20000"
            : "equipment",
          date_acquired: "2025-01-15",
          date_contributed: "2025-06-01",
          fmv,
          deduction_claimed: basis,
          cost_or_adjusted_basis: basis,
          donee_name: `City Charity ${sameDonee ? 1 : index}`,
          donee_ein: doneeEin,
          donee_received_date: "2025-06-01",
          return_filer_name: jointOwners
            ? "ALEX AND SAM EXAMPLE"
            : "ALEX EXAMPLE",
          return_filer_ssn: "111223333",
          donor_name: donorName,
          donor_ssn: donorSsn,
          donee_us_address: address,
          appraiser_name: "Jane Smith",
          appraiser_identifying_number: "123456789",
          appraiser_us_address: address,
          appraiser_signed_date: "2025-05-28",
        },
      },
      qualified_appraisal: {
        appraiser_first_name: "Jane",
        appraiser_last_name: "Smith",
        signed_date: "2025-05-28",
        appraiser_ein: "123456789",
        signed_by_appraiser: true,
        us_address: address,
        signature_attachment_file_name: names.appraiser,
        attachment_file_name: names.appraisal,
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
        organization_name: `City Charity ${sameDonee ? 1 : index}`,
        ein: doneeEin,
        received_date: "2025-06-01",
        signed_by_donee: true,
        unrelated_use: false,
        us_address: address,
        signature_attachment_file_name: names.donee,
      },
      ordinary_income_reduction: {
        reason: "purchased_short_term_capital_asset",
        gain_removed: fmv - basis,
        purchase_record_attachment_file_name: names.purchase,
        purchase_record_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(purchase),
          property_dates_basis_match_confirmed: true,
          capital_asset_not_inventory_confirmed: true,
          no_depreciation_or_recapture_confirmed: true,
          donor_did_not_create_property_confirmed: true,
        },
        reduction_statement_attachment_file_name: names.reduction,
        reduction_statement_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(reduction),
          property_and_fmv_match_confirmed: true,
          basis_and_gain_match_confirmed: true,
          reduced_claim_matches_confirmed: true,
        },
      },
    });
  }
  if (sharedAppraisal) {
    const inventory = items.map((item) => ({
      property_description: item.property_description,
      fmv: item.fmv,
      date_contributed: item.date_contributed,
      donee_ein: item.donee_acknowledgment.ein,
      donor_ssn:
        (item.donor_ownership_review as Record<string, unknown>).donor_ssn,
    }));
    const shared = await giftSourceRecord(
      "Qualified appraisal of complete similar-property group",
      {
        property: "Complete audio equipment group",
        propertyType: "equipment",
        fmv: items.reduce((total, item) => total + Number(item.fmv), 0),
        basis: items.reduce(
          (total, item) => total + Number(item.cost_or_adjusted_basis),
          0,
        ),
        donorName: "Alex Example",
        donorSsn: "111223333",
        doneeName: "Multiple identified charities",
        doneeEin: "987654321",
        acquired: "2025-01-15",
        contributed: "2025-06-01",
      },
      [
        "Appraiser Jane Smith EIN123456789; 1 Main St, Austin TX78701.",
        "Comparable-sales appraisal; effective2025-06-01; signed2025-05-28.",
        ...inventory.map((row) =>
          `${row.property_description}; FMV$${row.fmv}; donee${row.donee_ein}; owner${row.donor_ssn}`
        ),
        "/s/ Jane Smith - simulated fixture signature.",
      ],
    );
    for (let index = attachments.length - 1; index >= 0; index--) {
      if (attachments[index].fileName.startsWith("Appraisal-")) {
        attachments.splice(index, 1);
      }
    }
    attachments.push({
      fileName: "SharedAppraisal.pdf",
      description:
        "Qualified Appraisal for Section B complete audio equipment group",
      bytes: shared,
    });
    for (const item of items) {
      const appraisal = item.qualified_appraisal as Record<string, unknown>;
      appraisal.attachment_file_name = "SharedAppraisal.pdf";
      appraisal.covers_similar_item_group_confirmed = true;
      appraisal.reviewed_property_inventory = inventory;
      (appraisal.full_appraisal_source_review as Record<string, unknown>)
        .pdf_sha256 = await sha256(shared);
    }
  }
  if (sharedSignedForm) {
    if (!sameDonee || mixed || count !== 3) {
      throw new Error(
        "Reviewed shared signed form fixture needs three similar gifts to one donee",
      );
    }
    const sourceRows = items.map((item) => ({
      property: String(item.property_description),
      propertyType: String(item.property_type),
      fmv: Number(item.fmv),
      basis: Number(item.cost_or_adjusted_basis),
      donorName: "Alex Example",
      donorSsn: "111223333",
      filerName: "ALEX EXAMPLE",
      filerSsn: "111223333",
      doneeName: String(item.donee_acknowledgment.organization_name),
      doneeEin: String(item.donee_acknowledgment.ein),
      acquired: String(item.date_acquired),
      contributed: String(item.date_contributed),
    }));
    const signed = await completed8283Source(
      sourceRows[0],
      sourceRows.slice(1),
    );
    const appraiser = await giftSourceRecord(
      "Appraiser declaration signatures for complete ABC property inventory",
      sourceRows[0],
      [
        ...sourceRows.map((row, index) =>
          `${
            "ABC"[index]
          }: ${row.property}; appraised FMV$${row.fmv}; basisclaim$${row.basis}.`
        ),
        "/s/ Jane Smith EIN123456789 - simulated fixture signature;2025-05-28.",
      ],
    );
    const donee = await giftSourceRecord(
      "Donee acknowledgment signatures for complete ABC property inventory",
      sourceRows[0],
      [
        ...sourceRows.map((row, index) =>
          `${
            "ABC"[index]
          }: ${row.property}; received2025-06-01, no goods or services.`
        ),
        "/s/ Taylor Charity,Director - simulated fixture signature;2025-06-01.",
      ],
    );
    for (let index = attachments.length - 1; index >= 0; index--) {
      if (
        ["Signed8283-", "Appraiser-", "Donee-"].some((prefix) =>
          attachments[index].fileName.startsWith(prefix)
        )
      ) attachments.splice(index, 1);
    }
    attachments.push({
      fileName: "SharedSigned8283.pdf",
      description:
        "Form 8283 completed signed Section B: actual ABC gift inventory",
      bytes: signed,
    }, {
      fileName: "SharedAppraiserSignature.pdf",
      description:
        "Form 8283 appraiser signature document: actual ABC gift inventory",
      bytes: appraiser,
    }, {
      fileName: "SharedDoneeSignature.pdf",
      description:
        "Form 8283 Donee signature document: actual ABC gift inventory",
      bytes: donee,
    });
    for (const [index, item] of items.entries()) {
      item.signed_form_attachment_file_name = "SharedSigned8283.pdf";
      item.signed_form_row_identifier = "ABC"[index];
      const review = item.signed_form_source_review as Record<string, unknown>;
      review.pdf_sha256 = await sha256(signed);
      (review.reviewed_form_fields as Record<string, unknown>).row_identifier =
        "ABC"[index];
      (item.qualified_appraisal as Record<string, unknown>)
        .signature_attachment_file_name = "SharedAppraiserSignature.pdf";
      item.donee_acknowledgment.signature_attachment_file_name =
        "SharedDoneeSignature.pdf";
    }
  }
  const sectionA = withSectionA
    ? [{
      property_description: "Purchased book inventory donation",
      similar_item_group: "book inventory",
      donee_organization_name: "Community Library",
      donee_organization_us_address: address,
      date_acquired: "2022-01-15",
      date_contributed: "2025-06-01",
      donor_acquisition_description: "Purchase",
      fmv: 18000,
      deduction_claimed: 12000,
      cost_or_adjusted_basis: 12000,
      fmv_method: "comparable_sales",
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
      inventory_ordinary_income_reduction: {
        purchase_invoice_reference: "InvoiceBOOK-1",
        inventory_cost_record_reference: "LedgerBOOK-1",
        property_held_for_sale_to_customers_verified: true,
        fmv_sale_gain_entirely_ordinary_verified: true,
        no_other_reduction_reason_verified: true,
      },
    }]
    : [];
  return {
    items: form8283InputSchema.parse({ section_b_items: items })
      .section_b_items!,
    inputs: {
      ...base.inputs,
      ...(jointOwners
        ? {
          general: {
            ...inventoryGeneral,
            filing_status: SourceFilingStatus.MFJ,
            spouse_first_name: "Sam",
            spouse_last_name: "Example",
            spouse_ssn: "444-55-6666",
            spouse_dob: "1988-04-12",
          },
        }
        : {}),
      schedule_a: {
        line_5a_state_income_tax: 24000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: {
        section_b_items: items,
        ...(sectionA.length ? { section_a_items: sectionA } : {}),
      },
    },
    filer: jointOwners
      ? {
        ...base.filer,
        filingStatus: FilingStatus.MarriedFilingJointly,
        nameLine1: "ALEX AND SAM EXAMPLE",
        spouse: {
          ssn: "444556666",
          firstName: "Sam",
          lastName: "Example",
          nameControl: "EXAM",
        },
      }
      : base.filer,
    attachments,
  };
}
