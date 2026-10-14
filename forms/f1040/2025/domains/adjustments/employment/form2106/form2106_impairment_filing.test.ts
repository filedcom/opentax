import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  EmployeeType,
  inputSchema,
  itemSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { cases, fixture } from "./form2106_fee_basis.fixture.ts";

const impairmentCases = [
  {
    name: "single-impairment",
    base: 0,
    expenses: [20000],
    reimbursement: 0,
    fee: false,
    force: false,
    itemized: 20000,
    adjustment: 0,
    taxable: 130000,
    tax: 24047,
  },
  {
    name: "single-reimbursed",
    base: 0,
    expenses: [22000],
    reimbursement: 2000,
    fee: false,
    force: false,
    itemized: 20000,
    adjustment: 0,
    taxable: 130000,
    tax: 24047,
  },
  {
    name: "joint-spouse-impairment",
    base: 1,
    expenses: [36000],
    reimbursement: 0,
    fee: false,
    force: false,
    itemized: 36000,
    adjustment: 0,
    taxable: 114000,
    tax: 14908,
  },
  {
    name: "joint-both-impairment",
    base: 2,
    expenses: [18000, 18000],
    reimbursement: 0,
    fee: false,
    force: false,
    itemized: 36000,
    adjustment: 0,
    taxable: 114000,
    tax: 14908,
  },
  {
    name: "joint-fee-and-impairment",
    base: 2,
    expenses: [1200, 36000],
    reimbursement: 0,
    fee: true,
    force: false,
    itemized: 36000,
    adjustment: 1200,
    taxable: 112800,
    tax: 14644,
  },
  {
    name: "single-elect-below-standard",
    base: 0,
    expenses: [1200],
    reimbursement: 0,
    fee: false,
    force: true,
    itemized: 1200,
    adjustment: 0,
    taxable: 148800,
    tax: 28559,
  },
] as const;

for (const c of impairmentCases) {
  Deno.test(`Form 2106 ${c.name} reconciles Schedule A and separate adjustment destinations`, async () => {
    const original = fixture(cases[c.base]);
    const jobs = c.expenses.map((amount, i) => {
      const j = original.f2106[i];
      return itemSchema.parse({
        ...j,
        qualification: c.fee && i === 0 ? j.qualification : {
          kind: EmployeeType.DISABLED_IMPAIRMENT,
          physical_or_mental_disability: true,
          costs_enable_work_at_place_of_employment: true,
          impairment_work_expense_reference:
            `${c.name} owner ${i} workplace attendant care records`,
        },
        expenses: {
          ...j.expenses,
          line4_other_business_expenses: amount,
          expense_records_reference:
            `${c.name} owner ${i} paid attendant invoices`,
          job_business_purpose: c.fee && i === 0
            ? "Hearing preparation"
            : "Attendant care enabling work at county offices",
        },
        reimbursements: {
          ...j.reimbursements,
          line7_column_a_nonmeals: c.reimbursement,
        },
      });
    });
    const source = {
      ...original,
      f2106: jobs,
      ...(c.force ? { schedule_a: { force_itemized: true } } : {}),
    };
    const result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, []);
    const prepared = buildPending(result.pending);
    const pending = { ...prepared, f2106: inputSchema.parse(prepared.f2106) };
    const f = pending.f1040!;
    assertEquals([
      pending.schedule_a?.line_16_other_deductions,
      pending.schedule1?.line12_business_expenses ?? 0,
      f.line10_adjustments ?? 0,
      f.line11_agi,
      f.line12e_itemized_deductions,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      c.itemized,
      c.adjustment,
      c.adjustment,
      150000 - c.adjustment,
      c.itemized,
      c.taxable,
      c.tax,
      c.tax,
      30000 - c.tax,
    ]);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertStringIncludes(bundle.xml, "IMPAIRMENT-RELATED WORK EXPENSES");
    assertStringIncludes(
      bundle.xml,
      `<MiscellaneousDeductionAmt>${c.itemized}</MiscellaneousDeductionAmt>`,
    );
    const ids = [...bundle.xml.matchAll(/<IRS2106 documentId="([^"]+)"/g)].map(
      (m) => m[1],
    );
    assertEquals(ids.length, jobs.length);
    if (c.fee) {
      assertStringIncludes(
        bundle.xml,
        `<BusExpnsReservistsAndOthersAmt referenceDocumentId="${
          ids[0]
        }" referenceDocumentName="IRS2106">1200</BusExpnsReservistsAndOthersAmt>`,
      );
    } else {assertEquals(
        bundle.xml.includes("<BusExpnsReservistsAndOthersAmt"),
        false,
      );}
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const first = jobs[0];
    const variants: typeof pending[] = [
      {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_16_other_deductions: c.itemized + 1,
        },
      },
      {
        ...pending,
        f1040: { ...f, line12e_itemized_deductions: c.itemized + 1 },
      },
      {
        ...pending,
        f1040: {
          ...f,
          line12a_standard_deduction: 31500,
          line12e_itemized_deductions: undefined,
        },
      },
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line12_business_expenses: c.adjustment + 1,
        },
      },
      { ...pending, f1040: { ...f, line11_agi: 150001 - c.adjustment } },
      {
        ...pending,
        f2106: {
          f2106s: jobs.map((j, i) =>
            i ? j : { ...j, job: { ...j.job, employee_ssn: "999-88-7777" } }
          ),
        },
      },
      {
        ...pending,
        f2106: {
          f2106s: jobs.map((j, i) =>
            i ? j : {
              ...j,
              expenses: {
                ...j.expenses,
                line4_other_business_expenses:
                  j.expenses.line4_other_business_expenses + 1,
              },
            }
          ),
        },
      },
      { ...pending, w2: { w2s: [...original.w2, original.w2[0]] } },
      {
        ...pending,
        f2106: {
          f2106s: [...jobs, {
            ...first,
            job: {
              ...first.job,
              employment_record_reference: "duplicate employment",
            },
          }],
        },
      },
    ];
    for (const altered of variants) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `.state/research/form2106-impairment-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", source],
          ["pending", result.pending],
          ["expected", { ...c, rejections: variants.length }],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
