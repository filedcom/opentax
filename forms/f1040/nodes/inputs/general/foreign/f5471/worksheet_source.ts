import { z } from "zod";

const money = z.number().nonnegative().refine((n) =>
  Number.isSafeInteger(Math.round(n * 100)) &&
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-6
);
const ref = z.string().trim().min(1);
const date = z.string().regex(/^202[0-5]-\d{2}-\d{2}$/).refine((s) => {
  const instant = Date.parse(`${s}T00:00:00.000Z`);
  // Date.parse normalizes impossible days; only the original ISO calendar day
  // may enter owned transaction/payment and quarter-balance reconciliation.
  return !Number.isNaN(instant) &&
    new Date(instant).toISOString().slice(0, 10) === s;
}, "Invalid actual calendar date");
const currency = z.literal("USD");
const owner = z.string().regex(/^\d{9}$/);
const record = { cfc_reference: ref, document_reference: ref };
const income = z.discriminatedUnion("kind", [
  z.object({
    ...record,
    kind: z.literal("inventory_sale"),
    date,
    buyer_reference: ref,
    buyer_owner_tin: owner.optional(),
    supplier_reference: ref,
    supplier_owner_tin: owner.optional(),
    units: z.number().int().positive(),
    sale_price_per_unit: money,
    purchase_price_per_unit: money,
    manufactured_country: z.string().length(2),
    consumption_country: z.string().length(2),
    sold_property_manufactured_by_cfc: z.literal(false),
    purchase_document_reference: ref,
    purchase_payment_record: z.object({
      document_reference: ref,
      date: date,
      supplier_reference: ref,
      cfc_reference: ref,
      amount: money,
      bank_reference: ref,
    }).strict(),
    sale_shipping_record: z.object({
      document_reference: ref,
      invoice_document_reference: ref,
      title_transfer_country: z.literal("EI"),
      shipping_origin_country: z.literal("EI"),
      destination_country: z.literal("US"),
      delivery_terms: z.literal("FOB_Dublin_title_at_origin"),
    }).strict(),
  }).strict(),
  z.object({
    ...record,
    kind: z.literal("service"),
    date,
    customer_reference: ref,
    customer_owner_tin: owner.optional(),
    employee_reference: ref,
    units: z.number().positive(),
    price_per_unit: money,
    performance_country: z.string().length(2),
    no_customer_designated_individual: z.literal(true),
    no_related_person_assistance: z.literal(true),
  }).strict(),
  z.object({
    ...record,
    kind: z.literal("ordinary_interest"),
    date,
    payor_reference: ref,
    payor_country: z.string().length(2),
    payor_owner_tin: owner.optional(),
    debt_asset_reference: ref,
    coupon_numerator: z.number().int().nonnegative(),
    coupon_denominator: z.number().int().positive(),
    payment_document_reference: ref,
    gross_payment_received: money,
    us_withholding: money,
    withholding_rule: z.enum([
      "portfolio_interest_registered_obligation",
      "related_cfc_default_30pct",
    ]),
    foreign_beneficial_owner_reference: ref,
    registered_form_certificate_reference: ref.optional(),
    non_effectively_connected_interest: z.literal(true),
    no_treaty_reduction_claimed: z.literal(true),
    foreign_tax_withheld: z.literal(0),
    withholding_statement_reference: ref,
    withholding_payment_record: z.object({
      document_reference: ref,
      evidence_status: z.literal("constructed_unverified_no_export"),
      payer_reference: ref,
      beneficial_owner_cfc_reference: ref,
      debt_asset_reference: ref,
      payment_date: z.literal("2025-12-31"),
      gross_interest: money,
      rate_numerator: z.literal(30),
      rate_denominator: z.literal(100),
      withheld_amount: money,
      net_payment: money,
      treasury_payment_reference: ref,
      treasury_payment_date: z.literal("2026-01-15"),
      treasury_payment_amount: money,
    }).strict().optional(),
  }).strict(),
]);
const expense = z.object({
  ...record,
  date,
  kind: z.enum(["interest", "operating", "income_tax"]),
  amount: money,
  income_document_reference: ref,
  payee_reference: ref,
  payee_owner_tin: owner.optional(),
  payment_document_reference: ref,
  loan_reference: ref.optional(),
  tax_assessment_reference: ref.optional(),
  assessed_taxable_income: money.optional(),
  tax_exempt_income_document_references: z.array(ref).optional(),
}).strict();
const quarter = z.object({
  quarter_end: z.enum(["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"]),
  book_depreciation: money,
  ep_depreciation: money,
  tax_depreciation: money,
  location_country: z.string().length(2),
  asset_use: z.enum(["tested_services", "subpart_f_sales", "investment"]),
  location_document_reference: ref,
  depreciation_document_reference: ref,
}).strict();
const asset = z.discriminatedUnion("kind", [
  z.object({
    ...record,
    kind: z.literal("depreciable_equipment"),
    asset_reference: ref,
    acquired_on: date,
    units: z.number().int().positive(),
    purchase_price_per_unit: money,
    purchase_document_reference: ref,
    prior_location_country: z.string().length(2),
    quarter_records: z.array(quarter).length(4),
  }).strict(),
  z.object({
    ...record,
    kind: z.literal("debt_obligation"),
    asset_reference: ref,
    acquired_on: date,
    issuer_reference: ref,
    issuer_legal_type: z.enum(["individual", "domestic_corporation"]),
    issuer_country: z.string().length(2),
    issuer_owner_tin: owner.optional(),
    principal: money,
    issue_document_reference: ref,
    payment_document_reference: ref,
    quarter_records: z.array(
      z.object({
        quarter_end: quarter.shape.quarter_end,
        principal_outstanding: money,
        liability_subject_to_property: money,
        custody_document_reference: ref,
      }).strict(),
    ).length(4),
  }).strict(),
]);
const priorYear = z.object({
  ...record,
  tax_year: z.number().int().min(2020).max(2024),
  services_performed_country: z.string().length(2),
  service_units: z.number().positive(),
  service_price_per_unit: money,
  operating_payments: z.array(
    z.object({ reference: ref, amount: money }).strict(),
  ),
  asset_depreciation: z.array(
    z.object({
      asset_reference: ref,
      amount: money,
      ep_amount: money,
      tax_amount: money,
      quarter_tax_depreciation: z.array(money).length(4),
      document_reference: ref,
    }).strict(),
  ),
  no_other_income_expenses_distributions_or_assets: z.literal(true),
  income_document_reference: ref,
  bank_reconciliation_reference: ref,
}).strict();

