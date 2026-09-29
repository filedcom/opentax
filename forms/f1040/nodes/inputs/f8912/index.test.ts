import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../types.ts";
import {
  BondType,
  f8912,
  interestFromItem,
  interestRowsFromItem,
  itemSchema,
  partIVRowInput,
  sourceLinesFromItem,
} from "./index.ts";
import { calculateForm8912SourceLines } from "./calculation.ts";

const reported = {
  bond_type: BondType.CREB,
  issue_date: "2009-12-31",
  issuer_name: "Issuer",
  issuer_ein: "123456789",
  unique_identifier_code: "O" as const,
  unique_identifier: "bond1",
  monthly_credit_amounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
  credit_amount: 100,
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
  taxable_interest_reported_elsewhere: 0,
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
  acquisition_date: "2024-01-01",
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
  taxable_interest_reported_elsewhere: 0,
  line18_rows: [{
    cusip: "123456789",
    outstanding_principal: 10_000,
    credit_rate: 0.05,
    allowance_dates: ["2025-03-15", "2025-06-15"],
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
      allowance_dates: ["2025-06-15"],
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
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        unreported_bonds: [{
          ...bab,
          line18_rows: [{
            ...bab.line18_rows[0],
            principal_payment_date: "2025-06-15",
          }],
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
        { ...unreported.line18_rows[0], allowance_dates: ["2025-09-15"] },
      ],
    }],
  }));
  assertEquals(sourceLinesFromItem(parsed).line2, 262.5);
  assertEquals(
    partIVRowInput(
      parsed.unreported_bonds[0],
      parsed.unreported_bonds[0].line18_rows[1],
    ).creditAllowancePercentage,
    0.25,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [],
      unreported_bonds: [{
        ...unreported,
        line18_rows: [unreported.line18_rows[0], unreported.line18_rows[0]],
      }],
    })).success,
    false,
  );
});

Deno.test("Form 8912: Part IV disposition kind is required with its date", () => {
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [],
      unreported_bonds: [{
        ...unreported,
        disposition_date: "2025-07-23",
      }],
    })).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [],
      unreported_bonds: [{
        ...unreported,
        disposition_date: "2025-07-23",
        disposition_kind: "sale",
      }],
    })).success,
    true,
  );
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

Deno.test("Form 8912: annual Form 1097-BTC box 1 reconciles to monthly credits", () => {
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{
        ...reported,
        monthly_credit_amounts: [0, 0, 25, 0, 0, 25, 0, 0, 25, 0, 0, 25],
      }],
    })).success,
    true,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{
        ...reported,
        monthly_credit_amounts: Array(12).fill(0),
      }],
    })).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{ ...reported, monthly_credit_amounts: [100] }],
    })).success,
    false,
  );
});

Deno.test("Form 8912: Form 1097-BTC issuer and identifier cannot be claimed twice", () => {
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [reported, { ...reported }],
    })).success,
    false,
  );
  assertThrows(
    () =>
      f8912.compute({ taxYear: 2025, formType: "f1040" }, {
        f8912s: [
          item({ unreported_bonds: [] }),
          item({ unreported_bonds: [] }),
        ],
      }),
    Error,
    "multiple Form 8912 items",
  );
});

Deno.test("Form 8912: CUSIP credit reported on 1097-BTC cannot also enter Part IV", () => {
  const reportedCusip = {
    ...reported,
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    unique_identifier_code: "C" as const,
    unique_identifier: "123456789ACCOUNT1",
  };
  const duplicate = {
    f8912s: [
      item({ reported_bonds: [reportedCusip], unreported_bonds: [] }),
      item({ reported_bonds: [], unreported_bonds: [unreported] }),
    ],
  };
  assertEquals(f8912.inputSchema.safeParse(duplicate).success, false);
  assertThrows(
    () => f8912.compute({ taxYear: 2025, formType: "f1040" }, duplicate),
    Error,
    "already reported on Form 1097-BTC",
  );
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({ reported_bonds: [reportedCusip] })],
    }).success,
    false,
  );
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        reported_bonds: [reportedCusip],
        unreported_bonds: [{ ...unreported, issuer_ein: "987654321" }],
      })],
    }).success,
    true,
  );
  assertEquals(
    f8912.inputSchema.safeParse({
      f8912s: [item({
        reported_bonds: [{
          ...reportedCusip,
          unique_identifier_code: "A",
        }],
      })],
    }).success,
    true,
  );
});

