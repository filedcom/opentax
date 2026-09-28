import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8949 } from "./f8949.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty transactions returns ""
// ---------------------------------------------------------------------------

Deno.test("empty transactions array returns empty string", () => {
  assertEquals(form8949.build([]), "");
});

Deno.test("native Form 8949 rejects a gain that does not include column (g)", () => {
  assertThrows(() => form8949.build([{
    part: "A",
    description: "Market discount bond",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-20",
    proceeds: 5_000,
    cost_basis: 3_000,
    adjustment_codes: "D",
    adjustment_amount: -500,
    gain_loss: 2_000,
    is_long_term: false,
  }]), Error, "does not reconcile to proceeds, basis, and column (g)");
});

Deno.test("direct Form 8949 XML rejects section 1202 markers instead of bypassing AMT", () => {
  const ordinary = {
    part: "D",
    description: "QSB stock",
    date_acquired: "2008-01-01",
    date_sold: "2025-06-20",
    proceeds: 10_000,
    cost_basis: 2_000,
    gain_loss: 8_000,
    is_long_term: true,
  };
  for (const marked of [
    { ...ordinary, adjustment_codes: "Q", adjustment_amount: -4_000 },
    { ...ordinary, qsbs_code: "Q1" },
    { ...ordinary, qsbs_amount: 4_000 },
  ]) {
    assertThrows(
      () => form8949.build([marked]),
      Error,
      "Form 6251 line 2h preference",
    );
    assertThrows(
      () => form8949.build([ordinary, marked]),
      Error,
      "Form 6251 line 2h preference",
    );
  }
  assertStringIncludes(
    form8949.build([{
      ...ordinary,
      adjustment_codes: "W",
      adjustment_amount: 0,
    }]),
    "<AdjustmentsToGainOrLossCd>W</AdjustmentsToGainOrLossCd>",
  );
});

// ---------------------------------------------------------------------------
// Section 2: Single Box A short-term transaction — full XML structure
// ---------------------------------------------------------------------------

