import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForeignBankInterest2026,
  foreignBankInterest2026Schema,
} from "./foreign-bank-interest.ts";
import {
  foreignBankInterestFixture2026,
  foreignBankInvestmentFixture2026,
} from "./foreign-bank-interest.fixture.ts";
import { investmentOwner } from "./investment.fixture.ts";
import { calculateInvestmentClaim2026 } from "./investment-claim.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 bank interest uses receipt-date rates and preserves decimal half-cent ties", () => {
  const result = calculateForeignBankInterest2026([
    foreignBankInterestFixture2026(),
  ], investmentOwner);
  assertEquals(result.ledgers[0].receipts.map((r) => r.amount_usd), [
    1100.28,
    450.23,
  ]);
  assertEquals(result.taxable_interest_usd, 1550.51);
  assertEquals(result.income_items.map((i) => i.return_source_reference), [
    "synthetic-interest-june",
    "synthetic-interest-december",
  ]);
  assertEquals(result.schedule_b_rows[0].net, 1550.51);
  const raw = foreignBankInterestFixture2026();
  raw.receipts = [raw.receipts[0]];
  raw.receipts[0].gross_interest_native = "0.004999";
  raw.annual_interest_summary.gross_interest_native = "0.004999";
  raw.receipts[0].fx.usd_per_currency_unit = "1";
  assertEquals(
    calculateForeignBankInterest2026([raw], investmentOwner)
      .taxable_interest_usd,
    0,
  );
  raw.receipts[0].gross_interest_native = "0.005000";
  raw.annual_interest_summary.gross_interest_native = "0.005000";
  assertEquals(
    calculateForeignBankInterest2026([raw], investmentOwner)
      .taxable_interest_usd,
    0.01,
  );
});

Deno.test("2026 foreign bank statements combine with issued copies only once in Schedule B", () => {
  const raw = foreignBankInvestmentFixture2026();
  const result = calculateInvestmentClaim2026(raw);
  assertEquals(result.cents.taxable_interest, 2750.76);
  assertEquals(result.lines.line2b, 2751);
  assertEquals(result.lines.line3b, 800);
  assertEquals(result.schedule_b.workpaper?.print_interest_rows, [
    { payerName: "SYNTHETIC BANK", amount: 1200.25 },
    { payerName: "SYNTHETIC SWISS BANK", amount: 1550.51 },
  ]);
  raw.f1099ints = [];
  raw.f1099divs = [];
  const statementOnly = calculateInvestmentClaim2026(raw);
  assertEquals(statementOnly.lines.line2b, 1551);
  assertEquals(statementOnly.lines.investment_withholding, 0);
  assertEquals(statementOnly.schedule_b.required, true);
  assertEquals(statementOnly.source_input.f1099ints, []);
});

Deno.test("2026 USD foreign deposits retain currency identity with no conversion", () => {
  const raw = foreignBankInterestFixture2026();
  raw.currency_code = "USD";
  for (const receipt of raw.receipts) {
    receipt.fx.source = "usd_no_conversion";
    receipt.fx.usd_per_currency_unit = "1.00000000";
  }
  assertEquals(
    calculateForeignBankInterest2026([raw], investmentOwner)
      .taxable_interest_usd,
    1500.50,
  );
  raw.receipts[0].fx.usd_per_currency_unit = "1.10";
  assertThrows(
    () => calculateForeignBankInterest2026([raw], investmentOwner),
    Error,
    "rate of one",
  );
});

Deno.test("2026 bank interest reconciles the native annual statement before translation", () => {
  const raw = foreignBankInterestFixture2026();
  raw.receipts.pop();
  assertThrows(
    () => calculateForeignBankInterest2026([raw], investmentOwner),
    Error,
    "annual statement total",
  );
  raw.annual_interest_summary.gross_interest_native = "1000.250001";
  assertThrows(
    () => calculateForeignBankInterest2026([raw], investmentOwner),
    Error,
    "annual statement total",
  );
  raw.annual_interest_summary.gross_interest_native = "1000.25";
  assertEquals(
    calculateForeignBankInterest2026([raw], investmentOwner)
      .taxable_interest_usd,
    1100.28,
  );
});

