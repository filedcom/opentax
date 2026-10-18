import { test } from "bun:test";
import { existsSync } from "node:fs";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../scripts/support/sys.ts";
import { catalog } from "../../../catalog.ts";
import { signed } from "../../../scripts/testing/mef.ts";
import { normalizeAllPending } from "../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../cli/commands/export.ts";
import { ty2026Scenario104005Input } from "../e2e/ats/ty2026_scenario_1040_05_input.ts";

const SCHEMA = fromFileUrl(
  new URL(
    "../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

// TY2026 ATS Scenario 5's wage return without Form 8888, plus a FICA-only
// household employee and a first-quarter 2026 estimated payment.
function input(): Record<string, unknown> {
  const { f8888: _f8888, ...base } = signed(ty2026Scenario104005Input());
  const general = base.general as Record<string, unknown>;
  return {
    ...base,
    general: { ...general, taxpayer_signature_date: "2027-02-01" },
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: true,
      cash_wages_over_quarter_limit: false,
      ss_wages: 3_600,
      medicare_wages: 3_600,
      federal_income_tax_withheld: 0,
      fica_only_payroll: {
        all_household_employees_included: true,
        prior_year_payroll_source_reference: "2025-household-payroll",
        prior_year_quarter_cash_wages: [0, 0, 0, 0],
        employee_wages: [{
          employee_id: "adult-worker",
          payroll_source_reference: "2026-household-payroll",
          relationship: "unrelated",
          age_18_or_older_for_fica: true,
          ordinary_cash_only: true,
          annual_cash_wages: 3_600,
          quarterly_cash_wages: [900, 900, 900, 900],
          w2: {
            source_reference: "2026-household-w2",
            box2_federal_income_tax_withheld: 0,
            box3_social_security_wages: 3_600,
            box5_medicare_wages: 3_600,
          },
        }],
      },
    },
    f1040es: {
      payment_q1: 500,
      payment_q1_date: "2026-04-15",
      quarter_payment_records: [{
        tax_year: 2026,
        quarter: "q1",
        amount: 500,
        payer_tin: general.taxpayer_ssn,
        payment_date: "2026-04-15",
        payment_record_reference: "2026-q1-eftps",
      }],
    },
  };
}

async function exported() {
  const def = catalog["f1040:2026"];
  const result = def.executeReturn(input());
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = (await def.prepareReturn(pending, filer, [])).bundle.xml;
  return { pending, filer, xml };
}

test("TY2026 Schedule H and estimated payments reach Form 1040 and MeF", async () => {
  const { pending, filer, xml } = await exported();
  const f = pending.f1040 ?? {};
  // Schedule H $3,600 x 15.3% = $446 + $104 (draft 2026 Schedule H lines
  // 2 and 4); Scenario 5's $3,883 income tax; $10,268 withheld + $500.
  assertEquals(pending.schedule2?.line9_household_employment, 550);
  assertEquals(f.line24_total_tax, 4_433);
  assertEquals(f.line26_estimated_tax, 500);
  assertEquals(f.line34_overpayment, 6_335);
  assertStringIncludes(xml, "<TaxYr>2026</TaxYr>");
  assertStringIncludes(
    xml,
    "<SocialSecurityTaxCashWagesAmt>3600</SocialSecurityTaxCashWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<EstimatedTaxPaymentsAmt>500</EstimatedTaxPaymentsAmt>",
  );
  const report = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(xml),
  );
  // IND-002 and IND-689-01 compare the header dates with today's processing
  // year, which a 2027 signature meets only from 2027.
  assertEquals(
    report.entries
      .filter((entry) => entry.severity !== "alert")
      .filter((entry) => !["IND-002", "IND-689-01"].includes(entry.ruleNumber))
      .map((entry) => entry.ruleNumber),
    [],
  );
});

test.skipIf(!existsSync(SCHEMA))(
  "TY2026 Schedule H return XML validates against the 2026v1.0 Return1040.xsd",
  async () => {
    const { xml } = await exported();
    const dir = await sys.makeTempDir();
    const path = `${dir}/schedule-h.xml`;
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

// Two employers withholding 6.2% of $120,000 and $100,000: draft 2026
// Schedule 3 line 11 credits the excess over $11,439 (6.2% of the $184,500
// 2026 wage base); Form 8959 taxes 0.9% of wages over $200,000.
function twoEmployerInput(): Record<string, unknown> {
  const base = input();
  const [w2] = base.w2 as Record<string, unknown>[];
  const row = (ein: string, wages: number, reference: string) => ({
    ...w2,
    source_document_reference: reference,
    employer_ein: ein,
    box1_wages: wages,
    box2_fed_withheld: Math.round(wages * 0.2),
    box3_ss_wages: wages,
    box4_ss_withheld: wages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
  });
  const { schedule_h: _h, f1040es: _es, ...rest } = base;
  return {
    ...rest,
    w2: [
      row("111111111", 120_000, "2026-w2-employer-a"),
      row("222222222", 100_000, "2026-w2-employer-b"),
    ],
  };
}

test("TY2026 excess Social Security withholding uses the 2026 maximum", async () => {
  const def = catalog["f1040:2026"];
  const pending = normalizeAllPending(
    def.executeReturn(twoEmployerInput()).pending,
  );
  assertEquals(pending.schedule3?.line11_excess_ss, 2_201);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = (await def.prepareReturn(pending, filer, [])).bundle.xml;
  assertStringIncludes(
    xml,
    "<ExcessSocSecAndTier1RRTATaxAmt>2201</ExcessSocSecAndTier1RRTATaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdditionalMedicareTaxAmt>180</AdditionalMedicareTaxAmt>",
  );
});
