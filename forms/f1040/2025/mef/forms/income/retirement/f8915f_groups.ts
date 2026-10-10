import { z } from "zod";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { element, elements } from "../../../../../mef/xml.ts";
import {
  inputSchema,
  verifyGroupedDistributionSources,
} from "../../../../../nodes/inputs/income/retirement/f8915f/index.ts";
import type {
  MefBuildContext,
  MefPdfAttachment,
} from "../../../form-descriptor.ts";

export function reconcileDistributionGroups(
  raw: unknown,
  context?: MefBuildContext,
) {
  const items = inputSchema.parse(raw).f8915fs ?? [];
  const groups = verifyGroupedDistributionSources(
    items,
    context?.pending?.f1099r,
    context?.filer,
  );
  const filed = z.object({
    line4a_ira_gross: z.number().optional(),
    line4b_ira_taxable: z.number().optional(),
    line5a_pension_gross: z.number().optional(),
    line5b_pension_taxable: z.number().optional(),
  }).parse(context?.pending?.f1040 ?? {});
  const totals = groups.reduce((n, g) => ({
    iraGross: n.iraGross + g.lines.line3a_ira_distributions,
    iraTaxable: n.iraTaxable + g.lines.line26_form1040_line4b +
      g.other.iraGross,
    planGross: n.planGross + g.lines.line2a_plan_distributions,
    planTaxable: n.planTaxable + g.lines.line15_form1040_line5b +
      g.other.planGross,
  }), { iraGross: 0, iraTaxable: 0, planGross: 0, planTaxable: 0 });
  if (
    (filed.line4a_ira_gross ?? 0) !== totals.iraGross ||
    (filed.line4b_ira_taxable ?? 0) !== totals.iraTaxable ||
    (filed.line5a_pension_gross ?? 0) !== totals.planGross ||
    (filed.line5b_pension_taxable ?? 0) !== totals.planTaxable
  ) {
    throw new Error(
      "Form 8915-F grouped sources conflict with Form 1040 retirement totals",
    );
  }
  return groups.map((g) => {
    const spouse = context?.filer?.spouse;
    const name = g.first.owner === "T"
      ? context?.filer?.fullName ?? context?.filer?.nameLine1
      : spouse
      ? [spouse.firstName, spouse.middleInitial, spouse.lastName, spouse.suffix]
        .filter(Boolean).join(" ")
      : undefined;
    if (!name) {
      throw new Error("Form 8915-F grouped form requires the owner name");
    }
    return {
      ...g,
      name,
      dates: [...new Set(g.items.map((i) => i.distribution_date))].sort(),
    };
  });
}
type DistributionGroup = ReturnType<typeof reconcileDistributionGroups>[number];
type Kind = DistributionGroup["first"]["retirement_source_kind"];
export const groupWorksheetFileName = (group: DistributionGroup, kind: Kind) =>
  `Form8915FWorksheet${kind === "plan" ? 3 : 5}-${group.first.owner}.pdf`;

