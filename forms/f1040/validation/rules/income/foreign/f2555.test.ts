import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F2555_RULES } from "./f2555.ts";

const header =
  "<ReturnTs>2026-03-01T10:00:00-05:00</ReturnTs><TaxPeriodBeginDt>2025-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt>";
const passes = (ruleNumber: string, body: string, root = "") =>
  emittedRulePasses(F2555_RULES, ruleNumber, {
    header,
    documents: `<IRS2555 documentId="A"${root}>${body}</IRS2555>`,
  });
const bonaFide = (begin: string, end: string) =>
  `<BonaFideResidenceBeginDt>${begin}</BonaFideResidenceBeginDt><BonaFideResidenceEndDt>${end}</BonaFideResidenceEndDt>`;
const physical = (begin: string, end: string) =>
  `<PhysicalPresenceBeginDt>${begin}</PhysicalPresenceBeginDt><PhysicalPresenceEndDt>${end}</PhysicalPresenceEndDt>`;

test("F2555-004-01 and -006-01 bound the bona fide residence start", () => {
  assertEquals(passes("F2555-004-01", bonaFide("2024-06-01", "2025-12-31")), true);
  assertEquals(passes("F2555-004-01", bonaFide("2025-02-01", "2025-12-31")), false);
  assertEquals(passes("F2555-006-01", bonaFide("2024-01-01", "2025-10-31")), true);
  assertEquals(passes("F2555-006-01", bonaFide("2024-02-01", "2025-10-31")), false);
});

test("F2555-022 needs a residence starting before the year to reach it", () => {
  assertEquals(passes("F2555-022", bonaFide("2023-01-01", "2025-01-01")), true);
  assertEquals(passes("F2555-022", bonaFide("2023-01-01", "2024-12-31")), false);
});

test("F2555-016 and -017 end dates are not after the return's timestamp", () => {
  assertEquals(passes("F2555-016", bonaFide("2024-01-01", "2025-12-31")), true);
  assertEquals(passes("F2555-016", bonaFide("2024-01-01", "2026-03-02")), false);
  assertEquals(passes("F2555-017", physical("2025-01-01", "2026-03-01")), true);
  assertEquals(passes("F2555-017", physical("2025-01-01", "2026-04-01")), false);
});

test("F2555-019 needs more than 329 days unless a waiver is claimed", () => {
  assertEquals(passes("F2555-019", physical("2025-01-01", "2025-11-27")), true);
  assertEquals(passes("F2555-019", physical("2025-01-01", "2025-11-26")), false);
  assertEquals(
    passes("F2555-019", physical("2025-01-01", "2025-06-01"), ' claimFrgnEarnIncWaiverCd="CLAIMING WAIVER"'),
    true,
  );
});
