// Constructed current source-contract records, not authenticated issuer/history.
export function passiveK1Item(
  kind: "partnership" | "s_corp",
  box: "box1" | "box2" | "box3",
  amount = 3000,
  owner = "111223333",
  ein = "123456789",
) {
  const id = `${kind}:${ein}:${owner}:${box}`,
    reference = `2025 issued ${kind} ${ein} ${owner}`;
  const item: any = {
    [kind === "partnership" ? "partnership_name" : "corporation_name"]:
      `Reviewed ${
        kind === "partnership" ? "partnership" : "S corporation"
      } activity`,
    [kind === "partnership" ? "partnership_ein" : "corporation_ein"]: ein,
    recipient_tin: owner,
    source_document_reference: reference,
    ...(kind === "partnership" ? { box14a_se_earnings: 0 } : {}),
    [
      box === "box1"
        ? "box1_ordinary_business"
        : box === "box2"
        ? "box2_rental_re"
        : "box3_other_rental"
    ]: amount,
    eic_passive_activity_review: {
      [box]: "passive",
      recipient_tin: owner,
      ...(kind === "partnership"
        ? { partnership_not_publicly_traded_verified: true }
        : {}),
      activity_statement_reference: `${reference} complete activity statement`,
      participation_workpaper_reference:
        `${reference} current nonparticipation records`,
    },
    passive_income_source: {
      tax_year: 2025,
      issuer_ein: ein,
      recipient_tin: owner,
      issued_k1_reference: reference,
      activity_statement_reference: `${reference} complete activity statement`,
      participation_workpaper_reference:
        `${reference} current nonparticipation records`,
      entity_status_record: {
        issuer_ein: ein,
        tax_year: 2025,
        publicly_traded_partnership: false,
        source_document_reference:
          `${reference} entity organization/market status records`,
      },
      activities: [{
        activity_id: id,
        activity_name: `${
          kind === "partnership" ? "Partner" : "Shareholder"
        } ${box} activity`,
        income_box: box,
        current_income: amount,
        ownership_acquired_on: "2025-01-01",
        acquisition_document_reference:
          `${reference} subscription/ownership capital ledger`,
        not_grouped_with_prior_activity: true,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      }],
    },
  };
  if (box === "box1") {
    item[kind === "partnership" ? "box20z_qbi" : "qbi_amount"] = amount;
    item.qualified_business_income_source = {
      tax_year: 2025,
      issuer_ein: ein,
      recipient_tin: owner,
      issued_k1_reference: reference,
      issued_section199a_statement_reference:
        `${reference} issued section199A statement`,
      business_name: `Reviewed domestic ${
        kind === "partnership" ? "partnership" : "S corporation"
      }`,
      domestic_non_sstb_trade: true,
      qualified_box1_income: amount,
      statement_qbi: amount,
      owner_level_adjustments: 0,
      prior_qbi_loss: 0,
    };
  }
  return item;
}
export function qualifiedFarmRentalSource() {
  return {
    tax_year: 2025,
    activity_id: "current-farm-loss",
    activity_name: "Current farm loss",
    recipient_tin: "111223333",
    business_name: "Reviewed crop-share rental",
    acquired_on: "2025-01-01",
    ownership_record_reference: "2025 farmland acquisition/title",
    tenant_ein: "222334444",
    crop_share_lease_reference: "2025 annual crop-share lease",
    rented_months: Array.from({ length: 12 }, (_, i) => i + 1),
    management_source: {
      agent_ein: "333445555",
      management_contract_reference:
        "2025 recurring crop-share property management contract",
      recurring_rental_management_services: true,
      taxpayer_materially_participated: false,
    },
    section162_domestic_rental_review_reference:
      "2025 lease/agent service records section162 rental workpaper",
    current_receipts: [{
      paid_on: "2025-11-30",
      payer_ein: "222334444",
      amount: 2000,
      issued_crop_settlement_reference: "2025 tenant crop-share settlement",
      deposit_reference: "2025 owned rental account receipt",
    }],
    current_repairs: [{
      paid_on: "2025-06-01",
      payee_ein: "555667777",
      amount: 7000,
      invoice_reference: "2025 farm building repair invoice",
      payment_reference: "2025 owned rental account repair payment",
    }],
    prior_qbi_loss: 0,
    prior_passive_loss: 0,
  };
}

