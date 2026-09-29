import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8815,
  type Form8815Input,
  type Form8815Lines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8815/index.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../../../mef/header.ts";

type Input = Partial<Form8815Input & Form8815Lines>;

// IRS8815.xsd, TY2025 v5.4, in its required sequence.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8815Lines, string]> =
  [
    ["line2", "ExclBondIntTotQlfyEducExpnsAmt"],
    ["line3", "ExclBondIntTotNonTxEducBnftAmt"],
    ["line4", "ExclBondIntTxblEducBenefitAmt"],
    ["line5", "ExclBondTotPYBondProcAmt"],
    ["line6", "ExclBondIntTotPYBondIntAmt"],
    ["line7", "ExclBondIntTxblExpnsBondProcRt"],
    ["line8", "ExclBondIntTentativeBondIntAmt"],
    ["line9", "ExclBondIntModifiedAGIAmt"],
    ["line10", "ExclBondIntFilingStatusLmtAmt"],
    ["line11", "ExclBondIntExcessAGIAmt"],
    ["line12", "ExclBondIntExcessAGIRt"],
    ["line13", "ExclBondIntOffsetAmt"],
    ["line14", "ExcludableSavingsBondIntAmt"],
  ];

function reconciledLines(fields: Input) {
  const source = inputSchema.parse(Object.fromEntries(
    Object.keys(inputSchema.shape).map((key) => [
      key,
      fields[key as keyof Input],
    ]),
  ));
  const lines = calculateForm8815(source, CONFIG_BY_YEAR[2025]);
  for (const [key] of FIELD_MAP) {
    if (fields[key] !== lines[key]) {
      throw new Error(`Form 8815 MeF ${key} differs from source calculation`);
    }
  }
  return { source, lines };
}

function checkScheduleB(
  line14: number,
  worksheetInterest: number,
  context?: MefBuildContext,
): void {
  if (!context?.pending) {
    throw new Error(
      "Form 8815 MeF requires Schedule B pending for reconciliation",
    );
  }
  const scheduleB = context.pending.schedule_b as
    | { ee_bond_exclusion?: unknown; print_line2_total?: unknown }
    | undefined;
  if (
    typeof scheduleB !== "object" || scheduleB === null ||
    scheduleB.ee_bond_exclusion !== line14 ||
    scheduleB.print_line2_total !== worksheetInterest
  ) {
    throw new Error(
      "Form 8815 worksheet and line 14 differ from Schedule B lines 2-3",
    );
  }
}

function buildIRS8815(fields: Input, context?: MefBuildContext): string {
  if (Object.keys(fields).length === 0) return "";
  if (fields.line14 === undefined) {
    throw new Error(
      "Form 8815 MeF needs computed 2025 lines, not raw claim fields",
    );
  }
  const { source, lines } = reconciledLines(fields);
  const filedStatus = {
    [NodeFilingStatus.Single]: MefFilingStatus.Single,
    [NodeFilingStatus.MFS]: MefFilingStatus.MarriedFilingSeparately,
    [NodeFilingStatus.MFJ]: MefFilingStatus.MarriedFilingJointly,
    [NodeFilingStatus.HOH]: MefFilingStatus.HeadOfHousehold,
    [NodeFilingStatus.QSS]: MefFilingStatus.QualifyingSurvivingSpouse,
  }[source.filing_status];
  if (context?.filer && context.filer.filingStatus !== filedStatus) {
    throw new Error("Form 8815 filing status differs from the filed return");
  }
  checkScheduleB(
    lines.line14,
    source.line9_worksheet.schedule_b_line2_interest,
    context,
  );
  return elements("IRS8815", [
    ...source.eligible_students.map((student) =>
      elements("EligibleEducationInstnGrp", [
        element("EligiblePersonNm", student.person_name),
        element("EligibleInstitutionNm", student.institution_name),
        elements("EligibleInstitutionUSAddress", [
          element("AddressLine1Txt", student.institution_address.line1),
          element("AddressLine2Txt", student.institution_address.line2),
          element("CityNm", student.institution_address.city),
          element("StateAbbreviationCd", student.institution_address.state),
          element("ZIPCd", student.institution_address.zip.replace("-", "")),
        ]),
      ])
    ),
    ...FIELD_MAP.map(([key, tag]) => {
      if (key === "line12" && lines.line11 === 0) return "";
      const value = lines[key];
      return element(
        tag,
        key === "line7" || key === "line12" ? value.toFixed(3) : value,
      );
    }),
  ]);
}

export const form8815: MefFormDescriptor<"form8815", Input> = {
  pendingKey: "form8815",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8815--2025.pdf",
  build: buildIRS8815,
};