Deno.test("single Box A transaction: wrapped in ShortTermCapitalGainAndLossGrp", () => {
  const result = form8949.build([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "</ShortTermCapitalGainAndLossGrp>");
});

Deno.test("single Box A transaction: emits TransRptOn1099BThatShowBssInd checkbox", () => {
  const result = form8949.build([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>",
  );
});

Deno.test("single Box A transaction: emits CapitalGainAndLossAssetGrp with all fields", () => {
  const result = form8949.build([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<CapitalGainAndLossAssetGrp>");
  assertStringIncludes(result, "<PropertyDesc>100 sh XYZ Corp</PropertyDesc>");
  assertStringIncludes(result, "<AcquiredDt>2025-01-15</AcquiredDt>");
  assertStringIncludes(
    result,
    "<SoldOrDisposedDt>2025-06-20</SoldOrDisposedDt>",
  );
  assertStringIncludes(
    result,
    "<ProceedsSalesPriceAmt>5000</ProceedsSalesPriceAmt>",
  );
  assertStringIncludes(
    result,
    "<CostOrOtherBasisAmt>3000</CostOrOtherBasisAmt>",
  );
  assertStringIncludes(result, "<GainOrLossAmt>2000</GainOrLossAmt>");
});

Deno.test("single Box A transaction: emits totals", () => {
  const result = form8949.build([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<TotalProceedsSalesPriceAmt>5000</TotalProceedsSalesPriceAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalCostOrOtherBasisAmt>3000</TotalCostOrOtherBasisAmt>",
  );
  assertStringIncludes(result, "<TotalGainOrLossAmt>2000</TotalGainOrLossAmt>");
});

Deno.test("single Box A transaction: result wrapped in IRS8949", () => {
  const result = form8949.build([{
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "2025-01-15",
    date_sold: "2025-06-20",
    proceeds: 5000,
    cost_basis: 3000,
    gain_loss: 2000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<IRS8949>");
  assertStringIncludes(result, "</IRS8949>");
});

// ---------------------------------------------------------------------------
// Section 3: Single Box D long-term transaction
// ---------------------------------------------------------------------------

Deno.test("single Box D transaction: wrapped in LongTermCapitalGainAndLossGrp", () => {
  const result = form8949.build([{
    part: "D",
    description: "200 sh ABC Fund",
    date_acquired: "2024-03-01",
    date_sold: "2025-09-15",
    proceeds: 8000,
    cost_basis: 6000,
    gain_loss: 2000,
    is_long_term: true,
  }]);
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "</LongTermCapitalGainAndLossGrp>");
  assertNotIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

Deno.test("single Box D transaction: emits TransRptOn1099BThatShowBssInd checkbox", () => {
  const result = form8949.build([{
    part: "D",
    description: "200 sh ABC Fund",
    date_acquired: "2024-03-01",
    date_sold: "2025-09-15",
    proceeds: 8000,
    cost_basis: 6000,
    gain_loss: 2000,
    is_long_term: true,
  }]);
  assertStringIncludes(
    result,
    "<TransRptOn1099BThatShowBssInd>X</TransRptOn1099BThatShowBssInd>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Box B (basis not reported) — correct checkbox indicator
// ---------------------------------------------------------------------------

Deno.test("Box B transaction: emits TransRptOn1099BNotShowBasisInd checkbox", () => {
  const result = form8949.build([{
    part: "B",
    description: "50 sh DEF Corp",
    date_acquired: "2025-02-10",
    date_sold: "2025-08-05",
    proceeds: 2500,
    cost_basis: 1500,
    gain_loss: 1000,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<TransRptOn1099BNotShowBasisInd>X</TransRptOn1099BNotShowBasisInd>",
  );
  assertNotIncludes(result, "<TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<TransactionsNotRptedOn1099BInd>");
});

Deno.test("Box B transaction: wrapped in ShortTermCapitalGainAndLossGrp", () => {
  const result = form8949.build([{
    part: "B",
    description: "50 sh DEF Corp",
    date_acquired: "2025-02-10",
    date_sold: "2025-08-05",
    proceeds: 2500,
    cost_basis: 1500,
    gain_loss: 1000,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 5: Box C (no 1099-B) — correct checkbox indicator
// ---------------------------------------------------------------------------

Deno.test("Box C transaction: emits NonDATransNotRptOn1099BOrDAInd checkbox", () => {
  const result = form8949.build([{
    part: "C",
    description: "Coin XYZ",
    date_acquired: "2025-03-01",
    date_sold: "2025-10-01",
    proceeds: 1200,
    cost_basis: 800,
    gain_loss: 400,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<NonDATransNotRptOn1099BOrDAInd>X</NonDATransNotRptOn1099BOrDAInd>",
  );
  assertNotIncludes(result, "<TransRptOn1099BThatShowBssInd>");
  assertNotIncludes(result, "<TransRptOn1099BNotShowBasisInd>");
});

// ---------------------------------------------------------------------------
// Section 6: Transaction with adjustments — codes and amounts emitted
// ---------------------------------------------------------------------------

Deno.test("transaction with adjustment_codes emits AdjustmentsToGainOrLossCd", () => {
  const result = form8949.build([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<AdjustmentsToGainOrLossCd>W</AdjustmentsToGainOrLossCd>",
  );
});

Deno.test("transaction with adjustment_amount emits AdjustmentsToGainOrLossAmt", () => {
  const result = form8949.build([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<AdjustmentsToGainOrLossAmt>100</AdjustmentsToGainOrLossAmt>",
  );
});

Deno.test("transaction with adjustments: TotAdjustmentsToGainOrLossAmt emitted in totals", () => {
  const result = form8949.build([{
    part: "A",
    description: "Wash sale stock",
    date_acquired: "2025-04-01",
    date_sold: "2025-05-01",
    proceeds: 900,
    cost_basis: 1200,
    adjustment_codes: "W",
    adjustment_amount: 100,
    gain_loss: -200,
    is_long_term: false,
  }]);
  assertStringIncludes(
    result,
    "<TotAdjustmentsToGainOrLossAmt>100</TotAdjustmentsToGainOrLossAmt>",
  );
});

Deno.test("transaction without adjustments: no AdjustmentsToGainOrLossCd emitted", () => {
  const result = form8949.build([{
    part: "A",
    description: "Simple stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-06-01",
    proceeds: 1000,
    cost_basis: 700,
    gain_loss: 300,
    is_long_term: false,
  }]);
  assertNotIncludes(result, "<AdjustmentsToGainOrLossCd>");
  assertNotIncludes(result, "<AdjustmentsToGainOrLossAmt>");
  assertNotIncludes(result, "<TotAdjustmentsToGainOrLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: Two transactions in same category — totals summed
// ---------------------------------------------------------------------------

Deno.test("two Box A transactions: both appear in same ShortTermCapitalGainAndLossGrp", () => {
  const result = form8949.build([
    {
      part: "A",
      description: "Stock 1",
      date_acquired: "2025-01-01",
      date_sold: "2025-03-01",
      proceeds: 3000,
      cost_basis: 2000,
      gain_loss: 1000,
      is_long_term: false,
    },
    {
      part: "A",
      description: "Stock 2",
      date_acquired: "2025-02-01",
      date_sold: "2025-04-01",
      proceeds: 4000,
      cost_basis: 2500,
      gain_loss: 1500,
      is_long_term: false,
    },
  ]);
  // Only one group tag
  const openCount =
    (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(openCount, 1);
  // Both descriptions appear
  assertStringIncludes(result, "<PropertyDesc>Stock 1</PropertyDesc>");
  assertStringIncludes(result, "<PropertyDesc>Stock 2</PropertyDesc>");
});

Deno.test("two Box A transactions: totals are summed", () => {
  const result = form8949.build([
    {
      part: "A",
      description: "Stock 1",
      date_acquired: "2025-01-01",
      date_sold: "2025-03-01",
      proceeds: 3000,
      cost_basis: 2000,
      gain_loss: 1000,
      is_long_term: false,
    },
    {
      part: "A",
      description: "Stock 2",
      date_acquired: "2025-02-01",
      date_sold: "2025-04-01",
      proceeds: 4000,
      cost_basis: 2500,
      gain_loss: 1500,
      is_long_term: false,
    },
  ]);
  assertStringIncludes(
    result,
    "<TotalProceedsSalesPriceAmt>7000</TotalProceedsSalesPriceAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalCostOrOtherBasisAmt>4500</TotalCostOrOtherBasisAmt>",
  );
  assertStringIncludes(result, "<TotalGainOrLossAmt>2500</TotalGainOrLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 8: Mixed short-term and long-term — both groups present
// ---------------------------------------------------------------------------

Deno.test("one Box A and one Box D: both ShortTerm and LongTerm groups emitted", () => {
  const result = form8949.build([
    {
      part: "A",
      description: "ST stock",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 2000,
      cost_basis: 1500,
      gain_loss: 500,
      is_long_term: false,
    },
    {
      part: "D",
      description: "LT stock",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: true,
    },
  ]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 9: Digital-asset boxes retain their separate groups
// ---------------------------------------------------------------------------

Deno.test("Part G transaction: uses the 1099-DA basis-reported checkbox", () => {
  const result = form8949.build([{
    part: "G",
    description: "Digital asset G",
    date_acquired: "2025-05-01",
    date_sold: "2025-07-01",
    proceeds: 3500,
    cost_basis: 2000,
    gain_loss: 1500,
    is_long_term: false,
  }]);
  assertStringIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
  assertStringIncludes(
    result,
    "<TransRptOn1099DAThatShowBssInd>X</TransRptOn1099DAThatShowBssInd>",
  );
  assertNotIncludes(result, "<LongTermCapitalGainAndLossGrp>");
});

Deno.test("Part G and Part A transactions stay in separate short-term groups", () => {
  const result = form8949.build([
    {
      part: "A",
      description: "Regular A",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000,
      cost_basis: 800,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "G",
      description: "Digital G",
      date_acquired: "2025-02-01",
      date_sold: "2025-07-01",
      proceeds: 2000,
      cost_basis: 1500,
      gain_loss: 500,
      is_long_term: false,
    },
  ]);
  // Each printed checkbox needs a separate MeF group.
  const openCount =
    (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(openCount, 2);
  assertStringIncludes(result, "<PropertyDesc>Regular A</PropertyDesc>");
  assertStringIncludes(result, "<PropertyDesc>Digital G</PropertyDesc>");
});

Deno.test("Part J transaction: uses the long-term 1099-DA basis-reported checkbox", () => {
  const result = form8949.build([{
    part: "J",
    description: "Digital asset J",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 4000,
    cost_basis: 2500,
    gain_loss: 1500,
    is_long_term: true,
  }]);
  assertStringIncludes(result, "<LongTermCapitalGainAndLossGrp>");
  assertStringIncludes(
    result,
    "<TransRptOn1099DAThatShowBssInd>X</TransRptOn1099DAThatShowBssInd>",
  );
  assertNotIncludes(result, "<ShortTermCapitalGainAndLossGrp>");
});

// ---------------------------------------------------------------------------
// Section 10: All 6 categories — 6 groups emitted
// ---------------------------------------------------------------------------

Deno.test("all 6 categories produce 6 groups (3 short, 3 long)", () => {
  const transactions = [
    {
      part: "A",
      description: "ST-reported",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000,
      cost_basis: 800,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "B",
      description: "ST-not-reported",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1100,
      cost_basis: 900,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "C",
      description: "ST-no-1099b",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1200,
      cost_basis: 1000,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "D",
      description: "LT-reported",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2000,
      cost_basis: 1600,
      gain_loss: 400,
      is_long_term: true,
    },
    {
      part: "E",
      description: "LT-not-reported",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2100,
      cost_basis: 1700,
      gain_loss: 400,
      is_long_term: true,
    },
    {
      part: "F",
      description: "LT-no-1099b",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2200,
      cost_basis: 1800,
      gain_loss: 400,
      is_long_term: true,
    },
  ];
  const result = form8949.build(transactions);
  const stGroups =
    (result.match(/<ShortTermCapitalGainAndLossGrp>/g) || []).length;
  const ltGroups =
    (result.match(/<LongTermCapitalGainAndLossGrp>/g) || []).length;
  assertEquals(stGroups, 3);
  assertEquals(ltGroups, 3);
});

Deno.test("all 6 categories: each category has its correct checkbox indicator", () => {
  const transactions = [
    {
      part: "A",
      description: "ST-reported",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000,
      cost_basis: 800,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "B",
      description: "ST-not-reported",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1100,
      cost_basis: 900,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "C",
      description: "ST-no-1099b",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1200,
      cost_basis: 1000,
      gain_loss: 200,
      is_long_term: false,
    },
    {
      part: "D",
      description: "LT-reported",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2000,
      cost_basis: 1600,
      gain_loss: 400,
      is_long_term: true,
    },
    {
      part: "E",
      description: "LT-not-reported",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2100,
      cost_basis: 1700,
      gain_loss: 400,
      is_long_term: true,
    },
    {
      part: "F",
      description: "LT-no-1099b",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2200,
      cost_basis: 1800,
      gain_loss: 400,
      is_long_term: true,
    },
  ];
  const result = form8949.build(transactions);
  // 2 reported groups (A short + D long) = 2 TransRptOn1099BThatShowBssInd
  const reported =
    (result.match(/<TransRptOn1099BThatShowBssInd>/g) || []).length;
  assertEquals(reported, 2);
  // 2 not-reported groups (B short + E long)
  const notReported =
    (result.match(/<TransRptOn1099BNotShowBasisInd>/g) || []).length;
  assertEquals(notReported, 2);
  // 2 no-1099b groups (C short + F long)
  const no1099b =
    (result.match(/<NonDATransNotRptOn1099BOrDAInd>/g) || []).length;
  assertEquals(no1099b, 2);
});

Deno.test("short-term groups emitted before long-term groups in XSD order", () => {
  const transactions = [
    {
      part: "D",
      description: "LT first",
      date_acquired: "2024-01-01",
      date_sold: "2025-06-01",
      proceeds: 2000,
      cost_basis: 1600,
      gain_loss: 400,
      is_long_term: true,
    },
    {
      part: "A",
      description: "ST second",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 1000,
      cost_basis: 800,
      gain_loss: 200,
      is_long_term: false,
    },
  ];
  const result = form8949.build(transactions);
  const stIdx = result.indexOf("<ShortTermCapitalGainAndLossGrp>");
  const ltIdx = result.indexOf("<LongTermCapitalGainAndLossGrp>");
  assertEquals(stIdx < ltIdx, true);
});

Deno.test("all twelve TY2025 Form 8949 boxes retain their own MeF checkbox", () => {
  const boxes = [
    ["A", "TransRptOn1099BThatShowBssInd"],
    ["B", "TransRptOn1099BNotShowBasisInd"],
    ["C", "NonDATransNotRptOn1099BOrDAInd"],
    ["G", "TransRptOn1099DAThatShowBssInd"],
    ["H", "TransRptOn1099DANotShowBssInd"],
    ["I", "DATransNotRptOn1099DAOrBInd"],
    ["D", "TransRptOn1099BThatShowBssInd"],
    ["E", "TransRptOn1099BNotShowBasisInd"],
    ["F", "NonDATransNotRptOn1099BOrDAInd"],
    ["J", "TransRptOn1099DAThatShowBssInd"],
    ["K", "TransRptOn1099DANotShowBssInd"],
    ["L", "DATransNotRptOn1099DAOrBInd"],
  ] as const;
  const transactions = boxes.map(([part], index) => ({
    part,
    description: `Asset ${part}`,
    date_acquired: index < 6 ? "2025-01-01" : "2023-01-01",
    date_sold: "2025-06-01",
    proceeds: 1000 + index,
    cost_basis: 500,
    gain_loss: 500 + index,
    is_long_term: index >= 6,
  }));
  const xml = form8949.build(transactions);
  assertEquals(
    (xml.match(/<ShortTermCapitalGainAndLossGrp>/g) ?? []).length,
    6,
  );
  assertEquals((xml.match(/<LongTermCapitalGainAndLossGrp>/g) ?? []).length, 6);
  const groups = [...xml.matchAll(
    /<(ShortTermCapitalGainAndLossGrp|LongTermCapitalGainAndLossGrp)>([\s\S]*?)<\/\1>/g,
  )];
  assertEquals(groups.length, 12);
  for (const [index, [part, checkbox]] of boxes.entries()) {
    assertEquals(
      groups[index][1],
      index < 6
        ? "ShortTermCapitalGainAndLossGrp"
        : "LongTermCapitalGainAndLossGrp",
    );
    assertStringIncludes(groups[index][2], `<${checkbox}>X</${checkbox}>`);
    assertStringIncludes(
      groups[index][2],
      `<PropertyDesc>Asset ${part}</PropertyDesc>`,
    );
  }
  assertNotIncludes(xml, "TransactionsNotRptedOn1099BInd");
});

Deno.test("Form 8949 MeF rejects unknown boxes and inconsistent term flags", () => {
  const transaction = {
    part: "C",
    description: "Stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-06-01",
    proceeds: 1000,
    cost_basis: 500,
    gain_loss: 500,
    is_long_term: false,
  };
  assertThrows(
    () => form8949.build([{ ...transaction, part: "Z" }]),
    Error,
    "unsupported box Z",
  );
  assertThrows(
    () => form8949.build([{ ...transaction, is_long_term: true }]),
    Error,
    "conflicts with its holding-period flag",
  );
});
