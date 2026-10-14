import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  calculateCharitableDepreciation,
  charitableDepreciationDocumentFields,
} from "../../../../../nodes/inputs/deductions/charitable/f8283/depreciation-source.ts";
import { inputSchema } from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";
import { dispositionDigest } from "./form8283-contribution-year-disposition.fixture.ts";
export type DepreciationCase =
  | "ceased1245"
  | "recovered1245"
  | "active1245"
  | "active1250"
  | "active1245A";
export function depreciationSource(
  kind: DepreciationCase,
): Record<string, any> {
  const real = kind === "active1250",
    recovered = kind === "recovered1245",
    ceased = kind === "ceased1245";
  const acquired = real
    ? "2020-01-15"
    : recovered
    ? "2018-01-15"
    : ceased
    ? "2021-01-15"
    : "2022-01-15";
  const lastUse = ceased
    ? "2024-06-15"
    : recovered
    ? "2023-12-31"
    : "2025-06-01";
  const annual = (first: number, values: number[]) =>
    values.map((depreciation_claimed, n) => ({
      tax_year: first + n,
      depreciation_claimed,
      annual_return_and_asset_ledger_reference: `Owned asset ledger ${
        first + n
      }`,
    }));
  const components = real
    ? [
      {
        component_reference: "BUILDING",
        description: "Owned nonresidential repair workshop",
        cost: 39000,
        appraised_fmv: 65000,
        placed_in_service: acquired,
        method: "gds_39_year_sl_mm_building",
        nonresidential_real_property: true,
        no_section179_or_bonus: true,
        annual_records: annual(2020, [958, 1000, 1000, 1000, 1000, 458]),
      },
      {
        component_reference: "LAND",
        description: "Entire owned workshop land parcel",
        cost: 5000,
        appraised_fmv: 10000,
        placed_in_service: acquired,
        method: "nondepreciable_land",
        annual_records: [],
      },
      {
        component_reference: "QIP",
        description: "Donor installed interior workshop improvement",
        cost: 10000,
        appraised_fmv: 12000,
        placed_in_service: "2022-06-15",
        method: "gds_15_year_qip_2022_bonus",
        interior_improvement_made_by_donor: true,
        underlying_building_placed_in_service: acquired,
        no_enlargement_elevator_or_internal_structure: true,
        acquired_and_placed_in_service_2022: true,
        bonus_election_out: false,
        no_section179: true,
        half_year_not_midquarter_confirmed: true,
        annual_records: annual(2022, [10000, 0, 0, 0]),
      },
    ]
    : [{
      component_reference: "COMPUTER",
      description: "Business workstation and peripheral",
      cost: kind === "active1245A" ? 2000 : 20000,
      appraised_fmv: kind === "active1245A" ? 3000 : ceased ? 15000 : 30000,
      placed_in_service: acquired,
      method: "ads_5_year_sl_hy_computer",
      ads_election_reference: `Owned ADS election ${acquired.slice(0, 4)}`,
      acquired_after_2017: true,
      computer_or_peripheral: true,
      no_section179_or_bonus: true,
      half_year_not_midquarter_confirmed: true,
      annual_records: recovered
        ? annual(2018, [2000, 4000, 4000, 4000, 4000, 2000])
        : annual(
          Number(acquired.slice(0, 4)),
          kind === "active1245A"
            ? [200, 400, 400, 200]
            : [2000, 4000, 4000, 2000],
        ),
    }];
  return {
    property_reference: `GIFT-${kind}`,
    real_property_identity: real
      ? {
        street: "456 Repair Rd",
        city: "Austin",
        state: "TX",
        zip: "78701",
        recorded_deed_identifier: "Owned deed Travis parcel WORKSHOP-2020",
        whole_land_building_and_qip_identified: true,
      }
      : undefined,
    business_reference: "OWNED-REPAIR-2025",
    proprietor_recipient: "T",
    donor_name: "Alex Example",
    donor_ssn: "111223333",
    purchase_record_reference: `Owned purchase ${kind}`,
    annual_depreciation_ledger_reference: `Owned annual ledger ${kind}`,
    business_use_and_retirement_record_reference:
      `Owned use/retirement ${kind}`,
    retained_source_documents: [0, 1, 2].map((n) => ({
      source_reference: [
        `Owned purchase ${kind}`,
        `Owned annual ledger ${kind}`,
        `Owned use/retirement ${kind}`,
      ][n],
      attachment_file_name: `${kind}-${n}.pdf`,
      pdf_sha256: "0".repeat(64),
    })),
    date_acquired: acquired,
    date_contributed: "2025-06-01",
    last_business_use_date: lastUse,
    whole_owned_interest_donated: true,
    original_cost_basis_no_transfer_or_adjustment: true,
    business_use_percent: 100,
    no_personal_use_conversion: true,
    no_debt_or_consideration_received: true,
    no_other_depreciation_assets_or_amortization_in_activity: true,
    no_2025_placed_assets_section179_listed_property_or_other_4562_requirement:
      true,
    calendar_year_full_year_returns: true,
    fifty_percent_limit_donee: true,
    exempt_related_use_confirmed: true,
    current_year_business_records: !ceased && !recovered
      ? {
        issued_receipts_reference: "REPAIR-NEC-2025",
        gross_receipts: 50000,
        fees_paid_record_reference: "REPAIR-FEES-2025",
        fees_paid: 5000,
        no_other_receipts_or_expenses_except_source_depreciation: true,
      }
      : undefined,
    components,
  };
}

