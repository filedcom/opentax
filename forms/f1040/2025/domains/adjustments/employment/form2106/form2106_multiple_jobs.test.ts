import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  inputSchema as jobInputSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";

import { isSupportedForm2106Route } from "./form2106_staged.ts";

import { cases, fixture } from "./form2106_fee_basis.fixture.ts";

for (const c of cases) {
  Deno.test(`Form 2106 ${c.name} keeps every owned job through native and PDF export`, async () => {
    const inputs = fixture(c);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const prepared = buildPending(result.pending);
    const pending = {
      ...prepared,
      f2106: jobInputSchema.parse(prepared.f2106),
    };
    const f = pending.f1040!;
    assertEquals([
      pending.schedule1?.line12_business_expenses,
      f.line10_adjustments,
      f.line11_agi,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      c.deduction,
      c.deduction,
      150000 - c.deduction,
      c.taxable,
      c.tax,
      c.tax,
      30000 - c.tax,
    ]);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      (bundle.xml.match(/<IRS2106 /g) ?? []).length,
      inputs.f2106.length,
    );
    for (const job of inputs.f2106) {
      assertStringIncludes(
        bundle.xml,
        `<UnreimEmployeeBusExpnsAmt>${job.expenses.line4_other_business_expenses}</UnreimEmployeeBusExpnsAmt>`,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const first = inputs.f2106[0];
    const variants: typeof pending[] = [
      {
        ...pending,
        f2106: {
          f2106s: inputs.f2106.map((j, i) =>
            i ? j : { ...j, job: { ...j.job, employee_ssn: "999-88-7777" } }
          ),
        },
      },
      {
        ...pending,
        f2106: {
          f2106s: inputs.f2106.map((j, i) =>
            i ? j : { ...j, job: { ...j.job, employer_ein: "99-9999999" } }
          ),
        },
      },
      {
        ...pending,
        f2106: {
          f2106s: inputs.f2106.map((j, i) =>
            i ? j : { ...j, job: { ...j.job, employee_name: "Wrong Person" } }
          ),
        },
      },
      {
        ...pending,
        f2106: {
          f2106s: [...inputs.f2106, {
            ...first,
            job: {
              ...first.job,
              employment_record_reference: "repeated employer job",
            },
          }],
        },
      },
      {
        ...pending,
        w2: {
          w2s: inputs.w2.map((w, i) =>
            i ? w : { ...w, employee_ssn: "999-88-7777" }
          ),
        },
      },
      { ...pending, w2: { w2s: [...inputs.w2, inputs.w2[0]] } },
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line12_business_expenses: c.deduction + 1,
        },
      },
      { ...pending, f1040: { ...f, line11_agi: 150001 - c.deduction } },
    ];
    if (inputs.f2106.length > 1) {
      variants.push({
        ...pending,
        f2106: {
          f2106s: inputs.f2106.map((j, i) =>
            i
              ? {
                ...j,
                expenses: {
                  ...j.expenses,
                  expense_records_reference:
                    first.expenses.expense_records_reference,
                },
              }
              : j
          ),
        },
      });
    }
    variants.push({
      ...pending,
      f2106: {
        f2106s: inputs.f2106.map((j, i) =>
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
    });
    if (c.joint) {
      variants.push({
        ...pending,
        f1040: { ...f, filing_status: FilingStatus.MFS },
      });
    }
    for (const altered of variants) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `.state/research/form2106-multiple-jobs-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", inputs],
          ["pending", result.pending],
          ["expected", {
            ...c,
            agi: 150000 - c.deduction,
            refund: 30000 - c.tax,
            rejections: variants.length,
          }],
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

Deno.test("fee-basis filing inventory respects four-document XSD capacity", () => {
  const source = fixture(cases[4]);
  assertEquals(isSupportedForm2106Route({ f2106s: source.f2106 }), true);
  const first = source.f2106[0];
  const fifth = {
    ...first,
    job: {
      ...first.job,
      employer_ein: "99-9999999",
      employment_record_reference: "fifth employment",
    },
    expenses: { ...first.expenses, expense_records_reference: "fifth expense" },
  };
  assertEquals(
    isSupportedForm2106Route({ f2106s: [...source.f2106, fifth] }),
    false,
  );
});
