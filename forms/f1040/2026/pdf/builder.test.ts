import { test } from "bun:test";
import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import * as fs from "node:fs/promises";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import { pdfReviewFixtures } from "../../2025/pdf/review-fixtures.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2026 } from "../index.ts";
import { TY2026_DRAFT_NOTICE } from "./draft-template.ts";
import { TY2026_PDF_MAPPED_FORMS, ty2026PdfForms } from "./builder.ts";
import { scheduleEPdf2026 } from "./forms/income/rental-passthrough/schedule_e.ts";
import { loadPdfTemplate } from "../../2025/pdf/support/template-cache.ts";

const fixture = (id: string) => {
  const row = pdfReviewFixtures.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`missing sample ${id}`);
  return row.inputs as Record<string, unknown>;
};

async function render(inputs: Record<string, unknown>) {
  const result = f1040_2026.executeReturn(signed(inputs));
  const pending = result.pending as Record<string, Record<string, unknown>>;
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  return await f1040_2026.buildPdfBytes(
    f1040_2026.buildPending(pending),
    filer,
  );
}

async function text(bytes: Uint8Array): Promise<string> {
  const path = await sys.makeTempFile({ suffix: ".pdf" });
  try {
    await fs.writeFile(path, bytes);
    const out = await new sys.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(out.success, true, new TextDecoder().decode(out.stderr));
    return new TextDecoder().decode(out.stdout).replace(/[ \t]+/g, " ");
  } finally {
    await sys.remove(path);
  }
}

test("TY2026 PDF prints Form 1040 and Schedule 3 on the 2026 draft lines", async () => {
  const bytes = await render(
    fixture("single-two-employers-excess-social-security"),
  );
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  assertEquals(doc.getPageCount(), 3);
  assertEquals(doc.getSubject(), TY2026_DRAFT_NOTICE);
  const printed = await text(bytes);
  assertMatch(printed, /Individual Income Tax Return 2026/);
  assertMatch(printed, /DRAFT/);
  assertMatch(printed, /1a Total amount from Form\(s\) W-2[^\n]* 1a 200000/);
  assertMatch(printed, /12e Standard deduction[^\n]* 12e 16100/);
  assertMatch(printed, /24a Add lines 22 and 23[^\n]* 24a 36734/);
  assertMatch(printed, /24c Add lines 24a and 24b[^\n]* 24c 36734/);
  assertMatch(printed, /32c Subtract line 32b[^\n]* 32c 961/);
  assertMatch(printed, /11 Excess social security[^\n]* 11 961/);
  assertMatch(printed, /15 Add lines 9 through 12 and 14[^\n]* 15 961/);
});

test("TY2026 PDF prints Schedule 1 on the 2026 draft", async () => {
  const printed = await text(
    await render(fixture("single-mixed-box8-rtaa-taxable-grant-line8z")),
  );
  assertMatch(printed, /SCHEDULE 1[\s\S]*2026/);
  assertMatch(printed, /8 Additional income from Schedule 1, line 10[^\n]* 8 1750/);
});

test("TY2026 PDF moves W-2 uncollected tax to Schedule 2 line 17c", async () => {
  const inputs = fixture("single-two-employers-excess-social-security");
  const [first] = inputs.w2 as Array<Record<string, unknown>>;
  const printed = await text(
    await render({
      ...inputs,
      w2: [{
        ...first,
        box12_entries: [{ code: Box12Code.A, amount: 300 }],
      }],
    }),
  );
  assertMatch(printed, /SCHEDULE 2[\s\S]*2026/);
  assertMatch(printed, /17c Uncollected social security[\s\S]*?17c 300/);
  assertMatch(printed, /17d Total other employment taxes[^\n]* 17d 300/);
  assertMatch(printed, /20 Total additional employment[^\n]* 20 300/);
  assertMatch(printed, /\n 21 [^\n]*\n[^\n]* 21 300/);
  assertMatch(printed, /23 Additional taxes[^\n]* 23 300/);
});

