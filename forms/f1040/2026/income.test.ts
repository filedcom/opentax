import { test } from "bun:test";
import { existsSync } from "node:fs";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../scripts/support/sys.ts";
import { catalog } from "../../../catalog.ts";
import { signed } from "../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../cli/commands/export.ts";
import { normalizeAllPending } from "../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";

// Hand-computed TY2026 income returns. Every expected amount follows from
// Rev. Proc. 2025-32 (§4.01 Table 3 single rates, §4.03 capital-gain
// breakpoints, §4.14 standard deduction), Publication 505 (2026) Worksheets
// 2-3 and 2-7 (the 2026 SE tax and capital-gain worksheets) and the draft
// 2026 Schedule SE line 7 ($184,500). The 2026 Tax Table is not published, so
// a cell below $100,000 is the tax at its $50 row midpoint, as IRS builds it.

const SCHEMA = fromFileUrl(
  new URL(
    "../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};

function w2(wages: number, withheld: number) {
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    employee_ssn: "111-22-3333",
    box3_ss_wages: wages,
    box4_ss_withheld: Math.round(wages * 0.062 * 100) / 100,
    box5_medicare_wages: wages,
    box6_medicare_withheld: Math.round(wages * 0.0145 * 100) / 100,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "10 Employer Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box12_entries: [],
  };
}

/** W-2, 1099-INT, 1099-DIV, two broker sales, unemployment and a pension. */
function investmentReturn(): Record<string, unknown> {
  return {
    general,
    w2: [w2(60_000, 7_000)],
    f1099int: [{
      payer_name: "Example Bank",
      payer_tin: "23-4567890",
      recipient_tin: "111223333",
      source_document_reference: "ty2026-1099-int-example-bank",
      box1: 600,
    }],
    f1099div: [{
      payerName: "Example Fund",
      payerTin: "345678901",
      recipient_tin: "111223333",
      source_document_reference: "ty2026-1099-div-example-fund",
      isNominee: false,
      box11: false,
      box1a: 800,
      box1b: 500,
      box2a: 200,
    }],
    f8949: [
      {
        part: "A",
        description: "Short-term shares",
        source_transaction_id: "ty2026-short-sale",
        date_acquired: "2026-01-10",
        date_sold: "2026-06-20",
        proceeds: 3_000,
        cost_basis: 4_000,
      },
      {
        part: "D",
        description: "Long-term shares",
        source_transaction_id: "ty2026-long-sale",
        date_acquired: "2022-01-10",
        date_sold: "2026-06-20",
        proceeds: 12_000,
        cost_basis: 7_000,
      },
    ],
    f1099g: [{
      recipient_tin: "111223333",
      payer_name: "Example State Unemployment Agency",
      box_1_unemployment: 2_000,
    }],
    f1099r: [{
      payer_name: "Example Pension Plan",
      payer_ein: "12-3456789",
      recipient_ssn: "111-22-3333",
      source_document_reference: "ty2026-1099-r-example-pension",
      box1_gross_distribution: 10_000,
      box2a_taxable_amount: 10_000,
      box4_federal_withheld: 1_000,
      box7_distribution_code: "7",
    }],
  };
}

/** A W-2 near the 2026 wage base plus a 1099-NEC Schedule C business. */
function selfEmployedReturn(): Record<string, unknown> {
  return {
    general: {
      ...general,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: [w2(160_000, 30_000)],
    schedule_c: [{
      business_reference: "ty2026-consulting",
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_c_business_name: "Example Consulting",
      line_d_ein: "12-3456789",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: 60_000,
      line_8_advertising: 10_000,
    }],
  };
}

/** Wages, disability benefits, an actively managed rental loss and a W-2G. */
function benefitsRentalReturn(): Record<string, unknown> {
  return {
    general,
    w2: [w2(40_000, 4_000)],
    ssa1099: [{
      recipient_tin: "111223333",
      source_document_reference: "ty2026-ssa-1099",
      box3_gross_benefits: 12_000,
      box5_net_benefits: 12_000,
    }],
    schedule_e: [{
      tsj: "T",
      activity_id: "ty2026-rental",
      property_description: "Example rental",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 5_000,
      expense_repairs: 10_000,
      form_1099_payments_made: false,
      street_address: "12 Example Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
    w2g: [{
      calendar_year: 2026,
      source_document_reference: "ty2026-w2g-casino",
      payer_name: "Casino Inc",
      payer_name_control: "CASI",
      payer_us_address: {
        line1: "500 Casino Way",
        city: "Las Vegas",
        state: "NV",
        zip: "89101",
      },
      payer_ein: "12-3456789",
      winner_name: "Alex Example",
      winner_us_address: {
        line1: "1 Example Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      box9_winner_tin: "111-22-3333",
      box1_winnings: 1_000,
      standard_or_nonstandard_code: "S",
    }],
  };
}

function signed2026(inputs: Record<string, unknown>): Record<string, unknown> {
  const input = signed(inputs);
  return {
    ...input,
    general: {
      ...(input.general as Record<string, unknown>),
      taxpayer_signature_date: "2027-02-01",
    },
  };
}

async function exported(inputs: Record<string, unknown>) {
  const def = catalog["f1040:2026"];
  const result = def.executeReturn(signed2026(inputs));
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = (await def.prepareReturn(pending, filer, [])).bundle.xml;
  return { result, pending, filer, xml };
}

async function assertSchemaValid(xml: string, name: string): Promise<void> {
  const dir = await sys.makeTempDir();
  const path = `${dir}/${name}.xml`;
  await sys.writeText(path, xml);
  const validated = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", SCHEMA, path],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(
    validated.code,
    0,
    new TextDecoder().decode(validated.stderr),
  );
}

test("TY2026 investment return taxes gains at the 2026 breakpoints", async () => {
  const { result, pending } = await exported(investmentReturn());
  assertEquals(result.diagnostics, []);
  const f = pending.f1040 ?? {};
  assertEquals(f.line2b_taxable_interest, 600);
  assertEquals(f.line3a_qualified_dividends, 500);
  assertEquals(f.line3b_ordinary_dividends, 800);
  // Schedule D: ($1,000) short-term; $5,000 + $200 distributions long-term.
  assertEquals(f.line7_capital_gain, 4_200);
  assertEquals(f.line5b_pension_taxable, 10_000);
  // $60,000 + $600 + $800 + $4,200 + $10,000 + $2,000 unemployment.
  assertEquals(f.line11_agi, 77_600);
  assertEquals(f.line12a_standard_deduction, 16_100);
  assertEquals(f.line15_taxable_income, 61_500);
  // Worksheet 2-7: line 4 $4,700 (QD $500 + net gain $4,200); line 10
  // $56,800; the 0% ceiling ($49,450) is filled by ordinary income, so all
  // $4,700 is at 15% ($705). Tax on $56,800: $5,800 + 22% x ($56,825 -
  // $50,400) = $7,213.50, so $7,214; total $7,919, below the $8,248 regular
  // tax on $61,500 ($5,800 + 22% x $11,125 = $8,247.50).
  assertEquals(f.line16_income_tax, 7_919);
  // Withholding: $7,000 W-2 + $1,000 1099-R.
  assertEquals(f.line33_total_payments, 8_000);
  assertEquals(f.line34_overpayment, 81);
});

test("TY2026 self-employment tax stops at the $184,500 wage base", async () => {
  const { result, pending } = await exported(selfEmployedReturn());
  assertEquals(result.diagnostics, []);
  const se = pending.schedule_se ?? {};
  assertEquals(se.w2_ss_wages, 160_000);
  const s2 = pending.schedule2 ?? {};
  // Net earnings $50,000 x 92.35% = $46,175. Social security part limited
  // to $184,500 - $160,000 = $24,500 x 12.4% = $3,038; Medicare $46,175 x
  // 2.9% = $1,339; SE tax $4,377, half $2,189 (rounded).
  assertEquals(s2.line4_se_tax, 4_377);
  const f = pending.f1040 ?? {};
  // AGI $160,000 + $50,000 - $2,189.
  assertEquals(f.line11_agi, 207_811);
  // QBI $47,811 x 20% = $9,562 (below 20% of $191,711 taxable income).
  assertEquals(f.line13_qbi_deduction, 9_562);
  assertEquals(f.line15_taxable_income, 182_149);
  // $17,966 + 24% x ($182,149 - $105,700) = $36,313.76.
  assertEquals(f.line16_income_tax, 36_314);
});

test("TY2026 benefits, rental loss and gambling winnings reach AGI", async () => {
  const { result, pending } = await exported(benefitsRentalReturn());
  assertEquals(result.diagnostics, []);
  const f = pending.f1040 ?? {};
  // 2026 Social Security Benefits Worksheet (IRC §86 base amounts, not
  // indexed): other income $40,000 - $5,000 + $1,000 = $36,000 plus half
  // the $12,000 benefits is $42,000; 50% of the first $9,000 above $25,000
  // ($4,500) plus 85% of the $8,000 above $34,000 ($6,800) is $11,300,
  // capped at 85% of benefits, $10,200.
  assertEquals(f.line6a_ss_gross, 12_000);
  assertEquals(f.line6b_ss_taxable, 10_200);
  // The $5,000 rental loss is within the $25,000 active-participation
  // allowance (IRC §469(i)); W-2G winnings go to Schedule 1 line 8b.
  const s1 = pending.schedule1 ?? {};
  assertEquals(s1.line5_schedule_e, -5_000);
  assertEquals(s1.line8b_gambling_winnings, 1_000);
  assertEquals(f.line11_agi, 46_200);
  assertEquals(f.line15_taxable_income, 30_100);
  // $1,240 + 12% x ($30,125 - $12,400) = $3,367.
  assertEquals(f.line16_income_tax, 3_367);
  assertEquals(f.line34_overpayment, 633);
});

test.skipIf(!existsSync(SCHEMA))(
  "TY2026 income returns export TaxYr 2026 XML valid against 2026v1.0",
  async () => {
    for (
      const [name, inputs] of [
        ["investments", investmentReturn()],
        ["self-employed", selfEmployedReturn()],
        ["benefits-rental", benefitsRentalReturn()],
      ] as const
    ) {
      const { pending, filer, xml } = await exported(inputs);
      assertStringIncludes(xml, "<TaxYr>2026</TaxYr>");
      await assertSchemaValid(xml, name);
      // IND-002 and IND-689-01 compare the tax period and signature year with
      // today's date, so they hold until the 2027 filing season opens.
      const rejects = businessRuleReport(
        pending,
        filer,
        emittedValidationScope(xml),
      ).entries.filter((entry) =>
        entry.severity !== "alert" &&
        !["IND-002", "IND-689-01"].includes(entry.ruleNumber)
      ).map((entry) => entry.ruleNumber);
      assertEquals(rejects, [], name);
    }
  },
  60_000,
);
