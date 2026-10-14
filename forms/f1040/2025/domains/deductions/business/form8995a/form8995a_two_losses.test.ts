import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form8995a } from "../../../../mef/forms/deductions/business/f8995a/f8995a.ts";
import { form8995aScheduleC } from "../../../../mef/forms/deductions/business/f8995a/f8995a_schedule_c.ts";
import { inputSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import { form8995aScheduleCPdf } from "../../../../pdf/forms/deductions/business/f8995a_schedule_c.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const sourceRows = base.inputs.schedule_c as Record<string, unknown>[];
const cases = [
  {
    id: "two-losses",
    expenses: [1200, 800],
    reverse: false,
    carry: 2000,
    tax: 69235,
  },
  {
    id: "reversed-losses",
    expenses: [1200, 800],
    reverse: true,
    carry: 2000,
    tax: 69235,
  },
  {
    id: "cent-losses",
    expenses: [1200.49, 800.51],
    reverse: false,
    carry: 2001,
    tax: 69234,
  },
];
for (const c of cases) {
  Deno.test(`Form8995A ${c.id} retains both loss businesses and the existing full-return guard`, async () => {
    let rows: Record<string, unknown>[] = sourceRows.map((row, i) => ({
      ...row,
      line_1_gross_receipts: 0,
      line_26_wages: 0,
      line_32_at_risk: "a",
      qbi_w2_wages: 0,
      part_v_other_expenses: [{
        description: "Reviewed operating costs",
        amount: c.expenses[i],
      }],
    }));
    if (c.reverse) rows = rows.reverse();
    const inputs = {
      ...base.inputs,
      general: {
        ...base.inputs.general as Record<string, unknown>,
        form461_scope_review: {
          only_schedule_c_and_f_business_items: true,
          other_part_i_lines_zero: true,
          part_ii_adjustments_zero: true,
          post_at_risk_and_passive_limits_confirmed: true,
          line2_schedule_c_amount: -c.carry,
          line6_schedule_f_amount: 0,
          source_document_refs: ["north-2025-expenses", "south-2025-expenses"],
        },
      },
      w2: (base.inputs.w2 as Record<string, unknown>[]).map((w2) => ({
        ...w2,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918,
        box5_medicare_wages: 300000,
        box6_medicare_withheld: 4350,
      })),
      schedule_c: rows,
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], c.id);
    assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, c.carry);
    const f = result.pending.f1040;
    assertEquals([
      f.line8_additional_income,
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], [-c.carry, 300000 - c.carry, 0, c.tax, c.tax - 60000]);
    const pending = normalizeAllPending(result.pending);
    const parent = form8995aPdf.projectFields!(pending.form8995a, pending);
    const companion = form8995aScheduleCPdf.projectFields!(
      pending.form8995a_schedule_c,
      pending,
    );
    assertEquals(
      [parent.business_name, parent.business_name_b],
      rows.map((r) => r.line_c_business_name),
    );
    assertEquals([
      companion.line3,
      companion.line4,
      companion.line5,
      companion.line6,
    ], [c.carry, 0, 0, c.carry]);
    assertEquals([
      companion.row1_c,
      companion.row2_c,
      parent.line39,
      parent.line40,
    ], [0, 0, 0, 0]);
    const parentXml = form8995a.build(inputSchema.parse(pending.form8995a), {
      filer: base.filer,
      pending,
    });
    const companionXml = form8995aScheduleC.build(
      inputSchema.parse(pending.form8995a_schedule_c),
      { filer: base.filer, pending },
    );
    assertStringIncludes(
      companionXml,
      `<QlfyBusLossCarryforwardAmt>${c.carry}</QlfyBusLossCarryforwardAmt>`,
    );
    for (const row of rows) {
      assertStringIncludes(parentXml, String(row.line_c_business_name));
      assertStringIncludes(companionXml, String(row.line_c_business_name));
    }
    const boundary =
      "Form 8995 zero deduction cannot omit an unfiled QBI or REIT/PTP loss carryforward";
    const nativeError = await assertRejects(
      () => f1040_2025.prepareReturn(result.pending, base.filer),
      Error,
      boundary,
    );
    const pdfError = await assertRejects(
      () => buildPdfBytes(pending, base.filer, ".pdf-cache"),
      Error,
      boundary,
    );
    const permission = await Deno.permissions.query({
      name: "env",
      variable: "FORM8995A_TWO_LOSSES_DIR",
    });
    const retained = permission.state === "granted"
      ? Deno.env.get("FORM8995A_TWO_LOSSES_DIR")
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
        JSON.stringify(pending, null, 2),
      );
      await Deno.writeTextFile(`${dir}/parent-component.xml`, parentXml);
      await Deno.writeTextFile(`${dir}/companion-component.xml`, companionXml);
      await Deno.writeTextFile(
        `${dir}/projection.json`,
        JSON.stringify(
          {
            parent,
            companion,
            carry: result.carryforwards,
            nativeError: nativeError.message,
            pdfError: pdfError.message,
          },
          null,
          2,
        ),
      );
      for (const changed of ["deduction", "income", "companion"]) {
        const altered = structuredClone(pending);
        if (changed === "deduction") {
          Object.assign(altered.f1040, { line13_qbi_deduction: 1 });
        }
        if (changed === "income") {
          Object.assign(altered.schedule1, { line3_schedule_c: -c.carry + 1 });
        }
        if (changed === "companion") {
          Object.assign(altered.form8995a_schedule_c, { qbi: -c.carry + 1 });
        }
        assertThrows(() =>
          form8995a.build(inputSchema.parse(altered.form8995a), {
            filer: base.filer,
            pending: altered,
          })
        );
        assertThrows(() =>
          form8995aScheduleC.build(
            inputSchema.parse(altered.form8995a_schedule_c),
            { filer: base.filer, pending: altered },
          )
        );
        assertThrows(() =>
          form8995aPdf.projectFields!(altered.form8995a, altered)
        );
        assertThrows(() =>
          form8995aScheduleCPdf.projectFields!(
            altered.form8995a_schedule_c,
            altered,
          )
        );
      }
    } finally {
      if (!retained) await Deno.remove(dir, { recursive: true });
    }
  });
}