const soleProprietor = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
    taxpayer_can_be_claimed_as_dependent: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
  },
  w2: [{
    box1_wages: 60000,
    box2_fed_withheld: 9000,
    employee_ssn: "111-22-3333",
    box3_ss_wages: 60000,
    box4_ss_withheld: 3720,
    box5_medicare_wages: 60000,
    box6_medicare_withheld: 870,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "10 Employer Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box12_entries: [],
  }],
  schedule_c: [{
    business_reference: "synthetic-design-studio",
    proprietor_recipient: "T",
    line_a_principal_business: "Graphic design",
    line_b_business_code: "541430",
    line_c_business_name: "Example Design Studio",
    line_e_business_address: {
      line1: "20 Studio Lane",
      line2: "Suite 4",
      city: "Austin",
      state: "TX",
      zip: "78702",
    },
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    qbi_no_other_adjustments_confirmed: true,
    line_1_gross_receipts: 30000,
    line_8_advertising: 1200,
    line_18_office_expense: 700,
    line_22_supplies: 450,
  }],
};

test("TY2026 PDF prints Schedules C and SE and Form 8995 on the 2026 drafts", async () => {
  const printed = await text(await render(soleProprietor));
  assertMatch(printed, /SCHEDULE C[\s\S]*2026/);
  assertMatch(printed, /\n 20 Studio Lane Suite 4\n[^\n]*\n Austin TX 78702\n/);
  assertMatch(printed, /check the box if this income[\s\S]*? 1 30000/);
  assertMatch(printed, /8 Advertising[^\n]* 8 1200 18 Office expense[^\n]* 18 700/);
  assertMatch(printed, /22 Supplies[^\n]* 22 450/);
  assertMatch(printed, /28 Total expenses before[^\n]* 28 2350/);
  assertMatch(printed, /29 Tentative profit[^\n]* 29 27650/);
  assertMatch(printed, /SCHEDULE SE[\s\S]*2026/);
  assertMatch(printed, /code A \(other than\n[^\n]* 2 27650/);
  assertMatch(printed, /4a If line 3 is more than zero[^\n]* 4a 25535/);
  assertMatch(printed, /and go to line 11[^\n]* 8a 60000/);
  assertMatch(printed, /Form 8995[\s\S]*2026/);
  assertMatch(printed, /2 Total qualified business income[^\n]* 2 25696/);
  assertMatch(printed, /15 Qualified business income deduction before[\s\S]*? 15 5139/);
  assertMatch(printed, /16 Minimum deduction[^\n]* 16 0/);
  assertMatch(printed, /17 Qualified business income deduction\. Enter[\s\S]*? 17 5139/);
  assertMatch(printed, /18 Total qualified business \(loss\)[^\n]* 18 \( 0\)/);
});

test("TY2026 PDF prints Form 8959 self-employment Part IV", async () => {
  const [w2] = soleProprietor.w2;
  const printed = await text(
    await render({
      ...soleProprietor,
      w2: [{
        ...w2,
        box1_wages: 190000,
        box3_ss_wages: 184500,
        box4_ss_withheld: 11439,
        box5_medicare_wages: 190000,
        box6_medicare_withheld: 2755,
      }],
    }),
  );
  assertMatch(printed, /had a loss, enter -0-[^\n]* 13 25535/);
  assertMatch(printed, /15 Enter the amount from line 4[^\n]* 15 190000/);
  assertMatch(printed, /16 Subtract line 15 from line 14[^\n]* 16 10000/);
  assertMatch(printed, /17 Subtract line 16 from line 13[^\n]* 17 15535/);
  assertMatch(printed, /Part I, line 5a\. Go to Part V[^\n]* 18 140/);
  assertMatch(printed, /Attach Form 8959[^\n]* 11 140/);
});

test("TY2026 PDF prints Schedule B on the 2026 draft", async () => {
  const { schedule_c: _, ...wageEarner } = soleProprietor;
  const printed = await text(
    await render({
      ...wageEarner,
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
      f1099int: [
        { payer_name: "First Example Bank", recipient_tin: "111223333", box1: 1200 },
        { payer_name: "Second Example Bank", recipient_tin: "111223333", box1: 800 },
      ],
    }),
  );
  assertMatch(printed, /SCHEDULE B[\s\S]*2026/);
  assertMatch(printed, /First Example Bank[^\n]* 1200/);
  assertMatch(printed, /Second Example Bank[^\n]* 800/);
  assertMatch(printed, /2 Add the amounts on line 1[^\n]* 2 2000/);
  assertMatch(printed, /\n 4 Subtract line 3 from line 2[\s\S]*? 4 2000/);
});

test("TY2026 PDF prints Schedule D and Form 8889 on the 2026 drafts", async () => {
  const capital = await text(
    await render(fixture("single-direct-broker-basis-sales")),
  );
  assertMatch(capital, /SCHEDULE D[\s\S]*2026/);
  assertMatch(capital, /go to line 1b[^\n]* 2000 1000 1000/);
  assertMatch(capital, /go to Part III on the back[^\n]* 7 1000/);
  assertMatch(capital, /go to line 8b[^\n]* 4000 2000 2000/);
  assertMatch(capital, /16 Combine lines 7 and 15[^\n]* 16 3000/);
  const hsa = await text(await render(fixture("joint-two-hsa-owners")));
  assertMatch(hsa, /Health Savings Accounts[\s\S]*2026/);
  assertMatch(hsa, /family coverage\)\. All others[^\n]* 3 4400/);
  assertMatch(hsa, /12 Subtract line 11 from line 8[^\n]* 12 4400/);
  assertMatch(hsa, /13 HSA deduction[^\n]* 13 4000/);
});

