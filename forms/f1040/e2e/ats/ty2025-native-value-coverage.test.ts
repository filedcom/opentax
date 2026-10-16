import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { compareAtsNativeValues } from "./ty2025-native-value-coverage.ts";

const targets = [{
  path: "f1040.line24_total_tax",
  expected: 0,
  basis: "printed-source",
  sourceLocation: "Form1040 line24",
}];
const packet = (contents: string) =>
  `<Return><ReturnData>${contents}</ReturnData></Return>`;
const check = (xml: string | null) =>
  compareAtsNativeValues(xml, targets).rows[0];

test("ATS native values distinguish a blocked packet, absent field and transmitted zero", () => {
  assertEquals(check(null).result, "not-evaluated");
  assertEquals(check(packet("<IRSW2/>")).result, "missing-document");
  assertEquals(check(packet("<IRS1040/>")).result, "missing-field");
  const zero = check(packet("<IRS1040><TotalTaxAmt>0</TotalTaxAmt></IRS1040>"));
  assertEquals([zero.result, zero.actual], ["match", 0]);
  const changed = check(
    packet("<IRS1040><TotalTaxAmt>1</TotalTaxAmt></IRS1040>"),
  );
  assertEquals([changed.result, changed.actual], ["different", 1]);
});

test("ATS native values reject malformed, duplicate and nested substitute fields", () => {
  assertEquals(check("<Return>").result, "invalid-xml");
  assertEquals(check(packet("<IRS1040/><IRS1040/>")).result, "ambiguous");
  assertEquals(
    check(
      packet(
        "<IRS1040><TotalTaxAmt>0</TotalTaxAmt><TotalTaxAmt>0</TotalTaxAmt></IRS1040>",
      ),
    ).result,
    "ambiguous",
  );
  assertEquals(
    check(
      packet("<IRS1040><Other><TotalTaxAmt>0</TotalTaxAmt></Other></IRS1040>"),
    ).result,
    "missing-field",
  );
  assertEquals(
    check(
      packet("<Other><IRS1040><TotalTaxAmt>0</TotalTaxAmt></IRS1040></Other>"),
    ).result,
    "missing-document",
  );
  assertEquals(
    check("<Return><ReturnData/><ReturnData/></Return>").result,
    "invalid-xml",
  );
});

test("ATS native numeric fields reject nonintegers and unsafe values", () => {
  for (
    const value of [
      "",
      "false",
      "0.0",
      "1e2",
      "9007199254740992",
      "<Nested>0</Nested>",
    ]
  ) {
    assertEquals(
      check(packet(`<IRS1040><TotalTaxAmt>${value}</TotalTaxAmt></IRS1040>`))
        .result,
      "invalid-value",
    );
  }
  assertEquals(
    check(packet("<IRS1040><TotalTaxAmt>-1</TotalTaxAmt></IRS1040>")).actual,
    -1,
  );
});

test("ATS native values report unsupported targets without conflating deduction lines", () => {
  const coverage = compareAtsNativeValues(
    packet(
      "<IRS1040><TotalItemizedOrStandardDedAmt>31500</TotalItemizedOrStandardDedAmt></IRS1040>",
    ),
    [
      {
        ...targets[0],
        path: "f1040.line12a_standard_deduction",
        expected: 31500,
      },
      { ...targets[0], path: "f1040.unreviewed", expected: false },
    ],
  );
  assertEquals(coverage.rows, []);
  assertEquals(coverage.unmappedTargetPaths, [
    "f1040.line12a_standard_deduction",
    "f1040.unreviewed",
  ]);
});

test("ATS explicit yes/no answers preserve false and reject invalid boolean encodings", () => {
  const target = {
    ...targets[0],
    path: "f1040.digital_assets",
    expected: false,
  };
  const observe = (contents: string) =>
    compareAtsNativeValues(packet(`<IRS1040>${contents}</IRS1040>`), [target])
      .rows[0];
  for (const value of ["false", "0"]) {
    const row = observe(
      `<VirtualCurAcquiredDurTYInd>${value}</VirtualCurAcquiredDurTYInd>`,
    );
    assertEquals([row.result, row.actual], ["match", false]);
  }
  for (const value of ["true", "1"]) {
    const row = observe(
      `<VirtualCurAcquiredDurTYInd>${value}</VirtualCurAcquiredDurTYInd>`,
    );
    assertEquals([row.result, row.actual], ["different", true]);
  }
  for (const value of ["", "X", "False", "2", "<Other>false</Other>"]) {
    assertEquals(
      observe(
        `<VirtualCurAcquiredDurTYInd>${value}</VirtualCurAcquiredDurTYInd>`,
      ).result,
      "invalid-value",
    );
  }
  assertEquals(observe("").result, "missing-field");
  assertEquals(
    observe(
      "<VirtualCurAcquiredDurTYInd>false</VirtualCurAcquiredDurTYInd><VirtualCurAcquiredDurTYInd>false</VirtualCurAcquiredDurTYInd>",
    ).result,
    "ambiguous",
  );
});

