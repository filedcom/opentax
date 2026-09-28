import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { form2439Pdf } from "./f2439.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  firstName: "Alex",
  lastName: "Taxpayer",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
};

const source = {
  box1a: 10_000,
  box2: 1_500,
  shareholder: "T",
  shareholder_name: "Alex Taxpayer",
  shareholder_ssn_last4: "6789",
  payer_name: "Example Growth Fund",
  payer_ein: "12-3456789",
  payer_address_line1: "1 Fund Way",
  payer_address_city: "Boston",
  payer_address_state: "MA",
  payer_address_zip: "02110",
  tax_period_begin: "2025-01-01",
  tax_period_end: "2025-12-31",
};

Deno.test("Form 2439 PDF selects one payer-issued Copy B per credit document", () => {
  const instances = form2439Pdf.instances?.(
    { f2439s: [source, { ...source, payer_ein: "98-7654321", box2: 750 }] },
    filer,
    {
      schedule3: { line13a_total: 2_250, line15_total: 2_250 },
      f1040: { line31_additional_payments: 2_250 },
    },
  ) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances.map((item) => item.box2), [1_500, 750]);
  assertEquals(instances[0].shareholder_ssn, "123456789");
  assertEquals(instances[0].calendar_year_suffix, "25");
  assertEquals(form2439Pdf.pageIndices?.(instances[0]), [2]);
  assertEquals(
    form2439Pdf.fields.find((field) => field.domainKey === "box2")?.pdfField,
    "topmostSubform[0].CopyB[0].RightCol[0].f1_14[0]",
  );
});

Deno.test("Form 2439 PDF includes gain-only Copy B without Schedule 3 credit", () => {
  const copies = form2439Pdf.instances?.(
    { f2439s: [{ ...source, box2: undefined }] },
    filer,
    {},
  ) ?? [];
  assertEquals(copies.length, 1);
  assertEquals(copies[0].box1a, 10_000);
  assertEquals(copies[0].box2, undefined);
});

Deno.test("Form 2439 PDF mixed gain-only and credited copies reconcile only box 2", () => {
  const copies = form2439Pdf.instances?.(
    { f2439s: [{ ...source, box2: undefined }, { ...source, box2: 750, payer_ein: "98-7654321" }] },
    filer,
    {
      schedule3: { line13a_total: 750, line15_total: 750 },
      f1040: { line31_additional_payments: 750 },
    },
  ) ?? [];
  assertEquals(copies.map((copy) => copy.box2), [undefined, 750]);
});

Deno.test("Form 2439 PDF rejects mismatched Schedule 3 and masked SSN", () => {
  assertThrows(
    () =>
      form2439Pdf.instances?.(
        { f2439s: [source] },
        filer,
        {
          schedule3: { line13a_total: 1_499, line15_total: 1_500 },
          f1040: { line31_additional_payments: 1_500 },
        },
      ),
    Error,
    "reconcile to Schedule 3",
  );
  assertThrows(
    () =>
      form2439Pdf.instances?.(
        { f2439s: [{ ...source, shareholder_ssn_last4: "0000" }] },
        filer,
        {
          schedule3: { line13a_total: 1_500, line15_total: 1_500 },
          f1040: { line31_additional_payments: 1_500 },
        },
      ),
    Error,
    "shareholder does not match",
  );
});

Deno.test("Form 2439 PDF prints the RIC fiscal period when it is not calendar 2025", () => {
  const [copy] = form2439Pdf.instances?.(
    {
      f2439s: [{
        ...source,
        tax_period_begin: "2024-07-01",
        tax_period_end: "2025-06-30",
      }],
    },
    filer,
    {
      schedule3: { line13a_total: 1_500, line15_total: 1_500 },
      f1040: { line31_additional_payments: 1_500 },
    },
  ) ?? [];
  assertEquals(copy.calendar_year_suffix, undefined);
  assertEquals(copy.period_begin_month_day, "07/01");
  assertEquals(copy.period_begin_year_suffix, "24");
  assertEquals(copy.period_end_month_day, "06/30");
  assertEquals(copy.period_end_year_suffix, "25");
});

Deno.test("Form 2439 PDF identifies the primary and spouse separately on MFJ", () => {
  const jointFiler: FilerIdentity = {
    ...filer,
    fullName: "Alex and Sam Taxpayer",
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "987654321",
      firstName: "Sam",
      lastName: "Taxpayer",
      nameControl: "TAXP",
    },
  };
  const copies = form2439Pdf.instances?.(
    {
      f2439s: [source, {
        ...source,
        shareholder: "S",
        shareholder_name: "Sam Taxpayer",
        shareholder_ssn_last4: "4321",
        payer_ein: "98-7654321",
        box2: 750,
      }],
    },
    jointFiler,
    {
      schedule3: { line13a_total: 2_250, line15_total: 2_250 },
      f1040: { line31_additional_payments: 2_250 },
    },
  ) ?? [];
  assertEquals(copies.map((copy) => copy.shareholder_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(
    copies.map((copy) => String(copy.shareholder_name_address).split("\n")[0]),
    [
      "Alex Taxpayer",
      "Sam Taxpayer",
    ],
  );
});