test("TY2026 PDF prints Form 8949 Parts I and II on the 2026 draft", async () => {
  const printed = await text(
    await render(fixture("single-short-and-long-form8949-sales")),
  );
  assertMatch(printed, /Form 8949 \(2026\)/);
  assertMatch(printed, /✔ \(B\) Short-term transactions reported/);
  assertMatch(printed, /Short-term shares\n 01\/10\/2025 06\/20\/2025 2000 1000 1000\n/);
  assertMatch(printed, /line 3 \(if Box C or Box I above is checked\) 2000 1000 1000/);
  assertMatch(printed, /✔ \(F\) Long-term transactions, other than/);
  assertMatch(printed, /Long-term shares\n 01\/10\/2022 06\/20\/2025 4000 2000 2000\n/);
  assertMatch(printed, /line 10 \(if Box F or Box L above is checked\) 4000 2000 2000/);
});

test("TY2026 PDF prints Form 8606 on the 2026 draft", async () => {
  // The 2025 sample's source documents, one year later; born 1970 so the
  // 2026 return takes no senior deduction.
  const inputs = JSON.parse(
    JSON.stringify(
      fixture("single-form8606-post-year-contribution-and-distribution"),
    ).replace(/202[4-6]/g, (year) => String(Number(year) + 1)),
  );
  const general = inputs.general as Record<string, unknown>;
  const printed = await text(
    await render({
      ...inputs,
      general: { ...general, taxpayer_dob: "1970-06-15" },
    }),
  );
  assertMatch(printed, /Form 8606[\s\S]*2026/);
  assertMatch(printed, /through April 15, 2027\. See instructions[^\n]* 1 1000/);
  assertMatch(printed, /2 Enter your total basis[^\n]* 2 6000/);
  assertMatch(printed, /\n 2027 [. ]* 4 1000/);
  assertMatch(printed, /5 Subtract line 4 from line 3[^\n]* 5 6000/);
  assertMatch(printed, /\n instructions [. ]* 6 10000/);
  assertMatch(printed, /9 Add lines 6, 7, and 8[^\n]* 9 30000/);
  assertMatch(printed, /enter “1\.000”[^\n]* 10 × 0 \. 200/);
  assertMatch(printed, /that you did not convert to a Roth IRA[^\n]* 12 4000/);
  assertMatch(printed, /2026 and earlier years[^\n]* 14 3000/);
  assertMatch(printed, /15a Subtract line 12 from line 7[^\n]* 15a 16000/);
  assertMatch(printed, /1040-NR, line 4b[^\n]* 15c 16000/);
});

