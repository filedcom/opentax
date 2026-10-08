import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../execution/prepared-source.ts";
import { reviewForm1116ScheduleBFiledDocuments } from "./form1116_schedule_b_filed_documents.ts";
import { IncomeCategory } from "../../../../nodes/intermediate/forms/form_1116/index.ts";

const form1040Id = "filed-2024-form1040-alex";
const scheduleBId = "filed-2024-passive-schedule-b-alex";
const prefix = "topmostSubform[0].Page1[0].";
const line8Prefix = "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].";
const categoryFields = [
  `${prefix}CheckboxA-B_ReadOrder[0].c1_01[0]`,
  `${prefix}CheckboxA-B_ReadOrder[0].c1_01[1]`,
  `${prefix}CheckboxC-D_ReadOrder[0].c1_01[0]`,
  `${prefix}CheckboxC-D_ReadOrder[0].c1_01[1]`,
  `${prefix}CheckboxE-F_ReadOrder[0].c1_01[0]`,
  `${prefix}CheckboxE-F_ReadOrder[0].c1_01[1]`,
  `${prefix}c1_01[0]`,
];

async function form1040Bytes(ssn = "111223333") {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  pdf.getForm().createTextField(`${prefix}f1_06[0]`).setText(ssn);
  return await pdf.save();
}

async function scheduleBBytes(
  values: {
    year?: string;
    owner?: string;
    prior2022?: string;
    prior2023?: string;
    current2024?: string;
    total?: string;
    category?: number;
  } = {},
) {
  const pdf = await PDFDocument.create();
  const firstPage = pdf.addPage();
  pdf.addPage();
  const form = pdf.getForm();
  form.createTextField(`${prefix}Pg1Header[0].f1_01[0]`).setText(
    values.year ?? "24",
  );
  for (const suffix of ["02", "03", "04", "05"]) {
    form.createTextField(`${prefix}Pg1Header[0].f1_${suffix}[0]`);
  }
  form.createTextField(`${prefix}f1_07[0]`).setText(
    values.owner ?? "111223333",
  );
  for (const name of categoryFields) {
    form.createCheckBox(name).addToPage(firstPage);
  }
  form.getCheckBox(categoryFields[values.category ?? 2]).check();
  for (const number of ["107", "108", "109", "110", "111"]) {
    form.createTextField(`${prefix}Table_Page1[0].Line8[0].f1_${number}[0]`);
  }
  for (const number of ["98", "99"]) {
    form.createTextField(`${line8Prefix}f2_${number}[0]`);
  }
  form.createTextField(`${line8Prefix}f2_100[0]`).setText(
    values.prior2022 ?? "",
  );
  form.createTextField(`${line8Prefix}f2_101[0]`).setText(
    values.prior2023 ?? "100",
  );
  form.createTextField(`${line8Prefix}f2_102[0]`).setText(
    values.current2024 ?? "500",
  );
  form.createTextField(`${line8Prefix}f2_103[0]`).setText(
    values.total ?? "600",
  );
  return await pdf.save();
}

async function document(
  source_document_id: string,
  bytes: Uint8Array,
) {
  const ownedBytes = new Uint8Array(bytes);
  return {
    source_document_id,
    bytes: ownedBytes,
    reviewed_sha256: await sha256Hex(ownedBytes),
    reviewed_by: "Alex Reviewer",
    reviewed_on: "2026-04-01",
  };
}

const carryoverSource = {
  income_category: IncomeCategory.Passive,
  vintages: [
    {
      vintage_tax_year: 2023 as const,
      prior_year_schedule_b_line8_vintage_amount: 100,
    },
    {
      vintage_tax_year: 2024 as const,
      prior_year_schedule_b_line8_vintage_amount: 500,
    },
  ],
  prior_year_schedule_b_line8_total: 600,
  prior_year_schedule_b_line8_other_vintages_total: 0 as const,
  no_intervening_adjustments: true as const,
  source_document_references: [form1040Id, scheduleBId],
  filed_2024_schedule_b: {
    taxpayer_ssn: "111223333",
    tax_year: 2024 as const,
    income_category: IncomeCategory.Passive,
    form1040_source_document_id: form1040Id,
    schedule_b_source_document_id: scheduleBId,
    line8_2023_first_preceding_amount: 100,
    line8_2024_current_year_amount: 500,
    line8_total: 600,
  },
};

async function intake(
  form1040?: Uint8Array,
  scheduleB?: Uint8Array,
) {
  return {
    carryover_source: carryoverSource,
    filed_form1040: await document(
      form1040Id,
      form1040 ?? await form1040Bytes(),
    ),
    filed_schedule_b: await document(
      scheduleBId,
      scheduleB ?? await scheduleBBytes(),
    ),
  };
}

Deno.test("Form 1116 reviewed 2024 PDF bytes match owner, category, and Schedule B vintage fields", async () => {
  const reviewed = await intake();
  const result = await reviewForm1116ScheduleBFiledDocuments(
    reviewed,
    "111-22-3333",
  );
  assertEquals(result.taxpayer_ssn, "111223333");
  assertEquals(result.line8_total, 600);
  assertEquals(
    result.reviewed_form1040_sha256,
    reviewed.filed_form1040.reviewed_sha256,
  );
  assertEquals(
    result.reviewed_schedule_b_sha256,
    reviewed.filed_schedule_b.reviewed_sha256,
  );
  assertEquals(result.export_ready, false);
});

Deno.test("Form 1116 reviewed 2024 PDFs reject changed bytes and printed source fields", async () => {
  const reviewed = await intake();
  const unreadableFields = await PDFDocument.create();
  unreadableFields.addPage();
  unreadableFields.addPage();
  for (
    const altered of [
      {
        ...reviewed,
        filed_schedule_b: {
          ...reviewed.filed_schedule_b,
          bytes: new Uint8Array(await scheduleBBytes({ prior2023: "101" })),
        },
      },
      await intake(await form1040Bytes("999999999")),
      await intake(await form1040Bytes(), await scheduleBBytes({ year: "23" })),
      await intake(
        await form1040Bytes(),
        await scheduleBBytes({ category: 3 }),
      ),
      await intake(
        await form1040Bytes(),
        await scheduleBBytes({ current2024: "499" }),
      ),
      await intake(
        await form1040Bytes(),
        await scheduleBBytes({ prior2022: "1" }),
      ),
      await intake(
        await form1040Bytes(),
        await scheduleBBytes({ total: "601" }),
      ),
      await intake(await unreadableFields.save()),
      {
        ...reviewed,
        filed_form1040: {
          ...reviewed.filed_form1040,
          source_document_id: "other-1040",
        },
      },
      {
        ...reviewed,
        carryover_source: {
          ...carryoverSource,
          filed_2024_schedule_b: {
            ...carryoverSource.filed_2024_schedule_b,
            line8_2024_current_year_amount: 499,
          },
        },
      },
    ]
  ) {
    await assertRejects(() =>
      reviewForm1116ScheduleBFiledDocuments(altered, "111-22-3333")
    );
  }
});
