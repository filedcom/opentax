import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { executePreQefSourceReturn } from "../../../../return-processing/staged_source_return.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import education from "../../../../pdf/reviews/general/composed-returns/review-8863-scholarship-source.json" with {
  type: "json",
};
import { form8621QefSourceInputs } from "./form8621_qef.fixture.ts";

const adoption = pdfReviewFixtures.find((f) =>
  f.id === "single-reviewed-adoption-credit"
)!;

function source(wages: number, magi: number, tax: number) {
  const input = structuredClone(education.inputs);
  input.w2[0].box1_wages = wages;
  input.w2[0].box3_ss_wages = wages;
  input.w2[0].box4_ss_withheld = wages * 0.062;
  input.w2[0].box5_medicare_wages = wages;
  input.w2[0].box6_medicare_withheld = wages * 0.0145;
  input.f8863[0].filer_magi = magi;
  input.f8863_credit_limit_worksheet.credit_limit_worksheet
    .form1040_line18_tax = tax;
  return form8621QefSourceInputs({
    ...input,
    form8839: structuredClone(adoption.inputs.form8839),
  });
}

for (
  const testCase of [
    {
      id: "phaseout",
      wages: 75000,
      magi: 83000,
      tax: 9715,
      education: 1050,
      refundable: 700,
      before: 2665,
      without: 1925,
      deferred: 740,
    },
    {
      id: "shadow-limit",
      wages: 66000,
      magi: 74000,
      tax: 7735,
      education: 1500,
      refundable: 1000,
      before: 235,
      without: 0,
      deferred: 235,
    },
  ]
) {
  Deno.test(`QEF refigure settles education before adoption: ${testCase.id}`, async () => {
    const input = source(testCase.wages, testCase.magi, testCase.tax);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const filed = pending.f1040!;
    assertEquals(filed.line11_agi, testCase.magi);
    assertEquals(filed.line18_total_tax_before_credits, testCase.tax);
    assertEquals(pending.schedule3?.line3_education_credit, testCase.education);
    assertEquals(pending.schedule3?.line6c_adoption_credit, 6000);
    assertEquals(filed.line29_refundable_aoc, testCase.refundable);
    assertEquals(filed.line30_refundable_adoption, 5000);
    assertEquals(
      filed.form8621_1294_total_tax_before_deferral,
      testCase.before,
    );
    assertEquals(
      filed.form8621_1294_counterfactual_total_tax,
      testCase.without,
    );
    assertEquals(filed.form8621_1294_deferred_tax, testCase.deferred);
    assertEquals(filed.line24_total_tax, testCase.without);
    assertEquals(
      filed.line35a_refund,
      11000 + 5000 + testCase.refundable - testCase.without,
    );
    const withoutInput = structuredClone(input) as Record<string, unknown>;
    const withoutHolding = (withoutInput.f8621 as Record<string, unknown>[])[0];
    withoutHolding.qef_ordinary_income = 0;
    delete withoutHolding.qef_1294_election;
    const shadow = buildPending(
      executePreQefSourceReturn(withoutInput, true).pending,
    );
    assertEquals(shadow.f1040?.line11_agi, testCase.magi - 2000);
    assertEquals(
      shadow.f1040?.line18_total_tax_before_credits,
      testCase.tax - 440,
    );
    assertEquals(
      shadow.schedule3?.line3_education_credit,
      testCase.id === "phaseout" ? 1350 : 1500,
    );
    assertEquals(
      shadow.schedule3?.line6c_adoption_credit,
      testCase.id === "phaseout" ? 6000 : 5795,
    );
    assertEquals(shadow.f1040?.line24_total_tax, testCase.without);
    assertEquals(
      shadow.f1040?.line29_refundable_aoc,
      testCase.id === "phaseout" ? 900 : 1000,
    );
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
    const out = Deno.env.get("FORM8621_COMBINED_EVIDENCE_DIR");
    if (out) {
      const dir = `${out}/${testCase.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({ input, pending }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/return.xml`, packet.bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
    for (const field of ["line3_education_credit", "line6c_adoption_credit"]) {
      const changed = structuredClone(pending);
      changed.schedule3![field] = Number(changed.schedule3![field]) + 1;
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer, adoption.attachments!),
        Error,
        "differs from full source",
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer, ".pdf-cache"),
        Error,
        "differs from full source",
      );
    }
    const stale = source(testCase.wages, testCase.magi - 2000, testCase.tax);
    assertThrows(() => f1040_2025.executeReturn(stale), Error, "filed MAGI");
  });
}

Deno.test("QEF without Election B retains actual adoption carryforward", () => {
  const input = source(64500, 72500, 7405);
  delete (input.f8621[0] as Record<string, unknown>).qef_1294_election;
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.adoption_credit_2025, 95);
  assertEquals(buildPending(result.pending).f1040?.line24_total_tax, 0);
});
