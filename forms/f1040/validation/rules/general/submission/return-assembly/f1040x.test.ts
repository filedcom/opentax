import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F1040X_RULES } from "./f1040x.ts";

const dependent = (ssn: string) =>
  `<DependentDetail><DependentFirstNm>Ann</DependentFirstNm><DependentSSN>${ssn}</DependentSSN></DependentDetail>`;
const run = (id: string, f1040: string, f1040x: string) =>
  emittedRulePasses(F1040X_RULES, id, {
    documents: `<IRS1040 documentId="a">${f1040}</IRS1040><IRS1040X documentId="x">${f1040x}</IRS1040X>`,
    forms: { form1040x: 1 },
  });

test("F1040X-016-01 matches each 1040-X dependent to the amended return by position", () => {
  assertEquals(run("F1040X-016-01", dependent("400021111"), dependent("400021111")), true);
  assertEquals(run("F1040X-016-01", dependent("400021111"), dependent("400031111")), false);
  assertEquals(run("F1040X-016-01", "", dependent("400021111")), false);
});

test("F1040X-017-01 matches the filing status of the amended return", () => {
  const status = (n: number) => `<IndividualReturnFilingStatusCd>${n}</IndividualReturnFilingStatusCd>`;
  assertEquals(run("F1040X-017-01", status(2), status(2)), true);
  assertEquals(run("F1040X-017-01", status(2), status(3)), false);
});

test("F1040X-040 keeps direct deposit off the amended return", () => {
  assertEquals(run("F1040X-040", "", "<RoutingTransitNum>011000015</RoutingTransitNum>"), true);
  assertEquals(run("F1040X-040", "<RoutingTransitNum>011000015</RoutingTransitNum>", ""), false);
});
