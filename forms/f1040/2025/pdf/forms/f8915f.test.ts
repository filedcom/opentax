import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { itemSchema } from "../../../nodes/inputs/f8915f/index.ts";
import { form8915FPdf } from "./f8915f.ts";

const item = itemSchema.parse({
  retirement_source_kind: "plan",
  owner: "T",
  recipient_ssn: "111223333",
  fema_number: "DR-4871-TX",
  disaster_begin_date: "2025-03-26",
  disaster_declaration_date: "2025-05-21",
  distribution_date: "2025-06-01",
  qualified_area_home_review_reference: "reviewed principal home in Texas",
  economic_loss_review_reference: "reviewed 2025 flood loss",
  eligible_retirement_source_review_reference:
    "reviewed eligible employer plan",
  no_prior_distributions_review_reference: "reviewed 2025 disaster ledger",
  repayment: {
    kind: "none",
    review_reference: "reviewed retirement repayment ledger",
  },
  source_1099r_document_reference: "issued 2025 1099-R account 123",
  source_1099r_payer_ein: "123456789",
  source_1099r_account_number: "123",
  gross_distribution: 20_000,
  taxable_distribution: 20_000,
  full_inclusion_elected: true,
});
const filer = {
  primarySSN: "111223333",
  nameLine1: "EXAMPLE ALEX",
  fullName: "Alex Example",
  nameControl: "EXAM",
  filingStatus: FilingStatus.Single,
  address: {
    line1: "1 EXAMPLE WAY",
    city: "AUSTIN",
    state: "TX",
    zip: "78701",
  },
};
const pending = {
  f1099r: {
    f1099rs: [{
      payer_name: "Example Plan",
      payer_ein: "12-3456789",
      account_number: "123",
      source_document_reference: "issued 2025 1099-R account 123",
      ts: "T",
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box7_distribution_code: "7",
      form8915f_treatment: "full",
      box13_date_of_payment: "2025-06-01",
    }],
  },
  f1040: {
    line5a_pension_gross: 20_000,
    line5b_pension_taxable: 20_000,
  },
};

Deno.test("bounded Form 8915-F projects the 2025 source into official form fields", async () => {
  const fields =
    form8915FPdf.instances!({ f8915fs: [item] }, filer, pending)[0];
  assertEquals(fields.owner_name, "Alex Example");
  assertEquals(fields.line1e, 22_000);
  assertEquals(fields.line15, 20_000);
  assertEquals(fields.line11_election, true);
  const templatePath = new URL(
    "../../../../../.pdf-cache/irs_f8915f_2025.pdf",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(templatePath);
  } catch {
    return;
  }
  const document = await PDFDocument.load(await Deno.readFile(templatePath));
  const form = document.getForm();
  for (const entry of form8915FPdf.fields) {
    const value = fields[entry.domainKey];
    if (entry.kind === "text" && value !== undefined && value !== 0) {
      form.getTextField(entry.pdfField).setText(String(value));
    } else if (entry.kind === "checkbox" && value) {
      form.getCheckBox(entry.pdfField).check();
    }
  }
  const bytes = await document.save();
  const reopened = await PDFDocument.load(bytes);
  assertEquals(reopened.getPageCount(), 4);
  assertEquals(
    reopened.getForm().getTextField("topmostSubform[0].Page3[0].f3_08[0]")
      .getText(),
    "20000",
  );
  assertEquals(
    reopened.getForm().getCheckBox(
      "topmostSubform[0].Page3[0].Line11_ReadOrder[0].c3_2[0]",
    )
      .isChecked(),
    true,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: [path, "-"],
      stdout: "piped",
    }).output();
    assertEquals(result.code, 0);
    const text = new TextDecoder().decode(result.stdout);
    assertStringIncludes(text, "DR-4871-TX");
    assertStringIncludes(text, "20000");
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("bounded Form 8915-F PDF rejects a changed Form 1040 amount", () => {
  assertThrows(
    () =>
      form8915FPdf.instances!({ f8915fs: [item] }, filer, {
        ...pending,
        f1040: { ...pending.f1040, line5b_pension_taxable: 19_999 },
      }),
    Error,
    "must match Form 1040",
  );
});

Deno.test("Form 8915-F PDF maps plan repayment to line 14", () => {
  const repaid = itemSchema.parse({
    ...item,
    full_inclusion_elected: false,
    repayment: {
      kind: "same_year",
      amount: 1_000,
      date: "2025-08-01",
      receiving_plan_review_reference: "reviewed receiving plan",
      repayment_record_reference: "repayment confirmation",
    },
  });
  const fields = form8915FPdf.instances!({ f8915fs: [repaid] }, filer, {
    ...pending,
    f1099r: {
      f1099rs: [{
        ...pending.f1099r.f1099rs[0],
        form8915f_treatment: "three_years",
        form8915f_repayment_amount: 1_000,
      }],
    },
    f1040: { line5a_pension_gross: 20_000, line5b_pension_taxable: 5_667 },
  })[0];
  assertEquals(fields.line14, 1_000);
  assertEquals(fields.line15, 5_667);
  assertEquals(
    form8915FPdf.fields.some((entry) =>
      entry.domainKey === "line14" && entry.pdfField.endsWith("f3_07[0]")
    ),
    true,
  );
});

Deno.test("Form 8915-F PDF leaves the full-inclusion election clear for a three-year spread", () => {
  const spread = { ...item, full_inclusion_elected: false };
  const fields = form8915FPdf.instances!({ f8915fs: [spread] }, filer, {
    ...pending,
    f1099r: {
      f1099rs: [{
        ...pending.f1099r.f1099rs[0],
        form8915f_treatment: "three_years",
      }],
    },
    f1040: { ...pending.f1040, line5b_pension_taxable: 6_667 },
  })[0];
  assertEquals(fields.line11_election, false);
  assertEquals(fields.line11, 6_667);
  assertEquals(fields.line15, 6_667);
});

Deno.test("Form 8915-F PDF maps a traditional IRA to Part I and Part III", () => {
  const ira = {
    ...item,
    retirement_source_kind: "traditional_ira" as const,
    no_ira_basis_review_reference: "reviewed nondeductible basis history",
    full_inclusion_elected: false,
  };
  const fields = form8915FPdf.instances!({ f8915fs: [ira] }, filer, {
    ...pending,
    f1099r: {
      f1099rs: [{
        ...pending.f1099r.f1099rs[0],
        box7_ira_simple_indicator: true,
        form8915f_treatment: "three_years",
      }],
    },
    f1040: { line4a_ira_gross: 20_000, line4b_ira_taxable: 6_667 },
  })[0];
  assertEquals(fields.line3a, 20_000);
  assertEquals(fields.line3b, 20_000);
  assertEquals(fields.line16_yes, true);
  assertEquals(fields.line17_no, true);
  assertEquals(fields.line20, 20_000);
  assertEquals(fields.line22, 6_667);
  assertEquals(fields.line26, 6_667);
  assertEquals(fields.line8_no, true);
});
