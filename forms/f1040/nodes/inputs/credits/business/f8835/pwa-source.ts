import { z } from "zod";
import type { F8835Item } from "./index.ts";
import { smallFacilitySourceSchema } from "./increase-source.ts";
import {
  assertForm8835ConstructionHistory,
  constructionHistorySchema,
} from "./construction-history.ts";

const ref = z.string().trim().min(1);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });
const money = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER / 100);
const count = z.number().int().positive().max(1000000);

/** Reviewed direct compliance. Corrections, penalty cures and GFE need separate proof. */
export const pwaSourceSchema = smallFacilitySourceSchema
  .extend({
    method: z.literal("direct_compliance"),
    placed_in_service_on: date,
    placed_in_service_record_reference: ref,
    construction_history: constructionHistorySchema,
    original_independent_facility_reviewed: z.literal(true),
    complete_construction_and_current_year_work_inventory_verified: z.literal(
      true,
    ),
    primary_and_secondary_worksites_reviewed: z.literal(true),
    excluded_maintenance_and_nonlabor_records_review_reference: ref,
    no_wage_corrections_penalty_cures_or_good_faith_exception: z.literal(true),
    project_labor_agreement: z.boolean(),
    project_labor_agreement_review_reference: ref.optional(),
    alterations_or_repairs_in_2025: z.boolean(),
    form7220_file_name: ref,
    form7220_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    employers: z
      .array(
        z
          .object({
            reference: ref,
            name: ref,
            ein: z.string().regex(/^\d{9}$/),
            relationship: z.enum(["taxpayer", "contractor", "subcontractor"]),
            engagement_record_reference: ref,
            complete_worker_inventory_verified: z.literal(true),
          })
          .strict(),
      )
      .min(1),
    wage_determinations: z
      .array(
        z
          .object({
            reference: ref,
            work_classification: ref,
            worksite_reference: ref,
            determination_record_reference: ref,
            applicable_contract_and_geography_review_reference: ref,
            valid_from: date,
            valid_through: date,
            basic_hourly_rate_cents: money,
            fringe_hourly_rate_cents: money,
            applicable_effective_date_and_classification_verified: z.literal(
              true,
            ),
          })
          .strict(),
      )
      .min(1),
    programs: z
      .array(
        z
          .object({
            reference: ref,
            work_classification: ref,
            registered_program_record_reference: ref,
            registered_with: z.enum(["DOL", "recognized_state_agency"]),
            valid_from: date,
            valid_through: date,
            geographic_ratio_review_reference: ref,
            first_apprentice_journeyworkers: count,
            each_additional_apprentice_journeyworkers: count,
          })
          .strict(),
      )
      .min(1),
    workers: z
      .array(
        z
          .object({
            reference: ref,
            employer_reference: ref,
            employment_record_reference: ref,
            // Forepersons' manual work is still wage-covered, but excluded from
            // apprenticeship labor hours under section 45(b)(8)(E).
            role: z.enum([
              "journeyworker",
              "laborer",
              "working_foreperson",
              "apprentice",
            ]),
            apprentice: z
              .object({
                program_reference: ref,
                registration_record_reference: ref,
                registered_from: date,
                registered_through: date,
                wage_schedule_record_reference: ref,
                basic_rate_basis_points: z.number().int().positive().max(10000),
                fringe_hourly_rate_cents: money,
                applicable_program_wage_and_fringe_reviewed: z.literal(true),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(1),
    payroll: z
      .array(
        z
          .object({
            reference: ref,
            worker_reference: ref,
            wage_determination_reference: ref,
            worked_on: date,
            paid_on: date,
            activity: z.enum(["construction", "alteration_or_repair"]),
            minutes_worked: z.number().int().positive().max(1440),
            cash_wages_paid_cents: money,
            overtime_premium_cents: money,
            bona_fide_fringe_paid_cents: money,
            payment_record_reference: ref,
            time_record_reference: ref,
            fringe_allocation_record_reference: ref,
            payment_timing_and_bona_fide_fringe_verified: z.literal(true),
            // A row has one worker, classification, rate and day, never an average
            // across different workers or wage determinations.
            single_rate_work_and_pay_reconciled: z.literal(true),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type PwaSource = z.infer<typeof pwaSourceSchema>;
export type PwaWageRow = {
  employerName: string;
  employerEin: string;
  classification: string;
  workers: number;
  minutes: number;
  cashCents: number;
  fringeCents: number;
};
function unique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Form 8835 PWA duplicate ${label}`);
  }
}

export function reconcileForm8835PwaPayroll(source: PwaSource) {
  unique(
    source.employers.map((e) => e.reference),
    "employer reference",
  );
  unique(
    source.employers.map((e) => e.ein),
    "employer EIN",
  );
  unique(
    source.workers.map((w) => w.reference),
    "worker reference",
  );
  unique(
    source.wage_determinations.map((w) => w.reference),
    "wage determination",
  );
  unique(
    source.programs.map((p) => p.reference),
    "program reference",
  );
  unique(
    source.payroll.map((p) => p.reference),
    "payroll reference",
  );
  unique(
    source.payroll.map((p) => p.time_record_reference),
    "time record",
  );
  const employers = new Map(source.employers.map((e) => [e.reference, e]));
  const workers = new Map(source.workers.map((w) => [w.reference, w]));
  const rates = new Map(
    source.wage_determinations.map((r) => [r.reference, r]),
  );
  const programs = new Map(source.programs.map((p) => [p.reference, p]));
  for (const w of source.workers) {
    if (
      !employers.has(w.employer_reference) ||
      (w.role === "apprentice") !== !!w.apprentice ||
      (w.apprentice && !programs.has(w.apprentice.program_reference))
    ) {
      throw new Error(
        "Form 8835 PWA worker/employer/apprentice inventory does not reconcile",
      );
    }
  }
  const dailyMinutes = new Map<string, number>();
  const daily = new Map<
    string,
    {
      journeys: Set<string>;
      apprentices: Set<string>;
      programRefs: Set<string>;
    }
  >();
  const constructionWorkers = new Map<string, Set<string>>();
  const constructionApprentices = new Set<string>();
  const usedWorkers = new Set<string>();
  let labor = 0n;
  let apprenticeLabor = 0n;
  let repairs = false;
  const wageRows = new Map<string, PwaWageRow & { workerIds: Set<string> }>();
  const apprenticeRows = new Map<
    string,
    PwaWageRow & { workerIds: Set<string> }
  >();
  for (const p of source.payroll) {
    const w = workers.get(p.worker_reference);
    const r = rates.get(p.wage_determination_reference);
    if (!w || !r) {
      throw new Error("Form 8835 PWA payroll has an unknown worker or rate");
    }
    const e = employers.get(w.employer_reference)!;
    usedWorkers.add(w.reference);
    const beforeService = p.activity === "construction";
    if (
      p.worked_on < source.construction_began_on ||
      p.worked_on > "2025-12-31" ||
      p.paid_on < p.worked_on ||
      p.paid_on > source.signed_on ||
      p.worked_on < r.valid_from ||
      p.worked_on > r.valid_through ||
      r.valid_from > r.valid_through ||
      p.overtime_premium_cents > p.cash_wages_paid_cents ||
      (beforeService
        ? p.worked_on > source.placed_in_service_on
        : p.worked_on < source.placed_in_service_on ||
          p.worked_on < "2025-01-01")
    ) {
      throw new Error(
        "Form 8835 PWA payroll dates, payment or work period do not reconcile",
      );
    }
    if (!beforeService) repairs = true;
    const workerDay = `${w.reference}/${p.worked_on}`;
    const minutes = (dailyMinutes.get(workerDay) ?? 0) + p.minutes_worked;
    if (minutes > 1440) {
      throw new Error("Form 8835 PWA worker has overlapping daily hours");
    }
    dailyMinutes.set(workerDay, minutes);
    let requiredRateNumerator =
      BigInt(r.basic_hourly_rate_cents + r.fringe_hourly_rate_cents) * 10000n;
    if (w.apprentice) {
      const a = w.apprentice;
      const program = programs.get(a.program_reference)!;
      if (
        p.worked_on < a.registered_from ||
        p.worked_on > a.registered_through ||
        p.worked_on < program.valid_from ||
        p.worked_on > program.valid_through ||
        program.work_classification !== r.work_classification
      ) {
        throw new Error(
          "Form 8835 PWA apprentice registration, classification or dates do not reconcile",
        );
      }
      requiredRateNumerator =
        BigInt(r.basic_hourly_rate_cents) * BigInt(a.basic_rate_basis_points) +
        BigInt(a.fringe_hourly_rate_cents) * 10000n;
    }
    const paid = BigInt(
      p.cash_wages_paid_cents -
        p.overtime_premium_cents +
        p.bona_fide_fringe_paid_cents,
    );
    if (
      paid * 60n * 10000n <
        requiredRateNumerator * BigInt(p.minutes_worked)
    ) {
      throw new Error(
        "Form 8835 PWA prevailing wage underpayment needs correction review",
      );
    }
    const dayKey = JSON.stringify([
      e.reference,
      r.worksite_reference,
      r.work_classification,
      p.worked_on,
    ]);
    const group = daily.get(dayKey) ?? {
      journeys: new Set<string>(),
      apprentices: new Set<string>(),
      programRefs: new Set<string>(),
    };
    if (w.role === "journeyworker") group.journeys.add(w.reference);
    if (w.apprentice) {
      group.apprentices.add(w.reference);
      group.programRefs.add(w.apprentice.program_reference);
    }
    daily.set(dayKey, group);
    if (beforeService) {
      const employed = constructionWorkers.get(e.reference) ??
        new Set<string>();
      employed.add(w.reference);
      constructionWorkers.set(e.reference, employed);
      if (w.role !== "working_foreperson") labor += BigInt(p.minutes_worked);
      if (w.apprentice) {
        apprenticeLabor += BigInt(p.minutes_worked);
        constructionApprentices.add(e.reference);
      }
    }
    // Current-year service reports construction plus current-year repairs;
    // later-year service reports only current-year alterations/repairs.
    const reported = source.placed_in_service_on >= "2025-01-01" ||
      !beforeService;
    const add = (rows: typeof wageRows) => {
      const key = JSON.stringify([e.reference, r.work_classification]);
      const row = rows.get(key) ?? {
        employerName: e.name,
        employerEin: e.ein,
        classification: r.work_classification,
        workers: 0,
        minutes: 0,
        cashCents: 0,
        fringeCents: 0,
        workerIds: new Set<string>(),
      };
      row.workerIds.add(w.reference);
      row.workers = row.workerIds.size;
      row.minutes += p.minutes_worked;
      row.cashCents += p.cash_wages_paid_cents;
      row.fringeCents += p.bona_fide_fringe_paid_cents;
      if (
        ![row.minutes, row.cashCents, row.fringeCents].every(
          Number.isSafeInteger,
        )
      ) {
        throw new Error(
          "Form 8835 PWA payroll totals exceed exact integer range",
        );
      }
      rows.set(key, row);
    };
    if (reported) add(wageRows);
    if (
      beforeService &&
      w.apprentice &&
      source.placed_in_service_on >= "2025-01-01"
    ) {
      add(apprenticeRows);
    }
  }
  for (const g of daily.values()) {
    for (const id of g.programRefs) {
      const program = programs.get(id)!;
      const allowed = g.journeys.size < program.first_apprentice_journeyworkers
        ? 0
        : 1 +
          Math.floor(
            (g.journeys.size - program.first_apprentice_journeyworkers) /
              program.each_additional_apprentice_journeyworkers,
          );
      if (g.apprentices.size > allowed) {
        throw new Error(
          "Form 8835 PWA daily apprentice-to-journeyworker ratio is not met",
        );
      }
    }
  }
  const basisPoints = source.construction_began_on < "2024-01-01"
    ? 1250n
    : 1500n;
  if (labor === 0n || apprenticeLabor * 10000n < labor * basisPoints) {
    throw new Error(
      "Form 8835 PWA apprenticeship labor-hours percentage is not met",
    );
  }
  for (const [employer, ws] of constructionWorkers) {
    if (ws.size >= 4 && !constructionApprentices.has(employer)) {
      throw new Error(
        "Form 8835 PWA four-worker employer participation is not met",
      );
    }
  }
  if (
    usedWorkers.size !== source.workers.length ||
    [...employers.keys()].some(
      (e) => !source.workers.some((w) => w.employer_reference === e),
    ) ||
    repairs !== source.alterations_or_repairs_in_2025
  ) {
    throw new Error(
      "Form 8835 PWA complete payroll inventory or alterations answer does not reconcile",
    );
  }
  const clean = (rows: typeof wageRows) =>
    [...rows.values()].map(({ workerIds: _, ...row }) => row);
  return {
    wageRows: clean(wageRows),
    apprenticeRows: clean(apprenticeRows),
    laborMinutes: Number(labor),
    apprenticeMinutes: Number(apprenticeLabor),
    requiredBasisPoints: Number(basisPoints),
  };
}

export function assertForm8835PwaSource(item: F8835Item, filing = false) {
  const s = item.pwa_source;
  if (!s) {
    if (
      filing &&
      item.increased_credit_reason === "prevailing_wage_and_apprenticeship"
    ) {
      throw new Error(
        "Form 8835 PWA filing needs reviewed payroll, apprenticeship and Form 7220 sources",
      );
    }
    return;
  }
  const total = s.generating_units.reduce((n, u) => n + u.nameplate_kw_ac, 0);
  if (
    item.increased_credit_reason !== "prevailing_wage_and_apprenticeship" ||
    item.meets_prevailing_wage !== true ||
    item.meets_apprenticeship !== true ||
    item.facility_owned_by_filer !== true ||
    item.is_fiscal_year ||
    item.subject_to_passive_activity_limit ||
    ((item.transfer_election_amount ?? 0) !== 0 && !item.transfer_source) ||
    (item.registration_number && !item.transfer_source) ||
    item.existing_facility_expansion ||
    !["WIND", "GEOTHERMAL", "SOLAR"].includes(item.energy_type) ||
    item.facility_construction_start_date < "2023-01-29" ||
    item.facility_construction_start_date >= "2025-01-01" ||
    s.facility_description !== item.facility_description ||
    s.facility_address_line1 !== item.facility_us_address?.line1 ||
    s.facility_latitude !== item.facility_latitude ||
    s.facility_longitude !== item.facility_longitude ||
    s.construction_began_on !== item.facility_construction_start_date ||
    s.placed_in_service_on !== item.facility_placed_in_service_date ||
    s.meter_period_start !== item.production_period_start_date ||
    s.meter_period_end !== item.production_period_end_date ||
    s.metered_kwh !== item.kwh_produced ||
    s.invoiced_kwh !== item.kwh_sold ||
    total !== item.ac_nameplate_kw ||
    total / 1000 !== item.maximum_net_output_mw ||
    s.statement_file_name !== item.increased_credit_statement_file_name ||
    s.form7220_file_name !== item.pwa_form7220_file_name ||
    s.statement_file_name === s.form7220_file_name ||
    s.signed_on < item.production_period_end_date ||
    s.project_labor_agreement !== !!s.project_labor_agreement_review_reference
  ) {
    throw new Error(
      "Form 8835 PWA facility, production, capacity or attachment review does not reconcile",
    );
  }
  unique(
    s.generating_units.map((u) => u.unit_reference),
    "generating unit",
  );
  unique(
    s.generating_units.map((u) => u.capacity_record_reference),
    "capacity record",
  );
  assertForm8835ConstructionHistory({
    ...s.construction_history,
    construction_began_on: s.construction_began_on,
    placed_in_service_on: s.placed_in_service_on,
  });
  reconcileForm8835PwaPayroll(s);
}

export function form8835PwaDeclaration(item: F8835Item) {
  const s = item.pwa_source!;
  return `The facility satisfies the prevailing wage and apprenticeship requirements of sections 45(b)(7) and 45(b)(8). The accompanying Form 7220 reports the reviewed construction and current-year work. ${
    s.alterations_or_repairs_in_2025
      ? "Alterations or repairs during 2025 are included in the payroll review."
      : "No alterations or repairs were performed to the facility during 2025."
  }`;
}
export const form8835PwaDescription = (facility: string) =>
  `Form 8835 Form 7220 PWA Verification - ${facility}`;
