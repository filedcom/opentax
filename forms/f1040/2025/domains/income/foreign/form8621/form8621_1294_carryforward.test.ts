import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { executePreQefSourceReturn } from "../../../../return-processing/staged_source_return.ts";
import education from "../../../../pdf/reviews/general/composed-returns/review-8863-scholarship-source.json" with {
  type: "json",
};
import { form8621QefSourceInputs } from "./form8621_qef.fixture.ts";

const adoption = pdfReviewFixtures.find((f) =>
  f.id === "single-reviewed-adoption-credit"
)!;
for (
  const row of [
    {
      id: "adoption",
      wages: 50000,
      agi: 52000,
      tax: 4115,
      credit: 4115,
      carry: 1885,
      shadowCredit: 3875,
      refund: 20000,
    },
    {
      id: "education-adoption",
      wages: 64500,
      agi: 72500,
      tax: 7405,
      credit: 5905,
      carry: 95,
      shadowCredit: 5465,
      refund: 17000,
    },
  ]
) {
  Deno.test(`Election B retains only actual adoption carryforward: ${row.id}`, async () => {
    const base = structuredClone(
      row.id === "adoption" ? adoption.inputs : education.inputs,
    ) as Record<string, unknown>;
    base.form8839 = structuredClone(adoption.inputs.form8839);
    const wage = (base.w2 as Record<string, unknown>[])[0];
    Object.assign(wage, {
      box1_wages: row.wages,
      box3_ss_wages: row.wages,
      box4_ss_withheld: row.wages * 0.062,
      box5_medicare_wages: row.wages,
      box6_medicare_withheld: row.wages * 0.0145,
    });
    if (row.id !== "adoption") {
      (base.f8863 as Record<string, unknown>[])[0].filer_magi = row.agi;
      (base.f8863_credit_limit_worksheet as {
        credit_limit_worksheet: Record<string, unknown>;
      }).credit_limit_worksheet.form1040_line18_tax = row.tax;
    }
    const input = form8621QefSourceInputs(base);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    assertEquals(result.carryforwards.adoption_credit_2025, row.carry);
    const pending = buildPending(result.pending);
    const filed = pending.f1040!;
    assertEquals(filed.line11_agi, row.agi);
    assertEquals(filed.line18_total_tax_before_credits, row.tax);
    assertEquals(pending.schedule3?.line6c_adoption_credit, row.credit);
    assertEquals(filed.form8621_1294_deferred_tax, 0);
    assertEquals(filed.line24_total_tax, 0);
    assertEquals(filed.line30_refundable_adoption, 5000);
    assertEquals(filed.line35a_refund, row.refund);
    const ledger = result.pending.form8839_carryforward;
    assertEquals(ledger, {
      version: 1,
      status: "computed_unfiled",
      origin_tax_year: 2025,
      first_carry_year: 2026,
      last_carry_year: 2030,
      taxpayer_ssn: "111223333",
      child_ssn: "111223334",
      decree_document_id: "decree-1",
      expense_document_ids: ["invoice-1"],
      nonrefundable_credit: 6000,
      used_in_origin_year: row.credit,
      carryforward_amount: row.carry,
    });
    const withoutInput = structuredClone(input) as Record<string, unknown>;
    const holding = (withoutInput.f8621 as Record<string, unknown>[])[0];
    holding.qef_ordinary_income = 0;
    delete holding.qef_1294_election;
    const without = executePreQefSourceReturn(withoutInput, true);
    const shadow = buildPending(without.pending);
    assertEquals(shadow.schedule3?.line6c_adoption_credit, row.shadowCredit);
    assertEquals(without.pending.form8839_carryforward, undefined);
    assertEquals(without.carryforwards.adoption_credit_2025, undefined);
    const filer = extractFilerIdentity(filed)!;
    const packet = await f1040_2025.prepareReturn(
      pending,
      filer,
      adoption.attachments!,
    );
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      packet.bundle,
    );
    // Newly observed persistence boundary is deferred, not repaired here.
    const persisted = buildPending(JSON.parse(JSON.stringify(result.pending)));
    await assertRejects(
      () => f1040_2025.prepareReturn(persisted, filer, adoption.attachments!),
      Error,
      "differs from full source",
    );
    await assertRejects(
      () => buildPdfBytes(persisted, filer, ".pdf-cache"),
      Error,
      "differs from full source",
    );
    const out = Deno.env.get("FORM8621_CARRY_EVIDENCE_DIR");
    if (out) {
      const dir = `${out}/${row.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({ input, pending, shadow }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/return.xml`, packet.bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
    for (
      const changed of [
        undefined,
        { ...ledger, carryforward_amount: 6000 - row.shadowCredit },
        { ...ledger, used_in_origin_year: row.shadowCredit },
        { ...ledger, taxpayer_ssn: "999999999" },
        { ...ledger, status: "accepted" },
      ]
    ) {
      const altered = { ...pending, form8839_carryforward: changed };
      const nativeError = await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer, adoption.attachments!),
        Error,
      );
      const pdfError = await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache"),
        Error,
      );
      assertMatch(nativeError.message, /carryforward|full source/i);
      assertMatch(pdfError.message, /carryforward|full source/i);
    }
  });
}
