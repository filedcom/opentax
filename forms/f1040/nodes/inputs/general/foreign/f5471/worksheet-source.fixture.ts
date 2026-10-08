import type { OwnedCfcWorksheetSource } from "./worksheet-source.ts";

/** Separate authored source contracts. They do not repair or authenticate the
 * earlier locator-only source and do not assert an accepted prior filing. */
export function ownedCfcWorksheetSource(
  withUSSecurity: boolean,
  unrelatedCorporateNote = false,
): OwnedCfcWorksheetSource {
  const cfc = withUSSecurity ? "CFCWSUS" : "CFCWSFOREIGN";
  const record = (name: string) => ({
    cfc_reference: cfc,
    document_reference: `${cfc}-${name}`,
  });
  const source: OwnedCfcWorksheetSource = {
    cfc_reference: cfc,
    cfc_name: withUSSecurity
      ? "Owned Services And Securities Ltd"
      : "Owned Services Ltd",
    corporate_register_record: {
      document_reference: `${cfc}-current-corporate-register`,
      incorporation_date: "2020-01-01",
      address: {
        line1: "10 Merchant Street",
        city: "Dublin",
        country_code: "EI",
        postal_code: "D02 X285",
      },
      business_activity_code: "541690",
      business_activity_description: "Technical consulting",
      statutory_agent_business_name: "Owned Irish Secretary Ltd",
      stock_class_description: "Common",
    },
    functional_currency: "USD",
    corporation_country: "EI",
    shareholder_tin: "111223333",
    shareholder_name: "Alex Taxpayer",
    stock_issued_on: "2020-01-01",
    stock_register_reference: `${cfc}-stock-register-2020-2025`,
    shares_issued: withUSSecurity ? 160 : 100,
    capital_paid_per_share: 1000,
    capital_payment_reference: `${cfc}-capital-bank-payment`,
    sole_direct_owner_since_formation: true,
    no_ownership_changes_cash_distributions_or_other_book_income: true,
    interest_apportionment_election_prerequisite: {
      document_reference: `${cfc}-constructed-2025-initial-interest-election`,
      evidence_status: "constructed_unverified_no_export",
      cfc_reference: cfc,
      method: "modified_gross_income",
      initial_interest_year: 2025,
      effective_tax_year: 2025,
      controlling_shareholder_tin: "111223333",
      designated_shareholder_tin: "111223333",
      controlling_shareholder_name: "Alex Taxpayer",
      controlling_shareholder_address: {
        line1: "123 Main Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      voting_percentage: 100,
      shares_owned: withUSSecurity ? 160 : 100,
      corporation_country: "EI",
      corporation_name: withUSSecurity
        ? "Owned Services And Securities Ltd"
        : "Owned Services Ltd",
      statement_for_return_tax_year: 2025,
      intended_statement_filing_deadline: "2026-04-15",
      retained_consent_document_reference:
        `${cfc}-constructed-unverified-owner-consent`,
      consent_authority: "unverified_no_export",
      other_domestic_shareholders: [],
      complete_controlled_cfc_inventory: [cfc],
      lower_tier_cfc_stock_inventory: [],
    },
    counterparty_register: [
      ["AlexTaxpayer", "US", "111223333"],
      ["UnrelatedManufacturingMX", "MX", "900000001"],
      ["UnrelatedIrishCustomer", "EI", "900000002"],
      ["UnrelatedIrishLender", "EI", "900000003"],
      ["IrishTaxAuthority", "EI", "900000004"],
      ...(withUSSecurity
        ? [["UnrelatedUSCorporateIssuer", "US", "900000005"]]
        : []),
    ].map(([party_reference, country, tin]) => ({
      party_reference,
      entity_kind: party_reference === "AlexTaxpayer"
        ? "individual"
        : party_reference === "IrishTaxAuthority"
        ? "government"
        : "corporation",
      country,
      ownership_register_reference:
        `${cfc}-${party_reference}-ownership-register`,
      owners: [{ tin, percentage: 100 }],
      complete_direct_and_indirect_control_inventory: true,
      no_other_common_control: true,
    })),
    current_borrowing_records: [{
      ...record("working-capital-loan-contract"),
      loan_reference: `${cfc}-working-capital-loan`,
      lender_reference: "UnrelatedIrishLender",
      originated_on: "2025-01-01",
      repaid_on: "2025-12-31",
      principal_received: 50000,
      principal_repaid: 50000,
      annual_rate_numerator: 6,
      annual_rate_denominator: 100,
      receipt_bank_reference: `${cfc}-loan-principal-receipt`,
      repayment_bank_reference: `${cfc}-loan-principal-repayment`,
      unsecured: true,
      quarter_principal_balances: [50000, 50000, 50000, 0],
    }],
    current_bank_balance_record: {
      ...record("constructed-owned-bank-balance-2025"),
      evidence_status: "constructed_unverified_no_export",
      bank_country: "EI",
      account_reference: `${cfc}-sole-unremunerated-deposit`,
      unremunerated_deposit: true,
      opening_balance: withUSSecurity ? 70000 : 10000,
      quarter_closing_balances: [
        60000,
        70000,
        70000,
        withUSSecurity ? (unrelatedCorporateNote ? 71700 : 71340) : 70500,
      ],
      closing_balance: withUSSecurity
        ? (unrelatedCorporateNote ? 71700 : 71340)
        : 70500,
      no_other_cash_accounts: true,
    },
    current_cash_receipts: [
      {
        ...record("inventory-cash-receipt"),
        income_document_reference: `${cfc}-inventory-sale-001`,
        amount: 11000,
        received_on: "2025-06-15",
        bank_reference: `${cfc}-sales-bank-receipt`,
        cash_settlement_without_receivable: true,
      },
      {
        ...record("services-cash-receipt"),
        income_document_reference: `${cfc}-service-invoice-001`,
        amount: 54000,
        received_on: "2025-10-01",
        bank_reference: `${cfc}-services-bank-receipt`,
        cash_settlement_without_receivable: true,
      },
      ...(withUSSecurity
        ? [{
          ...record("coupon-cash-receipt"),
          income_document_reference: `${cfc}-ordinary-note-coupon`,
          amount: unrelatedCorporateNote ? 1200 : 840,
          received_on: "2025-12-31",
          bank_reference: `${cfc}-coupon-bank-payment`,
          cash_settlement_without_receivable: true as const,
        }]
        : []),
    ],
    current_income_records: [
      {
        ...record("inventory-sale-001"),
        kind: "inventory_sale",
        date: "2025-06-15",
        buyer_reference: "AlexTaxpayer",
        buyer_owner_tin: "111223333",
        supplier_reference: "UnrelatedManufacturingMX",
        units: 100,
        sale_price_per_unit: 110,
        purchase_price_per_unit: 10,
        manufactured_country: "MX",
        consumption_country: "US",
        sold_property_manufactured_by_cfc: false,
        purchase_document_reference: `${cfc}-inventory-purchase-001`,
        purchase_payment_record: {
          document_reference: `${cfc}-inventory-purchase-001`,
          date: "2025-06-15",
          supplier_reference: "UnrelatedManufacturingMX",
          cfc_reference: cfc,
          amount: 1000,
          bank_reference: `${cfc}-inventory-cost-bank-payment`,
        },
        sale_shipping_record: {
          document_reference: `${cfc}-inventory-sale-shipping-record`,
          invoice_document_reference: `${cfc}-inventory-sale-001`,
          title_transfer_country: "EI",
          shipping_origin_country: "EI",
          destination_country: "US",
          delivery_terms: "FOB_Dublin_title_at_origin",
        },
      },
      {
        ...record("service-invoice-001"),
        kind: "service",
        date: "2025-10-01",
        customer_reference: "UnrelatedIrishCustomer",
        employee_reference: "IndependentEmployeesIE",
        units: 54,
        price_per_unit: 1000,
        performance_country: "EI",
        no_customer_designated_individual: true,
        no_related_person_assistance: true,
      },
    ],
    current_expense_records: [
      {
        ...record("paid-interest-001"),
        date: "2025-12-31",
        kind: "interest",
        loan_reference: `${cfc}-working-capital-loan`,
        amount: 3000,
        income_document_reference: `${cfc}-service-invoice-001`,
        payee_reference: "UnrelatedIrishLender",
        payment_document_reference: `${cfc}-interest-bank-payment`,
      },
      {
        ...record("paid-tax-001"),
        date: "2025-12-31",
        kind: "income_tax",
        tax_assessment_reference: `${cfc}-current-tax-assessment`,
        assessed_taxable_income: 49500,
        tax_exempt_income_document_references: [
          `${cfc}-inventory-sale-001`,
          ...(withUSSecurity ? [`${cfc}-ordinary-note-coupon`] : []),
        ],
        amount: 500,
        income_document_reference: `${cfc}-service-invoice-001`,
        payee_reference: "IrishTaxAuthority",
        payment_document_reference: `${cfc}-tax-bank-payment`,
      },
    ],
    owned_assets: [{
      ...record("equipment-purchase-2020"),
      kind: "depreciable_equipment",
      asset_reference: `${cfc}-equipment`,
      acquired_on: "2020-01-01",
      units: 1,
      purchase_price_per_unit: 101500,
      purchase_document_reference: `${cfc}-equipment-issued-invoice`,
      prior_location_country: "EI",
      quarter_records:
        (["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"] as const).map(
          (q, i) => ({
            quarter_end: q,
            book_depreciation: 375,
            ep_depreciation: 375,
            tax_depreciation: 375,
            location_country: "EI",
            asset_use: "tested_services",
            location_document_reference: `${cfc}-equipment-location-quarter${
              i + 1
            }`,
            depreciation_document_reference:
              `${cfc}-equipment-depreciation-quarter${i + 1}`,
          }),
        ),
    }],
    prior_year_records: [2020, 2021, 2022, 2023, 2024].map((year) => ({
      ...record(`annual-books-${year}`),
      tax_year: year,
      services_performed_country: "EI",
      service_units: 25,
      service_price_per_unit: 100,
      operating_payments: [{
        reference: `${cfc}-operating-paid-${year}`,
        amount: 200,
      }],
      asset_depreciation: [{
        asset_reference: `${cfc}-equipment`,
        amount: 300,
        ep_amount: 300,
        tax_amount: 300,
        quarter_tax_depreciation: [75, 75, 75, 75],
        document_reference: `${cfc}-annual-depreciation-${year}`,
      }],
      no_other_income_expenses_distributions_or_assets: true,
      income_document_reference: `${cfc}-service-invoice-${year}`,
      bank_reconciliation_reference: `${cfc}-bank-reconciliation-${year}`,
    })),
    currency_translation_reference: `${cfc}-USD-functional-currency-record`,
    cash_account_country: "EI",
    cash_account_reference: `${cfc}-Irish-bank-account`,
    complete_asset_income_expense_and_related_person_inventory: true,
  };
  if (withUSSecurity) {
    source.owned_assets.push({
      ...record("owned-corporate-note-purchase"),
      kind: "debt_obligation",
      asset_reference: `${cfc}-US-issued-note`,
      acquired_on: "2025-01-01",
      issuer_reference: unrelatedCorporateNote
        ? "UnrelatedUSCorporateIssuer"
        : "AlexTaxpayer",
      issuer_owner_tin: unrelatedCorporateNote ? undefined : "111223333",
      issuer_legal_type: unrelatedCorporateNote
        ? "domestic_corporation"
        : "individual",
      issuer_country: "US",
      principal: 60000,
      issue_document_reference: `${cfc}-${
        unrelatedCorporateNote ? "corporate" : "shareholder"
      }-note-issued-contract`,
      payment_document_reference: `${cfc}-note-purchase-bank-payment`,
      quarter_records:
        (["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"] as const).map(
          (q, i) => ({
            quarter_end: q,
            principal_outstanding: 60000,
            liability_subject_to_property: 0,
            custody_document_reference: `${cfc}-note-custody-quarter${i + 1}`,
          }),
        ),
    });
    source.current_income_records.push({
      ...record("ordinary-note-coupon"),
      kind: "ordinary_interest",
      date: "2025-12-31",
      payor_reference: unrelatedCorporateNote
        ? "UnrelatedUSCorporateIssuer"
        : "AlexTaxpayer",
      payor_owner_tin: unrelatedCorporateNote ? undefined : "111223333",
      payor_country: "US",
      debt_asset_reference: `${cfc}-US-issued-note`,
      gross_payment_received: 1200,
      us_withholding: unrelatedCorporateNote ? 0 : 360,
      withholding_rule: unrelatedCorporateNote
        ? "portfolio_interest_registered_obligation"
        : "related_cfc_default_30pct",
      foreign_beneficial_owner_reference: cfc,
      registered_form_certificate_reference: unrelatedCorporateNote
        ? `${cfc}-registered-obligation-W8BEN-E-source`
        : undefined,
      non_effectively_connected_interest: true,
      no_treaty_reduction_claimed: true,
      foreign_tax_withheld: 0,
      withholding_statement_reference: `${cfc}-coupon-withholding-statement`,
      withholding_payment_record: unrelatedCorporateNote ? undefined : {
        document_reference: `${cfc}-coupon-withholding-statement`,
        evidence_status: "constructed_unverified_no_export",
        payer_reference: "AlexTaxpayer",
        beneficial_owner_cfc_reference: cfc,
        debt_asset_reference: `${cfc}-US-issued-note`,
        payment_date: "2025-12-31",
        gross_interest: 1200,
        rate_numerator: 30,
        rate_denominator: 100,
        withheld_amount: 360,
        net_payment: 840,
        treasury_payment_reference: `${cfc}-constructed-30pct-US-remittance`,
        treasury_payment_date: "2026-01-15",
        treasury_payment_amount: 360,
      },
      coupon_numerator: 2,
      coupon_denominator: 100,
      payment_document_reference: `${cfc}-coupon-bank-payment`,
    });
  }
  return source;
}

import { form8992Cfc } from "../../../../../2025/domains/income/foreign/form8992/form8992.fixture.ts";
import { calculateCategory5Inclusions, inputSchema } from "./index.ts";
import { ownedWorksheetFiledOperands } from "./worksheet-source.ts";
export function ownedCfcWorksheetItem(
  withUSSecurity: boolean,
  unrelatedCorporateNote = false,
) {
  const source = ownedCfcWorksheetSource(
    withUSSecurity,
    unrelatedCorporateNote,
  );
  const { operands } = ownedWorksheetFiledOperands(source);
  const item: Record<string, unknown> = {
    ...structuredClone(form8992Cfc),
    owned_worksheet_source: source,
  };
  for (const [key, value] of Object.entries(operands)) {
    item[key] = typeof value === "object" && value !== null
      ? { ...(item[key] as Record<string, unknown>), ...value }
      : value;
  }
  item.reviewed_form5471_source_reference = source.cfc_reference +
    "-owned-current-records-unverified";
  const i = item.schedule_i as Record<string, unknown>;
  i.worksheet_a_reference = source.cfc_reference + "-worksheet-a";
  i.worksheet_b_reference = source.cfc_reference + "-worksheet-b";
  const id = item.form5471_identity as Record<string, unknown>;
  id.incorporation_date = "2020-01-01";
  id.books_custodian_business_name = source.cfc_name;
  id.statutory_agent_business_name = "Owned Irish Secretary Ltd";
  for (
    const key of [
      "schedule_h",
      "schedule_e",
      "schedule_g",
      "schedule_j",
      "schedule_p",
      "schedule_q",
      "schedule_m",
      "schedule_c",
      "schedule_f",
      "form5471_identity",
    ]
  ) {
    const fields = item[key] as Record<string, unknown>;
    fields.source_workpaper_reference = source.cfc_reference + "-owned-" + key;
  }
  (item.schedule_j as Record<string, unknown>).prior_year_schedule_j_reference =
    source.cfc_reference + "-unverified-owned-prior-books";
  (item.schedule_p as Record<string, unknown>).prior_year_schedule_p_reference =
    source.cfc_reference + "-unverified-owned-prior-books";
  (item.schedule_i1 as Record<string, unknown>).schedule_i1_source_reference =
    source.cfc_reference + "-owned-tested-income-records";
  return inputSchema.parse({ f5471s: [item] }).f5471s[0];
}
export function ownedCfcWorksheetPending(
  withUSSecurity: boolean,
  unrelatedCorporateNote = false,
) {
  const item = ownedCfcWorksheetItem(withUSSecurity, unrelatedCorporateNote),
    calc = calculateCategory5Inclusions(item);
  return {
    f5471: { f5471s: [item] },
    schedule1: {
      line8n_section951a_inclusion: calc.section951a,
      line8o_section951aa_inclusion: calc.gilti,
    },
  };
}

export function ownedCfcWorksheetPublicInputs(
  withUSSecurity: boolean,
  unrelatedCorporateNote = false,
) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1980-06-15",
      digital_assets: false,
      address_line1: "123 Main Street",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f5471: [ownedCfcWorksheetItem(withUSSecurity, unrelatedCorporateNote)],
    schedule_b_part_iii: {
      foreign_accounts_question: true,
      fincen_form114_required: true,
      foreign_trust_question: false,
      foreign_countries: [{ name: "Ireland", irs_code: "EI" }],
    },
  };
}
