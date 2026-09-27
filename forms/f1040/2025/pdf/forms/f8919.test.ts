import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { form8919Pdf } from "./f8919.ts";

const firm = {
  name: "Employer Inc",
  tin_type: "ein" as const,
  tin: "12-3456789",
  reason_code: "G" as const,
  ss8_filed_date: "2025-03-01",
  ss8_filing_reference: "SS-8 delivery receipt",
  form1099_received: false,
  wages: 1_000,
};

Deno.test("Form 8919 PDF uses the 2025 firm rows and numbered line fields", () => {
  const names = Object.fromEntries(
    form8919Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    names.firm_1_name,
    "topmostSubform[0].Page1[0].Pg1Table[0].Row1[0].f1_3[0]",
  );
  assertEquals(
    names.firm_1_form1099_received,
    "topmostSubform[0].Page1[0].Pg1Table[0].Row1[0].c1_1[0]",
  );
  assertEquals(
    names.firm_5_wages,
    "topmostSubform[0].Page1[0].Pg1Table[0].Row5[0].f1_27[0]",
  );
  assertEquals(names.line6, "topmostSubform[0].Page1[0].f1_28[0]");
  assertEquals(names.line8, "topmostSubform[0].Page1[0].f1_30[0]");
  assertEquals(names.line13, "topmostSubform[0].Page1[0].f1_35[0]");
  assertEquals(form8919Pdf.pageIndices?.({}), [0]);
});

Deno.test("Form 8919 PDF converts firm dates and unknown TINs for print", () => {
  const [copy] = form8919Pdf.instances?.({
    taxpayer_ssn: "123-45-6789",
    forms: [{
      recipient: "taxpayer",
      employers: [{
        ...firm,
        tin_type: "unknown",
        tin: undefined,
        reason_code: "C",
        ss8_filed_date: undefined,
        ss8_filing_reference: undefined,
        correspondence_received_date: "2025-06-01",
        correspondence_reference: "IRS letter",
      }],
    }],
  }) ?? [];
  assertEquals(copy.firm_1_tin, "unknown");
  assertEquals(copy.firm_1_reason, "C");
  assertEquals(copy.firm_1_date, "06/01/2025");
  assertEquals(copy.line6, 1_000);
  assertEquals(copy.line8, 0);
});

Deno.test("Form 8919 PDF uses additional form copies only for rows after five", () => {
  const employers = Array.from({ length: 6 }, (_, index) => ({
    ...firm,
    name: `Firm ${index + 1}`,
  }));
  const copies = form8919Pdf.instances?.({
    taxpayer_ssn: "123-45-6789",
    forms: [{ recipient: "taxpayer", employers }],
  }) ?? [];
  assertEquals(copies.length, 2);
  assertEquals(copies[0].firm_1_name, "Firm 1");
  assertEquals(copies[0].firm_5_name, "Firm 5");
  assertEquals(copies[0].line6, 6_000);
  assertEquals(copies[1].firm_1_name, "Firm 6");
  assertEquals(copies[1].line6, undefined);
  assertEquals(copies[1].line13, undefined);
});

Deno.test("Form 8919 PDF keeps taxpayer and spouse copies separate", () => {
  const copies = form8919Pdf.instances?.({
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    forms: [
      { recipient: "taxpayer", employers: [firm] },
      { recipient: "spouse", employers: [{ ...firm, name: "Spouse Firm" }] },
    ],
  }) ?? [];
  assertEquals(copies.length, 2);
  assertEquals(copies.map((copy) => copy.recipient), ["taxpayer", "spouse"]);
  assertEquals(copies[1].firm_1_name, "Spouse Firm");
});

Deno.test("Form 8919 PDF requires spouse identity for a spouse copy", async () => {
  const [copy] = form8919Pdf.instances?.({
    spouse_ssn: "987-65-4321",
    forms: [{ recipient: "spouse", employers: [firm] }],
  }) ?? [];
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await assertRejects(
    async () =>
      await form8919Pdf.decoratePages?.(document, [page], copy, testFiler()),
    Error,
    "spouse name and SSN",
  );
  await form8919Pdf.decoratePages?.(document, [page], copy, {
    ...testFiler(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      firstName: "Jane",
      lastName: "Smith",
      ssn: "987654321",
      nameControl: "SMIT",
    },
  });
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Form 8919 PDF rejects duplicate recipient forms", () => {
  const form = { recipient: "taxpayer", employers: [firm] };
  assertThrows(() =>
    form8919Pdf.instances?.({
      taxpayer_ssn: "123-45-6789",
      forms: [form, form],
    })
  );
});
