import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { calculateOwnerForms } from "../../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../../nodes/types.ts";
import { FilingStatus } from "../../../mef/types.ts";
import { fillFormPdf } from "../../builder.ts";
import { form5329Pdf } from "./f5329.ts";

const filer = {
  fullName: "Pat Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER PAT",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    firstName: "Alex",
    lastName: "Taxpayer",
    ssn: "987654321",
    nameControl: "TAXP",
  },
};

Deno.test("Form 5329 PDF instances keep each owner's identity and Part VII", () => {
  const owner_entries = [
    { owner: TS.T, early_distribution: 5_000 },
    {
      owner: TS.S,
      hsa_part_vii: {
        line42_prior_excess: 0,
        line43_unused_contribution_room: 0,
        line44_taxable_distributions: 0,
        line47_current_year_excess: 1_000,
        december_31_value: 4_000,
      },
    },
  ];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const copies = form5329Pdf.instances?.(
    { owner_entries, owner_forms },
    filer,
    {
      schedule2: { line8_form5329_tax: 560 },
      form8889: {
        forms: [{
          owner: "spouse",
          print_line2_taxpayer_contributions: 1_000,
          print_line12: 0,
          print_line16_taxable: 0,
        }],
      },
    },
  );
  assertEquals(copies?.length, 2);
  assertEquals(copies?.map((copy) => copy.owner_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(copies?.[1]?.print_hsa_line49, 60);
  assertEquals(copies?.map((copy) => form5329Pdf.pageIndices?.(copy)), [
    [0],
    [0, 1],
  ]);
  assertThrows(
    () =>
      form5329Pdf.instances?.(
        { owner_entries, owner_forms },
        filer,
        {
          schedule2: { line8_form5329_tax: 500 },
          form8889: {
            forms: [{
              owner: "spouse",
              print_line2_taxpayer_contributions: 1_000,
              print_line12: 0,
              print_line16_taxable: 0,
            }],
          },
        },
      ),
    Error,
    "Schedule 2 line 8",
  );
});

Deno.test("Form 5329 PDF carries one owner's reviewed 2024 HSA excess and rejects owner drift", () => {
  const owner_entries = [{
    owner: TS.S,
    hsa_part_vii: {
      line42_prior_excess: 2_000,
      prior_year_source: {
        tax_year: 2024 as const,
        filed_form5329_reference: "filed-2024-5329-alex",
        filed_return_reviewed: true as const,
        owner_ssn: "987654321",
        form5329_line48: 2_000,
        form5329_line49: 120,
      },
      line43_unused_contribution_room: 500,
      line44_taxable_distributions: 0,
      line47_current_year_excess: 0,
      december_31_value: 4_000,
    },
  }];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const pending = {
    schedule2: { line8_form5329_tax: 90 },
    form8889: {
      forms: [{
        owner: "spouse",
        beneficiary_ssn: "987654321",
        print_line2_taxpayer_contributions: 3_800,
        print_line12: 4_300,
        print_line13_deduction: 4_300,
        print_line16_taxable: 0,
      }],
    },
  };
  const copies = form5329Pdf.instances?.(
    { owner_entries, owner_forms },
    filer,
    pending,
  );
  assertEquals(copies?.[0]?.print_hsa_line42, 2_000);
  assertEquals(copies?.[0]?.print_hsa_line49, 90);
  assertEquals(form5329Pdf.pageIndices?.(copies?.[0] ?? {}), [0, 1]);
  assertThrows(
    () =>
      form5329Pdf.instances?.(
        { owner_entries, owner_forms },
        { ...filer, spouse: { ...filer.spouse, ssn: "111223333" } },
        pending,
      ),
    Error,
    "reviewed filed 2024 owner source",
  );
});

Deno.test("Form 5329 PDF prints Part I and II taxes on their own lines", () => {
  const owner_entries = [{
    owner: TS.T,
    early_distribution: [4_000, 6_000],
    early_distribution_exception: 2_000,
    early_distribution_exception_code: "01" as const,
    esa_able_distribution: 500,
    esa_able_exception: 100,
  }];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const [copy] = form5329Pdf.instances?.(
    { owner_entries, owner_forms },
    filer,
    { schedule2: { line8_form5329_tax: 840 } },
  ) ?? [];
  assertEquals(copy?.print_early_line1, 10_000);
  assertEquals(copy?.print_early_line3, 8_000);
  assertEquals(copy?.print_early_line4, 800);
  assertEquals(copy?.print_education_line7, 400);
  assertEquals(copy?.print_education_line8, 40);
  assertEquals(form5329Pdf.pageIndices?.(copy ?? {}), [0]);
  assertEquals(
    form5329Pdf.fields?.find((field) => field.domainKey === "print_early_line4")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_13[0]",
  );
  assertEquals(
    form5329Pdf.fields?.find((field) => field.domainKey === "print_hsa_line49")
      ?.pdfField,
    "topmostSubform[0].Page2[0].f2_24[0]",
  );
});

Deno.test("Form 5329 PDF retains Page 2 for every printable Part VII line", () => {
  for (let line = 42; line <= 49; line++) {
    assertEquals(form5329Pdf.pageIndices?.({ [`print_hsa_line${line}`]: 1 }), [
      0,
      1,
    ]);
  }
  assertEquals(
    form5329Pdf.pageIndices?.({
      print_early_line1: 1_000,
      print_hsa_line42: 0,
      print_hsa_line43: 100,
      print_hsa_line47: 0,
    }),
    [0, 1],
  );
  assertEquals(
    form5329Pdf.pageIndices?.({
      print_early_line1: 1_000,
      print_hsa_line42: 0,
      print_hsa_line49: 0,
    }),
    [0],
  );
  assertEquals(form5329Pdf.pageIndices?.({ print_hsa_line42: 0.49 }), [0]);
});

Deno.test("Form 5329 filed PDF selects only populated pages", async () => {
  const owner_entries = [{ owner: TS.T, early_distribution: 10_000 }];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const [copy] = form5329Pdf.instances?.(
    { owner_entries, owner_forms },
    filer,
    { schedule2: { line8_form5329_tax: 1_000 } },
  ) ?? [];
  if (!copy) throw new Error("Missing Form 5329 PDF instance");
  const bytes = await fillFormPdf(form5329Pdf, copy, filer, ".pdf-cache");
  if (!bytes) throw new Error("Missing Form 5329 PDF bytes");
  const filled = await PDFDocument.load(bytes);
  assertEquals(filled.getPageCount(), 3);
  const packet = await PDFDocument.create();
  for (
    const page of await packet.copyPages(
      filled,
      [...form5329Pdf.pageIndices!(copy)],
    )
  ) packet.addPage(page);
  assertEquals(packet.getPageCount(), 1);
});

Deno.test("Form 5329 PDF stops an excess-IRA packet without worksheet vintages", () => {
  const owner_entries = [{
    owner: TS.T,
    excess_traditional_ira: 1_000,
    traditional_ira_value: 5_000,
  }];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  assertEquals(owner_forms[0]?.print_total_tax, 60);
  assertThrows(
    () =>
      form5329Pdf.instances?.(
        { owner_entries, owner_forms },
        filer,
        { schedule2: { line8_form5329_tax: 60 } },
      ),
    Error,
    "sourced excess-contribution worksheet lines",
  );
});
