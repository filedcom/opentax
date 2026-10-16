import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  computeGrossIncome,
  computeNetProfit,
  computeTotalExpenses,
  type ScheduleCItem,
} from "../../nodes/inputs/income/business/schedule_c/model.ts";
import { scheduleSELines } from "../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { businessEarnedReview2026Schema } from "./business-earned-review.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/).refine((v) => v !== "000000000");
const money = z.number().finite().nonnegative().max(1_000_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, {
    message: "Source amounts must be dollars and cents",
  });
const date = z.string().date().refine((v) => v.startsWith("2026-"), {
  message: "Cash source must belong to 2026",
});
const payment = z.object({
  record_reference: reference,
  date,
  description: reference,
  amount: money,
}).strict();
const expenseLines = {
  advertising: "line_8_advertising",
  commissions: "line_10_commissions_fees",
  contract_labor: "line_11_contract_labor",
  employee_benefits: "line_14_employee_benefits",
  business_insurance: "line_15_insurance",
  professional_services: "line_17_professional_services",
  office: "line_18_office_expense",
  employee_pension: "line_19_pension_plans",
  rent_business_property: "line_20b_rent_other",
  repairs: "line_21_repairs",
  supplies: "line_22_supplies",
  taxes_licenses: "line_23_taxes_licenses",
  travel: "line_24a_travel",
  meals: "line_24b_meals",
  utilities: "line_25_utilities",
  employee_wages: "line_26_wages",
} as const;
const expense = payment.extend({
  category: z.enum([
    "advertising",
    "commissions",
    "contract_labor",
    "employee_benefits",
    "business_insurance",
    "professional_services",
    "office",
    "employee_pension",
    "rent_business_property",
    "repairs",
    "supplies",
    "taxes_licenses",
    "travel",
    "meals",
    "utilities",
    "employee_wages",
    "other",
  ]),
}).strict();

/** Owned, previously placed-in-service vehicle; no Form 4562 election implied. */
export const businessVehicle2026Schema = z.object({
  vehicle_reference: reference,
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/),
  description: reference,
  in_service_date: z.string().date().refine((v) => v < "2026-01-01"),
  odometer_start: z.number().int().nonnegative().max(1_000_000_000),
  odometer_end: z.number().int().nonnegative().max(1_000_000_000),
  available_for_personal_use: z.boolean(),
  another_vehicle_available: z.boolean(),
  mileage_log_reference: reference,
  trips: z.array(
    z.object({
      record_reference: reference,
      date,
      purpose: z.enum(["business", "commuting", "other"]),
      description: reference,
      miles: z.number().int().positive().max(100_000),
    }).strict(),
  ).min(1).max(5000),
  business_parking_and_tolls: z.array(payment).max(5000),
  interest: z.object({
    loan_reference: reference,
    lender_name: reference,
    borrower_tin: tin,
    payments: z.array(payment).min(1).max(5000),
    loan_used_only_to_buy_this_vehicle: z.literal(true),
    interest_not_claimed_elsewhere: z.literal(true),
  }).strict().optional(),
  review: z.object({
    record_reference: reference,
    owned_all_year_and_used_only_in_this_business: z.literal(true),
    mileage_elected_in_first_business_year: z.literal(true),
    no_accelerated_depreciation_section179_or_bonus: z.literal(true),
    no_fleet_of_five_or_more: z.literal(true),
    all_trips_recorded_and_no_commuting_in_business_miles: z.literal(true),
    written_evidence: z.literal(true),
  }).strict(),
}).strict();

