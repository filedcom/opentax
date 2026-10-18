import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { classifyForm8835Credits } from "../f3800/calculation.ts";
import { f3800 } from "../f3800/index.ts";
import { calculateForm8835, EnergyType, f8835 } from "./index.ts";
import { QualifiedFacilityRequirement } from "./purchase-source.ts";

const owner = { name: "Texas Solar Energy", ein: "000000029" };
const purchase = {
  transferor_name: owner.name,
  transferor_tin: owner.ein,
  registration_number: "PAZ123055555",
  form3800_line: "1f" as const,
  purchased_credit_amount: 13_200,
  agreement_reference: "transfer-agreement",
  cash_consideration_cents: 1_188_000,
  paid_on: "2025-12-15",
  unrelated_under_267b_and_707b_verified: true as const,
  minimum_documentation_received_verified: true as const,
  qualified_facility_requirements: [QualifiedFacilityRequirement.UnderOneMw],
  statement_file_name: "Transfer Election Statement.pdf",
  statement_sha256: "a".repeat(64),
};

function purchased(overrides: Record<string, unknown> = {}) {
  return f8835.inputSchema.parse({
    f8835s: [{
      energy_type: EnergyType.Solar,
      subject_to_passive_activity_limit: false,
      kwh_produced: 440_000,
      kwh_sold: 440_000,
      facility_owned_by_filer: false,
      facility_owner_business: owner,
      facility_placed_in_service_date: "2023-09-22",
      facility_construction_start_date: "2017-08-15",
      production_period_start_date: "2025-01-01",
      production_period_end_date: "2025-12-31",
      increased_credit_reason: "none",
      domestic_content_bonus: false,
      energy_community_bonus: false,
      is_fiscal_year: false,
      registration_number: purchase.registration_number,
      purchase_source: purchase,
      ...overrides,
    }],
  });
}

test("Form 8835 purchased credit figures no Part II credit and keeps the statement's Form 3800 line", () => {
  const lines = calculateForm8835(purchased().f8835s[0], 2025);
  assertEquals(lines.line15, 0);
  assertEquals(lines.line1, 0);
  assertEquals(lines.form3800Line, "1f");
});

test("Form 8835 purchased credit routes the column (f) amount and transferor to Form 3800", () => {
  const result = f8835.compute(
    { taxYear: 2025, formType: "f1040" },
    purchased(),
  );
  assertEquals(fieldsOf(result.outputs, f3800)?.f8835_credit_entries, [{
    form3800_line: "1f",
    credit_amount: 0,
    transfer_out_amount: 0,
    transfer_in_amount: 13_200,
    transferor_tin: "000000029",
    registration_number: "PAZ123055555",
    subject_to_passive_activity_limit: false,
    transfer_election_statement_file_name: "Transfer Election Statement.pdf",
  }]);
});

test("Form 8835 purchased credit rejects a transferor that is not the facility owner or own transfer-out", () => {
  for (
    const overrides of [
      { facility_owner_business: { ...owner, ein: "000000030" } },
      { facility_owned_by_filer: true, facility_owner_business: undefined },
      { registration_number: "PAZ123055556" },
      { transfer_election_amount: 100 },
      { increased_credit_reason: "under_one_mw" },
    ]
  ) {
    assertThrows(
      () => calculateForm8835(purchased(overrides).f8835s[0], 2025),
      Error,
      "Form 8835 purchased credit needs",
    );
  }
});

test("Form 3800 classifies a purchased credit as positive column (f) and leaves owner rows unchanged", () => {
  const bought = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 0,
    transfer_out_amount: 0,
    transfer_in_amount: 13_200,
    transferor_tin: "000000029",
    registration_number: "PAZ123055555",
    subject_to_passive_activity_limit: false,
    transfer_election_statement_file_name: "Transfer Election Statement.pdf",
  }]);
  assertEquals(bought.standardCredit, 13_200);
  assertEquals(bought.rows[0].transferInAmount, 13_200);
  assertEquals(bought.transferStatementFileNames, [
    "Transfer Election Statement.pdf",
  ]);
  const owned = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 5_000,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
  }]);
  assertEquals(owned.rows[0].transferInAmount, 0);
  assertEquals(owned.rows[0].availableCredit, 5_000);
  assertEquals(owned.transferStatementFileNames, []);
  assertThrows(
    () =>
      classifyForm8835Credits([{
        form3800_line: "1f",
        credit_amount: 5_000,
        transfer_out_amount: 0,
        transferor_tin: "000000029",
        subject_to_passive_activity_limit: false,
      }]),
    Error,
    "transferor EIN needs a purchased credit",
  );
  assertThrows(
    () =>
      classifyForm8835Credits([{
        form3800_line: "1f",
        credit_amount: 0,
        transfer_out_amount: 0,
        transfer_in_amount: 13_200,
        transferor_tin: "000000029",
        subject_to_passive_activity_limit: false,
      }]),
    Error,
    "purchased Form 8835 credit needs only the transferor",
  );
});
