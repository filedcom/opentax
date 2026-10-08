import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { FilingStatus as ReturnFilingStatus } from "../../../../nodes/types.ts";
import {
  inputSchema,
  schedule_h,
} from "../../../../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleHPdf } from "../../../pdf/forms/taxes/schedule_h.ts";
import { registry } from "../../../registry.ts";
import { buildMefXml } from "../../builder.ts";
import { buildPending } from "../../execution/pending.ts";
import { scheduleH } from "./schedule_h.ts";

const general = {
  filing_status: ReturnFilingStatus.MFJ,
  taxpayer_first_name: "Tara",
  taxpayer_last_name: "Black",
  taxpayer_ssn: "400-00-1032",
  taxpayer_dob: "1980-04-10",
  digital_assets: false,
  spouse_first_name: "Sam",
  spouse_last_name: "Black",
  spouse_ssn: "400-00-1041",
  address_line1: "17 Lexington Drive",
  address_city: "Cincinnati",
  address_state: "OH",
  address_zip: "45223",
};
const source = {
  employer_ein: "123456789",
  cash_wages_over_2025_limit: false,
  cash_wages_over_quarter_limit: false,
  federal_income_tax_withheld: 250,
  family_withholding_only_payroll: {
    all_household_employees_included: true,
    employer_ssn: "400001032",
    employee: {
      employee_id: "spouse-employee-1",
      employee_ssn: "400001041",
      relationship: "spouse",
      relationship_source_reference: "spouse-relationship-review",
      marriage_date: "2010-06-15",
      marriage_source_reference: "marriage-certificate-review",
      marriage_continuity_source_reference: "2025-marriage-continuity-review",
      married_through_2025_verified: true,
      payroll_source_reference: "2025-spouse-payroll-ledger",
      ordinary_cash_only: true,
      annual_cash_wages: 5_000,
      quarterly_cash_wages: [1_250, 1_250, 1_250, 1_250],
      federal_income_tax_withholding_requested_and_agreed: true,
      w4_source_reference: "2025-spouse-form-w4",
      w2: {
        source_reference: "2025-spouse-form-w2",
        employee_ssn: "400001041",
        box1_wages: 5_000,
        box2_federal_income_tax_withheld: 250,
        box3_social_security_wages: 0,
        box5_medicare_wages: 0,
      },
    },
  },
} as const;
const w2 = {
  employee_ssn: "400-00-1041",
  employer_name: "Tara Black",
  employer_ein: "123456789",
  employer_address_line1: "17 Lexington Drive",
  employer_address_city: "Cincinnati",
  employer_address_state: "OH",
  employer_address_zip: "45223",
  box1_wages: 5_000,
  box2_fed_withheld: 250,
  box3_ss_wages: 0,
  box4_ss_withheld: 0,
  box5_medicare_wages: 0,
  box6_medicare_withheld: 0,
};

Deno.test("Schedule H spouse withholding source joins W-2, Form 1040, Schedule 2, native and PDF", () => {
  const filed = inputSchema.parse(source);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2],
    schedule_h: filed,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line9_household_employment, 250);
  assertEquals(result.pending.f1040?.line1a_wages, 5_000);
  assertEquals(result.pending.f1040?.line25a_w2_withheld, 250);
  assertEquals(result.pending.f1040?.line23_other_taxes, 250);
  const filer = extractFilerIdentity(general);
  assert(filer?.spouse);
  const xml = scheduleH.build(filed, { filer, pending: result.pending });
  assertStringIncludes(
    xml,
    "<HsldEmplFedIncmTaxWithheldInd>true</HsldEmplFedIncmTaxWithheldInd>",
  );
  assertStringIncludes(
    xml,
    "<FederalIncomeTaxWithheldAmt>250</FederalIncomeTaxWithheldAmt>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>250</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  assertEquals(xml.includes("<FUTATaxAmt>"), false);
  assertEquals(xml.includes("<SocialSecurityTaxAmt>"), false);
  const fullReturnXml = buildMefXml(
    buildPending(result.pending),
    filer,
  );
  assertStringIncludes(fullReturnXml, "<IRS1040ScheduleH ");
  assertStringIncludes(fullReturnXml, "<WagesAmt>5000</WagesAmt>");
  assertStringIncludes(
    fullReturnXml,
    "<FormW2WithheldTaxAmt>250</FormW2WithheldTaxAmt>",
  );
  const projected = scheduleHPdf.projectFields!(filed, {});
  assertEquals(projected.line8_fica_and_withholding, 250);
  assertEquals(projected.box_b_federal_withheld, true);
  assertEquals(projected.box_c_quarter_limit, undefined);
  assertEquals(projected.line6_additional_medicare_tax, undefined);
  assertEquals(projected.line9_quarter_limit, false);
  assertEquals(scheduleHPdf.pageIndices?.(projected), [0]);
  assertEquals(
    scheduleHPdf.instances?.(projected, filer, result.pending)?.length,
    1,
  );
});

Deno.test("Schedule H spouse source and export reject marriage, W-2, spouse identity and return drift", () => {
  const filed = inputSchema.parse(source);
  const result = execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [w2],
    schedule_h: filed,
  }, { taxYear: 2025, formType: "f1040" });
  const filer = extractFilerIdentity(general);
  assert(filer?.spouse);
  const employee = source.family_withholding_only_payroll.employee;
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...source,
        family_withholding_only_payroll: {
          ...source.family_withholding_only_payroll,
          employee: { ...employee, marriage_date: "2025-06-15" },
        },
      }),
    )
  );
  assertThrows(() =>
    scheduleH.build(filed, {
      filer: {
        ...filer,
        spouse: { ...filer.spouse!, ssn: "400-00-1099" },
      },
      pending: result.pending,
    })
  );
  assertThrows(() =>
    scheduleH.build(filed, {
      filer,
      pending: {
        ...result.pending,
        w2: { w2s: [{ ...w2, box2_fed_withheld: 249 }] },
      },
    })
  );
  assertThrows(() =>
    scheduleH.build(filed, {
      filer,
      pending: {
        ...result.pending,
        f1040: { ...result.pending.f1040, line23_other_taxes: 249 },
      },
    })
  );
  assertThrows(() =>
    scheduleHPdf.instances?.(
      scheduleHPdf.projectFields!(filed, {}),
      filer,
      { ...result.pending, schedule2: { line9_household_employment: 249 } },
    )
  );
});
