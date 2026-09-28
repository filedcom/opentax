import { z } from "zod";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../../../mef/header.ts";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../types.ts";
import { inputSchema as w2InputSchema, w2ItemSchema } from "../w2/index.ts";
import {
  AllocationBasis,
  Form8958Line,
  inputSchema,
  prepareF8958Allocation,
} from "./index.ts";

const wholeDollar = z.number().refine(Number.isSafeInteger);
const stagedStartSchema = z.object({
  general: z.object({
    filing_status: z.literal(FilingStatus.MFS),
    taxpayer_first_name: z.string().trim().min(1),
    taxpayer_last_name: z.string().trim().min(1),
    taxpayer_ssn: z.string().regex(/^\d{9}$/),
    spouse_first_name: z.string().trim().min(1),
    spouse_last_name: z.string().trim().min(1),
    spouse_ssn: z.string().regex(/^\d{9}$/),
  }).strict(),
  w2: z.array(w2ItemSchema).length(1),
  f8958: inputSchema,
}).strict();
const pendingSchema = z.object({
  f8958: inputSchema,
  w2: w2InputSchema,
  f1040: z.object({
    filing_status: z.literal(FilingStatus.MFS),
    line1a_wages: wholeDollar,
    line1z_total_wages: wholeDollar,
    line9_total_income: wholeDollar,
    line25a_w2_withheld: wholeDollar,
    line25d_total_withholding: wholeDollar,
  }).passthrough(),
}).passthrough();

function canonicalValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonicalValue(item)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const wageRow = `${page1}.Table_1-8[0].BodyRow1[0]`;
const withholdingRow = `${page2}.Table_9-12[0].BodyRow9[0]`;

export const form8958StagedPdfFieldMap = {
  taxpayerFirst: `${page1}.f1_1[0]`,
  taxpayerLast: `${page1}.f1_2[0]`,
  taxpayerSSN: `${page1}.SSNCombField[0].f1_3[0]`,
  spouseFirst: `${page1}.f1_4[0]`,
  spouseLast: `${page1}.f1_5[0]`,
  spouseSSN: `${page1}.SpouseSSNCombField[0].f1_6[0]`,
  page1TaxpayerSSN1:
    `${page1}.Table_1-8[0].Header[0].B\\.Allocated[0].SSN-B[0].f1_7[0]`,
  page1TaxpayerSSN2:
    `${page1}.Table_1-8[0].Header[0].B\\.Allocated[0].SSN-B[0].f1_8[0]`,
  page1TaxpayerSSN3:
    `${page1}.Table_1-8[0].Header[0].B\\.Allocated[0].SSN-B[0].f1_9[0]`,
  page1SpouseSSN1:
    `${page1}.Table_1-8[0].Header[0].C\\.Allocated[0].SSN-C[0].f1_10[0]`,
  page1SpouseSSN2:
    `${page1}.Table_1-8[0].Header[0].C\\.Allocated[0].SSN-C[0].f1_11[0]`,
  page1SpouseSSN3:
    `${page1}.Table_1-8[0].Header[0].C\\.Allocated[0].SSN-C[0].f1_12[0]`,
  page2TaxpayerSSN1:
    `${page2}.Table_9-12[0].Header[0].B\\.Allocated[0].SSN-B[0].f2_1[0]`,
  page2TaxpayerSSN2:
    `${page2}.Table_9-12[0].Header[0].B\\.Allocated[0].SSN-B[0].f2_2[0]`,
  page2TaxpayerSSN3:
    `${page2}.Table_9-12[0].Header[0].B\\.Allocated[0].SSN-B[0].f2_3[0]`,
  page2SpouseSSN1:
    `${page2}.Table_9-12[0].Header[0].C\\.Allocated[0].SSN-C[0].f2_4[0]`,
  page2SpouseSSN2:
    `${page2}.Table_9-12[0].Header[0].C\\.Allocated[0].SSN-C[0].f2_5[0]`,
  page2SpouseSSN3:
    `${page2}.Table_9-12[0].Header[0].C\\.Allocated[0].SSN-C[0].f2_6[0]`,
  wageDescription: `${wageRow}.f1_13[0]`,
  wageTotal: `${wageRow}.f1_14[0]`,
  wageTaxpayer: `${wageRow}.f1_15[0]`,
  wageSpouse: `${wageRow}.f1_16[0]`,
  withholdingDescription: `${withholdingRow}.f2_39[0]`,
  withholdingTotal: `${withholdingRow}.f2_40[0]`,
  withholdingTaxpayer: `${withholdingRow}.f2_41[0]`,
  withholdingSpouse: `${withholdingRow}.f2_42[0]`,
} as const;

/**
 * Unregistered projection of a single-W-2 community allocation. It executes
 * the actual return graph rather than accepting a caller-supplied final pending
 * snapshot. It does not authenticate source documents or the spouse's return.
 */
