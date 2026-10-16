import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  calculateForeignAssetReturn2026,
  foreignAssetReturnClaim2026Schema,
} from "./foreign-assets-return.ts";
import { foreignAssetReturnFixture2026 } from "./foreign-assets-return.fixture.ts";
import { ForeignAssetType } from "../../nodes/inputs/general/foreign/f8938/index.ts";
import { FilingStatus } from "../../nodes/types.ts";

const plan = buildExecutionPlan(sourceRegistry2026);
function run(raw: ReturnType<typeof foreignAssetReturnFixture2026>) {
  const result = execute(plan, sourceRegistry2026, raw, {
    taxYear: 2026,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  return {
    result,
    disclosure: result.pending.f8938.calculation_2026 as NonNullable<
      ReturnType<typeof calculateForeignAssetReturn2026>
    >,
  };
}

Deno.test("2026 Form 8938 binds receipt income after the completed return without changing tax", () => {
  const raw = foreignAssetReturnFixture2026();
  const { result, disclosure: d } = run(raw);
  const { f8938: _claim, ...withoutDisclosure } = raw;
  const baseline = execute(plan, sourceRegistry2026, withoutDisclosure, {
    taxYear: 2026,
    formType: "f1040",
  });
  assertEquals(result.pending.f1040, baseline.pending.f1040);
  assertEquals(d.return_binding_complete, true);
  assertEquals(d.filing_required, true);
  assertEquals(d.filing_ready, false);
  assertEquals(d.tax_items.account, [{
    kind: "interest",
    amount: 1551,
    unrounded_amount_usd: 1550.51,
    formLocations: ["Form 1040 line 2b"],
    scheduleLocations: ["Schedule B line 1"],
  }]);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 2751);
  assertEquals(d.bound_tax_items.length, 2);
  assertEquals(d.valuation.summary.partI.depositMaximumValueUsd, 80000);
  assertEquals(d.valuation.threshold.year_end_usd_exact, "55000.00000000000");
  assertEquals(d.assets[0].tax_items.length, 2);
});

Deno.test("2026 Form 8938 rejects missing, repeated, stale, invented or mismatched receipt tax items", () => {
  const original = run(foreignAssetReturnFixture2026()).disclosure.source_input;
  const changes: ((s: typeof original) => void)[] = [
    (s) => s.claim!.assets[0].tax_items.pop(),
    (s) => s.claim!.assets[0].tax_items[0].amount_usd += 0.01,
    (s) =>
      s.claim!.assets[0].tax_items[0].return_source_reference =
        "invented-source",
    (s) =>
      s.claim!.assets[0].tax_items[1].return_source_reference =
        s.claim!.assets[0].tax_items[0].return_source_reference,
    (s) =>
      s.claim!.assets[0].tax_items[0].source_document.document_sha256 = "b"
        .repeat(64),
    (s) => s.claim!.assets[0].tax_items[0].kind = "dividends",
    (s) => s.claim!.assets[0].currency_code = "EUR",
    (s) => s.claim!.assets[0].opened_or_acquired_date = "2026-07-01",
    (s) => s.claim!.assets[0].asset_identifier = "other-account",
    (s) => s.claim!.assets[0].institution_or_issuer_name = "Other Institution",
    (s) => s.claim!.assets[0].country = "CA",
    (s) =>
      s.account_bindings![0].foreign_account_references = ["missing-account"],
    (s) => s.account_bindings!.push(structuredClone(s.account_bindings![0])),
    (s) => s.account_bindings = [],
    (s) => s.investment_sources_2026!.taxpayer_ssn = "999887777",
    (s) => s.settled_return.line2b_taxable_interest = 1551,
    (s) => s.settled_return.line3b_ordinary_dividends = 801,
    (s) => s.settled_return.tax_year = 2025,
  ];
  for (const change of changes) {
    const s = structuredClone(original);
    change(s);
    assertThrows(() => calculateForeignAssetReturn2026(s));
  }
});

Deno.test("2026 Form 8938 binds ordinary issued dividends without repeating qualified dividends", () => {
  const raw = foreignAssetReturnFixture2026();
  const investment = raw.investment_income;
  investment.foreign_bank_interest = [];
  const source = investment.f1099divs[0];
  source.source_document_sha256 = "c".repeat(64);
  const account = investment.foreign_account_review.accounts[0];
  account.account_number = source.account_number;
  account.institution_name = source.payerName;
  account.income_review = {
    kind: "issued_1099_copies",
    source_references: [source.source_document_reference],
    all_reportable_income_in_these_copies_verified: true,
    source_document: {
      document_reference: source.source_document_reference,
      document_sha256: "c".repeat(64),
    },
  };
  const asset = raw.f8938.claim.assets[0];
  asset.asset_type = ForeignAssetType.CustodialAccount;
  asset.asset_identifier = source.account_number;
  asset.institution_or_issuer_name = source.payerName;
  asset.tax_items = [{
    record_reference: "issued-dividend-tax-item",
    return_source_reference: source.source_document_reference,
    kind: "dividends",
    amount_usd: 800.25,
    source_document: account.income_review.source_document,
  }];
  const { disclosure: d } = run(raw);
  assertEquals(d.tax_items.account[0].amount, 800);
  assertEquals(d.tax_items.account[0].unrounded_amount_usd, 800.25);
  assertEquals(d.tax_items.account[0].scheduleLocations, ["Schedule B line 5"]);
  assertEquals(d.tax_items.account[0].formLocations, ["Form 1040 line 3b"]);
  assertEquals(d.bound_tax_items.length, 1);
  const input = structuredClone(d.source_input);
  delete input.investment_sources_2026!.f1099divs[0].source_document_sha256;
  assertThrows(
    () => calculateForeignAssetReturn2026(input),
    Error,
    "source copy digest",
  );
});

Deno.test("2026 Form 8938 no-income account and below-threshold decision remain distinct", () => {
  const raw = foreignAssetReturnFixture2026();
  raw.investment_income.foreign_bank_interest = [];
  const account = raw.investment_income.foreign_account_review.accounts[0];
  account.income_review = {
    kind: "no_reportable_income",
    no_income_reportable_by_subject_from_this_account_verified: true,
    source_document: account.location_and_relationship_document,
  };
  raw.f8938.claim.assets[0].tax_items = [];
  const required = run(raw).disclosure;
  assertEquals(required.filing_required, true);
  assertEquals(required.tax_items.account, []);
  assertEquals(required.assets[0].tax_items, []);
  for (const snapshot of raw.f8938.claim.valuation_snapshots) {
    snapshot.values[0].native_value = 1000;
  }
  const below = run(raw).disclosure;
  assertEquals(below.filing_required, false);
  assertEquals(below.remaining_filing_requirements, []);
});

Deno.test("2026 Form 8938 joint account counts once and binds both actual spouses", () => {
  const raw = foreignAssetReturnFixture2026();
  Object.assign(raw.general, {
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "987654321",
    spouse_first_name: "Joint",
    spouse_last_name: "Investor",
    spouse_dob: "1981-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
  });
  const accounts = raw.investment_income.foreign_account_review;
  accounts.accounts.push({
    ...accounts.accounts[0],
    record_reference: "joint-spouse-account",
    subject_tin: "987654321",
    income_review: {
      kind: "no_reportable_income",
      no_income_reportable_by_subject_from_this_account_verified: true,
      source_document: {
        document_reference: "spouse-income-allocation-review",
        document_sha256: "a".repeat(64),
      },
    },
  });
  accounts.fbar_reviews.push({
    ...accounts.fbar_reviews[0],
    subject_tin: "987654321",
  });
  raw.f8938.claim.assets[0].owner = "joint_with_spouse";
  raw.f8938.account_bindings[0].foreign_account_references.push(
    "joint-spouse-account",
  );
  const d = run(raw).disclosure;
  assertEquals(d.valuation.summary.partI.depositAccountCount, 1);
  assertEquals(d.tax_items.account[0].unrounded_amount_usd, 1550.51);
  assertEquals(d.valuation.threshold.anyTimeThreshold, 150000);
  const invalid = structuredClone(d.source_input);
  invalid.account_bindings![0].foreign_account_references.pop();
  assertThrows(
    () => calculateForeignAssetReturn2026(invalid),
    Error,
    "account ownership",
  );
});

Deno.test("2026 Form 8938 binds ordinary issued interest and gates unresolved adjustments", () => {
  const raw = foreignAssetReturnFixture2026();
  raw.investment_income.foreign_bank_interest = [];
  const source = raw.investment_income.f1099ints[0];
  source.source_document_sha256 = "c".repeat(64);
  const account = raw.investment_income.foreign_account_review.accounts[0];
  account.account_number = source.account_number;
  account.institution_name = source.payer_name;
  account.income_review = {
    kind: "issued_1099_copies",
    source_references: [source.source_document_reference],
    all_reportable_income_in_these_copies_verified: true,
    source_document: {
      document_reference: source.source_document_reference,
      document_sha256: "c".repeat(64),
    },
  };
  const asset = raw.f8938.claim.assets[0];
  asset.asset_identifier = source.account_number;
  asset.institution_or_issuer_name = source.payer_name;
  asset.tax_items = [{
    record_reference: "issued-interest-tax-item",
    return_source_reference: source.source_document_reference,
    kind: "interest",
    amount_usd: 1200.25,
    source_document: account.income_review.source_document,
  }];
  const d = run(raw).disclosure;
  assertEquals(d.tax_items.account[0].unrounded_amount_usd, 1200.25);
  const invalid = structuredClone(d.source_input);
  invalid.investment_sources_2026!.f1099ints[0].box2 = 1;
  assertThrows(
    () => calculateForeignAssetReturn2026(invalid),
    Error,
    "separate tax-item treatment",
  );
});

Deno.test("2026 Form 8938 public intake rejects completed-line and filing-location injection", () => {
  const raw = foreignAssetReturnFixture2026();
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...raw,
      f8938: {
        ...raw.f8938,
        settled_return: { line2b_taxable_interest: 1551 },
      },
    })
  );
  const claim = structuredClone(raw.f8938);
  Object.assign(claim.claim.assets[0].tax_items[0], {
    filed_form_and_line: "Form 1040 line 2b",
  });
  assertEquals(
    foreignAssetReturnClaim2026Schema.safeParse(claim).success,
    false,
  );
  assert(!sourceRegistry2026.f8938.outputNodeTypes.includes("f1040"));
});

