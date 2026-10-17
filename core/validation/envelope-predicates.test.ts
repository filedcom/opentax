import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import {
  EnvelopeFact,
  factBytes,
  factText,
  factTexts,
  isEtin,
  isoDay,
  isPersonNameControl,
  xmlTexts,
} from "./predicates.ts";

const ctx = (facts: Record<string, unknown>) =>
  createReturnContext({}, { primarySSN: "400001001", filingStatus: 1, ...facts }, new Map());

test("envelope facts are read only when a transmission context carries them", () => {
  const zip = new Uint8Array([0x50, 0x4b]);
  const withFacts = ctx({
    [EnvelopeFact.SubmissionZip]: zip,
    [EnvelopeFact.ProcessingDate]: "2026-02-01",
    [EnvelopeFact.TransmissionSubmissionIds]: ["a", "b"],
  });
  assertEquals(factBytes(withFacts, EnvelopeFact.SubmissionZip), zip);
  assertEquals(factText(withFacts, EnvelopeFact.ProcessingDate), "2026-02-01");
  assertEquals(factTexts(withFacts, EnvelopeFact.TransmissionSubmissionIds), ["a", "b"]);
  const returnOnly = ctx({});
  assertEquals(factBytes(returnOnly, EnvelopeFact.SubmissionZip), undefined);
  assertEquals(factText(returnOnly, EnvelopeFact.ProcessingDate), undefined);
  assertEquals(factTexts(returnOnly, EnvelopeFact.TransmissionSubmissionIds), []);
});

test("xmlTexts and isoDay read manifest elements and dates", () => {
  assertEquals(xmlTexts("<M><TaxYr>2025</TaxYr><TaxYr> 2026 </TaxYr></M>", "TaxYr"), ["2025", "2026"]);
  assertEquals(xmlTexts("<M></M>", "TaxYr"), []);
  assertEquals(isoDay("1970-01-02"), 1);
  assertEquals(isoDay("01/02/1970"), undefined);
});

test("name controls and ETINs follow their IRS formats", () => {
  assertEquals(isPersonNameControl("NG-L"), true);
  assertEquals(isPersonNameControl("O BR"), true);
  assertEquals(isPersonNameControl("-ABC"), false);
  assertEquals(isPersonNameControl("SMITH"), false);
  assertEquals(isEtin("12345"), true);
  assertEquals(isEtin("1234"), false);
});
