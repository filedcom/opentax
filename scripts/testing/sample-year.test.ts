import { test } from "bun:test";
import { assertEquals, assertStrictEquals } from "@std/assert";
import { shiftDatedFacts } from "./sample-year.ts";

test("dates and year fields move one year; amounts and text stay", () => {
  assertEquals(
    shiftDatedFacts({
      general: { taxpayer_dob: "1985-06-15", filing_status: "single" },
      w2: [{ box1_wages: 2025, box2_fed_withheld: 2024 }],
      f1099b: [{ date_acquired: "2024-01-10", date_sold: "2025-06-20", proceeds: 2026 }],
      f1098: [{ box3_origination_date: "01/15/2020", form_year: 2025 }],
      f8814: [{ source_review: { tax_year: 2025 } }],
      carryover: { tax_year: 2024, calendar_year: "2025", amount_2024: 2024 },
      note: "Synthetic 2025 lender statement",
      account_number: "2025-0001",
      shareholder_ssn_last4: "2025",
    }, 1),
    {
      general: { taxpayer_dob: "1986-06-15", filing_status: "single" },
      w2: [{ box1_wages: 2025, box2_fed_withheld: 2024 }],
      f1099b: [{ date_acquired: "2025-01-10", date_sold: "2026-06-20", proceeds: 2026 }],
      f1098: [{ box3_origination_date: "01/15/2021", form_year: 2026 }],
      f8814: [{ source_review: { tax_year: 2026 } }],
      carryover: { tax_year: 2025, calendar_year: "2026", amount_2024: 2024 },
      note: "Synthetic 2025 lender statement",
      account_number: "2025-0001",
      shareholder_ssn_last4: "2025",
    },
  );
});

test("a leap day lands on February 28 of a common year", () => {
  assertEquals(
    shiftDatedFacts({ dob: "2024-02-29", us: "02/29/2024", paid_on: "2027-02-28" }, 1),
    { dob: "2025-02-28", us: "02/28/2025", paid_on: "2028-02-28" },
  );
  assertEquals(shiftDatedFacts({ dob: "2023-02-28" }, 1), { dob: "2024-02-28" });
});

test("a year field outside 1900-2100 or not a whole year is an amount", () => {
  assertEquals(
    shiftDatedFacts({ tax_year: 12, form_year: 2025.5, birth_year: 2020 }, 1),
    { tax_year: 12, form_year: 2025.5, birth_year: 2021 },
  );
});

test("document bytes are carried over untouched", () => {
  const bytes = new Uint8Array([50, 48, 50, 53]);
  const shifted = shiftDatedFacts({ issuer_copy: { bytes, issued_on: "2025-01-31" } }, 1);
  assertStrictEquals(shifted.issuer_copy.bytes, bytes);
  assertEquals(shifted.issuer_copy.issued_on, "2026-01-31");
});

test("a zero shift returns the sample itself", () => {
  const inputs = { date_sold: "2025-06-20" };
  assertStrictEquals(shiftDatedFacts(inputs, 0), inputs);
});

test("a year-named key moves with its year; other keys stay", () => {
  // The shifted keys differ from the input's, so its type is not kept.
  const shifted: unknown = shiftDatedFacts({
    base_returns: { year2024: { filed_on: "2025-04-15" } },
    tax_treatment: { year2025: true, yearly: 1 },
  }, 1);
  assertEquals(
    shifted,
    {
      base_returns: { year2025: { filed_on: "2026-04-15" } },
      tax_treatment: { year2026: true, yearly: 1 },
    },
  );
});
