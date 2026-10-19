import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

// Synthetic joint return: seven actively managed rentals (single-family,
// multi-family, commercial; two with expenses and no rent; one with cents and
// one owned 33.33%) and four passive rental K-1s. Figured by hand from the
// 2025 Instructions for Form 8582: each property enters at its whole-dollar
// Schedule E net; with modified AGI of $150,000 or more there is no Part II
// allowance (line 9 zero), so losses are allowed only up to passive income.
// Suspended losses are not QBI until allowed (Reg. 1.199A-3(b)(1)(iv);
// Instructions for Form 8995, Determining Your Qualified Business Income).
const general = {
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1970-01-01",
  spouse_first_name: "Sam",
  spouse_last_name: "Owner",
  spouse_ssn: "111-22-4444",
  spouse_dob: "1971-01-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const rental = (
  id: number,
  propertyType: number,
  rent: number,
  repairs: number,
  extra: Record<string, unknown> = {},
) => ({
  tsj: id % 2 ? "T" : "S",
  activity_id: `rental-${id}`,
  property_description: `Rental ${id}`,
  property_type: propertyType,
  activity_type: "A",
  street_address: `${id} Oak St`,
  city: "Austin",
  state: "TX",
  zip: "78701",
  fair_rental_days: rent > 0 ? 365 : 0,
  personal_use_days: 0,
  rent_income: rent,
  expense_repairs: repairs,
  expense_taxes: 1_200,
  form_1099_payments_made: false,
  qbi_trade_or_business: "Y",
  ...extra,
});

// Filed nets: -7,200; 2,266 (33.33% of 6,800); -12,200; 7,800; -5,200;
// -3,700; -7,200.
const rentals = [
  rental(1, 1, 24_000, 30_000.4),
  rental(2, 2, 36_000, 28_000, { ownership_percent: 33.33 }),
  rental(3, 3, 50_000, 61_000),
  rental(4, 1, 18_000, 9_000),
  rental(5, 2, 0, 4_000),
  rental(6, 1, 0, 2_500),
  rental(7, 3, 20_000, 26_000),
];

const k1s = [-3_000, 2_500, -1_800, 900].map((box2, index) => ({
  partnership_name: `Synthetic Fund ${index}`,
  partnership_ein: `12345678${index}`,
  recipient_tin: "111223333",
  source_document_reference: `2025 K-1 Synthetic Fund ${index}`,
  box2_rental_re: box2,
  box20z_qbi: box2,
  eic_passive_activity_review: {
    box2: "passive",
    recipient_tin: "111223333",
    partnership_not_publicly_traded_verified: true,
    activity_statement_reference: `2025 K-1 statement ${index}`,
    participation_workpaper_reference: `2025 participation ${index}`,
  },
}));

const sum = (value: unknown) =>
  ([value ?? 0].flat() as number[]).reduce((total, amount) => total + amount, 0);

function run(withK1s: boolean) {
  return f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 175_000, box2_fed_withheld: 25_000 }],
    schedule_e: rentals,
    ...(withK1s ? { k1_partnership: k1s } : {}),
  });
}

test("seven rentals reconcile on Form 8582 and keep suspended losses out of QBI", () => {
  const result = run(false);
  assertEquals(result.diagnostics, []);
  assertEquals(sum(result.pending.form8582.current_income), 10_066);
  assertEquals(sum(result.pending.form8582.current_loss), 35_500);
  assertEquals(result.carryforwards.suspended_pal_8582, 25_434);
  assertEquals(sum(result.pending.schedule1.line5_schedule_e), 0);
  assertEquals(result.pending.f1040.line11_agi, 175_000);
  assertEquals(
    sum(result.pending.form8995.qbi_suspended_passive_loss),
    25_434,
  );
  assertEquals(result.pending.f1040.line13_qbi_deduction ?? 0, 0);
});

test("seven rentals and four passive K-1s net on one Form 8582", () => {
  const result = run(true);
  assertEquals(result.diagnostics, []);
  // Income 10,066 + 3,400; losses 35,500 + 4,800; allowed equals income.
  assertEquals(sum(result.pending.form8582.current_income), 13_466);
  assertEquals(sum(result.pending.form8582.current_loss), 40_300);
  assertEquals(result.carryforwards.suspended_pal_8582, 26_834);
  assertEquals(sum(result.pending.schedule1.line5_schedule_e), 0);
  assertEquals(result.pending.f1040.line11_agi, 175_000);
  assertEquals(
    sum(result.pending.form8995.qbi_suspended_passive_loss),
    26_834,
  );
  assertEquals(result.pending.f1040.line13_qbi_deduction ?? 0, 0);
});