test("ATS checkbox checks keep primary blindness and pension rollover separate from spouse and IRA", () => {
  const cases = [
    ["f1040.taxpayer_blind", "PrimaryBlindInd", "SpouseBlindInd"],
    [
      "f1040.line5c_pension_rollover",
      "PensionsAnnuitiesRolloverInd",
      "IRADistributionRolloverInd",
    ],
  ];
  for (const [path, field, other] of cases) {
    const target = { ...targets[0], path, expected: true };
    const observe = (contents: string) =>
      compareAtsNativeValues(packet(`<IRS1040>${contents}</IRS1040>`), [target])
        .rows[0];
    assertEquals(observe(`<${field}>X</${field}>`).actual, true);
    assertEquals(observe(`<${other}>X</${other}>`).result, "missing-field");
    for (const value of ["", "true", "false", "1", "0", "x"]) {
      assertEquals(
        observe(`<${field}>${value}</${field}>`).result,
        "invalid-value",
      );
    }
    assertEquals(
      compareAtsNativeValues(null, [target]).rows[0].result,
      "not-evaluated",
    );
  }
});

test("ATS schedules observe signed direct amounts and reject duplicate schedule copies", () => {
  const target = {
    ...targets[0],
    path: "schedule1.line3_schedule_c",
    expected: -1200,
  };
  const observe = (body: string) =>
    compareAtsNativeValues(packet(body), [target]).rows[0];
  assertEquals(
    observe(
      '<IRS1040Schedule1><BusinessIncomeLossAmt referenceDocumentId="C1">-1200</BusinessIncomeLossAmt></IRS1040Schedule1>',
    ).result,
    "match",
  );
  assertEquals(
    observe(
      "<IRS1040><BusinessIncomeLossAmt>-1200</BusinessIncomeLossAmt></IRS1040>",
    ).result,
    "missing-document",
  );
  assertEquals(
    observe(
      "<IRS1040Schedule1><Other><BusinessIncomeLossAmt>-1200</BusinessIncomeLossAmt></Other></IRS1040Schedule1>",
    ).result,
    "missing-field",
  );
  assertEquals(
    observe("<IRS1040Schedule1/><IRS1040Schedule1/>").result,
    "ambiguous",
  );
});

test("ATS totals observe transmitted totals independently of component fields", () => {
  const selected = [
    ["line1z_total_wages", 100, "WagesSalariesAndTipsAmt"],
    ["line14_deductions_qbi_total", 30, "TotalDeductionsAmt"],
    ["line18_total_tax_before_credits", 20, "TotalTaxBeforeCrAndOthTaxesAmt"],
    ["line21_credits_total", 5, "TotalCreditsAmt"],
    ["line22_tax_after_credits", 0, "TaxLessCreditsAmt"],
    ["line25d_total_withholding", 9, "WithholdingTaxAmt"],
    ["line33_total_payments", 10, "TotalPaymentsAmt"],
  ] as const;
  const wanted = selected.map(([path, expected]) => ({
    ...targets[0],
    path: `f1040.${path}`,
    expected,
  }));
  const componentOnly = packet(
    "<IRS1040><WagesAmt>100</WagesAmt><TotalItemizedOrStandardDedAmt>30</TotalItemizedOrStandardDedAmt><TaxAmt>20</TaxAmt><TotalNonrefundableCreditsAmt>5</TotalNonrefundableCreditsAmt><TotalTaxAmt>0</TotalTaxAmt><FormW2WithheldTaxAmt>9</FormW2WithheldTaxAmt><RefundAmt>10</RefundAmt></IRS1040>",
  );
  assertEquals(
    compareAtsNativeValues(componentOnly, wanted).rows.map((r) => r.result),
    selected.map(() => "missing-field"),
  );
  const xml = (change: number) =>
    packet(
      `<IRS1040>${
        selected.map(([, value, field]) =>
          `<${field}>${value + change}</${field}>`
        ).join("")
      }</IRS1040>`,
    );
  assertEquals(
    compareAtsNativeValues(xml(0), wanted).rows.map(
      (r) => [r.result, r.actual],
    ),
    selected.map(([, value]) => ["match", value]),
  );
  assertEquals(
    compareAtsNativeValues(xml(1), wanted).rows.map((r) => r.result),
    selected.map(() => "different"),
  );
});
