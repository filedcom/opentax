import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { z } from "zod";
import {
  calculateRefundAllocation2026,
  type refundAllocationClaim2026Schema,
} from "../inputs/refund-allocation.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Reconcile again against the final return before projecting deposit metadata. */
export function projectRefundFields2026(
  fields: Record<string, unknown>,
  claim?: z.input<typeof refundAllocationClaim2026Schema>["claim"],
) {
  const result = calculateRefundAllocation2026({
    claim,
    settled_return: fields,
  });
  const projected: Record<string, unknown> = result.form1040_fields;
  for (
    const key of [
      "form8888_attached",
      "line35b_routing_number",
      "line35c_account_type",
      "line35d_account_number",
    ]
  ) {
    if (fields[key] !== undefined && fields[key] !== projected[key]) {
      throw new Error(
        "Form 1040 refund fields need matching retained allocation sources",
      );
    }
  }
  return { result, fields: { ...fields, ...projected } };
}

/** Static draft Form 8888. The original template remains unchanged. */
export async function buildForm8888PdfBytes2026(
  claim: z.input<typeof refundAllocationClaim2026Schema>["claim"],
  settledReturn: Record<string, unknown>,
): Promise<Uint8Array> {
  const { result } = projectRefundFields2026(settledReturn, claim);
  if (!result.file_form8888) {
    throw new Error("One refund account belongs on Form 1040, not Form 8888");
  }
  const draft = await PDFDocument.load(
    await loadPinnedDraft2026(
      new URL(
        "../../../../docs/ty2026/corpus/draft/f8888.pdf",
        import.meta.url,
      ),
      "https://www.irs.gov/pub/irs-dft/f8888--dft.pdf",
      "035ddccf75b0cef5cc065bca6beded3babd4395fd3df5f3dcc8b90e08f81e437",
    ),
  );
  const form = draft.getForm();
  const prefix = "topmostSubform[0].Page1[0].";
  const expected = [
    "PgHeader[0].CalendarYear[0].f1_1[0]",
    "f1_2[0]",
    "f1_3[0]",
    "f1_13[0]",
    "f1_14[0]",
  ];
  for (let row = 1; row <= 3; row++) {
    expected.push(
      `f1_${1 + row * 3}[0]`,
      `Line${row}bCombfield[0].f1_${2 + row * 3}[0]`,
      `Line${row}dCombfield[0].f1_${3 + row * 3}[0]`,
      `c1_${row}[0]`,
      `c1_${row}[1]`,
    );
  }
  if (
    draft.getPageCount() !== 2 || form.getFields().length !== expected.length ||
    form.getFields().some((f) =>
      !expected.includes(f.getName().slice(prefix.length)) ||
      f.acroField.getWidgets().length !== 1
    )
  ) {
    throw new Error("Form 8888 template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (name: string, value: string | number, comb = false) => {
    const field = form.getTextField(prefix + name);
    const width = field.acroField.getWidgets()[0].getRectangle().width;
    const text = String(value);
    const size = comb ? 10 : Math.min(
      10,
      10 * (width - 4) / Math.max(1, font.widthOfTextAtSize(text, 10)),
    );
    if (size < 6) throw new Error("Form 8888 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  const name = (owner: string) =>
    [
      settledReturn[`${owner}_first_name`],
      settledReturn[`${owner}_middle_initial`],
      settledReturn[`${owner}_last_name`],
    ].filter(Boolean).join(" ");
  fill("PgHeader[0].CalendarYear[0].f1_1[0]", "26", true);
  fill(
    "f1_2[0]",
    settledReturn.filing_status === "mfj"
      ? `${name("taxpayer")} & ${name("spouse")}`
      : name("taxpayer"),
  );
  fill("f1_3[0]", String(settledReturn.taxpayer_ssn));
  for (const [i, a] of result.accounts.entries()) {
    const row = i + 1;
    fill(`f1_${1 + row * 3}[0]`, a.amount);
    fill(
      `Line${row}bCombfield[0].f1_${2 + row * 3}[0]`,
      a.routing_number,
      true,
    );
    fill(
      `Line${row}dCombfield[0].f1_${3 + row * 3}[0]`,
      a.account_number,
      true,
    );
    form.getCheckBox(
      `${prefix}c1_${row}[${a.account_type === "checking" ? 0 : 1}]`,
    ).check();
  }
  fill("f1_14[0]", result.total_allocation);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  const [page] = await document.copyPages(draft, [1]);
  document.addPage(page);
  const footer = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("DRAFT - NOT FOR FILING", {
    x: 36,
    y: 12,
    size: 8,
    font: footer,
    color: rgb(.4, .1, .1),
  });
  page.node.delete(PDFName.of("Annots"));
  document.catalog.delete(PDFName.of("AcroForm"));
  return document.save({ updateFieldAppearances: false });
}
