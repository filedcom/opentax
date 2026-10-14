import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  calculateCharitableNaturalResource,
  charitableNaturalResourceDocumentFields,
} from "../../../../../nodes/inputs/deductions/charitable/f8283/natural-resource-source.ts";
import { inputSchema } from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";
import { dispositionDigest } from "./form8283-contribution-year-disposition.fixture.ts";

export type ResourceCase =
  | "soil_water"
  | "active_soil_water"
  | "active_soil_water_limited"
  | "legacy_exploration"
  | "legacy_oil"
  | "producing_exploration"
  | "producing_recovered"
  | "oil"
  | "small_oil"
  | "active_oil"
  | "active_idc_oil"
  | "gas"
  | "geothermal"
  | "gold_development"
  | "gold_exploration";
export function naturalResourceSource(kind: ResourceCase): Record<string, any> {
  if (kind === "producing_recovered") {
    const source = JSON.parse(
      JSON.stringify(naturalResourceSource("producing_exploration")).replaceAll(
        "producing_exploration",
        kind,
      ),
    );
    source.annual_records[0].expenses[0].amount = 50000;
    source.annual_records[0].deduction_claimed = 50000;
    source.annual_records.find((r: { tax_year: number }) => r.tax_year === 2025)
      .depletion_claimed = 10000;
    return source;
  }
  if (kind === "producing_exploration") {
    const source = JSON.parse(
      JSON.stringify(naturalResourceSource("legacy_exploration")).replaceAll(
        "legacy_exploration",
        kind,
      ),
    );
    for (
      const key of [
        "mineral",
        "never_reached_producing_stage_or_received_bonus_royalties",
        "no_percentage_depletion_offset_or_recaptured_exploration",
      ]
    ) delete source[key];
    Object.assign(source, {
      kind: "producing_mining_617",
      resource: "gold",
      original_owned_cost: 200000,
      appraised_fmv: 350000,
      development_stage_began_on: "2022-01-01",
      producing_stage_reached_on: "2023-01-01",
      producing_stage_basis: "principal_activity_developed_ore_production",
      mine_identifier: "Owned gold mine TX-617",
      mine_inventory: [{
        mine_identifier: "Owned gold mine TX-617",
        property_reference: source.property_reference,
        donor_ssn: source.donor_ssn,
        development_stage_began_on: "2022-01-01",
        producing_stage_reached_on: "2023-01-01",
        operation_record_reference:
          "Owned gold mine developed ore operation2023",
        default_disallowance_return_record_reference:
          "Owned617 production-stage2023 return depletion disallowance",
      }],
      producing_stage_geological_and_operation_record_reference:
        "Owned gold mine developed ore operation2023",
      producing_stage_treatment: "depletion_disallowance",
      mineral_cost_allocation_record: {
        record_reference: "Owned1985 purchase mineral-interest cost allocation",
        property_reference: source.property_reference,
        donor_ssn: source.donor_ssn,
        original_purchase_cost: 200000,
        depletable_mineral_cost: 200000,
        residual_nonmineral_land_cost: 0,
        separate_depreciable_asset_cost: 0,
      },
      complete_mine_and_property_inventory_reference:
        "Owned single domestic gold mine entire inventory",
      sole_owned_mine_no_aggregation_bonus_royalty_or_prior_recapture: true,
      development_election_reference:
        "Owned616 current development election2025",
      regular_ten_year_writeoff_not_elected: true,
      no_other_regular_or_amt_property_basis_adjustments: true,
    });
    const invoice = source.annual_records[0].expenses[0];
    invoice.amount = 100000;
    source.annual_records[0].deduction_claimed = 100000;
    for (const row of source.annual_records) {
      if (row.tax_year >= 2023) {
        Object.assign(row, {
          gross_property_income: row.tax_year === 2025 ? 140000 : 50000,
          units_sold: row.tax_year === 2023
            ? 100
            : row.tax_year === 2024
            ? 90
            : 81,
          recoverable_units_before_sales: row.tax_year === 2023
            ? 1000
            : row.tax_year === 2024
            ? 900
            : 810,
        });
      }
      if (row.tax_year === 2025) {
        Object.assign(row, {
          expenses: [{
            ...invoice,
            paid_on: "2025-03-01",
            invoice_reference: "Owned616 development invoice2025",
            payment_reference: "Owned616 bank payment2025",
            nature: "development_616",
            eligibility_record_reference:
              "Owned616 developed mineral reserves work2025",
          }],
          deduction_claimed: 100000,
        });
      }
    }
    source.current_year_paid_receipts = [{
      received_on: "2025-04-30",
      buyer_name: "Independent gold ore buyer",
      sale_invoice_reference: "Owned gold ore sale invoice2025",
      bank_payment_record_reference: "Owned gold receipt deposit2025",
      amount: 140000,
    }];
    return source;
  }
  const small = kind === "small_oil";
  const legacyOil = kind === "legacy_oil";
  const active = kind === "active_oil" || kind === "active_idc_oil" ||
    legacyOil;
  const legacy = kind === "legacy_exploration",
    farm = kind === "soil_water" || kind.startsWith("active_soil_water");
  const acquired = legacy
    ? "1985-01-15"
    : legacyOil
    ? "1986-01-15"
    : farm
    ? "2020-01-15"
    : "2021-01-15";
  const annual_records = Array.from({
    length: 2025 - Number(acquired.slice(0, 4)) + 1,
  }, (_, n) => {
    const tax_year = Number(acquired.slice(0, 4)) + n;
    const paid = legacyOil && tax_year === 2021 ||
      kind === "active_idc_oil" && tax_year === 2025 ||
      !active &&
        (tax_year === Number(acquired.slice(0, 4)) + (farm ? 1 : 0) ||
          kind.startsWith("active_soil_water") && tax_year === 2025);
    const produces = !farm && !legacy && kind !== "gold_exploration" &&
      (active ? [2021, 2022, 2025] : [2022, 2023]).includes(tax_year);
    const nature = farm
      ? "soil_water_175"
      : legacy || kind === "gold_exploration"
      ? "exploration_617"
      : kind === "gold_development"
      ? "development_616"
      : "idc_263c";
    return {
      tax_year,
      annual_return_and_account_reference: `Owned ${kind} account ${tax_year}`,
      gross_property_income: farm
        ? tax_year === 2021
          ? 40000
          : tax_year === 2022
          ? 20000
          : kind.startsWith("active_soil_water") && tax_year === 2025
          ? 60000
          : 0
        : produces
        ? active ? tax_year === 2025 ? 60000 : 50000 : small ? 600 : 6000
        : 0,
      other_deductible_property_expenses: 0,
      expenses: paid
        ? [{
          paid_on: `${tax_year}-03-01`,
          invoice_reference: `${kind}-invoice-${tax_year}`,
          payment_reference: `${kind}-paid-${tax_year}`,
          vendor_name: "Independent Resource Works Corporation",
          vendor_ein: "123456780",
          vendor_entity_classification: "c_corporation",
          vendor_corporate_status_record_reference:
            `${kind}-vendor-corporate-record-${tax_year}`,
          amount: kind === "active_soil_water_limited" && tax_year === 2025
            ? 20000
            : farm
            ? 12000
            : small
            ? 1000
            : 10000,
          nature,
          eligibility_record_reference: `${kind}-eligible-${tax_year}`,
        }]
        : [],
      deduction_claimed: farm
        ? tax_year === 2021
          ? 10000
          : tax_year === 2022
          ? 2000
          : kind.startsWith("active_soil_water") && tax_year === 2025
          ? kind === "active_soil_water_limited" ? 15000 : 12000
          : 0
        : paid
        ? small ? 1000 : 10000
        : 0,
      depletion_claimed: produces ? active ? 20000 : small ? 200 : 2000 : 0,
      units_sold: produces ? 100 : 0,
      recoverable_units_before_sales: produces
        ? active
          ? tax_year === 2021 ? 1000 : tax_year === 2022 ? 900 : 800
          : tax_year === 2022
          ? 1000
          : 900
        : 0,
      reserve_engineer_record_reference: `${kind}-unit-inventory-${tax_year}`,
      gross_receipt_record_reference: `${kind}-gross-receipts-${tax_year}`,
      no_other_basis_adjustments_or_prior_recapture: true,
    };
  });
  return {
    kind: farm
      ? "farmland_1252"
      : legacy
      ? "legacy_mining_617"
      : legacyOil
      ? "legacy_oil_gas_geothermal_1254"
      : "natural_resource_1254",
    property_reference: `GIFT-${kind}`,
    donor_name: "Alex Example",
    donor_ssn: "111223333",
    proprietor_recipient: "T",
    business_reference: `OWNED-${kind}`,
    recorded_deed_or_mineral_interest_identifier:
      `Original owned ${kind} deed TX-${kind}`,
    property_location: `Owned ${kind} parcel, Travis County TX`,
    purchase_record_reference: `${kind}-purchase`,
    annual_account_ledger_reference: `${kind}-annual-account`,
    property_use_record_reference: `${kind}-use-inventory`,
    retained_source_documents: ["purchase", "annual-account", "use-inventory"]
      .map((r, n) => ({
        source_reference: `${kind}-${r}`,
        attachment_file_name: `${kind}-${n}.pdf`,
        pdf_sha256: "0".repeat(64),
      })),
    date_acquired: acquired,
    placed_in_service: acquired,
    date_contributed: "2025-06-01",
    original_owned_cost: active ? 200000 : small ? 2000 : 20000,
    appraised_fmv: active ? 300000 : small ? 5000 : 50000,
    whole_original_owned_interest: true,
    no_debt_consideration_transfer_basis_or_partial_interest: true,
    fifty_percent_limit_donee: true,
    exempt_related_use_confirmed: true,
    no_other_depreciable_assets_or_recapture_classes: true,
    calendar_year_full_year_returns: true,
    current_year_paid_receipts: kind.startsWith("active_soil_water")
      ? [{
        received_on: "2025-04-30",
        buyer_name: "Independent grain buyer",
        sale_invoice_reference: "Owned crop sale invoice2025",
        bank_payment_record_reference: "Owned crop bank deposit2025",
        amount: 60000,
      }]
      : active
      ? [{
        received_on: "2025-04-30",
        buyer_name: "Independent refinery buyer",
        sale_invoice_reference: "Owned oil production invoice2025",
        bank_payment_record_reference: "Owned oil bank deposit2025",
        amount: 60000,
      }]
      : [],
    complete_current_year_receipt_inventory_reference:
      `${kind}-complete2025receiptinventory`,
    no_other_current_year_receipts_or_deductions: true,
    annual_records,
    ...(farm
      ? {
        section175_election_reference: "Owned175 election2021",
        conservation_plan_and_farming_use_record_reference:
          kind.startsWith("active_soil_water")
            ? "Owned USDA contour/drainage plan; farm-use ledger2021/22/2025"
            : "Owned USDA contour/drainage plan; farm-use ledger2021/22",
        only_eligible_soil_water_conservation_costs: true,
        no_land_clearing_182_or_depreciable_improvement_costs: true,
      }
      : legacy
      ? {
        mineral: "gold",
        exploration_election_reference: "Owned617 election1985",
        domestic_predevelopment_exploration_record_reference:
          "Domestic gold predevelopment geological exploration",
        never_reached_producing_stage_or_received_bonus_royalties: true,
        no_percentage_depletion_offset_or_recaptured_exploration: true,
        no_binding_contract_transition_to_1254: true,
      }
      : {
        resource: kind.startsWith("gold")
          ? "gold"
          : active || small
          ? "oil"
          : kind,
        operating_interest_and_economic_interest_record_reference:
          `Wholly owned operating ${kind} interest`,
        expense_election_reference: `Owned ${kind} expense election2021`,
        no_suspended_or_amortized_costs_or_related_party_1254_costs: true,
        no_pre1987_binding_contract_transition: true,
        cost_depletion_exceeds_uncapped_percentage_when_producing: true,
        ...(legacyOil
          ? {
            productive_well_cost_and_start_record_reference:
              "Owned2021 productive oil well drilling and unit-sales record",
            all_idc_allocable_to_depletable_productive_property: true,
            no_other_regular_or_amt_property_basis_adjustments: true,
          }
          : {
            mining_exploration_never_reached_producing_stage:
              kind === "gold_exploration",
          }),
      }),
  };
}

