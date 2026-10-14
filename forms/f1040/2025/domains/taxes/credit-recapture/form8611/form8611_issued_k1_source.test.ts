import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { issuedRecaptureInputs } from "../../../../pdf/reviews/general/composed-returns/review-8611-issued-k1.fixture.ts";
Deno.test("actual section42j5 issued K1 building recaptures reach complete native XSD and PDF", async () => {
  for (const joint of [false, true]) {
    const inputs = issuedRecaptureInputs(joint);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const p = normalizeAllPending(r.pending);
    assertEquals(p.schedule2.line16_lihtc_recapture, 2500);
    assertEquals(p.f1040.line23_other_taxes, 2500);
    const filer = extractFilerIdentity(inputs.general)!;
    const prepared = await f1040_2025.prepareReturn!(r.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8611 /g) || []).length, 2);
    assertStringIncludes(
      prepared.bundle.xml,
      'section42j5Cd="SECTION 42(j)(5)"',
    );
    const dir = ".state/research/2026-10-06-form8611-issued-k1-source";
    await Deno.mkdir(dir, { recursive: true });
    const id = joint ? "joint-spouse" : "single";
    await Deno.writeTextFile(`${dir}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
      JSON.stringify({ inputs, pending: p }, null, 2),
    );
    const x = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${dir}/${id}.xml`,
      ],
      stderr: "piped",
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    await Deno.writeFile(`${dir}/${id}.pdf`, await prepared.renderPdf());
    console.log({ id, agi: p.f1040.line11_agi, tax: p.f1040.line24_total_tax });
  }
});
Deno.test("issued K1 recapture native PDF rejects stale building issuer recipient and final taxes", async () => {
  const inputs = issuedRecaptureInputs();
  const r = f1040_2025.executeReturn(inputs);
  const filer = extractFilerIdentity(inputs.general)!;
  for (
    const mutate of [
      (p: any) => p.f8611.f8611s[0].calculation.line8_flow_through_recapture++,
      (p: any) => p.f8611.f8611s[0].building_bin = "NY7654321",
      (p: any) => p.f8611.f8611s[0].issuer_source.recipient_tin = "222334444",
      (p: any) =>
        p.k1_partnership.k1_partnerships[0].box20_code_f_lihtc_recapture
          .buildings[0].allocated_code_f_amount_including_interest++,
      (p: any) =>
        p.k1_partnership.k1_partnerships[0].partnership_ein = "123123123",
      (p: any) => delete p.k1_partnership,
      (p: any) => p.f8611.f8611s.forEach((i: any) => delete i.issuer_source),
      (p: any) => p.schedule2.line16_lihtc_recapture++,
      (p: any) => p.f1040.line23_other_taxes++,
      (p: any) => p.f8611.f8611s.pop(),
      (p: any) =>
        p.f8611.f8611s[0].calculation.line9_unused_accelerated_credit = 100,
    ]
  ) {
    const p: any = structuredClone(r.pending);
    mutate(p);
    await assertRejects(() => f1040_2025.prepareReturn!(p, filer));
    await assertRejects(() => buildPdfBytes(p, filer));
  }
});
