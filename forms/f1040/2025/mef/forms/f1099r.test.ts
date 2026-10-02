import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { SCENARIO_1040_08_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import { TS } from "../../../nodes/types.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { f1099r } from "./f1099r.ts";
import { buildMefXml } from "../builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const facts = SCENARIO_1040_08_FACTS;
const filer: FilerIdentity = {
  primarySSN: facts.taxpayer.ssn,
  nameLine1: "Carter Lewis",
  nameControl: "LEWI",
  firstName: facts.taxpayer.firstName,
  lastName: facts.taxpayer.lastName,
  fullName: "Carter Lewis",
  address: facts.taxpayer.address,
  filingStatus: FilingStatus.MarriedFilingSeparately,
};

function items() {
  return facts.form1099R.map((form) => ({
    payer_name: form.payerName,
    payer_ein: form.payerEin,
    payer_address_line1: form.payerAddress.line1,
    payer_address_city: form.payerAddress.city,
    payer_address_state: form.payerAddress.state,
    payer_address_zip: form.payerAddress.zip,
    recipient_address_line1: form.recipientAddress.line1,
    recipient_address_city: form.recipientAddress.city,
    recipient_address_state: form.recipientAddress.state,
    recipient_address_zip: form.recipientAddress.zip,
    recipient_ssn: filer.primarySSN,
    box1_gross_distribution: form.grossDistribution,
    box2a_taxable_amount: form.taxableAmount,
    box4_federal_withheld: form.federalWithholding,
    box7_distribution_code: form.distributionCode === "Q"
      ? DistributionCode.CodeQ
      : DistributionCode.CodeG,
  }));
}

Deno.test("Scenario 8 builds two source-faithful 1099-R MeF documents", () => {
  const xml = f1099r.build({ f1099rs: items() }, { filer });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<PayerNameControlTxt>LIBE</PayerNameControlTxt>",
  );
  assertStringIncludes(
    xml[0],
    "<GrossDistributionAmt>35800</GrossDistributionAmt>",
  );
  assertStringIncludes(xml[0], "<TaxableAmt>0</TaxableAmt>");
  assertStringIncludes(
    xml[0],
    "<F1099RDistributionCd>Q</F1099RDistributionCd>",
  );
  assertStringIncludes(
    xml[1],
    "<GrossDistributionAmt>20300</GrossDistributionAmt>",
  );
  assertStringIncludes(xml[1], "<TaxableAmt>10300</TaxableAmt>");
  assertStringIncludes(
    xml[1],
    "<FederalIncomeTaxWithheldAmt>2555</FederalIncomeTaxWithheldAmt>",
  );
  assertStringIncludes(
    xml[1],
    "<F1099RDistributionCd>G</F1099RDistributionCd>",
  );
  for (const document of xml) {
    assertStringIncludes(document, "<RecipientSSN>400001039</RecipientSSN>");
    assertStringIncludes(document, "<ZIPCd>89117</ZIPCd>");
  }
});

Deno.test("1099-R MeF export rejects incomplete source addresses", () => {
  const [first] = items();
  assertThrows(
    () =>
      f1099r.build({ f1099rs: [{ ...first, payer_address_zip: undefined }] }, {
        filer,
      }),
    Error,
    "incomplete payer US address",
  );
});

Deno.test("1099-R box 9a percentage is exported as the XSD ratio", () => {
  const [first] = items();
  const [xml] = f1099r.build({ f1099rs: [{ ...first, box9a_pct_total: 25 }] }, {
    filer,
  });
  assertStringIncludes(
    xml,
    "<RcpntTotalDistributionPct>0.25</RcpntTotalDistributionPct>",
  );
});

Deno.test("1099-R native export rejects an exact repeated identified source copy", () => {
  const [source] = items();
  const copy = {
    ...source,
    source_document_reference: "2025 issued pension 1099-R",
    recipient_ssn: filer.primarySSN,
    account_number: "PENSION-1",
  };
  assertThrows(
    () => f1099r.build({ f1099rs: [copy, { ...copy }] }, { filer }),
    Error,
    "repeats the same payer, recipient, account, and issued source copy",
  );
  assertEquals(
    f1099r.build({
      f1099rs: [copy, { ...copy, account_number: "PENSION-2" }],
    }, { filer }).length,
    2,
  );
});