test("TY2026 PDF prints Form 6251 on the 2026 draft", async () => {
  const inputs = fixture("single-iso-amt");
  const [grant] = inputs.f3921 as Array<Record<string, unknown>>;
  const printed = await text(
    await render({
      ...inputs,
      f3921: [{ ...grant, box2_date_option_exercised: "2026-06-02" }],
    }),
  );
  // 2026 exemption 90,100 and 26%/28% break at 244,500 less 4,890.
  assertMatch(printed, /Alternative Minimum Tax—Individuals[\s\S]*2026/);
  assertMatch(printed, /1040-NR, line 14 [. ]* 1a 16100/);
  assertMatch(printed, /\n amount\) [. ]* 1b 183900/);
  assertMatch(printed, /2i Exercise of incentive stock options[^\n]* 2i 240000/);
  assertMatch(printed, /more than \$640,200, see instructions\.\)[^\n]* 4 440000/);
  assertMatch(printed, /70,100 \. \. 5 90100/);
  assertMatch(printed, /and go to line 10[^\n]* 6 349900/);
  assertMatch(printed, /complete Part III \. \. 7 93082/);
  assertMatch(printed, /9 Tentative minimum tax[^\n]* 9 93082/);
  assertMatch(printed, /\n instructions [. ]* 10 36734/);
  assertMatch(printed, /Schedule 2 \(Form 1040\), line 2 11 56348/);
});

test("TY2026 PDF prints Form 8615 on the 2026 draft", async () => {
  const inputs = JSON.parse(
    JSON.stringify(fixture("single-child-unearned-income"))
      .replace(/202[4-6]/g, (year) => String(Number(year) + 1)),
  );
  const printed = await text(await render(inputs));
  assertMatch(printed, /Tax for Certain Children[\s\S]*2026/);
  assertMatch(printed, /Alex Child 123456789\n[\s\S]*?Jane Parent 987654321/);
  assertMatch(printed, /unearned income\. See instructions[^\n]* 1 5000/);
  assertMatch(printed, /enter \$2,700\. Otherwise[^\n]* 2 2700/);
  assertMatch(printed, /see the instructions [. ]* 4 3650/);
  assertMatch(printed, /8 Add lines 5, 6, and 7[^\n]* 8 82300/);
  assertMatch(printed, /go to Part III [. ]* 11 257/);
  assertMatch(printed, /14 Subtract line 5 from line 4[^\n]* 14 1350/);
  assertMatch(printed, /16 Add lines 13 and 15[^\n]* 16 393/);
  assertMatch(printed, /child files Form 2555[^\n]* 18 393/);
});

test("TY2026 PDF prints Form 8880 on the 2026 draft", async () => {
  const inputs = JSON.parse(
    JSON.stringify(fixture("single-form8880-w2-deferral"))
      .replace(/202[4-6]/g, (year) => String(Number(year) + 1)),
  );
  const printed = await text(await render(inputs));
  assertMatch(printed, /Form 8880[\s\S]*2026/);
  assertMatch(printed, /plan contributions for 2026 \(see instructions\)[^\n]* 2 2000/);
  assertMatch(printed, /7 Add the amounts on line 6[^\n]* 7 2000/);
  assertMatch(printed, /line 11a\* [. ]* 8 20000/);
  assertMatch(printed, /\$26,250 \$36,375 0\.5 0\.5 0\.1 9 x0\. 5/);
  assertMatch(printed, /10 Multiply line 7 by line 9[^\n]* 10 1000/);
  assertMatch(printed, /Credit Limit Worksheet in the instructions 11 393/);
  assertMatch(printed, /Schedule 3 \(Form 1040\), line 4 [. ]* 12 393/);
});

