import { test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { catalog } from "../../../../catalog.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  SCENARIO_1040_05_TY2026_ASSUMPTIONS,
  SCENARIO_1040_05_TY2026_EXPECTED,
  ty2026Scenario104005Input,
} from "./ty2026_scenario_1040_05_input.ts";
import {
  SCENARIO_1040_05_TY2026_FACTS,
  TY2026_ATS_CASES,
  TY2026_SCHEMA_GAPS,
} from "./ty2026_cases.ts";

const SCHEMA = fromFileUrl(
  new URL(
    "../../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

function signedInput(): Record<string, unknown> {
  const input = signed(ty2026Scenario104005Input());
  const general = input.general as Record<string, unknown>;
  return {
    ...input,
    general: { ...general, taxpayer_signature_date: "2027-02-01" },
  };
}

async function exported() {
  const def = catalog["f1040:2026"];
  const result = def.executeReturn(signedInput());
  const pending = normalizeAllPending(result.pending);
  // ReturnTs is the processing date: pin it to the 2027 signature date so
  // IND-002 and IND-689-01 do not depend on the day the test runs.
  const identity = extractFilerIdentity(pending.f1040 ?? {});
  const filer = identity && { ...identity, timestamp: "2027-02-01T12:00:00Z" };
  const xml = (await def.prepareReturn(pending, filer, [])).bundle.xml;
  return { result, pending, filer, xml };
}

test("TY2026 ATS 1040 Scenario 5 computes the packet return with 2026 law", async () => {
  const { result, pending } = await exported();
  assertEquals(result.diagnostics, []);
  const f = pending.f1040 ?? {};
  const e = SCENARIO_1040_05_TY2026_EXPECTED;
  assertEquals(f.line1a_wages, e.line1aWages);
  assertEquals(f.line11_agi, e.line11Agi);
  assertEquals(f.line12a_standard_deduction, e.line12StandardDeduction);
  assertEquals(f.line15_taxable_income, e.line15TaxableIncome);
  assertEquals(f.line16_income_tax, e.line16Tax);
  assertEquals(f.line24_total_tax, e.line24TotalTax);
  assertEquals(f.line25a_w2_withheld, e.line25aW2Withholding);
  assertEquals(f.line34_overpayment, e.line34Overpayment);
  assertEquals(f.line35a_refund, e.line35aRefund);
  assertEquals(
    e.form8888Line1aChecking + e.form8888Line2aSavings,
    e.line35aRefund,
  );
});

test("TY2026 ATS 1040 Scenario 5 exports TaxYr 2026 with no reject-level rule", async () => {
  const { pending, filer, xml } = await exported();
  assertStringIncludes(xml, 'returnVersion="2026v1.0"');
  assertStringIncludes(xml, "<TaxYr>2026</TaxYr>");
  assertStringIncludes(xml, "<TaxPeriodBeginDt>2026-01-01</TaxPeriodBeginDt>");
  const facts = SCENARIO_1040_05_TY2026_FACTS;
  assertStringIncludes(xml, `<WagesAmt>${facts.w2.box1Wages}</WagesAmt>`);
  assertStringIncludes(
    xml,
    `<WithholdingAmt>${facts.w2.box2FederalWithholding}</WithholdingAmt>`,
  );
  assertStringIncludes(xml, "<TotalItemizedOrStandardDedAmt>16100<");
  assertStringIncludes(xml, "<TaxAmt>3883</TaxAmt>");
  assertStringIncludes(xml, "<RefundAmt>6385</RefundAmt>");
  assertStringIncludes(
    xml,
    "<DirectDepositRefundAmt>5385</DirectDepositRefundAmt><RoutingTransitNum>012345672</RoutingTransitNum><BankAccountTypeCd>1</BankAccountTypeCd><DepositorAccountNum>12345678</DepositorAccountNum>",
  );
  assertStringIncludes(
    xml,
    "<DirectDepositRefundAmt>1000</DirectDepositRefundAmt><RoutingTransitNum>012345672</RoutingTransitNum><BankAccountTypeCd>2</BankAccountTypeCd><DepositorAccountNum>1234567</DepositorAccountNum>",
  );
  const report = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(xml),
  );
  assertEquals(
    report.entries
      .filter((entry) => entry.severity !== "alert")
      .map((entry) => entry.ruleNumber),
    [],
  );
});

test.skipIf(!existsSync(SCHEMA))(
  "TY2026 ATS 1040 Scenario 5 XML validates against the 2026v1.0 Return1040.xsd",
  async () => {
    const { xml } = await exported();
    const dir = await sys.makeTempDir();
    const path = `${dir}/scenario5.xml`;
    await sys.writeText(path, xml);
    const validated = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", SCHEMA, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validated.code,
      0,
      new TextDecoder().decode(validated.stderr),
    );
  },
);

test("TY2026 ATS 1040 Scenario 5 on TY2025 law gives the TY2025 answer", () => {
  // Rev. Proc. 2025-32 §3.01 standard deduction $15,750; Rev. Proc. 2024-40
  // single rates at the $34,750-$34,800 Tax Table row midpoint:
  // $1,192.50 + 12% x ($34,775 - $11,925) = $3,934.50, printed as $3,935.
  const result = catalog["f1040:2025"].executeReturn(signedInput());
  const f = normalizeAllPending(result.pending).f1040 ?? {};
  assertEquals(f.line12a_standard_deduction, 15_750);
  assertEquals(f.line16_income_tax, 3_935);
});

test("TY2026 ATS 1040 Scenario 5 inventory and assumptions stay explicit", () => {
  const scenario5 = TY2026_ATS_CASES.find((c) => c.id === "1040-05");
  assertEquals(scenario5?.forms, ["1040", "W-2", "8888"]);
  assertEquals(scenario5?.schemaGaps, []);
  assertEquals(scenario5?.unsupportedFacts, []);
  assertEquals(TY2026_ATS_CASES.map((c) => c.scenario), [
    1,
    2,
    3,
    4,
    5,
    6,
    12,
    13,
    14,
  ]);
  assertEquals(
    SCENARIO_1040_05_TY2026_ASSUMPTIONS.map((a) => a.field).sort(),
    [
      "f8888.account_*.owner_name",
      "f8888.account_1.amount",
      "general.ats_test_submission",
      "general.taxpayer_prior_year_agi",
      "w2[0].source_document_reference",
    ],
  );
});

test.skipIf(!existsSync(SCHEMA))(
  "TY2026 stylesheet elements recorded as schema gaps are absent from 2026v1.0",
  () => {
    const root = join(dirname(SCHEMA), "../..");
    const xsd = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((path) => path.endsWith(".xsd"))
      .map((path) => readFileSync(join(root, path), "utf8"))
      .join("\n");
    for (const gap of TY2026_SCHEMA_GAPS) {
      for (const element of gap.elements) {
        assertEquals(xsd.includes(`name="${element}"`), false, element);
      }
    }
  },
);
