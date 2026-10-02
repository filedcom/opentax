import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import { AccountType } from "../../../mef/header.ts";
import { irs1040Pdf } from "./f1040.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import {
  assertF1040FinalHeader,
  assertGeneral1040HeaderSource,
} from "../../filer-source-reconciliation.ts";

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

Deno.test("Form 1040 PDF line 27c checks the canonical opt-out box from retained source", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "print_do_not_claim_eic"
  );
  assertEquals(entry?.kind, "checkbox");
  assertEquals(
    entry?.pdfField,
    "topmostSubform[0].Page2[0].c2_13[0]",
  );
  const source = {
    general: { filing_status: "single", do_not_claim_eic: true },
    eitc: { credit_amount: 0 },
  };
  const fields = {
    filing_status: "single",
    do_not_claim_eic: true,
    line27_eitc: 0,
  };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.print_do_not_claim_eic,
    true,
  );
  assertEquals(
    irs1040Pdf.projectFields?.({ line27_eitc: 0 }, {})
      ?.print_do_not_claim_eic,
    false,
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ ...fields, line27_eitc: 1 }, source),
    Error,
    "requires zero line 27a credit",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, {}),
    Error,
    "needs the retained general election",
  );
});

Deno.test("Form 1040 PDF maps retained IP PIN, contact, and address source to exact widgets", () => {
  const source = {
    filing_status: "mfj",
    taxpayer_ssn: "111223333",
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Example",
    taxpayer_ip_pin: "123456",
    taxpayer_daytime_phone: "5551234567",
    taxpayer_email: "ada@example.com",
    spouse_ssn: "444556666",
    spouse_first_name: "Pat",
    spouse_last_name: "Example",
    spouse_ip_pin: "654321",
    address_line1: "10 King Street",
    address_line2: "Apt 2",
    address_city: "Toronto",
    address_foreign_country: "CA",
    address_foreign_province_state: "Ontario",
    address_foreign_postal_code: "M5H 1A1",
  };
  const filer = extractFilerIdentity(source)!;
  const expected: Record<string, [string | undefined, string]> = {
    ipPin: [filer.ipPin, "topmostSubform[0].Page2[0].f2_41[0]"],
    "spouse.ipPin": [
      filer.spouse?.ipPin,
      "topmostSubform[0].Page2[0].f2_43[0]",
    ],
    phone: [filer.phone, "topmostSubform[0].Page2[0].f2_44[0]"],
    email: [filer.email, "topmostSubform[0].Page2[0].f2_45[0]"],
    "address.line2": [
      filer.address.line2,
      "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_21[0]",
    ],
    "address.foreignProvinceState": [
      filer.address.foreignProvinceState,
      "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_26[0]",
    ],
    "address.foreignPostalCode": [
      filer.address.foreignPostalCode,
      "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_27[0]",
    ],
  };
  for (const [key, [value, widget]] of Object.entries(expected)) {
    const entry = irs1040Pdf.filerFields?.find((field) =>
      field.domainKey === key
    );
    assertEquals(entry?.kind, "text");
    assertEquals(entry?.pdfField, widget);
    assertEquals(
      value,
      key === "ipPin"
        ? "123456"
        : key === "spouse.ipPin"
        ? "654321"
        : key === "phone"
        ? "5551234567"
        : key === "email"
        ? "ada@example.com"
        : key === "address.line2"
        ? "Apt 2"
        : key === "address.foreignProvinceState"
        ? "Ontario"
        : "M5H 1A1",
    );
  }
  const country = irs1040Pdf.fields.find((field) =>
    field.domainKey === "print_foreign_country_name"
  );
  assertEquals(country?.kind, "text");
  assertEquals(
    country?.pdfField,
    "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_25[0]",
  );
  assertEquals(
    irs1040Pdf.projectFields?.({ address_foreign_country: "CA" }, {})
      ?.print_foreign_country_name,
    "Canada",
  );
});

Deno.test("Form 1040 PDF and shared header preflight reject retained deceased facts", () => {
  const fields = { filing_status: "single", digital_assets: false };
  const general = { taxpayer_deceased: true };
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, { general }),
    Error,
    "deceased Form 1040",
  );
  assertThrows(
    () => assertGeneral1040HeaderSource({ general }),
    Error,
    "deceased Form 1040",
  );
  const filer = extractFilerIdentity({
    filing_status: "single",
    taxpayer_ssn: "111223333",
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Example",
    taxpayer_death_date: "2025-06-01",
  })!;
  assertThrows(
    () => assertF1040FinalHeader(fields, filer),
    Error,
    "deceased Form 1040",
  );
});

Deno.test("Form 1040 PDF line 28 projects the sourced ACTC opt-out checkbox", () => {
  const mapped = irs1040Pdf.fields.find((entry) =>
    entry.domainKey === "print_do_not_claim_actc"
  );
  assertEquals(mapped?.kind, "checkbox");
  assertEquals(
    mapped?.pdfField,
    "topmostSubform[0].Page2[0].Line28_ReadOrder[0].c2_14[0]",
  );
  const source = { f8812: { f8812s: [{ do_not_claim_actc: true }] } };
  assertEquals(
    irs1040Pdf.projectFields?.({ line28_actc: 0 }, source)
      ?.print_do_not_claim_actc,
    true,
  );
  assertEquals(
    irs1040Pdf.projectFields?.({ line28_actc: 0 }, {})
      ?.print_do_not_claim_actc,
    false,
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line28_actc: 1 }, source),
    Error,
    "requires zero line 28 credit",
  );
});