test("TY2026 PDF prints Form 2441 Part I providers as columns", async () => {
  const printed = await text(
    await render(fixture("single-form2441-child-care-credit")),
  );
  assertMatch(printed, /Child and Dependent Care Expenses[\s\S]*2026/);
  assertMatch(printed, /1a Care provider’s name Care Center/);
  assertMatch(printed, /1b Address \(number and street\) 100 Main St/);
  assertMatch(printed, /1c Identifying number \(SSN or EIN\) 123456789/);
  assertMatch(printed, /1e Amount paid\. See instructions\. 3000/);
  assertMatch(printed, /Ada Example 111223334 3000/);
  assertMatch(printed, /line 11a 7 50000/);
  assertMatch(printed, /9a Multiply line 6[^\n]* 9a 1050/);
  assertMatch(printed, /on Schedule 3 \(Form 1040\), line 2[^\n]* 11 500/);
});

test("TY2026 PDF prints Schedule E on the 2026 draft pages", async () => {
  const rental = fixture("single-nonparticipating-rental-loss");
  const [property] = rental.schedule_e as Array<Record<string, unknown>>;
  const trust = fixture("single-trust-k1-box5-schedule-e");
  const doc = await render({
    ...rental,
    k1_trust: trust.k1_trust,
    schedule_e: [{
      ...property,
      activity_type: "A",
      rent_income: 12000,
      expense_repairs: 1000,
      expense_mortgage_interest: 2000,
      expense_other_interest: 300,
    }],
  });
  const printed = await text(doc);
  assertMatch(printed, /SCHEDULE E[\s\S]*2026/);
  assertMatch(printed, /A 12 Example Street Austin TX 78701/);
  assertMatch(printed, /3 Rents received[^\n]* 3 12000/);
  assertMatch(printed, /12 Mortgage interest[^\n]* 12 2000/);
  assertMatch(printed, /13 Interest \(see instructions\)[^\n]* 13\n/);
  assertMatch(printed, /13b Other[^\n]* 13b 300/);
  assertMatch(printed, /14 Repairs[^\n]* 14 1000/);
  assertMatch(printed, /20 Total expenses[^\n]* 20 3300/);
  assertMatch(printed, /23a Total of all amounts reported on line 3[^\n]* 23a 12000/);
  assertMatch(printed, /23e Total of all amounts reported on line 20[^\n]* 23e 3300/);
  assertMatch(printed, /24 Income\. Add positive amounts[^\n]* 24 8700/);
  assertMatch(printed, /26 Total rental real estate[\s\S]*? 26 8700/);
  assertMatch(printed, /A Family Trust[^\n]* 123456789/);
  assertMatch(printed, /37 Total estate and trust income[^\n]* 37 750/);
  assertMatch(printed, /41 Total income or \(loss\)\. Combine[\s\S]*? 41 9450/);
  const k1Columns = scheduleEPdf2026.fields
    .filter((entry) => entry.domainKey.startsWith("k1_0_"))
    .map((entry) => [entry.domainKey, entry.pdfField.split(".").pop()]);
  assertEquals(Object.fromEntries(k1Columns), {
    k1_0_name: "f2_6[0]",
    k1_0_code: "f2_7[0]",
    k1_0_ein: "f2_8[0]",
    k1_0_passive_loss: "f2_18[0]",
    k1_0_passive_income: "f2_19[0]",
    k1_0_basis_required: "c2_3[0]",
    k1_0_nonpassive_income: "f2_22[0]",
  });
});

