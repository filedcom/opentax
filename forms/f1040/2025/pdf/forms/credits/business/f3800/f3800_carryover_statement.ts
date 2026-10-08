import { type PDFDocument, type PDFFont, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../../mef/header.ts";
import {
  form3800CarryoverLedgerSchema,
  type Form3800CarryoverVintage,
  reconcileForm3800CarryoverLedger,
} from "../../../../../../nodes/inputs/credits/business/f3800/carryover-ledger.ts";
import { PassiveCreditSourceOrigin } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/source.ts";

const LEFT = 36;
const PAGE_WIDTH = 612;
const BODY_WIDTH = PAGE_WIDTH - LEFT * 2;
const BOTTOM = 45;
const LINE_HEIGHT = 13;

function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function wrapExact(text: string, font: PDFFont): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, 9) <= BODY_WIDTH) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      const fragment = line + character;
      if (font.widthOfTextAtSize(fragment, 9) > BODY_WIDTH) {
        if (!line) {
          throw new Error(
            "Form 3800 statement character does not fit the page",
          );
        }
        lines.push(line);
        line = character;
      } else {
        line = fragment;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function statementLines(
  vintage: Form3800CarryoverVintage,
  available: number,
  revised: boolean,
): string[] {
  const lines = [
    `Credit: ${vintage.credit_type} | Form 3800 Part IV line ${vintage.form3800_credit_line} | Source ${vintage.source_key}`,
    `Origin year ${vintage.originating_tax_year}: credit reported ${
      currency(vintage.credit_generated_as_filed)
    }; allowed ${currency(vintage.credit_allowed_origin_year)}`,
    `Carryforward to 2025 ${
      currency(vintage.balance_carried_to_2025)
    }; originally reported ${
      currency(vintage.original_reported_balance_carried_to_2025)
    }; revised ${revised ? "Yes" : "No"}`,
    `Origin return: ${vintage.originating_return_reference}`,
    `Source document: ${vintage.source_document_reference}`,
    vintage.source_origin.kind === PassiveCreditSourceOrigin.Self
      ? "Source origin: self"
      : `Source origin: ${
        vintage.source_origin.kind.replaceAll("_", " ")
      }; entity: ${vintage.source_origin.entity_reference}; EIN: ${
        vintage.source_origin.ein ?? vintage.source_origin.missing_ein_reason
      }`,
  ];
  for (
    const use of [...vintage.historical_uses].sort((a, b) =>
      a.tax_year - b.tax_year
    )
  ) {
    lines.push(
      `${use.tax_year} ${use.kind} allowed ${
        currency(use.credit_allowed)
      }; return: ${use.return_reference}`,
    );
  }
  for (
    const adjustment of [...vintage.prior_adjustments].sort((a, b) =>
      a.tax_year - b.tax_year
    )
  ) {
    lines.push(
      `${adjustment.tax_year} prior adjustment ${
        currency(adjustment.amount)
      } (${adjustment.reason}); source: ${adjustment.source_document_reference}`,
    );
  }
  if (vintage.adjustment_2025) {
    lines.push(
      `2025 adjustment ${
        currency(vintage.adjustment_2025.amount)
      } (${vintage.adjustment_2025.reason}); source: ${vintage.adjustment_2025.source_document_reference}`,
    );
  }
  lines.push(`Available after 2025 adjustment: ${currency(available)}`);
  return lines;
}

/** Append the IRS-required credit history to a prepared Form 3800 PDF. */
export async function appendForm3800CarryoverStatement(
  document: PDFDocument,
  raw: readonly Form3800CarryoverVintage[],
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (!filer) {
    throw new Error("Form 3800 carryover statement needs filer identity");
  }
  const vintages = form3800CarryoverLedgerSchema.parse(raw);
  if (vintages.length === 0) {
    throw new Error("Form 3800 carryover statement needs a credit vintage");
  }
  const reconciled = reconcileForm3800CarryoverLedger(vintages);
  for (const [index, vintage] of vintages.entries()) {
    if (
      reconciled[index].revisedFromOriginal &&
      (vintage.form3800_credit_line === "1c" ||
        vintage.form3800_credit_line === "4i")
    ) {
      throw new Error(
        "Revised Form 3800 research carryforward needs additional Form 6765 statement details",
      );
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, 792]);
  let pageNumber = 0;
  let y = 0;
  const startPage = () => {
    if (pageNumber > 0) page = document.addPage([PAGE_WIDTH, 792]);
    pageNumber++;
    page.drawText("Form 3800 - Carryover Credit History", {
      x: LEFT,
      y: 750,
      font: bold,
      size: 11,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: LEFT,
      y: 731,
      font,
      size: 9,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: LEFT,
      y: 716,
      font,
      size: 9,
    });
    page.drawText(`Page ${pageNumber}`, {
      x: 530,
      y: 750,
      font,
      size: 8,
    });
    y = 691;
  };
  startPage();
  for (const [index, vintage] of vintages.entries()) {
    const facts = reconciled[index];
    const block = statementLines(
      vintage,
      facts.availableAfterAdjustment,
      facts.revisedFromOriginal,
    ).map((line, lineIndex) => ({
      lineIndex,
      drawn: wrapExact(line, lineIndex === 0 ? bold : font),
    }));
    const blockHeight = block.reduce(
      (height, line) => height + line.drawn.length * LINE_HEIGHT,
      LINE_HEIGHT,
    );
    if (blockHeight <= 691 - BOTTOM && y - blockHeight < BOTTOM) {
      startPage();
    }
    for (const { lineIndex, drawn } of block) {
      for (const text of drawn) {
        if (y < BOTTOM) {
          startPage();
          for (
            const continuation of wrapExact(
              `Credit ${vintage.source_key} (${vintage.originating_tax_year}, line ${vintage.form3800_credit_line}) continued`,
              bold,
            )
          ) {
            page.drawText(continuation, { x: LEFT, y, font: bold, size: 9 });
            y -= LINE_HEIGHT;
          }
        }
        page.drawText(text, {
          x: LEFT,
          y,
          font: lineIndex === 0 ? bold : font,
          size: 9,
        });
        y -= LINE_HEIGHT;
      }
    }
    y -= LINE_HEIGHT;
  }
}
