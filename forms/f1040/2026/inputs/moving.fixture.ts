import type { MovingSource2026 } from "./moving-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function syntheticMoving2026(): MovingSource2026 {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    inventory_record: "moving-inventory",
    cash_method: true,
    all_moves_expenses_and_reimbursements_included: true,
    no_form2555_exclusion: true,
    w2_moving_sources_2026: [{
      source_document_reference: "issued-w2-1",
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      box1_wages: 150001,
      box12_p: 1000,
    }],
    moves: [{
      move_id: "pcs-1",
      claimant_ssn: "111223333",
      moved_on: "2026-06-30",
      former_home: "Old home",
      new_home: "New home",
      new_post: "New post",
      destination_outside_us_and_territories: false,
      eligibility: {
        kind: "military",
        member_ssn: "111223333",
        active_duty_at_order: true,
        military_order_reference: "pcs-order",
        permanent_change_of_station: "between_posts",
      },
      eligibility_certified: true,
      order_or_assignment_group_reference: "pcs-order",
      family_separate_locations_combined_as_one_move: true,
      storage_only_from_prior_year: false,
      goods_departed_on: "2026-06-30",
      goods_delivered_on: "2026-07-05",
      domestic_storage_window: {
        starts_on: "2026-07-01",
        ends_on: "2026-07-04",
      },
      trips: [{
        trip_id: "outbound",
        departure_on: "2026-06-30",
        arrival_on: "2026-07-01",
        travelers: [{
          person_id: "taxpayer",
          former_and_new_home_are_main_home: true,
          not_tenant_or_employee_unless_claimable_dependent: true,
          household_record: "residency",
        }],
        direct_route_without_personal_side_trips: true,
        vehicles: [{ vehicle_id: "car", own_vehicle: true, method: "mileage" }],
      }],
      expenses: [
        {
          expense_id: "goods",
          source_document_reference: "movers",
          receipt_line_reference: "1",
          payment_record: "bank-1",
          paid_on: "2026-07-05",
          payee: "Example movers",
          category: "household_goods",
          amount_paid: 2000,
          paid_by: "claimant_or_joint_funds",
          current_payment_refund: 0,
          reasonable_and_necessary: true,
          goods_owned_before_move: true,
          description: "Move existing household goods",
        },
        ...["2026-06-30", "2026-07-01"].map((d, i) => ({
          expense_id: `mileage-${i}`,
          source_document_reference: "trip-log",
          receipt_line_reference: String(i),
          payment_record: "trip-log",
          paid_on: d,
          payee: "Own vehicle",
          category: "vehicle_mileage" as const,
          miles: 100,
          travel_on: d,
          trip_id: "outbound",
          vehicle_id: "car",
          paid_by: "claimant_or_joint_funds" as const,
          current_payment_refund: 0,
          reasonable_and_necessary: true,
          description: "Direct travel",
        })),
      ],
      reimbursements: [{
        reimbursement_id: "reimb-1",
        source_document_reference: "payroll-move",
        source_line_reference: "1",
        received_on: "2026-07-15",
        government_payer: "Example government employer",
        amount: 1000,
        kind: "moving_reimbursement",
        reporting: "w2_box12_p",
        w2_document_reference: "issued-w2-1",
        payroll_reconciliation_record: "payroll-detail",
        expense_ids: ["goods"],
        expense_allocations: [],
      }],
    }],
  };
}
export function syntheticForeignStorage2026(): MovingSource2026 {
  const r = syntheticMoving2026();
  const m = r.moves[0];
  m.moved_on = "2025-06-30";
  m.destination_outside_us_and_territories = true;
  m.storage_only_from_prior_year = true;
  m.claimant_outside_us_during_storage = true;
  m.goods_departed_on = "2025-06-30";
  m.goods_delivered_on = undefined;
  m.domestic_storage_window = undefined;
  m.foreign_principal_workplace_period = {
    starts_on: "2025-07-01",
    ends_on: "2027-06-30",
  };
  m.trips = [];
  m.expenses = [{
    ...m.expenses[0],
    category: "storage",
    storage_period: { starts_on: "2026-01-01", ends_on: "2026-12-31" },
    goods_owned_before_move: true,
  }];
  m.reimbursements[0].reporting = "w2_box1";
  r.w2_moving_sources_2026![0].box12_p = 0;
  return r;
}