function groupXml(group: DistributionGroup, context?: MefBuildContext) {
  const item = group.first, l = group.lines;
  const repaymentAttrs = (kind: Kind, amount: number) => {
    if (!amount) return undefined;
    const fileName = groupWorksheetFileName(group, kind);
    const id = context?.documentIdsByAttachmentFileName?.[fileName];
    if (
      (context?.phase === "final" ||
        context?.documentIdsByAttachmentFileName) && !id
    ) {
      throw new Error(
        "Form 8915-F grouped repayment needs its owner/category worksheet",
      );
    }
    return id
      ? { referenceDocumentId: id, referenceDocumentName: "BinaryAttachment" }
      : undefined;
  };
  return elements("IRS8915F", [
    element("PersonNm", group.name),
    element("SSN", item.recipient_ssn),
    element("TaxYearFilingFormCd", "2025"),
    element("CalendarYrDisasterCd", "2025"),
    element("FEMADisasterDeclarationNum", item.fema_number),
    elements("TotalDistriAllRetirePlansGrp", [
      elements("FEMADisasterDeclarationGrp", [
        element("FEMADisasterDeclarationNum", item.fema_number),
        element("DisasterDeclarationDt", item.disaster_declaration_date),
        element("DisasterBeginDt", item.disaster_begin_date),
      ]),
      ...group.dates.map((d) => element("DistributionDt", d)),
      element("TotalCYAvailDistributionsAmt", l.line1e_available),
      l.line2a_plan_distributions
        ? elements("DistriFromNotIRARetirePlanGrp", [
          element("CYTotalDistributionsAmt", l.line2a_plan_distributions),
          element(
            "QualifiedDistributionsAmt",
            l.line2b_qualified_plan_distributions,
          ),
        ])
        : "",
      l.line3a_ira_distributions
        ? elements("DistriTrdnSEPAndSIMPLEIRAGrp", [
          element("CYTotalDistributionsAmt", l.line3a_ira_distributions),
          element(
            "QualifiedDistributionsAmt",
            l.line3b_qualified_ira_distributions,
          ),
        ])
        : "",
      elements("TotalDistriAmtFromAllPlansGrp", [
        l.line5a_nonqualified_distributions
          ? element(
            "TotalNonqlfyDisasterDistriAmt",
            l.line5a_nonqualified_distributions,
          )
          : "",
        element("CYTotalDistributionsAmt", l.line5b_qualified_distributions),
        element("QualifiedDistributionsAmt", l.line5b_qualified_distributions),
      ]),
      element("LimitationDistributionsAmt", l.line6_total_qualified),
    ]),
    l.line8_plan_qualified
      ? elements("QlfyDsstrDistriNotIRAPlansGrp", [
        element("QlfyDsstrDistriNotIRAPlansInd", "true"),
        element("QlfyDistriOrAllocationAmt", l.line8_plan_qualified),
        element("DistributionsCostAmt", 0),
        element("QlfyDistriMinusDistriCostAmt", l.line10_taxable),
        item.full_inclusion_elected
          ? element("OptOutSpreadThreeYrsInd", "X")
          : "",
        element("CYQlfySelectedDistriAmt", l.line11_current_income),
        element("SumPriorYrAndCYSelDistriAmt", l.line13_total_income),
        l.line14_plan_repayment
          ? element(
            "TotalRepymtOtherThanIRAAmt",
            l.line14_plan_repayment,
            repaymentAttrs("plan", l.line14_plan_repayment),
          )
          : "",
        element("CYTaxableDistributionsAmt", l.line15_form1040_line5b),
      ])
      : "",
    l.line20_ira_qualified
      ? elements("QlfyDistriTrdnSEPSIMPLERothGrp", [
        element("QlfyDistriTrdnSEPSIMPLERothInd", "true"),
        element("QlfyDistriRequiredRptF8606Ind", "false"),
        element("QlfyDistriOrAllocationAmt", l.line20_ira_qualified),
        element("SumForm8606AndDistriAllocnAmt", l.line21_ira_taxable),
        item.full_inclusion_elected
          ? element("OptOutSpreadThreeYrsInd", "X")
          : "",
        element("CYQlfySelectedDistriAmt", l.line22_current_ira_income),
        element("SumPriorYrAndCYSelDistriAmt", l.line24_total_ira_income),
        l.line25_ira_repayment
          ? element(
            "TotalRepymtIRARetirePlanAmt",
            l.line25_ira_repayment,
            repaymentAttrs("traditional_ira", l.line25_ira_repayment),
          )
          : "",
        element("CYTaxableDistributionsAmt", l.line26_form1040_line4b),
      ])
      : "",
  ]);
}
export function groupedDistributionXml(
  raw: unknown,
  context?: MefBuildContext,
) {
  return reconcileDistributionGroups(raw, context).map((g) =>
    groupXml(g, context)
  );
}