export async function reviewedDepreciationGift(kind: DepreciationCase) {
  const base = await reviewedGiftInventory(1);
  const source = depreciationSource(kind),
    calc = calculateCharitableDepreciation(source);
  const row = structuredClone(base.items[0]) as Record<string, any>;
  const real = kind === "active1250";
  const facts = {
    property: real
      ? "Repair workshop,456 Repair Rd Austin TX,land/building/QIP"
      : "Owned business workstation and peripheral",
    propertyType: real ? "other_real_estate" : "equipment",
    fmv: calc.fmv,
    basis: calc.adjusted_basis,
    claim: calc.deduction_claimed,
    donorName: source.donor_name,
    donorSsn: source.donor_ssn,
    doneeName: row.donee_acknowledgment.organization_name,
    doneeEin: row.donee_acknowledgment.ein,
    acquired: source.date_acquired,
    contributed: source.date_contributed,
  };
  const docs = [
    await giftSourceRecord(
      "Owned original purchase and classification",
      facts,
      [
        ...source.components.map((c: any) =>
          `${c.component_reference}: ${c.description}. Paid original cost $${c.cost}; appraised allocated FMV $${c.appraised_fmv}; placed in service ${c.placed_in_service}. ${
            c.method === "ads_5_year_sl_hy_computer"
              ? "Elected ADS straight line,5 years,half-year; no bonus or section179."
              : c.method === "gds_39_year_sl_mm_building"
              ? "Nonresidential building,39-year straight line,mid-month; no bonus or section179."
              : c.method === "gds_15_year_qip_2022_bonus"
              ? "Interior QIP made by donor after building entered service; no structural/enlargement/elevator work; 2022 eligible100% bonus, no election out or section179."
              : "Owned nondepreciable land."
          }`
        ),
        "Original paid cost; no transferred basis, liabilities or consideration. Entire identified owned property donated to related exempt use.",
      ],
    ),
    await giftSourceRecord("Owned annual depreciation records", facts, [
      ...source.components.flatMap((c: any) =>
        c.annual_records.map((r: any) =>
          `${c.component_reference},${r.tax_year}: filed depreciation $${r.depreciation_claimed}; retained annual record ${r.annual_return_and_asset_ledger_reference}.`
        )
      ),
      ...calc.rows.map((r) =>
        `${r.component_reference}: cumulative allowable depreciation $${r.cumulative_depreciation}; adjusted basis $${r.adjusted_basis}; straight-line comparison $${r.straight_line_comparison}; current-year filed depreciation $${r.current_year_depreciation}. Underlying allowable amounts retain precision before final basis cents and annual filed-dollar rounding.`
      ),
      "Records are simulated source-contract evidence, not authenticated accepted prior returns.",
    ]),
    await giftSourceRecord(
      "Owned business use, current receipts/costs and retirement",
      facts,
      [
        `Business ${source.business_reference}; proprietor Alex Example SSN111223333; 100% business use through ${source.last_business_use_date}. No personal conversion. No other depreciation assets or 2025 Form4562 filing trigger.`,
        calc.current_year_depreciation > 0
          ? "2025 repair receipts: issued1099NEC REPAIR-NEC-2025 $50000. Fees paid to unaffiliated platform: expense ledger REPAIR-FEES-2025 $5000, no wages or other expense. Current depreciation derived from annual asset records, not an asserted profit."
          : "Business ceased before2025; no2025 receipts, paid expenses or ScheduleC depreciation. Retired property held until outright donation.",
        "No actual donor sale or proceeds; hypothetical FMV sale is used only for section170(e)(1)(A) reduction.",
      ],
    ),
    await completed8283Source(facts),
    await giftSourceRecord("Qualified appraisal", facts, [
      real
        ? "456 Repair Rd,Austin TX78701; Travis deed parcel WORKSHOP-2020. Whole deeded workshop land/building/QIP, fee simple interest. Real-estate appraiser training and designation, inspected land/interior/building. Component comparable allocations: land10000,building65000,QIP12000; no allocation shifted to reduce ordinary gain."
        : "Business workstation and peripheral inspected and individually identified; comparable sales support FMV.",
    ]),
    await giftSourceRecord(
      "Hypothetical depreciation ordinary-gain reduction",
      facts,
      [
        ...calc.rows.map((r) =>
          `${r.component_reference}: hypothetical gain $${r.hypothetical_gain}; ordinary recapture $${r.ordinary_gain}; residual long-term gain $${r.residual_long_term_gain}.`
        ),
        `FMV${calc.fmv} minus hypothetical ordinary gain${calc.ordinary_gain} equals pre-AGI claim${calc.deduction_claimed}. Current business depreciation${calc.current_year_depreciation}; no donor sale/Form4797 income.`,
      ],
    ),
    await giftSourceRecord("Appraiser declaration signature", facts, [
      "/s/ Jane Smith2025-05-28 - simulated, not authenticated.",
    ]),
    await giftSourceRecord("Donee acknowledgment", facts, [
      "/s/ Taylor Charity2025-06-01 - simulated. Whole property received for related exempt repair-training use; no goods/services or debt.",
    ]),
  ];
  for (let documentIndex = 0; documentIndex < 3; documentIndex++) {
    const pdf = await PDFDocument.load(docs[documentIndex]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const form = pdf.getForm();
    let page = pdf.addPage([612, 792]), y = 730;
    page.drawText("TEST owned source record - visible canonical fields", {
      x: 36,
      y: 760,
      size: 12,
      font,
    });
    for (
      const [name, value] of Object.entries(
        charitableDepreciationDocumentFields(source, documentIndex),
      )
    ) {
      if (y < 70) {
        page = pdf.addPage([612, 792]);
        y = 730;
        page.drawText("TEST owned source record - continued", {
          x: 36,
          y: 760,
          size: 12,
          font,
        });
      }
      page.drawText(name, { x: 36, y, size: 8, font });
      const field = form.createTextField(name);
      field.setText(value);
      field.addToPage(page, {
        x: 36,
        y: y - 24,
        width: 540,
        height: 18,
        borderWidth: 0.5,
        font,
      });
      field.setFontSize(8);
      y -= 42;
    }
    form.updateFieldAppearances(font);
    docs[documentIndex] = await pdf.save();
  }
  const names = docs.map((_, n) => `${kind}-${n}.pdf`);
  const refs = [
    source.purchase_record_reference,
    source.annual_depreciation_ledger_reference,
    source.business_use_and_retirement_record_reference,
  ];
  source.retained_source_documents = await Promise.all(
    refs.map(async (source_reference, n) => ({
      source_reference,
      attachment_file_name: names[n],
      pdf_sha256: await dispositionDigest(docs[n]),
    })),
  );
  Object.assign(row, {
    property_description: facts.property,
    property_type: facts.propertyType,
    similar_item_group: real ? "Workshop real estate" : "Computers",
    date_acquired: facts.acquired,
    fmv: calc.fmv,
    cost_or_adjusted_basis: calc.adjusted_basis,
    deduction_claimed: calc.deduction_claimed,
    is_capital_gain_property: calc.is_capital_gain_property,
    charitable_limit_category: calc.charitable_limit_category,
    ordinary_income_reduction: undefined,
    signed_form_attachment_file_name: names[3],
  });
  row.donor_ownership_review.ownership_record_reference =
    source.purchase_record_reference;
  row.signed_form_source_review.pdf_sha256 = await dispositionDigest(docs[3]);
  Object.assign(row.signed_form_source_review.reviewed_form_fields, {
    property_description: facts.property,
    property_type: facts.propertyType,
    date_acquired: facts.acquired,
    fmv: calc.fmv,
    cost_or_adjusted_basis: calc.adjusted_basis,
    deduction_claimed: calc.deduction_claimed,
  });
  row.qualified_appraisal.attachment_file_name = names[4];
  row.qualified_appraisal.full_appraisal_source_review.pdf_sha256 =
    await dispositionDigest(docs[4]);
  row.qualified_appraisal.signature_attachment_file_name = names[6];
  row.donee_acknowledgment.signature_attachment_file_name = names[7];
  row.special_fmv_reduction = {
    reason: "depreciation_ordinary_income",
    source,
    source_documents: source.retained_source_documents,
    source_documents_review: {
      reviewed_by: "Test reviewer",
      reviewed_on: "2025-09-01",
      property_owner_dates_basis_and_reason_match_confirmed: true,
    },
    reduction_statement_attachment_file_name: names[5],
    reduction_statement_sha256: await dispositionDigest(docs[5]),
  };
  const inputs = {
    ...base.inputs,
    f8283: inputSchema.parse(
      kind === "active1245A"
        ? {
          section_a_items: [{
            donor_ownership_review: row.donor_ownership_review,
            property_description: row.property_description,
            date_acquired: row.date_acquired,
            date_contributed: row.date_contributed,
            donor_acquisition_description: row.donor_acquisition_description,
            fmv: row.fmv,
            deduction_claimed: row.deduction_claimed,
            cost_or_adjusted_basis: row.cost_or_adjusted_basis,
            charitable_limit_category: row.charitable_limit_category,
            is_capital_gain_property: row.is_capital_gain_property,
            donee_organization_name: row.donee_acknowledgment.organization_name,
            donee_organization_us_address: row.donee_acknowledgment.us_address,
            fmv_method: "appraisal",
            depreciation_ordinary_income_reduction: source,
          }],
        }
        : { section_b_items: [row] },
    ),
  } as Record<string, any>;
  if (calc.current_year_depreciation > 0) {
    inputs.general = {
      ...inputs.general,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    };
    inputs.f1099nec = [{
      payer_name: "Example Repair Platform",
      payer_tin: "98-7654321",
      recipient_ssn: "111-22-3333",
      account_number: "REPAIR-2025",
      source_document_reference: "REPAIR-NEC-2025",
      box1_nec: 50000,
      for_routing: "schedule_c",
      schedule_c_business_reference: source.business_reference,
    }];
    inputs.schedule_c = [{
      business_reference: source.business_reference,
      proprietor_recipient: "T",
      line_a_principal_business: "Computer hardware repair",
      line_b_business_code: "811210",
      line_c_business_name: "Example Repair",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: 50000,
      line_10_commissions_fees: 5000,
      donated_depreciable_property_source: source,
    }];
  }

  return {
    ...base,
    inputs,
    items: [row],
    calc,
    attachments: (kind === "active1245A" ? docs.slice(0, 3) : docs).map((
      bytes,
      n,
    ) => ({
      bytes,
      fileName: names[n],
      description: [
        "Form 8283 Section B reduction source record: purchase",
        "Form 8283 Section B reduction source record: annual ledger",
        "Form 8283 Section B reduction source record: business use",
        "Form 8283 completed signed Section B",
        "Qualified Appraisal for Section B",
        "Form 8283 Section B reduction source record: computation",
        "Form 8283 appraiser signature document",
        "Form 8283 Donee signature document",
      ][n],
    })),
  };
}
