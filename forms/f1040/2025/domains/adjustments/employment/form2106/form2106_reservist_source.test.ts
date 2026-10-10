import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm2106Lines,
  EmployeeType,
  form2106Contribution,
  inputSchema,
  itemSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import {
  reservistTravelTotals,
  reservistTripsSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/reservist.ts";
import {
  reservistCases,
  reservistFixture,
} from "./form2106_reservist.fixture.ts";

function source() {
  const item = itemSchema.parse(reservistFixture(reservistCases[1]).f2106[0]);
  if (item.qualification.kind !== EmployeeType.RESERVIST) {
    throw new Error("Expected reservist");
  }
  return { item, qualification: item.qualification };
}
Deno.test("Reservist expense form retains 838 while federal caps allow 633", () => {
  const { item } = source();
  const lines = calculateForm2106Lines(item);
  assertEquals(lines.line10_deduction, 838);
  assertEquals(form2106Contribution(item, lines), 633);
});
Deno.test("Reservist 100-mile boundary excludes the whole near trip", () => {
  const { qualification: q } = source();
  for (const distance of [100, 100.01]) {
    const trips = reservistTripsSchema.parse(
      q.trips.map((t) => ({ ...t, distance_from_tax_home_miles: distance })),
    );
    assertEquals(
      reservistTravelTotals(trips).schedule1_deduction,
      distance === 100 ? 0 : 633,
    );
  }
});
Deno.test("Reservist records reconcile to each Form 2106 expense category", () => {
  const { item } = source();
  assertThrows(
    () =>
      calculateForm2106Lines({
        ...item,
        expenses: { ...item.expenses, line4_other_business_expenses: 1 },
      }),
    Error,
    "trip totals",
  );
  assertThrows(
    () =>
      calculateForm2106Lines({
        ...item,
        expenses: { ...item.expenses, line5_meals: 301 },
      }),
    Error,
    "trip totals",
  );
});
Deno.test("Reservist trip days reject gaps, impossible dates and return-night lodging", () => {
  const { qualification: q } = source();
  const trip = q.trips[0];
  for (
    const days of [
      trip.days.slice(1, 2),
      [trip.days[0], trip.days[2]],
      trip.days.map((d, i) => i ? d : { ...d, date: "2025-02-30" }),
      trip.days.map((d, i) => i === 2 ? { ...d, lodging_paid: 1 } : d),
    ]
  ) {
    assertEquals(
      reservistTripsSchema.safeParse([{ ...trip, days }]).success,
      false,
    );
  }
});
Deno.test("Reservist rate review changes fiscal year at October 1", () => {
  const { qualification: q } = source();
  const trip = q.trips[0];
  const dates = ["2025-09-30", "2025-10-01", "2025-10-02"];
  const days = trip.days.map((d, i) => ({
    ...d,
    date: dates[i],
    federal_rate: { ...d.federal_rate, fiscal_year: i ? 2026 : 2025 },
  }));
  assertEquals(
    reservistTripsSchema.safeParse([{ ...trip, days }]).success,
    true,
  );
  assertEquals(
    reservistTripsSchema.safeParse([{
      ...trip,
      days: days.map((d) => ({
        ...d,
        federal_rate: { ...d.federal_rate, fiscal_year: 2025 },
      })),
    }]).success,
    false,
  );
});
Deno.test("Reservist jobs for one owner cannot reuse the same travel dates", () => {
  const { item } = source();
  assertEquals(
    inputSchema.safeParse({
      f2106s: [item, {
        ...item,
        job: {
          ...item.job,
          employer_ein: "98-7654321",
          employment_record_reference: "Second reserve job",
        },
      }],
    }).success,
    false,
  );
});
Deno.test("Reservist rates require reviewed locality facts and supported CONUS meal tiers", () => {
  const { qualification: q } = source();
  const trip = q.trips[0];
  for (
    const patch of [{ meals_incidentals_limit: 999 }, {
      reviewed_for_locality_and_date: false,
    }, { rate_source_reference: "" }]
  ) {
    assertEquals(
      reservistTripsSchema.safeParse([{
        ...trip,
        days: trip.days.map((d) => ({
          ...d,
          federal_rate: { ...d.federal_rate, ...patch },
        })),
      }]).success,
      false,
    );
  }
});
