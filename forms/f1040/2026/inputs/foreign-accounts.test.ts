import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  inputSchema,
  schedule_b,
} from "../../nodes/intermediate/aggregation/income/investments/schedule_b/index.ts";
import { calculateInvestmentClaim2026 } from "./investment-claim.ts";
import {
  investmentOwner,
  syntheticInvestmentClaim2026,
} from "./investment.fixture.ts";
import { foreignAccountReviewFixture2026 } from "./foreign-accounts.fixture.ts";

function fixture(required = true) {
  return {
    ...investmentOwner,
    ...syntheticInvestmentClaim2026(),
    foreign_accounts_question: true,
    foreign_account_review: foreignAccountReviewFixture2026(required),
  };
}

Deno.test("2026 foreign account triggers Schedule B without duplicating below-threshold income", () => {
  const result = calculateInvestmentClaim2026(fixture());
  assertEquals(result.cents.taxable_interest, 1200.25);
  assertEquals(result.cents.ordinary_dividends, 800.25);
  assertEquals(result.schedule_b.required, true);
  assertEquals(result.schedule_b.workpaper?.foreign_country_names, [
    "Switzerland",
  ]);
  assertEquals(result.schedule_b.workpaper?.foreign_country_codes, undefined);
  assertEquals(result.foreign_accounts?.fbar_filing_status, "not_established");
});

Deno.test("2026 account without FBAR duty still triggers a disclosure-only Schedule B", () => {
  const raw = fixture(false);
  raw.f1099ints = [];
  raw.f1099divs = [];
  raw.foreign_account_review.accounts[0].relationship_ended_on = "2026-01-01";
  const result = calculateInvestmentClaim2026(raw);
  assertEquals(result.lines.line2b, 0);
  assertEquals(result.lines.line3b, 0);
  assertEquals(result.schedule_b.required, true);
  assertEquals(result.schedule_b.workpaper?.foreign_accounts_question, true);
  assertEquals(result.schedule_b.workpaper?.fincen_form114_required, false);
  assertEquals(result.schedule_b.workpaper?.foreign_country_names, undefined);
});

Deno.test("2026 account income references bind to real owner and account without adding income", () => {
  const raw = fixture();
  raw.foreign_account_review.accounts[0].account_number =
    raw.f1099ints[0].account_number;
  raw.foreign_account_review.accounts[0].relationship = "financial_interest";
  raw.foreign_account_review.accounts[0].income_review = {
    kind: "issued_1099_copies",
    source_references: [raw.f1099ints[0].source_document_reference],
    all_reportable_income_in_these_copies_verified: true,
    source_document: {
      document_reference: "income-reconciliation",
      document_sha256: "b".repeat(64),
    },
  };
  assertEquals(
    calculateInvestmentClaim2026(raw).cents.taxable_interest,
    1200.25,
  );
  for (
    const change of [
      { source_references: ["missing"] },
      {
        source_references: [
          raw.f1099ints[0].source_document_reference,
          raw.f1099ints[0].source_document_reference,
        ],
      },
    ]
  ) {
    const invalid = structuredClone(raw);
    Object.assign(
      invalid.foreign_account_review.accounts[0].income_review,
      change,
    );
    assertThrows(
      () => calculateInvestmentClaim2026(invalid),
      Error,
      "bind once",
    );
  }
  raw.foreign_account_review.accounts[0].account_number = "wrong";
  assertThrows(() => calculateInvestmentClaim2026(raw), Error, "bind once");
});

Deno.test("2026 foreign review rejects missing evidence, stale dates, conflicting answers and duplicate accounts", () => {
  const changes: ((raw: ReturnType<typeof fixture>) => void)[] = [
    (r) => r.foreign_accounts_question = false,
    (r) => r.foreign_account_review.reviewed_on = "2026-10-16",
    (r) => r.foreign_account_review.accounts[0].subject_tin = "999887777",
    (r) =>
      r.foreign_account_review.accounts[0].relationship_started_on =
        "2027-01-01",
    (r) =>
      r.foreign_account_review.accounts[0].relationship_ended_on = "2025-12-31",
    (r) =>
      r.foreign_account_review.accounts.push(
        structuredClone(r.foreign_account_review.accounts[0]),
      ),
    (r) =>
      r.foreign_account_review.accounts[0].location_and_relationship_document
        .document_sha256 = "bad",
    (r) =>
      r.foreign_account_review.accounts[0].income_review.source_document = {
        ...r.foreign_account_review.accounts[0]
          .location_and_relationship_document,
        document_sha256: "b".repeat(64),
      },
    (r) => r.foreign_account_review.fbar_reviews[0].subject_tin = "999887777",
  ];
  for (const change of changes) {
    const raw = fixture();
    change(raw);
    assertThrows(() => calculateInvestmentClaim2026(raw));
  }
});

Deno.test("2026 joint disclosure requires both filers' FBAR reviews and rejects MFS spouse accounts", () => {
  const raw = {
    ...fixture(),
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "999887777",
  };
  assertThrows(
    () => calculateInvestmentClaim2026(raw),
    Error,
    "each actual return filer",
  );
  raw.foreign_account_review.fbar_reviews.push({
    ...raw.foreign_account_review.fbar_reviews[0],
    subject_tin: raw.spouse_ssn,
    required: false,
  });
  assertEquals(calculateInvestmentClaim2026(raw).schedule_b.required, true);
  const spouseAccount = {
    ...raw.foreign_account_review.accounts[0],
    subject_tin: raw.spouse_ssn,
    record_reference: "spouse-account",
    country_name: "SWITZERLAND",
  };
  raw.foreign_account_review.accounts.push(spouseAccount);
  assertEquals(
    calculateInvestmentClaim2026(raw).foreign_accounts?.foreign_countries
      .length,
    1,
  );
  const mfs = { ...raw, filing_status: FilingStatus.MFS };
  mfs.foreign_account_review.fbar_reviews.pop();
  assertThrows(
    () => calculateInvestmentClaim2026(mfs),
    Error,
    "actual return filer",
  );
});

Deno.test("shared native Schedule B retains required country codes while paper computation rejects codes", () => {
  assertEquals(
    inputSchema.safeParse({ foreign_countries: [{ name: "Switzerland" }] })
      .success,
    false,
  );
  const native = {
    foreign_accounts_question: true,
    fincen_form114_required: true,
    foreign_countries: [{ name: "Switzerland", irs_code: "SZ" }],
    foreign_trust_question: false,
  };
  const result = schedule_b.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(native),
  );
  assertEquals(
    result.outputs.find((o) => o.nodeType === "schedule_b")?.fields
      .foreign_country_codes,
    ["SZ"],
  );
  assertThrows(() => schedule_b.computeForPaper(native));
});
