import { PDFDocument } from "pdf-lib";
import {
  groupSectionBSourceForms,
  inputSchema,
} from "../../../nodes/inputs/f8283/index.ts";
import type { MefPdfAttachment } from "../form-descriptor.ts";
import type { FilerIdentity } from "../../../mef/header.ts";

/** Verify logical fields when retained signed evidence is an IRS AcroForm.
 * Scanned forms remain subject to their documented human field/signature review.
 * Neither field content nor a hash authenticates the issuer or a signature. */
export async function assertReviewedForm8283PdfFields(
  raw: unknown,
  filer: FilerIdentity | undefined,
  attachments: readonly MefPdfAttachment[],
): Promise<void> {
  if (!raw) return;
  const source = inputSchema.parse(raw);
  for (const rows of groupSectionBSourceForms(source.section_b_items ?? [])) {
    if (
      !rows.some((row) => row.signed_form_source_review?.reviewed_form_fields)
    ) continue;
    const name = rows[0].signed_form_attachment_file_name;
    const attachment = attachments.find((entry) => entry.fileName === name);
    if (!attachment) {
      throw new Error("Reviewed signed Form8283 field evidence is absent");
    }
    const document = await PDFDocument.load(attachment.bytes);
    const form = document.getForm();
    if (form.getFields().length === 0) continue;
    const p1 = "Form8283[0].Page1[0]", p2 = "Form8283[0].Page2[0]";
    const text = (key: string) => {
      try {
        return form.getTextField(key).getText() ?? "";
      } catch {
        throw new Error(`Signed Form8283 missing IRS logical field ${key}`);
      }
    };
    const sameText = (key: string, expected: string) => {
      const normalized = (value: string) => {
        if (/\.(?:f1_2|f2_2|f2_16|f2_20)\[0\]$/.test(key)) {
          return value.replace(/[^0-9]/g, "");
        }
        if (/\.(?:f2_17|f2_22)\[0\]$/.test(key)) {
          return value.toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        return value.trim().toLowerCase().replace(/\s+/g, " ");
      };
      if (
        normalized(text(key)) !== normalized(expected)
      ) {
        throw new Error(
          `Signed Form8283 logical field differs from reviewed source: ${key}`,
        );
      }
    };
    const sameMoney = (key: string, expected: number) => {
      if (
        Number(text(key).replaceAll(",", "").replace(/^\$/, "").trim()) !==
          expected
      ) {
        throw new Error(
          `Signed Form8283 monetary field differs from reviewed source: ${key}`,
        );
      }
    };
    const sameDate = (key: string, expected: string, monthOnly = false) => {
      const raw = text(key).trim();
      let actual = raw;
      if (/^\d{1,2}[/-]\d{4}$/.test(raw)) {
        actual = raw.slice(-4) + "-" + raw.split(/[/-]/)[0].padStart(2, "0");
      } else if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(raw)) {
        const date = new Date(raw);
        actual = Number.isFinite(date.getTime())
          ? date.toISOString().slice(0, 10)
          : raw;
      }
      if (
        (monthOnly ? actual.slice(0, 7) : actual) !==
          (monthOnly ? expected.slice(0, 7) : expected)
      ) {
        throw new Error(
          `Signed Form8283 date field differs from reviewed source: ${key}`,
        );
      }
    };
    const donorStatements = rows.filter((row) =>
      row.donor_statement_source_review
    )
      .map((row) =>
        `Property ${row.donor_statement_source_review!.property_id}`
      ).join("; ");
    sameText(`${p2}.f2_12[0]`, donorStatements);
    const common = rows[0];
    const facts = common.signed_form_source_review!.reviewed_form_fields!;
    sameText(
      `${p1}.f1_1[0]`,
      facts.return_filer_name ?? filer?.nameLine1 ?? filer?.fullName ?? "",
    );
    sameText(
      `${p1}.f1_2[0]`,
      facts.return_filer_ssn ?? filer?.primarySSN ?? "",
    );
    sameText(
      `${p2}.f2_1[0]`,
      facts.return_filer_name ?? filer?.nameLine1 ?? filer?.fullName ?? "",
    );
    sameText(
      `${p2}.f2_2[0]`,
      facts.return_filer_ssn ?? filer?.primarySSN ?? "",
    );
    const boxes: Record<string, string> = {
      art_at_least_20000: `${p1}.Lines2a-c[0].c1_6[0]`,
      art_under_20000: `${p1}.Lines2a-c[0].c1_6[2]`,
      other_real_estate: `${p1}.Lines2d-h[0].c1_6[0]`,
      equipment: `${p1}.Lines2d-h[0].c1_6[1]`,
      securities: `${p1}.Lines2d-h[0].c1_6[2]`,
      collectibles: `${p1}.Lines2d-h[0].c1_6[3]`,
      intellectual_property: `${p1}.Lines2d-h[0].c1_6[4]`,
      vehicle: `${p1}.Lines2i-l[0].c1_6[0]`,
      clothing_household: `${p1}.Lines2i-l[0].c1_6[1]`,
      digital_assets: `${p1}.Lines2i-l[0].c1_6[2]`,
      other: `${p1}.Lines2i-l[0].c1_6[3]`,
    };
    const expectedBox = common.property_type
      ? boxes[common.property_type]
      : undefined;
    if (
      !expectedBox || !form.getCheckBox(expectedBox).isChecked() ||
      Object.values(boxes).some((key) =>
        key !== expectedBox && form.getCheckBox(key).isChecked()
      )
    ) {
      throw new Error(
        "Signed Form8283 property selection differs from reviewed source",
      );
    }
    const appraisal = common.qualified_appraisal!,
      donee = common.donee_acknowledgment!;
    sameText(
      `${p2}.f2_13[0]`,
      `${appraisal.appraiser_first_name} ${appraisal.appraiser_last_name}`,
    );
    sameText(
      `${p2}.f2_16[0]`,
      appraisal.appraiser_ein ?? appraisal.appraiser_ssn ?? "",
    );
    sameText(`${p2}.f2_15[0]`, appraisal.us_address.line1);
    sameText(
      `${p2}.f2_17[0]`,
      `${appraisal.us_address.city} ${appraisal.us_address.state}${appraisal.us_address.zip}`,
    );
    sameText(`${p2}.f2_19[0]`, donee.organization_name);
    sameText(`${p2}.f2_20[0]`, donee.ein);
    sameText(`${p2}.f2_21[0]`, donee.us_address.line1);
    sameText(
      `${p2}.f2_22[0]`,
      `${donee.us_address.city} ${donee.us_address.state}${donee.us_address.zip}`,
    );
    sameDate(`${p2}.f2_18[0]`, donee.received_date);
    if (
      form.getCheckBox(`${p2}.c2_4[0]`).isChecked() !== donee.unrelated_use ||
      form.getCheckBox(`${p2}.c2_4[1]`).isChecked() === donee.unrelated_use
    ) {
      throw new Error(
        "Signed Form8283 actual donee-use answer differs from reviewed source",
      );
    }
    for (const row of rows) {
      const index = "ABC".indexOf(row.signed_form_row_identifier ?? "A");
      const letter = "ABC"[index],
        abc = index === 0 ? "Row3A" : "Line3" + letter;
      const colABC = `${p1}.Table_Line3_ColsA-C[0].${abc}[0]`;
      const colDI = `${p1}.Table_Line3_ColsD-I[0].Row3${letter}[0]`;
      sameText(`${colABC}.f1_${42 + 3 * index}[0]`, row.property_description!);
      sameText(
        `${colABC}.f1_${43 + 3 * index}[0]`,
        row.physical_condition ?? "",
      );
      sameMoney(`${colABC}.f1_${44 + 3 * index}[0]`, row.fmv);
      sameDate(`${colDI}.f1_${51 + 6 * index}[0]`, row.date_acquired!, true);
      sameText(
        `${colDI}.f1_${52 + 6 * index}[0]`,
        row.donor_acquisition_description!,
      );
      sameMoney(
        `${colDI}.f1_${53 + 6 * index}[0]`,
        row.cost_or_adjusted_basis!,
      );
      sameMoney(`${colDI}.f1_${56 + 6 * index}[0]`, row.deduction_claimed);
    }
  }
}