test("TY2026 PDF prints Schedule A with the 0.5% gift floor and line 18", async () => {
  const itemizer = fixture("single-1098-purchase-points");
  const schedule_a = {
    line_5b_real_estate_tax: 4000,
    cash_contributions_to_50_percent_organizations: 10000,
  };
  const printed = await text(await render({ ...itemizer, schedule_a }));
  assertMatch(printed, /SCHEDULE A[\s\S]*2026/);
  assertMatch(printed, /line 11b[^\n]* 2 80000/);
  assertMatch(printed, /7 Add lines 5e and 6[^\n]* 7 4000/);
  assertMatch(printed, /8e Add lines 8a through 8d[^\n]* 8e 20400/);
  assertMatch(printed, /10 Add lines 8e and 9[^\n]* 10 20400/);
  assertMatch(printed, /see instructions[^\n]* 11 10000/);
  assertMatch(printed, /Limitation Worksheet[^\n]* 13 9600/);
  assertMatch(printed, /15 Add lines 13 and 14[^\n]* 15 9600/);
  assertMatch(printed, /✔ No\. Your deductions are not limited/);
  assertMatch(printed, /the amount to enter[^\n]* 18 34000/);
  assertMatch(printed, /12e Standard deduction or itemized[^\n]* 12e 34000/);
});

test("TY2026 PDF prints Schedule A line 18 Yes with Forms 8959 and 8960", async () => {
  const itemizer = fixture("single-1098-purchase-points");
  const [w2] = itemizer.w2 as Array<Record<string, unknown>>;
  const printed = await text(
    await render({
      ...itemizer,
      w2: [{
        ...w2,
        box1_wages: 900000,
        box2_fed_withheld: 250000,
        box5_medicare_wages: 900000,
        box6_medicare_withheld: 19350,
      }],
      f1099int: [
        { payer_name: "Example Bank", recipient_tin: "111223333", box1: 40000 },
      ],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
      schedule_a: {
        line_5b_real_estate_tax: 4000,
        cash_contributions_to_50_percent_organizations: 10000,
      },
    }),
  );
  // 2/37 of the 29,700 itemized total: line 18 prints the reduced 28,095.
  assertMatch(printed, /15 Add lines 13 and 14[^\n]* 15 5300/);
  assertMatch(printed, /✔ Yes\. Your deductions may be limited/);
  assertMatch(printed, /the amount to enter[^\n]* 18 28095/);
  assertMatch(printed, /12e Standard deduction or itemized[^\n]* 12e 28095/);
  assertMatch(printed, /Form 8959[\s\S]*2026/);
  assertMatch(printed, /4 Add lines 1 through 3[^\n]* 4 900000/);
  assertMatch(printed, /\n Part II[^\n]* 7 6300\n/);
  assertMatch(printed, /Part I, line 5b\. Go to Part IV[^\n]* 12 6300/);
  assertMatch(printed, /Form 1040-SS, Part I, line 5a\. Go to Part V[^\n]* 18\n/);
  assertMatch(printed, /withholding on Medicare wages[^\n]* 21 13050/);
  assertMatch(printed, /\n line 11a[^\n]* 24 6300/);
  assertMatch(printed, /Form 8959[^\n]* 17b 6300/);
  assertMatch(printed, /8960 Net Investment Income Tax[\s\S]*2026/);
  assertMatch(printed, /8 Total investment income[^\n]* 8 40000/);
  assertMatch(printed, /13 Modified adjusted gross income[^\n]* 13 940000/);
  assertMatch(printed, /16 Enter the smaller of line 12 or line 15[^\n]* 16 40000/);
  assertMatch(printed, /on your tax return \(see instructions\)[^\n]* 17 1520/);
});

