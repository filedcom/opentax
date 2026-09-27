import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { form4137Pdf } from "./f4137.ts";

const taxpayerForm = {
  recipient: "taxpayer" as const,
  employers: [{
    name: "CAFE",
    ein: "12-3456789",
    tips_received: 5_000,
    tips_reported: 2_000,
  }],
  ss_wages_from_w2: 30_000,
};
const taxpayerW2 = {
  employee_ssn: "123-45-6789",
  employer_name: "CAFE",
  employer_ein: "12-3456789",
  allocated_tips: 0,
  ss_wages_and_tips: 30_000,
};

Deno.test("Form 4137 PDF maps the five employer rows and numbered lines", () => {
  const names = Object.fromEntries(
    form4137Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    names.employer_1_name,
    "topmostSubform[0].Page1[0].Table_Line1[0].BodyRow1[0].f1_3[0]",
  );
  assertEquals(
    names.employer_5_reported,
    "topmostSubform[0].Page1[0].Table_Line1[0].BodyRow5[0].f1_22[0]",
  );
  assertEquals(names.line2, "topmostSubform[0].Page1[0].f1_23[0]");
  assertEquals(names.line3, "topmostSubform[0].Page1[0].f1_24[0]");
  assertEquals(names.line4, "topmostSubform[0].Page1[0].f1_25[0]");
  assertEquals(names.line5, "topmostSubform[0].Page1[0].f1_26[0]");
  assertEquals(names.line6, "topmostSubform[0].Page1[0].f1_27[0]");
  assertEquals(names.line8, "topmostSubform[0].Page1[0].f1_29[0]");
  assertEquals(names.line9, "topmostSubform[0].Page1[0].f1_30[0]");
  assertEquals(names.line10, "topmostSubform[0].Page1[0].f1_31[0]");
  assertEquals(names.line11, "topmostSubform[0].Page1[0].f1_32[0]");
  assertEquals(names.line12, "topmostSubform[0].Page1[0].f1_33[0]");
  assertEquals(names.line13, "topmostSubform[0].Page1[0].f1_34[0]");
  assertEquals(form4137Pdf.pageIndices?.({}), [0]);
});

Deno.test("Form 4137 PDF creates separate calculated taxpayer and spouse copies", () => {
  const copies = form4137Pdf.instances?.({
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    forms: [taxpayerForm, {
      recipient: "spouse",
      employers: [{
        name: "DINER",
        ein: "98-7654321",
        tips_received: 1_000,
        tips_reported: 0,
      }],
      ss_wages_from_w2: 176_100,
    }],
    w2_tip_sources: [taxpayerW2, {
      employee_ssn: "987-65-4321",
      employer_name: "DINER",
      employer_ein: "98-7654321",
      allocated_tips: 0,
      ss_wages_and_tips: 176_100,
    }],
  }) ?? [];
  assertEquals(copies.length, 2);
  assertEquals(copies[0].recipient, "taxpayer");
  assertEquals(copies[0].employer_1_name, "CAFE");
  assertEquals(copies[0].line2, 5_000);
  assertEquals(copies[0].line3, 2_000);
  assertEquals(copies[0].line13, 230);
  assertEquals(copies[1].recipient, "spouse");
  assertEquals(copies[1].employer_1_name, "DINER");
  assertEquals(copies[1].line9, 0);
  assertEquals(copies[1].line13, 15);
});

Deno.test("Form 4137 PDF adds continuation for employers beyond five", async () => {
  const employers = Array.from({ length: 6 }, (_, index) => ({
    name: `CAFE ${index + 1}`,
    ein: "12-3456789",
    tips_received: 1_000,
    tips_reported: 100,
  }));
  const [copy] = form4137Pdf.instances?.({
    forms: [{ ...taxpayerForm, employers }],
    w2_tip_sources: employers.map((employer) => ({
      employer_name: employer.name,
      employer_ein: employer.ein,
      allocated_tips: 0,
      ss_wages_and_tips: employer.name === "CAFE 1" ? 30_000 : 0,
    })),
  }) ?? [];
  assertEquals(copy.line2, 6_000);
  assertEquals(copy.line3, 600);
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await form4137Pdf.appendSupplementalPages?.(document, copy, testFiler());
  assertEquals(document.getPageCount(), 2);
});

Deno.test("Form 4137 PDF requires spouse identity for a spouse copy", async () => {
  const [copy] = form4137Pdf.instances?.({
    forms: [{ ...taxpayerForm, recipient: "spouse" }],
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    w2_tip_sources: [{
      ...taxpayerW2,
      employee_ssn: "987-65-4321",
    }],
  }) ?? [];
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await assertRejects(
    async () => {
      await form4137Pdf.decoratePages?.(document, [page], copy, testFiler());
    },
    Error,
    "spouse name and SSN",
  );
  const jointFiler = {
    ...testFiler(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      firstName: "Sam",
      lastName: "Tipster",
      ssn: "987654321",
      nameControl: "TIPS",
    },
  };
  await form4137Pdf.decoratePages?.(document, [page], copy, jointFiler);
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Form 4137 PDF rejects duplicate recipient forms", () => {
  assertThrows(
    () => form4137Pdf.instances?.({ forms: [taxpayerForm, taxpayerForm] }),
    Error,
    "one form per tip recipient",
  );
});
