import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const general = {
  ...(base.inputs.general as Record<string, unknown>),
  qbi_no_prior_loss_or_suspended_loss_confirmed: true,
  qbi_not_patron_of_specified_cooperative_confirmed: true,
};
const wages = base.inputs.w2 as Array<Record<string, unknown>>;
const copies = [
  {
    ...wages[0],
    employer_ein: "123456789",
    source_document_reference: "issued statutory W-2 one",
    schedule_c_business_reference: "statutory-business",
    box13_statutory_employee: true,
    box1_wages: 45_000,
    box2_fed_withheld: 4_000,
    box3_ss_wages: 45_000,
    box4_ss_withheld: 2_790,
    box5_medicare_wages: 45_000,
    box6_medicare_withheld: 652.5,
  },
  {
    ...wages[0],
    employer_ein: "987654321",
    source_document_reference: "issued statutory W-2 two",
    schedule_c_business_reference: "statutory-business",
    box13_statutory_employee: true,
    box1_wages: 30_000,
    box2_fed_withheld: 3_000,
    box3_ss_wages: 30_000,
    box4_ss_withheld: 1_860,
    box5_medicare_wages: 30_000,
    box6_medicare_withheld: 435,
  },
];
const business = {
  business_reference: "statutory-business",
  proprietor_recipient: "T",
  line_a_principal_business: "SALES",
  line_b_business_code: "454390",
  line_c_business_name: "STAT BUSINESS",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_i_made_1099_payments: false,
  statutory_employee: true,
  line_1_gross_receipts: 75_000,
  qbi_no_other_adjustments_confirmed: true,
};
const inputs = { ...base.inputs, general, w2: copies, schedule_c: [business] };
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function run(changed: Record<string, unknown> = {}) {
  return execute(
    buildExecutionPlan(registry),
    registry,
    { ...inputs, ...changed },
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("two statutory W-2 copies carry exact box 1 wages through Schedule C and final exports", async () => {
  const result = run();
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.schedule_c?.statutory_w2_sources as unknown[])?.length,
    2,
  );
  assertEquals(result.pending.f1040?.line1a_wages, undefined);
  assertEquals(result.pending.f1040?.line8_additional_income, 75_000);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<TotalGrossReceiptsAmt>75000</TotalGrossReceiptsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalIncomeAmt>75000</TotalAdditionalIncomeAmt>",
  );
  const validated = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validated.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const checked = await validated.output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  const pdf = await buildPdfBytes(pending, base.filer);
  const textReader = new Deno.Command("pdftotext", {
    args: ["-layout", "-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const pdfWriter = textReader.stdin.getWriter();
  await pdfWriter.write(pdf);
  await pdfWriter.close();
  const extracted = await textReader.output();
  assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
  const pdfText = new TextDecoder().decode(extracted.stdout);
  assertStringIncludes(pdfText, "STAT BUSINESS");
  assertStringIncludes(pdfText, "75000");
});

Deno.test("statutory W-2 business link and exact per-copy replay reject omissions and tampering", async () => {
  for (
    const changed of [
      {
        w2: [
          { ...copies[0], schedule_c_business_reference: undefined },
          copies[1],
        ],
      },
      {
        w2: [
          { ...copies[0], schedule_c_business_reference: "wrong-business" },
          copies[1],
        ],
      },
      { w2: [copies[0], copies[0]] },
    ]
  ) {
    const result = run(changed);
    assertEquals(result.diagnostics.length > 0, true);
  }
  const result = run();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const sourceRows = (pending.schedule_c as Record<string, unknown>)
    .statutory_w2_sources as Array<Record<string, unknown>>;
  const changed = {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      statutory_w2_sources: [
        { ...sourceRows[0], amount: 44_999 },
        sourceRows[1],
      ],
    },
  };
  assertThrows(
    () => buildMefXml(changed, base.filer),
    Error,
    "Schedule C statutory W-2 sources differ",
  );
  await assertRejects(
    () => buildPdfBytes(changed, base.filer),
    Error,
    "Schedule C statutory W-2 sources differ",
  );
  const changedWages = {
    ...pending,
    f1040: { ...pending.f1040, line1a_wages: 1 },
  };
  assertThrows(() => buildMefXml(changedWages, base.filer));
  await assertRejects(() => buildPdfBytes(changedWages, base.filer));
  const wrongOwner = {
    ...pending,
    w2: {
      ...pending.w2,
      w2s: [
        { ...pending.w2!.w2s![0], employee_ssn: "999887777" },
        pending.w2!.w2s![1],
      ],
    },
    schedule_c: {
      ...pending.schedule_c,
      statutory_w2_sources: [
        { ...sourceRows[0], employee_ssn: "999887777" },
        sourceRows[1],
      ],
    },
  };
  assertThrows(() => buildMefXml(wrongOwner, base.filer));
  await assertRejects(() => buildPdfBytes(wrongOwner, base.filer));
});