test("TY2026 PDF prints Schedule 1-A car loan and senior parts", async () => {
  const car = await text(
    await render(fixture("single-reviewed-car-loan-schedule1a")),
  );
  assertMatch(car, /SCHEDULE 1-A[\s\S]*2026/);
  assertMatch(car, /line 11b[^\n]* 1 80000/);
  assertMatch(car, /28a 1 H G C M 8 2 6 3 3 A 0 0 4 3 5 2 0 4000/);
  assertMatch(car, /does not qualify\)\?[^\n]* ✔ Yes No/);
  assertMatch(car, /final assembly\)\?[^\n]* ✔ Yes No/);
  assertMatch(car, /29 Add lines 28a and 28b[^\n]* 29 4000/);
  assertMatch(car, /32 Enter \$100,000[^\n]* 32 100000/);
  assertMatch(car, /enter -0- [. ]* 36 4000/);
  assertMatch(car, /44 Add lines 15, 27, 36, and 43[^\n]* 44 4000/);
  const senior = await text(await render(fixture("joint-senior-schedule1a")));
  assertMatch(senior, /37 Enter the amount from line 3[^\n]* 37 160000/);
  assertMatch(senior, /40 Multiply line 39 by 6%[^\n]* 40 600/);
  assertMatch(senior, /41 Subtract line 40 from \$6,000[^\n]* 41 5400/);
  assertMatch(senior, /43 Enhanced deduction for seniors[^\n]* 43 10800/);
  assertMatch(senior, /44 Add lines 15, 27, 36, and 43[^\n]* 44 10800/);
  await assertRejects(
    () => render(fixture("single-w2-qualified-tips-schedule1a")),
    Error,
    "Schedule 1-A tips, overtime",
  );
});

test("TY2026 PDF prints Form 8863 on the 2026 draft", async () => {
  // The fixture's worksheet holds 2025 tax; the 2026 return supplies its own.
  const { f8863_credit_limit_worksheet: _, ...inputs } = fixture(
    "single-form8863-lifetime-learning-scholarship",
  );
  const printed = await text(await render(inputs));
  assertMatch(printed, /Education Credits[\s\S]*2026/);
  assertMatch(printed, /11 Enter the smaller of line 10 or \$10,000[^\n]* 11 7500/);
  assertMatch(printed, /12 Multiply line 11 by 20%[^\n]* 12 1500/);
  assertMatch(printed, /Schedule 3 \(Form 1040\), line 3[^\n]* 19 1500/);
  assertMatch(printed, /\n Test University\n/);
  assertMatch(printed, /Part II, line 10[^\n]* 31 7500/);
});

test("TY2026 PDF refuses, by name, a form with no TY2026 mapping", async () => {
  await assertRejects(
    () => render(fixture("single-form4835-farm-rental-profit")),
    Error,
    "TY2026 PDF export needs f4835",
  );
});

test("TY2026 PDF prints Form 5329 Part I on the 2026 draft", async () => {
  const printed = await text(
    await render(fixture("single-form5329-two-early-ira-distributions")),
  );
  assertMatch(printed, /Form 5329 \(2026\)/);
  assertMatch(printed, /For Roth IRA distributions, see instructions \. 1 10000/);
  assertMatch(printed, /Subtract line 2 from line 1 [. ]* 3 10000/);
  assertMatch(printed, /Schedule 2 \(Form 1040\), line 5 \. \. 4 1000/);
  assertMatch(printed, /If not required,\n check here [. ]* 5 1000/);
});

test("every TY2026 mapped field exists on its pinned 2026 template", async () => {
  const forms = await ty2026PdfForms();
  for (const key of TY2026_PDF_MAPPED_FORMS) {
    const descriptor = forms.find((row) => row.pendingKey === key)!;
    const doc = await PDFDocument.load(
      await loadPdfTemplate(
        descriptor.pdfUrl,
        ".pdf-cache",
        descriptor.pdfSha256,
      ),
      { ignoreEncryption: true, updateMetadata: false },
    );
    const names = new Set(doc.getForm().getFields().map((f) => f.getName()));
    const missing = [...descriptor.fields, ...(descriptor.filerFields ?? [])]
      .flatMap((entry) => [
        entry.pdfField,
        ...("extraPdfFields" in entry ? entry.extraPdfFields ?? [] : []),
      ])
      .filter((name) => !names.has(name));
    assertEquals(missing, [], key);
  }
});