/** Authored account/source prerequisite. This record has no acceptance flag and
 * cannot authorize a return export or authenticate prior filed history. */
export const ownedCfcWorksheetSourceSchema = z.object({
  cfc_reference: ref,
  cfc_name: ref,
  corporate_register_record: z.object({
    document_reference: ref,
    incorporation_date: z.literal("2020-01-01"),
    address: z.object({
      line1: ref,
      city: ref,
      country_code: z.literal("EI"),
      postal_code: ref,
    }).strict(),
    business_activity_code: z.string().regex(/^\d{6}$/),
    business_activity_description: ref,
    statutory_agent_business_name: ref,
    stock_class_description: ref,
  }).strict(),
  functional_currency: currency,
  corporation_country: z.literal("EI"),
  shareholder_tin: owner,
  shareholder_name: ref,
  stock_issued_on: z.literal("2020-01-01"),
  stock_register_reference: ref,
  shares_issued: z.number().int().positive(),
  capital_paid_per_share: money,
  capital_payment_reference: ref,
  sole_direct_owner_since_formation: z.literal(true),
  no_ownership_changes_cash_distributions_or_other_book_income: z.literal(true),
  interest_apportionment_election_prerequisite: z.object({
    document_reference: ref,
    evidence_status: z.literal("constructed_unverified_no_export"),
    cfc_reference: ref,
    method: z.literal("modified_gross_income"),
    initial_interest_year: z.literal(2025),
    effective_tax_year: z.literal(2025),
    controlling_shareholder_tin: owner,
    designated_shareholder_tin: owner,
    controlling_shareholder_name: ref,
    controlling_shareholder_address: z.object({
      line1: ref,
      city: ref,
      state: ref,
      zip: ref,
    }).strict(),
    voting_percentage: z.literal(100),
    shares_owned: z.number().int().positive(),
    corporation_country: z.literal("EI"),
    corporation_name: ref,
    statement_for_return_tax_year: z.literal(2025),
    intended_statement_filing_deadline: z.literal("2026-04-15"),
    retained_consent_document_reference: ref,
    consent_authority: z.literal("unverified_no_export"),
    other_domestic_shareholders: z.array(owner).length(0),
    complete_controlled_cfc_inventory: z.array(ref).length(1),
    lower_tier_cfc_stock_inventory: z.array(ref).length(0),
  }).strict(),
  counterparty_register: z.array(
    z.object({
      party_reference: ref,
      entity_kind: z.enum(["individual", "corporation", "government"]),
      country: z.string().length(2),
      ownership_register_reference: ref,
      owners: z.array(
        z.object({ tin: owner, percentage: z.number().positive().max(100) })
          .strict(),
      ).min(1),
      complete_direct_and_indirect_control_inventory: z.literal(true),
      no_other_common_control: z.literal(true),
    }).strict(),
  ).min(1),
  current_borrowing_records: z.array(
    z.object({
      ...record,
      loan_reference: ref,
      lender_reference: ref,
      originated_on: z.literal("2025-01-01"),
      repaid_on: z.literal("2025-12-31"),
      principal_received: money,
      principal_repaid: money,
      annual_rate_numerator: z.number().int().nonnegative(),
      annual_rate_denominator: z.number().int().positive(),
      receipt_bank_reference: ref,
      repayment_bank_reference: ref,
      unsecured: z.literal(true),
      quarter_principal_balances: z.array(money).length(4),
    }).strict(),
  ),
  current_bank_balance_record: z.object({
    cfc_reference: ref,
    document_reference: ref,
    evidence_status: z.literal("constructed_unverified_no_export"),
    bank_country: z.literal("EI"),
    account_reference: ref,
    unremunerated_deposit: z.literal(true),
    opening_balance: money,
    quarter_closing_balances: z.array(money).length(4),
    closing_balance: money,
    no_other_cash_accounts: z.literal(true),
  }).strict(),
  current_cash_receipts: z.array(
    z.object({
      ...record,
      income_document_reference: ref,
      amount: money,
      received_on: date,
      bank_reference: ref,
      cash_settlement_without_receivable: z.literal(true),
    }).strict(),
  ),
  current_income_records: z.array(income),
  current_expense_records: z.array(expense),
  owned_assets: z.array(asset),
  prior_year_records: z.array(priorYear).length(5),
  currency_translation_reference: ref,
  cash_account_country: z.literal("EI"),
  cash_account_reference: ref,
  complete_asset_income_expense_and_related_person_inventory: z.literal(true),
}).strict();
export type OwnedCfcWorksheetSource = z.infer<
  typeof ownedCfcWorksheetSourceSchema
>;
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (xs: readonly number[]) => cents(xs.reduce((a, b) => a + b, 0));
const quarters = ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"];