export function projectStagedForm8958Documents(
  rawStart: z.infer<typeof stagedStartSchema>,
  filer: FilerIdentity,
) {
  const start = stagedStartSchema.parse(rawStart);
  const source = start.f8958;
  const prepared = prepareF8958Allocation(source);
  const execution = execute(
    buildExecutionPlan(registry),
    registry,
    start,
    { taxYear: 2025, formType: "f1040" },
  );
  if (execution.diagnostics.length !== 0) {
    throw new Error("Form 8958 staged return has executor diagnostics");
  }
  const pending = pendingSchema.parse(execution.pending);
  const wages = source.rows.find((row) => row.form_line === Form8958Line.Wages);
  const withholding = source.rows.find((row) =>
    row.form_line === Form8958Line.Withholding
  );
  const return1040 = pending.f1040;
  const w2 = pending.w2.w2s[0];
  if (
    source.rows.length !== 2 || !wages || !withholding ||
    pending.w2.w2s.length !== 1 || !w2 ||
    w2.employee_ssn !== source.taxpayer.ssn ||
    w2.employer_name !== wages.description ||
    w2.box1_wages !== wages.total_amount ||
    w2.box2_fed_withheld !== withholding.total_amount ||
    wages.source_document_id !== withholding.source_document_id ||
    wages.description !== withholding.description ||
    wages.allocation_basis !== AllocationBasis.CommunityEqual ||
    withholding.allocation_basis !== AllocationBasis.CommunityEqual ||
    source.community_property_period.from !== "2025-01-01" ||
    source.community_property_period.through !== "2025-12-31" ||
    canonicalValue(pending.f8958) !== canonicalValue(source) ||
    canonicalValue(pending.w2.f8958_allocation) !== canonicalValue(source) ||
    start.general.taxpayer_ssn !== source.taxpayer.ssn ||
    start.general.taxpayer_first_name !== source.taxpayer.first_name ||
    start.general.taxpayer_last_name !== source.taxpayer.last_name ||
    start.general.spouse_ssn !== source.spouse.ssn ||
    start.general.spouse_first_name !== source.spouse.first_name ||
    start.general.spouse_last_name !== source.spouse.last_name ||
    filer.filingStatus !== MefFilingStatus.MarriedFilingSeparately ||
    filer.primarySSN !== source.taxpayer.ssn ||
    filer.firstName !== source.taxpayer.first_name ||
    filer.lastName !== source.taxpayer.last_name ||
    wages.total_amount <= 0 || withholding.total_amount < 0 ||
    return1040.line1a_wages !== wages.taxpayer_share ||
    return1040.line1z_total_wages !== wages.taxpayer_share ||
    return1040.line9_total_income !== wages.taxpayer_share ||
    return1040.line25a_w2_withheld !== withholding.taxpayer_share ||
    return1040.line25d_total_withholding !== withholding.taxpayer_share ||
    prepared.totalsByLine.some((line) =>
      line.line !== Form8958Line.Wages &&
      line.line !== Form8958Line.Withholding && line.total !== 0
    )
  ) {
    throw new Error(
      "Staged Form 8958 requires one fully reconciled wage/withholding source and matching current 1040 amounts",
    );
  }

  const allocationGroup = (tag: string, row: (typeof source.rows)[number]) =>
    elements(tag, [
      element("Desc", row.description),
      element("TotalAllocationAmt", row.total_amount),
      element("PrimaryTaxpayerAllocationAmt", row.taxpayer_share),
      element("SpouseOrPartnerAllocationAmt", row.other_person_share),
    ]);
  const xml = elements("IRS8958", [
    element("SpouseOrPartnerFirstNm", source.spouse.first_name),
    element("SpouseOrPartnerLastNm", source.spouse.last_name),
    element("SpouseOrPartnerSSN", source.spouse.ssn),
    allocationGroup("WagesAllocnGrp", wages),
    allocationGroup("WithholdingTaxAllocnGrp", withholding),
  ]);
  const pdfFields = {
    taxpayerFirst: source.taxpayer.first_name,
    taxpayerLast: source.taxpayer.last_name,
    taxpayerSSN: source.taxpayer.ssn,
    spouseFirst: source.spouse.first_name,
    spouseLast: source.spouse.last_name,
    spouseSSN: source.spouse.ssn,
    page1TaxpayerSSN1: source.taxpayer.ssn.slice(0, 3),
    page1TaxpayerSSN2: source.taxpayer.ssn.slice(3, 5),
    page1TaxpayerSSN3: source.taxpayer.ssn.slice(5),
    page1SpouseSSN1: source.spouse.ssn.slice(0, 3),
    page1SpouseSSN2: source.spouse.ssn.slice(3, 5),
    page1SpouseSSN3: source.spouse.ssn.slice(5),
    page2TaxpayerSSN1: source.taxpayer.ssn.slice(0, 3),
    page2TaxpayerSSN2: source.taxpayer.ssn.slice(3, 5),
    page2TaxpayerSSN3: source.taxpayer.ssn.slice(5),
    page2SpouseSSN1: source.spouse.ssn.slice(0, 3),
    page2SpouseSSN2: source.spouse.ssn.slice(3, 5),
    page2SpouseSSN3: source.spouse.ssn.slice(5),
    wageDescription: wages.description,
    wageTotal: wages.total_amount,
    wageTaxpayer: wages.taxpayer_share,
    wageSpouse: wages.other_person_share,
    withholdingDescription: withholding.description,
    withholdingTotal: withholding.total_amount,
    withholdingTaxpayer: withholding.taxpayer_share,
    withholdingSpouse: withholding.other_person_share,
  };
  return { xml, pdfFields, fieldMap: form8958StagedPdfFieldMap, execution };
}
