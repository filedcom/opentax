import { assertEquals, assertThrows } from "@std/assert";
import {
  type HsaFundingSources2026,
  reconcileHsaFunding2026 as calculate,
} from "./hsa-funding-source.ts";
import { hsaFunding2026 } from "./hsa-funding.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
type Receipt =
  HsaFundingSources2026["claim"]["accounts"][number]["receipts"][number];
Deno.test("2026 HSA reconciles 5498 calendar receipts to designated years and each actual W-2", () => {
  const s = hsaFunding2026(), before = structuredClone(s), r = calculate(s);
  assertEquals(r.owners, [{
    owner_tin: "400001037",
    personal_contributions_for_2026: 1500,
    employer_contributions_for_2026: 1250,
    reported_ira_funding_for_2026: 0,
    employer_worksheet: {
      code_w: 1500,
      made_in_2026_for_2025: 500,
      made_in_2027_for_2026: 250,
    },
  }]);
  assertEquals(s, before);
});
Deno.test("2026 HSA rejects shifted statement years, boxes and mismatched owners", () => {
  const edits: Array<(s: HsaFundingSources2026) => void> = [
    (s) => {
      s.claim.accounts[0].form5498sa.box2_calendar_year_contributions++;
    },
    (s) => {
      s.claim.accounts[0].form5498sa
        .box3_following_year_contributions_for_2026++;
    },
    (s) => {
      s.claim.accounts[0].form5498sa.box4_calendar_year_rollovers++;
    },
    (s) => {
      s.claim.accounts[0].form5498sa.owner_tin = "400001038";
    },
    (s) => {
      s.claim.accounts[0].form5498sa.account_number = "different";
    },
    (s) => {
      s.claim.accounts[0].form5498sa.trustee_tin = "999999999";
    },
    (s) => {
      s.claim.accounts[0].owner_tin = "400001038";
    },
  ];
  for (const edit of edits) {
    const s = hsaFunding2026();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA checks ordinary deposit deadlines rather than tax-return extensions", () => {
  for (
    const [index, day] of [[0, "2026-04-16"], [3, "2027-04-16"], [
      2,
      "2025-12-31",
    ]] as const
  ) {
    const s = hsaFunding2026();
    s.claim.accounts[0].ledger_through = "2027-04-30";
    s.claim.accounts[0].receipts[index].received_on = day;
    assertThrows(() => calculate(s));
  }
  const s = hsaFunding2026();
  s.claim.accounts[0].receipts[0].received_on = "2026-04-15";
  assertEquals(calculate(s).owners[0].employer_contributions_for_2026, 1250);
});
Deno.test("2026 HSA includes third-party cash but not next-tax-year deposits in the personal amount", () => {
  const s = hsaFunding2026(), a = s.claim.accounts[0], p = a.receipts[2];
  if (p.kind !== "personal_cash") throw Error();
  p.contributor_tin = "500001037";
  a.receipts.push({
    ...p,
    record_reference: "2027-deposit",
    custodian_transaction_identifier: "tx-2027",
    received_on: "2027-04-15",
    contribution_tax_year: 2027,
    amount: 400,
  });
  assertEquals(calculate(s).owners[0].personal_contributions_for_2026, 1500);
});
Deno.test("2026 HSA keeps rollovers, IRA funding, trustee transfers and mistaken repayments distinct", () => {
  const s = hsaFunding2026(), a = s.claim.accounts[0];
  const common = {
    statement_reference: "ledger-extra",
    received_on: "2026-07-01",
    amount: 100,
    source_account_or_payment_reference: "transfer-source",
  };
  const extras: Receipt[] = [
    {
      ...common,
      kind: "reported_rollover",
      record_reference: "rollover",
      custodian_transaction_identifier: "tx-r",
      originating_account_type: "hsa",
      originating_owner_tin: a.owner_tin,
      distribution_received_on: "2026-06-01",
      originating_distribution_reference: "1099sa-distribution",
    },
    {
      ...common,
      kind: "ira_funding_transfer",
      record_reference: "ira",
      custodian_transaction_identifier: "tx-i",
      originating_ira_type: "traditional",
      originating_owner_tin: a.owner_tin,
      ira_distribution_source_reference: "1099r-distribution",
      direct_trustee_transfer_verified: true,
    },
    {
      ...common,
      kind: "trustee_transfer",
      record_reference: "trustee",
      custodian_transaction_identifier: "tx-t",
      originating_account_type: "archer_msa",
      originating_owner_tin: a.owner_tin,
      direct_trustee_transfer_verified: true,
    },
    {
      ...common,
      kind: "mistaken_distribution_repayment",
      record_reference: "mistake",
      custodian_transaction_identifier: "tx-m",
      original_distribution_reference: "corrected-distribution",
      custodian_accepted_mistaken_distribution_repayment_verified: true,
    },
  ];
  a.receipts.push(...extras);
  a.form5498sa.box2_calendar_year_contributions += 100;
  a.form5498sa.box4_calendar_year_rollovers = 100;
  const r = calculate(s);
  assertEquals(r.owners[0].personal_contributions_for_2026, 1500);
  assertEquals(r.owners[0].reported_ira_funding_for_2026, 100);
  assertEquals(r.accounts[0].records_requiring_tax_treatment_review, [
    "rollover",
    "ira",
    "trustee",
    "mistake",
  ]);
  assertEquals(r.accounts[0].trustee_transfers_2026_cents, 10000);
  assertEquals(r.accounts[0].mistaken_repayments_2026_cents, 10000);
  a.receipts[5] = {
    ...extras[0],
    originating_owner_tin: "400001038",
  } as Receipt;
  assertThrows(() => calculate(s), Error, "same account owner");
});
Deno.test("2026 HSA source cents are summed before annual amounts", () => {
  const s = hsaFunding2026(), a = s.claim.accounts[0];
  a.receipts[2].amount = 1000.49;
  a.receipts[4].amount = 500.49;
  a.form5498sa.box2_calendar_year_contributions += .49;
  a.form5498sa.box3_following_year_contributions_for_2026 += .49;
  assertEquals(calculate(s).owners[0].personal_contributions_for_2026, 1500.98);
  a.receipts[2].amount = 1000.491;
  assertThrows(() => calculate(s));
});
Deno.test("2026 HSA refuses missing, duplicated and owner-swapped payroll evidence", () => {
  for (
    const change of [
      "missing",
      "duplicate",
      "renamed_duplicate",
      "owner",
      "employer",
      "amount",
      "following",
    ] as const
  ) {
    const s = hsaFunding2026(), a = s.claim.accounts[0], p = a.receipts[1];
    if (p.kind !== "employer_cash") throw Error();
    if (change === "missing") delete p.current_w2_source_reference;
    if (change === "duplicate") {
      s.wage_sources.push(structuredClone(s.wage_sources[0]));
    }
    if (change === "renamed_duplicate") {
      s.wage_sources.push({
        ...s.wage_sources[0],
        source_document_reference: "renamed-copy",
      });
    }
    if (change === "owner") s.wage_sources[0].employee_ssn = "400001038";
    if (change === "employer") p.employer_ein = "999999999";
    if (change === "amount") s.wage_sources[0].box12_entries![0].amount++;
    if (change === "following") {
      const f = a.receipts[3];
      if (f.kind !== "employer_cash") throw Error();
      f.current_w2_source_reference = "w2-issued";
    }
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA prevents duplicated receipts even with renamed source records", () => {
  const s = hsaFunding2026(), a = s.claim.accounts[0];
  a.receipts.push({ ...a.receipts[2], record_reference: "renamed" });
  a.form5498sa.box2_calendar_year_contributions += 1000;
  assertThrows(() => calculate(s), Error, "custodian transaction");
});
Deno.test("2026 HSA joins multiple accounts and spouses without moving payroll between owners", () => {
  const s = hsaFunding2026();
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = "400001038";
  const a = structuredClone(s.claim.accounts[0]);
  a.record_reference = "spouse-account";
  a.account_number = "spouse-account";
  a.owner_tin = s.spouse_ssn;
  Object.assign(a.form5498sa, {
    source_document_reference: "spouse-5498sa",
    owner_tin: s.spouse_ssn,
    account_number: a.account_number,
    box2_calendar_year_contributions: 1000,
    box3_following_year_contributions_for_2026: 0,
  });
  const p = a.receipts[2];
  if (p.kind !== "personal_cash") throw Error();
  a.receipts = [{
    ...p,
    record_reference: "spouse-cash",
    contributor_tin: s.spouse_ssn,
  }];
  s.claim.accounts.push(a);
  assertEquals(
    calculate(s).owners.map(
      (o) => [
        o.owner_tin,
        o.personal_contributions_for_2026,
        o.employer_contributions_for_2026,
      ],
    ),
    [["400001037", 1500, 1250], ["400001038", 1000, 0]],
  );
  s.filing_status = FilingStatus.MFS;
  assertThrows(() => calculate(s), Error, "actual return owner");
});
Deno.test("2026 HSA requires complete dated evidence and refuses unreconciled employer recoveries", () => {
  for (
    const edit of [
      (s: HsaFundingSources2026) => {
        s.claim.reviewed_on = "2027-01-01";
      },
      (s: HsaFundingSources2026) => {
        s.claim.accounts[0].ledger_through = "2027-04-14";
      },
      (s: HsaFundingSources2026) => {
        s.claim.accounts[0].form5498sa.issued_on = "2027-06-01";
      },
      (s: HsaFundingSources2026) => {
        s.claim.accounts[0].opened_on = "2026-07-01";
      },
    ]
  ) {
    const s = hsaFunding2026();
    edit(s);
    assertThrows(() => calculate(s));
  }
  const s = hsaFunding2026();
  assertThrows(() =>
    calculate(
      {
        ...s,
        claim: {
          ...s.claim,
          accounts: [{
            ...s.claim.accounts[0],
            no_employer_error_recoveries_or_unreconciled_corrections_verified:
              false,
          }],
        },
      } as never,
    )
  );
});

Deno.test("2026 HSA combines distinct accounts for one owner and rejects duplicate account copies", () => {
  const s = hsaFunding2026(), first = s.claim.accounts[0];
  const second = structuredClone(first);
  first.receipts[2].amount = 500;
  first.form5498sa.box2_calendar_year_contributions -= 500;
  second.record_reference = "second-account";
  second.account_number = "second-account";
  Object.assign(second.form5498sa, {
    account_number: second.account_number,
    source_document_reference: "second-5498sa",
    box2_calendar_year_contributions: 500,
    box3_following_year_contributions_for_2026: 0,
  });
  second.receipts = [{
    ...second.receipts[2],
    record_reference: "second-personal",
    amount: 500,
  }];
  s.claim.accounts.push(second);
  assertEquals(calculate(s).owners.length, 1);
  assertEquals(calculate(s).owners[0].personal_contributions_for_2026, 1500);
  second.account_number = first.account_number;
  assertThrows(() => calculate(s), Error, "repeats a trustee account");
});

Deno.test("2026 HSA employer worksheet keeps source cents through both year adjustments", () => {
  const s = hsaFunding2026(), a = s.claim.accounts[0];
  a.receipts[0].amount = 500.25;
  a.receipts[1].amount = 1000.24;
  a.receipts[3].amount = 250.49;
  s.wage_sources[0].box12_entries![0].amount = 1500.49;
  a.form5498sa.box2_calendar_year_contributions = 2500.49;
  a.form5498sa.box3_following_year_contributions_for_2026 = 750.49;
  assertEquals(calculate(s).owners[0].employer_contributions_for_2026, 1250.73);
});
