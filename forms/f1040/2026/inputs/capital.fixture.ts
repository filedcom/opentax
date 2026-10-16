import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import type { CapitalClaim2026 } from "./capital-source.ts";
export function capitalSale2026(
  id = "sale-1",
): CapitalClaim2026["sales"][number] {
  return {
    sale_reference: id,
    owner_tin: "123456789",
    asset_kind: "security",
    description: `100 Synthetic Shares ${id}`,
    acquisition_method: "purchase",
    date_acquired: "2026-01-01",
    date_sold: "2026-09-01",
    acquisition_record_reference: `purchase-${id}`,
    disposition_record_reference: `sale-${id}`,
    tax_basis: 800.2,
    basis_record_reference: `basis-${id}`,
    actual_proceeds_before_additional_expenses: 1000.4,
    selling_expenses_not_in_reported_proceeds: 0,
    ordinary_investment_asset_not_business_personal_or_special: true,
    wash_sale_review: {
      record_reference: `wash-${id}`,
      disallowed_loss: 0,
      all_accounts_spouse_and_iras_reviewed: true,
    },
    reporting: {
      kind: "1099-B",
      source_document_reference: `statement-${id}`,
      payer_tin: "120000050",
      payer_name: "Synthetic Broker",
      account_number: "broker-account",
      transaction_id: id,
      corrected: false,
      superseded_document_references: [],
      box1d_proceeds: 1000.4,
      box1e_basis: 800.2,
      box1f_market_discount: 0,
      box1g_wash_sale: 0,
      box2_term: "short",
      box3_collectibles_or_qof: false,
      box4_federal_withholding: 0,
      box5_noncovered: false,
      box12_basis_reported: true,
      no_barter_contracts_foreign_or_state_boxes: true,
    },
  };
}
export function capitalFixture2026(wages = 250000) {
  const base = investmentGraphInput2026(wages);
  const claim: CapitalClaim2026 = {
    tax_year: 2026,
    record_reference: "capital-inventory",
    complete_disposition_inventory: true,
    no_other_capital_sources_qof_or_special_rate_gains: true,
    no_form4952_election_or_filing: true,
    no_niit_exclusions_or_amt_basis_differences: true,
    no_other_niit_income_expenses_or_adjustments: true,
    no_canceled_debt_attribute_reduction: true,
    carryover: {
      kind: "none",
      review_reference: "prior-return",
      no_prior_capital_loss_carryover: true,
    },
    sales: [capitalSale2026()],
  };
  return {
    general: { ...base.general, do_not_claim_eic: true },
    ...(base.w2s ? { w2s: base.w2s } : {}),
    capital_gains: { claim },
  };
}
export function mixedCapitalFixture2026() {
  const f = capitalFixture2026();
  f.general.digital_assets = true;
  const a = capitalSale2026("a"),
    b = capitalSale2026("b"),
    c = capitalSale2026("c"),
    d = capitalSale2026("d"),
    e = capitalSale2026("e"),
    j = capitalSale2026("j");
  if (a.reporting.kind !== "1099-B" || c.reporting.kind !== "1099-B") {
    throw new Error("fixture");
  }
  a.reporting.box4_federal_withholding = 101.25;
  c.date_acquired = "2024-01-01";
  c.actual_proceeds_before_additional_expenses = 10000;
  c.tax_basis = 8500;
  c.reporting.box1d_proceeds = 10000;
  c.reporting.box1e_basis = 8000;
  c.reporting.box2_term = "long";
  const da = (s: typeof d, covered: boolean): typeof d.reporting => ({
    kind: "1099-DA",
    source_document_reference: `statement-${s.sale_reference}`,
    payer_tin: "120000051",
    payer_name: "Synthetic Digital Broker",
    account_number: "wallet-account",
    transaction_id: s.sale_reference,
    corrected: false,
    superseded_document_references: [],
    box1a_asset_code: "BTC",
    box1b_asset_name: "Bitcoin",
    box1c_units: 0.01,
    box1f_proceeds: s.actual_proceeds_before_additional_expenses,
    box1g_basis: s.tax_basis,
    box1h_market_discount: 0,
    box1i_wash_sale: 0,
    box2_basis_reported: covered,
    box3b_qof: false,
    box4_federal_withholding: 0,
    box6_term: "unknown",
    box9_noncovered: !covered,
    no_optional_aggregate_method_or_other_special_boxes: true,
  });
  d.asset_kind = "digital_asset";
  d.description = "0.01 Synthetic Digital Asset";
  d.tax_basis = 1500;
  d.actual_proceeds_before_additional_expenses = 1000;
  d.reporting = da(d, false);
  e.date_acquired = "2024-01-01";
  e.tax_basis = 2000;
  e.actual_proceeds_before_additional_expenses = 5000;
  e.selling_expenses_not_in_reported_proceeds = 100;
  e.reporting = {
    kind: "unreported",
    no_information_return_received: true,
    source_document_reference: "private-sale-e",
  };
  j.asset_kind = "digital_asset";
  j.description = "Synthetic Digital Lot J";
  j.date_acquired = "2024-01-01";
  j.tax_basis = 1000.4;
  j.actual_proceeds_before_additional_expenses = 3000.4;
  j.reporting = da(j, true);
  f.capital_gains.claim.sales = [a, b, c, d, e, j];
  return f;
}

export function categoryCapitalFixture2026() {
  const f = mixedCapitalFixture2026(), sample = f.capital_gains.claim.sales;
  f.capital_gains.claim.sales = [
    "A",
    "B",
    "C",
    "G",
    "H",
    "I",
    "D",
    "E",
    "F",
    "J",
    "K",
    "L",
  ].map((part) => {
    const digital = "GHIJKL".includes(part),
      long = "DEFJKL".includes(part),
      unreported = "CFIL".includes(part),
      covered = "ADGJ".includes(part);
    const s = structuredClone(digital ? sample[3] : sample[0]);
    s.sale_reference = `category-${part}`;
    s.description = `Synthetic Category ${part}`;
    s.date_acquired = long ? "2024-01-01" : "2026-01-01";
    s.tax_basis = 1000;
    s.actual_proceeds_before_additional_expenses = 2000;
    s.selling_expenses_not_in_reported_proceeds = covered ? 1 : 0;
    if (unreported) {
      s.reporting = {
        kind: "unreported",
        no_information_return_received: true,
        source_document_reference: `unreported-${part}`,
      };
    } else if (s.reporting.kind === "1099-B") {
      s.reporting.source_document_reference = `statement-${part}`;
      s.reporting.transaction_id = part;
      s.reporting.box2_term = long ? "long" : "short";
      s.reporting.box1e_basis = 1000;
      s.reporting.box1d_proceeds = 2000;
      s.reporting.box12_basis_reported = covered;
      s.reporting.box5_noncovered = !covered;
      s.reporting.box4_federal_withholding = 0;
    } else if (s.reporting.kind === "1099-DA") {
      s.reporting.source_document_reference = `statement-${part}`;
      s.reporting.transaction_id = part;
      s.reporting.box6_term = long ? "long" : "short";
      s.reporting.box1g_basis = 1000;
      s.reporting.box1f_proceeds = 2000;
      s.reporting.box2_basis_reported = covered;
      s.reporting.box9_noncovered = !covered;
    }
    return s;
  });
  return f;
}
