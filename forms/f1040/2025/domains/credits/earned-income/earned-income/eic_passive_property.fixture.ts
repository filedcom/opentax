// Constructed current source-contract records; no external issuer/history authentication.
import {
  passiveK1Inputs,
  qualifiedFarmRentalSource,
} from "./eic_passive_k1.fixture.ts";
export function passivePropertyInputs(gain = 3000, wages = 5000) {
  const i: any = passiveK1Inputs("partnership", "box1");
  delete i.k1_partnership;
  i.w2[0].box1_wages = wages;
  i.f4835[0].current_qbi_source = qualifiedFarmRentalSource();
  const id = "current-rented-land",
    name = "Current rented land trade",
    owner = "111223333",
    reference = "2025 owned current rented-land annual source";
  const source = {
    tax_year: 2025,
    activity_id: id,
    activity_name: name,
    recipient_tin: owner,
    business_name: "Owned current land leasing trade",
    source_reference: reference,
    domestic_section162_trade_review_reference:
      `${reference} recurring domestic commercial leasing review`,
    management_record: {
      agent_ein: "765432109",
      contract_reference: `${reference} agent management contract`,
      recurring_leasing_management_services: true,
      taxpayer_materially_participated: false,
    },
    acquisition_record: {
      acquired_on: "2025-01-01",
      seller_tin: "876543210",
      closing_reference: "2025 owned rented-land purchase closing",
      payment_reference: `${reference} purchase wire`,
      total_paid: 12000,
      parcels: [{
        parcel_id: "land-sold",
        property_description: "Sold portion nondepreciable rented land",
        allocated_purchase_cost: 6000,
        nondepreciable_land: true,
        location_state: "TX",
      }, {
        parcel_id: "land-retained",
        property_description: "Retained nondepreciable rented land",
        allocated_purchase_cost: 6000,
        nondepreciable_land: true,
        location_state: "TX",
      }],
    },
    closing_record: {
      parcel_id: "land-sold",
      sold_on: "2025-06-01",
      buyer_tin: "987654321",
      buyer_unrelated: true,
      closing_reference: "2025 owned partial land sale closing",
      deposit_reference: `${reference} closing proceeds deposit`,
      gross_paid: 6000 + gain,
      fully_taxable: true,
      installment_method: false,
    },
    retained_interest_record: {
      remaining_parcel_ids: ["land-retained"],
      ownership_record_reference: `${reference} retained parcel title`,
      retained_lease_reference: `${reference} current commercial land leases`,
    },
    lease_records: [{
      parcel_id: "land-sold",
      tenant_tin: "654321098",
      lease_reference: `${reference} current commercial land leases`,
      started_on: "2025-01-01",
      ended_on: "2025-05-31",
    }, {
      parcel_id: "land-retained",
      tenant_tin: "654321098",
      lease_reference: `${reference} current commercial land leases`,
      started_on: "2025-01-01",
      ended_on: "2025-06-29",
    }],
    rent_payments: [{
      paid_on: "2025-05-01",
      tenant_tin: "654321098",
      amount: 2000,
      lease_reference: `${reference} current commercial land leases`,
      deposit_reference: `${reference} tenant rent deposit`,
    }],
    property_tax_payments: [{
      paid_on: "2025-12-01",
      payee_tin: "543210987",
      amount: 3000,
      assessment_reference: `${reference} owned land county assessment`,
      payment_reference: `${reference} county tax payment`,
    }],
    prior_passive_loss: 0,
    prior_qbi_loss: 0,
    grouped_with_prior_activity: false,
    owner_level_adjustments: 0,
  };
  i.schedule_e = [{
    tsj: "T",
    activity_id: id,
    property_description: name,
    property_type: 5,
    activity_type: "B",
    fair_rental_days: 180,
    personal_use_days: 0,
    rent_income: 2000,
    expense_taxes: 3000,
    form_1099_payments_made: false,
    street_address: "12 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    disposed_of: true,
    qbi_trade_or_business: "Y",
    current_property_source: source,
    first_year_activity_source: {
      activity_id: id,
      activity_name: name,
      activity_acquired_on: "2025-01-01",
      acquisition_document_reference:
        source.acquisition_record.closing_reference,
      not_grouped_with_prior_activity: true,
    },
    passive_property_sales: [{
      activity_id: id,
      activity_name: name,
      part: "II",
      property_description: "Sold portion nondepreciable rented land",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: 6000 + gain,
      cost_or_other_basis: 6000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
      buyer_unrelated: true,
      fully_taxable: true,
      installment_method: false,
      disposition_document_reference: source.closing_record.closing_reference,
    }],
  }];
  return i;
}
export const passivePropertyCases = [
  {
    id: "property_farm_at_limit",
    inputs: () => passivePropertyInputs(),
    agi: 7000,
    eic: 384,
    suspended: 5000,
    qbi: 0,
    tax: 0,
    qbiNet: 2000,
  },
  {
    id: "property_farm_above_limit",
    inputs: () => {
      const i = passivePropertyInputs();
      i.f1099int[0].box8 = 11951;
      return i;
    },
    agi: 7000,
    eic: 0,
    suspended: 5000,
    qbi: 0,
    tax: 0,
    qbiNet: 2000,
  },
  {
    id: "property_positive_net_qbi",
    inputs: () => passivePropertyInputs(7000, 50000),
    agi: 56000,
    eic: 0,
    suspended: 5000,
    qbi: 1200,
    tax: 4451,
    qbiNet: 6000,
  },
  {
    id: "property_income_only",
    inputs: () => {
      const i = passivePropertyInputs();
      delete i.f4835;
      return i;
    },
    agi: 7000,
    eic: 384,
    suspended: 0,
    qbi: 0,
    tax: 0,
    qbiNet: 2000,
  },
  {
    id: "property_operating_profit",
    inputs: () => {
      const i = passivePropertyInputs();
      i.schedule_e[0].rent_income = 4000;
      i.schedule_e[0].current_property_source.rent_payments[0].amount = 4000;
      return i;
    },
    agi: 9000,
    eic: 384,
    suspended: 5000,
    qbi: 0,
    tax: 0,
    qbiNet: 4000,
  },
  {
    id: "property_joint_spouse_owned",
    inputs: () => {
      const i = passivePropertyInputs(3000, 10000);
      Object.assign(i.general, {
        filing_status: "mfj",
        spouse_first_name: "Casey",
        spouse_last_name: "Example",
        spouse_ssn: "444-55-6666",
        spouse_dob: "1984-01-01",
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
        spouse_can_be_claimed_as_dependent: false,
      });
      i.general.eic_tax_residency_review.spouse_status_record_reference =
        "Reviewed spouse all-year resident status";
      i.schedule_e[0].tsj = "S";
      i.schedule_e[0].current_property_source.recipient_tin = "444556666";
      return i;
    },
    agi: 12000,
    eic: 649,
    suspended: 5000,
    qbi: 0,
    tax: 0,
    qbiNet: 2000,
  },
  {
    id: "property_negative_net_suspended",
    inputs: () => {
      const i = passivePropertyInputs();
      i.schedule_e[0].expense_taxes = 7000;
      i.schedule_e[0].current_property_source.property_tax_payments[0].amount =
        7000;
      return i;
    },
    agi: 5000,
    eic: 384,
    suspended: 7000,
    qbi: 0,
    tax: 0,
    qbiNet: 0,
  },
  {
    id: "property_negative_net_allowed_positive_farm",
    inputs: () => {
      const i = passivePropertyInputs(3000, 50000);
      i.schedule_e[0].expense_taxes = 7000;
      i.schedule_e[0].current_property_source.property_tax_payments[0].amount =
        7000;
      i.f4835[0].livestock_crop_income = 7000;
      i.f4835[0].expense_repairs_maintenance = 2000;
      i.f4835[0].current_qbi_source.current_receipts[0].amount = 7000;
      i.f4835[0].current_qbi_source.current_repairs[0].amount = 2000;
      return i;
    },
    agi: 53000,
    eic: 0,
    suspended: 0,
    qbi: 600,
    tax: 4163,
    qbiNet: 3000,
  },
];