Deno.test("Form 1040 PDF line 1h prints FEC only for reconciled foreign wages", () => {
  const mapped = irs1040Pdf.fields.find((entry) =>
    entry.domainKey === "print_line1h_type"
  );
  assertEquals(mapped?.kind, "text");
  assertEquals(
    mapped?.pdfField,
    "topmostSubform[0].Page1[0].f1_54[0]",
  );
  const toronto = {
    line1: "10 King Street",
    city: "Toronto",
    country_code: "CA",
  };
  const fec = {
    fecs: [{
      foreign_employer_name: "Maple Employer Ltd",
      country_code: "CA",
      compensation_amount: 3_000,
      compensation_usd: 3_000,
      compensation_owner_ssn: "111223333",
      compensation_source_document_reference: "2025 payroll record",
      service_residence: { kind: "foreign", address: toronto },
      employer_foreign_address: toronto,
      employer_has_us_ein: false,
      employer_issued_w2: false,
    }],
  };
  const source = {
    fec,
    agi_aggregator: { line1h_other_earned: [3_000] },
  };
  const fields = { line1h_other_earned: 3_000 };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.print_line1h_type,
    "FEC",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(
      { line1h_other_earned: 3_000, print_line1h_type: "OTHER" },
      source,
    )?.print_line1h_type,
    "FEC",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line1h_other_earned: 3_001 }, source),
    Error,
    "must equal finalized and AGI line 1h",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        agi_aggregator: { line1h_other_earned: 3_001 },
      }),
    Error,
    "must equal finalized and AGI line 1h",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { line1h_other_earned: 3_000, print_line1h_type: "FEC" },
        {},
      ),
    Error,
    "exactly one supported retained source",
  );
  const physical = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-form2555-full-year-physical-presence"
  )?.inputs.form2555;
  assertEquals(
    irs1040Pdf.projectFields?.(
      { line1h_other_earned: 100_000 },
      {
        form2555: physical as Record<string, unknown>,
        agi_aggregator: { line1h_other_earned: [100_000] },
      },
    )?.print_line1h_type,
    "FEC",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        form2555: physical as Record<string, unknown>,
      }),
    Error,
    "separate attribution for mixed earned-income types",
  );
});

Deno.test("Form 1040 PDF line 1h labels reviewed W-2 code D excess deferrals", () => {
  const wage = (ein: string, reference: string) => ({
    employer_ein: ein,
    employee_ssn: "111223333",
    box1_wages: 50_000,
    box2_fed_withheld: 5_000,
    box12_entries: [{ code: "D", amount: 13_000 }],
    box13_retirement_plan: true,
    excess_deferral_review: {
      plan_type: "non_simple_401k",
      plan_review_reference: "Reviewed 2025 plan terms",
      employee_birth_date: "1985-06-15",
      birth_date_source_reference: "Reviewed date of birth",
      w2_source_reference: reference,
    },
  });
  const source = {
    w2: {
      w2s: [
        wage("12-3456789", "2025 W-2 A"),
        wage("98-7654321", "2025 W-2 B"),
      ],
    },
    agi_aggregator: { line1h_other_earned: 2_500 },
  };
  const fields = { line1h_other_earned: 2_500 };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.print_line1h_type,
    "EXCESS DEFERRALS",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line1h_other_earned: 2_501 }, source),
    Error,
    "must equal finalized and AGI line 1h",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        agi_aggregator: { line1h_other_earned: 2_501 },
      }),
    Error,
    "must equal finalized and AGI line 1h",
  );
});