Deno.test("Form 8912: Form 1097-BTC box 2b identifier has the IRS length and characters", () => {
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{ ...reported, unique_identifier: "BOND-1" }],
    })).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{ ...reported, unique_identifier: "A".repeat(40) }],
    })).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse(item({
      reported_bonds: [{
        ...reported,
        unique_identifier_code: "C",
        unique_identifier: "BOND1",
      }],
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
  const result = f8912.compute({ taxYear: 2025, formType: "f1040" }, {
    f8912s: [item()],
  });
  assertEquals(
    result.outputs.filter((output) => output.nodeType === "schedule_b"),
    [
      {
        nodeType: "schedule_b",
        fields: { payer_name: "Issuer", taxable_interest_net: 100 },
      },
      {
        nodeType: "schedule_b",
        fields: { payer_name: "Issuer", taxable_interest_net: 175 },
      },
    ],
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields,
    {
      form8912_source_lines: {
        line1: 100,
        line2: 175,
        line3: 0,
        line4: 275,
        hasPassThroughCrebCredit: false,
      },
    },
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "schedule3")?.fields,
    { form8912_source_credit_pending: true },
  );
  assertEquals(
    result.outputs.find((output) => output.nodeType === "form6251")?.fields,
    { must_compute_for_bond_credit: true },
  );
});

Deno.test("Form 8912: zero source credit contributes no Schedule 3 output", () => {
  const result = f8912.compute({ taxYear: 2025, formType: "f1040" }, {
    f8912s: [item({ reported_bonds: [], unreported_bonds: [] })],
  });
  assertEquals(result.outputs, []);
});

Deno.test("Form 8912: sale accrued interest reaches Schedule B on a zero-credit return", () => {
  const result = f8912.compute({ taxYear: 2025, formType: "f1040" }, {
    f8912s: [item({
      unreported_bonds: [],
      reported_bonds: [{
        ...reported,
        credit_amount: 0,
        monthly_credit_amounts: Array(12).fill(0),
        disposition_date: "2025-10-01",
        sale_accrued_interest: 5,
      }],
    })],
  });
  assertEquals(result.outputs, [{
    nodeType: "schedule_b",
    fields: { payer_name: "Issuer", taxable_interest_net: 5 },
  }]);
});

Deno.test("Form 8912: interest already reported by another source is not deposited twice", () => {
  const result = f8912.compute({ taxYear: 2025, formType: "f1040" }, {
    f8912s: [item({
      unreported_bonds: [],
      reported_bonds: [{
        ...reported,
        taxable_interest_reported_elsewhere: 40,
      }],
    })],
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "schedule_b")?.fields,
    {
      payer_name: "Issuer",
      taxable_interest_net: 60,
    },
  );
  assertThrows(
    () =>
      interestRowsFromItem(itemSchema.parse(item({
        unreported_bonds: [],
        reported_bonds: [{
          ...reported,
          taxable_interest_reported_elsewhere: 101,
        }],
      }))),
    Error,
    "exceeds this bond's taxable interest",
  );
});

Deno.test("Form 8912: graph carries taxable interest and defers credit without tax", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { filing_status: FilingStatus.Single },
    f8912: [item({
      unreported_bonds: [],
      reported_bonds: [{
        ...reported,
        taxable_interest_reported_elsewhere: 40,
      }],
    })],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.schedule_b?.taxable_interest_net, 60);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8912?.allowed_credit, 0);
  assertEquals(result.pending.f8912?.unused_credit, 100);
});

Deno.test("Form 8912: zero-credit sale interest reaches finalized Form 1040 line 2b", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { filing_status: FilingStatus.Single },
    f8912: [item({
      unreported_bonds: [],
      reported_bonds: [{
        ...reported,
        credit_amount: 0,
        monthly_credit_amounts: Array(12).fill(0),
        disposition_date: "2025-10-01",
        sale_accrued_interest: 5,
      }],
    })],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b?.taxable_interest_net, 5);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 5);
  assertEquals(result.pending.f1040?.line9_total_income, 5);
});
