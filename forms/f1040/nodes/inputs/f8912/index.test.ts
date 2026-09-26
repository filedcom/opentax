import { assertEquals, assertThrows } from "@std/assert";
import { BondType, f8912 } from "./index.ts";
import { calculateForm8912SourceLines } from "./calculation.ts";

const reported = {
  bond_type: BondType.CREB,
  issue_date: "2017-12-31",
  issuer_name: "Issuer",
  issuer_ein: "123456789",
  unique_identifier: "bond-1",
  credit_amount: 100,
  issuer_elected_direct_payment: false,
  is_pass_through_creb_credit: false,
};

const unreported = {
  bond_type: BondType.QECB,
  issue_date: "2017-12-31",
  issuer_name: "Issuer",
  issuer_city: "Austin",
  issuer_state: "TX",
  issuer_ein: "123456789",
  maturity_date: "2030-12-31",
  cusip: "123456789",
  principal_payment_dates: [],
  interest_payment_dates: [],
  outstanding_principal: 10_000,
  credit_rate: 0.05,
  credit_allowance_percentage: 0.5,
  issuer_elected_direct_payment: false,
};

function item(overrides: Record<string, unknown> = {}) {
  return {
    reported_bonds: [reported],
    unreported_bonds: [unreported],
    qualified_bond_carryforward: 0,
    ...overrides,
  };
}

Deno.test("Form 8912: Part III, Part IV 70% bond, and carryforward remain distinct", () => {
  const lines = calculateForm8912SourceLines(
    [{
      bondType: "CREB",
      creditAmount: 100,
      issuerElectedDirectPayment: false,
      isPassThroughCrebCredit: false,
    }],
    [{
      bondType: "QECB",
      creditBaseAmount: 10_000,
      creditRate: 0.05,
      creditAllowancePercentage: 0.5,
      issuerElectedDirectPayment: false,
    }],
    25,
  );
  assertEquals(lines.line1, 100);
  assertEquals(lines.line2, 175);
  assertEquals(lines.line3, 25);
  assertEquals(lines.line4, 300);
});

Deno.test("Form 8912: direct-payment election cannot be claimed by holder", () => {
  assertThrows(
    () =>
      calculateForm8912SourceLines(
        [{
          bondType: "CREB",
          creditAmount: 100,
          issuerElectedDirectPayment: true,
          isPassThroughCrebCredit: false,
        }],
        [],
        0,
      ),
    Error,
    "direct-payment",
  );
});

Deno.test("Form 8912: BAB uses interest payable, 35% rate, and full allowance", () => {
  const bab = {
    ...unreported,
    bond_type: BondType.BAB,
    outstanding_principal: undefined,
    interest_payable: 1_000,
    interest_payment_dates: ["2025-06-15"],
    credit_rate: 0.35,
    credit_allowance_percentage: 1,
  };
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({ unreported_bonds: [bab] })],
    }).success,
    true,
  );
  const lines = calculateForm8912SourceLines([], [{
    bondType: "BAB",
    creditBaseAmount: 1_000,
    creditRate: 0.35,
    creditAllowancePercentage: 1,
    issuerElectedDirectPayment: false,
  }], 0);
  assertEquals(lines.line2, 350);
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({ unreported_bonds: [{ ...bab, credit_rate: 0.25 }] })],
    }).success,
    false,
  );
  assertThrows(
    () =>
      calculateForm8912SourceLines([], [{
        bondType: "BAB",
        creditBaseAmount: 1_000,
        creditRate: 0.25,
        creditAllowancePercentage: 1,
        issuerElectedDirectPayment: false,
      }], 0),
    Error,
    "35%",
  );
});

Deno.test("Form 8912: Part IV source identity follows the bond type", () => {
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        unreported_bonds: [{
          ...unreported,
          bond_type: BondType.CREB,
        }],
      })],
    }).success,
    false,
  );
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        unreported_bonds: [{
          ...unreported,
          cusip: undefined,
          principal_payment_dates: [],
        }],
      })],
    }).success,
    false,
  );
});

Deno.test("Form 8912: post-2017 issues are ineligible", () => {
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [
        item({ reported_bonds: [{ ...reported, issue_date: "2018-01-01" }] }),
      ],
    }).success,
    false,
  );
});

Deno.test("Form 8912: issue date must exist and match the bond program", () => {
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        reported_bonds: [{ ...reported, issue_date: "2017-02-30" }],
      })],
    }).success,
    false,
  );
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        reported_bonds: [{
          ...reported,
          bond_type: BondType.BAB,
          issue_date: "2011-01-01",
        }],
      })],
    }).success,
    false,
  );
});

Deno.test("Form 8912: positive source credit does not bypass its Part II limit", () => {
  assertThrows(
    () =>
      f8912.compute({ taxYear: 2025, formType: "f1040" }, { f8912s: [item()] }),
    Error,
    "Part II tax limit",
  );
});

Deno.test("Form 8912: zero source credit contributes no Schedule 3 output", () => {
  const result = f8912.compute({ taxYear: 2025, formType: "f1040" }, {
    f8912s: [item({ reported_bonds: [], unreported_bonds: [] })],
  });
  assertEquals(result.outputs, []);
});
