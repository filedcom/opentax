import {
  assertPerformingArtistQualifications,
  calculateForm2106Lines,
  EmployeeType,
  itemSchema,
  VehicleMethod,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import type { Form2106Lines } from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { inputSchema as form2106InputSchema } from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import type { PdfFieldEntry } from "../../../../pdf/review-support/form-descriptor.ts";
import { z } from "zod";
import { inputSchema as w2InputSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";

// Shared canonical projection. Registered exporters admit only the sourced
// employee routes guarded by reconcileFileableForm2106Return.
export function prepareForm2106(raw: unknown) {
  const source = itemSchema.parse(raw);
  const lines = calculateForm2106Lines(source);
  if (
    source.job.employee_name.length > 35 ||
    !/^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/.test(
      source.job.employee_name,
    ) ||
    source.job.occupation.length > 25
  ) {
    throw new Error("Form 2106 name or occupation exceeds MeF limits");
  }
  if (lines.excess_nonmeal_reimbursement_to_1040_line1a > 0) {
    throw new Error(
      "Form 2106 excess reimbursement must reconcile to Form 1040 line 1a and W-2",
    );
  }
  const route = source.qualification.kind === EmployeeType.DISABLED_IMPAIRMENT
    ? "schedule_a_line16"
    : "schedule1_line12";
  return {
    source,
    lines,
    contribution: {
      employment_record_reference: source.job.employment_record_reference,
      owner: source.job.owner,
      route,
      amount: lines.line10_deduction,
      form1040_line1a_excess_reimbursement: 0,
    },
  } as const;
}

const pendingRecordSchema = z.record(z.string(), z.unknown());
const normalizedName = (name: string) =>
  name.trim().toUpperCase().replace(/\s+/g, " ");

/** Qualified employee jobs with sourced expenses and no excess reimbursements. */
export function isSupportedForm2106Route(raw: unknown): boolean {
  const parsed = form2106InputSchema.safeParse(raw);
  // TY2025 ReturnData1040.xsd permits at most four IRS2106 documents.
  if (!parsed.success || parsed.data.f2106s.length > 4) return false;
  return parsed.data.f2106s.every((item) => {
    if (
      (item.qualification.kind !== EmployeeType.FEE_BASIS_OFFICIAL &&
        item.qualification.kind !== EmployeeType.DISABLED_IMPAIRMENT &&
        item.qualification.kind !== EmployeeType.PERFORMING_ARTIST) ||
      item.vehicle.method === VehicleMethod.ACTUAL_EXPENSE
    ) return false;
    const lines = calculateForm2106Lines(item);
    return lines.line10_deduction > 0 &&
      lines.line7_column_a <= lines.line6_column_a &&
      lines.line7_column_b <= lines.line6_column_b;
  });
}

/**
 * Strict pending-only join for calculated jobs. This is not a source
 * authenticity check; the registered route adds W-2 and filing-shape guards.
 */
export function reconcileStagedForm2106Return(
  allPending: Readonly<Record<string, unknown>>,
) {
  const input = form2106InputSchema.parse(allPending.f2106);
  const form1040 = pendingRecordSchema.parse(allPending.f1040);
  const filer = extractFilerIdentity(form1040);
  if (!filer || typeof form1040.filing_status !== "string") {
    throw new Error("Form 2106 needs finalized Form 1040 filer identity");
  }
  assertPerformingArtistQualifications(input.f2106s);
  const jobs = input.f2106s.map(prepareForm2106);
  for (const { source } of jobs) {
    const person = source.job.owner === "taxpayer"
      ? { ssn: filer.primarySSN, name: filer.fullName }
      : {
        ssn: filer.spouse?.ssn,
        name: filer.spouse
          ? [
            filer.spouse.firstName,
            filer.spouse.middleInitial,
            filer.spouse.lastName,
          ].filter(Boolean).join(" ")
          : undefined,
      };
    if (
      !person.ssn || !person.name ||
      source.job.employee_ssn.replaceAll("-", "") !==
        person.ssn.replaceAll("-", "") ||
      normalizedName(source.job.employee_name) !==
        normalizedName(person.name)
    ) {
      throw new Error(
        `Form 2106 ${source.job.employment_record_reference} employee differs from finalized Form 1040 filer`,
      );
    }
  }
  const schedule1Total = jobs.reduce(
    (sum, job) =>
      sum +
      (job.contribution.route === "schedule1_line12"
        ? job.contribution.amount
        : 0),
    0,
  );
  const scheduleATotal = jobs.reduce(
    (sum, job) =>
      sum +
      (job.contribution.route === "schedule_a_line16"
        ? job.contribution.amount
        : 0),
    0,
  );
  if (schedule1Total > 0) {
    const schedule1 = pendingRecordSchema.parse(allPending.schedule1);
    const agi = pendingRecordSchema.parse(allPending.agi_aggregator);
    if (
      schedule1.line12_business_expenses !== schedule1Total ||
      agi.line12_business_expenses !== schedule1Total ||
      typeof schedule1.line26_total_adjustments !== "number" ||
      form1040.line10_adjustments !== schedule1.line26_total_adjustments
    ) {
      throw new Error(
        "Form 2106 Schedule 1 line 12, AGI, and Form 1040 line 10 differ from job deductions",
      );
    }
  }
  if (scheduleATotal > 0) {
    const scheduleA = pendingRecordSchema.parse(allPending.schedule_a);
    const standardDeduction = pendingRecordSchema.parse(
      allPending.standard_deduction,
    );
    if (
      // Until line-16 contribution provenance is retained, require this
      // narrow branch to be its only source. Do not guess the other share.
      scheduleA.line_16_other_deductions !== scheduleATotal ||
      typeof standardDeduction.itemized_deductions !== "number" ||
      form1040.line12e_itemized_deductions !==
        standardDeduction.itemized_deductions ||
      form1040.line12a_standard_deduction !== undefined
    ) {
      throw new Error(
        "Form 2106 Schedule A line 16 and Form 1040 line 12e need exact itemized-deduction reconciliation",
      );
    }
  }
  return { jobs, schedule1Total, scheduleATotal } as const;
}

function assertEmployeeJobSources(
  jobs: ReturnType<typeof reconcileStagedForm2106Return>["jobs"],
  w2: z.infer<typeof w2InputSchema>,
  filer: FilerIdentity,
): void {
  const allowedOwners = new Set([
    filer.primarySSN,
    ...(filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
      ? [filer.spouse.ssn]
      : []),
  ]);
  if (
    jobs.some(({ source }) =>
      source.job.owner === "spouse" &&
      filer.filingStatus !== FilingStatus.MarriedFilingJointly
    ) ||
    w2.w2s.some((item) =>
      !allowedOwners.has(
        item.employee_ssn?.replaceAll("-", "") ?? "",
      )
    )
  ) {
    throw new Error(
      "Form 2106 jobs and wages need the taxpayer or a joint-filing spouse",
    );
  }
  const jobKeys = jobs.map(({ source }) =>
    `${source.job.employee_ssn.replaceAll("-", "")}:${
      source.job.employer_ein.replaceAll("-", "")
    }`
  );
  const expenseKeys = jobs.map(({ source }) =>
    source.expenses.expense_records_reference
  );
  const mileageKeys = jobs.flatMap(({ source }) =>
    source.vehicle.method === VehicleMethod.STANDARD_MILEAGE
      ? [source.vehicle.written_mileage_evidence_reference]
      : []
  );
  if (
    new Set(mileageKeys).size !== mileageKeys.length ||
    new Set(jobKeys).size !== jobKeys.length ||
    new Set(expenseKeys).size !== expenseKeys.length
  ) {
    throw new Error(
      "Form 2106 needs distinct owner/employer jobs and separately allocated expense and mileage records",
    );
  }
  for (const { source: { job } } of jobs) {
    const employer = w2.w2s.filter((item) =>
      item.employee_ssn?.replaceAll("-", "") ===
        job.employee_ssn.replaceAll("-", "") &&
      item.employer_ein?.replaceAll("-", "") ===
        job.employer_ein.replaceAll("-", "")
    );
    if (
      employer.length !== 1 || employer[0].box1_wages <= 0 ||
      normalizedName(employer[0].employer_name ?? "") !==
        normalizedName(job.employer_name)
    ) {
      throw new Error(
        "Form 2106 each employee job must match one employer W-2 for its owner",
      );
    }
  }
}

function assertArtistReturnSources(
  jobs: ReturnType<typeof reconcileStagedForm2106Return>["jobs"],
  w2: z.infer<typeof w2InputSchema>,
  filer: FilerIdentity,
  filedAgi: unknown,
): void {
  const artists = jobs.flatMap((job) =>
    job.source.qualification.kind === EmployeeType.PERFORMING_ARTIST
      ? [{ ...job, qualification: job.source.qualification }]
      : []
  );
  if (artists.length === 0) return;
  const deduction = artists.reduce(
    (sum, job) => sum + job.lines.line10_deduction,
    0,
  );
  const filingStatusNames = {
    [FilingStatus.Single]: "single",
    [FilingStatus.MarriedFilingJointly]: "married_filing_jointly",
    [FilingStatus.MarriedFilingSeparately]: "married_filing_separately",
    [FilingStatus.HeadOfHousehold]: "head_of_household",
    [FilingStatus.QualifyingSurvivingSpouse]: "qualifying_surviving_spouse",
  } as const;
  for (const { source, qualification } of artists) {
    if (
      typeof filedAgi !== "number" ||
      qualification.adjusted_gross_income_before_artist_deduction !==
        filedAgi + deduction ||
      qualification.filing_status !== filingStatusNames[filer.filingStatus] ||
      qualification.performing_arts_gross_income !==
        qualification.employers.reduce(
          (sum, employer) => sum + employer.wages,
          0,
        )
    ) {
      throw new Error(
        "Form 2106 performing-artist qualification differs from filed AGI, filing status or sourced arts wages",
      );
    }
    for (const employer of qualification.employers) {
      const matches = w2.w2s.filter((wage) =>
        wage.employee_ssn?.replaceAll("-", "") ===
          source.job.employee_ssn.replaceAll("-", "") &&
        wage.employer_ein?.replaceAll("-", "") ===
          employer.employer_ein.replaceAll("-", "")
      );
      if (matches.length !== 1 || matches[0].box1_wages !== employer.wages) {
        throw new Error(
          "Form 2106 performing-artist employers need exact owned W-2 wages",
        );
      }
    }
  }
}

/** Native/PDF filing guard for the supported employee routes. */
export function reconcileFileableForm2106Return(
  allPending: Readonly<Record<string, unknown>>,
) {
  if (!isSupportedForm2106Route(allPending.f2106)) {
    throw new Error(
      "Form 2106 filing needs sourced qualified employee expenses without excess reimbursements",
    );
  }
  const result = reconcileStagedForm2106Return(allPending);
  const form1040 = pendingRecordSchema.parse(allPending.f1040);
  const w2 = w2InputSchema.parse(allPending.w2);
  const filer = extractFilerIdentity(form1040)!;
  assertEmployeeJobSources(result.jobs, w2, filer);
  assertArtistReturnSources(result.jobs, w2, filer, form1040.line11_agi);
  const wages = w2.w2s.reduce((sum, item) => sum + item.box1_wages, 0);
  const schedule1 = pendingRecordSchema.parse(allPending.schedule1 ?? {});
  const agi = pendingRecordSchema.parse(allPending.agi_aggregator ?? {});
  const adjustments = form1040.line10_adjustments ?? 0;
  if (
    (schedule1.line12_business_expenses ?? 0) !== result.schedule1Total ||
    (agi.line12_business_expenses ?? 0) !== result.schedule1Total ||
    form1040.line1a_wages !== wages ||
    form1040.line1z_total_wages !== wages ||
    (form1040.line8_additional_income ?? 0) !== 0 ||
    form1040.line9_total_income !== wages ||
    typeof adjustments !== "number" ||
    form1040.line11_agi !== wages - adjustments
  ) {
    throw new Error(
      "Form 2106 employee jobs must match final Form 1040 wages and AGI",
    );
  }
  return result;
}

function vehicleXml(
  vehicle: NonNullable<Form2106Lines["vehicle_part_ii"]>,
): string[] {
  return [
    elements("VehicleExpensesGrp", [
      element(
        "VehiclePlacedInServiceDt",
        vehicle.line11_placed_in_service_date,
      ),
      element("TotalMilesCnt", vehicle.line12_total_miles),
      element("BusinessMilesCnt", vehicle.line13_business_miles),
      // RatioType is a 0–1 fraction, not the printed percentage.
      element(
        "VehBusInvestmentUsePct",
        String(vehicle.line14_business_use_percent / 100),
      ),
      element(
        "AverageDistanceCnt",
        vehicle.line15_average_daily_commuting_miles,
      ),
      element("MilesCommutingCnt", vehicle.line16_commuting_miles),
      element("OtherPersonalMilesCnt", vehicle.line17_other_personal_miles),
    ]),
    element(
      "VehicleAvailableOffDutyHrsInd",
      String(vehicle.line18_available_off_duty),
    ),
    element(
      "AnotherVehicleForPrsnlUseInd",
      String(vehicle.line19_other_vehicle_available),
    ),
    element("EvidenceToSupportDeductionInd", String(vehicle.line20_evidence)),
    element("EvidenceWrittenInd", String(vehicle.line21_written_evidence)),
    element(
      "StandardMileageDeductionAmt",
      vehicle.line22_standard_mileage_deduction,
    ),
  ];
}

/** One document per sourced job after the registered route's filing guard. */
export function buildStagedIRS2106(raw: unknown): string {
  const { source, lines } = prepareForm2106(raw);
  return elements("IRS2106", [
    element("PersonNm", source.job.employee_name),
    element("OccupationTxt", source.job.occupation),
    element("SSN", source.job.employee_ssn.replaceAll("-", "")),
    element("VehicleExpenseAmt", lines.line1_vehicle),
    element("ParkingFeesTollsLocalTransAmt", lines.line2_transportation),
    element("TravExpnsLessMealsEntrmtAmt", lines.line3_travel),
    element("BusExpnssLessMealsEntrmtAmt", lines.line4_other),
    element("MealsAndEntertainmentAmt", lines.line5_meals),
    element("TotExpnssLessMealsEntrmtAmt", lines.line6_column_a),
    element("TotalMealsAndEntrmtAmt", lines.line6_column_b),
    element("OtherReimbNotRptOnW2Amt", lines.line7_column_a),
    element("MealsEntrmtReimbNotRptW2Amt", lines.line7_column_b),
    element("UnreimbursedBusinessExpenseAmt", lines.line8_column_a),
    element("UnreimbursedMealsExpenseAmt", lines.line8_column_b),
    element("AllowableBusinessDeductionAmt", lines.line9_column_a),
    element("AllowableMealsDeductionAmt", lines.line9_column_b),
    element("UnreimEmployeeBusExpnsAmt", lines.line10_deduction),
    ...(lines.vehicle_part_ii ? vehicleXml(lines.vehicle_part_ii) : []),
  ]);
}

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const yesNo = (domainKey: string, row: number): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page2}.c2_${row}[0]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page2}.c2_${row}[1]`,
    whenValue: "false",
  },
];

/** Statically mapped against the official TY2025 two-page AcroForm. */
export const stagedForm2106PdfFields: readonly PdfFieldEntry[] = [
  text("employee_name", `${page1}.f1_01[0]`),
  text("occupation", `${page1}.f1_02[0]`),
  text("ssn_first", `${page1}.f1_03[0]`),
  text("ssn_middle", `${page1}.f1_04[0]`),
  text("ssn_last", `${page1}.f1_05[0]`),
  text("line1_vehicle", `${page1}.Table_Step1[0].Line1[0].f1_06[0]`),
  text("line2_transportation", `${page1}.Table_Step1[0].Line2[0].f1_08[0]`),
  text("line3_travel", `${page1}.Table_Step1[0].Line3[0].f1_10[0]`),
  text("line4_other", `${page1}.Table_Step1[0].Line4[0].f1_12[0]`),
  text("line5_meals", `${page1}.Table_Step1[0].Line5[0].f1_16[0]`),
  text("line6_column_a", `${page1}.Table_Step1[0].Line6[0].f1_17[0]`),
  text("line6_column_b", `${page1}.Table_Step1[0].Line6[0].f1_18[0]`),
  text("line7_column_a", `${page1}.Table_Step2[0].Line7[0].f1_19[0]`),
  text("line7_column_b", `${page1}.Table_Step2[0].Line7[0].f1_20[0]`),
  text("line8_column_a", `${page1}.Table_Step3[0].Line8[0].f1_21[0]`),
  text("line8_column_b", `${page1}.Table_Step3[0].Line8[0].f1_22[0]`),
  text("line9_column_a", `${page1}.Table_Step3[0].Line9[0].f1_23[0]`),
  text("line9_column_b", `${page1}.Table_Step3[0].Line9[0].f1_24[0]`),
  text("line10_deduction", `${page1}.f1_25[0]`),
  text("line11_month", `${page2}.Table_SectionA[0].Line11[0].ColA[0].f2_01[0]`),
  text("line11_day", `${page2}.Table_SectionA[0].Line11[0].ColA[0].f2_02[0]`),
  text("line11_year", `${page2}.Table_SectionA[0].Line11[0].ColA[0].f2_03[0]`),
  text("line12_total_miles", `${page2}.Table_SectionA[0].Line12[0].f2_07[0]`),
  text(
    "line13_business_miles",
    `${page2}.Table_SectionA[0].Line13[0].f2_09[0]`,
  ),
  text(
    "line14_business_use_percent",
    `${page2}.Table_SectionA[0].Line14[0].f2_11[0]`,
  ),
  text(
    "line15_average_daily_commuting_miles",
    `${page2}.Table_SectionA[0].Line15[0].f2_13[0]`,
  ),
  text(
    "line16_commuting_miles",
    `${page2}.Table_SectionA[0].Line16[0].f2_15[0]`,
  ),
  text(
    "line17_other_personal_miles",
    `${page2}.Table_SectionA[0].Line17[0].f2_17[0]`,
  ),
  ...yesNo("line18_available_off_duty", 1),
  ...yesNo("line19_other_vehicle_available", 2),
  ...yesNo("line20_evidence", 3),
  ...yesNo("line21_written_evidence", 4),
  text("line22_standard_mileage_deduction", `${page2}.f2_19[0]`),
];

/** Canonical PDF values from the same line calculation. */
export function projectStagedForm2106Pdf(
  raw: unknown,
): Record<string, unknown> {
  const { source, lines } = prepareForm2106(raw);
  const ssn = source.job.employee_ssn.replaceAll("-", "");
  const vehicle = lines.vehicle_part_ii;
  return {
    employee_name: source.job.employee_name,
    occupation: source.job.occupation,
    ssn_first: ssn.slice(0, 3),
    ssn_middle: ssn.slice(3, 5),
    ssn_last: ssn.slice(5),
    ...lines,
    ...(vehicle
      ? {
        ...vehicle,
        // The generic PDF writer rounds numbers to whole dollars; mileage
        // percentages must remain text to retain the printed precision.
        line14_business_use_percent: String(
          vehicle.line14_business_use_percent,
        ),
        line11_month: vehicle.line11_placed_in_service_date.slice(5, 7),
        line11_day: vehicle.line11_placed_in_service_date.slice(8, 10),
        line11_year: vehicle.line11_placed_in_service_date.slice(0, 4),
      }
      : {}),
  };
}
