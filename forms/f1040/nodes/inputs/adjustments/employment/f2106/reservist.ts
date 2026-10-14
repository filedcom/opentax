import { z } from "zod";

const amount = z.number().int().nonnegative();
const reference = z.string().trim().min(1);
const date = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Reservist travel needs a real TY2025 date");

export enum ReserveComponent {
  ARMY_RESERVE = "ARMY_RESERVE",
  NAVY_RESERVE = "NAVY_RESERVE",
  MARINE_CORPS_RESERVE = "MARINE_CORPS_RESERVE",
  AIR_FORCE_RESERVE = "AIR_FORCE_RESERVE",
  COAST_GUARD_RESERVE = "COAST_GUARD_RESERVE",
  ARMY_NATIONAL_GUARD = "ARMY_NATIONAL_GUARD",
  AIR_NATIONAL_GUARD = "AIR_NATIONAL_GUARD",
  PUBLIC_HEALTH_SERVICE_RESERVE = "PUBLIC_HEALTH_SERVICE_RESERVE",
}

const daySchema = z.object({
  date,
  lodging_paid: amount,
  meals_paid: amount,
  expense_record_reference: reference,
  // Reviewed source facts, not a claim to authenticate the GSA rate record.
  federal_rate: z.object({
    locality: reference,
    fiscal_year: z.number().int().min(2025).max(2026),
    lodging_limit: amount.positive(),
    meals_incidentals_limit: z.union([
      z.literal(68),
      z.literal(74),
      z.literal(80),
      z.literal(86),
      z.literal(92),
    ]),
    rate_source_reference: reference,
    reviewed_for_locality_and_date: z.literal(true),
  }).strict(),
}).strict().superRefine((day, ctx) => {
  if (
    day.federal_rate.fiscal_year !== (day.date < "2025-10-01" ? 2025 : 2026)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reservist rate fiscal year differs from travel date",
    });
  }
});

export const reservistTripSchema = z.object({
  trip_reference: reference,
  reserve_orders_reference: reference,
  distance_from_tax_home_miles: z.number().finite().nonnegative(),
  overnight_required_for_reserve_service: z.literal(true),
  business_miles: amount,
  parking_ferry_tolls: amount,
  days: z.array(daySchema).min(2).max(365),
}).strict().superRefine((trip, ctx) => {
  if (
    trip.days.some((day, i) =>
      i > 0 &&
      Date.parse(day.date) - Date.parse(trip.days[i - 1].date) !== 86400000
    ) || trip.days.at(-1)!.lodging_paid !== 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Reservist overnight trip needs consecutive days and no lodging after return",
    });
  }
});

export const reservistTripsSchema = z.array(reservistTripSchema).min(1)
  .superRefine((trips, ctx) => {
    const dates = trips.flatMap((trip) => trip.days.map((day) => day.date));
    const refs = trips.map((trip) => trip.trip_reference);
    const receipts = trips.flatMap((trip) =>
      trip.days.map((day) => day.expense_record_reference)
    );
    if (
      new Set(dates).size !== dates.length ||
      new Set(refs).size !== refs.length ||
      new Set(receipts).size !== receipts.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reservist trips need distinct dates and source records",
      });
    }
  });

type Trips = z.infer<typeof reservistTripsSchema>;

/** Full expenses stay on Form 2106; only eligible federal-limited costs reach AGI. */
export function reservistTravelTotals(trips: Trips) {
  const qualifying = trips.filter((trip) =>
    trip.distance_from_tax_home_miles > 100
  );
  const limited = qualifying.reduce(
    (sum, trip) =>
      sum + trip.business_miles * .70 + trip.parking_ferry_tolls +
      trip.days.reduce((daily, day, i) => {
        const fraction = i === 0 || i === trip.days.length - 1 ? .75 : 1;
        return daily +
          Math.min(day.lodging_paid, day.federal_rate.lodging_limit) +
          Math.min(
              day.meals_paid,
              day.federal_rate.meals_incidentals_limit * fraction,
            ) * .5;
      }, 0),
    0,
  );
  return {
    business_miles: trips.reduce((sum, trip) => sum + trip.business_miles, 0),
    transportation: trips.reduce(
      (sum, trip) => sum + trip.parking_ferry_tolls,
      0,
    ),
    lodging: trips.flatMap((trip) => trip.days).reduce(
      (sum, day) => sum + day.lodging_paid,
      0,
    ),
    meals: trips.flatMap((trip) => trip.days).reduce(
      (sum, day) => sum + day.meals_paid,
      0,
    ),
    schedule1_deduction: Math.round(limited),
  };
}
