import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
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
    income: 300000,
    tax: 70021,
    phase: undefined,
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
    income: 300000,
    tax: 70021,
    phase: undefined,
  },
  {
    id: "seven-businesses-half-phase",
    profits: [1000, 2000, 3000, 4000],
    wages: [100, 20, 0, 40],
    ubia: [0, 0, 800, 0],
    losses: [1900, 2800, 5000],
    adjusted: [30, 60, 90, 120],
    components: [6, 11, 18, 22],
    deduction: 57,
    pages: 30,
    income: 237750,
    tax: 48521,
    phase: 0.5,
  },
  {
    id: "four-businesses-fractional-phase",
    profits: [1000, 2000],
    wages: [30, 100],
    ubia: [0, 0],
    losses: [900, 1800],
    adjusted: [100, 200],
    components: [18, 40],
    deduction: 58,
    pages: 21,
    income: 237701,
    tax: 48504,
    phase: 0.49902,
  },
  {
    id: "seven-businesses-phase-ceiling",
    profits: [1000, 2000, 3000, 4000],
    wages: [100, 20, 0, 40],
    ubia: [0, 0, 800, 0],
    losses: [1900, 2800, 5000],
    adjusted: [30, 60, 90, 120],
    components: [6, 10, 18, 20],
    deduction: 54,
    pages: 30,
    income: 262750,
    tax: 56747,
    phase: 1,
  },
];
for (const c of cases) {
  test(`Form8995A ${c.id} retain all native and continued PDF business rows`, async () => {
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
        box1_wages: c.income,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: c.income,
        box6_medicare_withheld: Math.round(c.income * 1.45) / 100,
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
      pending.f1040.line37_amount_owed ?? 0,
    ], [300, c.income + 300, c.deduction, c.tax, Math.max(0, c.tax - 60000)]);
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
    parents.forEach((copy) => {
      const phaseColumns = ["", "_b", "_c"].filter((suffix) => {
        const name = copy[`business_name${suffix}`];
        const i = rows.findIndex((r) => r.line_c_business_name === name);
        if (i < 0 || i >= c.profits.length) return false;
        const potential = Math.round(c.adjusted[i] * 0.2);
        const limit = Math.max(
          Math.round(c.wages[i] * 0.5),
          Math.round(c.wages[i] * 0.25) + Math.round(c.ubia[i] * 0.025),
        );
        const applies = c.phase !== undefined && limit < potential;
        assertEquals(
          copy[`line12${suffix}`],
          applies ? c.components[i] : undefined,
        );
        assertEquals(
          copy[`line19${suffix}`],
          applies ? potential - limit : undefined,
        );
        assertEquals(
          copy[`line25${suffix}`],
          applies ? Math.round((potential - limit) * c.phase!) : undefined,
        );
        return applies;
      });
      assertEquals(
        copy.line24 === undefined ? undefined : String(copy.line24),
        phaseColumns.length
          ? String(Number((c.phase! * 100).toFixed(3)))
          : undefined,
      );
    });
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
      assertEquals(
        form8995aPdf.pageIndices!(p),
        p.qbi_loss_phase_in === true ? [0, 1] : [0],
      );
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
    if (c.phase !== undefined) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<PhaseInPct>${c.phase.toFixed(5)}</PhaseInPct>`,
      );
      assertStringIncludes(
        prepared.bundle.xml,
        "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>",
      );
    }
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
    const retained = process.env.FORM8995A_CONTINUATIONS_DIR;
    const dir = retained ? `${retained}/${c.id}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [name, value] of Object.entries({
          input: inputs,
          pending: prepared.bundle.pending,
          projection: { parents, schedules },
        })
      ) {
        await fs.writeFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          prepared.bundle.pending,
          base.filer,
          ".pdf-cache",
          prepared.bundle,
          origins,
        ),
      );
      await fs.writeFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      assertEquals(origins.length, c.pages);
      assertEquals(
        origins.filter((x) => x.formKey === "form8995a").length,
        count + 1 + (c.phase !== undefined && count === 3 ? 1 : 0),
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
      if (!retained) await sys.remove(dir, { recursive: true });
    }
  });
}
