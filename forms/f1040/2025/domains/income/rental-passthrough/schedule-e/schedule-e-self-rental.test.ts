import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  inputSchema,
  scheduleE,
} from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";

// Sources:
// - 2025 Instructions for Schedule E, line 1b: code 7 is self-rental, property
//   rented to a trade or business in which the taxpayer materially participated.
// - Pub. 925 (2025), Rental of Property to a Nonpassive Activity: net rental
//   income from that property is nonpassive. Recharacterization of Passive
//   Income: a net loss stays passive; net income is kept off Form 8582 and
//   reported on the form normally used.
// - Instructions for Form 8995 (2025), Determining Your Qualified Business
//   Income: losses suspended under section 469 are not included in QBI.

const property = (overrides: Record<string, unknown>) => ({
  tsj: "T",
  property_type: 7,
  activity_type: "A",
  fair_rental_days: 365,
  personal_use_days: 0,
  form_1099_payments_made: false,
  qbi_trade_or_business: "Y",
  ...overrides,
});

const lossRental = property({
  activity_id: "rental1",
  property_description: "1 Address City FL",
  rent_income: 10_000,
  expense_advertising: 50_000,
  expense_depreciation: 3_636,
});
const incomeRental = property({
  activity_id: "rental2",
  property_description: "2 Address City FL",
  rent_income: 10_000,
});
const royalty = {
  tsj: "T",
  activity_id: "royalty1",
  property_description: "Royalties",
  property_type: 6,
  activity_type: "A",
  fair_rental_days: 0,
  personal_use_days: 0,
  rent_income: 0,
  royalties_income: 2_000,
  form_1099_payments_made: false,
};

function inputs() {
  return {
    general: {
      filing_status: "mfs",
      taxpayer_first_name: "Pat",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1951-11-11",
      taxpayer_blind: false,
      taxpayer_can_be_claimed_as_dependent: false,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
      spouse_dob: "1991-12-12",
      mfs_spouse_itemizing: false,
      mfs_spouse_lived_with_taxpayer: true,
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Employer",
      box1_wages: 150_000,
      box2_fed_withheld: 30_000,
      box3_ss_wages: 150_000,
      box4_ss_withheld: 9_300,
      box5_medicare_wages: 150_000,
      box6_medicare_withheld: 2_175,
    }],
    schedule_e: [lossRental, royalty, incomeRental],
  };
}

test("self-rental net income is nonpassive; a self-rental loss stays passive", () => {
  const result = scheduleE.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ schedule_es: [lossRental, royalty, incomeRental] }),
  );
  const f8582 = result.outputs.find((o) => o.nodeType === "form8582")!.fields;
  // Only the loss rental and the royalty reach Form 8582.
  assertEquals(
    (f8582.activities as { activity_id: string }[]).map((a) => a.activity_id),
    ["rental1", "royalty1"],
  );
  assertEquals(f8582.current_income, 2_000);
  assertEquals(f8582.current_loss, 43_636);
  // Line 26 before Form 8582: -43,636 held back; 2,000 + 10,000 reported.
  assertEquals(
    result.outputs.find((o) => o.nodeType === "schedule1")!.fields
      .line5_schedule_e,
    12_000,
  );
});

test("three Schedule E properties: self-rental income and allowed PAL reach Form 1040", () => {
  const result = f1040_2025.executeReturn(inputs());
  assertEquals(result.diagnostics, []);
  const f1040 = normalizeAllPending(result.pending).f1040;
  // Wages 150,000 + Schedule E line 26 (10,000 nonpassive + 2,000 royalty
  // - 2,000 allowed passive loss).
  assertEquals(f1040.line9_total_income, 160_000);
  // Form 8995: rental1 QBI is its allowed loss (-2,000), rental2 is 10,000.
  assertEquals(f1040.line13_qbi_deduction, 1_600);
  // 160,000 - 17,350 standard deduction (MFS, one 65+) - 1,600.
  assertEquals(f1040.line15_taxable_income, 141_050);
  assertEquals(result.carryforwards["suspended_pal_8582:rental1"], 41_636);
  assertEquals(
    result.carryforwards["qualified_passive_loss_199a:rental1"],
    41_636,
  );
});

test("self-rental net income with a prior passive loss needs review", () => {
  assertThrows(
    () =>
      scheduleE.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          schedule_es: [{
            ...incomeRental,
            prior_unallowed_passive_operating: 1_000,
            prior_passive_losses_active_when_incurred: true,
          }],
        }),
      ),
    Error,
    "1.469-2(f)(6)",
  );
});
