import { assertEquals, assertThrows } from "@std/assert";
import { calculateLtcLedger, ltcLedgerSchema, LtcPeriodMethod } from "./ltc.ts";
import {
  ltcInsured,
  ltcSource,
} from "../../../../../../2025/domains/adjustments/health/form8853/form8853_ltc.fixture.ts";

Deno.test("LTC IRS multiple-payee example allocates the insured first and remaining exclusion proportionally", () => {
  const insured = ltcInsured();
  insured.period.start_date = "2025-07-01";
  insured.period.end_date = "2025-12-31";
  insured.expenses[0].qualified_cost = 27600;
  insured.reimbursements[0].amount = 13800;
  insured.sources = [
    ltcSource("insured", { ssn: "222334444", name: "Dana Elder" }, 12000),
    ltcSource("blair", { ssn: "123456789", name: "Alex Taxpayer" }, 33000),
    ltcSource("casey", { ssn: "333445555", name: "Casey Example" }, 18000),
  ];
  const result = calculateLtcLedger({ tax_year: 2025, insureds: [insured] });
  assertEquals(result.insureds[0].aggregate.line25, 63480);
  assertEquals(result.insureds[0].recipients.map((r) => r.line25), [
    12000,
    33311,
    18169,
  ]);
  assertEquals(result.taxable, 0);
});

Deno.test("LTC contract periods require common-period review and valid single-day dates", () => {
  const insured = ltcInsured();
  insured.period.method = LtcPeriodMethod.Contract;
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "common contract-period",
  );
});

Deno.test("LTC source contract and illness assertions cannot be silently omitted", () => {
  const insured = ltcInsured();
  for (
    const changed of [
      {
        ...insured.sources[0],
        only_per_diem_payments_reported_confirmed: false,
      },
      {
        ...insured.sources[0],
        all_ltc_payments_from_qualified_contracts_confirmed: false,
      },
      {
        ...insured.sources[0],
        no_business_relationship_exclusion_limit_confirmed: false,
      },
    ]
  ) {
    assertThrows(() =>
      ltcLedgerSchema.parse({
        tax_year: 2025,
        insureds: [{ ...insured, sources: [changed] }],
      })
    );
  }
  insured.sources.push({
    ...insured.sources[0],
    source_reference: "duplicate issued copy",
  });
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "repeats a policyholder's contract",
  );
});

Deno.test("LTC terminal benefits cannot precede certification or mix an unsplit redesignation", () => {
  const insured = ltcInsured();
  insured.sources = [ltcSource("life-contract", undefined, 0, 0, 5000)];
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "physician certification",
  );
  insured.terminal_illness = {
    certification_date: "2025-06-15",
    physician_source_reference: "source",
    death_expected_within_24_months_confirmed: true,
  };
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "physician certification",
  );
  insured.terminal_illness.certification_date = "2025-06-01";
  insured.sources = [ltcSource("life-contract", undefined, 0, 1000, 5000)];
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "separate chronic and terminal",
  );
});

Deno.test("LTC joint insured priority needs reviewed shares of the combined exclusion", () => {
  const insured = ltcInsured();
  insured.insured_joint_spouse = {
    ssn: "333445555",
    joint_return_review_reference: "joint source",
  };
  insured.sources = [
    ltcSource("insured", { ssn: "222334444", name: "Dana Elder" }, 15000),
    ltcSource("spouse", { ssn: "333445555", name: "Casey Elder" }, 10000),
    ltcSource("adult-child", undefined, 1000),
  ];
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "reviewed allocation",
  );
  insured.joint_priority_allocation = {
    review_reference: "agreed share",
    shares: [{ ssn: "222334444", limitation: 6000 }, {
      ssn: "333445555",
      limitation: 4600,
    }],
  };
  const result = calculateLtcLedger({ tax_year: 2025, insureds: [insured] });
  assertEquals(result.insureds[0].recipients.map((r) => r.line25), [
    6000,
    4600,
    0,
  ]);
  assertEquals(result.taxable, 1000);
  insured.joint_priority_allocation.shares[1].limitation++;
  assertThrows(
    () => calculateLtcLedger({ tax_year: 2025, insureds: [insured] }),
    Error,
    "reviewed allocation",
  );
});
