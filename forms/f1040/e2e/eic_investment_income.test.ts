import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { irs1040Pdf } from "../2025/pdf/forms/f1040.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference: "Synthetic 2025 family review",
  },
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "Synthetic IRS account review",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
  },
};
const w2 = {
  employee_ssn: "111-22-3333",
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employer_address_line1: "10 Employer Road",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  box1_wages: 5_000,
  box2_fed_withheld: 0,
  box3_ss_wages: 5_000,
  box4_ss_withheld: 310,
  box5_medicare_wages: 5_000,
  box6_medicare_withheld: 72.5,
};

function run(
  taxExemptInterest: number,
  taxableInterest = 0,
  ordinaryDividends = 0,
) {
  return execute(plan, registry, {
    general,
    w2: [w2],
    f1099int: [{
      payer_name: "Example Bank",
      recipient_ssn: "111-22-3333",
      box1: taxableInterest,
      box8: taxExemptInterest,
    }],
    ...(ordinaryDividends > 0
      ? {
        f1099div: [{
          payerName: "Example Broker",
          isNominee: false,
          box11: false,
          box1a: ordinaryDividends,
        }],
      }
      : {}),
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("EIC investment limit follows filed interest and dividends through the full graph", async () => {
  const atLimit = run(11_950);
  assertEquals(atLimit.diagnostics, []);
  assertEquals(atLimit.pending.f1040.line2a_tax_exempt, 11_950);
  assertEquals(atLimit.pending.eitc.investment_income_floor, 11_950);
  assertEquals(atLimit.pending.f1040.line27_eitc, 384);
  const filer = extractFilerIdentity(atLimit.pending.f1040);
  const xml = buildMefXml(buildPending(atLimit.pending), filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }

  const overLimit = run(11_951);
  assertEquals(overLimit.diagnostics, []);
  assertEquals(overLimit.pending.eitc.investment_income_floor, 11_951);
  assertEquals(overLimit.pending.f1040.line27_eitc, undefined);

  const mixed = run(9_951, 1_000, 1_000);
  assertEquals(mixed.diagnostics, []);
  assertEquals(mixed.pending.f1040.line2a_tax_exempt, 9_951);
  assertEquals(mixed.pending.f1040.line2b_taxable_interest, 1_000);
  assertEquals(mixed.pending.f1040.line3b_ordinary_dividends, 1_000);
  assertEquals(mixed.pending.eitc.investment_income_floor, 11_951);
  assertEquals(mixed.pending.f1040.line27_eitc, undefined);

  const tampered = {
    ...atLimit.pending,
    eitc: { ...atLimit.pending.eitc, investment_income_floor: 0 },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "investment income differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(atLimit.pending.f1040, tampered),
    Error,
    "investment income differs",
  );
  const changedReturn = {
    ...atLimit.pending,
    f1040: { ...atLimit.pending.f1040, line2a_tax_exempt: 0 },
  };
  assertThrows(
    () => buildMefXml(buildPending(changedReturn), filer),
    Error,
    "investment income differs",
  );
});