export const businessActivity2026Schema = z.object({
  business_reference: reference,
  owner_tin: tin,
  principal_business: reference,
  business_code: z.string().regex(/^\d{6}$/),
  business_name: reference.optional(),
  ein: tin.optional(),
  business_address: z.object({
    line1: reference,
    line2: reference.optional(),
    city: reference,
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).strict(),
  kind: z.enum(["sole_proprietor", "statutory_employee"]),
  accounting_method: z.literal("cash"),
  materially_participated: z.literal(true),
  new_business: z.boolean(),
  information_return_obligation: z.discriminatedUnion("required", [
    z.object({ required: z.literal(false), review_reference: reference })
      .strict(),
    z.object({
      required: z.literal(true),
      filed_or_will_file: z.boolean(),
      review_reference: reference,
    }).strict(),
  ]),
  receipts: z.array(
    payment.extend({
      kind: z.enum([
        "service_receipt",
        "return_allowance",
        "other_ordinary_income",
      ]),
    }).strict(),
  ).max(5000),
  expenses: z.array(expense).max(5000),
  vehicle: businessVehicle2026Schema.optional(),
  review: z.object({
    record_reference: reference,
    domestic_individual_service_business: z.literal(true),
    all_receipts_and_expenses_recorded: z.literal(true),
    no_business_information_returns_except_linked_w2s: z.literal(true),
    no_inventory_cogs_other_assets_home_office_or_dispositions: z.literal(true),
    no_other_interest_or_section163j_limitation: z.literal(true),
    all_investment_at_risk_no_prior_suspended_losses: z.literal(true),
    no_special_se_exemption_gambling_clergy_or_notary: z.literal(true),
    ordinary_necessary_current_expenses_no_personal_or_capital_costs: z.literal(
      true,
    ),
    no_vehicle_costs_outside_vehicle_record: z.literal(true),
    no_owner_benefits_retirement_health_or_employment_credits: z.literal(true),
    meals_qualify_for_standard_50_percent_limit_no_entertainment: z.literal(
      true,
    ),
    no_amt_differences_or_special_business_adjustments: z.literal(true),
  }).strict(),
}).strict();

/** Source inventory replayed by the 2026 business, QBI and earned-income owners.
 * Public callers provide records, not calculated Schedule C/SE totals. */
export const businessSources2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: reference,
  earned_income_review: businessEarnedReview2026Schema.optional(),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  businesses: z.array(businessActivity2026Schema).min(1).max(50),
  w2s: z.array(w2Item2026Schema).max(500),
  review: z.object({
    record_reference: reference,
    complete_business_and_w2_inventory: z.literal(true),
    no_other_se_income_farms_partnerships_or_church_wages: z.literal(true),
    no_4137_8919_rrta_or_community_property_allocations: z.literal(true),
    no_totalization_or_other_se_exemption: z.literal(true),
    optional_se_methods_not_elected: z.literal(true),
  }).strict(),
}).strict();

function sum(values: readonly number[]) {
  const result = values.reduce((n, v) => n + v, 0);
  if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER) {
    throw new Error("Business source totals exceed the safe calculation range");
  }
  return result;
}
function dollars(values: readonly number[]) {
  // Sum cash cents first; floating-point addition must not turn .50 into .49.
  return roundWholeDollars(sum(values.map((v) => Math.round(v * 100))) / 100);
}
function unique(refs: Set<string>, ref: string, label: string) {
  if (refs.has(ref)) throw new Error(`Duplicate ${label} reference: ${ref}`);
  refs.add(ref);
}

