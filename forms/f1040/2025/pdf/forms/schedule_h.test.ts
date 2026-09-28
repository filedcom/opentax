import { assertEquals, assertThrows } from "@std/assert";
import { SCENARIO_1040_01_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { type FilerIdentity, FilingStatus } from "../../mef/types.ts";
import { scheduleHPdf } from "./schedule_h.ts";

const facts = SCENARIO_1040_01_FACTS;
const source = {
  employer_ein: facts.scheduleH.employerEin,
  cash_wages_over_2025_limit: facts.scheduleH.cashWagesOver2025Limit,
  cash_wages_over_quarter_limit: facts.scheduleH.cashWagesOverQuarterLimit,
  ss_wages: facts.scheduleH.socialSecurityWages,
  medicare_wages: facts.scheduleH.medicareWages,
  additional_medicare_wages: facts.scheduleH.additionalMedicareWages,
  federal_income_tax_withheld: facts.scheduleH.federalWithholding,
};
const filer: FilerIdentity = {
  primarySSN: facts.taxpayer.ssn,
  nameLine1: `${facts.taxpayer.firstName} ${facts.taxpayer.lastName}`,
  fullName: `${facts.taxpayer.firstName} ${facts.taxpayer.lastName}`,
  nameControl: "BLAC",
  filingStatus: FilingStatus.Single,
  address: facts.taxpayer.address,
};

Deno.test("ATS Scenario 1 Schedule H PDF prints sourced Part I on the 2025 widgets", () => {
  const projected = scheduleHPdf.projectFields?.(source, {}) ?? {};
  assertEquals(projected.line2_social_security_tax, 384);
  assertEquals(projected.line4_medicare_tax, 90);
  assertEquals(projected.line8_fica_and_withholding, 474);
  const map = new Map(
    scheduleHPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  const filerMap = new Map(
    scheduleHPdf.filerFields?.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(filerMap.get("nameLine1"), "topmostSubform[0].Page1[0].f1_1[0]");
  assertEquals(
    filerMap.get("primarySSN"),
    "topmostSubform[0].Page1[0].f1_2[0]",
  );
  assertEquals(
    map.get("employer_ein"),
    "topmostSubform[0].Page1[0].CombField[0].f1_3[0]",
  );
  assertEquals(map.get("ss_wages"), "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(
    map.get("line2_social_security_tax"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(
    map.get("line4_medicare_tax"),
    "topmostSubform[0].Page1[0].f1_7[0]",
  );
  assertEquals(
    map.get("line8_fica_and_withholding"),
    "topmostSubform[0].Page1[0].f1_11[0]",
  );
  assertEquals(
    scheduleHPdf.fields.find((entry) =>
      entry.domainKey === "cash_wages_over_quarter_limit" &&
      entry.kind === "checkboxWhen" && entry.whenValue === "false"
    )?.pdfField,
    "topmostSubform[0].Page1[0].c1_4[0]",
  );
  const pending = {
    schedule_h: source,
    schedule2: { line9_household_employment: 474 },
  };
  assertEquals(scheduleHPdf.instances?.(projected, filer, pending)?.length, 1);
  assertThrows(
    () =>
      scheduleHPdf.instances?.(projected, filer, {
        ...pending,
        schedule2: { line9_household_employment: 473 },
      }),
    Error,
    "reconcile to Schedule 2 line 9",
  );
});

Deno.test("Schedule H PDF maps Section A FUTA and Part III to the 2025 widgets", () => {
  const sectionA = {
    ...source,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 3_100,
    },
  };
  const projected = scheduleHPdf.projectFields?.(sectionA, {}) ?? {};
  assertEquals(projected.section_a_state, "OH");
  assertEquals(projected.section_a_contributions, 100);
  assertEquals(projected.section_a_taxable_wages, 3_100);
  assertEquals(projected.section_a_futa_tax, 19);
  assertEquals(projected.line25_fica_and_withholding, 474);
  assertEquals(projected.line26_total_tax, 493);
  const map = new Map(
    scheduleHPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    map.get("section_a_state"),
    "topmostSubform[0].Page2[0].f2_1[0]",
  );
  assertEquals(
    map.get("section_a_futa_tax"),
    "topmostSubform[0].Page2[0].f2_4[0]",
  );
  assertEquals(
    map.get("line26_total_tax"),
    "topmostSubform[0].Page2[0].f2_32[0]",
  );
  assertEquals(
    scheduleHPdf.instances?.(projected, filer, {
      schedule_h: sectionA,
      schedule2: { line9_household_employment: 493 },
    })?.length,
    1,
  );
});

Deno.test("Schedule H PDF maps two Section B rows, totals, and worksheet indicator", () => {
  const sectionB = {
    ...source,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 3_000,
      state_rows: [
        {
          state: "OH",
          taxable_state_wages: 1_000,
          experience_rate: 0.03,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 30,
        },
        {
          state: "NY",
          taxable_state_wages: 2_000,
          experience_rate: 0.03,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 60,
        },
      ],
    },
  };
  const projected = scheduleHPdf.projectFields?.(sectionB, {}) ?? {};
  assertEquals(projected.row1_rate_from, "01/01/25");
  assertEquals(projected.row1_experience_rate, "3%");
  assertEquals(projected.row1_additional_credit, 24);
  assertEquals(projected.row2_additional_credit, 48);
  assertEquals(projected.line18_additional_credit, 72);
  assertEquals(projected.line18_contributions, 90);
  assertEquals(projected.line19_tentative_credit, 162);
  assertEquals(projected.line23_allowed_credit, 162);
  assertEquals(projected.line24_futa_tax, 18);
  assertEquals(projected.line26_total_tax, 492);
  assertEquals(
    scheduleHPdf.instances?.(projected, filer, {
      schedule_h: sectionB,
      schedule2: { line9_household_employment: 492 },
    })?.length,
    1,
  );
  assertThrows(
    () =>
      scheduleHPdf.instances?.(
        { ...projected, row2_contributions: 61 },
        filer,
        {
          schedule_h: sectionB,
          schedule2: { line9_household_employment: 492 },
        },
      ),
    Error,
    "differ from the pending source",
  );
  const map = new Map(
    scheduleHPdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    map.get("row2_contributions"),
    "topmostSubform[0].Page2[0].Table_Line17[0].BodyRow2[0].f2_22[0]",
  );
});

Deno.test("Schedule H PDF retains additional Section B rows for line 17 continuation", () => {
  const projected = scheduleHPdf.projectFields?.({
    ...source,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 3_100,
      state_rows: ["OH", "NY", "PA"].map((state) => ({
        state,
        taxable_state_wages: 1_000,
        contributions_paid_by_due_date: 30,
      })),
    },
  }, {}) ?? {};
  const continuation = projected.section_b_continuation as Array<{
    state: string;
  }>;
  assertEquals(continuation.map((row) => row.state), ["PA"]);
  assertEquals(projected.row1_state, "OH");
  assertEquals(projected.row2_state, "NY");
  assertEquals(projected.line18_contributions, 90);
  assertEquals(typeof scheduleHPdf.appendSupplementalPages, "function");
});
