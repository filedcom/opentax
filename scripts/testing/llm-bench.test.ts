import { expect, test } from "bun:test";
import spec from "../../benchmark/taxcalcbench/spec.json" with { type: "json" };
import {
  answerValue,
  benchmarkPrompt,
  parseMoney,
  scoreCase,
  textValue,
  xmlValue,
} from "./llm-bench.ts";

test("prompt matches upstream build_ty25_tax_return_prompt", () => {
  const { jurisdiction, remaining, pdfs, prompt } = spec.parity;
  expect(benchmarkPrompt(jurisdiction as "us", remaining, pdfs)).toBe(prompt);
});

test("money parsing follows upstream parse_money_amount", () => {
  expect(parseMoney("$1,234")).toBe(1234);
  expect(parseMoney("(50)")).toBe(-50);
  expect(parseMoney("")).toBe(0);
  expect(parseMoney("n/a")).toBe(0);
});

test("text answers need exactly one matching label", () => {
  const label = "Line 16: Tax";
  expect(textValue(`${label} | 10% bracket | 1,000`, label)).toBe(1000);
  expect(textValue(`${label} | a | 1\n${label} | b | 2`, label)).toBe(0);
  expect(textValue(`${label}: 1000`, label)).toBe(0);
});

test("json answers are read by label", () => {
  expect(
    answerValue(
      '```json\n{"lines": {"Line 16: Tax": 12}}\n```',
      "Line 16: Tax",
    ),
  ).toBe(12);
  expect(answerValue('{"lines": {"Line 16: Tax": null}}', "Line 16: Tax")).toBe(
    0,
  );
});

test("xpaths resolve elements and attributes, missing reads as 0", () => {
  const xml = `<R><D><F><A>12</A><B claimed="7"/></F></D></R>`;
  expect(xmlValue(xml, "/R/D/F/A")).toBe(12);
  expect(xmlValue(xml, "/R/D/F/B/@claimed")).toBe(7);
  expect(xmlValue(xml, "/R/D/F/C")).toBe(0);
});

test("strict is exact and lenient allows $5", () => {
  const fields = spec.jurisdictions.us.fields;
  const xml =
    `<Return><ReturnData><IRS1040><TaxAmt>100</TaxAmt></IRS1040></ReturnData></Return>`;
  const answer = JSON.stringify({ lines: { "Line 16: Tax": 104 } });
  const score = scoreCase(answer, xml, "us");
  expect(score.strict).toBe(false);
  expect(score.lenient).toBe(true);
  expect(score.byLine).toBeCloseTo((fields.length - 1) / fields.length);
});
