import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { calculateTwoBusinessAggregationLines } from "../nodes/intermediate/forms/form8995a/index.ts";
import { buildStagedIRS8995AScheduleB } from "./mef/forms/f8995a_schedule_b.ts";

async function literal(
  count: 3 | 4,
  shared = false,
  events = false,
): Promise<any> {
  return JSON.parse(
    await Deno.readTextFile(
      new URL(
        "./fixtures/form8995a-rpe-" + count +
          (events
            ? "-business-formation-acquisition-source.json"
            : shared
            ? "-business-shared-source.json"
            : "-business-source.json"),
        import.meta.url,
      ),
    ),
  );
}

function guarded(input: any) {
  let result;
  try {
    result = f1040_2025.executeReturn(input);
  } catch (error) {
    assert(
      /RPE|aggregation|K1|K-1|section199A|source/i.test(String(error)),
      String(error),
    );
    return;
  }
  assert(
    result.diagnostics.some((d) =>
      d.severity === "error" &&
      /RPE|aggregation|K1|K-1|section199A|source/i.test(d.message)
    ),
    "Relevant source error required",
  );
}

Deno.test("issued S-corp RPE aggregation keeps complete members, annual copy, wage-property limits and 1040 through native XSD/PDF", async () => {
  const out = await Deno.makeTempDir({
    prefix: "opentax-rpe-aggregation-actual-source-",
  });
  console.log("RPE aggregation actual source archive:", out);
  for (
    const { count, shared, events, id } of [
      { count: 3 as const, shared: false, events: false, id: "3" },
      { count: 4 as const, shared: false, events: false, id: "4" },
      { count: 3 as const, shared: true, events: false, id: "3-shared" },
      { count: 3 as const, shared: true, events: true, id: "3-events" },
    ]
  ) {
    const input = await literal(count, shared, events),
      result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: any = normalizeAllPending(result.pending);
    const qbi = count === 3 ? 240000 : 350000,
      wages = count === 3 ? 60000 : 65001;
    const deduction = count === 3 ? 48000 : 66250,
      totalTax = count === 3 ? 66235 : 98347;
    assertEquals(pending.schedule1.line5_schedule_e, qbi);
    assertEquals(pending.f1040.line1z_total_wages, 100000);
    assertEquals(pending.f1040.line11_agi, qbi + 100000);
    assertEquals(pending.f1040.line13_qbi_deduction, deduction);
    assertEquals(
      pending.f1040.line15_taxable_income,
      qbi + 100000 - 15750 - deduction,
    );
    assertEquals(pending.f1040.line16_income_tax, totalTax);
    assertEquals(pending.f1040.line24_total_tax, totalTax);
    const lines = calculateTwoBusinessAggregationLines(pending.form8995a);
    assertEquals(lines.schedule.rows.length, count);
    assertEquals(lines.schedule.totalW2Wages, wages);
    assertEquals(lines.schedule.totalUbia, 2000000);
    assertEquals(lines.parent.line3, count === 3 ? 48000 : 70000);
    assertEquals(lines.parent.line5, count === 3 ? 30000 : 32501);
    assertEquals(lines.parent.line6, count === 3 ? 15000 : 16250);
    assertEquals(lines.parent.line8, 50000);
    assertEquals(lines.parent.line39, deduction);
    const filer = extractFilerIdentity(pending.f1040)!;
    const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
    assertEquals(prepared.bundle.attachments.length, 2);
    assertEquals(
      prepared.bundle.attachments[0].fileName,
      "Form8995AAggregationAnnualDisclosure.pdf",
    );
    assert(prepared.bundle.xml.includes("<AggregatedInd>X</AggregatedInd>"));
    assertEquals(
      prepared.bundle.attachments[1].fileName,
      input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf.file_name,
    );
    assertEquals(
      Array.from(prepared.bundle.attachments[1].bytes),
      Array.from(
        Uint8Array.from(
          atob(
            input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf
              .pdf_base64,
          ),
          (c) => c.charCodeAt(0),
        ),
      ),
    );
    assertEquals(
      (prepared.bundle.xml.match(/<BusinessAggregationInfoGrp>/g) ?? []).length,
      count,
    );
    assert(prepared.bundle.xml.includes("<PriorYearChangeDesc>"));
    assert(
      prepared.bundle.xml.includes('referenceDocumentName="BinaryAttachment"'),
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const dir = out + "/" + id;
    await Deno.mkdir(dir);
    for (
      const [name, data] of Object.entries({
        "source.json": input,
        "pending.json": pending,
        "prepared.json": prepared.bundle.pending,
        "carry.json": result.carryforwards,
        "origins.json": origins,
        "expected.json": { qbi, wages, ubia: 2000000, deduction, totalTax },
      })
    ) {
      await Deno.writeTextFile(dir + "/" + name, JSON.stringify(data, null, 2));
    }
    await Deno.writeFile(dir + "/return.pdf", pdf);
    await Deno.writeFile(
      dir + "/annual.pdf",
      prepared.bundle.attachments[0].bytes,
    );
    await Deno.writeFile(
      dir + "/issued.pdf",
      prepared.bundle.attachments[1].bytes,
    );
    await Deno.writeTextFile(dir + "/return.xml", prepared.bundle.xml);
    const xsd =
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + "/return.xml"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  }
});

Deno.test("RPE public source rejects missing copies, borrowed issuer/recipient, changed members and unsupported ownership/election facts", async () => {
  const input = await literal(3);
  const edits: ((p: any) => void)[] = [
    (p) => delete p.k1_s_corp[0].rpe_aggregation_source,
    (p) => delete p.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf,
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf.pdf_sha256 =
        "0".repeat(64),
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf
        .complete_member_amounts_events_and_owner_match_confirmed = false,
    (p) => p.k1_s_corp[0].recipient_tin = "999999999",
    (p) => p.k1_s_corp[0].corporation_ein = "999999999",
    (p) => p.k1_s_corp[0].source_document_reference = "another-issued-k1",
    (p) => p.k1_s_corp[0].box1_ordinary_business += 1,
    (p) => p.k1_s_corp[0].qbi_amount += 1,
    (p) => p.k1_s_corp[0].w2_wages += 1,
    (p) => p.k1_s_corp[0].ubia_qualified_property += 1,
    (p) => p.k1_s_corp[0].box17_w2_wages = 1,
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf.file_name =
        "Form8995AAggregationAnnualDisclosure.pdf",
    (p) => p.k1_s_corp[0].box4_interest = 1,
    (p) => p.k1_s_corp[0].eic_passive_activity_review.box1 = "passive",
    (p) => p.k1_s_corp[0].rpe_aggregation_source.members.pop(),
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.members[1].business_reference =
        "north-2025",
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.members[1].entity_ein = "999999999",
    (p) => p.k1_s_corp[0].rpe_aggregation_source.members[1].events = [],
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.members[1]
        .rpe_ownership_start_date = "2025-08-01",
    (p) => p.k1_s_corp[0].rpe_aggregation_source.recipient_share_pct = 50,
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source
        .no_lower_tier_rpe_aggregations_confirmed = false,
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source
        .timely_original_return_election_confirmed = false,
    (p) =>
      p.k1_s_corp[0].rpe_aggregation_source.election_history.status =
        "continued_unchanged",
    (p) => p.k1_s_corp[0].rpe_aggregation_source.operational_factors.pop(),
    (p) => p.qbi_aggregation.aggregation_groups[0].business_names.pop(),
    (p) => p.general.taxpayer_ssn = "999-99-9999",
  ];
  for (const edit of edits) {
    const changed = structuredClone(input);
    edit(changed);
    guarded(changed);
  }
  const events = await literal(3, true, true);
  for (
    const edit of [
      (p: any) =>
        p.k1_s_corp[0].rpe_aggregation_source.members[1].events[0].date =
          "2025-03-01",
      (p: any) =>
        p.k1_s_corp[0].rpe_aggregation_source.members[1].events[0].date =
          "2025-02-30",
      (p: any) =>
        p.k1_s_corp[0].rpe_aggregation_source.members[1]
          .rpe_ownership_start_date = "2025-01-15",
      (p: any) =>
        p.k1_s_corp[0].rpe_aggregation_source.members[1].events[1].date =
          "2025-02-02",
      (p: any) =>
        p.k1_s_corp[0].rpe_aggregation_source.members[1].events.push({
          ...p.k1_s_corp[0].rpe_aggregation_source.members[1].events[0],
        }),
    ]
  ) {
    const changed = structuredClone(events);
    edit(changed);
    guarded(changed);
  }
});

Deno.test("RPE native and direct PDF bind actual K1, parent/companion, annual source, Schedule1 and final deduction", async () => {
  const input = await literal(3), result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending: any = normalizeAllPending(result.pending),
    filer = extractFilerIdentity(pending.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
  const edits: ((p: any) => void)[] = [
    (p) =>
      p.k1_s_corp.k1_s_corps[0].rpe_aggregation_source.recipient_tin =
        "999999999",
    (p) => p.k1_s_corp.k1_s_corps[0].box1_ordinary_business += 1,
    (p) =>
      p.k1_s_corp.k1_s_corps[0].rpe_aggregation_source.issued_statement_pdf
        .pdf_sha256 = "0".repeat(64),
    (p) => delete p.k1_s_corp,
    (p) => delete p.form8995a_schedule_b,
    (p) => p.form8995a.aggregation_groups[0].business_names.pop(),
    (p) => p.form8995a.rpe_aggregation_source.members[0].w2_wages += 1,
    (p) => p.form8995a_schedule_b.rpe_aggregation_source.members[1].events = [],
    (p) => p.form8582.line1a = 1,
    (p) => p.form8582.current_income = 1,
    (p) => p.form7206.schedule_se_source = 0,
    (p) => p.form7206.schedule_se_source.net_profit_schedule_c = 1,
    (p) => p.form7206.plans = [{ plan_reference: "borrowed-health-plan" }],
    (p) => p.schedule1.line5_schedule_e += 1,
    (p) => p.schedule1.line16_sep_simple = 1,
    (p) => p.f1040.line13_qbi_deduction += 1,
    (p) => p.f1040.line15_taxable_income += 1,
  ];
  for (const edit of edits) {
    const changed = structuredClone(prepared.bundle.pending);
    edit(changed);
    await assertRejects(
      () => f1040_2025.prepareReturn!(changed, filer),
    );
    await assertRejects(
      () => buildPdfBytes(changed, filer, ".pdf-cache"),
    );
  }
  assertThrows(() =>
    buildStagedIRS8995AScheduleB(pending.form8995a_schedule_b, {
      filer,
      pending,
      binaryAttachmentFileNames: [],
    })
  );
  assertThrows(() =>
    buildStagedIRS8995AScheduleB(pending.form8995a_schedule_b, {
      filer,
      pending,
      phase: "final",
      binaryAttachmentFileNames: ["Form8995AAggregationAnnualDisclosure.pdf"],
      documentIdsByAttachmentFileName: {
        "Form8995AAggregationAnnualDisclosure.pdf": "Attachment1",
      },
    })
  );
});

Deno.test("RPE real printable issuer copy is required at native and direct PDF boundaries", async () => {
  const input = await literal(3);
  const bytes = new TextEncoder().encode(
    "%PDF-1.7\ninvalid reviewed issuer body\n",
  );
  const pdf = input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf;
  pdf.pdf_base64 = btoa(String.fromCharCode(...bytes));
  pdf.pdf_sha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  const result = f1040_2025.executeReturn(input);
  // The synchronous source route checks encoding/digest and reviewed facts;
  // readable printable PDF validation is an asynchronous export boundary.
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending),
    filer = extractFilerIdentity(pending.f1040)!;
  await assertRejects(() => f1040_2025.prepareReturn!(result.pending, filer));
  await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
});
