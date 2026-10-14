import { assertEquals, assertRejects } from "@std/assert";
import {
  EmployeeType,
  inputSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  reservistCases,
  reservistFixture,
} from "./form2106_reservist.fixture.ts";

for (const c of reservistCases) {
  Deno.test(`Form 2106 reservist ${c.name} reconciles travel caps through the complete return`, async () => {
    const source = reservistFixture(c);
    const result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, []);
    const prepared = buildPending(result.pending);
    const pending = { ...prepared, f2106: inputSchema.parse(prepared.f2106) };
    const f = pending.f1040!;
    assertEquals([
      pending.schedule1?.line12_business_expenses,
      f.line10_adjustments,
      f.line11_agi,
      f.line15_taxable_income,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      c.deduction,
      c.deduction,
      150000 - c.deduction,
      150000 - c.deduction - (c.base === 0 ? 15750 : 31500),
      c.tax,
      30000 - c.tax,
    ]);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const first = pending.f2106.f2106s[0];
    if (first.qualification.kind !== EmployeeType.RESERVIST) {
      throw new Error("Expected reservist");
    }
    const q = first.qualification;
    const variants: typeof pending[] = [{
      ...pending,
      f1040: { ...f, line11_agi: 150001 - c.deduction },
    }, {
      ...pending,
      schedule1: {
        ...pending.schedule1,
        line12_business_expenses: c.deduction + 1,
      },
    }, {
      ...pending,
      w2: {
        w2s: source.w2.map((w, i) =>
          i ? w : { ...w, box1_wages: w.box1_wages + 1 }
        ),
      },
    }];
    const qualifications = [
      { ...q, trips: [] },
      {
        ...q,
        trips: q.trips.map((t, i) =>
          i ? t : { ...t, distance_from_tax_home_miles: 100 }
        ),
      },
      {
        ...q,
        trips: q.trips.map((t, i) =>
          i ? t : { ...t, business_miles: t.business_miles + 1 }
        ),
      },
      {
        ...q,
        trips: q.trips.map((t, i) =>
          i ? t : {
            ...t,
            days: t.days.map((d, j) =>
              j ? d : { ...d, lodging_paid: d.lodging_paid + 1 }
            ),
          }
        ),
      },
      {
        ...q,
        trips: q.trips.map((t, i) =>
          i ? t : {
            ...t,
            days: t.days.map((d, j) =>
              j ? d : {
                ...d,
                federal_rate: { ...d.federal_rate, fiscal_year: 2024 },
              }
            ),
          }
        ),
      },
      {
        ...q,
        trips: q.trips.map((t, i) =>
          i ? t : { ...t, days: [t.days[0], t.days[0], ...t.days.slice(2)] }
        ),
      },
    ];
    for (const qualification of qualifications) {
      variants.push({
        ...pending,
        f2106: {
          f2106s: [
            { ...first, qualification },
            ...pending.f2106.f2106s.slice(1),
          ],
        },
      });
    }
    variants.push({
      ...pending,
      f2106: {
        f2106s: [{
          ...first,
          reimbursements: {
            ...first.reimbursements,
            line7_column_a_nonmeals: 1,
          },
        }, ...pending.f2106.f2106s.slice(1)],
      },
    });
    for (const altered of variants) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `.state/research/form2106-reservist-2026-10-09/${c.name}`;
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
