import { test } from "bun:test";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import { appendInput } from "../../../../cli/store/store.ts";
import { createReturnCommand } from "../../../../cli/commands/return.ts";
import {
  exportMefCommand,
  ExportRejectedError,
} from "../../../../cli/commands/export.ts";
import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../2025/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { form8911Pdf } from "../../2025/pdf/forms/credits/business/f8911.ts";
import { form8911ScheduleAPdf } from "../../2025/pdf/forms/credits/business/f8911_schedule_a.ts";
import { STANDARD_DEDUCTION_BASE_2025 } from "../../nodes/config/2025.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_13_FACTS } from "./ty2025_cases.ts";
import {
  SCENARIO_1040_13_ASSUMPTIONS,
  scenario104013CurrentLawInput,
  scenario104013Input,
  SCENARIO_1040_13_RECONCILIATION,
} from "./scenario_1040_13_input.ts";

test("ATS 1040 Scenario 13 maps every printed source form into one input", () => {
  const input = scenario104013Input();
  const facts = SCENARIO_1040_13_FACTS;
  const general = input.general as Record<string, unknown>;
  const [w2] = input.w2 as Record<string, unknown>[];
  const refueling = input.f8911 as Record<string, unknown>;
  assertEquals(general.taxpayer_ssn, facts.taxpayer.ssn);
  assertEquals(general.spouse_ssn, facts.spouse.ssn);
  assertEquals(
    facts.form1040.mainHomeInUsOverHalfYearCheckboxChecked,
    false,
  );
  assertEquals(general.main_home_in_us_over_half_year, false);
  assertEquals(w2.employer_ein, facts.w2.employerEin);
  assertEquals(w2.employee_ssn, facts.taxpayer.ssn);
  assertEquals(w2.box1_wages, facts.w2.box1Wages);
  assertEquals(w2.box2_fed_withheld, facts.w2.box2FederalWithholding);
  assertEquals(refueling.cost, facts.form8911ScheduleA.qualifiedCost);
  assertEquals(
    refueling.census_tract_geoid,
    facts.form8911ScheduleA.censusTractGeoid,
  );
  assertEquals(refueling.regular_tax_before_credits, undefined);
  assertEquals(refueling.tentative_minimum_tax, undefined);
  assertEquals(facts.form8911.printedRegularTaxBeforeCredits, 162);
  assertEquals(facts.form8911.printedTentativeMinimumTax, 0);
});

test("ATS 1040 Scenario 13 preserves the printed return and identifies its $1,500 deduction conflict", () => {
  const { printed, current2025 } = SCENARIO_1040_13_RECONCILIATION;
  assertEquals(printed.form1040Pages, [2, 3]);
  assertEquals(printed.form8911Page, 7);
  assertEquals(printed.wages, 31_620);
  assertEquals(printed.adjustedGrossIncome, 31_620);
  assertEquals(printed.standardDeduction, 30_000);
  assertEquals(
    current2025.standardDeduction,
    STANDARD_DEDUCTION_BASE_2025[FilingStatus.MFJ],
  );
  assertEquals(
    current2025.standardDeduction - printed.standardDeduction,
    1_500,
  );
  assertEquals(printed.taxableIncome, 1_620);
  assertEquals(current2025.taxableIncomeBeforeAnyOtherAdjustments, 120);
  assertEquals(
    printed.taxableIncome - current2025.taxableIncomeBeforeAnyOtherAdjustments,
    1_500,
  );
  assertEquals(printed.regularTax, 162);
  assertEquals(printed.allowedRefuelingCredit, 162);
  assertEquals(printed.schedule3Credit, 162);
  assertEquals(printed.alternativeMinimumTax, 0);
  assertEquals(printed.totalTax, 0);
  assertEquals(printed.withholding, 609);
  assertEquals(printed.refund, 609);
  assertEquals(
    printed.wages - printed.standardDeduction,
    printed.taxableIncome,
  );
  assertEquals(printed.regularTax - printed.schedule3Credit, printed.totalTax);
  assertEquals(printed.withholding - printed.totalTax, printed.refund);
  // The PDF's Form 8911 tax limit is tied to its printed 1040 line 16.
  // It is not a verified limit for the return using the current deduction.
  assertEquals(printed.allowedRefuelingCredit === printed.regularTax, true);
});

