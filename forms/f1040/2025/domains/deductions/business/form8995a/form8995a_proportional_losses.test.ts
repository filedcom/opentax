import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import {
  calculateScheduleCLossLines,
  inputSchema as qbiInputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import { form8995aScheduleCPdf } from "../../../../pdf/forms/deductions/business/f8995a_schedule_c.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const sourceRows = base.inputs.schedule_c as Record<string, unknown>[];
const cases = [
  {
    id: "unequal",
    profits: [2000, 1000],
    wages: [100, 20],
    ubia: [0, 0],
    loss: 2700,
    allocation: [1800, 900],
    adjusted: [200, 100],
    deductions: [40, 10],
    deduction: 50,
    tax: 70022,
  },
  {
    id: "remainder",
    profits: [1200, 1100],
    wages: [100, 40],
    ubia: [0, 0],
    loss: 2000,
    allocation: [1043, 957],
    adjusted: [157, 143],
    deductions: [31, 20],
    deduction: 51,
    tax: 70022,
  },
  {
    id: "property",
    profits: [2000, 1000],
    wages: [20, 0],
    ubia: [0, 800],
    loss: 2700,
    allocation: [1800, 900],
    adjusted: [200, 100],
    deductions: [10, 20],
    deduction: 30,
    tax: 70029,
  },
];
for (const c of cases) {
  test(`Form8995A proportional losses ${c.id} reconcile full XML and PDF`, async () => {
    const rows = [
      {
        ...sourceRows[0],
        line_1_gross_receipts: c.profits[0] + c.wages[0],
        line_26_wages: c.wages[0],
        qbi_w2_wages: c.wages[0],
        qbi_unadjusted_basis: c.ubia[0],
      },
      {
        ...sourceRows[0],
        line_c_business_name: "East Market",
        line_d_ein: "234567890",
        business_reference: "east-2025",
        line_1_gross_receipts: c.profits[1] + c.wages[1],
        line_26_wages: c.wages[1],
        qbi_w2_wages: c.wages[1],
        qbi_unadjusted_basis: c.ubia[1],
      },
      {
        ...sourceRows[1],
        part_v_other_expenses: [{
          description: "Shop operating costs",
          amount: c.loss,
        }],
      },
    ];
    const net = c.profits[0] + c.profits[1] - c.loss;
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
    assertEquals(result.diagnostics, [], c.id);
    assertEquals(
      result.pending.schedule1.line3_schedule_c,
      net,
    );
    assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, undefined);
    const pending = normalizeAllPending(result.pending);
    const f = pending.f1040;
    assertEquals([
      f.line8_additional_income,
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], [
      net,
      300000 + net,
      c.deduction,
      c.tax,
      c.tax - 60000,
    ]);
    const parent = form8995aPdf.projectFields!(pending.form8995a, pending);
    const companion = form8995aScheduleCPdf.projectFields!(
      pending.form8995a_schedule_c,
      pending,
    );
    assertEquals([
      parent.business_name,
      parent.business_name_b,
      parent.business_name_c,
    ], ["North Works", "East Market", "South Shop"]);
    assertEquals([parent.line2, parent.line2_b, parent.line2_c], [
      ...c.adjusted,
      0,
    ]);
    assertEquals([parent.line15, parent.line15_b, parent.line15_c], [
      ...c.deductions,
      0,
    ]);
    assertEquals([parent.line4, parent.line4_b], c.wages);
    assertEquals([parent.line7, parent.line7_b], c.ubia);
    assertEquals([companion.row1_b, companion.row2_b], c.allocation);
    assertEquals([
      companion.row1_c,
      companion.row2_c,
      companion.row3_c,
      companion.line6,
    ], [...c.adjusted, 0, 0]);
    assertEquals(companion.row3_a, -c.loss);
    // Reordering public sources cannot reassign rounded dollars or wage limits.
    const expectedByName = Object.fromEntries(
      calculateScheduleCLossLines(qbiInputSchema.parse(pending.form8995a))
        .businessLines.map(
          (r) => [r.business.business_name, [
            r.loss,
            r.parent.line2,
            r.parent.line15,
          ]],
        ),
    );
    for (
      const order of [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
    ) {
      const replay = f1040_2025.executeReturn({
        ...inputs,
        schedule_c: order.map((i) => rows[i]),
      });
      assertEquals(replay.diagnostics, []);
      const lines = calculateScheduleCLossLines(
        qbiInputSchema.parse(normalizeAllPending(replay.pending).form8995a),
      );
      assertEquals(
        Object.fromEntries(
          lines.businessLines.map(
            (r) => [r.business.business_name, [
              r.loss,
              r.parent.line2,
              r.parent.line15,
            ]],
          ),
        ),
        expectedByName,
      );
      assertEquals(lines.parent.line39, c.deduction);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995AScheduleC");
    assertStringIncludes(
      prepared.bundle.xml,
      `<AdjustedGrossIncomeAmt>${300000 + net}</AdjustedGrossIncomeAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<TotalTaxAmt>${c.tax}</TotalTaxAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<BusinessNameLine1Txt>East Market</BusinessNameLine1Txt>",
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<QualifiedBusinessIncomeDedAmt>${c.deduction}</QualifiedBusinessIncomeDedAmt>`,
    );
    const parentGroups = [
      ...prepared.bundle.xml.matchAll(
        /<QBIDeductionInformationGrp>(.*?)<\/QBIDeductionInformationGrp>/gs,
      ),
    ].map((m) => m[1]);
    assertEquals(parentGroups.length, 3);
    for (
      const [i, name] of ["North Works", "East Market", "South Shop"].entries()
    ) {
      const group = parentGroups.find((g) =>
        g.includes(`<BusinessNameLine1Txt>${name}</BusinessNameLine1Txt>`)
      )!;
      assertStringIncludes(
        group,
        `<QualifiedBusinessIncomeAmt>${
          c.adjusted[i] ?? 0
        }</QualifiedBusinessIncomeAmt>`,
      );
      assertStringIncludes(
        group,
        `<QBIComponentAmt>${c.deductions[i] ?? 0}</QBIComponentAmt>`,
      );
    }
    const retained = process.env.FORM8995A_PROPORTIONAL_LOSSES_DIR;
    const dir = retained ? `${retained}/${c.id}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/input.json`,
        JSON.stringify(inputs, null, 2),
      );
      await fs.writeFile(
        `${dir}/pending.json`,
        JSON.stringify(prepared.bundle.pending, null, 2),
      );
      await fs.writeFile(
        `${dir}/projection.json`,
        JSON.stringify({ parent, companion }, null, 2),
      );
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
      for (
        const field of ["deduction", "income", "companion", "second-source"]
      ) {
        const altered = structuredClone(prepared.bundle.pending);
        if (field === "deduction") {
          Object.assign(altered.f1040!, {
            line13_qbi_deduction: c.deduction + 1,
          });
        }
        if (field === "income") {
          Object.assign(altered.schedule1!, { line3_schedule_c: net + 1 });
        }
        if (field === "companion") {
          Object.assign(altered.form8995a_schedule_c!, { qbi: net + 1 });
        }
        if (field === "second-source") {
          const qbi = qbiInputSchema.parse(altered.form8995a);
          const business = qbi.schedule_c_qbi_businesses![1];
          business.ein = "999999999";
          business.source_schedule_c.line_d_ein = "999999999";
          altered.form8995a = qbi;
          altered.form8995a_schedule_c = structuredClone(qbi);
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

test("Form8995A proportional allocation conserves tied and fully used dollars in every source order", () => {
  for (const loss of [1701, 2000, 2100]) {
    const rows = [
      {
        ...sourceRows[0],
        business_reference: "a",
        line_1_gross_receipts: 1100,
      },
      {
        ...sourceRows[0],
        business_reference: "b",
        line_c_business_name: "East Market",
        line_d_ein: "234567890",
        line_1_gross_receipts: 1040,
        line_26_wages: 40,
        qbi_w2_wages: 40,
      },
      {
        ...sourceRows[1],
        part_v_other_expenses: [{
          description: "Shop operating costs",
          amount: loss,
        }],
      },
    ];
    for (
      const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [
        2,
        1,
        0,
      ]]
    ) {
      const result = f1040_2025.executeReturn({
        ...base.inputs,
        general: {
          ...base.inputs.general as Record<string, unknown>,
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: 2000 - loss,
            line6_schedule_f_amount: 0,
            source_document_refs: [
              "a-current-income",
              "b-current-income",
              "south-current-expenses",
            ],
          },
        },
        schedule_c: order.map((i) => rows[i]),
      });
      assertEquals(result.diagnostics, []);
      const lines = calculateScheduleCLossLines(
        qbiInputSchema.parse(normalizeAllPending(result.pending).form8995a),
      );
      const byRef = Object.fromEntries(
        lines.businessLines.map((r) => [r.business.business_reference, r]),
      );
      assertEquals(
        [byRef.a.loss, byRef.b.loss],
        loss === 1701 ? [851, 850] : [1000, 1000],
      );
      assertEquals(
        lines.businessLines.reduce((sum, r) => sum + r.loss, 0),
        Math.min(loss, 2000),
      );
      assertEquals(lines.schedule.line6, Math.max(0, loss - 2000));
      if (loss >= 2000) {
        assertEquals(lines.parent.line39, 0);
        assertEquals(
          lines.businessLines.map(
            (r) => [r.parent.line2, r.parent.line4, r.parent.line7],
          ),
          [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        );
      }
    }
  }
});
