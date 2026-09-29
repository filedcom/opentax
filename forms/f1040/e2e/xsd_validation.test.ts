/**
 * XSD Validation Tests — verifies generated MeF XML conforms to IRS 2025v5.4 schemas.
 *
 * Runs xmllint against the IRS XSD files in .state/research/docs/IMF_Series_2025v5.4/.
 * Any structural issue (wrong element order, missing required field, bad namespace,
 * type mismatch) surfaces as a test failure before it can reach the IRS.
 *
 * Requires: xmllint (pre-installed on macOS/Linux via libxml2)
 * Permissions: --allow-read --allow-write --allow-run=xmllint
 */

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { f1040_2025 } from "../2025/index.ts";
import { form8995 } from "../2025/mef/forms/f8995.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { SS_WAGE_BASE_2025 } from "../nodes/config/2025.ts";
import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../nodes/inputs/general/index.ts";
import { Box12Code } from "../nodes/inputs/w2/index.ts";
import {
  SCENARIO_1040_01_FACTS,
  SCENARIO_1040_02_FACTS,
  SCENARIO_1040_04_FACTS,
  SCENARIO_1040_05_FACTS,
  SCENARIO_1040_12_FACTS,
  SCENARIO_1040_13_FACTS,
} from "./ats/ty2025_cases.ts";
import { scenario104008Input } from "./ats/scenario_1040_08_input.ts";
import { pdfReviewFixtures } from "../2025/pdf/review-fixtures.ts";

// ── XSD paths ────────────────────────────────────────────────────────────────

const XSD_RETURN1040 = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

// Skip XSD tests when the IRS schema files are not present locally.
let xsdAvailable = false;
try {
  Deno.statSync(XSD_RETURN1040);
  xsdAvailable = true;
} catch {
  // .research/docs not checked in; skip on machines without the IRS schema bundle
}

// ── Shared setup ─────────────────────────────────────────────────────────────

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

/** Generate MeF XML from an execution result. */
function buildXml(result: ExecuteResult): string {
  const pending = f1040_2025.buildPending(result.pending) as Record<
    string,
    unknown
  >;
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);
  return f1040_2025.buildMefXml(pending, filer);
}

/** Validate only the source-backed documents named by a partial-slice test. */
function buildXmlSlice(
  result: ExecuteResult,
  pendingKeys: readonly string[],
): string {
  const selected = Object.fromEntries(
    pendingKeys.map((key) => [key, result.pending[key]]),
  );
  const pending = f1040_2025.buildPending(selected) as Record<string, unknown>;
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);
  return f1040_2025.buildMefXml(pending, filer);
}

/**
 * Write XML to a temp file, validate with xmllint, clean up.
 * Returns stderr output (empty string on success).
 */
async function validateXml(
  xml: string,
  schema = XSD_RETURN1040,
): Promise<{ success: boolean; stderr: string }> {
  const tmpFile = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpFile, xml);
    const cmd = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, tmpFile],
      stderr: "piped",
      stdout: "null",
    });
    const { code, stderr } = await cmd.output();
    return {
      success: code === 0,
      stderr: new TextDecoder().decode(stderr).trim(),
    };
  } finally {
    await Deno.remove(tmpFile).catch(() => {});
  }
}

// ── Input helpers (mirrors scenarios.test.ts) ────────────────────────────────

// Use dashes-free SSNs (IRS SSNType: [0-9]{9}) and a valid address for XSD compliance.
const BASE_IDENTITY = {
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111223333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  address_line1: "123 Main St",
  address_city: "Springfield",
  address_state: "IL",
  address_zip: "62701",
};

function singleGeneral() {
  return { ...BASE_IDENTITY, filing_status: FilingStatus.Single };
}

function mfjGeneral() {
  return {
    ...BASE_IDENTITY,
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Spouse",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "444556666",
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
    spouse_dob: "1987-03-10",
  };
}

function hohGeneral() {
  return { ...BASE_IDENTITY, filing_status: FilingStatus.HOH };
}

function w2Item(wages: number, withheld: number) {
  const ssWages = Math.min(wages, SS_WAGE_BASE_2025);
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: ssWages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    employer_address_line1: "2 Payroll Road",
    employer_address_city: "Springfield",
    employer_address_state: "IL",
    employer_address_zip: "62701",
    box12_entries: [],
  };
}