test("ATS 1040 Scenario 13 routes W-2 facts but stops before a current-law Form 8911 credit", () => {
  const result = f1040_2025.executeReturn(scenario104013Input());
  const form = result.pending.f1040;
  assertEquals(form?.line1a_wages, 31_620);
  assertEquals(form?.line25a_w2_withheld, 609);
  assertEquals(form?.line12a_standard_deduction, 31_500);
  assertEquals(form?.line15_taxable_income, 120);
  assertEquals(
    result.pending.schedule3?.line6j_alt_fuel_vehicle_refueling,
    undefined,
  );
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes(
        "Form 8911 needs regular tax and tentative minimum tax",
      )
    ),
    true,
  );
  assertEquals(
    form?.line15_taxable_income ===
      SCENARIO_1040_13_RECONCILIATION.printed.taxableIncome,
    false,
  );
});

test("ATS 1040 Scenario 13 PDF parent and property reject the printed tax limit on the public current-year return", () => {
  const input = scenario104013Input();
  const result = f1040_2025.executeReturn(input);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const printed = SCENARIO_1040_13_RECONCILIATION.printed;
  assertEquals(typeof result.pending.f1040.line16_income_tax, "number");
  assertNotEquals(result.pending.f1040.line16_income_tax, printed.regularTax);
  const staleSource = {
    ...(input.f8911 as Record<string, unknown>),
    regular_tax_before_credits: printed.regularTax,
    tentative_minimum_tax:
      SCENARIO_1040_13_FACTS.form8911.printedTentativeMinimumTax,
  };
  const stalePending = { ...result.pending, f8911: staleSource };
  for (const descriptor of [form8911Pdf, form8911ScheduleAPdf]) {
    assertThrows(
      () => descriptor.instances!({}, filer, stalePending),
      Error,
      "source tax limit or credit disagrees with finalized Form 1040",
    );
  }
});

test("ATS Scenario 13 current-law reconstruction joins all six native documents without replacing printed answers", async () => {
  const input = scenario104013CurrentLawInput();
  const before = JSON.stringify(input);
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const f = result.pending.f1040;
  assertEquals([
    f.line1a_wages,
    f.line11_agi,
    f.line12a_standard_deduction,
    f.line15_taxable_income,
    f.line16_income_tax,
    f.line20_nonrefundable_credits,
    f.line24_total_tax,
    f.line25a_w2_withheld,
    f.line35a_refund,
  ], [31620, 31620, 31500, 120, 11, 11, 0, 609, 609]);
  assertEquals(result.pending.form6251.amti, 31620);
  assertEquals(result.pending.form6251.exemption, 137000);
  assertEquals(result.pending.form6251.net_tmt, 0);
  assertEquals(result.pending.schedule3.line6j_alt_fuel_vehicle_refueling, 11);
  const filer = extractFilerIdentity(f)!;
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<([A-Za-z0-9]+)\b[^>]*\bdocumentId="/g)]
      .map((m) => m[1]),
    [
      "IRS1040",
      "IRS1040Schedule3",
      "IRS6251",
      "IRS8911",
      "IRS8911ScheduleA",
      "IRSW2",
    ],
  );
  for (
    const fragment of [
      "<TaxAmt>11</TaxAmt>",
      "<TotalPersonalUsePartOfCrAmt>11</TotalPersonalUsePartOfCrAmt>",
      "<TentativeAlternativeMinTaxAmt>0</TentativeAlternativeMinTaxAmt>",
      "<RefundAmt>609</RefundAmt>",
    ]
  ) assertStringIncludes(prepared.bundle.xml, fragment);
  const parent = form8911Pdf.instances!({}, filer, result.pending);
  assertEquals([
    parent[0].line4,
    parent[0].line5,
    parent[0].line8,
    parent[0].line10,
  ], [300, 11, 0, 11]);
  assertEquals(
    form8911ScheduleAPdf.instances!({}, filer, result.pending).length,
    1,
  );
  assertEquals(SCENARIO_1040_13_RECONCILIATION.printed.regularTax, 162);
  assertEquals(JSON.stringify(input), before);
});

const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
let schemaAvailable = false;
try {
  schemaAvailable = sys.statSync(schema).isFile;
} catch { /* local IRS schema is gitignored */ }
const amount = (value: unknown) =>
  typeof value === "number" ? value : undefined;

