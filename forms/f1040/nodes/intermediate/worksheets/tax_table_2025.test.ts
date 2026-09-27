import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
  taxTable2025,
} from "./tax_table_2025.ts";

// Published TY2025 IRS Publication 1040 Tax Table rows, in column order
// Single / MFJ (and QSS) / MFS / HOH:
// https://www.irs.gov/publications/p1040
Deno.test("2025 Tax Table keeps the special first three ranges", () => {
  for (
    const [income, expected] of [
      [0, 0],
      [4, 0],
      [5, 1],
      [14, 1],
      [15, 2],
      [24, 2],
      [25, 4],
    ]
  ) {
    assertEquals(taxTable2025(income, FilingStatus.Single), expected);
  }
});

Deno.test("2025 Tax Table changes from $25 to $50 ranges at $3,000", () => {
  assertEquals(taxTable2025(2_999, FilingStatus.Single), 299);
  assertEquals(taxTable2025(3_000, FilingStatus.Single), 303);
  assertEquals(taxTable2025(3_049, FilingStatus.Single), 303);
  assertEquals(taxTable2025(3_050, FilingStatus.Single), 308);
});

Deno.test("2025 Tax Table matches published filing-status columns", () => {
  const statuses = [
    FilingStatus.Single,
    FilingStatus.MFJ,
    FilingStatus.MFS,
    FilingStatus.HOH,
    FilingStatus.QSS,
  ];
  const taxAt25_300 = [2_801, 2_562, 2_801, 2_699, 2_562];
  const taxAt99_999 = [16_909, 11_823, 16_909, 15_170, 11_823];
  statuses.forEach((status, index) => {
    assertEquals(taxTable2025(25_300, status), taxAt25_300[index]);
    assertEquals(taxTable2025(25_349, status), taxAt25_300[index]);
    assertEquals(taxTable2025(99_999, status), taxAt99_999[index]);
  });
});

Deno.test("2025 Tax Table rejects out-of-range amounts", () => {
  for (const income of [-1, 100_000, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertThrows(() => taxTable2025(income, FilingStatus.Single));
  }
  assertEquals(ordinaryTax2025(100_000, FilingStatus.Single), 16_914);
});

Deno.test("Form 8615 QDCGT uses Tax Table for both line 22 and line 24", () => {
  // $3,650 single taxable income: $1,000 QD leaves $2,650 ordinary.
  assertEquals(
    qualifiedDividendTax2025(3_650, 1_000, 0, FilingStatus.Single),
    266,
  );
  // Worksheet line 1 exceeds $100,000, but its $90,000 ordinary line 5
  // still uses the Tax Table. MFJ line 22 is $10,326, not bracket tax $10,323.
  assertEquals(
    qualifiedDividendTax2025(120_000, 30_000, 0, FilingStatus.MFJ),
    13_821,
  );
});
