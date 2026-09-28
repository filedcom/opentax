import { PDFDocument } from "pdf-lib";
import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8820,
  type F8820Input,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/model.ts";
import { inputSchema as scheduleFInputSchema } from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { appendForm8820ExpenseStatement } from "../../pdf/forms/f8820_expense_statement.ts";
import { reconcileOrphanDrugK1Credits } from "./f8820_credit_evidence.ts";

function reconcileFiledExpenseReductions(
  input: F8820Input,
  pending: Readonly<Record<string, unknown>>,
): void {
  for (const entry of input.expense_reductions ?? []) {
    if (entry.treatment !== "current_deduction") {
      throw new Error(
        "Form 8820 capitalized-basis reduction needs a filed basis reconciliation",
      );
    }
    let filed: number | undefined;
    if (entry.return_form_or_schedule === "Schedule C") {
      const schedule = scheduleCInputSchema.parse(pending.schedule_c);
      const matches = schedule.schedule_cs.filter((item) =>
        item.business_reference === entry.return_instance_reference
      );
      if (matches.length !== 1) {
        throw new Error(
          "Form 8820 reduction needs one linked Schedule C business",
        );
      }
      const business = matches[0];
      filed = entry.return_line === "11"
        ? business.line_11_contract_labor ?? 0
        : entry.return_line === "27b"
        ? (business.line_27b_other_expenses ?? 0) +
          (business.part_v_other_expenses ?? []).reduce(
            (sum, other) => sum + other.amount,
            0,
          )
        : undefined;
    } else if (entry.return_form_or_schedule === "Schedule F") {
      const schedule = scheduleFInputSchema.parse(pending.schedule_f);
      const matches = schedule.schedule_fs.filter((item) =>
        item.farm_id === entry.return_instance_reference
      );
      if (matches.length !== 1) {
        throw new Error("Form 8820 reduction needs one linked Schedule F farm");
      }
      const farm = matches[0];
      filed = entry.return_line === "13"
        ? farm.line13_custom_hire ?? 0
        : entry.return_line === "32"
        ? (farm.line32_other_expenses ?? []).reduce(
          (sum, other) => sum + other.amount,
          0,
        )
        : undefined;
    }
    if (filed === undefined) {
      throw new Error(
        `Form 8820 reduction needs filed-line support for ${entry.return_form_or_schedule} ${entry.return_line}`,
      );
    }
    if (filed !== entry.expense_amount_after_reduction) {
      throw new Error(
        `Form 8820 reduction does not reconcile to ${entry.return_form_or_schedule} ${entry.return_line}`,
      );
    }
  }
}

export function buildForm8820Document(
  raw: unknown,
  controlledGroupStatementIds?: readonly string[],
): string {
  const input = inputSchema.parse(raw);
  const lines = calculateForm8820(input);
  if (lines.line2c <= 0 && !input.reduced_section280c_credit_election) {
    throw new Error("Form 8820 has no current-year source credit to document");
  }
  if (lines.line2c > 0 && input.subject_to_passive_activity_limit) {
    throw new Error("Form 8820 passive credit needs Form 8582-CR");
  }
  return elements("IRS8820", [
    element("QlfyClinicalTestExpnssPdAmt", lines.line1),
    element("ReducedSection280CCrElectAmt", lines.line2a),
    element(
      "ReducedSection280CCrElectInd",
      String(input.reduced_section280c_credit_election),
      controlledGroupStatementIds?.length
        ? {
          referenceDocumentId: controlledGroupStatementIds.join(" "),
          referenceDocumentName: "ControlledGroupMembersStatement",
        }
        : undefined,
    ),
    element("EmployerDifferentialWageCrAmt", lines.line2b),
    element("CYCLessEmployerDiffWageCrAmt", lines.line2c),
    element("OrphanDrugCreditAmt", lines.line3),
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
    if (context?.pending) {
      reconcileOrphanDrugK1Credits(
        source.pass_through_credits ?? [],
        context.pending,
      );
    }
    if (lines.line2c <= 0 && !source.reduced_section280c_credit_election) {
      return "";
    }
    if (
      lines.line2c > 0 &&
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8820 source credit needs attached Form 3800");
    }
    const groupStatementIds = context?.documentIdsByPendingKey
      ?.f8820_controlled_group_statement;
    if (
      source.controlled_group && context?.documentIdsByPendingKey &&
      !groupStatementIds?.length
    ) {
      throw new Error("Form 8820 controlled group needs its linked statement");
    }
    if (
      !source.reduced_section280c_credit_election &&
      !context?.binaryAttachmentFileNames?.includes(
        source.expense_reduction_statement_file_name!,
      )
    ) {
      throw new Error("Form 8820 expense-reduction statement is not bundled");
    }
    if (
      lines.line2a > 0 && !source.reduced_section280c_credit_election &&
      context?.pending
    ) {
      reconcileFiledExpenseReductions(source, context.pending);
    }
    return buildForm8820Document(source, groupStatementIds);
  },
  async buildBinaryAttachments(fields, context) {
    if (fields.f8820s === undefined) return [];
    const source = inputSchema.parse(fields);
    const lines = calculateForm8820(source);
    if (source.reduced_section280c_credit_election || lines.line2a === 0) {
      return [];
    }
    if (
      !context?.filer?.primarySSN ||
      !(context.filer.fullName ?? context.filer.nameLine1)
    ) {
      throw new Error("Form 8820 expense statement needs filer identity");
    }
    const document = await PDFDocument.create();
    await appendForm8820ExpenseStatement(document, source, context.filer);
    return [{
      fileName: source.expense_reduction_statement_file_name!,
      description: "Form 8820 section 280C expense reduction statement",
      bytes: await document.save(),
    }];
  },
};
