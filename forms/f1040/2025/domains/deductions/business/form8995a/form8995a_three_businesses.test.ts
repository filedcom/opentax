import { inputSchema as qbiInputSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
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
    id: "income-limited",
    profit: 2200,
    losses: [1200, 800],
    net: 200,
    deduction: 40,
    tax: 69991,
  },
  {
    id: "wage-limited",
    profit: 2300,
    losses: [1200, 800],
    net: 300,
    deduction: 50,
    tax: 70022,
  },
  {
    id: "source-cents",
    profit: 2301.25,
    losses: [1200.49, 800.51],
    net: 300,
    deduction: 50,
    tax: 70022,
  },
];
for (const c of cases) {
  Deno.test(`Form8995A three businesses ${c.id} reconcile full XML and PDF`, async () => {
    const rows = [
      { ...sourceRows[0], line_1_gross_receipts: c.profit + 100 },
      {
        ...sourceRows[1],
        part_v_other_expenses: [{
          description: "Shop operating costs",
          amount: c.losses[0],
        }],
      },
      {
        ...sourceRows[1],
        line_c_business_name: "East Market",
        line_d_ein: "234567890",
        business_reference: "east-2025",
        part_v_other_expenses: [{
          description: "Market operating costs",
          amount: c.losses[1],
        }],
      },
    ];
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
      c.profit - c.losses[0] - c.losses[1],
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
      c.profit - c.losses[0] - c.losses[1],
      300000 + c.profit - c.losses[0] - c.losses[1],
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
    ], ["North Works", "South Shop", "East Market"]);
    assertEquals([
      companion.row1_c,
      companion.row2_c,
      companion.row3_c,
      companion.line6,
    ], [c.net, 0, 0, 0]);
    assertEquals([companion.row2_a, companion.row3_a], [
      -Math.round(c.losses[0]),
      -Math.round(c.losses[1]),
    ]);
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995AScheduleC");
    assertStringIncludes(
      prepared.bundle.xml,
      `<AdjustedGrossIncomeAmt>${300000 + c.net}</AdjustedGrossIncomeAmt>`,
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
    const permission = await Deno.permissions.query({
      name: "env",
      variable: "FORM8995A_THREE_BUSINESSES_DIR",
    });
    const retained = permission.state === "granted"
      ? Deno.env.get("FORM8995A_THREE_BUSINESSES_DIR")
      : undefined;
    const dir = retained ? `${retained}/${c.id}` : await Deno.makeTempDir();
    await Deno.mkdir(dir, { recursive: true });
    try {
      await Deno.writeTextFile(
        `${dir}/input.json`,
        JSON.stringify(inputs, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/pending.json`,
        JSON.stringify(prepared.bundle.pending, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/projection.json`,
        JSON.stringify({ parent, companion }, null, 2),
      );
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
      for (
        const field of ["deduction", "income", "companion", "third-source"]
      ) {
        const altered = structuredClone(prepared.bundle.pending);
        if (field === "deduction") {
          Object.assign(altered.f1040!, {
            line13_qbi_deduction: c.deduction + 1,
          });
        }
        if (field === "income") {
          Object.assign(altered.schedule1!, { line3_schedule_c: c.net + 1 });
        }
        if (field === "companion") {
          Object.assign(altered.form8995a_schedule_c!, { qbi: c.net + 1 });
        }
        if (field === "third-source") {
          const qbi = qbiInputSchema.parse(altered.form8995a);
          const business = qbi.schedule_c_qbi_businesses![2];
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
      if (!retained) await Deno.remove(dir, { recursive: true });
    }
  });
}