async function exportWithoutForce(inputs: Record<string, unknown>) {
  const baseDir = await sys.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    await appendInput(`${baseDir}/${returnId}`, "start", signed(inputs));
    try {
      return {
        xml: await exportMefCommand({ returnId, baseDir }),
        rejected: [],
      };
    } catch (error) {
      if (!(error instanceof ExportRejectedError)) throw error;
      const rejected = [...new Set(error.entries.map((e) => e.ruleNumber))];
      return {
        xml: await exportMefCommand({ returnId, baseDir, force: true }),
        rejected,
      };
    }
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}

async function xsdErrors(xml: string) {
  const validator = new sys.Command("xmllint", {
    args: ["--noout", "--schema", schema, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validator.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const checked = await validator.output();
  return checked.code === 0 ? "" : new TextDecoder().decode(checked.stderr);
}

test.skipIf(!schemaAvailable)(
  "ATS 1040 Scenario 13 current-law return exports without force, validates against the v5.4 XSD and matches the packet",
  async () => {
    const input = scenario104013CurrentLawInput();
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const { xml, rejected } = await exportWithoutForce(input);
    assertEquals(rejected, []);
    assertEquals(await xsdErrors(xml), "");
    const p = result.pending;
    const facts = SCENARIO_1040_13_FACTS;
    const printed = facts.printedForm1040;
    assertEquals([
      p.f1040.line1a_wages,
      p.f1040.line1z_total_wages,
      p.f1040.line9_total_income,
      p.f1040.line11_agi,
      p.f1040.line22_tax_after_credits,
      p.f1040.line24_total_tax,
      p.f1040.line25a_w2_withheld,
      p.f1040.line25d_total_withholding,
      p.f1040.line33_total_payments,
      p.f1040.line34_overpayment,
      p.f1040.line35a_refund,
    ], [
      printed.line1aWages,
      printed.line1aWages,
      printed.line11AdjustedGrossIncome,
      printed.line11AdjustedGrossIncome,
      printed.line24TotalTax,
      printed.line24TotalTax,
      printed.line25aW2Withholding,
      printed.line25aW2Withholding,
      printed.line25aW2Withholding,
      printed.line34Overpayment,
      printed.line35aRefund,
    ]);
    const amt = facts.form6251;
    assertEquals([
      p.form6251.amti,
      p.form6251.exemption,
      p.form6251.taxable_excess,
      p.form6251.tentative_tax,
      p.form6251.net_tmt,
      p.form6251.line11_amt,
    ], [
      amt.line4AlternativeMinimumTaxableIncome,
      amt.line5Exemption,
      amt.line6ExcessOverExemption,
      amt.line7TentativeMinimumTaxBeforeCredits,
      amt.line9TentativeMinimumTax,
      amt.line11AlternativeMinimumTax,
    ]);
    assertStringIncludes(xml, "<RefundAmt>609</RefundAmt>");
    const parent = form8911Pdf.instances!({}, filerOf(p), p);
    assertEquals(
      parent[0].line4,
      facts.form8911.printedTentativePersonalCredit,
    );
    const current: Record<string, number | undefined> = {
      "1040 line 12e": amount(p.f1040.line12a_standard_deduction),
      "1040 line 14": amount(p.f1040.line14_deductions_qbi_total),
      "1040 line 15": amount(p.f1040.line15_taxable_income),
      "1040 line 16": amount(p.f1040.line16_income_tax),
      "1040 line 18": amount(p.f1040.line18_total_tax_before_credits),
      "1040 line 20": amount(p.f1040.line20_nonrefundable_credits),
      "1040 line 21": amount(p.f1040.line21_credits_total),
      "Schedule 3 line 6j": amount(p.schedule3.line6j_alt_fuel_vehicle_refueling),
      "Schedule 3 line 8": amount(p.schedule3.line8_total),
      "Form 6251 line 1b": amount(p.form6251.regular_tax_income),
      "Form 6251 line 2a": amount(p.form6251.line2a_taxes_paid),
      "Form 6251 line 10": amount(p.form6251.regular_tax),
      "Form 8911 personal credit": amount(parent[0].line10),
    };
    for (const conflict of SCENARIO_1040_13_RECONCILIATION.conflicts) {
      assertEquals(current[conflict.line], conflict.current, conflict.line);
      assertNotEquals<number>(conflict.printed, conflict.current);
    }
    assertEquals(SCENARIO_1040_13_ASSUMPTIONS.length, 3);
  },
);

function filerOf(pending: ReturnType<typeof f1040_2025.executeReturn>["pending"]) {
  return extractFilerIdentity(pending.f1040)!;
}
