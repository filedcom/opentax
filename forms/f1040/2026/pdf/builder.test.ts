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

test("TY2026 PDF refuses, by name, a form with no TY2026 mapping", async () => {
  await assertRejects(
    () => render(fixture("single-child-unearned-income")),
    Error,
    "TY2026 PDF export needs form8615",
  );
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
