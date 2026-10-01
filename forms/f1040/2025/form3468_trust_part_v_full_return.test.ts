import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { inputSchema as f3468InputSchema } from "../nodes/inputs/f3468/index.ts";
import { inputSchema as f3800InputSchema } from "../nodes/inputs/f3800/index.ts";
import { trustK1PartVFixture } from "../nodes/inputs/f3468/trust-part-v.fixture.ts";
import { normalizeAllPending } from "./pdf/pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { form3468Pdf } from "./pdf/forms/f3468.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-trust-clean-electricity-investment-credit"
)!;

Deno.test("trust K-1 box 14 code M reaches Form 3468, Form 3800, Schedule 3, Form 1040, native and PDF", async () => {
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const f3468 = f3468InputSchema.parse(pending.f3468);
  const f3800 = f3800InputSchema.parse(pending.f3800);
  assertEquals(f3468.trust_part_v_claims?.length, 1);
  assertEquals(
    f3800.f3468_trust_part_v_credit_entries?.[0]?.credit_amount,
    3_000,
  );
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 3_000);
  assertEquals(
    prepared.bundle.form3800Parts?.currentAmounts.find((row) =>
      row.line === "1v"
    )?.nonpassiveCredit,
    3_000,
  );
  assertEquals(pending.schedule3.line6a_total, 3_000);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 3_000);
  assertStringIncludes(prepared.bundle.xml, "<IRS3468 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<BssQlfyInvstSect48Eb1Amt>10000</BssQlfyInvstSect48Eb1Amt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotReportableEgyFncCrAmt>3000</TotReportableEgyFncCrAmt>",
  );
  assertStringIncludes(prepared.bundle.xml, "<Form3468PartVCYCreditsGrp");
  const printed = form3468Pdf.instances?.(
    pending.f3468,
    fixture.filer,
    pending,
    prepared.bundle.form3800Parts,
  );
  assertEquals(printed?.length, 1);
  assertEquals(printed?.[0].line1a, 10_000);
  assertEquals(printed?.[0].line11, 3_000);
  await prepared.renderPdf();
});

Deno.test("trust Part V full return rejects altered independent review and wrong K-1 box", async () => {
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const source = normalizeAllPending(result.pending);
  const form = f3468InputSchema.parse(source.f3468);
  const altered = {
    ...result.pending,
    f3468: {
      ...form,
      trust_part_v_source_reviews: [{
        ...form.trust_part_v_source_reviews?.[0],
        issuer_pdf_sha256: "b".repeat(64),
      }],
    },
  };
  await assertRejects(
    () => f1040_2025.prepareReturn(altered, fixture.filer),
    Error,
    "reviewed statement packet",
  );
  await assertRejects(
    () =>
      f1040_2025.prepareReturn({
        ...result.pending,
        k1_trust: {
          k1_trusts: [{
            ...trustK1PartVFixture.k1_trusts[0],
            box13_code_m_clean_electricity_investment_credit: 3_000,
          }],
        },
      }, fixture.filer),
  );
});