Deno.test("Form 1040 PDF line 1h labels only an identified code-8 corrective plan distribution", () => {
  const source = {
    f1099r: {
      f1099rs: [{
        payer_name: "Example Retirement Plan",
        payer_ein: "12-3456789",
        recipient_ssn: "111223333",
        source_document_reference: "2025 1099-R copy",
        ts: "T",
        box1_gross_distribution: 5_000,
        box2a_taxable_amount: 3_000,
        box7_distribution_code: "8",
        box7_ira_simple_indicator: false,
      }],
    },
    agi_aggregator: { line1h_other_earned: [3_000] },
  };
  const fields = { line1h_other_earned: 3_000 };
  assertEquals(
    irs1040Pdf.projectFields?.(fields, source)?.print_line1h_type,
    "CORRECTIVE DISTRIBUTION",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { line1h_other_earned: 6_000 },
        {
          ...source,
          f1099r: {
            f1099rs: [
              { ...source.f1099r.f1099rs[0], account_number: "PLAN-1" },
              { ...source.f1099r.f1099rs[0], account_number: "PLAN-1" },
            ],
          },
          agi_aggregator: { line1h_other_earned: 6_000 },
        },
      ),
    Error,
    "repeats the same payer",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        f1099r: {
          f1099rs: [{
            ...source.f1099r.f1099rs[0],
            source_document_reference: undefined,
          }],
        },
      }),
    Error,
    "need identified 2025 Form 1099-R sources",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        agi_aggregator: { line1h_other_earned: 3_001 },
      }),
    Error,
    "must equal finalized and AGI line 1h",
  );
  const deferralW2 = (employerEin: string, reference: string) => ({
    employer_ein: employerEin,
    employee_ssn: "111223333",
    box1_wages: 50_000,
    box2_fed_withheld: 5_000,
    box12_entries: [{ code: "D", amount: 13_000 }],
    box13_retirement_plan: true,
    excess_deferral_review: {
      plan_type: "non_simple_401k",
      plan_review_reference: "Reviewed 2025 plan terms",
      employee_birth_date: "1985-06-15",
      birth_date_source_reference: "Reviewed date of birth",
      w2_source_reference: reference,
    },
  });
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(fields, {
        ...source,
        w2: {
          w2s: [
            deferralW2("12-3456789", "2025 W-2 A"),
            deferralW2("98-7654321", "2025 W-2 B"),
          ],
        },
      }),
    Error,
    "separate attribution for mixed earned-income types",
  );
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

Deno.test("2025 Form 1040 PDF line 12e prints the selected deduction once", () => {
  const entries = irs1040Pdf.fields.filter((field) =>
    field.pdfField === "topmostSubform[0].Page2[0].f2_02[0]"
  );
  assertEquals(entries.map((field) => field.domainKey), [
    "line12c_deduction_total",
  ]);
  const standardSelected = {
    line12a_standard_deduction: 15_750,
    line12e_itemized_deductions: 5_000,
    line12c_deduction_total: 15_750,
  };
  assertEquals(
    irs1040Pdf.projectFields?.(standardSelected, {})
      ?.line12c_deduction_total,
    15_750,
  );
  assertEquals(
    irs1040Pdf.projectFields?.({
      line12e_itemized_deductions: 20_000,
      line12c_deduction_total: 20_000,
    }, {})?.line12c_deduction_total,
    20_000,
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({
        ...standardSelected,
        line12c_deduction_total: 5_000,
      }, {}),
    Error,
    "line 12e differs from the selected deduction",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({
        line12a_standard_deduction: 15_750,
        line12e_itemized_deductions: 5_000,
      }, {}),
    Error,
    "line 12e differs from the selected deduction",
  );
});

Deno.test("2025 Form 1040 PDF line 16 identifies Form 4972 in box 2", () => {
  const line16Checks = irs1040Pdf.fields.filter((field) =>
    field.domainKey === "form8814_tax" || field.domainKey === "form4972_tax"
  );
  assertEquals(
    line16Checks.map((field) => [field.domainKey, field.kind, field.pdfField]),
    [
      [
        "form8814_tax",
        "checkbox",
        "topmostSubform[0].Page2[0].c2_9[0]",
      ],
      [
        "form4972_tax",
        "checkbox",
        "topmostSubform[0].Page2[0].c2_10[0]",
      ],
    ],
  );
  assertEquals(
    irs1040Pdf.projectFields?.({
      line16_income_tax: 500,
      form4972_tax: 500,
    }, {})?.form4972_tax,
    500,
  );
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
          not_inherited_ira_confirmed: true,
          not_required_minimum_distribution_confirmed: true,
          rollover_eligibility_review_reference: "reviewed-ira-eligibility-1",
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

Deno.test("2025 Form 1040 single-account refund uses the finalized filer bank account on lines 35b–d", () => {
  const bankFields = irs1040Pdf.filerFields?.filter((entry) =>
    entry.domainKey.startsWith("bankAccount.")
  );
  assertEquals(bankFields, [
    {
      kind: "text",
      domainKey: "bankAccount.routingNumber",
      pdfField: "topmostSubform[0].Page2[0].RoutingNo[0].f2_32[0]",
    },
    {
      kind: "checkboxWhen",
      domainKey: "bankAccount.accountType",
      pdfField: "topmostSubform[0].Page2[0].c2_16[0]",
      whenValue: AccountType.Checking,
    },
    {
      kind: "checkboxWhen",
      domainKey: "bankAccount.accountType",
      pdfField: "topmostSubform[0].Page2[0].c2_16[1]",
      whenValue: AccountType.Savings,
    },
    {
      kind: "text",
      domainKey: "bankAccount.accountNumber",
      pdfField: "topmostSubform[0].Page2[0].AccountNo[0].f2_33[0]",
    },
  ]);
  assertEquals(
    irs1040Pdf.fields.some((entry) =>
      entry.domainKey === "bank_routing_number" ||
      entry.domainKey === "bank_account_number"
    ),
    false,
  );
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
  for (const refund of [undefined, 0, -1, Number.NaN]) {
    assertThrows(
      () =>
        irs1040Pdf.projectFields?.(
          { line35a_refund: refund },
          { f8888: { account_1: {}, account_2: {} } },
        ),
      Error,
      "Form 8888 requires a positive refund",
    );
  }
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
