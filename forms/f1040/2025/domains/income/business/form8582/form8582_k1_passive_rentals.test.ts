import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { returnHints } from "../../../../../../../cli/commands/return-hints.ts";

// Synthetic return. 2025 Instructions for Form 8582: a passive partnership's
// box 1 income and box 2 loss are passive activities (Worksheet 3) that net
// with the rental real estate activities (Worksheet 1) in Part I. Modified AGI
// of $150,000 or more leaves no Part II special allowance (line 7 and line 9
// zero), so line 11 allows only losses equal to passive income.
const general = {
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1975-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Owner",
  spouse_ssn: "111-22-4444",
  spouse_dob: "1976-03-02",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const rental = (
  activityId: string,
  street: string,
  income: number,
  repairs: number,
) => ({
  tsj: "J",
  activity_id: activityId,
  property_description: `${street} rental`,
  property_type: 1,
  activity_type: "A",
  street_address: street,
  city: "Austin",
  state: "TX",
  zip: "78701",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: income,
  expense_repairs: repairs,
  form_1099_payments_made: false,
});

const review = {
  recipient_tin: "111223333",
  partnership_not_publicly_traded_verified: true,
  activity_statement_reference: "2025 K-1 activity statement",
  participation_workpaper_reference: "2025 participation workpaper",
} as const;

const partnership = (status?: "passive") => ({
  partnership_name: "Synthetic Fund LP",
  partnership_ein: "123456789",
  recipient_tin: "111223333",
  source_document_reference: "2025 Schedule K-1 Synthetic Fund LP",
  box1_ordinary_business: 3_290,
  box2_rental_re: -2_901,
  ...(status
    ? { eic_passive_activity_review: { ...review, box1: status, box2: status } }
    : {}),
});

const sum = (value: unknown) =>
  ([value].flat() as number[]).reduce((total, amount) => total + amount, 0);

function run(k1: Record<string, unknown>) {
  return f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 200_000, box2_fed_withheld: 30_000 }],
    schedule_e: [
      rental("rental-north-2025", "10 North St", 10_000, 14_000),
      rental("rental-south-2025", "20 South St", 8_000, 11_500),
    ],
    k1_partnership: [k1],
  });
}

test("passive K-1 income and loss net with passive rentals on Form 8582", () => {
  const result = run(partnership("passive"));
  assertEquals(result.diagnostics, []);
  // Part I: income 3,290 (box 1); losses 2,901 (box 2) + 4,000 + 3,500.
  assertEquals(result.pending.form8582.current_income, 3_290);
  assertEquals(sum(result.pending.form8582.current_loss), 10_401);
  // Line 11: losses allowed equal passive income; the net loss is suspended.
  assertEquals(result.carryforwards.suspended_pal_8582, 7_111);
  assertEquals(
    result.carryforwards["suspended_pal_8582:P:123456789:111223333:box2"] +
      result.carryforwards["suspended_pal_8582:rental-north-2025"] +
      result.carryforwards["suspended_pal_8582:rental-south-2025"],
    7_111,
  );
  // Box 1 income less the 3,290 allowed loss: nothing passive is left.
  assertEquals(sum(result.pending.schedule1.line5_schedule_e), 0);
  assertEquals(result.pending.f1040.line11_agi, 200_000);
});

test("a K-1 with no passive status stays nonpassive and is flagged", () => {
  const result = run(partnership());
  assertEquals(result.diagnostics, []);
  // Boxes 1 and 2 reach Schedule E in full; only the rentals reach Form 8582.
  assertEquals(result.pending.form8582.current_income, undefined);
  assertEquals(result.pending.form8582.current_loss, 7_500);
  assertEquals(result.carryforwards.suspended_pal_8582, 7_500);
  assertEquals(result.pending.f1040.line11_agi, 200_389);
  const hints = returnHints(result.pending).filter((hint) =>
    hint.includes("treated as nonpassive")
  );
  assertEquals(hints.length, 1);
  assertEquals(hints[0].includes("Synthetic Fund LP box1, box2"), true);
  assertEquals(
    returnHints(run(partnership("passive")).pending).some((hint) =>
      hint.includes("treated as nonpassive")
    ),
    false,
  );
});