export function passiveK1Inputs(
  kind: "partnership" | "s_corp" = "partnership",
  box: "box1" | "box2" | "box3" = "box2",
) {
  return {
    general: {
      filing_status: "single",
      digital_assets: false,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      main_home_in_us_over_half_year: true,
      taxpayer_can_be_claimed_as_dependent: false,
      childless_eic_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        qualifying_child_status_record_reference: "Reviewed current family",
      },
      prior_eic_disallowance_review: {
        status: "none",
        irs_account_record_reference: "Reviewed IRS account",
        no_nonclerical_disallowance_since_1996_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: "Reviewed all-year resident",
      },
    },
    w2: [{
      employer_ein: "112233445",
      employer_name: "Reviewed employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111223333",
      box1_wages: 5000,
      box2_fed_withheld: 0,
    }],
    f1099int: [{
      payer_name: "Reviewed bank",
      recipient_tin: "111223333",
      box8: 11950,
    }],
    f4835: [{
      activity_id: "current-farm-loss",
      activity_name: "Current farm loss",
      actively_participated: false,
      livestock_crop_income: 2000,
      expense_repairs_maintenance: 7000,
      some_investment_not_at_risk: false,
      ...(box === "box1"
        ? { current_qbi_source: qualifiedFarmRentalSource() }
        : {}),
    }],
    [`k1_${kind}`]: [passiveK1Item(kind, box)],
  } as any;
}
export const passiveK1Cases: any[] = [
  ...(["partnership", "s_corp"] as const).flatMap((kind) =>
    (["box1", "box2", "box3"] as const).map((box) => ({
      id: `${kind}_${box}`,
      inputs: () => passiveK1Inputs(kind, box),
      agi: 5000,
      allowed: 3000,
      suspended: 2000,
      investment: 11950,
      eic: 384,
      tax: 0,
      qbi: box === "box1" ? 0 : undefined,
    }))
  ),
  {
    id: "combined_categories_at_limit",
    inputs: () => {
      const i = passiveK1Inputs();
      i.f1099int[0].box8 = 11945;
      i.f1099int[0].box1 = 3;
      i.f1099div = [{
        payerName: "Reviewed dividend issuer",
        payerTin: "876543210",
        source_document_reference: "2025 issued dividend copy",
        account_number: "DIV-2025",
        recipient_tin: "111223333",
        box1a: 2,
        isNominee: false,
        box11: false,
      }];
      return i;
    },
    agi: 5005,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 384,
    tax: 0,
  },
  {
    id: "combined_categories_above_limit",
    inputs: () => {
      const i = passiveK1Inputs();
      i.f1099int[0].box8 = 11946;
      i.f1099int[0].box1 = 3;
      i.f1099div = [{
        payerName: "Reviewed dividend issuer",
        payerTin: "876543210",
        source_document_reference: "2025 issued dividend copy",
        account_number: "DIV-2025",
        recipient_tin: "111223333",
        box1a: 2,
        isNominee: false,
        box11: false,
      }];
      return i;
    },
    agi: 5005,
    allowed: 3000,
    suspended: 2000,
    investment: 11951,
    eic: 0,
    tax: 0,
  },
  {
    id: "ordinary_qbi_positive_tax",
    inputs: () => {
      const i = passiveK1Inputs("s_corp", "box1");
      i.w2[0].box1_wages = 50000;
      return i;
    },
    agi: 50000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 0,
    tax: 3875,
    qbi: 0,
  },
  {
    id: "rental_loss",
    inputs: () => {
      const i = passiveK1Inputs();
      delete i.f4835;
      i.schedule_e = [rentalLoss()];
      return i;
    },
    agi: 5000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 384,
    tax: 0,
  },
  {
    id: "retained_sale_income",
    inputs: () => {
      const i = passiveK1Inputs();
      delete i.f4835;
      i.k1_partnership = [passiveK1Item("partnership", "box2", 1000)];
      const p = rentalLoss();
      p.disposed_of = true;
      p.passive_property_sales = [{
        activity_id: p.activity_id,
        activity_name: p.property_description,
        part: "II",
        property_description: "Rental equipment",
        acquired_on: "2025-01-01",
        sold_on: "2025-06-01",
        gross_sales_price: 9000,
        cost_or_other_basis: 7000,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
        buyer_unrelated: true,
        fully_taxable: true,
        installment_method: false,
        disposition_document_reference: "2025 signed equipment closing",
      }];
      i.schedule_e = [p];
      return i;
    },
    agi: 5000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 384,
    tax: 0,
  },
  {
    id: "active_rental_above_phaseout",
    inputs: () => {
      const i = passiveK1Inputs();
      delete i.f4835;
      const p = rentalLoss();
      p.activity_type = "A";
      i.schedule_e = [p];
      i.w2[0].box1_wages = 160000;
      return i;
    },
    agi: 160000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 0,
    tax: 27467,
  },
  {
    id: "joint_owned_passive_income",
    inputs: () => {
      const i = passiveK1Inputs();
      Object.assign(i.general, {
        filing_status: "mfj",
        spouse_first_name: "Casey",
        spouse_last_name: "Example",
        spouse_ssn: "444556666",
        spouse_dob: "1985-07-01",
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
        spouse_can_be_claimed_as_dependent: false,
      });
      i.general.eic_tax_residency_review.spouse_status_record_reference =
        "Reviewed spouse resident";
      i.w2[0].box1_wages = 10000;
      i.k1_partnership = [passiveK1Item("partnership", "box2", 1500)];
      i.k1_s_corp = [
        passiveK1Item("s_corp", "box3", 1500, "444556666", "987654321"),
      ];
      return i;
    },
    agi: 10000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 649,
    tax: 0,
  },
  {
    id: "ordinary_qbi_positive_net",
    inputs: () => {
      const i = passiveK1Inputs("s_corp", "box1");
      i.k1_s_corp = [passiveK1Item("s_corp", "box1", 7000)];
      i.w2[0].box1_wages = 50000;
      return i;
    },
    agi: 52000,
    allowed: 5000,
    suspended: 0,
    investment: 13950,
    eic: 0,
    tax: 4067,
    qbi: 400,
    qbiIncome: 2000,
  },
  ...([11950, 11951] as const).map((limit) => ({
    id: `residual_passive_${limit}`,
    inputs: () => {
      const i = passiveK1Inputs();
      i.f4835[0].expense_repairs_maintenance = 4000;
      i.f1099int[0].box8 = limit - 1000;
      return i;
    },
    agi: 6000,
    allowed: 2000,
    suspended: 0,
    currentLoss: 2000,
    investment: limit,
    eic: limit === 11950 ? 384 : 0,
    tax: 0,
  })),
  {
    id: "two_owned_losses",
    inputs: () => {
      const i = passiveK1Inputs();
      i.schedule_e = [rentalLoss()];
      return i;
    },
    agi: 5000,
    allowed: 3000,
    suspended: 7000,
    currentLoss: 10000,
    investment: 11950,
    eic: 384,
    tax: 0,
  },
  {
    id: "joint_same_issuer",
    inputs: () => {
      const c = passiveK1Cases.find((c) =>
        c.id === "joint_owned_passive_income"
      )!;
      const i = c.inputs();
      delete i.k1_s_corp;
      i.k1_partnership = [
        passiveK1Item("partnership", "box2", 1500),
        passiveK1Item("partnership", "box2", 1500, "444556666"),
      ];
      return i;
    },
    agi: 10000,
    allowed: 3000,
    suspended: 2000,
    investment: 11950,
    eic: 649,
    tax: 0,
  },
];
export function rentalLoss(): any {
  return {
    tsj: "T",
    activity_id: "current-rental-loss",
    property_description: "Current rental loss",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 180,
    personal_use_days: 0,
    rent_income: 0,
    expense_taxes: 5000,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    first_year_activity_source: {
      activity_id: "current-rental-loss",
      activity_name: "Current rental loss",
      activity_acquired_on: "2025-01-01",
      acquisition_document_reference: "2025 signed rental acquisition",
      not_grouped_with_prior_activity: true,
    },
  };
}
