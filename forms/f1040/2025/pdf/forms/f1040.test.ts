import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

// ---------------------------------------------------------------------------
// Descriptor structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf: pendingKey is 'f1040'", () => {
  assertEquals(irs1040Pdf.pendingKey, "f1040");
});

Deno.test("irs1040Pdf: pdfUrl points to IRS f1040", () => {
  assertEquals(
    irs1040Pdf.pdfUrl,
    "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf",
  );
});

Deno.test("irs1040Pdf: Form 1040 projects source-reconciled fields", () => {
  assertEquals(typeof irs1040Pdf.projectFields, "function");
});

Deno.test("Form 1040 PDF maps the separated-spouse mark and MFS spouse name", () => {
  const mapped = new Map(
    irs1040Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    mapped.get("mfs_eitc_separation_rule"),
    "topmostSubform[0].Page1[0].c1_32[0]",
  );
  assertEquals(
    mapped.get("print_mfs_spouse_full_name"),
    "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].f1_28[0]",
  );
  assertEquals(
    irs1040Pdf.projectFields?.({
      filing_status: "mfs",
      spouse_first_name: "Other",
      spouse_last_name: "Taxpayer",
    }, {})?.print_mfs_spouse_full_name,
    "Other Taxpayer",
  );
});

Deno.test("Form 1040 PDF prints filed dependent identity and the correct checkboxes", () => {
  const child = {
    first_name: "Jamie",
    last_name: "Example",
    ssn: "222-33-4444",
    dob: "2015-06-15",
    relationship: "daughter",
    months_in_home: 12,
    months_lived_with_you_in_us: 12,
    lived_in_us_over_half_year: true,
    credit_category: "ctc",
  };
  const projected = irs1040Pdf.projectFields?.({
    dependent_count: 1,
    dependent_details: [child],
  }, {});
  assertEquals(projected?.dependent_0_first_name, "Jamie");
  assertEquals(projected?.dependent_0_last_name, "Example");
  assertEquals(projected?.dependent_0_tin, "222334444");
  assertEquals(projected?.dependent_0_relationship, "daughter");
  assertEquals(projected?.dependent_0_home, true);
  assertEquals(projected?.dependent_0_home_us, true);
  assertEquals(projected?.dependent_0_full_time_student, false);
  assertEquals(projected?.dependent_0_disabled, false);
  assertEquals(projected?.dependent_0_credit_category, "ctc");
  const five = irs1040Pdf.projectFields?.({
    dependent_count: 5,
    dependent_details: Array(5).fill(child),
    main_home_in_us_over_half_year: true,
  }, {});
  assertEquals(five?.print_more_than_four_dependents, true);
  assertEquals(five?.dependent_3_first_name, "Jamie");
  assertEquals(five?.dependent_4_first_name, undefined);
  assertEquals(five?.main_home_in_us_over_half_year, true);
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({
        dependent_count: 1,
        dependent_details: [{
          ...child,
          lived_in_us_over_half_year: undefined,
        }],
      }, {}),
    Error,
    "U.S.-residence answer",
  );
});

// ---------------------------------------------------------------------------
// fields array structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf.fields: all entries have kind, domainKey, pdfField", () => {
  for (const entry of irs1040Pdf.fields) {
    assertEquals(typeof entry.kind, "string");
    assertEquals(typeof entry.domainKey, "string");
    assertEquals(typeof entry.pdfField, "string");
  }
});

Deno.test("irs1040Pdf.fields: all PDF field names are fully qualified AcroForm paths", () => {
  for (const entry of irs1040Pdf.fields) {
    assertMatch(
      entry.pdfField,
      /^topmostSubform\[0\]\.(Page1|Page2)\[0\]\./,
      `Expected fully qualified path, got: ${entry.pdfField}`,
    );
  }
});

