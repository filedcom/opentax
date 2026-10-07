import { charitableNaturalResourceDocumentFields } from "../../../nodes/inputs/f8283/natural-resource-source.ts";
import { charitableDepreciationDocumentFields } from "../../../nodes/inputs/f8283/depreciation-source.ts";
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
  const naturalResourceSources = [
    ...(source.section_a_items ?? []).flatMap((item) =>
      item.natural_resource_ordinary_income_reduction
        ? [item.natural_resource_ordinary_income_reduction]
        : []
    ),
    ...(source.section_b_items ?? []).flatMap((item) =>
      item.special_fmv_reduction?.reason === "natural_resource_ordinary_income"
        ? [item.special_fmv_reduction.source]
        : []
    ),
  ];
  for (const facts of naturalResourceSources) {
    const refs = [
      facts.purchase_record_reference,
      facts.annual_account_ledger_reference,
      facts.property_use_record_reference,
    ];
    for (let index = 0; index < 3; index++) {
      const record = facts.retained_source_documents.find((row) =>
        row.source_reference === refs[index]
      );
      const attachment = attachments.find((row) =>
        row.fileName === record?.attachment_file_name
      );
      if (!record || !attachment) {
        throw new Error(
          "Owned charitable natural-resource source PDF is absent",
        );
      }
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            Uint8Array.from(attachment.bytes),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== record.pdf_sha256) {
        throw new Error(
          "Owned charitable natural-resource source bytes differ from retained record",
        );
      }
      const form = (await PDFDocument.load(attachment.bytes)).getForm();
      for (
        const [key, value] of Object.entries(
          charitableNaturalResourceDocumentFields(facts, index),
        )
      ) {
        if (form.getTextField(key).getText() !== value) {
          throw new Error(
            `Owned charitable natural-resource source field differs: ${key}`,
          );
        }
      }
    }
  }
  const depreciationSources = [
    ...(source.section_a_items ?? []).flatMap((item) =>
      item.depreciation_ordinary_income_reduction
        ? [item.depreciation_ordinary_income_reduction]
        : []
    ),
    ...(source.section_b_items ?? []).flatMap((item) =>
      item.special_fmv_reduction?.reason === "depreciation_ordinary_income"
        ? [item.special_fmv_reduction.source]
        : []
    ),
  ];
  for (const facts of depreciationSources) {
    const refs = [
      facts.purchase_record_reference,
      facts.annual_depreciation_ledger_reference,
      facts.business_use_and_retirement_record_reference,
    ];
    for (let index = 0; index < 3; index++) {
      const record = facts.retained_source_documents.find((row) =>
        row.source_reference === refs[index]
      );
      const attachment = attachments.find((row) =>
        row.fileName === record?.attachment_file_name
      );
      if (!record || !attachment) {
        throw new Error("Owned charitable depreciation source PDF is absent");
      }
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            Uint8Array.from(attachment.bytes),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== record.pdf_sha256) {
        throw new Error(
          "Owned charitable depreciation source bytes differ from retained record",
        );
      }
      const form = (await PDFDocument.load(attachment.bytes)).getForm();
      for (
        const [key, value] of Object.entries(
          charitableDepreciationDocumentFields(facts, index),
        )
      ) {
        if (form.getTextField(key).getText() !== value) {
          throw new Error(
            `Owned charitable depreciation source field differs: ${key}`,
          );
        }
      }
    }
  }
  const dispositionSources = [
    ...(source.section_a_items ?? []).flatMap((item) =>
      item.contribution_year_disposition_reduction
        ? [item.contribution_year_disposition_reduction]
        : []
    ),
    ...(source.section_b_items ?? []).flatMap((item) =>
      item.special_fmv_reduction?.reason === "contribution_year_disposition"
        ? [item.special_fmv_reduction.source]
        : []
    ),
  ];
  for (const facts of dispositionSources) {
    for (const row of facts.retained_source_documents) {
      const attachment = attachments.find((entry) =>
        entry.fileName === row.attachment_file_name
      );
      if (!attachment) {
        throw new Error("Reviewed disposition source record is absent");
      }
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            Uint8Array.from(attachment.bytes),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== row.pdf_sha256) {
        throw new Error(
          "Reviewed disposition source bytes differ from retained record",
        );
      }
    }
    const record = facts.retained_source_documents.find((row) =>
      row.source_reference === facts.donee_disposition_record_reference
    );
    const attachment = attachments.find((row) =>
      row.fileName === record?.attachment_file_name
    );
    if (!attachment) throw new Error("Reviewed donee Form8282 is absent");
    const form = (await PDFDocument.load(attachment.bytes)).getForm();
    const p1 = "topmostSubform[0].Page1[0]", p2 = "topmostSubform[0].Page2[0]";
    const same = (key: string, expected: string, digits = false) => {
      const normalize = (value: string) =>
        digits
          ? value.replace(/[^0-9]/g, "")
          : value.trim().toLowerCase().replace(/\s+/g, " ");
      if (
        normalize(form.getTextField(key).getText() ?? "") !==
          normalize(expected)
      ) {
        throw new Error(
          `Donee Form8282 logical field differs from reviewed source: ${key}`,
        );
      }
    };
    same(`${p1}.f1_1[0]`, facts.donee_name);
    same(`${p1}.f1_2[0]`, facts.donee_ein.slice(0, 2), true);
    same(`${p1}.f1_3[0]`, facts.donee_ein.slice(2), true);
    same(`${p1}.f1_4[0]`, facts.donee_us_address.line1);
    same(
      `${p1}.f1_5[0]`,
      `${facts.donee_us_address.city}, ${facts.donee_us_address.state} ${facts.donee_us_address.zip}`,
    );
    same(`${p1}.f1_6[0]`, facts.original_donor_name);
    same(`${p1}.f1_7[0]`, facts.original_donor_ssn, true);
    const a = `${p2}.Pg2Table1[0].RowA[0]`;
    same(`${a}.ACol1[0].f2_1[0]`, facts.property_description);
    same(`${a}.ACol1[0].f2_2[0]`, facts.actual_use_description[0]);
    same(`${a}.ACol1[0].f2_3[0]`, facts.actual_use_description[1]);
    same(
      `${a}.ACol4[0].f2_4[0]`,
      facts.intended_use_and_no_certification_description[0],
    );
    same(
      `${a}.ACol4[0].f2_5[0]`,
      facts.intended_use_and_no_certification_description[1],
    );
    same(
      `${a}.ACol4[0].f2_6[0]`,
      facts.intended_use_and_no_certification_description[2],
    );
    if (
      !form.getCheckBox(`${a}.c2_1[0]`).isChecked() ||
      form.getCheckBox(`${a}.c2_1[1]`).isChecked() ||
      form.getCheckBox(`${a}.c2_2[0]`).isChecked() ||
      !form.getCheckBox(`${a}.c2_2[1]`).isChecked()
    ) {
      throw new Error(
        "Donee Form8282 interest/use answers differ from reviewed source",
      );
    }
    for (
      const [row, first, date] of [[5, 25, facts.received_date], [
        6,
        37,
        facts.received_date,
      ], [7, 49, facts.disposition_date]] as const
    ) {
      for (
        const [offset, value] of [
          date.slice(5, 7),
          date.slice(8, 10),
          date.slice(2, 4),
        ].entries()
      ) {
        same(
          `${p2}.Pg2Table2[0].Row${row}[0].ColA[0].f2_${first + offset}[0]`,
          value,
          true,
        );
      }
    }
    if (
      Number(
        (form.getTextField(`${p2}.Pg2Table2[0].Row8[0].f2_61[0]`).getText() ??
          "").replaceAll(",", ""),
      ) !== facts.gross_proceeds
    ) {
      throw new Error(
        "Donee Form8282 disposition proceeds differ from reviewed source",
      );
    }
    same(`${p2}.f2_65[0]`, ""); // PartIV certification title must be absent.
    same(`${p2}.f2_66[0]`, facts.officer_title);
    same(`${p2}.f2_67[0]`, facts.officer_name);
  }
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
