import { StandardFonts } from "pdf-lib";
import {
  groupedDistributionXml,
  reconcileDistributionGroups,
} from "../../../../mef/forms/income/retirement/f8915f_groups.ts";
import type { PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";

export const groupedDistributionInstances: NonNullable<
  PdfFormDescriptor["instances"]
> = (raw, filer, pending) => {
  groupedDistributionXml(raw, { filer, pending });
  return reconcileDistributionGroups(raw, { filer, pending }).map((g) => {
    const l = g.lines,
      plan = l.line8_plan_qualified > 0,
      ira = l.line20_ira_qualified > 0;
    const fields = {
      group_owner: g.first.owner,
      owner_name: g.name,
      owner_ssn: g.first.recipient_ssn,
      filing_2025: true,
      disaster_2025: true,
      fema_number: g.first.fema_number,
      declaration_date: g.first.disaster_declaration_date,
      begin_date: g.first.disaster_begin_date,
      distribution_date: g.dates.length <= 3
        ? g.dates.join(", ")
        : "See attached distribution statement",
      line1e: l.line1e_available,
      line2a: l.line2a_plan_distributions || undefined,
      line2b: plan ? l.line2b_qualified_plan_distributions : undefined,
      line3a: l.line3a_ira_distributions || undefined,
      line3b: ira ? l.line3b_qualified_ira_distributions : undefined,
      line5aa: l.line5a_nonqualified_distributions,
      line5ba: l.line5b_qualified_distributions,
      line5bb: l.line5b_qualified_distributions,
      line6: l.line6_total_qualified,
      line8_yes: plan,
      line8_no: !plan,
      line8: plan ? l.line8_plan_qualified : undefined,
      line9: plan ? 0 : undefined,
      line10: plan ? l.line10_taxable : undefined,
      line11_election: g.first.full_inclusion_elected,
      line11: plan ? l.line11_current_income : undefined,
      line13: plan ? l.line13_total_income : undefined,
      line14: l.line14_plan_repayment || undefined,
      line15: plan ? l.line15_form1040_line5b : undefined,
      line16_yes: ira,
      line16_no: !ira,
      line17_no: ira,
      line20: ira ? l.line20_ira_qualified : undefined,
      line21: ira ? l.line21_ira_taxable : undefined,
      line22_election: g.first.full_inclusion_elected,
      line22: ira ? l.line22_current_ira_income : undefined,
      line24: ira ? l.line24_total_ira_income : undefined,
      line25: l.line25_ira_repayment || undefined,
      line26: ira ? l.line26_form1040_line4b : undefined,
    };
    // Applicable zero amounts must print; undefined marks a skipped section.
    return Object.fromEntries(
      Object.entries(fields).map((
        [key, value],
      ) => [key, value === 0 ? "0" : value]),
    );
  });
};

export const appendDistributionDates: NonNullable<
  PdfFormDescriptor["appendSupplementalPages"]
> = async (document, fields, filer, pending) => {
  if (!fields.group_owner) return;
  const groups = reconcileDistributionGroups(pending?.f8915f, {
    filer,
    pending,
  });
  const group = groups.find((g) => g.first.owner === fields.group_owner);
  if (!group || group.dates.length <= 3) return;
  const font = await document.embedFont(StandardFonts.Helvetica),
    bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]), y = 0, pageNumber = 0;
  const header = () => {
    pageNumber++;
    page.drawText("2025 Form 8915-F - Distribution Dates", {
      x: 40,
      y: 750,
      size: 13,
      font: bold,
    });
    page.drawText(
      `${group.name}  SSN ${group.first.recipient_ssn}  Page ${pageNumber}`,
      { x: 40, y: 730, size: 10, font },
    );
    page.drawText(`FEMA disaster: ${group.first.fema_number}`, {
      x: 40,
      y: 712,
      size: 10,
      font,
    });
    y = 678;
  };
  header();
  for (const date of group.dates) {
    if (y < 55) {
      page = document.addPage([612, 792]);
      header();
    }
    const rows = group.items.filter((i) => i.distribution_date === date);
    const amount = rows.reduce((n, i) => n + i.gross_distribution, 0);
    page.drawText(
      `${date}    ${rows.length} issued source${
        rows.length === 1 ? "" : "s"
      }    Qualified amount: $${amount}`,
      { x: 40, y, size: 10, font },
    );
    y -= 20;
  }
};