export function calculateBusinessSources2026(raw: unknown) {
  const source = businessSources2026Schema.parse(raw);
  const joint = source.filing_status === FilingStatus.MFJ;
  if (
    joint
      ? !source.spouse_tin || source.spouse_tin === source.taxpayer_tin
      : source.spouse_tin !== undefined
  ) {
    throw new Error("Business sources need the current return's actual owners");
  }
  const owns = (owner: string) =>
    owner === source.taxpayer_tin || (joint && owner === source.spouse_tin);
  const businessRefs = new Set<string>(), paymentRefs = new Set<string>();
  const vehicleRefs = new Set<string>(), vehicleVins = new Set<string>();
  const loanRefs = new Set<string>();
  for (const b of source.businesses) {
    unique(businessRefs, b.business_reference, "business");
    if (!owns(b.owner_tin)) throw new Error("Business owner is not a filer");
  }
  const wageRefs = new Set<string>(), employerOwners = new Set<string>();
  const statutory = new Map<string, z.infer<typeof w2Item2026Schema>[]>();
  for (const w of source.w2s) {
    unique(wageRefs, w.source_document_reference, "W-2 source");
    const owner = w.employee_ssn.replaceAll("-", "");
    if (!owns(owner)) throw new Error("W-2 owner is not a filer");
    if (w.box3_ss_wages === undefined) {
      throw new Error(
        "Business wage-base review needs actual W-2 box 3, including zero",
      );
    }
    if (w.box3_ss_wages + (w.box7_ss_tips ?? 0) > wages2026.ssWageBase) {
      throw new Error(
        "W-2 Social Security wages above the employer limit need correction",
      );
    }
    unique(
      employerOwners,
      `${owner}:${w.employer_ein.replaceAll("-", "")}`,
      "employer/owner (W-2 corrections need reconciliation)",
    );
    if (
      (w.box8_allocated_tips ?? 0) > 0 ||
      (w.box14a_entries ?? []).some((e) => /RRTA/i.test(e.description))
    ) {
      throw new Error(
        "Business wage-base route does not include RRTA or allocated tips",
      );
    }
    if (w.box13_statutory_employee === true) {
      const b = source.businesses.find((b) =>
        b.business_reference === w.schedule_c_business_reference
      );
      if (!b || b.kind !== "statutory_employee" || b.owner_tin !== owner) {
        throw new Error(
          "Statutory W-2 must match one statutory business and its owner",
        );
      }
      statutory.set(b.business_reference, [
        ...(statutory.get(b.business_reference) ?? []),
        w,
      ]);
    } else if (w.schedule_c_business_reference !== undefined) {
      throw new Error("Ordinary W-2 cannot be linked as Schedule C receipts");
    }
  }

  const businesses = source.businesses.map((b) => {
    for (const p of [...b.receipts, ...b.expenses]) {
      unique(paymentRefs, p.record_reference, "cash transaction");
      if (wageRefs.has(p.record_reference)) {
        throw new Error("W-2 cannot be entered again as a cash transaction");
      }
    }
    const linked = statutory.get(b.business_reference) ?? [];
    if (
      b.kind === "statutory_employee" && (!linked.length || b.receipts.length)
    ) {
      throw new Error(
        "Statutory business needs linked W-2s and separate ordinary business receipts",
      );
    }
    const gross = dollars([
      ...linked.map((w) => w.box1_wages),
      ...b.receipts.filter((p) => p.kind === "service_receipt").map((p) =>
        p.amount
      ),
    ]);
    const returns = dollars(
      b.receipts.filter((p) => p.kind === "return_allowance").map((p) =>
        p.amount
      ),
    );
    const otherIncome = dollars(
      b.receipts.filter((p) => p.kind === "other_ordinary_income").map((p) =>
        p.amount
      ),
    );
    if (returns > gross) {
      throw new Error(
        "Returns above current receipts need prior-income review",
      );
    }
    const categoryTotal = (category: string) =>
      dollars(
        b.expenses.filter((p) => p.category === category).map((p) => p.amount),
      );
    const ordinaryExpenses = Object.fromEntries(
      Object.entries(expenseLines).map((
        [category, line],
      ) => [line, categoryTotal(category)]),
    );
    // The shared helper applies the meal percentage. Give it twice the rounded
    // allowed amount, avoiding double rounding of cash cents before the limit.
    const meals = roundWholeDollars(
      sum(
        b.expenses.filter((p) => p.category === "meals").map((p) =>
          Math.round(p.amount * 100)
        ),
      ) / 200,
    );
    ordinaryExpenses.line_24b_meals = meals * 2;
    const partV = b.expenses.filter((p) => p.category === "other");
    const otherExpenses = dollars(partV.map((p) => p.amount));
    let vehicle;
    if (b.vehicle) {
      const v = b.vehicle;
      unique(vehicleRefs, v.vehicle_reference, "vehicle");
      unique(vehicleVins, v.vin, "vehicle VIN");
      const tripRefs = new Set<string>();
      for (const t of v.trips) {
        unique(tripRefs, t.record_reference, "vehicle trip");
      }
      const miles = (purpose: string) =>
        sum(v.trips.filter((t) => t.purpose === purpose).map((t) => t.miles));
      const before = sum(
        v.trips.filter((t) => t.purpose === "business" && t.date < "2026-07-01")
          .map((t) => t.miles),
      );
      const after = miles("business") - before;
      const total = sum(v.trips.map((t) => t.miles));
      if (v.odometer_end - v.odometer_start !== total || total <= 0) {
        throw new Error(
          "Complete mileage log must reconcile to annual odometers",
        );
      }
      for (
        const p of [
          ...v.business_parking_and_tolls,
          ...(v.interest?.payments ?? []),
        ]
      ) {
        unique(paymentRefs, p.record_reference, "cash transaction");
        if (wageRefs.has(p.record_reference)) {
          throw new Error("W-2 cannot be entered again as a vehicle payment");
        }
      }
      if (v.interest) {
        unique(loanRefs, v.interest.loan_reference, "vehicle loan");
        if (v.interest.borrower_tin !== b.owner_tin) {
          throw new Error("Vehicle loan borrower must own the business");
        }
      }
      const interestCents = sum(
        (v.interest?.payments ?? []).map((p) => Math.round(p.amount * 100)),
      );
      const businessInterest = interestCents / 100 * miles("business") / total;
      const interestNumerator = BigInt(interestCents) *
        BigInt(miles("business"));
      const interestDenominator = BigInt(total) * 100n;
      vehicle = {
        source: v,
        before_july_business_miles: before,
        from_july_business_miles: after,
        line44a_business_miles: miles("business"),
        line44b_commuting_miles: miles("commuting"),
        line44c_other_miles: miles("other"),
        total_miles: total,
        // Notice 2026-10 and Announcement 2026-11; rate in mills avoids
        // floating point below an exact half-dollar rounding boundary.
        line9: roundWholeDollars(
          (before * 725 + after * 760 +
            sum(
                v.business_parking_and_tolls.map((p) =>
                  Math.round(p.amount * 100)
                ),
              ) * 10) / 1000,
        ),
        // Allocate from integer cents so an exact half-dollar cannot become
        // .499999... through multiplication/division in floating point.
        line16b: Number(
          (interestNumerator + interestDenominator / 2n) / interestDenominator,
        ),
        business_interest_before_rounding: businessInterest,
        personal_interest_before_rounding: interestCents / 100 -
          businessInterest,
      };
    }
    const projected: ScheduleCItem = {
      line_a_principal_business: b.principal_business,
      line_b_business_code: b.business_code,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      statutory_employee: b.kind === "statutory_employee",
      line_1_gross_receipts: gross,
      line_2_returns_allowances: returns,
      line_6_other_income: otherIncome,
      ...ordinaryExpenses,
      line_9_car_truck_expenses: vehicle?.line9 ?? 0,
      // The old helper's 16b means ALL nonmortgage interest. This private
      // projection uses it only for arithmetic; the 2026 result splits b/c.
      line_16b_interest_other: vehicle?.line16b ?? 0,
      line_27b_other_expenses: otherExpenses,
      // Do not pass Part V detail too: the shared helper adds both inputs.
    };
    const line7 = computeGrossIncome(projected);
    const line28 = computeTotalExpenses(projected);
    return {
      source: b,
      statutory_w2_references: linked.map((w) => w.source_document_reference),
      vehicle,
      part_v_source_entries: partV,
      lines: {
        line1: gross,
        line2: returns,
        line3: gross - returns,
        line4: 0,
        line5: gross - returns,
        line6: otherIncome,
        line7,
        line8: categoryTotal("advertising"),
        line10: categoryTotal("commissions"),
        line11: categoryTotal("contract_labor"),
        line14: categoryTotal("employee_benefits"),
        line15: categoryTotal("business_insurance"),
        line17: categoryTotal("professional_services"),
        line18: categoryTotal("office"),
        line19: categoryTotal("employee_pension"),
        line20b: categoryTotal("rent_business_property"),
        line21: categoryTotal("repairs"),
        line22: categoryTotal("supplies"),
        line23: categoryTotal("taxes_licenses"),
        line24a: categoryTotal("travel"),
        line24b: meals,
        line25: categoryTotal("utilities"),
        line26: categoryTotal("employee_wages"),
        line9: vehicle?.line9 ?? 0,
        line12: 0,
        line13: 0,
        line16a: 0,
        line16b: vehicle?.line16b ?? 0,
        line16c: 0,
        line20a: 0,
        line27a: 0,
        line27b: otherExpenses,
        line28,
        line29: line7 - line28,
        line30: 0,
        line31: computeNetProfit(projected),
        line48: otherExpenses,
      },
    };
  });
  const owners = [source.taxpayer_tin, ...(joint ? [source.spouse_tin!] : [])]
    .map((owner) => {
      const own = businesses.filter((b) => b.source.owner_tin === owner);
      const regular = own.filter((b) => b.source.kind === "sole_proprietor");
      const ownWages = source.w2s.filter((w) =>
        w.employee_ssn.replaceAll("-", "") === owner
      );
      const wageBase = dollars(
        ownWages.flatMap((w) => [w.box3_ss_wages ?? 0, w.box7_ss_tips ?? 0]),
      );
      const net = sum(regular.map((b) => b.lines.line31));
      const se = scheduleSELines(
        {
          net_profit_schedule_c: net,
          w2_ss_wages: wageBase,
        },
        wages2026.ssWageBase,
        { roundRegularNetEarnings: true },
      );
      return {
        owner_tin: owner,
        business_references: regular.map((b) => b.source.business_reference),
        net_profit_subject_to_se: net,
        statutory_net_profit: sum(
          own.filter((b) => b.source.kind === "statutory_employee").map((b) =>
            b.lines.line31
          ),
        ),
        w2_ss_wages_and_tips: wageBase,
        schedule_se: se,
      };
    });
  return {
    source_input: source,
    businesses,
    owners,
    schedule1_line3: sum(businesses.map((b) => b.lines.line31)),
    schedule1_line15: sum(owners.map((o) => o.schedule_se?.line13 ?? 0)),
    schedule2_line4: sum(owners.map((o) => o.schedule_se?.line12 ?? 0)),
    qbi_status: "requires_joint_deduction_resolution" as const,
    filing_ready: false as const,
  };
}
