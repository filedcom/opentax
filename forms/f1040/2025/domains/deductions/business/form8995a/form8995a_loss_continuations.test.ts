import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import { form8995aScheduleCPdf } from "../../../../pdf/forms/deductions/business/f8995a_schedule_c.ts";
import { inputSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const sources = base.inputs.schedule_c as Record<string, unknown>[];
const cases = [
  {
    id: "four-businesses",
    profits: [1000, 2000],
    wages: [30, 100],
    ubia: [0, 0],
    losses: [900, 1800],
    adjusted: [100, 200],
    components: [15, 40],
    deduction: 55,
    pages: 21,
  },
  {
    id: "seven-businesses",
    profits: [1000, 2000, 3000, 4000],
    wages: [100, 20, 0, 40],
    ubia: [0, 0, 800, 0],
    losses: [1900, 2800, 5000],
    adjusted: [30, 60, 90, 120],
    components: [6, 10, 18, 20],
    deduction: 54,
    pages: 29,
  },
];
for (const c of cases) {
  Deno.test(`Form8995A ${c.id} retain all native and continued PDF business rows`, async () => {
    const amounts = [...c.profits, ...c.losses.map((x) => -x)];
    const rows = amounts.map((amount, i) => ({
      ...sources[amount > 0 ? 0 : 1],
      business_reference: `trade-${String(i + 1).padStart(2, "0")}`,
      line_c_business_name: `Trade ${i + 1} ${amount > 0 ? "Profit" : "Loss"}`,
      line_d_ein: String(123000001 + i),
      ...(amount > 0
        ? {
          line_1_gross_receipts: amount + c.wages[i],
          line_26_wages: c.wages[i],
          qbi_w2_wages: c.wages[i],
          qbi_unadjusted_basis: c.ubia[i],
        }
        : {
          part_v_other_expenses: [{
            description: `Trade ${i + 1} operating costs`,
            amount: -amount,
          }],
        }),
    }));
    const inputs = {
      ...base.inputs,
      schedule_c: rows,
      w2: (base.inputs.w2 as Record<string, unknown>[]).map((w) => ({
        ...w,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: 300000,
        box6_medicare_withheld: 4350,
      })),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals([
      pending.schedule1.line3_schedule_c,
      pending.f1040.line11_agi,
      pending.f1040.line13_qbi_deduction,
      pending.f1040.line24_total_tax,
      pending.f1040.line37_amount_owed,
    ], [300, 300300, c.deduction, 70021, 10021]);
    const parentFields = form8995aPdf.projectFields!(
      pending.form8995a,
      pending,
    );
    const lossFields = form8995aScheduleCPdf.projectFields!(
      pending.form8995a_schedule_c,
      pending,
    );
    const parents = form8995aPdf.instances!(parentFields, base.filer, pending);
    const schedules = form8995aScheduleCPdf.instances!(
      lossFields,
      base.filer,
      pending,
    );
    const count = Math.ceil(rows.length / 3);
    assertEquals([parents.length, schedules.length], [count, count]);
    const parentRows = parents.flatMap((page) =>
      ["", "_b", "_c"].filter((s) => page[`business_name${s}`] !== undefined)
        .map(
          (s) => [
            page[`business_name${s}`],
            page[`business_ein${s}`],
            page[`line2${s}`],
            page[`line15${s}`],
          ],
        )
    );
    assertEquals(
      parentRows,
      rows.map((
        r,
        i,
      ) => [
        r.line_c_business_name,
        r.line_d_ein,
        c.adjusted[i] ?? 0,
        c.components[i] ?? 0,
      ]),
    );
    const scheduleRows = schedules.flatMap((page) =>
      [1, 2, 3].filter((i) => page[`row${i}_name`] !== undefined).map(
        (i) => [
          page[`row${i}_name`],
          page[`row${i}_a`],
          page[`row${i}_b`],
          page[`row${i}_c`],
        ],
      )
    );
    assertEquals(
      scheduleRows,
      rows.map((
        r,
        i,
      ) => [
        r.line_c_business_name,
        amounts[i],
        i < c.profits.length ? c.profits[i] - c.adjusted[i] : 0,
        c.adjusted[i] ?? 0,
      ]),
    );
    assertEquals(parents[0].line16, c.deduction);
    assertEquals(schedules[0].line5, c.losses.reduce((a, b) => a + b, 0));
    for (const p of parents.slice(1)) {
      assertEquals([p.line16, p.line27, p.line39], [
        undefined,
        undefined,
        undefined,
      ]);
      assertEquals(form8995aPdf.pageIndices!(p), [0]);
    }
    for (const p of schedules.slice(1)) {
      assertEquals([p.line2, p.line3, p.line4, p.line5, p.line6], [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ]);
    }
    // Reverse the entire source inventory so both profitable and loss businesses
    // cross continuation boundaries; identify projected values by business.
    const reversed = f1040_2025.executeReturn({
      ...inputs,
      schedule_c: [...rows].reverse(),
    });
    assertEquals(reversed.diagnostics, []);
    const reversedPending = normalizeAllPending(reversed.pending);
    const reversedFields = form8995aPdf.projectFields!(
      reversedPending.form8995a,
      reversedPending,
    );
    const reversedCopies = form8995aPdf.instances!(
      reversedFields,
      base.filer,
      reversedPending,
    );
    const byName = (copies: readonly Record<string, unknown>[]) =>
      Object.fromEntries(
        copies.flatMap((page) =>
          ["", "_b", "_c"].filter((s) =>
            page[`business_name${s}`] !== undefined
          ).map(
            (s) => [String(page[`business_name${s}`]), [
              page[`business_ein${s}`],
              page[`line2${s}`],
              page[`line15${s}`],
            ]],
          )
        ),
      );
    assertEquals(byName(reversedCopies), byName(parents));
    assertEquals(reversedPending.f1040.line13_qbi_deduction, c.deduction);
    assertEquals(
      form8995aPdf.instances!(
        { ...parentFields, business_name: "Detached projection" },
        base.filer,
        pending,
      ),
      parents,
    );
    assertEquals(
      form8995aScheduleCPdf.instances!(
        { ...lossFields, row1_name: "Detached projection" },
        base.filer,
        pending,
      ),
      schedules,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    const parentGroups = [
      ...prepared.bundle.xml.matchAll(
        /<QBIDeductionInformationGrp>(.*?)<\/QBIDeductionInformationGrp>/gs,
      ),
    ].map((m) => m[1]);
    const lossGroups = [
      ...prepared.bundle.xml.matchAll(
        /<LossNettingCarryforwardGrp>(.*?)<\/LossNettingCarryforwardGrp>/gs,
      ),
    ].map((m) => m[1]);
    assertEquals([parentGroups.length, lossGroups.length], [
      rows.length,
      rows.length,
    ]);
    rows.forEach((row, i) => {
      assertStringIncludes(
        parentGroups[i],
        `<BusinessNameLine1Txt>${row.line_c_business_name}</BusinessNameLine1Txt>`,
      );
      assertStringIncludes(
        parentGroups[i],
        `<QBIComponentAmt>${c.components[i] ?? 0}</QBIComponentAmt>`,
      );
      assertStringIncludes(
        lossGroups[i],
        `<QlfyBusinessIncomeOrLossAmt>${
          amounts[i]
        }</QlfyBusinessIncomeOrLossAmt>`,
      );
      assertStringIncludes(
        lossGroups[i],
        `<AdjQualifiedBusinessIncomeAmt>${
          c.adjusted[i] ?? 0
        }</AdjQualifiedBusinessIncomeAmt>`,
      );
    });
    const permission = await Deno.permissions.query({
      name: "env",
      variable: "FORM8995A_CONTINUATIONS_DIR",
    });
    const retained = permission.state === "granted"
      ? Deno.env.get("FORM8995A_CONTINUATIONS_DIR")
      : undefined;
    const dir = retained ? `${retained}/${c.id}` : await Deno.makeTempDir();
    await Deno.mkdir(dir, { recursive: true });
    try {
      for (
        const [name, value] of Object.entries({
          input: inputs,
          pending: prepared.bundle.pending,
          projection: { parents, schedules },
        })
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
      const xsd = await new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await Deno.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await Deno.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          prepared.bundle.pending,
          base.filer,
          ".pdf-cache",
          prepared.bundle,
          origins,
        ),
      );
      await Deno.writeTextFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      assertEquals(origins.length, c.pages);
      assertEquals(
        origins.filter((x) => x.formKey === "form8995a").length,
        count + 1,
      );
      assertEquals(
        origins.filter((x) => x.formKey === "form8995a_schedule_c").length,
        count,
      );
      for (
        const change of [
          "deduction",
          "last-source",
          "missing-overflow-source",
          "companion",
        ]
      ) {
        const altered = structuredClone(prepared.bundle.pending);
        if (change === "deduction") {
          Object.assign(altered.f1040!, {
            line13_qbi_deduction: c.deduction + 1,
          });
        }
        if (change === "companion") {
          Object.assign(altered.form8995a_schedule_c!, { qbi: 301 });
        }
        if (change === "last-source") {
          const qbi = inputSchema.parse(altered.form8995a);
          const last = qbi.schedule_c_qbi_businesses!.at(-1)!;
          last.ein = "999999999";
          last.source_schedule_c.line_d_ein = "999999999";
          altered.form8995a = qbi;
          altered.form8995a_schedule_c = structuredClone(qbi);
        }
        if (change === "missing-overflow-source") {
          const retainedRows =
            (altered.schedule_c as { schedule_cs: unknown[] }).schedule_cs;
          retainedRows.pop();
        }
        await assertRejects(() =>
          f1040_2025.prepareReturn(altered, base.filer)
        );
        await assertRejects(() =>
          buildPdfBytes(altered, base.filer, ".pdf-cache")
        );
      }
    } finally {
      if (!retained) await Deno.remove(dir, { recursive: true });
    }
  });
}