Deno.test("irs1040Pdf.fields: contains expected income line fields", () => {
  const domainKeys = new Set(irs1040Pdf.fields.map((e) => e.domainKey));
  const expected = [
    "line1a_wages",
    "line2b_taxable_interest",
    "line3b_ordinary_dividends",
    "line4a_ira_gross",
    "line4b_ira_taxable",
    "line6a_ss_gross",
    "line6b_ss_taxable",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing domain key: ${key}`);
  }
});

Deno.test("irs1040Pdf: IRA rollover checks line 4c and prints zero taxable", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "line4c_ira_rollover"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page1[0].c1_35[0]");
  const source = {
    f1099r: {
      f1099rs: [{
        payer_name: "IRA Custodian",
        payer_ein: "12-3456789",
        box1_gross_distribution: 5000,
        box2a_taxable_amount: 0,
        box7_distribution_code: "7",
        box7_ira_simple_indicator: true,
        rollover_code: "S",
        ira_rollover: {
          source_ira_type: "traditional",
          destination: "ira",
          destination_ira_type: "traditional",
          distributed_on: "2025-06-01",
          completed_on: "2025-06-02",
          last_ira_to_ira_rollover_on: null,
        },
      }],
    },
  };
  const fields = {
    line4a_ira_gross: 5000,
    line4b_ira_taxable: 0,
    line4c_ira_rollover: true,
  };
  const projected = irs1040Pdf.projectFields?.(fields, source);
  assertEquals(projected?.line4c_ira_rollover, true);
  assertEquals(projected?.line4b_ira_taxable, "0");
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...fields, line4c_ira_rollover: false },
        source,
      ),
    Error,
    "does not match the reviewed IRA",
  );
});

Deno.test("irs1040Pdf: line 5c rollover checks the 2025 pension checkbox with code-G source", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "line5c_pension_rollover"
  );
  assertEquals(entry?.kind, "checkbox");
  assertEquals(
    entry?.pdfField,
    "topmostSubform[0].Page1[0].c1_38[0]",
  );
  const source = {
    f1099r: {
      f1099rs: [{
        payer_name: "Jubilee",
        payer_ein: "12-3456789",
        box1_gross_distribution: 20_300,
        box2a_taxable_amount: 10_300,
        box7_distribution_code: "G",
        box7_ira_simple_indicator: false,
        direct_rollover_confirmed: true,
      }],
    },
  };
  const fields = { line5c_pension_rollover: true };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.line5c_pension_rollover,
    true,
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, {}),
    Error,
    "needs valid Form 1099-R source facts",
  );
});

Deno.test("irs1040Pdf: full pension rollover prints zero taxable amount", () => {
  const source = {
    f1099r: {
      f1099rs: [{
        payer_name: "Jubilee",
        payer_ein: "12-3456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 0,
        box7_distribution_code: "G",
        direct_rollover_confirmed: true,
      }],
    },
  };
  const fields = {
    line5a_pension_gross: 20_000,
    line5b_pension_taxable: 0,
    line5c_pension_rollover: true,
  };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.line5b_pension_taxable,
    "0",
  );
});

Deno.test("irs1040Pdf: QCD and PSO source rows mark the 2025 line 4c and 5c boxes", () => {
  const byKey = new Map(irs1040Pdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(
    byKey.get("print_ira_qcd"),
    "topmostSubform[0].Page1[0].c1_36[0]",
  );
  assertEquals(
    byKey.get("print_pension_pso"),
    "topmostSubform[0].Page1[0].c1_39[0]",
  );
  const source = {
    f1099r: {
      f1099rs: [{
        payer_name: "IRA Custodian",
        payer_ein: "12-3456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box7_distribution_code: "7",
        box7_ira_simple_indicator: true,
        qcd_partial_amount: 5_000,
      }, {
        payer_name: "Public Pension Plan",
        payer_ein: "22-2222222",
        box1_gross_distribution: 15_000,
        box2a_taxable_amount: 15_000,
        box7_distribution_code: "7",
        box7_ira_simple_indicator: false,
        pso_premium: 1_500,
      }],
    },
  };
  const fields = {
    line4a_ira_gross: 20_000,
    line4b_ira_taxable: 15_000,
    line5a_pension_gross: 15_000,
    line5b_pension_taxable: 13_500,
  };
  const projected = irs1040Pdf.projectFields?.(fields, source);
  assertEquals(projected?.print_ira_qcd, true);
  assertEquals(projected?.print_pension_pso, true);
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({ ...fields, line4a_ira_gross: 0 }, source),
    Error,
    "QCD needs IRA line 4a",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...fields, line5a_pension_gross: 0 },
        source,
      ),
    Error,
    "PSO needs pension line 5a",
  );
});

Deno.test("irs1040Pdf.fields: contains expected payment fields", () => {
  const domainKeys = new Set(irs1040Pdf.fields.map((e) => e.domainKey));
  const expected = [
    "line25a_w2_withheld",
    "line25b_withheld_1099",
    "line33_total_payments",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing domain key: ${key}`);
  }
});

Deno.test("Form 1040 line 35a marks an attached Form 8888", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "print_form8888_attached"
  );
  assertEquals(entry?.kind, "checkbox");
  assertEquals(entry?.pdfField, "topmostSubform[0].Page2[0].c2_15[0]");
  assertEquals(
    irs1040Pdf.projectFields?.({ line35a_refund: 1_525 }, {
      f8888: { account_1: {}, account_2: {} },
    })?.print_form8888_attached,
    true,
  );
  assertEquals(
    irs1040Pdf.projectFields?.({ line35a_refund: 1_525 }, {})
      ?.print_form8888_attached,
    false,
  );
});

Deno.test("Form 1040 page 2 prints spouse-itemization and age/blindness boxes", () => {
  for (
    const [key, field] of [
      ["mfs_spouse_itemizing", "c2_3[0]"],
      ["taxpayer_age_65_or_older", "c2_5[0]"],
      ["taxpayer_blind", "c2_6[0]"],
      ["spouse_age_65_or_older", "c2_7[0]"],
      ["spouse_blind", "c2_8[0]"],
    ] as const
  ) {
    const entry = irs1040Pdf.fields.find((item) => item.domainKey === key);
    assertEquals(entry?.kind, "checkbox");
    assertEquals(entry?.pdfField, `topmostSubform[0].Page2[0].${field}`);
  }
  assertEquals(
    irs1040Pdf.projectFields?.({ taxpayer_age_65_or_older: true }, {})
      ?.taxpayer_age_65_or_older,
    true,
  );
});

Deno.test("irs1040Pdf.fields: no empty domain keys or PDF field names", () => {
  for (const entry of irs1040Pdf.fields) {
    assertEquals(entry.domainKey.length > 0, true, "Empty domain key found");
    assertEquals(entry.pdfField.length > 0, true, "Empty PDF field name found");
  }
});

// ---------------------------------------------------------------------------
// filerFields structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf.filerFields: present and contains expected keys", () => {
  const filerFields = irs1040Pdf.filerFields ?? [];
  const domainKeys = new Set(filerFields.map((e) => e.domainKey));
  const expected = [
    "firstNameWithInitial",
    "lastName",
    "primarySSN",
    "address.line1",
    "address.city",
    "address.state",
    "address.zip",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing filerField key: ${key}`);
  }
});