export function calculateOwnedCfcWorksheets(raw: unknown) {
  const source = ownedCfcWorksheetSourceSchema.parse(raw);
  const referenceSet = new Set<string>();
  const own = (r: { cfc_reference: string; document_reference: string }) => {
    if (
      r.cfc_reference !== source.cfc_reference ||
      referenceSet.has(r.document_reference)
    ) {
      throw Error(
        "CFC worksheet source owner or duplicate source record conflicts",
      );
    }
    referenceSet.add(r.document_reference);
  };
  const election = source.interest_apportionment_election_prerequisite;
  if (
    election.cfc_reference !== source.cfc_reference ||
    election.corporation_name !== source.cfc_name ||
    election.controlling_shareholder_tin !== source.shareholder_tin ||
    election.designated_shareholder_tin !== source.shareholder_tin ||
    election.controlling_shareholder_name !== source.shareholder_name ||
    election.shares_owned !== source.shares_issued ||
    election.complete_controlled_cfc_inventory[0] !== source.cfc_reference
  ) {
    throw Error(
      "Constructed election prerequisite must reconcile controlling owner, stock, corporation and complete single-tier CFC inventory; it does not authenticate consent or filing",
    );
  }
  const parties = new Map(
    source.counterparty_register.map((p) => [p.party_reference, p]),
  );
  if (parties.size !== source.counterparty_register.length) {
    throw Error("Counterparty inventory duplicates a party");
  }
  for (const p of parties.values()) {
    if (
      new Set(p.owners.map((o) => o.tin)).size !== p.owners.length ||
      sum(p.owners.map((o) => o.percentage)) !== 100
    ) {
      throw Error(
        "Counterparty control register must completely reconcile ownership",
      );
    }
  }
  const party = (reference: string, declaredOwner?: string) => {
    const p = parties.get(reference);
    if (
      !p ||
      (declaredOwner &&
        !p.owners.some((o) => o.tin === declaredOwner && o.percentage > 50))
    ) {
      throw Error(
        "Counterparty source identity/control does not join its ownership register",
      );
    }
    return {
      ...p,
      related: p.owners.some((o) =>
        o.tin === source.shareholder_tin && o.percentage > 50
      ),
    };
  };
  for (const loan of source.current_borrowing_records) {
    own(loan);
    if (
      party(loan.lender_reference).related ||
      loan.principal_received !== loan.principal_repaid ||
      loan.quarter_principal_balances.some((n, i) =>
        n !== (i === 3 ? 0 : loan.principal_received)
      )
    ) {
      throw Error(
        "Actual unrelated borrowing principal/payment/quarter balances must reconcile",
      );
    }
  }
  const assets = new Map(
    source.owned_assets.map((a) => [a.asset_reference, a]),
  );
  if (assets.size !== source.owned_assets.length) {
    throw Error("CFC worksheet asset inventory duplicates an owned asset");
  }
  for (const a of source.owned_assets) {
    own(a);
    if (a.quarter_records.some((q, i) => q.quarter_end !== quarters[i])) {
      throw Error(
        "CFC worksheet requires complete ordered quarter-end owned property records",
      );
    }
    if (
      a.kind === "debt_obligation" &&
      (a.acquired_on !== "2025-01-01" ||
        party(a.issuer_reference).country !== a.issuer_country ||
        party(a.issuer_reference).entity_kind !==
          (a.issuer_legal_type === "individual"
            ? "individual"
            : "corporation") ||
        a.quarter_records.some((q) => q.principal_outstanding !== a.principal))
    ) {
      throw Error(
        "Debt obligation source requires actual fully owned issuer principal throughout the year",
      );
    }
  }
  const prior = source.prior_year_records.map((p, i) => {
    own(p);
    if (
      p.tax_year !== 2020 + i ||
      p.services_performed_country !== source.corporation_country
    ) {
      throw Error(
        "Prior owned CFC books must include every year and actual foreign service income",
      );
    }
    if (
      p.asset_depreciation.length !==
        [...assets.values()].filter((a) => a.kind === "depreciable_equipment")
          .length ||
      new Set(p.asset_depreciation.map((d) => d.asset_reference)).size !==
        p.asset_depreciation.length
    ) {
      throw Error(
        "Prior CFC depreciation inventory must cover every owned equipment asset once",
      );
    }
    for (const d of p.asset_depreciation) {
      const a = assets.get(d.asset_reference);
      if (
        a?.kind !== "depreciable_equipment" ||
        Number(a.acquired_on.slice(0, 4)) > p.tax_year ||
        a.prior_location_country !== source.corporation_country ||
        d.amount !== d.ep_amount || d.amount !== d.tax_amount ||
        sum(d.quarter_tax_depreciation) !== d.tax_amount
      ) {
        throw Error(
          "Prior owned equipment E&P/tax depreciation or country source requires separate unsupported adjustment history",
        );
      }
    }
    const gross = cents(p.service_units * p.service_price_per_unit);
    const operating = sum(p.operating_payments.map((r) => r.amount));
    const depreciation = sum(p.asset_depreciation.map((d) => d.amount));
    const ep = cents(gross - operating - depreciation);
    if (ep < 0) {
      throw Error(
        "Prior CFC source deficit requires complete loss/history route",
      );
    }
    const qbai = sum(p.asset_depreciation.map((d) => {
      const a = assets.get(d.asset_reference)!;
      if (a.kind !== "depreciable_equipment") return 0;
      const oldDep = sum(
        source.prior_year_records.slice(0, i).flatMap((y) =>
          y.asset_depreciation.filter((x) =>
            x.asset_reference === a.asset_reference
          ).map((x) => x.tax_amount)
        ),
      );
      return cents(
        a.units * a.purchase_price_per_unit - oldDep -
          sum(
              d.quarter_tax_depreciation.map((_, q) =>
                sum(d.quarter_tax_depreciation.slice(0, q + 1))
              ),
            ) / 4,
      );
    }));
    if (Math.max(0, ep - Math.round(qbai * .1)) !== 0) {
      throw Error(
        "Prior actual tested income creates GILTI PTEP needing prior inclusion and filed-return source",
      );
    }
    return {
      tax_year: p.tax_year,
      gross,
      operating,
      depreciation,
      ep,
      subpart_f: 0,
      gilti: 0,
      us_property: 0,
      section956: 0,
    };
  });
  const amounts = source.current_income_records.map((r) => {
    own(r);
    if (!r.date.startsWith("2025-")) {
      throw Error(
        "Current CFC income must have actual current-year transaction dates",
      );
    }
    if (r.kind === "inventory_sale") {
      const related = party(r.buyer_reference, r.buyer_owner_tin).related ||
        party(r.supplier_reference, r.supplier_owner_tin).related;
      const fbcSales = related &&
        r.manufactured_country !== source.corporation_country &&
        r.consumption_country !== source.corporation_country;
      if (related && !fbcSales) {
        throw Error(
          "Related sales exclusion requires applicable ScheduleG/source exception route",
        );
      }
      if (
        r.purchase_payment_record.cfc_reference !== source.cfc_reference ||
        r.purchase_payment_record.supplier_reference !== r.supplier_reference ||
        r.purchase_payment_record.document_reference !==
          r.purchase_document_reference ||
        r.purchase_payment_record.amount !==
          cents(r.units * r.purchase_price_per_unit) ||
        r.purchase_payment_record.date !== r.date ||
        r.sale_shipping_record.invoice_document_reference !==
          r.document_reference ||
        r.sale_shipping_record.destination_country !== r.consumption_country
      ) {
        throw Error(
          "Purchased inventory payment and foreign title/shipping record must join actual supplier, invoice, units/cost and destination",
        );
      }
      const revenue = cents(r.units * r.sale_price_per_unit),
        cogs = cents(r.units * r.purchase_price_per_unit);
      if (cogs > revenue) {
        throw Error("CFC sales loss requires separate loss allocation source");
      }
      return {
        reference: r.document_reference,
        kind: r.kind,
        revenue,
        cogs,
        gross: cents(revenue - cogs),
        category: fbcSales ? "sales" : "tested",
      };
    }
    if (r.kind === "service") {
      if (
        r.performance_country !== source.corporation_country ||
        party(r.customer_reference, r.customer_owner_tin).related
      ) {
        throw Error(
          "Related or foreign-performed services require actual foreign base company services source route",
        );
      }
      const revenue = cents(r.units * r.price_per_unit);
      return {
        reference: r.document_reference,
        kind: r.kind,
        revenue,
        cogs: 0,
        gross: revenue,
        category: "tested",
      };
    }
    const a = assets.get(r.debt_asset_reference);
    if (
      a?.kind !== "debt_obligation" ||
      r.payor_reference !== a.issuer_reference ||
      r.payor_country !== a.issuer_country ||
      r.payor_owner_tin !== a.issuer_owner_tin
    ) {
      throw Error(
        "Ordinary interest must join its actual owned debt issuer/property record",
      );
    }
    const revenue = cents(
      a.principal * r.coupon_numerator / r.coupon_denominator,
    );
    const related = party(a.issuer_reference, a.issuer_owner_tin).related;
    const expectedWithholding = related ? cents(revenue * .3) : 0;
    if (
      r.foreign_beneficial_owner_reference !== source.cfc_reference ||
      r.us_withholding !== expectedWithholding ||
      r.withholding_rule !==
        (related
          ? "related_cfc_default_30pct"
          : "portfolio_interest_registered_obligation") ||
      (!related &&
        (!r.registered_form_certificate_reference ||
          a.issuer_legal_type !== "domestic_corporation")) ||
      (related && r.registered_form_certificate_reference)
    ) {
      throw Error(
        "US interest default withholding/portfolio certificate must reconcile actual CFC/related issuer source; no unsupported treaty exception",
      );
    }
    const withholding = r.withholding_payment_record;
    if (expectedWithholding > 0) {
      if (
        !withholding ||
        withholding.document_reference !== r.withholding_statement_reference ||
        withholding.payer_reference !== r.payor_reference ||
        withholding.beneficial_owner_cfc_reference !== source.cfc_reference ||
        withholding.debt_asset_reference !== a.asset_reference ||
        withholding.gross_interest !== revenue ||
        withholding.withheld_amount !== expectedWithholding ||
        withholding.treasury_payment_amount !== expectedWithholding ||
        withholding.net_payment !== cents(revenue - expectedWithholding)
      ) {
        throw Error(
          "Constructed US withholding/remittance record must join actual payer, owned debt, CFC beneficiary, gross/rate/net and retained payment; external authorization remains unverified",
        );
      }
    } else if (withholding) {
      throw Error(
        "Zero portfolio withholding cannot invent a Treasury remittance",
      );
    }
    if (r.gross_payment_received !== revenue) {
      throw Error(
        "Ordinary coupon gross bank receipt and withholding statement must reconcile actual contract",
      );
    }
    return {
      reference: r.document_reference,
      kind: r.kind,
      revenue,
      cogs: 0,
      gross: revenue,
      category: "passive",
    };
  });
  if (
    source.current_cash_receipts.length !== amounts.length ||
    new Set(
        source.current_cash_receipts.map((r) => r.income_document_reference),
      ).size !== amounts.length
  ) {
    throw Error(
      "Complete current cash receipts must join every income transaction exactly once",
    );
  }
  for (const receipt of source.current_cash_receipts) {
    own(receipt);
    const income = source.current_income_records.find((i) =>
      i.document_reference === receipt.income_document_reference
    );
    const computed = amounts.find((i) =>
      i.reference === receipt.income_document_reference
    );
    if (
      !income || !computed ||
      receipt.amount !==
        cents(
          computed.revenue -
            (income.kind === "ordinary_interest" ? income.us_withholding : 0),
        ) ||
      receipt.received_on !== income.date
    ) {
      throw Error(
        "Actual income receipt/bank/date must reconcile cash sale without an outstanding related receivable",
      );
    }
  }
  const postedExpenses = source.current_expense_records.map((r) => {
    own(r);
    const target = amounts.find((a) =>
      a.reference === r.income_document_reference
    );
    if (
      !target || !r.date.startsWith("2025-") ||
      party(r.payee_reference, r.payee_owner_tin).related
    ) {
      throw Error(
        "CFC expense must join owned current income and unrelated paid source",
      );
    }
    if (r.kind === "interest") {
      const loan = source.current_borrowing_records.find((l) =>
        l.loan_reference === r.loan_reference
      );
      if (
        !loan || loan.lender_reference !== r.payee_reference ||
        r.amount !==
          cents(
            loan.principal_received * loan.annual_rate_numerator /
              loan.annual_rate_denominator,
          )
      ) {
        throw Error(
          "Interest expense must derive actual owned borrowing contract and payment",
        );
      }
    } else if (r.loan_reference) {
      throw Error("Noninterest expense cannot borrow a loan locator");
    }
    if (
      r.kind === "income_tax" &&
      (!r.tax_assessment_reference || r.assessed_taxable_income === undefined)
    ) {
      throw Error(
        "Foreign tax requires its current assessment and taxable-income source",
      );
    }
    if (
      r.kind !== "income_tax" &&
      (r.tax_assessment_reference || r.assessed_taxable_income !== undefined ||
        r.tax_exempt_income_document_references)
    ) throw Error("Nontax expense cannot borrow an assessment");
    if (r.kind === "operating" && r.amount > 0) {
      throw Error(
        "Current positive operating expenses require the complete ScheduleC other-deduction projection",
      );
    }
    return { ...r, category: target.category };
  });
  if (
    new Set(source.current_borrowing_records.map((l) => l.loan_reference))
        .size !== source.current_borrowing_records.length ||
    source.current_borrowing_records.some((l) =>
      postedExpenses.filter((e) => e.loan_reference === l.loan_reference)
        .length !== 1
    )
  ) {
    throw Error(
      "Complete borrowing inventory needs exactly one actual annual interest payment per loan",
    );
  }
  const openingDep = (
    assetRef: string,
    field: "amount" | "ep_amount" | "tax_amount",
  ) =>
    sum(
      source.prior_year_records.flatMap((y) =>
        y.asset_depreciation.filter((d) => d.asset_reference === assetRef).map((
          d,
        ) => d[field])
      ),
    );
  const depreciationByCategory = { sales: 0, passive: 0, tested: 0 };
  const basisRows = source.owned_assets.map((a) => {
    if (a.kind === "debt_obligation") {
      return {
        asset_reference: a.asset_reference,
        kind: a.kind,
        cost: a.principal,
        beginning_book_basis: 0,
        ending_book_basis: a.principal,
        quarter_ep_basis: a.quarter_records.map((q) => q.principal_outstanding),
        quarter_qbai_basis: [0, 0, 0, 0],
        quarter_us_property: a.quarter_records.map((q) =>
          a.issuer_country === "US" &&
            (a.issuer_legal_type === "individual"
              ? party(a.issuer_reference, a.issuer_owner_tin).related
              : (party(a.issuer_reference, a.issuer_owner_tin).owners.find(
                (o) => o.tin === source.shareholder_tin,
              )?.percentage ?? 0) >= 25)
            ? Math.max(
              0,
              cents(q.principal_outstanding - q.liability_subject_to_property),
            )
            : 0
        ),
      };
    }
    const cost = cents(a.units * a.purchase_price_per_unit);
    if (a.acquired_on !== "2020-01-01") {
      throw Error(
        "Equipment acquisition requires actual complete formation-year history",
      );
    }
    let bookBasis = cents(cost - openingDep(a.asset_reference, "amount"));
    let epBasis = cents(cost - openingDep(a.asset_reference, "ep_amount"));
    let taxBasis = cents(cost - openingDep(a.asset_reference, "tax_amount"));
    const beginning = bookBasis;
    const epRows: number[] = [], qbaiRows: number[] = [], usRows: number[] = [];
    for (const q of a.quarter_records) {
      if (
        q.book_depreciation !== q.ep_depreciation ||
        q.book_depreciation !== q.tax_depreciation
      ) {
        throw Error(
          "Current CFC equipment requires actual depreciation adjustment route",
        );
      }
      bookBasis = cents(bookBasis - q.book_depreciation);
      epBasis = cents(epBasis - q.ep_depreciation);
      taxBasis = cents(taxBasis - q.tax_depreciation);
      if (Math.min(bookBasis, epBasis, taxBasis) < 0) {
        throw Error(
          "Owned CFC property depreciation exceeds actual acquired basis",
        );
      }
      const category = q.asset_use === "tested_services"
        ? "tested"
        : q.asset_use === "subpart_f_sales"
        ? "sales"
        : "passive";
      depreciationByCategory[category] = cents(
        depreciationByCategory[category] + q.book_depreciation,
      );
      epRows.push(epBasis);
      qbaiRows.push(category === "tested" ? taxBasis : 0);
      usRows.push(q.location_country === "US" ? epBasis : 0);
    }
    return {
      asset_reference: a.asset_reference,
      kind: a.kind,
      cost,
      beginning_book_basis: beginning,
      ending_book_basis: bookBasis,
      quarter_ep_basis: epRows,
      quarter_qbai_basis: qbaiRows,
      quarter_us_property: usRows,
    };
  });
  // Unsecured borrowing is fungible. The invoice locator retains the foreign
  // posting/assessment basis; it does not direct the US interest deduction.
  // 1.861-9(f)(3), -9T(j)(1): a sole single-tier CFC's constructed
  // modified-gross-income election prerequisite apportions by actual gross.
  const allocationCategories = ["sales", "passive", "tested"] as const;
  const totalAllocationGross = sum(amounts.map((a) => a.gross));
  const interestAllocations = postedExpenses.filter((e) =>
    e.kind === "interest"
  ).map((e) => {
    const raw = allocationCategories.map((category) => ({
      category,
      gross: sum(
        amounts.filter((a) => a.category === category).map((a) => a.gross),
      ),
    })).map((row) => ({
      ...row,
      raw_amount: e.amount * row.gross / totalAllocationGross,
    }));
    // Monetary allocation rows conserve the original paid cents, retaining the
    // unrounded rational result separately. Largest fractional cent first.
    const centRows = raw.map((row) => ({
      ...row,
      whole_cents: Math.floor(row.raw_amount * 100),
    }));
    let remainder = Math.round(e.amount * 100) -
      centRows.reduce((n, r) => n + r.whole_cents, 0);
    for (
      const row of [...centRows].sort((a, b) =>
        (b.raw_amount * 100 - b.whole_cents) -
        (a.raw_amount * 100 - a.whole_cents)
      )
    ) {
      if (remainder-- > 0) row.whole_cents++;
    }
    return {
      document_reference: e.document_reference,
      paid_amount: e.amount,
      gross_denominator: totalAllocationGross,
      rows: centRows.map((row) => ({ ...row, amount: row.whole_cents / 100 })),
    };
  });
  const expenses = postedExpenses.flatMap((e) =>
    e.kind === "interest"
      ? interestAllocations.find((a) =>
        a.document_reference === e.document_reference
      )!.rows.map((row) => ({
        ...e,
        category: row.category,
        amount: row.amount,
      }))
      : [e]
  );
  const totals = (category: string) => {
    const gross = sum(
      amounts.filter((a) => a.category === category).map((a) => a.gross),
    );
    const paid = sum(
      expenses.filter((e) => e.category === category).map((e) => e.amount),
    );
    const dep =
      depreciationByCategory[category as keyof typeof depreciationByCategory];
    if (gross - paid - dep < 0) {
      throw Error(
        "CFC source category loss requires separate loss allocation route",
      );
    }
    return { gross, paid, depreciation: dep, net: cents(gross - paid - dep) };
  };
  const sales = totals("sales"),
    passive = totals("passive"),
    tested = totals("tested");
  for (const tax of expenses.filter((e) => e.kind === "income_tax")) {
    const foreignGross = sum(
      amounts.filter((a) => a.category === tax.category).map((a) => a.gross),
    );
    const foreignNonTaxPayments = sum(
      postedExpenses.filter((e) =>
        e.category === tax.category && e.kind !== "income_tax"
      ).map((e) => e.amount),
    );

    const exempt = amounts.filter((a) => a.category !== tax.category).map((a) =>
      a.reference
    ).sort();
    if (
      tax.assessed_taxable_income !==
        cents(
          foreignGross - foreignNonTaxPayments -
            depreciationByCategory[
              tax.category as keyof typeof depreciationByCategory
            ],
        ) ||
      JSON.stringify(
          [...(tax.tax_exempt_income_document_references ?? [])].sort(),
        ) !== JSON.stringify(exempt)
    ) {
      throw Error(
        "Tax assessment must independently reconcile taxable category and complete exempt income inventory",
      );
    }
  }
  const usTax = sum(
    source.current_income_records.flatMap((i) =>
      i.kind === "ordinary_interest" ? [i.us_withholding] : []
    ),
  );
  const totalGross = sum(amounts.map((a) => a.gross)),
    currentEp = cents(sales.net + passive.net + tested.net - usTax);
  const epOpening = sum(prior.map((p) => p.ep));
  const baseGross = cents(sales.gross + passive.gross);
  const deMinimis = baseGross < totalGross * .05 && baseGross < 1_000_000;
  const fullInclusion = baseGross > totalGross * .7;
  if (fullInclusion) {
    throw Error(
      "Full-inclusion CFC income requires its separate category/expense source allocation route",
    );
  }
  if (deMinimis && baseGross > 0) {
    throw Error(
      "De-minimis source requires tested-category expense/tax reallocation route",
    );
  }
  if (sales.net + passive.net > currentEp) {
    throw Error(
      "SubpartF E&P limitation requires complete section952(c) allocation/history",
    );
  }
  const a: Record<string, number> = {};
  for (
    const k of [
      "1a",
      "1b",
      "1c",
      "1d",
      "1e",
      "1f",
      "1g",
      "1h",
      "1i",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13a",
      "13b",
      "13c",
      "13d",
      "13e",
      "13f",
      "13g",
      "13h",
      "13i",
      "13j",
      "14a",
      "14b",
      "14c",
      "14d",
      "14e",
      "14f",
      "14g",
      "15a",
      "15b",
      "15c",
      "15d",
      "15e",
      "15f",
      "15g",
      "16a",
      "16b",
      "16c",
      "16d",
      "16e",
      "16f",
      "16g",
      "17a",
      "17b",
      "17c",
      "17d",
      "17e",
      "17f",
      "17g",
      "18a",
      "18b",
      "18c",
      "18d",
      "18e",
      "18f",
      "18g",
      "18h",
      "18i",
      "18j",
      "18k",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
      "47",
      "48",
      "49",
      "50",
      "51",
      "52",
      "53",
      "54",
      "55",
      "56",
      "57",
      "58",
      "59",
      "60",
      "61",
      "62",
      "63",
      "64",
      "65",
      "66",
      "67",
    ]
  ) a[k] = 0;
  Object.assign(a, {
    "1a": passive.gross,
    "2": passive.gross,
    "3": sales.gross,
    "5": baseGross,
    "7": baseGross,
    "8": cents(totalGross * .05),
    "9": cents(totalGross * .7),
    "12": baseGross,
    "13a": passive.gross,
    "13b": passive.paid + passive.depreciation,
    "13c": passive.net,
    "13f": passive.net,
    "13h": passive.net,
    "13j": passive.net,
    "14a": sales.gross,
    "14b": sales.paid + sales.depreciation,
    "14c": sales.net,
    "14e": sales.net,
    "14g": sales.net,
    "22": sales.net + passive.net,
    "24": passive.net,
    "26": sales.net,
    "31": sales.net + passive.net,
    "32": passive.net,
    "34": passive.net,
    "35": sales.net,
    "37": sales.net,
    "44": sales.net + passive.net,
    "45": sales.net + passive.net,
    "49": sales.net + passive.net,
    "50": passive.net,
    "51": Math.round(passive.net),
    "53": Math.round(passive.net),
    "54": sales.net,
    "55": Math.round(sales.net),
    "57": Math.round(sales.net),
  });
  const qbaiQuarters = quarters.map((_, i) =>
    sum(basisRows.map((b) => b.quarter_qbai_basis[i]))
  );
  const qbai = cents(sum(qbaiQuarters) / 4), filedQbai = Math.round(qbai);
  const testedInterestExpense = sum(
    expenses.filter((e) => e.category === "tested" && e.kind === "interest")
      .map((e) => e.amount),
  );
  // Ordinary interest is subpartF/passive; it is never tested interest income.
  const dtir = Math.round(filedQbai * .1),
    netDtir = Math.max(0, dtir - Math.round(testedInterestExpense));
  const gilti = Math.max(0, Math.round(tested.net) - netDtir);
  const ptep = cents(a["53"] + a["57"] + gilti);
  const usQuarters = quarters.map((_, i) =>
    sum(basisRows.map((b) => b.quarter_us_property[i]))
  );
  const usAverage = cents(sum(usQuarters) / 4),
    available = cents(epOpening + currentEp);
  const b = {
    "1a": usQuarters[0],
    "1b": usQuarters[1],
    "1c": usQuarters[2],
    "1d": usQuarters[3],
    "2": 4,
    "3": usAverage,
    "4": usAverage,
    "5": 0,
    "6": usAverage,
    "7a": currentEp,
    "7b": available,
    "8": Math.max(currentEp, available),
    "9": 0,
    "10": Math.max(currentEp, available),
    "11": 0,
    "12": Math.max(currentEp, available),
    "13": Math.max(currentEp, available),
    "14": Math.min(usAverage, Math.max(currentEp, available)),
    "15": ptep,
    "16": Math.max(
      0,
      cents(Math.min(usAverage, Math.max(currentEp, available)) - ptep),
    ),
    "17": 0,
    "18": Math.max(
      0,
      cents(Math.min(usAverage, Math.max(currentEp, available)) - ptep),
    ),
    "19": Math.round(
      Math.max(
        0,
        cents(Math.min(usAverage, Math.max(currentEp, available)) - ptep),
      ),
    ),
  };
  const reclassified = cents(Math.min(b["14"], ptep));
  const capital = cents(source.shares_issued * source.capital_paid_per_share);
  const equipmentCost = sum(
    basisRows.filter((r) => r.kind === "depreciable_equipment").map((r) =>
      r.cost
    ),
  );
  const priorDep = sum(prior.map((p) => p.depreciation));
  const cashBegin = cents(capital - equipmentCost + epOpening + priorDep);
  const newInvestments = sum(
    basisRows.filter((r) => r.kind === "debt_obligation").map((r) => r.cost),
  );
  const currentDep = sum(Object.values(depreciationByCategory));
  const cashEnd = cents(cashBegin + currentEp + currentDep - newInvestments);
  if (cashBegin < 0 || cashEnd < 0) {
    throw Error(
      "Owned CFC capital/cash ledger cannot finance its actual asset inventory",
    );
  }
  own(source.current_bank_balance_record);
  const bank = source.current_bank_balance_record;
  const bankQuarters = quarters.map((end) =>
    cents(
      cashBegin +
        sum(
          source.current_borrowing_records.filter((l) => l.originated_on <= end)
            .map((l) => l.principal_received),
        ) -
        sum(
          source.current_borrowing_records.filter((l) => l.repaid_on <= end)
            .map((l) => l.principal_repaid),
        ) +
        sum(
          source.current_cash_receipts.filter((r) => r.received_on <= end).map(
            (r) => r.amount,
          ),
        ) -
        sum(postedExpenses.filter((e) => e.date <= end).map((e) => e.amount)) -
        sum(
          source.current_income_records.filter((r) =>
            r.kind === "inventory_sale" && r.date <= end
          ).map((r) =>
            r.kind === "inventory_sale"
              ? cents(r.units * r.purchase_price_per_unit)
              : 0
          ),
        ) -
        sum(
          source.owned_assets.filter((a) =>
            a.kind === "debt_obligation" && a.acquired_on <= end
          ).map((a) => a.kind === "debt_obligation" ? a.principal : 0),
        ),
    )
  );
  if (
    bank.opening_balance !== cashBegin || bank.closing_balance !== cashEnd ||
    bank.quarter_closing_balances.some((amount, i) =>
      amount !== bankQuarters[i]
    ) ||
    bank.closing_balance !== bank.quarter_closing_balances[3]
  ) {
    throw Error(
      "Constructed owned bank balances must independently reconcile capital, receipts, asset acquisitions, actual posted costs and principal repayments",
    );
  }
  const relatedNotes = source.owned_assets.filter((a) =>
    a.kind === "debt_obligation" && a.issuer_country === "US" &&
    party(a.issuer_reference, a.issuer_owner_tin).related
  );
  const unresolvedDebtPricing = relatedNotes.map((a) => ({
    asset_reference: a.asset_reference,
    source_document_reference: a.document_reference,
    source_principal: a.kind === "debt_obligation" ? a.principal : 0,
    missing_records: [
      "original executed note and origination date (acquisition date is not origination)",
      "demand-versus-term status, maturity, payment and compounding schedule",
      "original issue price and actual borrower cash/property transfer",
      "applicable original-date AFR and section482 pricing records",
      "section7872 deemed-transfer character, E&P/distribution and OID calculation",
      "quarter-end adjusted E&P basis after actual OID/payment history",
    ],
  }));
  return {
    source,
    filing_authority: "unverified_no_export" as const,
    settlement_status: unresolvedDebtPricing.length
      ? "unsettled_related_note_7872_482" as const
      : "source_calculated_unverified_history" as const,
    unresolved_debt_pricing: unresolvedDebtPricing,
    prior_years: prior,
    classified_income: amounts,
    classified_expenses: expenses,
    foreign_posted_expenses: postedExpenses,
    interest_apportionment: interestAllocations,
    owned_property_basis: basisRows,
    worksheet_a: a,
    worksheet_b: b,
    qbai: { quarters: qbaiQuarters, raw_average: qbai, filed: filedQbai },
    form8992: {
      tested_income: Math.round(tested.net),
      tested_interest_expense: Math.round(testedInterestExpense),
      tested_interest_income: 0,
      dtir,
      net_dtir: netDtir,
      gilti,
    },
    categories: {
      GEN: { sales, tested, ep: cents(sales.net + tested.net) },
      PAS: { passive, ep: cents(passive.net - usTax), us_tax: usTax },
    },
    books: {
      capital,
      cash_begin: cashBegin,
      cash_end: cashEnd,
      investments_begin: 0,
      investments_end: newInvestments,
      depreciable_cost: equipmentCost,
      accumulated_depreciation_begin: priorDep,
      accumulated_depreciation_end: priorDep + currentDep,
      current_ep: currentEp,
      opening_ep: epOpening,
    },
    schedule_i: {
      line1e: a["53"],
      line1f: a["57"],
      line2_us_property: b["19"],
    },
    ep_rollforward: {
      opening: epOpening,
      current: currentEp,
      subpart_f: a["53"] + a["57"],
      gilti,
      section956: b["19"],
      section956_ptep_reclassified: reclassified,
      untaxed_closing: cents(available - ptep - b["19"]),
      ptep_closing: cents(ptep + b["19"]),
    },
  };
}