export async function reviewedNaturalResourceGift(kind: ResourceCase) {
  const base = await reviewedGiftInventory(1);
  const source = naturalResourceSource(kind),
    calc = calculateCharitableNaturalResource(source);
  const row = structuredClone(base.items[0]) as Record<string, any>;
  const facts = {
    property: `Entire owned ${kind} parcel or operating mineral interest`,
    propertyType: "other_real_estate",
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
    await giftSourceRecord("Owned original natural-resource purchase", facts, [
      `Original acquisition cost${source.original_owned_cost}; no transferred basis. Actual deed/operating interest ${source.recorded_deed_or_mineral_interest_identifier}; location ${source.property_location}; service date ${source.placed_in_service}. Entire economic interest owned and donated. No debt, retained right or consideration.`,
    ]),
    await giftSourceRecord(
      "Owned annual cost, production and deduction ledger",
      facts,
      calc.rows.map((r) =>
        `${r.tax_year}: paid eligible costs${r.paid_costs}; actual allowed deduction${r.deduction}; depletion${r.depletion}; closing adjusted basis${r.adjusted_basis}; conservation carry${r.conservation_carry}.${
          kind === "legacy_oil"
            ? ` Hypothetical capitalized basis${r.hypothetical_capitalized_basis}; hypothetical depletion${r.hypothetical_depletion}; cumulative IDC depletion offset${r.cumulative_hypothetical_depletion_offset}.`
            : kind.startsWith("producing_")
            ? ` Otherwise allowable cost depletion${r.otherwise_allowable_depletion}; disallowed617 depletion${r.disallowed_exploration_depletion}; remaining exploration account${r.remaining_exploration_account}; AMT unamortized mining costs${r.amt_unamortized_mining_costs}.`
            : ""
        } Annual source ${
          source.annual_records.find((a: any) => a.tax_year === r.tax_year)
            .annual_return_and_account_reference
        }.`
      ),
    ),
    await giftSourceRecord("Property use and current source inventory", facts, [
      `Source class ${source.kind}. ${
        source.kind === "farmland_1252"
          ? "Owned contour/terracing/drainage conservation expenses follow soil/water plan on land used in farming; no182clearing or depreciable improvement costs."
          : "Original wholly owned domestic economic/operating interest; exploration or development invoice facts and actual elected deduction retained by year."
      }`,
      `Current2025 actual receipts${
        source.current_year_paid_receipts.reduce((sum: number, r: any) =>
          sum + r.amount, 0)
      }, cost deductions${calc.current_year.deduction}, cost depletion${calc.current_year.depletion}. Buyer invoice/bank receipt inventory and annual unit records retained. No taxable recapture or actual property sale.
Current account has no other receipts, expenses or sold units. Property remains owned and temporarily idle until outright donation; no sale, abandonment, debt forgiveness or partial right retained. No other receipts, deductions or income from this donated property account omitted.`,
      "Annual records, payment records, elections, appraisals and signatures are simulated source-contract evidence, not externally authenticated or accepted prior archives.",
    ]),
    await completed8283Source(facts),
    await giftSourceRecord(
      "Full qualified real-property/mineral-interest appraisal",
      facts,
      [
        `Legal parcel/interest ${source.recorded_deed_or_mineral_interest_identifier}, ${source.property_location}. Whole owned interest, no retained encumbrance or debt. Comparable whole-interest transactions COMP-${kind}-A/B/C dated2025-01-01/02-01/03-01 show${
          calc.fmv * .9
        }/${calc.fmv}/${
          calc.fmv * 1.1
        }; similar economic rights, location and condition, no donor labor included. Market comparison supports${calc.fmv} effective2025-06-01. Physical inspection2025-05-20; no unreported equipment/buildings in donated interest.`,
        "Jane Smith EIN123456789,1MainSt AustinTX78701; qualified appraiser regularly valuing real property and mineral interests, recognized appraisal designation and20years relevant experience. Unrelated to owner/donee/acquisition, fixed fee600 not contingent on FMV/deduction. Signed /s/JaneSmith2025-05-28 (simulated). Appraisal purpose is contribution substantiation beforeAGI limit.",
      ],
    ),
    await giftSourceRecord(
      "Natural-resource hypothetical ordinary gain reduction",
      facts,
      [`FMV${calc.fmv}; original cost${source.original_owned_cost}; adjusted basis${calc.adjusted_basis}; hypothetical gain${calc.hypothetical_gain}; retained deductible-cost/depletion account${calc.recapture_costs};${
        kind === "legacy_oil"
          ? ` deducted productiveIDC10000 less hypothetical depletion offset${calc.hypothetical_depletion_offset};`
          : ""
      } applicable percentage${
        calc.applicable_percentage * 100
      }%; ordinary gain${calc.ordinary_gain}; residual long-term${calc.residual_long_term_gain}; preAGI claim${calc.deduction_claimed}. No actual Form4797 income from outright gift.`],
    ),
    await giftSourceRecord("Appraiser declaration signature", facts, [
      "/s/JaneSmith2025-05-28; qualified appraiser declaration, simulated not authenticated.",
    ]),
    await giftSourceRecord("Donee acknowledgment", facts, [
      "/s/TaylorCharity2025-06-01; Director. Whole property received for related exempt educational use; no goods/services, consideration or debt. Simulated signature, not authenticated.",
    ]),
  ];
  for (let n = 0; n < 3; n++) {
    const pdf = await PDFDocument.load(docs[n]),
      font = await pdf.embedFont(StandardFonts.Helvetica),
      form = pdf.getForm();
    let page = pdf.addPage([612, 792]), y = 740;
    for (
      const [key, value] of Object.entries(
        charitableNaturalResourceDocumentFields(source, n),
      )
    ) {
      if (y < 65) {
        page = pdf.addPage([612, 792]);
        y = 740;
      }
      page.drawText(key, { x: 40, y, size: 7, font });
      const field = form.createTextField(key);
      field.setText(value);
      field.addToPage(page, {
        x: 40,
        y: y - 24,
        width: 530,
        height: 18,
        font,
        borderWidth: .5,
      });
      field.setFontSize(8);
      y -= 42;
    }
    form.updateFieldAppearances(font);
    docs[n] = await pdf.save();
  }
  const names = docs.map((_, n) => `${kind}-${n}.pdf`);
  source.retained_source_documents = await Promise.all(
    source.retained_source_documents.map(async (r: any, n: number) => ({
      ...r,
      pdf_sha256: await dispositionDigest(docs[n]),
    })),
  );
  Object.assign(row, {
    property_description: facts.property,
    property_type: facts.propertyType,
    similar_item_group: `Owned ${kind} interests`,
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
    reason: "natural_resource_ordinary_income",
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
  return {
    ...base,
    inputs: {
      ...base.inputs,
      ...([
          "active_oil",
          "active_idc_oil",
          "legacy_oil",
          "producing_exploration",
          "producing_recovered",
          "active_soil_water",
          "active_soil_water_limited",
        ].includes(kind)
        ? {
          general: {
            ...base.inputs.general,
            qbi_no_prior_loss_or_suspended_loss_confirmed: true,
            qbi_not_patron_of_specified_cooperative_confirmed: true,
          },
        }
        : {}),
      ...([
          "legacy_exploration",
          "legacy_oil",
          "producing_exploration",
          "producing_recovered",
        ]
          .includes(kind)
        ? {
          general: {
            ...base.inputs.general,
            taxpayer_dob: "1965-06-15",
            ...(["legacy_oil", "producing_exploration", "producing_recovered"]
                .includes(kind)
              ? {
                qbi_no_prior_loss_or_suspended_loss_confirmed: true,
                qbi_not_patron_of_specified_cooperative_confirmed: true,
              }
              : {}),
          },
        }
        : {}),
      ...([
          "active_oil",
          "active_idc_oil",
          "legacy_oil",
          "producing_exploration",
          "producing_recovered",
        ].includes(kind)
        ? {
          schedule_c: [{
            line_a_principal_business: kind.startsWith("producing_")
              ? "Operating gold mining"
              : "Operating oil production",
            line_c_business_name: kind.startsWith("producing_")
              ? "Owned gold mining"
              : "Owned oil production",
            business_reference: source.business_reference,
            proprietor_recipient: "T",
            qbi_no_other_adjustments_confirmed: true,
            line_b_business_code: kind.startsWith("producing_")
              ? "212220"
              : "211120",
            line_f_accounting_method: "cash",
            line_g_material_participation: true,
            line_32_at_risk: "a",
            line_i_made_1099_payments: false,
            line_1_gross_receipts: kind.startsWith("producing_")
              ? 140000
              : 60000,
            donated_natural_resource_property_source: source,
          }],
        }
        : {}),
      ...(kind.startsWith("active_soil_water")
        ? {
          schedule_f: {
            schedule_fs: [{
              farm_id: source.business_reference,
              proprietor_recipient: "T",
              line_c_farm_name: "Owned grain farming",
              qbi_no_other_adjustments_confirmed: true,
              line1_sales_livestock_resale: 0,
              line1b_cost_livestock_resale: 0,
              line_a_principal_crop_activity: "Owned grain farming",
              line_b_agricultural_activity_code: "111100",
              line_e_material_participation: true,
              line_f_made_1099_payments: false,
              accounting_method: "cash",
              line36_at_risk: "a",
              line2_sales_products_raised: 60000,
              donated_natural_resource_property_source: source,
            }],
          },
        }
        : {}),
      f8283: inputSchema.parse(
        kind === "small_oil"
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
              donee_organization_name:
                row.donee_acknowledgment.organization_name,
              donee_organization_us_address:
                row.donee_acknowledgment.us_address,
              fmv_method: "appraisal",
              natural_resource_ordinary_income_reduction: source,
            }],
          }
          : { section_b_items: [row] },
      ),
    },
    items: [row],
    calc,
    attachments: docs.map((bytes, n) => ({
      bytes,
      fileName: names[n],
      description: [
        "Form 8283 Section B reduction source record: purchase",
        "Form 8283 Section B reduction source record: annual account",
        "Form 8283 Section B reduction source record: owned use",
        "Form 8283 completed signed Section B",
        "Qualified Appraisal for Section B",
        "Form 8283 Section B reduction source record: computation",
        "Form 8283 appraiser signature document",
        "Form 8283 Donee signature document",
      ][n],
    })).map((row) =>
      kind === "small_oil"
        ? {
          ...row,
          description: row.description.replaceAll("Section B", "Section A"),
        }
        : row
    ).filter((_, n) => kind !== "small_oil" || [0, 1, 2, 4].includes(n)),
  };
}