// ── XSD Validation Tests ─────────────────────────────────────────────────────

Deno.test({
  name: "XSD: Single W-2 $75K — conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(75_000, 11_000)],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: the digital-asset Yes answer survives the full return graph",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: { ...singleGeneral(), digital_assets: true },
    w2: [w2Item(75_000, 11_000)],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildXml(result);
  assertStringIncludes(
    xml,
    "<VirtualCurAcquiredDurTYInd>true</VirtualCurAcquiredDurTYInd>",
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: household wages and Schedule 1 income reach Form 1040 lines 1b, 1z, and 8",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: singleGeneral(),
    household_wages: [{ wages_received: 2_000 }],
    f1099g: [{ box_1_unemployment: 1_000 }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildXml(result);
  assertStringIncludes(
    xml,
    "<HouseholdEmployeeWagesAmt>2000</HouseholdEmployeeWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<WagesSalariesAndTipsAmt>2000</WagesSalariesAndTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalIncomeAmt>1000</TotalAdditionalIncomeAmt>",
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: age and blindness answers reach Form 1040 line 12d",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: {
      ...singleGeneral(),
      taxpayer_dob: "1950-06-15",
      taxpayer_blind: true,
    },
    w2: [w2Item(180_000, 20_000)],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildXml(result);
  assertStringIncludes(xml, "<Primary65OrOlderInd>X</Primary65OrOlderInd>");
  assertStringIncludes(xml, "<PrimaryBlindInd>X</PrimaryBlindInd>");
  assertStringIncludes(xml, "<TotalBoxesCheckedCnt>2</TotalBoxesCheckedCnt>");
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: ATS 1040 Scenario 1 Schedule H and Schedule 2 slice conforms to v5.4",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_01_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.Single,
    },
    schedule_h: {
      employer_ein: facts.scheduleH.employerEin,
      cash_wages_over_2025_limit: facts.scheduleH.cashWagesOver2025Limit,
      cash_wages_over_quarter_limit: facts.scheduleH.cashWagesOverQuarterLimit,
      ss_wages: facts.scheduleH.socialSecurityWages,
      medicare_wages: facts.scheduleH.medicareWages,
      federal_income_tax_withheld: facts.scheduleH.federalWithholding,
    },
  });
  const xml = buildXml(result);
  assertEquals(xml.includes("<IRS1040ScheduleH"), true);
  assertEquals(
    xml.includes("<HouseholdEmploymentTaxAmt>474</HouseholdEmploymentTaxAmt>"),
    true,
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: ATS 1040 Scenario 4 W-2 slice conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_04_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: facts.taxpayer.digitalAssets,
    },
    w2: [{
      box1_wages: facts.w2.box1Wages,
      box2_fed_withheld: facts.w2.box2FederalWithholding,
      box3_ss_wages: facts.w2.box3SocialSecurityWages,
      box4_ss_withheld: facts.w2.box4SocialSecurityWithholding,
      box5_medicare_wages: facts.w2.box5MedicareWages,
      box6_medicare_withheld: facts.w2.box6MedicareWithholding,
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
      employer_address_line1: facts.w2.employerAddress.line1,
      employer_address_city: facts.w2.employerAddress.city,
      employer_address_state: facts.w2.employerAddress.state,
      employer_address_zip: facts.w2.employerAddress.zip,
      box12_entries: [],
    }],
  });
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const xml = buildXmlSlice(result, ["f1040", "w2"]);
  assertEquals((xml.match(/<IRSW2 documentId=/g) ?? []).length, 1);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: ATS 1040 Scenario 5 identity, dependents, and W-2 slice conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_05_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      taxpayer_blind: facts.taxpayer.blind,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.HOH,
      digital_assets: facts.taxpayer.digitalAssets,
      presidential_campaign_fund_taxpayer:
        facts.taxpayer.presidentialCampaignFund,
      dependents: facts.dependents.map((dependent) => ({
        first_name: dependent.firstName,
        last_name: dependent.lastName,
        name_control: dependent.lastName.slice(0, 4).toUpperCase(),
        ssn: dependent.ssn,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        dob: dependent.dateOfBirth,
        relationship: dependent.relationship === "son"
          ? DependentRelationship.Son
          : DependentRelationship.Daughter,
        irs_relationship_code: dependent.relationship === "son"
          ? IRSDependentRelationshipCode.Son
          : IRSDependentRelationshipCode.Daughter,
        months_in_home: dependent.monthsInHome,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        qualifying_child_for_ctc: dependent.childTaxCredit,
      })),
    },
    w2: [{
      box1_wages: facts.w2.box1Wages,
      box2_fed_withheld: facts.w2.box2FederalWithholding,
      box3_ss_wages: facts.w2.box3SocialSecurityWages,
      box4_ss_withheld: facts.w2.box4SocialSecurityWithholding,
      box5_medicare_wages: facts.w2.box5MedicareWages,
      box6_medicare_withheld: facts.w2.box6MedicareWithholding,
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
      employer_address_line1: facts.w2.employerAddress.line1,
      employer_address_city: facts.w2.employerAddress.city,
      employer_address_state: facts.w2.employerAddress.state,
      employer_address_zip: facts.w2.employerAddress.zip,
      box12_entries: [],
    }],
  });
  assertEquals(result.diagnostics.length, 1);
  assertEquals(result.diagnostics[0].nodeType, "f8812");
  assertStringIncludes(
    result.diagnostics[0].message,
    "needs complete Credit Limit Worksheet A and B answers",
  );
  const xml = buildXmlSlice(result, ["f1040", "w2"]);
  assertEquals((xml.match(/<IRSW2 documentId=/g) ?? []).length, 1);
  assertEquals(
    (xml.match(/<DependentDetail>/g) ?? []).length,
    facts.dependents.length,
  );
  assertStringIncludes(xml, "<DependentNameControlTxt>");
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: qualifying relatives retain grandparent and in-law relationship codes",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: {
      ...singleGeneral(),
      dependents: [
        {
          first_name: "Mira",
          last_name: "Taxpayer",
          name_control: "TAXP",
          itin: "900123456",
          tin_issued_by_due_date: true,
          dob: "1960-01-01",
          relationship: DependentRelationship.Grandparent,
          irs_relationship_code: IRSDependentRelationshipCode.Grandparent,
          months_in_home: 0,
          us_citizen_national_or_resident: true,
          filed_joint_return_except_refund_only: false,
          taxpayer_provided_over_half_support: true,
          gross_income: 0,
        },
        {
          first_name: "Pia",
          last_name: "Taxpayer",
          name_control: "TAXP",
          itin: "900123457",
          tin_issued_by_due_date: true,
          dob: "1965-01-01",
          relationship: DependentRelationship.ParentInLaw,
          irs_relationship_code: IRSDependentRelationshipCode.Other,
          months_in_home: 0,
          us_citizen_national_or_resident: true,
          filed_joint_return_except_refund_only: false,
          taxpayer_provided_over_half_support: true,
          gross_income: 0,
        },
      ],
    },
    w2: [w2Item(75_000, 10_000)],
  });
  const xml = buildXmlSlice(result, ["f1040", "w2"]);
  assertStringIncludes(
    xml,
    "<DependentRelationshipCd>GRANDPARENT</DependentRelationshipCd>",
  );
  assertStringIncludes(
    xml,
    "<DependentRelationshipCd>OTHER</DependentRelationshipCd>",
  );
  assertEquals((xml.match(/<EligibleForODCInd>/g) ?? []).length, 2);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: ATS 1040 Scenario 2 W-2, Schedule C, and Form 8283 slice conforms to v5.4",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_02_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.MFJ,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: facts.w2.map((form) => ({
      employee_ssn: form.employeeSsn,
      box1_wages: form.box1Wages,
      box2_fed_withheld: form.box2FederalWithholding,
      box3_ss_wages: form.box3SocialSecurityWages,
      box4_ss_withheld: form.box4SocialSecurityWithholding,
      box5_medicare_wages: form.box5MedicareWages,
      box6_medicare_withheld: form.box6MedicareWithholding,
      box13_statutory_employee: form.statutoryEmployee,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
      employer_address_line1: form.employerAddress.line1,
      employer_address_line2: "line2" in form.employerAddress
        ? form.employerAddress.line2
        : undefined,
      employer_address_city: form.employerAddress.city,
      employer_address_state: form.employerAddress.state,
      employer_address_zip: form.employerAddress.zip,
      box12_entries: [],
    })),
    schedule_c: [{
      business_reference: "ATS02-STATUTORY-C",
      line_c_business_name:
        `${facts.taxpayer.firstName} ${facts.taxpayer.lastName}`,
      qbi_no_other_adjustments_confirmed: true,
      proprietor_recipient: "T",
      line_a_principal_business: facts.scheduleC.businessDescription,
      line_b_business_code: facts.scheduleC.businessCode,
      line_e_business_address: facts.scheduleC.businessAddress,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      statutory_employee: true,
      // The IRS PDF leaves line 1 blank; this amount comes from its statutory W-2.
      line_1_gross_receipts: facts.w2[0].box1Wages,
      line_8_advertising: facts.scheduleC.advertising,
      line_9_car_truck_expenses: facts.scheduleC.carAndTruckExpenses,
      line_19_pension_plans: facts.scheduleC.pensionAndProfitSharing,
      line_22_supplies: facts.scheduleC.supplies,
      line_23_taxes_licenses: facts.scheduleC.taxesAndLicenses,
      line_44b_business_miles: facts.scheduleC.businessMiles,
      line_44c_commuting_miles: facts.scheduleC.commutingMiles,
      line_44d_other_miles: facts.scheduleC.otherMiles,
    }],
    f8283: {
      section_a_items: [{
        donee_organization_name: facts.form8283.donee,
        property_description: facts.form8283.propertyDescription,
        date_contributed: facts.form8283.donationDate,
        cost_or_adjusted_basis: facts.form8283.costBasis,
        fmv: facts.form8283.fairMarketValue,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      }],
    },
  });
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const xml = buildXml(result);
  assertEquals((xml.match(/<IRSW2 documentId=/g) ?? []).length, 2);
  assertEquals((xml.match(/<IRS1040ScheduleC documentId=/g) ?? []).length, 1);
  assertEquals((xml.match(/<IRS8283 documentId=/g) ?? []).length, 1);
  assertEquals(
    xml.includes("<FairMarketValueAmt>700</FairMarketValueAmt>"),
    true,
  );
  assertEquals(xml.includes("<WagesAmt>8513</WagesAmt>"), true);
  assertEquals(
    xml.includes("<TotalGrossReceiptsAmt>29513</TotalGrossReceiptsAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<NetProfitOrLossAmt>26979</NetProfitOrLossAmt>"),
    true,
  );
  const sourcedW2 = result.pending.w2 as { w2s: Record<string, unknown>[] };
  assertThrows(
    () =>
      form8995.build(result.pending.form8995, {
        pending: {
          ...result.pending,
          w2: {
            ...sourcedW2,
            w2s: sourcedW2.w2s.map((item) =>
              item.box13_statutory_employee === true
                ? { ...item, box13_statutory_employee: false }
                : item
            ),
          },
        },
      }),
    Error,
    "source reconciliation",
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: ATS 1040 Scenario 12 W-2, Schedule C, and Form 7217 slice conforms to v5.4",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_12_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: facts.taxpayer.digitalAssets,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: [{
      box1_wages: facts.w2.box1Wages,
      box2_fed_withheld: facts.w2.box2FederalWithholding,
      box3_ss_wages: facts.w2.box3SocialSecurityWages,
      box4_ss_withheld: facts.w2.box4SocialSecurityWithholding,
      box5_medicare_wages: facts.w2.box5MedicareWages,
      box6_medicare_withheld: facts.w2.box6MedicareWithholding,
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
      employer_address_line1: facts.w2.employerAddress.line1,
      employer_address_city: facts.w2.employerAddress.city,
      employer_address_state: facts.w2.employerAddress.state,
      employer_address_zip: facts.w2.employerAddress.zip,
      box12_entries: [{ code: Box12Code.DD, amount: facts.w2.box12CodeDD }],
      box13_retirement_plan: facts.w2.retirementPlanChecked,
      box15_state: facts.taxpayer.address.state,
      box16_state_wages: facts.w2.stateWages,
      box17_state_withheld: facts.w2.stateWithholding,
    }],
    schedule_c: [{
      business_reference: "ATS12-SCHEDULE-C",
      qbi_no_other_adjustments_confirmed: true,
      line_a_principal_business: facts.scheduleC.principalBusiness,
      line_b_business_code: facts.scheduleC.businessCode,
      line_c_business_name: facts.scheduleC.businessName,
      line_e_business_address: facts.scheduleC.businessAddress,
      line_f_accounting_method: "cash",
      line_g_material_participation: facts.scheduleC.materialParticipation,
      line_i_made_1099_payments: facts.scheduleC.made1099Payments,
      line_1_gross_receipts: facts.scheduleC.grossReceipts,
      line_15_insurance: facts.scheduleC.insurance,
      line_17_professional_services: facts.scheduleC.professionalServices,
      line_18_office_expense: facts.scheduleC.officeExpense,
      line_20b_rent_other: facts.scheduleC.rentOtherBusinessProperty,
      line_22_supplies: facts.scheduleC.supplies,
      line_23_taxes_licenses: facts.scheduleC.taxesAndLicenses,
    }],
    f7217: {
      form7217s: [{
        partnership_name: facts.form7217.partnershipName,
        partnership_ein: facts.form7217.partnershipEin,
        distribution_date: facts.form7217.distributionDate,
        complete_liquidation: facts.form7217.completeLiquidation,
        section_751b_sale_or_exchange: facts.form7217.section751bSaleOrExchange,
        partner_adjusted_basis_before_distribution:
          facts.form7217.partnerAdjustedBasisBeforeDistribution,
        cash_received: facts.form7217.cashReceived,
        distributed_properties: facts.form7217.distributedProperties.map((
          property,
        ) => ({
          // The ATS printout's CASH Part II row totals 4,000 against line 10's
          // 6,000; use a separately reconciled noncash property for this XSD case.
          description: "EQUIPMENT",
          property_treatment: "section732_property",
          partnership_basis_before_distribution:
            property.partnershipBasisBeforeDistribution,
          section_734b_basis_adjustment: property.section734bBasisAdjustment,
          fair_market_value: 9_000,
          partner_basis_after_section_732: 6_000,
        })),
      }],
    },
  });
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const xml = buildXml(result);
  assertEquals((xml.match(/<IRSW2 documentId=/g) ?? []).length, 1);
  assertEquals((xml.match(/<IRS1040ScheduleC documentId=/g) ?? []).length, 1);
  assertEquals((xml.match(/<IRS7217 documentId=/g) ?? []).length, 1);
  const qbiXml = xml.match(/<IRS8995[^>]*>[\s\S]*?<\/IRS8995>/)?.[0] ?? "";
  assertStringIncludes(qbiXml, "<SSN>400001212</SSN>");
  assertEquals(
    xml.includes("<NetProfitOrLossAmt>24328</NetProfitOrLossAmt>"),
    true,
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: ATS 1040 Scenario 13 W-2 slice conforms to configured v5.4 schema",
  ignore: !xsdAvailable,
}, async () => {
  const facts = SCENARIO_1040_13_FACTS;
  const result = runReturn({
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.MFJ,
      digital_assets: facts.taxpayer.digitalAssets,
    },
    w2: [{
      box1_wages: facts.w2.box1Wages,
      box2_fed_withheld: facts.w2.box2FederalWithholding,
      box3_ss_wages: facts.w2.box3SocialSecurityWages,
      box4_ss_withheld: facts.w2.box4SocialSecurityWithholding,
      box5_medicare_wages: facts.w2.box5MedicareWages,
      box6_medicare_withheld: facts.w2.box6MedicareWithholding,
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
      employer_address_line1: facts.w2.employerAddress.line1,
      employer_address_city: facts.w2.employerAddress.city,
      employer_address_state: facts.w2.employerAddress.state,
      employer_address_zip: facts.w2.employerAddress.zip,
      box12_entries: [],
    }],
  });
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const xml = buildXml(result);
  assertEquals((xml.match(/<IRSW2 documentId=/g) ?? []).length, 1);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: ATS 1040 Scenario 8 1099-R statements conform to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn(scenario104008Input());
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const xml = buildXml(result);
  assertEquals((xml.match(/<IRS1099R documentId=/g) ?? []).length, 2);
  assertEquals(xml.includes("<IRS1040ScheduleD"), false);
  assertEquals(xml.includes("<SocSecBnftAmt>1000</SocSecBnftAmt>"), true);
  assertEquals(xml.includes("<TaxableSocSecAmt>"), false);
  assertEquals(
    xml.includes("<TotalTaxablePensionsAmt>10300</TotalTaxablePensionsAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<CapitalGainLossAmt>7500</CapitalGainLossAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<CapitalDistributionInd>X</CapitalDistributionInd>"),
    true,
  );
  assertEquals(xml.includes("<TotalIncomeAmt>17800</TotalIncomeAmt>"), true);
  assertEquals(
    xml.includes("<MFSLiveApartEntireYrInd>X</MFSLiveApartEntireYrInd>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<TotalItemizedOrStandardDedAmt>17350</TotalItemizedOrStandardDedAmt>",
    ),
    true,
  );
  assertEquals(xml.includes("<TaxableIncomeAmt>450</TaxableIncomeAmt>"), true);
  assertEquals(
    xml.includes("<Form1099WithheldTaxAmt>2555</Form1099WithheldTaxAmt>"),
    true,
  );
  assertEquals(xml.includes("<RefundAmt>2555</RefundAmt>"), true);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: MFJ dual W-2s $150K — conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [
      w2Item(85_000, 10_200),
      {
        ...w2Item(65_000, 7_800),
        employer_ein: "98-7654321",
        employer_name: "Beta Inc",
      },
    ],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: Single self-employed Schedule C $80K — conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing sourced Schedule C fixture");
  const result = runReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: Single itemized deductions Schedule A $33K — conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(200_000, 40_000)],
    schedule_a: {
      line_5a_state_income_tax: 10_000,
      line_8a_mortgage_interest_1098: 18_000,
      cash_contributions_to_50_percent_organizations: 5_000,
    },
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: Single AMT via PAB interest $100K — conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 18_000)],
    f1099int: [{
      payer_name: "Muni Bond Fund",
      box8: 100_000,
      box9: 100_000,
    }],
  });
  const xml = buildXml(result);
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name:
    "XSD: HOH EITC and W-2 source slice with 2 children conforms to Return1040.xsd",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: {
      ...hohGeneral(),
      dependents: [
        {
          first_name: "Alice",
          last_name: "Taxpayer",
          name_control: "TAXP",
          dob: "2017-06-15",
          relationship: DependentRelationship.Son,
          irs_relationship_code: IRSDependentRelationshipCode.Son,
          months_in_home: 12,
          lived_in_us_over_half_year: true,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
          ssn: "111-22-3334",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
        },
        {
          first_name: "Bobby",
          last_name: "Taxpayer",
          name_control: "TAXP",
          dob: "2015-03-20",
          relationship: DependentRelationship.Daughter,
          irs_relationship_code: IRSDependentRelationshipCode.Daughter,
          months_in_home: 12,
          lived_in_us_over_half_year: true,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
          ssn: "111-22-3335",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
        },
      ],
    },
    w2: [w2Item(32_000, 3_500)],
  });
  const xml = buildXmlSlice(result, ["f1040", "eitc", "w2"]);
  assertEquals((xml.match(/<DependentDetail>/g) ?? []).length, 2);
  assertEquals((xml.match(/<IRS1040ScheduleEIC documentId=/g) ?? []).length, 1);
  assertEquals((xml.match(/<QualifyingChildInformation>/g) ?? []).length, 2);
  assertStringIncludes(xml, 'referenceDocumentName="IRS1040ScheduleEIC"');
  assertStringIncludes(
    xml,
    "<ChldWhoLivedWithYouCnt>2</ChldWhoLivedWithYouCnt>",
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});

Deno.test({
  name: "XSD: childless EITC does not emit Schedule EIC",
  ignore: !xsdAvailable,
}, async () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(12_000, 500)],
  });
  const xml = buildXmlSlice(result, ["f1040", "eitc", "w2"]);
  assertStringIncludes(xml, "<EarnedIncomeCreditAmt>");
  assertEquals(xml.includes("<IRS1040ScheduleEIC"), false);
  assertEquals(
    xml.includes('referenceDocumentName="IRS1040ScheduleEIC"'),
    false,
  );
  const { success, stderr } = await validateXml(xml);
  assertEquals(success, true, `xmllint errors:\n${stderr}`);
});
