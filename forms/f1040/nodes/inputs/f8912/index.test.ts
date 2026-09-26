import { assertEquals, assertThrows } from "@std/assert";
import {
  BondType,
  f8912,
  interestFromItem,
  interestRowsFromItem,
  itemSchema,
  sourceLinesFromItem,
} from "./index.ts";
import { calculateForm8912SourceLines } from "./calculation.ts";

const reported = {
  bond_type: BondType.CREB,
  issue_date: "2009-12-31",
  issuer_name: "Issuer",
  issuer_ein: "123456789",
  unique_identifier: "bond-1",
  credit_amount: 100,
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
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
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
  line18_rows: [{
    cusip: "123456789",
    outstanding_principal: 10_000,
    credit_rate: 0.05,
    credit_allowance_percentage: 0.5,
  }],
  issuer_elected_direct_payment: false,
  is_pass_through_creb_credit: false,
};

function item(overrides: Record<string, unknown> = {}) {
  return {
    reported_bonds: [reported],
    unreported_bonds: [unreported],
    carryforwards: [],
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
      isPassThroughCrebCredit: false,
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
    issue_date: "2010-01-01",
    line18_rows: [{
      cusip: "123456789",
      interest_payable: 1_000,
      interest_payment_date: "2025-06-15",
      credit_rate: 0.35,
      credit_allowance_percentage: 1,
    }],
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
    isPassThroughCrebCredit: false,
  }], 0);
  assertEquals(lines.line2, 350);
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        unreported_bonds: [{
          ...bab,
          line18_rows: [{ ...bab.line18_rows[0], credit_rate: 0.25 }],
        }],
      })],
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
        isPassThroughCrebCredit: false,
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
          issue_date: "2009-12-31",
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
          line18_rows: [{
            ...unreported.line18_rows[0],
            cusip: undefined,
          }],
        }],
      })],
    }).success,
    false,
  );
});

Deno.test("Form 8912: multiple Part IV line 18 rows contribute to line 20", () => {
  const parsed = itemSchema.parse(item({
    reported_bonds: [],
    unreported_bonds: [{
      ...unreported,
      line18_rows: [
        unreported.line18_rows[0],
        { ...unreported.line18_rows[0], credit_allowance_percentage: 0.25 },
      ],
    }],
  }));
  assertEquals(sourceLinesFromItem(parsed).line2, 262.5);
});

Deno.test("Form 8912: only eligible bond credits carry forward", () => {
  const current = itemSchema.parse(item({
    carryforwards: [{
      bond_type: BondType.QECB,
      issue_date: "2017-12-31",
      bond_identifier: "bond-2",
      origin_tax_year: 2024,
      amount: 25,
    }],
  }));
  assertEquals(sourceLinesFromItem(current).line3, 25);
  assertEquals(
    itemSchema.safeParse(item({
      carryforwards: [{
        bond_type: BondType.CREB,
        issue_date: "2009-12-31",
        bond_identifier: "bond-1",
        origin_tax_year: 2024,
        amount: 25,
      }],
    })).success,
    false,
  );
});

Deno.test("Form 8912: carryforward does not duplicate current-year deemed interest", () => {
  const parsed = itemSchema.parse(item({
    reported_bonds: [{
      ...reported,
      purchase_accrued_interest: 20,
      sale_accrued_interest: 5,
      disposition_date: "2025-12-01",
    }],
    carryforwards: [{
      bond_type: BondType.QECB,
      issue_date: "2017-12-31",
      bond_identifier: "prior-bond",
      origin_tax_year: 2024,
      amount: 25,
    }],
  }));
  const interest = interestFromItem(parsed);
  assertEquals(sourceLinesFromItem(parsed).line4, 300);
  assertEquals(interest.creditInterest, 275);
  assertEquals(interest.taxableInterest, 260);
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{ ...reported, sale_accrued_interest: 5 }],
    })).success,
    false,
  );
});

Deno.test("Form 8912: taxable interest stays paired with its bond issuer", () => {
  const parsed = itemSchema.parse(item({
    unreported_bonds: [{ ...unreported, issuer_name: "Other bond issuer" }],
  }));
  const rows = interestRowsFromItem(parsed);
  assertEquals(rows.map((row) => row.payerName), [
    "Issuer",
    "Other bond issuer",
  ]);
  assertEquals(rows.map((row) => row.interest.taxableInterest), [100, 175]);
});

Deno.test("Form 8912: unreported pass-through CREB retains its separate limit flag", () => {
  const parsed = itemSchema.parse(item({
    reported_bonds: [],
    unreported_bonds: [{
      ...unreported,
      bond_type: BondType.CREB,
      issue_date: "2009-12-31",
      is_pass_through_creb_credit: true,
      line18_rows: [{
        ...unreported.line18_rows[0],
        principal_payment_date: "2025-06-15",
      }],
    }],
  }));
  assertEquals(sourceLinesFromItem(parsed).hasPassThroughCrebCredit, true);
  assertThrows(
    () =>
      f8912.compute({ taxYear: 2025, formType: "f1040" }, { f8912s: [parsed] }),
    Error,
    "pass-through CREB",
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

Deno.test("Form 8912: sale accrued interest cannot disappear on a zero-credit return", () => {
  assertThrows(
    () =>
      f8912.compute({ taxYear: 2025, formType: "f1040" }, {
        f8912s: [item({
          unreported_bonds: [],
          reported_bonds: [{
            ...reported,
            credit_amount: 0,
            disposition_date: "2025-10-01",
            sale_accrued_interest: 5,
          }],
        })],
      }),
    Error,
    "routed to taxable interest income",
  );
});
