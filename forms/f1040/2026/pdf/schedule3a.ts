import { PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
import { inputSchema } from "../nodes/schedule3a.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s3a.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "787e1ae1eaa3e23a184074d0f437f6b2a8fe3f01290f366201f14eeecc82b8db";

type Box = readonly [number, number, number, number];
const boxes = {
  name: [36, 684.5, 445.4, 698.001],
  ssn: [447.4, 684.5, 576, 698.001],
  line1a: [411.4, 606.502, 481.4, 618.001],
  line1b: [411.4, 576.5, 481.4, 587.999],
  line2: [505, 546.501, 576, 558],
  line3: [411.4, 516.502, 481.4, 528.001],
  line4: [411.4, 486.5, 481.4, 497.999],
  line5: [505, 468.5, 576, 479.999],
  line6Yes: [66.2, 440.001, 74.2, 448.001],
  line6No: [66.2, 416, 74.2, 424],
  line6: [505, 402.501, 576, 414],
  line7Yes: [66.2, 374.002, 74.2, 382.002],
  line7No: [66.2, 362, 74.2, 370],
  line8Yes: [66.2, 308, 74.2, 316],
  line8No: [66.2, 284.002, 74.2, 292.002],
  line8: [505, 270.5, 576, 281.999],
} as const satisfies Record<string, Box>;

async function verifySource(bytes: Uint8Array): Promise<void> {
  const copy = new Uint8Array(bytes);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule 3-A hash changed");
  }
}

/** Static overlay because the pinned IRS draft has widgets but no AcroForm field tree. */
export async function buildSchedule3APdfBytes2026(
  rawFields: Record<string, unknown>,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const fields = inputSchema.parse(rawFields);
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule 3-A PDF needs filer name and SSN");
  }
  if (
    fields.line2_eligible_refundable_credits !==
      fields.line1a_refundable_credits - fields.line1b_other_payments ||
    fields.line5_tax_offset !==
      fields.line3_total_tax - fields.line4_schedule2_line20 ||
    fields.line6_federal_public_benefit !== Math.max(
        0,
        fields.line2_eligible_refundable_credits - fields.line5_tax_offset,
      )
  ) {
    throw new Error("TY2026 Schedule 3-A PDF line amounts do not reconcile");
  }
  if (fields.line6_federal_public_benefit > 0) {
    if (fields.line7_wants_benefit === undefined) {
      throw new Error("TY2026 Schedule 3-A PDF needs line 7 answer");
    }
    if (
      fields.line7_wants_benefit &&
      (fields.line8_eligible === undefined ||
        fields.line8_disallowed_benefit !==
          (fields.line8_eligible ? 0 : fields.line6_federal_public_benefit))
    ) {
      throw new Error("TY2026 Schedule 3-A PDF needs reconciled line 8");
    }
    if (
      !fields.line7_wants_benefit &&
      (fields.line8_eligible !== undefined ||
        fields.line8_disallowed_benefit !== undefined)
    ) {
      throw new Error(
        "TY2026 Schedule 3-A line 8 requires a line 7 yes answer",
      );
    }
  } else if (
    fields.line7_wants_benefit !== undefined ||
    fields.line8_eligible !== undefined ||
    fields.line8_disallowed_benefit !== undefined
  ) {
    throw new Error(
      "TY2026 Schedule 3-A lines 7 and 8 require a line 6 benefit",
    );
  }

  const source = await Deno.readFile(pinnedDraft);
  await verifySource(source);
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const page = draft.getPage(1);
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const bold = await draft.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0, 0, 0);

  const write = (box: Box, value: string | number, alignRight = true) => {
    const text = typeof value === "number" ? String(Math.round(value)) : value;
    const size = 9;
    const width = font.widthOfTextAtSize(text, size);
    const x = alignRight ? box[2] - width - 2 : box[0] + 2;
    page.drawText(text, { x, y: box[1] + 2, size, font, color: ink });
  };
  const check = (box: Box) => {
    page.drawText("X", {
      x: box[0] + 0.8,
      y: box[1] + 0.1,
      size: 9,
      font: bold,
      color: ink,
    });
  };

  write(boxes.name, filer.name, false);
  write(boxes.ssn, filer.ssn, false);
  write(boxes.line1a, fields.line1a_refundable_credits);
  write(boxes.line1b, fields.line1b_other_payments);
  write(boxes.line2, fields.line2_eligible_refundable_credits);
  write(boxes.line3, fields.line3_total_tax);
  write(boxes.line4, fields.line4_schedule2_line20);
  write(boxes.line5, fields.line5_tax_offset);
  if (fields.line6_federal_public_benefit > 0) {
    check(boxes.line6Yes);
    write(boxes.line6, fields.line6_federal_public_benefit);
    check(fields.line7_wants_benefit ? boxes.line7Yes : boxes.line7No);
    if (fields.line7_wants_benefit) {
      check(fields.line8_eligible ? boxes.line8Yes : boxes.line8No);
      write(boxes.line8, fields.line8_disallowed_benefit!);
    }
  } else {
    check(boxes.line6No);
    write(boxes.line6, 0);
  }

  // The draft's orphaned widgets are irrelevant to the static return bundle.
  page.node.delete(PDFName.of("Annots"));
  const document = await PDFDocument.create();
  const [printedPage] = await document.copyPages(draft, [1]);
  document.addPage(printedPage);
  return document.save();
}
