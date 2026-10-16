import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import {
  ATS_RETIREMENT_TARGETS,
  compareAtsRetirementValues,
} from "./ty2025-retirement-value-coverage.ts";

const liberty =
  `<IRS1099R><PayerName><BusinessNameLine1Txt>Liberty Trust Company</BusinessNameLine1Txt></PayerName>
<PayerEIN>000000009</PayerEIN><RecipientSSN>400001039</RecipientSSN>
<GrossDistributionAmt>35800</GrossDistributionAmt><TaxableAmt>0</TaxableAmt>
<FederalIncomeTaxWithheldAmt>0</FederalIncomeTaxWithheldAmt><F1099RDistributionCd>Q</F1099RDistributionCd></IRS1099R>`;
const jubilee =
  `<IRS1099R><PayerName><BusinessNameLine1Txt>Jubilee Retirement Fund</BusinessNameLine1Txt></PayerName>
<PayerEIN>000000009</PayerEIN><RecipientSSN>400001039</RecipientSSN>
<GrossDistributionAmt>20300</GrossDistributionAmt><TaxableAmt>10300</TaxableAmt>
<FederalIncomeTaxWithheldAmt>2555</FederalIncomeTaxWithheldAmt><F1099RDistributionCd>G</F1099RDistributionCd></IRS1099R>`;
const wrap = (s: string) => `<Return><ReturnData>${s}</ReturnData></Return>`;
const observe = (s: string) =>
  compareAtsRetirementValues(wrap(s), ATS_RETIREMENT_TARGETS["1040-08"]).rows;

test("ATS 1099-R observer binds same-EIN payer copies without deriving IRA marks from distribution codes", () => {
  assertEquals(
    observe(liberty + jubilee).map((r) => r.result),
    Array(20).fill("match"),
  );
  assertEquals(observe(jubilee + liberty), observe(liberty + jubilee));
  const wrongMark = observe(
    liberty.replace(
      "</IRS1099R>",
      "<IRASEPSIMPLEInd>X</IRASEPSIMPLEInd></IRS1099R>",
    ) + jubilee,
  );
  assertEquals(
    wrongMark.filter((r) => r.result === "different").map((r) => r.field),
    ["IRASEPSIMPLEInd"],
  );
  const primrose =
    `<IRS1099R><PayerName><BusinessNameLine1Txt>Primrose Retirement Fund</BusinessNameLine1Txt></PayerName>
<PayerEIN>000000009</PayerEIN><RecipientSSN>400001035</RecipientSSN>
<GrossDistributionAmt>53778</GrossDistributionAmt><TaxableAmt>43100</TaxableAmt>
<FederalIncomeTaxWithheldAmt>3405</FederalIncomeTaxWithheldAmt><F1099RDistributionCd>7</F1099RDistributionCd></IRS1099R>`;
  assertEquals(
    compareAtsRetirementValues(
      wrap(primrose),
      ATS_RETIREMENT_TARGETS["1040-03"],
    ).rows.map((r) => r.result),
    Array(10).fill("match"),
  );
});

test("ATS 1099-R explicit zero targets remain missing when XML omits their elements", () => {
  const missing = observe(
    liberty.replace("<TaxableAmt>0</TaxableAmt>", "").replace(
      "<FederalIncomeTaxWithheldAmt>0</FederalIncomeTaxWithheldAmt>",
      "",
    ) + jubilee,
  );
  assertEquals(
    missing.filter((r) => r.result === "missing-field").map((r) => r.field),
    ["TaxableAmt", "FederalIncomeTaxWithheldAmt"],
  );
  const mixed = observe(
    liberty.replace(
      "<TaxableAmt>0</TaxableAmt>",
      "<TaxableAmt>10300</TaxableAmt>",
    ) +
      jubilee.replace(
        "<TaxableAmt>10300</TaxableAmt>",
        "<TaxableAmt>0</TaxableAmt>",
      ),
  );
  assertEquals(
    mixed.filter((r) => r.result === "different").map((r) => r.field),
    ["TaxableAmt", "TaxableAmt"],
  );
});

test("ATS 1099-R changes to recipient, code and all four printed indicators are independent discrepancies", () => {
  const changed = observe(
    liberty.replace(">400001039<", ">400001057<").replace(
      ">Q</F1099RDistributionCd>",
      ">G</F1099RDistributionCd>",
    ) + jubilee,
  );
  assertEquals(
    changed.filter((r) => r.result === "different").map((r) => r.field),
    ["RecipientSSN", "F1099RDistributionCd"],
  );
  for (
    const field of [
      "CorrectedInd",
      "TxblAmountNotDeterminedInd",
      "TotalDistributionInd",
      "IRASEPSIMPLEInd",
    ]
  ) {
    const rows = observe(
      liberty.replace("</IRS1099R>", `<${field}>X</${field}></IRS1099R>`) +
        jubilee,
    );
    assertEquals(
      rows.filter((r) => r.result === "different").map((r) => r.field),
      [field],
    );
  }
});

test("ATS 1099-R missing, ambiguous and unavailable copies cannot pass through another payer", () => {
  assertEquals(
    observe(jubilee).filter((r) => r.sourcePage === 4).map((r) => r.result),
    Array(10).fill("missing-copy"),
  );
  assertEquals(
    observe(liberty + liberty + jubilee).filter((r) => r.sourcePage === 4).map(
      (r) => r.result,
    ),
    Array(10).fill("ambiguous-copy"),
  );
  assertEquals(
    compareAtsRetirementValues(null, ATS_RETIREMENT_TARGETS["1040-08"]).rows
      .map((r) => r.result),
    Array(20).fill("not-evaluated"),
  );
});

test("ATS 1099-R code observer retains complete source codes and rejects duplicate or malformed elements", () => {
  for (const code of ["QG", "GQ", "q"]) {
    const rows = observe(
      liberty.replace(
        ">Q</F1099RDistributionCd>",
        `>${code}</F1099RDistributionCd>`,
      ) + jubilee,
    );
    assertEquals(
      rows.find((r) => r.sourcePage === 4 && r.field === "F1099RDistributionCd")
        ?.result,
      "different",
    );
  }
  for (const code of ["", "Q G", "QGG"]) {
    const rows = observe(
      liberty.replace(
        ">Q</F1099RDistributionCd>",
        `>${code}</F1099RDistributionCd>`,
      ) + jubilee,
    );
    assertEquals(
      rows.find((r) => r.sourcePage === 4 && r.field === "F1099RDistributionCd")
        ?.result,
      "invalid-value",
    );
  }
  const repeated = observe(
    liberty.replace(
      "</F1099RDistributionCd>",
      "</F1099RDistributionCd><F1099RDistributionCd>Q</F1099RDistributionCd>",
    ) + jubilee,
  );
  assertEquals(
    repeated.find((r) =>
      r.sourcePage === 4 && r.field === "F1099RDistributionCd"
    )?.result,
    "invalid-value",
  );
});