Deno.test("2026 Form 8938 distinguishes same-bank accounts and rounds the combined Part III amount once", () => {
  const raw = foreignAssetReturnFixture2026();
  const second = structuredClone(
    raw.investment_income.foreign_bank_interest[0],
  );
  second.record_reference = "second-interest-ledger";
  second.foreign_account_reference = "second-account";
  second.account_number = "second-account-number";
  second.receipts.forEach((r, i) => r.record_reference = `second-receipt-${i}`);
  raw.investment_income.foreign_bank_interest.push(second);
  raw.investment_income.foreign_account_review.accounts.push({
    ...raw.investment_income.foreign_account_review.accounts[0],
    record_reference: second.foreign_account_reference,
    account_number: second.account_number,
    income_review: {
      kind: "foreign_bank_interest_statements",
      source_references: [second.record_reference],
      all_reportable_income_in_these_statements_verified: true,
      source_document: second.annual_review_document,
    },
  });
  const asset = structuredClone(raw.f8938.claim.assets[0]);
  asset.asset_id = "second-asset";
  asset.asset_identifier = second.account_number;
  asset.tax_items.forEach((item, i) => {
    item.record_reference = `second-tax-item-${i}`;
    item.return_source_reference = second.receipts[i].record_reference;
  });
  raw.f8938.claim.assets.push(asset);
  for (const snapshot of raw.f8938.claim.valuation_snapshots) {
    snapshot.values.push({
      ...snapshot.values[0],
      asset_reference: asset.asset_id,
    });
  }
  raw.f8938.account_bindings.push({
    asset_reference: asset.asset_id,
    foreign_account_references: [second.foreign_account_reference],
  });
  const { disclosure, result } = run(raw);
  assertEquals(disclosure.tax_items.account[0].unrounded_amount_usd, 3101.02);
  assertEquals(disclosure.tax_items.account[0].amount, 3101);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 4301);
  const invalid = structuredClone(disclosure.source_input);
  invalid.claim!.assets[0].tax_items[0].return_source_reference =
    second.receipts[0].record_reference;
  assertThrows(
    () => calculateForeignAssetReturn2026(invalid),
    Error,
    "actual return source",
  );
});

