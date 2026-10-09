import {
  EmployeeType,
  VehicleMethod,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { cases, fixture } from "./form2106_fee_basis.fixture.ts";

export const reservistCases = [
  {
    name: "single-actual-below-cap",
    base: 0,
    owners: ["taxpayer"],
    lodging: 90,
    meals: 40,
    near: false,
    october: false,
    deduction: 568,
    line10: 568,
    tax: 24931,
  },
  {
    name: "single-per-diem-cap",
    base: 0,
    owners: ["taxpayer"],
    lodging: 180,
    meals: 100,
    near: false,
    october: false,
    deduction: 633,
    line10: 838,
    tax: 24915,
  },
  {
    name: "single-mixed-distance",
    base: 0,
    owners: ["taxpayer"],
    lodging: 180,
    meals: 100,
    near: true,
    october: false,
    deduction: 633,
    line10: 1452,
    tax: 24915,
  },
  {
    name: "joint-spouse-october",
    base: 1,
    owners: ["spouse"],
    lodging: 180,
    meals: 100,
    near: false,
    october: true,
    deduction: 633,
    line10: 838,
    tax: 15759,
  },
  {
    name: "joint-two-reservists",
    base: 2,
    owners: ["taxpayer", "spouse"],
    lodging: 180,
    meals: 100,
    near: false,
    october: false,
    deduction: 1266,
    line10: 838,
    tax: 15619,
  },
  {
    name: "single-locality-rate",
    base: 0,
    owners: ["taxpayer"],
    lodging: 180,
    meals: 100,
    near: false,
    october: false,
    deduction: 774,
    line10: 838,
    tax: 24881,
  },
] as const;

export function reservistFixture(c: typeof reservistCases[number]) {
  const original = fixture(cases[c.base]);
  const jobs = c.owners.map((owner, i) => {
    const job = original.f2106[i];
    const month = c.october ? "10" : "04";
    const makeTrip = (
      first: number,
      distance: number,
      businessMiles: number,
    ) => ({
      trip_reference: `${c.name} ${owner} trip ${first}`,
      reserve_orders_reference: `${c.name} ${owner} orders`,
      distance_from_tax_home_miles: distance,
      overnight_required_for_reserve_service: true,
      business_miles: businessMiles,
      parking_ferry_tolls: 20,
      days: [0, 1, 2].map((offset) => ({
        date: `2025-${month}-${String(first + offset).padStart(2, "0")}`,
        lodging_paid: offset === 2 ? 0 : c.lodging,
        meals_paid: c.meals,
        expense_record_reference: `${c.name} ${owner} ${
          first + offset
        } receipts`,
        federal_rate: {
          locality: c.name === "single-locality-rate"
            ? "Austin, Texas"
            : "Standard CONUS locality",
          fiscal_year: c.october ? 2026 : 2025,
          lodging_limit: c.name === "single-locality-rate" ? 173 : 110,
          meals_incidentals_limit: c.name === "single-locality-rate" ? 80 : 68,
          rate_source_reference: `${c.name} dated GSA locality lookup`,
          reviewed_for_locality_and_date: true,
        },
      })),
    });
    const trips = [
      makeTrip(10, 220, 440),
      ...(c.near ? [makeTrip(20, 100, 120)] : []),
    ];
    return {
      ...job,
      job: { ...job.job, occupation: "Armed Forces reservist" },
      qualification: {
        kind: EmployeeType.RESERVIST,
        reserve_component: "ARMY_RESERVE",
        reserve_component_reference: `${c.name} ${owner} reserve membership`,
        travel_more_than_100_miles_from_home: true,
        tax_home_reference: `${c.name} ${owner} reviewed tax home`,
        federal_per_diem_limit_workpaper_reference:
          `${c.name} ${owner} travel workpaper`,
        trips,
      },
      vehicle: {
        method: VehicleMethod.STANDARD_MILEAGE,
        placed_in_service_date: "2023-04-15",
        total_miles: 10000,
        business_miles: trips.reduce((sum, t) => sum + t.business_miles, 0),
        average_daily_roundtrip_commuting_miles: 10,
        commuting_miles: 2000,
        available_for_personal_use_off_duty: true,
        other_personal_vehicle_available: false,
        written_mileage_evidence_reference: `${c.name} ${owner} mileage log`,
        no_personal_to_business_conversion_during_year_confirmed: true,
        standard_mileage_eligibility: {
          ownership: "owned",
          used_standard_mileage_first_business_year: true,
          method_history_reference: "2023 standard mileage election",
        },
      },
      expenses: {
        ...job.expenses,
        line2_parking_tolls_local_transportation: trips.length * 20,
        line3_overnight_travel_excluding_meals: trips.length * c.lodging * 2,
        line4_other_business_expenses: 0,
        line5_meals: trips.length * c.meals * 3,
      },
    };
  });
  return { ...original, f2106: jobs };
}
