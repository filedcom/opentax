import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import {
  ATS_W2_TARGETS,
  compareAtsW2Values,
} from "./ty2025-w2-value-coverage.ts";

const green =
  `<IRSW2><EmployeeSSN>400001032</EmployeeSSN><EmployerEIN>000000007</EmployerEIN>
<EmployerName><BusinessNameLine1Txt>The Green Ladies</BusinessNameLine1Txt></EmployerName>
<WagesAmt>22970</WagesAmt><WithholdingAmt>1073</WithholdingAmt>
<SocialSecurityWagesAmt>22970</SocialSecurityWagesAmt><SocialSecurityTaxAmt>1424</SocialSecurityTaxAmt>
<MedicareWagesAndTipsAmt>22970</MedicareWagesAndTipsAmt><MedicareTaxWithheldAmt>333</MedicareTaxWithheldAmt></IRSW2>`;
const cr =
  `<IRSW2><EmployeeSSN>400001032</EmployeeSSN><EmployerEIN>000000007</EmployerEIN>
<EmployerName><BusinessNameLine1Txt>C&amp;R</BusinessNameLine1Txt></EmployerName>
<WagesAmt>19500</WagesAmt><WithholdingAmt>1640</WithholdingAmt>
<SocialSecurityWagesAmt>19500</SocialSecurityWagesAmt><SocialSecurityTaxAmt>1209</SocialSecurityTaxAmt>
<MedicareWagesAndTipsAmt>19500</MedicareWagesAndTipsAmt><MedicareTaxWithheldAmt>283</MedicareTaxWithheldAmt></IRSW2>`;
const wrap = (content: string) =>
  `<Return xmlns="http://www.irs.gov/efile"><ReturnData>${content}</ReturnData></Return>`;
const observe = (content: string) =>
  compareAtsW2Values(wrap(content), ATS_W2_TARGETS["1040-01"]).rows;

test("ATS W-2 observer distinguishes same-EIN employers independent of order and XML namespace prefixes", () => {
  assertEquals(
    observe(green + cr).map((r) => r.result),
    Array(20).fill("match"),
  );
  assertEquals(observe(cr + green), observe(green + cr));
  const prefixed = wrap(cr + green).replace("xmlns=", "xmlns:e=").replace(
    /<(\/?)([A-Za-z][A-Za-z0-9]*)/g,
    "<$1e:$2",
  );
  assertEquals(
    compareAtsW2Values(prefixed, ATS_W2_TARGETS["1040-01"]).rows,
    observe(green + cr),
  );
  assertEquals(observe(green + cr)[1].actual, "000000007");
});

test("ATS W-2 observer detects recipient swaps and amount swaps even when return totals are unchanged", () => {
  const swapped = observe(
    green.replace(">22970</WagesAmt>", ">19500</WagesAmt>") +
      cr.replace(">19500</WagesAmt>", ">22970</WagesAmt>"),
  );
  assertEquals(
    swapped.filter((r) => r.result === "different").map((r) => r.field),
    ["WagesAmt", "WagesAmt"],
  );
  const wrongOwner = observe(green.replace(">400001032<", ">400001071<") + cr);
  assertEquals(
    wrongOwner.filter((r) => r.result === "different").map((r) => r.field),
    ["EmployeeSSN"],
  );
  const wrongEin = observe(green.replace(">000000007<", ">000000008<") + cr);
  assertEquals(
    wrongEin.filter((r) => r.result === "different").map((r) => r.field),
    ["EmployerEIN"],
  );
});

test("ATS W-2 observer never borrows missing fields from another copy, totals, or duplicate documents", () => {
  const missing = observe(
    green.replace("<WithholdingAmt>1073</WithholdingAmt>", "") + cr +
      "<IRS1040><WithholdingAmt>1073</WithholdingAmt></IRS1040>",
  );
  assertEquals(
    missing.find((r) => r.sourcePage === 4 && r.field === "WithholdingAmt")
      ?.result,
    "missing-field",
  );
  assertEquals(
    observe(cr).filter((r) => r.sourcePage === 4).map((r) => r.result),
    Array(10).fill("missing-copy"),
  );
  assertEquals(
    observe(green + green + cr).filter((r) => r.sourcePage === 4).map((r) =>
      r.result
    ),
    Array(10).fill("ambiguous-copy"),
  );
  const duplicateField = observe(
    green.replace("</WagesAmt>", "</WagesAmt><WagesAmt>22970</WagesAmt>") + cr,
  );
  assertEquals(
    duplicateField.find((r) => r.sourcePage === 4 && r.field === "WagesAmt")
      ?.result,
    "invalid-value",
  );
});

test("ATS W-2 observer preserves invalid values and unavailable preparation instead of manufacturing matches", () => {
  for (const bad of ["", "22970.0", "NaN", "9007199254740992"]) {
    const rows = observe(
      green.replace(">22970</WagesAmt>", `>${bad}</WagesAmt>`) + cr,
    );
    assertEquals(
      rows.find((r) => r.sourcePage === 4 && r.field === "WagesAmt")?.result,
      "invalid-value",
    );
  }
  assertEquals(
    observe(green.replace(">000000007<", ">7<") + cr)[1].result,
    "invalid-value",
  );
  assertEquals(
    compareAtsW2Values(null, ATS_W2_TARGETS["1040-01"]).rows.map((r) =>
      r.result
    ),
    Array(20).fill("not-evaluated"),
  );
  for (const xml of ["<Return>", "<Wrong/>"]) {
    assertEquals(
      compareAtsW2Values(xml, ATS_W2_TARGETS["1040-01"]).rows.map((r) =>
        r.result
      ),
      Array(20).fill("invalid-xml"),
    );
  }
});

test("ATS W-2 checked indicators require X; absent unmarked boxes differ from missing copies", () => {
  const target = ATS_W2_TARGETS["1040-01"].map((t, i) =>
    i === 0
      ? {
        ...t,
        fields: {
          ...t.fields,
          StatutoryEmployeeInd: true,
          RetirementPlanInd: true,
        },
      }
      : t
  );
  const rows = compareAtsW2Values(wrap(green + cr), target).rows;
  assertEquals(
    rows.filter((r) => r.result === "different").map((r) => r.field),
    ["StatutoryEmployeeInd", "RetirementPlanInd"],
  );
  const checked = green.replace(
    "</IRSW2>",
    "<StatutoryEmployeeInd>X</StatutoryEmployeeInd><RetirementPlanInd>X</RetirementPlanInd></IRSW2>",
  );
  assertEquals(
    compareAtsW2Values(wrap(checked + cr), target).rows.every((r) =>
      r.result === "match"
    ),
    true,
  );
  assertEquals(
    observe(checked + cr).filter((r) => r.result === "different").length,
    2,
  );
  const invalid = observe(
    green.replace(
      "</IRSW2>",
      "<RetirementPlanInd>false</RetirementPlanInd></IRSW2>",
    ) + cr,
  );
  assertEquals(
    invalid.find((r) => r.sourcePage === 4 && r.field === "RetirementPlanInd")
      ?.result,
    "invalid-value",
  );
});