/** Expected filed-source operands derived from the owned records, not supplied
 * worksheet totals. Category-specific J/P/Q copies use the same calculation. */
export function ownedWorksheetFiledOperands(raw: unknown) {
  const r = calculateOwnedCfcWorksheets(raw);
  if (r.unresolved_debt_pricing.length) {
    throw Error(
      "Owned shareholder note remains unsettled under sections7872/482: original debt terms, AFR, deemed transfer/OID and quarterly E&P basis records are missing; raw coupon/principal cannot finalize WorksheetA/B, G18 or return/native/PDF operands",
    );
  }
  const noninterest = r.classified_income.filter((x) =>
    x.kind !== "ordinary_interest"
  );
  const income = sum(noninterest.map((x) => x.revenue));
  const cogs = sum(noninterest.map((x) => x.cogs));
  const expense = (kind: string) =>
    Math.round(
      sum(
        r.classified_expenses.filter((x) => x.kind === kind).map((x) =>
          x.amount
        ),
      ),
    );
  const b = r.books;
  const tax = expense("income_tax");
  const dep = b.accumulated_depreciation_end - b.accumulated_depreciation_begin;
  return {
    calculation: r,
    operands: {
      reviewed_form5471_source_reference: r.source.cfc_reference +
        "-owned-current-records-unverified",
      foreign_corp_name: r.source.cfc_name,
      foreign_corp_reference_id: r.source.cfc_reference,
      country_of_incorporation: "EI",
      functional_currency: "USD",
      shareholder_tin: r.source.shareholder_tin,
      schedule_i: {
        line1a: 0,
        line1b: 0,
        line1c: 0,
        line1d: 0,
        line1e: r.schedule_i.line1e,
        line1f: r.schedule_i.line1f,
        line1g: 0,
        line1h: 0,
        line2_us_property: r.schedule_i.line2_us_property,
      },
      schedule_i1: {
        schedule_i1_source_reference: r.source.cfc_reference +
          "-owned-tested-income-records",
        separate_category: "GEN",
        average_exchange_rate: "1.0000",
        gross_income_functional: Math.round(
          sum(r.classified_income.map((x) => x.gross)),
        ),
        effectively_connected_income_functional: 0,
        subpart_f_income_functional: Math.round(
          r.categories.GEN.sales.gross + r.categories.PAS.passive.gross,
        ),
        high_tax_exception_income_functional: 0,
        related_party_dividends_functional: 0,
        foreign_oil_gas_income_functional: 0,
        allocable_deductions_functional: Math.round(
          r.categories.GEN.tested.paid + r.categories.GEN.tested.depreciation,
        ),
        tested_foreign_taxes_functional: tax,
        tested_foreign_taxes_usd: tax,
        qbai_functional: r.qbai.filed,
        interest_expense_functional: r.form8992.tested_interest_expense,
        qualified_interest_expense_functional: 0,
        tested_interest_expense_functional: r.form8992.tested_interest_expense,
        interest_income_functional: 0,
        qualified_interest_income_functional: 0,
        tested_interest_income_functional: 0,
        tested_income: r.form8992.tested_income,
        pro_rata_tested_income: r.form8992.tested_income,
        pro_rata_qbai: r.qbai.filed,
        pro_rata_tested_interest_income: 0,
        pro_rata_tested_interest_expense: r.form8992.tested_interest_expense,
      },
      schedule_c: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_c",
        gross_sales_receipts_functional: Math.round(income),
        cost_of_goods_sold_functional: Math.round(cogs),
        interest_income_functional: Math.round(r.categories.PAS.passive.gross),
        interest_expense_functional: expense("interest"),
        depreciation_functional: Math.round(dep),
        current_income_tax_expense_functional: tax +
          Math.round(r.categories.PAS.us_tax),
        gaap_translation_rate: "1.0000",
      },
      schedule_f: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_f",
        cash_begin_usd: Math.round(b.cash_begin),
        cash_end_usd: Math.round(b.cash_end),
        depreciable_assets_gross_begin_usd: Math.round(b.depreciable_cost),
        depreciable_assets_gross_end_usd: Math.round(b.depreciable_cost),
        accumulated_depreciation_begin_usd: Math.round(
          b.accumulated_depreciation_begin,
        ),
        accumulated_depreciation_end_usd: Math.round(
          b.accumulated_depreciation_end,
        ),
        common_stock_begin_usd: Math.round(b.capital),
        common_stock_end_usd: Math.round(b.capital),
        retained_earnings_begin_usd: Math.round(b.opening_ep),
        retained_earnings_end_usd: Math.round(b.opening_ep + b.current_ep),
        other_investments_begin_usd: b.investments_begin,
        other_investments_end_usd: Math.round(b.investments_end),
        no_other_assets_liabilities_or_equity: b.investments_end === 0,
        gaap_begin_translation_rate: "1.0000",
        gaap_end_translation_rate: "1.0000",
      },
      schedule_h: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_h",
        book_net_income_functional: Math.round(b.current_ep),
        passive_category_ep: Math.round(r.categories.PAS.ep),
        current_ep_usd: Math.round(b.current_ep),
        average_exchange_rate: "1.0000",
      },
      schedule_m: {
        no_other_related_party_transactions: !r.source.owned_assets.some((a) =>
          a.kind === "debt_obligation" &&
          a.issuer_owner_tin === r.source.shareholder_tin
        ),
        maximum_related_party_lending_usd: Math.round(
          sum(
            r.source.owned_assets.flatMap((a) =>
              a.kind === "debt_obligation" &&
                a.issuer_owner_tin === r.source.shareholder_tin
                ? [a.principal]
                : []
            ),
          ),
        ),
        interest_received_from_filer_usd: Math.round(
          sum(
            r.source.current_income_records.flatMap((i) =>
              i.kind === "ordinary_interest" &&
                i.payor_owner_tin === r.source.shareholder_tin
                ? [i.gross_payment_received]
                : []
            ),
          ),
        ),
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_m",
        inventory_sales_to_filer_functional: Math.round(
          sum(
            r.classified_income.filter((x) => x.category === "sales").map((x) =>
              x.revenue
            ),
          ),
        ),
        inventory_sales_to_filer_usd: Math.round(
          sum(
            r.classified_income.filter((x) => x.category === "sales").map((x) =>
              x.revenue
            ),
          ),
        ),
      },
      schedule_q: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_q",
        sales_gross_income_functional: Math.round(r.categories.GEN.sales.gross),
        tested_gross_income_functional: Math.round(
          r.categories.GEN.tested.gross,
        ),
        tested_other_interest_expense_functional:
          r.form8992.tested_interest_expense,
        tested_other_expenses_functional: Math.round(
          r.categories.GEN.tested.depreciation,
        ),
        tested_other_current_year_tax_functional: tax,
        tested_average_asset_value_functional: Math.round(
          sum(
            r.owned_property_basis.filter((x) =>
              x.kind === "depreciable_equipment"
            ).map((x) => (x.beginning_book_basis + x.ending_book_basis) / 2),
          ),
        ),
        foreign_taxes_credit_allowed_usd: tax,
        us_source_income_functional: Math.round(r.categories.PAS.passive.gross),
      },
      schedule_j: {
        prior_year_schedule_j_reference: r.source.cfc_reference +
          "-unverified-owned-prior-books",
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_j",
        opening_post2017_untaxed_ep_functional: Math.round(b.opening_ep),
        subpart_f_inclusion_functional: r.ep_rollforward.subpart_f,
        section951a_inclusion_functional: r.ep_rollforward.gilti,
        section956_inclusion_functional: r.ep_rollforward.section956,
        section956_ptep_reclassified_functional:
          r.ep_rollforward.section956_ptep_reclassified,
        section956_year_end_spot_rate: "1.0000",
      },
      schedule_p: {
        prior_year_schedule_p_reference: r.source.cfc_reference +
          "-unverified-owned-prior-books",
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_p",
        section956_ptep_reclassified_usd_basis:
          r.ep_rollforward.section956_ptep_reclassified,
      },
      schedule_g: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_g",
      },
      schedule_r: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_r",
      },
      schedule_e: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-schedule_e",
        tax_country_code: "EI",
        foreign_tax_year_end: "2025-12-31",
        us_tax_year_end: "2025-12-31",
        taxable_income_local: Math.round(
          sum(
            r.classified_expenses.filter((x) => x.kind === "income_tax").map(
              (x) => x.assessed_taxable_income!,
            ),
          ),
        ),
        disallowed_tax: Math.round(r.categories.PAS.us_tax),
        tax_local: tax,
        tax_functional: tax,
        tax_usd: tax,
        local_currency: "USD",
        tax_conversion_rate: "1.0000",
      },
      form5471_identity: {
        source_workpaper_reference: r.source.cfc_reference +
          "-owned-form5471_identity",
        incorporation_date:
          r.source.corporate_register_record.incorporation_date,
        foreign_address: r.source.corporate_register_record.address,
        cfc_tax_year_begin: "2025-01-01",
        cfc_tax_year_end: "2025-12-31",
        filer_tax_year_begin: "2025-01-01",
        filer_tax_year_end: "2025-12-31",
        principal_business_country_code: "EI",
        principal_business_activity_code:
          r.source.corporate_register_record.business_activity_code,
        principal_business_activity_description:
          r.source.corporate_register_record.business_activity_description,
        books_custodian_business_name: r.source.cfc_name,
        statutory_agent_business_name:
          r.source.corporate_register_record.statutory_agent_business_name,
        stock_class_description:
          r.source.corporate_register_record.stock_class_description,
        direct_shares_begin: r.source.shares_issued,
        direct_shares_end: r.source.shares_issued,
        total_outstanding_shares_begin: r.source.shares_issued,
        total_outstanding_shares_end: r.source.shares_issued,
      },
    },
  };
}
