import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { moving2026 } from "../../nodes/config/2026-moving.ts";
import { movingExpenseBalance } from "../../nodes/inputs/adjustments/moving/f3903/amounts.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const date = z.string().date();
const date2026 = date.refine(
  (s) => s.startsWith("2026-"),
  "Payment/travel must be in 2026",
);
const period = z.object({ starts_on: date, ends_on: date }).strict();
const normalize = (s: string) => s.replaceAll("-", "");
const cents = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => cents(ns.reduce((a, b) => a + b, 0));
const days = (start: string, end: string) =>
  (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
const eligibility = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("military"),
    member_ssn: ssn,
    active_duty_at_order: z.literal(true),
    military_order_reference: ref,
    permanent_change_of_station: z.enum([
      "first_post",
      "between_posts",
      "last_post",
    ]),
    last_post_review: z.object({
      active_duty_ended_on: date,
      destination_home_or_nearer_us_point: z.literal(true),
      jtr_extension: z.object({
        allowed_through: date,
        authorization_reference: ref,
      }).strict().optional(),
    }).strict().optional(),
  }).strict(),
  z.object({
    kind: z.literal("intelligence"),
    member_ssn: ssn,
    agency_name: ref,
    employee_or_new_appointee: z.literal(true),
    not_armed_forces_member: z.literal(true),
    agency_qualifies_under_50usc3003: z.literal(true),
    agency_qualification_record: ref,
    assignment_requires_relocation: z.literal(true),
    assignment_reference: ref,
  }).strict(),
  z.object({
    kind: z.literal("spouse_or_dependent_special_move"),
    member_reference: ref,
    member_category: z.enum(["armed_forces", "intelligence_community"]),
    qualifying_membership_record: ref,
    relationship: z.enum(["spouse", "dependent"]),
    relationship_record: ref,
    event: z.enum(["deserted", "imprisoned", "died"]),
    event_on: date,
    event_record: ref,
    destination: z.enum([
      "enlistment_or_induction_place",
      "claimant_home_of_record",
      "member_home_of_record",
      "nearer_us_point",
    ]),
    destination_record: ref,
  }).strict(),
]);
const trip = z.object({
  trip_id: ref,
  departure_on: date2026,
  arrival_on: date2026,
  travelers: z.array(
    z.object({
      person_id: ref,
      former_and_new_home_are_main_home: z.literal(true),
      not_tenant_or_employee_unless_claimable_dependent: z.literal(true),
      household_record: ref,
    }).strict(),
  ).min(1),
  direct_route_without_personal_side_trips: z.literal(true),
  vehicles: z.array(
    z.object({
      vehicle_id: ref,
      own_vehicle: z.literal(true),
      method: z.enum(["mileage", "actual_gas_oil"]),
    }).strict(),
  ),
}).strict();
const expense = z.object({
  expense_id: ref,
  source_document_reference: ref,
  receipt_line_reference: ref,
  payment_record: ref,
  paid_on: date2026,
  payee: ref,
  category: z.enum([
    "household_goods",
    "storage",
    "transportation",
    "lodging",
    "gas_oil",
    "vehicle_mileage",
    "parking_tolls",
    "nondeductible",
  ]),
  amount_paid: money.optional(),
  miles: money.optional(),
  travel_on: date2026.optional(),
  trip_id: ref.optional(),
  vehicle_id: ref.optional(),
  storage_period: period.optional(),
  paid_by: z.enum(["claimant_or_joint_funds", "government_in_kind"]),
  current_payment_refund: money,
  reasonable_and_necessary: z.boolean(),
  goods_owned_before_move: z.boolean().optional(),
  description: ref,
}).strict();
const reimbursement = z.object({
  reimbursement_id: ref,
  source_document_reference: ref,
  source_line_reference: ref,
  received_on: date2026,
  government_payer: ref,
  amount: money,
  kind: z.enum([
    "moving_reimbursement",
    "dislocation_allowance",
    "temporary_lodging_allowance",
    "temporary_lodging_expense",
    "move_in_housing_allowance",
  ]),
  reporting: z.enum([
    "w2_box1",
    "w2_box12_p",
    "not_on_w2",
    "excluded_special_allowance",
  ]),
  w2_document_reference: ref.optional(),
  payroll_reconciliation_record: ref,
  expense_ids: z.array(ref),
  // Special allowances reduce their covered expenses here, never again on line 4.
  expense_allocations: z.array(
    z.object({ expense_id: ref, amount: money }).strict(),
  ),
}).strict();
const move = z.object({
  move_id: ref,
  claimant_ssn: ssn,
  moved_on: date,
  former_home: ref,
  new_home: ref,
  new_post: ref,
  destination_outside_us_and_territories: z.boolean(),
  eligibility,
  eligibility_certified: z.literal(true),
  order_or_assignment_group_reference: ref,
  family_separate_locations_combined_as_one_move: z.literal(true),
  storage_only_from_prior_year: z.boolean(),
  claimant_outside_us_during_storage: z.literal(true).optional(),
  goods_departed_on: date,
  goods_delivered_on: date.optional(),
  domestic_storage_window: period.optional(),
  foreign_principal_workplace_period: period.optional(),
  trips: z.array(trip),
  expenses: z.array(expense),
  reimbursements: z.array(reimbursement),
}).strict();
export const movingClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  inventory_record: ref,
  cash_method: z.literal(true),
  all_moves_expenses_and_reimbursements_included: z.literal(true),
  no_form2555_exclusion: z.literal(true),
  mfs_payment_review: z.object({
    record_reference: ref,
    noncommunity_property: z.literal(true),
    expenses_paid_solely_by_filer: z.literal(true),
  }).strict().optional(),
  moves: z.array(move).min(1),
}).strict();
export const movingW2Source2026Schema = z.object({
  source_document_reference: ref,
  employee_ssn: ssn,
  employer_ein: ref,
  box1_wages: money,
  box12_p: money,
}).strict();
export const movingSource2026Schema = movingClaim2026Schema.extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  w2_moving_sources_2026: z.array(movingW2Source2026Schema).default([]),
}).strict();
export type MovingSource2026 = z.input<typeof movingSource2026Schema>;

