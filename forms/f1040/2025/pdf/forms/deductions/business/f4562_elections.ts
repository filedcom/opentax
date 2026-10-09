import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { bonusElectionTexts } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/elections.ts";
import { reconcileCurrentYearInventory } from "../../../../mef/forms/deductions/business/f4562_current_year.ts";

export async function appendBonusElectionStatements(
  document: PDFDocument,
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
) {
  const inventory = reconcileCurrentYearInventory(pending.form4562, pending)
    .current_year_inventory;
  const texts = bonusElectionTexts(inventory.assets, inventory.bonus_election);
  if (!texts.optedOut && !texts.reduced) return;
  const name = filer?.fullName ??
    [filer?.firstName, filer?.middleInitial, filer?.lastName].filter(Boolean)
      .join(" ");
  const ssn = filer?.primarySSN.replaceAll("-", "");
  if (!name || ssn !== inventory.bonus_election?.proprietor_ssn) {
    throw new Error("Bonus election PDF needs its reviewed taxpayer identity");
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (
    const [heading, paragraph] of [[
      "Election out of special depreciation",
      texts.optedOut,
    ], ["Election for 40 percent special depreciation", texts.reduced]] as const
  ) {
    if (!paragraph) continue;
    const page = document.addPage([612, 792]);
    page.drawText("Form 4562 - Bonus depreciation election", {
      x: 40,
      y: 750,
      size: 13,
      font: bold,
    });
    page.drawText("Tax year ending December 31, 2025", {
      x: 40,
      y: 728,
      size: 10,
      font: regular,
    });
    page.drawText(name, { x: 40, y: 706, size: 10, font: regular });
    page.drawText(`Taxpayer identifying number: ${ssn}`, {
      x: 40,
      y: 689,
      size: 10,
      font: regular,
    });
    page.drawText(heading, { x: 40, y: 652, size: 11, font: bold });
    const lines = paragraph.split(" ").reduce<string[]>((acc, word) => {
      const previous = acc.at(-1);
      const candidate = previous ? `${previous} ${word}` : word;
      return previous && regular.widthOfTextAtSize(candidate, 10) > 530
        ? [...acc, word]
        : [...acc.slice(0, -1), candidate];
    }, []);
    lines.forEach((line, i) =>
      page.drawText(line, { x: 40, y: 626 - i * 15, size: 10, font: regular })
    );
  }
}
