import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  calculateLikeKindExchange,
  requiresGainStatement,
} from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import {
  type Form8824Input,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8824/index.ts";
import type { MefPdfAttachment } from "../form-descriptor.ts";

export const GAIN_STATEMENT_FILE =
  "Form8824RealizedRecognizedGainStatement.pdf";

export async function buildForm8824GainStatement(
  raw: Form8824Input,
  filer?: FilerIdentity,
): Promise<MefPdfAttachment | undefined> {
  if (Object.keys(raw).length === 0) return undefined;
  const input = inputSchema.parse(raw);
  if (!requiresGainStatement(input)) return undefined;
  if (!filer?.fullName || !filer.primarySSN) {
    throw new Error("Form 8824 gain statement needs filer identity");
  }
  if (
    !input.relinquished_description || !input.received_description ||
    input.relinquished_basis === undefined ||
    input.received_fmv === undefined
  ) {
    throw new Error(
      "Form 8824 gain statement needs both properties, basis, and FMV",
    );
  }
  const lines = calculateLikeKindExchange(input);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dollars = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  let y = 742;
  const draw = (label: string, value?: string, strong = false) => {
    const font = strong ? bold : regular;
    page.drawText(label, { x: 54, y, size: 10, font });
    if (value !== undefined) {
      page.drawText(value, {
        x: 558 - font.widthOfTextAtSize(value, 10),
        y,
        size: 10,
        font,
      });
    }
    y -= 18;
  };
  const drawDescription = (label: string, value: string) => {
    draw(label, undefined, true);
    let line = "";
    for (const char of value.replace(/\s+/g, " ").trim()) {
      const candidate = line + char;
      if (regular.widthOfTextAtSize(candidate, 10) > 485 && line) {
        draw(line);
        line = char === " " ? "" : char;
      } else {
        line = candidate;
      }
    }
    if (line) draw(line);
  };

  page.drawText("Form 8824 (2025) - Realized and Recognized Gain Statement", {
    x: 54,
    y,
    size: 13,
    font: bold,
  });
  y -= 27;
  draw("Taxpayer", filer.fullName);
  draw("SSN", filer.primarySSN.replace(/\D/g, ""));
  y -= 7;
  drawDescription(
    "Like-kind real property given up",
    input.relinquished_description,
  );
  drawDescription(
    "Like-kind real property received",
    input.received_description,
  );
  y -= 7;
  draw("Cash received", dollars.format(input.cash_received ?? 0));
  draw(
    "FMV of other property received",
    dollars.format(input.other_property_fmv ?? 0),
  );
  if (input.other_property_description) {
    drawDescription(
      "Other property received",
      input.other_property_description,
    );
  }
  draw(
    "Liabilities assumed by other party",
    dollars.format(input.liabilities_assumed_by_buyer ?? 0),
  );
  draw(
    "Liabilities assumed by taxpayer",
    dollars.format(input.liabilities_taxpayer_assumed ?? 0),
  );
  draw("Cash paid to other party", dollars.format(input.cash_paid ?? 0));
  draw("Exchange expenses", dollars.format(input.exchange_expenses ?? 0));
  y -= 7;
  draw(
    "Line 15 calculation - cash, property, net liabilities, less expenses",
    dollars.format(lines.line15),
  );
  draw(
    "Line 16 calculation - FMV of like-kind property received",
    dollars.format(lines.line16),
  );
  draw("Line 17 calculation - lines 15 + 16", dollars.format(lines.line17));
  draw(
    "Line 18 calculation - basis, net amounts paid, unused expenses",
    dollars.format(lines.line18),
  );
  y -= 7;
  draw("Form 8824 line 19 - realized gain", dollars.format(lines.line19), true);
  draw(
    "Form 8824 line 20 - smaller of lines 15 or 19",
    dollars.format(lines.line20),
  );
  draw("Form 8824 line 21 - ordinary recapture", dollars.format(lines.line21));
  draw(
    "Form 8824 line 22 - gain reported on Schedule D or Form 4797",
    dollars.format(lines.line22),
  );
  draw(
    "Form 8824 line 23 - recognized gain",
    dollars.format(lines.line23),
    true,
  );
  draw("Form 8824 line 24 - deferred gain", dollars.format(lines.line24));
  draw(
    "Form 8824 line 25 - basis of property received",
    dollars.format(lines.line25),
  );
  if (y < 45) throw new Error("Form 8824 gain statement exceeds one page");
  return {
    fileName: GAIN_STATEMENT_FILE,
    description: "Form 8824 realized and recognized gain calculation",
    bytes: await pdf.save(),
  };
}