/** One calculation per move. Positive deductions and excess reimbursements never net across moves. */
export function calculateMovingSources2026(raw: MovingSource2026) {
  const input = movingSource2026Schema.parse(raw);
  const owners = new Set([normalize(input.taxpayer_ssn)]);
  if (input.filing_status === FilingStatus.MFJ) {
    if (
      !input.spouse_ssn ||
      normalize(input.spouse_ssn) === normalize(input.taxpayer_ssn)
    ) throw new Error("Moving joint return needs distinct spouses");
    owners.add(normalize(input.spouse_ssn));
  }
  if (input.filing_status === FilingStatus.MFS && !input.mfs_payment_review) {
    throw new Error("Moving MFS needs separate-payment review");
  }
  const seen = new Set<string>();
  function unique(key: string) {
    if (seen.has(key)) throw new Error(`Duplicate moving source: ${key}`);
    seen.add(key);
  }
  function checkPeriod(p: z.infer<typeof period>) {
    if (days(p.starts_on, p.ends_on) < 1) {
      throw new Error("Moving period ends before it starts");
    }
  }
  const w2s = new Map(input.w2_moving_sources_2026.map((w) => {
    unique(`w2:${w.source_document_reference}`);
    if (!owners.has(normalize(w.employee_ssn))) {
      throw new Error("Moving W-2 owner is not a return filer");
    }
    return [w.source_document_reference, w] as const;
  }));
  const w2P = new Map<string, number>();
  const w2Wages = new Map<string, number>();
  const calculated = input.moves.map((m) => {
    unique(`move:${m.move_id}`);
    unique(`order:${m.order_or_assignment_group_reference}`);
    if (!owners.has(normalize(m.claimant_ssn))) {
      throw new Error("Moving claimant is not a return filer");
    }
    const e = m.eligibility;
    if (
      e.kind !== "spouse_or_dependent_special_move" &&
      !owners.has(normalize(e.member_ssn))
    ) throw new Error("Moving member is not a return filer");
    if (e.kind === "military") {
      if (e.permanent_change_of_station === "last_post") {
        const r = e.last_post_review;
        if (!r) {
          throw new Error(
            "Last-post move needs discharge and destination review",
          );
        }
        const anniversary = new Date(r.active_duty_ended_on + "T00:00:00Z");
        const originalMonth = anniversary.getUTCMonth();
        anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
        if (anniversary.getUTCMonth() !== originalMonth) {
          anniversary.setUTCDate(0);
        }
        const deadline = r.jtr_extension?.allowed_through ??
          anniversary.toISOString().slice(0, 10);
        if (m.moved_on < r.active_duty_ended_on || m.moved_on > deadline) {
          throw new Error("Last-post move is outside the authorized period");
        }
      } else if (e.last_post_review) {
        throw new Error("Last-post review belongs only to a last-post move");
      }
    }
    if (
      e.kind === "spouse_or_dependent_special_move" && m.moved_on < e.event_on
    ) throw new Error("Special move precedes the qualifying event");
    if (m.storage_only_from_prior_year) {
      if (
        m.moved_on >= "2026-01-01" ||
        !m.claimant_outside_us_during_storage ||
        !m.destination_outside_us_and_territories || m.trips.length ||
        m.expenses.some((x) => x.category !== "storage") ||
        m.reimbursements.some((r) =>
          r.reporting !== "w2_box1" || r.kind !== "moving_reimbursement"
        )
      ) {
        throw new Error(
          "Prior-year storage-only route requires foreign storage and reimbursements in W-2 wages",
        );
      }
    } else if (!m.moved_on.startsWith("2026-")) {
      throw new Error(
        "Prior-year moves need the storage-only route; other cross-year claims need review",
      );
    }
    if (m.goods_delivered_on && m.goods_delivered_on < m.goods_departed_on) {
      throw new Error("Goods delivery precedes departure");
    }
    if (m.domestic_storage_window) {
      checkPeriod(m.domestic_storage_window);
      if (
        m.destination_outside_us_and_territories || !m.goods_delivered_on ||
        m.domestic_storage_window.starts_on <= m.goods_departed_on ||
        m.domestic_storage_window.ends_on >= m.goods_delivered_on ||
        days(
            m.domestic_storage_window.starts_on,
            m.domestic_storage_window.ends_on,
          ) > moving2026.domesticStorageDays
      ) {
        throw new Error(
          "Domestic storage must fit one 30-day in-transit window",
        );
      }
    }
    if (m.foreign_principal_workplace_period) {
      checkPeriod(m.foreign_principal_workplace_period);
      if (!m.destination_outside_us_and_territories) {
        throw new Error("Foreign storage requires a foreign destination");
      }
    }
    const travelers = new Set<string>();
    const trips = new Map(m.trips.map((t) => {
      unique(`trip:${m.move_id}:${t.trip_id}`);
      if (t.arrival_on < t.departure_on) {
        throw new Error("Trip arrival precedes departure");
      }
      for (const p of t.travelers) {
        if (travelers.has(p.person_id)) {
          throw new Error("Only one moving trip per person");
        }
        travelers.add(p.person_id);
      }
      for (const v of t.vehicles) {
        unique(`vehicle:${m.move_id}:${v.vehicle_id}`);
      }
      return [t.trip_id, t] as const;
    }));
    const expenseRows = m.expenses.map((x) => {
      unique(`expense:${x.expense_id}`);
      unique(
        `receipt:${x.source_document_reference}:${x.receipt_line_reference}`,
      );
      const travel = [
        "transportation",
        "lodging",
        "gas_oil",
        "vehicle_mileage",
        "parking_tolls",
      ].includes(x.category);
      if (travel) {
        const t = trips.get(x.trip_id ?? "");
        if (
          !t || !x.travel_on || x.travel_on < t.departure_on ||
          x.travel_on > t.arrival_on
        ) throw new Error("Moving travel needs a dated household trip");
        const vehicleCost = ["gas_oil", "vehicle_mileage", "parking_tolls"]
          .includes(x.category);
        const v = t.vehicles.find((v) => v.vehicle_id === x.vehicle_id);
        if (
          vehicleCost &&
          (!v || (x.category === "gas_oil" && v.method !== "actual_gas_oil") ||
            (x.category === "vehicle_mileage" && v.method !== "mileage"))
        ) throw new Error("Vehicle method disagrees with moving expense");
        if (!vehicleCost && x.vehicle_id) {
          throw new Error("Vehicle costs need their own category");
        }
        if (x.storage_period) {
          throw new Error("Travel cannot have a storage period");
        }
      } else if (x.trip_id || x.vehicle_id || x.travel_on) {
        throw new Error("Nontravel expense cannot claim a trip");
      }
      let gross: number;
      if (x.category === "vehicle_mileage") {
        if (
          x.miles === undefined || x.amount_paid !== undefined ||
          x.paid_by !== "claimant_or_joint_funds" ||
          x.current_payment_refund !== 0
        ) {
          throw new Error(
            "Moving mileage needs miles, not an entered dollar total",
          );
        }
        gross = cents(
          x.miles *
            (x.travel_on! < "2026-07-01"
              ? moving2026.mileageBeforeJuly
              : moving2026.mileageFromJuly),
        );
      } else {
        if (x.amount_paid === undefined || x.miles !== undefined) {
          throw new Error("Moving receipt needs its actual payment");
        }
        gross = x.amount_paid;
      }
      if (x.current_payment_refund > gross) {
        throw new Error("Moving refund exceeds payment");
      }
      if (
        (x.category === "household_goods" || x.category === "storage") &&
        x.goods_owned_before_move === undefined
      ) throw new Error("Household goods need prior ownership review");
      if (x.category === "storage") {
        if (!x.storage_period) throw new Error("Storage needs service dates");
        checkPeriod(x.storage_period);
        const window = m.destination_outside_us_and_territories
          ? m.foreign_principal_workplace_period
          : m.domestic_storage_window;
        if (
          !window || x.storage_period.starts_on < window.starts_on ||
          x.storage_period.ends_on > window.ends_on ||
          (m.storage_only_from_prior_year &&
            (x.storage_period.starts_on < "2026-01-01" ||
              x.storage_period.ends_on > "2026-12-31"))
        ) throw new Error("Storage service is outside its qualifying period");
      } else if (x.storage_period) {
        throw new Error("Only storage expenses can have storage service dates");
      }
      const eligible = x.paid_by === "claimant_or_joint_funds" &&
        x.reasonable_and_necessary && x.category !== "nondeductible" &&
        (!["household_goods", "storage"].includes(x.category) ||
          x.goods_owned_before_move === true);
      return {
        expense_id: x.expense_id,
        gross_amount: gross,
        line: travel ? 2 : 1,
        qualifying_expense: eligible,
        eligible_before_allowances: eligible
          ? cents(gross - x.current_payment_refund)
          : 0,
        allowance_allocated: 0,
      };
    });
    const rows = new Map(expenseRows.map((r) => [r.expense_id, r]));
    const line4Amounts: number[] = [];
    for (const r of m.reimbursements) {
      unique(`reimbursement:${r.reimbursement_id}`);
      unique(
        `reimbursement-line:${r.source_document_reference}:${r.source_line_reference}`,
      );
      if (
        new Set(r.expense_ids).size !== r.expense_ids.length ||
        r.expense_ids.some((id) => !rows.has(id))
      ) throw new Error("Reimbursement refers to missing or repeated expenses");
      if (r.kind === "moving_reimbursement") {
        if (
          r.expense_allocations.length ||
          r.reporting === "excluded_special_allowance"
        ) {
          throw new Error(
            "Moving reimbursements need expense links and a single reporting treatment",
          );
        }
        if (
          r.expense_ids.some((id) => !rows.get(id)!.qualifying_expense)
        ) {
          throw new Error(
            "Moving reimbursement needs qualifying out-of-pocket expenses",
          );
        }
        if (r.reporting !== "w2_box1") line4Amounts.push(r.amount);
      } else {
        if (
          r.reporting !== "excluded_special_allowance" ||
          r.expense_ids.length || r.w2_document_reference
        ) {
          throw new Error(
            "Special allowances cannot enter wages or Form 3903 line 4 through this route",
          );
        }
        if (sum(r.expense_allocations.map((a) => a.amount)) > r.amount) {
          throw new Error("Allowance allocations exceed the allowance");
        }
        for (const a of r.expense_allocations) {
          const row = rows.get(a.expense_id);
          if (!row) throw new Error("Allowance refers to a missing expense");
          row.allowance_allocated = cents(row.allowance_allocated + a.amount);
          if (row.allowance_allocated > row.eligible_before_allowances) {
            throw new Error("Allowance allocations exceed eligible expenses");
          }
        }
      }
      if (r.reporting === "w2_box1" || r.reporting === "w2_box12_p") {
        const w = w2s.get(r.w2_document_reference ?? "");
        if (!w || normalize(w.employee_ssn) !== normalize(m.claimant_ssn)) {
          throw new Error("Reimbursement needs its claimant's issued W-2");
        }
        const amounts = r.reporting === "w2_box1" ? w2Wages : w2P;
        amounts.set(
          w.source_document_reference,
          cents((amounts.get(w.source_document_reference) ?? 0) + r.amount),
        );
      } else if (r.w2_document_reference) {
        throw new Error("Non-W-2 reimbursement cannot reference a W-2");
      }
    }
    // Code P reimbursements enter once on line 4. Special allowance-covered costs
    // are removed above; those allowances never enter line 4. Box 1 is already income.
    const expenses = expenseRows.map((r) => ({
      ...r,
      eligible_amount: cents(
        r.eligible_before_allowances - r.allowance_allocated,
      ),
    }));
    const line1 = roundWholeDollars(
      sum(expenses.filter((r) => r.line === 1).map((r) => r.eligible_amount)),
    );
    const line2 = roundWholeDollars(
      sum(expenses.filter((r) => r.line === 2).map((r) => r.eligible_amount)),
    );
    const line3 = line1 + line2;
    const line4 = roundWholeDollars(sum(line4Amounts));
    const balance = movingExpenseBalance(line3, line4);
    return {
      move_id: m.move_id,
      claimant_ssn: m.claimant_ssn,
      file_form3903: !m.storage_only_from_prior_year,
      storage_only: m.storage_only_from_prior_year,
      eligibility_certified: true,
      expenses,
      lines: { line1, line2, line3, line4, line5: balance.deduction },
      taxable_excess: balance.taxableExcess,
    };
  });
  for (const [id, w] of w2s) {
    if (cents(w2P.get(id) ?? 0) !== cents(w.box12_p)) {
      throw new Error(
        "Moving reimbursements do not reconcile to W-2 box 12 code P",
      );
    }
    if ((w2Wages.get(id) ?? 0) > w.box1_wages) {
      throw new Error("Moving wage reimbursements exceed W-2 box 1");
    }
  }
  return {
    source_input: input,
    moves: calculated,
    schedule1Line14:
      sum(calculated.filter((m) => m.file_form3903).map((m) => m.lines.line5)) +
      roundWholeDollars(
        sum(
          calculated.filter((m) => m.storage_only).flatMap((m) =>
            m.expenses.map((e) => e.eligible_amount)
          ),
        ),
      ),
    schedule1StorageFees: calculated.some((m) => m.storage_only),
    f1040Line1h: sum(calculated.map((m) => m.taxable_excess)),
  };
}