async function worksheet(
  group: DistributionGroup,
  kind: Kind,
): Promise<MefPdfAttachment> {
  const isPlan = kind === "plan", number = isPlan ? 3 : 5;
  const repayment = isPlan
    ? group.lines.line14_plan_repayment
    : group.lines.line25_ira_repayment;
  const before = isPlan
    ? group.lines.line13_total_income
    : group.lines.line24_total_ira_income;
  const rows = group.items.filter((i) =>
    i.retirement_source_kind === kind && i.repayment.kind === "timely"
  );
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]), y = 0, numberOfPages = 0;
  const header = () => {
    numberOfPages++;
    page.drawText(`2025 Form 8915-F Worksheet ${number}`, {
      x: 40,
      y: 750,
      size: 13,
      font: bold,
    });
    page.drawText(
      `${group.name}  SSN ${group.first.recipient_ssn}  Page ${numberOfPages}`,
      { x: 40, y: 730, size: 10, font },
    );
    page.drawText(`FEMA disaster: ${group.first.fema_number}`, {
      x: 40,
      y: 712,
      size: 10,
      font,
    });
    y = 682;
  };
  const wrap = (text: string) => {
    const lines: string[] = [];
    if (!/^[\x20-\x7E]*$/.test(text)) {
      throw new Error("Form 8915-F worksheet requires printable ASCII records");
    }
    let remaining = text;
    while (remaining) {
      let end = remaining.length;
      while (font.widthOfTextAtSize(remaining.slice(0, end), 10) > 532) end--;
      if (end < remaining.length && remaining.lastIndexOf(" ", end) > 0) {
        end = remaining.lastIndexOf(" ", end);
      }
      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    return lines;
  };
  const write = (text: string) => {
    for (const line of wrap(text)) {
      if (y < 50) {
        page = pdf.addPage([612, 792]);
        header();
      }
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 18;
    }
  };
  header();
  write(`Line 1. Last year's Form 8915-F line ${isPlan ? 14 : 25}: $0`);
  write(`Line 2. Last year's Form 8915-F line ${isPlan ? 13 : 24}: $0`);
  write("Line 3a. Line 1 minus line 2, minimum zero: $0");
  write("Line 3b. Amount already carried back: $0");
  write("Line 3c. Line 3a minus line 3b: $0");
  write(`Line 4. Eligible repayments before filing: $${repayment}`);
  write(
    `Line 5. Total for Form 8915-F line ${isPlan ? 14 : 25}: $${repayment}`,
  );
  write(`Current-year income before repayment: $${before}`);
  write(`Current-year income after repayment: $${before - repayment}`);
  y -= 15;
  write("Reviewed repayment transactions:");
  for (const row of rows) {
    if (row.repayment.kind !== "timely") continue;
    const r = row.repayment;
    const transaction = [
      `${r.date}: $${r.amount}; distribution ${row.distribution_date}; account ${row.source_1099r_account_number}`,
      `Record: ${r.repayment_record_reference}`,
      `Return filing: ${r.return_filing_date}; deadline: ${
        r.filing_deadline.kind === "ordinary" ? "2026-04-15" : "2026-10-15"
      }`,
    ];
    const height = transaction.flatMap(wrap).length * 18;
    if (height > 632) {
      throw new Error(
        "Form 8915-F repayment transaction is too long for one worksheet page",
      );
    }
    if (y - height < 50) {
      page = pdf.addPage([612, 792]);
      header();
    }
    transaction.forEach(write);
    y -= 8;
  }
  return {
    fileName: groupWorksheetFileName(group, kind),
    description:
      `2025 Form 8915-F Worksheet ${number} owner ${group.first.owner}`,
    bytes: await pdf.save(),
  };
}
export async function groupedDistributionAttachments(
  raw: unknown,
  context?: MefBuildContext,
) {
  const groups = reconcileDistributionGroups(raw, context);
  const documents: MefPdfAttachment[] = [];
  for (const group of groups) {
    if (group.lines.line14_plan_repayment) {
      documents.push(await worksheet(group, "plan"));
    }
    if (group.lines.line25_ira_repayment) {
      documents.push(await worksheet(group, "traditional_ira"));
    }
  }
  return documents;
}