Deno.test("2026 Form 8938 reconciles the complete account inventory including distinct FBAR exclusions", () => {
  const original = run(foreignAssetReturnFixture2026()).disclosure.source_input;
  const account =
    original.investment_sources_2026!.foreign_account_review!.accounts[0];
  original.investment_sources_2026!.foreign_account_review!.accounts.push({
    ...account,
    record_reference: "extra-account",
    account_number: "extra-account-number",
    income_review: {
      kind: "no_reportable_income",
      no_income_reportable_by_subject_from_this_account_verified: true,
      source_document: {
        document_reference: "extra-account-income",
        document_sha256: "a".repeat(64),
      },
    },
  });
  assertThrows(
    () => calculateForeignAssetReturn2026(original),
    Error,
    "each reviewed foreign account",
  );
  const evidence = {
    foreign_account_reference: "extra-account",
    subject_tin: "123456789",
    reviewed_on: "2027-02-01",
    reviewer_reference: "reviewer",
    document_reference: "extra-account-US-payor-classification",
    document_sha256: "a".repeat(64),
  };
  original.excluded_account_reviews = [{
    ...evidence,
    reason: "us_payor_maintained_account",
    us_payor_status_under_1_6049_5_c_5_verified: true,
  }];
  assertEquals(
    calculateForeignAssetReturn2026(original)!.valuation.summary.partI
      .depositAccountCount,
    1,
  );
  original.excluded_account_reviews = [{
    ...evidence,
    reason: "signature_authority_without_asset_interest",
    no_section6038d_interest_in_account_or_its_income_verified: true,
  }];
  assertThrows(
    () => calculateForeignAssetReturn2026(original),
    Error,
    "Signature-only",
  );
  original.investment_sources_2026!.foreign_account_review!.accounts[1]
    .relationship = "signature_authority";
  assertEquals(
    calculateForeignAssetReturn2026(original)!.tax_items.account[0].amount,
    1551,
  );
  original.excluded_account_reviews.push(
    structuredClone(original.excluded_account_reviews[0]),
  );
  assertThrows(() => calculateForeignAssetReturn2026(original), Error, "once");
});
