import { assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { Box12Code } from "../../../nodes/inputs/w2/index.ts";
import { irs1040 } from "./f1040.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "JOHN DOE",
  nameControl: "DOE",
  firstName: "John",
  lastName: "Doe",
  firstNameWithInitial: "John",
  address: {
    line1: "123 Main St",
    city: "Anytown",
    state: "CA",
    zip: "90210",
  },
  filingStatus: FilingStatus.Single,
};

function sourceW2(ein: string, amount: number) {
  return {
    employer_ein: ein,
    employee_ssn: "123-45-6789",
    box1_wages: 50_000,
    box2_fed_withheld: 0,
    box13_retirement_plan: true,
    box12_entries: [{ code: Box12Code.D, amount }],
    excess_deferral_review: {
      plan_type: "non_simple_401k",
      plan_review_reference: `plan-${ein}`,
      employee_birth_date: "1990-06-01",
      birth_date_source_reference: "2025 identity review",
      w2_source_reference: `w2-${ein}`,
    },
  };
}

const w2 = {
  w2s: [sourceW2("12-3456789", 15_000), sourceW2("98-7654321", 12_000)],
};
const fields = { line1h_other_earned: 3_500 };
const pending = { w2, agi_aggregator: { line1h_other_earned: [3_500] } };

Deno.test("Form 1040 native line 1h retains the reviewed W-2 code D excess", () => {
  const xml = irs1040.build(fields, { pending, filer });
  assertStringIncludes(
    xml,
    "<OtherEarnedIncomeAmt>3500</OtherEarnedIncomeAmt>",
  );
});

Deno.test("Form 1040 native line 1h rejects an unsourced positive amount", () => {
  assertThrows(
    () => irs1040.build({ line1h_other_earned: 500 }),
    Error,
    "exactly one supported retained source",
  );
});

Deno.test("Form 1040 native line 1h rejects changed excess, wrong owner, and mixed source", () => {
  assertThrows(
    () => irs1040.build({ line1h_other_earned: 3_501 }, { pending, filer }),
    Error,
    "W-2 excess must be sole-source",
  );
  assertThrows(
    () =>
      irs1040.build(fields, {
        pending: {
          ...pending,
          agi_aggregator: { line1h_other_earned: [3_501] },
        },
        filer,
      }),
    Error,
    "W-2 excess must be sole-source",
  );
  assertThrows(
    () =>
      irs1040.build(fields, {
        pending,
        filer: { ...filer, primarySSN: "999887777" },
      }),
    Error,
    "W-2 excess must be sole-source",
  );
  assertThrows(
    () =>
      irs1040.build(fields, {
        pending: { ...pending, fec: { fecs: [] } },
        filer,
      }),
    Error,
    "W-2 excess must be sole-source",
  );
});
