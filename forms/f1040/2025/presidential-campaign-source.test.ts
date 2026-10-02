import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { general } from "../nodes/inputs/general/index.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const context = { taxYear: 2025, formType: "f1040" } as Parameters<
  typeof general.compute
>[0];

function filedElection(
  filingStatus: "single" | "mfj",
  taxpayer: boolean,
  spouse: boolean,
) {
  const source = general.inputSchema.parse({
    filing_status: filingStatus,
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: filingStatus === "mfj" ? "222-33-4444" : undefined,
    presidential_campaign_fund_taxpayer: taxpayer,
    presidential_campaign_fund_spouse: spouse,
  });
  const initial = general.compute(context, source).outputs.find((item) =>
    item.nodeType === "f1040"
  )?.fields;
  if (!initial) throw new Error("general did not route Form 1040 fields");
  const final = f1040.compute(
    context,
    f1040.inputSchema.parse(initial),
  ).outputs[0].fields;
  return { source, final: { ...final, filing_status: filingStatus } };
}

Deno.test("presidential campaign answers reach final Form 1040, MeF, and TY2025 PDF boxes", () => {
  const { source, final } = filedElection("mfj", true, true);
  assertEquals(
    (final as Record<string, unknown>).presidential_campaign_fund_taxpayer,
    true,
  );
  assertEquals(
    (final as Record<string, unknown>).presidential_campaign_fund_spouse,
    true,
  );

  const xml = irs1040.build(final, { pending: { general: source } });
  assertStringIncludes(xml, "<PECFPrimaryInd>X</PECFPrimaryInd>");
  assertStringIncludes(xml, "<PECFSpouseInd>X</PECFSpouseInd>");
  assertEquals(
    xml.indexOf("<PECFPrimaryInd>") <
      xml.indexOf("<IndividualReturnFilingStatusCd>"),
    true,
  );

  const mapped = new Map(irs1040Pdf.fields.map((entry) => [
    entry.domainKey,
    entry.pdfField,
  ]));
  assertEquals(
    mapped.get("presidential_campaign_fund_taxpayer"),
    "topmostSubform[0].Page1[0].c1_6[0]",
  );
  assertEquals(
    mapped.get("presidential_campaign_fund_spouse"),
    "topmostSubform[0].Page1[0].c1_7[0]",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(final, { general: source })
      ?.presidential_campaign_fund_spouse,
    true,
  );
});

Deno.test("false presidential campaign answers leave both MeF indicators and PDF boxes clear", () => {
  const { source, final } = filedElection("mfj", false, false);
  const xml = irs1040.build(final, { pending: { general: source } });
  assertEquals(xml.includes("<PECFPrimaryInd>"), false);
  assertEquals(xml.includes("<PECFSpouseInd>"), false);
  const projected = irs1040Pdf.projectFields?.(final, { general: source });
  assertEquals(projected?.presidential_campaign_fund_taxpayer, false);
  assertEquals(projected?.presidential_campaign_fund_spouse, false);
});

Deno.test("single filer can designate the taxpayer fund without a spouse mark", () => {
  const { source, final } = filedElection("single", true, false);
  const xml = irs1040.build(final, { pending: { general: source } });
  assertStringIncludes(xml, "<PECFPrimaryInd>X</PECFPrimaryInd>");
  assertEquals(xml.includes("<PECFSpouseInd>"), false);
  const projected = irs1040Pdf.projectFields?.(final, { general: source });
  assertEquals(projected?.presidential_campaign_fund_taxpayer, true);
  assertEquals(projected?.presidential_campaign_fund_spouse, false);
});

Deno.test("presidential campaign source tampering is rejected by native and PDF exports", () => {
  const { source, final } = filedElection("mfj", true, false);
  for (
    const altered of [
      { ...final, presidential_campaign_fund_taxpayer: false },
      { ...final, presidential_campaign_fund_spouse: true },
    ]
  ) {
    assertThrows(
      () => irs1040.build(altered, { pending: { general: source } }),
      Error,
      "differs from retained general input",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(altered, { general: source }),
      Error,
      "differs from retained general input",
    );
  }
  assertThrows(
    () => irs1040.build(final),
    Error,
    "differs from retained general input",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(final, {}),
    Error,
    "differs from retained general input",
  );
});

Deno.test("spouse presidential campaign mark requires a joint return", () => {
  assertThrows(
    () => filedElection("single", false, true),
    Error,
    "requires a joint return",
  );
});
