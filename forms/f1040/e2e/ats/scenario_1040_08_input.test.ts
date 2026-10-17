import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../../2025/registry.ts";
import { SCENARIO_1040_08_FACTS } from "./ty2025_cases.ts";
import {
  SCENARIO_1040_08_ASSUMPTIONS,
  scenario104008Input,
} from "./scenario_1040_08_input.ts";
import {
  atsMefExport,
  TY2025_RETURN1040_XSD,
  validateTy2025Xsd,
  xmlValue,
} from "./ty2025-ats-export.ts";
import * as sys from "../../../../scripts/support/sys.ts";

// Temporary: cleared by the shared ATS header and test-EIN mode (PR #93).
let xsdAvailable = false;
try {
  sys.statSync(TY2025_RETURN1040_XSD);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is a local, untracked research cache.
}
import { scheduleD } from "../../2025/mef/forms/income/investments/schedule_d.ts";
import { irs1040Pdf } from "../../2025/pdf/forms/general/return-assembly/f1040.ts";

const plan = buildExecutionPlan(registry);

test("ATS 1040 Scenario 8: source-backed return calculates age deduction and refund", () => {
  const result = execute(plan, registry, scenario104008Input(), {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  assertEquals(form?.line4a_ira_gross, 35_800);
  assertEquals(form?.line4b_ira_taxable, 0);
  const pdf = irs1040Pdf.projectFields?.(form ?? {}, result.pending);
  assertEquals(pdf?.line4a_ira_gross, 35_800);
  assertEquals(pdf?.print_ira_qcd, false);
  assertEquals(form?.line5a_pension_gross, 20_300);
  assertEquals(form?.line5b_pension_taxable, 10_300);
  assertEquals(form?.line5c_pension_rollover, true);
  assertEquals(form?.line6a_ss_gross, 1_000);
  assertEquals(form?.line6b_ss_taxable ?? 0, 0);
  assertEquals(form?.mfs_spouse_lived_with_taxpayer, false);
  assertEquals(result.pending.agi_aggregator?.mfs_lived_with_spouse, false);
  assertEquals(form?.line7a_cap_gain_distrib, 7_500);
  assertEquals(form?.line9_total_income, 17_800);
  assertEquals(form?.line12a_standard_deduction, 17_350);
  assertEquals(form?.line13b_additional_deductions ?? 0, 0);
  assertEquals(form?.line15_taxable_income, 450);
  assertEquals(form?.line16_income_tax, 0);
  assertEquals(form?.line24_total_tax, 0);
  assertEquals(form?.line25b_withheld_1099, 2_555);
  assertEquals(form?.line33_total_payments, 2_555);
  assertEquals(form?.line35a_refund, 2_555);
  assertEquals(result.pending.schedule_d?.line13_cap_gain_distrib, 7_500);
  assertEquals(scheduleD.build(result.pending.schedule_d), "");
});

test("ATS 1040 Scenario 8: MFS cohabitation answer changes Social Security taxability", () => {
  const input = scenario104008Input();
  (input.general as Record<string, unknown>).mfs_spouse_lived_with_taxpayer =
    true;
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line6b_ss_taxable, 850);
  assertEquals(result.pending.f1040?.mfs_spouse_lived_with_taxpayer, true);
});

test("ATS 1040 Scenario 8: code G and printed mark confirm rollover but code Q does not prove QCD", () => {
  const facts = SCENARIO_1040_08_FACTS;
  assertEquals(facts.form1040.line4aBlank, true);
  assertEquals(facts.form1040.line4cQcdChecked, true);
  assertEquals(facts.form1040.line5cRolloverChecked, true);
  assertEquals(facts.form1099R.map((form) => form.distributionCode), [
    "Q",
    "G",
  ]);
  const forms = scenario104008Input().f1099r as Record<string, unknown>[];
  assertEquals(
    forms.some((form) => form.box7_ira_simple_indicator === true),
    false,
  );
  assertEquals(forms[0].qcd_full, undefined);
  assertEquals(forms[0].qcd_partial_amount, undefined);
  assertEquals(forms[1].box7_distribution_code, "G");
  assertEquals(forms[1].direct_rollover_confirmed, true);
  assertEquals(forms[1].box2a_taxable_amount, 10_300);
});

test("ATS 1040 Scenario 8: source-backed PDF QCD state conflicts with printed packet", () => {
  const result = execute(plan, registry, scenario104008Input(), {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  assertEquals(form?.line4a_ira_gross, 35_800);
  assertEquals(form?.line4b_ira_taxable, 0);

  const projected = irs1040Pdf.projectFields?.(
    {
      line4a_ira_gross: form?.line4a_ira_gross,
      line4b_ira_taxable: form?.line4b_ira_taxable,
      line5a_pension_gross: form?.line5a_pension_gross,
      line5b_pension_taxable: form?.line5b_pension_taxable,
      line5c_pension_rollover: form?.line5c_pension_rollover,
    },
    { f1099r: result.pending.f1099r },
  );
  assertEquals(projected?.line4a_ira_gross, 35_800);
  assertEquals(projected?.print_ira_qcd, false);
  assertEquals(SCENARIO_1040_08_FACTS.form1040.line4aBlank, true);
  assertEquals(SCENARIO_1040_08_FACTS.form1040.line4cQcdChecked, true);
});

test("ATS 1040 Scenario 8 exports without force and files the packet's lines", async () => {
  const { diagnostics, xml, rejects } = await atsMefExport(
    scenario104008Input(),
  );
  assertEquals(diagnostics, []);
  assertEquals(rejects, []);
  assertEquals(
    [...xml.matchAll(/<(IRS[A-Za-z0-9]+) documentId=/g)].map((m) => m[1]),
    ["IRS1040", "IRS1099R", "IRS1099R"],
  );
  const value = (tag: string) => xmlValue(xml, "IRS1040", tag);
  assertEquals(value("IndividualReturnFilingStatusCd"), "3");
  assertEquals(value("PECFPrimaryInd"), "X");
  assertEquals(value("VirtualCurAcquiredDurTYInd"), "false");
  // Packet p. 2 conflict: blank line 4a and a checked QCD box (see docs/ats).
  assertEquals(value("IRADistributionsAmt"), "35800");
  assertEquals(value("TaxableIRAAmt"), "0");
  assertEquals(value("PensionsAnnuitiesAmt"), "20300");
  assertEquals(value("TotalTaxablePensionsAmt"), "10300");
  assertEquals(value("PensionsAnnuitiesRolloverInd"), "X");
  assertEquals(value("SocSecBnftAmt"), "1000");
  assertEquals(value("TaxableSocSecAmt"), undefined);
  assertEquals(value("MFSLiveApartEntireYrInd"), "X");
  assertEquals(value("CapitalGainLossAmt"), "7500");
  assertEquals(value("CapitalDistributionInd"), "X");
  assertEquals(value("Primary65OrOlderInd"), "X");
  assertEquals(value("Form1099WithheldTaxAmt"), "2555");
  assertEquals(xml.includes("IRS1040Schedule1A"), false);
  assertEquals(
    [...xml.matchAll(/<F1099RDistributionCd>([^<]*)</g)].map((m) => m[1]),
    ["Q", "G"],
  );
  assertEquals(
    SCENARIO_1040_08_ASSUMPTIONS.map((assumption) => assumption.field),
    [
      "ssa1099[0].source_document_reference / recipient_tin",
      "f1099div[0].payerName",
      "general.taxpayer_prior_year_agi",
    ],
  );
}, 60_000);

test.skipIf(!xsdAvailable)("ATS 1040 Scenario 8 export conforms to the TY2025 v5.4 Return1040.xsd", async () => {
  const { xml } = await atsMefExport(scenario104008Input());
  const { success, stderr } = await validateTy2025Xsd(xml);
  assertEquals(success, true, stderr);
}, 60_000);