Deno.test("2026 bank interest rejects wrong years, wrong FX dates, duplicate receipts and conflicting evidence", () => {
  const changes:
    ((r: ReturnType<typeof foreignBankInterestFixture2026>) => void)[] = [
      (r) => r.recipient_tin = "999887777",
      (r) => r.reviewed_on = "2026-10-16",
      (r) => r.receipts[0].received_or_available_on = "2025-12-31",
      (r) => r.receipts[0].fx.rate_date = "2026-12-31",
      (r) => r.receipts[1].record_reference = r.receipts[0].record_reference,
      (r) =>
        r.receipts[1].bank_transaction_reference =
          r.receipts[0].bank_transaction_reference,
      (r) => r.receipts[0].source_document.document_sha256 = "invalid",
      (r) =>
        r.receipts[0].fx.source_document = {
          ...r.receipts[0].source_document,
          document_sha256: "b".repeat(64),
        },
    ];
  for (const change of changes) {
    const raw = foreignBankInterestFixture2026();
    change(raw);
    assertThrows(() =>
      calculateForeignBankInterest2026([raw], investmentOwner)
    );
  }
  const raw = foreignBankInterestFixture2026();
  assertThrows(
    () =>
      calculateForeignBankInterest2026([raw, {
        ...raw,
        record_reference: "duplicate-ledger",
      }], investmentOwner),
    Error,
    "account/currency inventory",
  );
  for (const gross of ["1.0000001", "-1", "1e3", "0", "9999999999"]) {
    assertEquals(
      foreignBankInterest2026Schema.safeParse({
        ...raw,
        receipts: [{ ...raw.receipts[0], gross_interest_native: gross }],
      }).success,
      false,
    );
  }
  assertEquals(
    foreignBankInterest2026Schema.safeParse({
      ...raw,
      receipts: [{ ...raw.receipts[0], foreign_tax_withheld_native: "10" }],
    }).success,
    false,
  );
});

Deno.test("2026 interest must match its disclosure owner, account, dates and complete source inventory", () => {
  const changes:
    ((r: ReturnType<typeof foreignBankInvestmentFixture2026>) => void)[] = [
      (r) => r.foreign_accounts_question = false,
      (r) => r.foreign_bank_interest[0].foreign_account_reference = "missing",
      (r) => r.foreign_bank_interest[0].institution_name = "Different Bank",
      (r) => r.foreign_bank_interest[0].country_name = "Canada",
      (r) => r.foreign_bank_interest[0].account_number = "wrong-account",
      (r) => r.foreign_bank_interest[0].reviewed_on = "2027-03-01",
      (r) =>
        r.foreign_account_review.accounts[0].relationship =
          "signature_authority",
      (r) =>
        r.foreign_account_review.accounts[0].relationship_started_on =
          "2026-07-01",
      (r) =>
        r.foreign_account_review.accounts[0].relationship_ended_on =
          "2026-12-30",
      (r) =>
        r.f1099ints[0].account_number =
          r.foreign_bank_interest[0].account_number,
      (r) =>
        r.foreign_bank_interest[0].receipts[0].record_reference =
          r.f1099ints[0].source_document_reference,
      (r) =>
        r.foreign_bank_interest[0].annual_review_document = {
          ...r.foreign_account_review.accounts[0]
            .location_and_relationship_document,
          document_sha256: "b".repeat(64),
        },
    ];
  for (const change of changes) {
    const raw = foreignBankInvestmentFixture2026();
    change(raw);
    assertThrows(() => calculateInvestmentClaim2026(raw));
  }
  const raw = foreignBankInvestmentFixture2026();
  const { foreign_account_review: _review, ...missingReview } = raw;
  assertThrows(
    () => calculateInvestmentClaim2026(missingReview),
    Error,
    "complete foreign account review",
  );
  const { all_foreign_bank_interest_statements_included: _complete, ...scope } =
    raw.source_scope_review;
  assertThrows(
    () => calculateInvestmentClaim2026({ ...raw, source_scope_review: scope }),
    Error,
    "complete statement inventory",
  );
  raw.foreign_account_review.accounts[0].income_review = {
    kind: "no_reportable_income",
    no_income_reportable_by_subject_from_this_account_verified: true,
    source_document:
      raw.foreign_account_review.accounts[0].location_and_relationship_document,
  };
  assertThrows(
    () => calculateInvestmentClaim2026(raw),
    Error,
    "matching account income review",
  );
});

Deno.test("2026 joint spouse interest is included while MFS spouse interest is rejected", () => {
  const raw = foreignBankInterestFixture2026();
  raw.recipient_tin = "999887777";
  const owner = {
    ...investmentOwner,
    spouse_ssn: raw.recipient_tin,
    filing_status: FilingStatus.MFJ,
  };
  assertEquals(
    calculateForeignBankInterest2026([raw], owner).taxable_interest_usd,
    1550.51,
  );
  assertThrows(
    () =>
      calculateForeignBankInterest2026([raw], {
        ...owner,
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "actual return filer",
  );
});