test("TY2026 PDF prints Form 8962 on the 2026 draft with line 27 uncapped", async () => {
  const printed = await text(
    await render(fixture("single-marketplace-aptc-repayment")),
  );
  assertMatch(printed, /Form 8962 \(2026\)/);
  assertMatch(printed, /Other 48 states and DC 4 15650/);
  assertMatch(printed, /federal poverty line \(see instructions\)[^\n]* 5 288 %/);
  assertMatch(printed, /Did you enter 401% on line 5\?[^\n]*\n ✔ No\./);
  assertMatch(printed, /11 Annual totals 9600 7200 4337 2863 2863 8400/);
  assertMatch(printed, /enter the total here 24 2863/);
  assertMatch(printed, /Schedule 2 \(Form 1040\), line 1a [. ]* 27 5537/);
  assertMatch(printed, /28 Reserved for future use [. ]* 28\n/);
});

test("TY2026 PDF prints Form 8582 on the 2026 draft", async () => {
  const printed = await text(
    await render(fixture("single-nonparticipating-rental-loss")),
  );
  assertMatch(printed, /Part I 2026 Passive Activity Loss/);
  assertMatch(printed, /Part V, column \(b\)\) [. ]* 2b \( 5000 \)/);
  assertMatch(printed, /Combine lines 2a, 2b, and 2c [. ]* 2d -5000/);
  assertMatch(printed, /normally used [. ]* 3 -5000/);
  assertMatch(printed, /Total\. Enter on Part I, lines 2a, 2b, and 2c 5000 5000/);
  assertMatch(printed, /Example rental Sch E, line 22 5000 5000 0/);
});

test("TY2026 PDF prints Form 4562 Part I on the 2026 draft", async () => {
  const inputs = JSON.parse(
    JSON.stringify(fixture("single-form4562-section179-w2-income-limit"))
      .replace(/202[4-6]/g, (year) => String(Number(year) + 1)),
  );
  const printed = await text(await render(inputs));
  assertMatch(printed, /Form 4562 \(2026\)/);
  assertMatch(printed, /1 Maximum amount \(see instructions\)[^\n]* 1 30000/);
  assertMatch(printed, /before reduction in limitation \(see instructions\)[^\n]* 3 4090000/);
  assertMatch(printed, /Computer server 30000 30000/);
  assertMatch(printed, /from line 13 of your 2025 Form 4562 [. ]* 10 0/);
  assertMatch(printed, /don’t enter more than line 11 [. ]* 12 30000/);
  assertMatch(printed, /Carryover of disallowed deduction to 2027[^\n]* 13 0/);
  assertMatch(printed, /corporations—see instructions [. ]* 22 30000/);
});

test("TY2026 PDF prints Form 1116 Parts I-IV on the 2026 draft", async () => {
  const inputs = fixture("single-foreign-interest-current-excess");
  const [interest] = inputs.f1099int as Array<Record<string, unknown>>;
  const printed = await text(
    await render({ ...inputs, f1099int: [{ ...interest, box6: 1_000 }] }),
  );
  assertMatch(printed, /Form 1116 \(2026\)/);
  assertMatch(printed, /c ✔ Passive category income/);
  assertMatch(printed, /Enter the name of the foreign country Canada/);
  assertMatch(printed, /\n 50000 1a 50000\n/);
  assertMatch(printed, /Add lines 2, 3g, 4a, 4b, and 5 [. ]* 16100 6 16100/);
  assertMatch(printed, /on page 2, line 15 [. ]* 7 33900/);
  assertMatch(printed, /\(j\) ✔ Paid/);
  assertMatch(printed, /\n A 1000 1000\n/);
  assertMatch(printed, /column \(w\)\. Enter the total here and on Part III, line 9 [. ]* 8 1000/);
  assertMatch(printed, /Schedule 1-A \(Form 1040\), line 43[\s\S]*? 18 33900/);
  assertMatch(printed, /line 16, and Schedule 2[\s\S]*? 20 3823/);
  assertMatch(printed, /smaller of line 14 or line 23[^\n]* 24 1000/);
  assertMatch(printed, /passive category income [. ]* 27 1000/);
  assertMatch(printed, /Part III, line 1a [. ]* 35 1000/);
});