Deno.test("one identified 1099-R copy cannot replay changed withholding in either exporter", async () => {
  const [source] = items();
  const copy = {
    ...source,
    source_document_reference: "2025 issued pension 1099-R",
    account_number: "PENSION-1",
  };
  const pending = {
    f1099r: {
      f1099rs: [copy, { ...copy, box4_federal_withheld: 999 }],
    },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "repeats the same payer, recipient, account, and issued source copy",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "repeats the same payer, recipient, account, and issued source copy",
  );
  assertEquals(
    f1099r.build({
      f1099rs: [copy, {
        ...copy,
        source_document_reference: "separate issued copy",
      }],
    }, { filer }).length,
    2,
  );
});

Deno.test("1099-R for a spouse does not use the taxpayer's SSN", () => {
  const [first] = items();
  assertThrows(
    () => f1099r.build({ f1099rs: [{ ...first, ts: TS.S }] }, { filer }),
    Error,
    "joint return and spouse identity",
  );
  const jointFiler = {
    ...filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: facts.spouse.ssn,
      firstName: facts.spouse.firstName,
      lastName: facts.spouse.lastName,
      nameControl: "LEWI",
    },
  };
  const [xml] = f1099r.build({
    f1099rs: [{ ...first, ts: TS.S, recipient_ssn: facts.spouse.ssn }],
  }, { filer: jointFiler });
  assertStringIncludes(xml, "<RecipientSSN>400001057</RecipientSSN>");
  assertStringIncludes(xml, "<RecipientNm>Elizabeth Lewis</RecipientNm>");
  assertThrows(
    () =>
      f1099r.build({
        f1099rs: [{ ...first, ts: TS.S, recipient_ssn: filer.primarySSN }],
      }, { filer: jointFiler }),
    Error,
    "issued recipient SSN differs",
  );
  assertThrows(
    () =>
      f1099r.build({
        f1099rs: [{ ...first, recipient_ssn: facts.spouse.ssn }],
      }, { filer: jointFiler }),
    Error,
    "issued recipient SSN differs",
  );
});

Deno.test("1099-R wrong recipient cannot enter either full-return exporter", async () => {
  const [first] = items();
  const pending = {
    f1099r: {
      f1099rs: [{ ...first, recipient_ssn: "999-88-7777" }],
    },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "issued recipient SSN differs",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "issued recipient SSN differs",
  );
});

Deno.test("positive 1099-R without an issued recipient cannot enter either exporter", async () => {
  const [first] = items();
  const missingRecipient = { ...first, recipient_ssn: undefined };
  const pending = { f1099r: { f1099rs: [missingRecipient] } };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "positive issued copy needs recipient SSN",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "positive issued copy needs recipient SSN",
  );
});

Deno.test("withholding-only 1099-R still needs its issued recipient", async () => {
  const [first] = items();
  const pending = {
    f1099r: {
      f1099rs: [{
        ...first,
        recipient_ssn: undefined,
        box1_gross_distribution: 0,
        box2a_taxable_amount: 0,
        box4_federal_withheld: 100,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "positive issued copy needs recipient SSN",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "positive issued copy needs recipient SSN",
  );
});

Deno.test("zero 1099-R source may remain without recipient income or withholding", () => {
  const [first] = items();
  const documents = f1099r.build({
    f1099rs: [{
      ...first,
      recipient_ssn: undefined,
      box1_gross_distribution: 0,
      box2a_taxable_amount: 0,
      box4_federal_withheld: 0,
    }],
  }, { filer });
  assertEquals(documents.length, 1);
});

Deno.test("1099-R export requires a recipient name", () => {
  const [first] = items();
  assertThrows(
    () =>
      f1099r.build({ f1099rs: [first] }, {
        filer: { ...filer, fullName: undefined },
      }),
    Error,
    "without recipient name",
  );
});
