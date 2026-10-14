import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { fillFormPdf } from "../../../builder.ts";
import { form4852RetainedPdf } from "./f4852_retained.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  firstName: "Alex",
  lastName: "Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    firstName: "Sam",
    lastName: "Taxpayer",
    ssn: "987654321",
    nameControl: "TAXP",
  },
};

const source = {
  form_type: "W2",
  subject_ts: "S",
  recipient_ssn: "987654321",
  missing_or_incorrect: "missing",
  payer_name: "Example Employer",
  payer_address_line1: "2 Pay Street",
  payer_address_city: "Dallas",
  payer_address_state: "TX",
  payer_address_zip: "75201",
  wages: 50000,
  federal_withheld: 5000,
  state_tax_withheld: 700,
  state_name: "TX",
  amount_determination_explanation: "Pay records and bank deposits",
  payer_form_efforts_explanation: "Requested original and called payer",
  source_workpaper_reference: "workpaper:1",
  completed_form_review_reference: "reviewed:1",
};

Deno.test("retained Form 4852 projects each reviewed owner and payer onto the official fields", () => {
  const copies = form4852RetainedPdf.instances?.({
    f4852s: [source, {
      ...source,
      form_type: "R_1099",
      wages: undefined,
      subject_ts: "T",
      recipient_ssn: "123456789",
      payer_name: "Example Pension",
      gross_distribution: 12000,
      taxable_amount: 10000,
      distribution_code: "7",
    }],
  }, filer) ?? [];
  assertEquals(copies.length, 2);
  assertEquals(copies[0].recipient_ssn, "987654321");
  assertEquals(copies[0].return_names, "Alex Taxpayer & Sam Taxpayer");
  assertEquals(copies[0].w2_federal_withheld, 5000);
  assertEquals(copies[0].r1099_federal_withheld, undefined);
  assertEquals(copies[1].recipient_ssn, "123456789");
  assertEquals(copies[1].r1099_federal_withheld, 5000);
  assertEquals(copies[1].gross_distribution, 12000);
  assertEquals(copies[1].wages, undefined);
  assertEquals(form4852RetainedPdf.pageIndices?.(copies[0]), [0]);
  assertEquals(
    form4852RetainedPdf.fields.find((entry) =>
      entry.domainKey === "r1099_federal_withheld"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Line8Rght[0].f1_21[0]",
  );
});

Deno.test("retained Form 4852 refuses mismatched owner and incomplete evidence", () => {
  const project = (entry: Record<string, unknown>, identity = filer) =>
    form4852RetainedPdf.instances?.({ f4852s: [entry] }, identity);
  assertThrows(
    () => project({ ...source, recipient_ssn: "123456789" }),
    Error,
    "recipient must match",
  );
  assertThrows(
    () => project({ ...source, completed_form_review_reference: undefined }),
    Error,
    "reviewed workpaper/form references",
  );
  assertThrows(
    () => project({ ...source, payer_form_efforts_explanation: undefined }),
    Error,
    "explanation",
  );
  assertThrows(
    () => project({ ...source, subject_ts: undefined }),
    Error,
    "owner",
  );
  assertThrows(
    () => project(source, { ...filer, spouse: undefined }),
    Error,
    "recipient must match",
  );
  assertThrows(
    () =>
      project({
        ...source,
        form_type: "R_1099",
        wages: undefined,
        gross_distribution: 1000,
      }),
    Error,
    "distribution code",
  );
  const basis = {
    ...source,
    form_type: "R_1099",
    wages: undefined,
    gross_distribution: 1000,
    distribution_code: "7",
    employee_contributions: 100,
  };
  assertEquals(project(basis)?.[0]?.taxable_amount, 900);
  assertEquals(
    project({ ...basis, taxable_amount: 900 })?.[0]?.taxable_amount,
    900,
  );
  assertEquals(
    project({ ...basis, taxable_amount_not_determined: true })?.[0]
      ?.taxable_amount,
    undefined,
  );
  assertThrows(
    () =>
      project({
        ...basis,
        taxable_amount: 900,
        taxable_amount_not_determined: true,
      }),
    Error,
    "Form 4852 line 8",
  );
});

Deno.test("retained Form 4852 fills the official PDF's owner, wages, payer, and explanations", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    const [fields] =
      form4852RetainedPdf.instances?.({ f4852s: [source] }, filer) ?? [];
    const bytes = await fillFormPdf(
      form4852RetainedPdf,
      fields,
      filer,
      cacheDir,
    );
    if (!bytes) throw new Error("Expected filled Form 4852 PDF");
    const path = `${cacheDir}/form4852-filled.pdf`;
    await Deno.writeFile(path, bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-f", "1", "-l", "1", "-layout", path, "-"],
    }).output();
    assertEquals(output.code, 0);
    const printed = new TextDecoder().decode(output.stdout);
    for (
      const expected of [
        "Alex Taxpayer & Sam Taxpayer",
        "987654321",
        "Example Employer",
        "50000",
        "5000",
        "Pay records and bank deposits",
        "Requested original and called payer",
      ]
    ) {
      if (!printed.includes(expected)) {
        throw new Error(`Form 4852 PDF did not print ${expected}`);
      }
    }
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("retained Form 4852 prints the 1099-R taxable amount without a second basis reduction", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    const [fields] = form4852RetainedPdf.instances?.({
      f4852s: [{
        ...source,
        form_type: "R_1099",
        wages: undefined,
        subject_ts: "T",
        recipient_ssn: "123456789",
        payer_name: "Example Pension",
        gross_distribution: 20_000,
        taxable_amount: 18_000,
        employee_contributions: 2_000,
        distribution_code: "7",
      }],
    }, filer) ?? [];
    assertEquals(fields.taxable_amount, 18_000);
    const bytes = await fillFormPdf(
      form4852RetainedPdf,
      fields,
      filer,
      cacheDir,
    );
    if (!bytes) throw new Error("Expected filled Form 4852 PDF");
    const path = `${cacheDir}/form4852-pension.pdf`;
    await Deno.writeFile(path, bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-f", "1", "-l", "1", "-layout", path, "-"],
    }).output();
    assertEquals(output.code, 0);
    const printed = new TextDecoder().decode(output.stdout);
    for (const expected of ["Example Pension", "20000", "18000", "2000"]) {
      if (!printed.includes(expected)) {
        throw new Error(`Form 4852 PDF did not print ${expected}`);
      }
    }
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});
