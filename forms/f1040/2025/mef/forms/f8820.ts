import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8820,
  type F8820Input,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export function buildForm8820Document(raw: unknown): string {
  const input = inputSchema.parse(raw);
  const lines = calculateForm8820(input);
  if (lines.line4 <= 0) {
    throw new Error("Form 8820 has no current-year source credit to document");
  }
  if (input.subject_to_passive_activity_limit) {
    throw new Error("Form 8820 passive credit needs Form 8582-CR");
  }
  return elements("IRS8820", [
    element("QlfyClinicalTestExpnssPdAmt", lines.line1),
    element("ReducedSection280CCrElectAmt", lines.line2a),
    element(
      "ReducedSection280CCrElectInd",
      String(input.reduced_section280c_credit_election),
    ),
    element("EmployerDifferentialWageCrAmt", lines.line2b),
    element("CYCLessEmployerDiffWageCrAmt", lines.line2c),
    element("SumCurrYrCrandOrphnDrugCrAmt", lines.line4),
    ...input.f8820s.filter((drug) =>
      drug.qualified_clinical_testing_expenses > 0
    ).map((drug) =>
      elements("OrphanDrugInfoGrp", [
        element("OrphanDrugNm", drug.generic_name),
        element(
          "OrphanDrugDesignationNum",
          drug.designation_application_number,
        ),
        element("OrphanDrugDesignationDt", drug.designation_date),
      ])
    ),
  ]);
}

type Input = Partial<F8820Input> & Record<string, unknown>;

export const form8820: MefFormDescriptor<"f8820", Input> = {
  pendingKey: "f8820",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8820.pdf",
  build(fields, context) {
    if (fields.f8820s === undefined) return "";
    const source = inputSchema.parse(fields);
    const lines = calculateForm8820(source);
    if (lines.line4 <= 0) return "";
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8820 source credit needs attached Form 3800");
    }
    if (
      !source.reduced_section280c_credit_election &&
      !context?.binaryAttachmentFileNames?.includes(
        source.expense_reduction_statement_file_name!,
      )
    ) {
      throw new Error("Form 8820 expense-reduction statement is not bundled");
    }
    return buildForm8820Document(source);
  },
};
