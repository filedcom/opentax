import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { registry } from "./registry.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertSchedule2Line17HSources } from "./schedule2-w2-source-reconciliation.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  digital_assets: false,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

function filing() {
  return execute(buildExecutionPlan(registry), registry, {
    general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 50_000,
      box2_fed_withheld: 5_000,
    }],
    f1099m: [{
      payer_name: "Deferred Compensation Payer",
      payer_tin: "123456789",
      recipient_tin: "111223333",
      source_document_reference: "issued 2025 1099-MISC",
      box3_other_income: 1_000,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Section 409A deferred compensation",
      box15_nqdc: 1_000,
      box15_409a_review: {
        included_in_box3: true,
        interest_amount: 7,
        interest_workpaper_reference: "reviewed section 409A interest",
      },
    }],
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("1099-MISC box 15 taxes reviewed box 3 income once through 1040, native and PDF", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_nqdc, undefined);
  assertEquals(result.pending.f1040?.line8_additional_income, 1_000);
  assertEquals(result.pending.schedule2?.line17h_nqdc_tax, 207);
  assertEquals(result.pending.f1040?.line23_other_taxes, 207);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(native.xml, "Section 409A deferred compensation");
  assertStringIncludes(
    native.xml,
    "<IncmNonqlfyDefrdCompPlanAmt>207</IncmNonqlfyDefrdCompPlanAmt>",
  );
  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", native);
  const extracted = new Deno.Command("pdftotext", {
    args: ["-", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = extracted.stdin.getWriter();
  await writer.write(pdf);
  await writer.close();
  const text = new TextDecoder().decode((await extracted.output()).stdout);
  assertStringIncludes(text, "Section 409A deferred compensation");
});

Deno.test("409A direct Schedule 1 deposit or changed interest rejects in both exports", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const changes = [{
    ...pending,
    schedule1: { ...pending.schedule1!, line8z_nqdc: 1_000 },
  }, {
    ...pending,
    schedule2: { ...pending.schedule2!, line17h_nqdc_tax: 200 },
  }, {
    ...pending,
    f1099m: {
      f1099ms: [{
        ...(pending as unknown as {
          f1099m: { f1099ms: Array<Record<string, unknown>> };
        }).f1099m
          .f1099ms[0],
        box15_409a_review: {
          included_in_box3: true,
          interest_amount: 8,
          interest_workpaper_reference: "reviewed section 409A interest",
        },
      }],
    },
  }];
  for (const changed of changes) {
    await assertRejects(() =>
      buildMefBundle(changed, { filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(changed, filer));
  }
});

async function assertTy2025Xsd(xml: string): Promise<void> {
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
}

function external409aFiling(form: "w2" | "1099nec") {
  const external = form === "w2"
    ? {
      w2: [{
        employer_ein: "12-3456789",
        employer_name: "Example Employer",
        employer_address_line1: "10 Work St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        employee_ssn: "111-22-3333",
        source_document_reference: "issued 2025 W-2 copy A",
        box1_wages: 51_000,
        box2_fed_withheld: 5_000,
      }],
    }
    : {
      f1099nec: [{
        payer_name: "Example Contractor",
        payer_tin: "12-3456789",
        recipient_ssn: "111-22-3333",
        source_document_reference: "issued 2025 1099-NEC copy A",
        box1_nec: 1_500,
        for_routing: "schedule_1_line_8j",
        nonbusiness_activity_description: "Reviewed deferred compensation",
      }],
    };
  const misc = {
    payer_name: "Deferred Compensation Payer",
    payer_tin: "987654321",
    recipient_tin: "111223333",
    source_document_reference: "issued 2025 1099-MISC copy A",
    box15_nqdc: 1_000,
    box15_409a_review: {
      income_source_form: form,
      income_source_document_reference: form === "w2"
        ? "issued 2025 W-2 copy A"
        : "issued 2025 1099-NEC copy A",
      income_source_payer_tin: "123456789",
      income_source_recipient_tin: "111223333",
      income_inclusion_workpaper_reference: "reviewed 2025 income inclusion",
      interest_amount: 7,
      interest_workpaper_reference: "reviewed 2025 section 409A interest",
    },
  };
  return execute(buildExecutionPlan(registry), registry, {
    general,
    ...external,
    f1099m: [misc],
  }, { taxYear: 2025, formType: "f1040" });
}

for (const form of ["w2", "1099nec"] as const) {
  Deno.test(`1099-MISC box 15 uses identified ${form} income once in native and PDF`, async () => {
    const result = external409aFiling(form);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule2?.line17h_nqdc_tax, 207);
    assertEquals(result.pending.f1040?.line23_other_taxes, 207);
    assertEquals(
      result.pending.f1040?.line8_additional_income,
      form === "w2" ? undefined : 1_500,
    );
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(general);
    const native = await buildMefBundle(pending, { filer, attachments: [] });
    await assertTy2025Xsd(native.xml);
    assertStringIncludes(
      native.xml,
      "<IncmNonqlfyDefrdCompPlanAmt>207</IncmNonqlfyDefrdCompPlanAmt>",
    );
    const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", native);
    assert(pdf.length > 0);
    const extracted = new Deno.Command("pdftotext", {
      args: ["-", "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = extracted.stdin.getWriter();
    await writer.write(pdf);
    await writer.close();
    const text = new TextDecoder().decode((await extracted.output()).stdout);
    assertStringIncludes(text, "207");
  });

  Deno.test(`1099-MISC box 15 ${form} source and review drift rejects both exports`, async () => {
    const result = external409aFiling(form);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(general);
    for (
      const changed of [
        { income_source_document_reference: "different issued copy" },
        { income_source_payer_tin: "999999999" },
        { income_source_recipient_tin: "999887777" },
        { income_inclusion_workpaper_reference: "" },
      ]
    ) {
      const altered = structuredClone(pending);
      const misc = (altered as unknown as {
        f1099m: {
          f1099ms: Array<{ box15_409a_review: Record<string, unknown> }>;
        };
      }).f1099m.f1099ms[0];
      misc.box15_409a_review = { ...misc.box15_409a_review, ...changed };
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer));
    }
    const overCap = structuredClone(pending);
    const source = form === "w2"
      ? (overCap as unknown as { w2: { w2s: Array<{ box1_wages: number }> } })
        .w2.w2s[0]
      : (overCap as unknown as {
        f1099nec: { f1099necs: Array<{ box1_nec: number }> };
      }).f1099nec.f1099necs[0];
    if ("box1_wages" in source) {
      source.box1_wages = 999;
      (overCap.f1040 as Record<string, unknown>).line1a_wages = 999;
      (overCap.agi_aggregator as Record<string, unknown>).line1a_wages = 999;
    } else source.box1_nec = 999;
    await assertRejects(
      () => buildMefBundle(overCap, { filer, attachments: [] }),
      Error,
      "1099-MISC box 15 exceeds identified",
    );
    await assertRejects(
      () => buildPdfBytes(overCap, filer),
      Error,
      "1099-MISC box 15 exceeds identified",
    );
  });
}

Deno.test("1099-MISC box 15 cannot repeat a W-2 code Z tax base", async () => {
  const result = external409aFiling("w2");
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(general);
  const altered = structuredClone(pending);
  const w2 = (altered as unknown as {
    w2: {
      w2s: Array<{ box12_entries?: Array<{ code: string; amount: number }> }>;
    };
  }).w2.w2s[0];
  w2.box12_entries = [{ code: "Z", amount: 1_000 }];
  (altered as unknown as { schedule2: { section409a_excise: number } })
    .schedule2
    .section409a_excise = 1_000;
  await assertRejects(
    () => buildMefBundle(altered, { filer, attachments: [] }),
    Error,
    "cannot repeat a W-2 code Z",
  );
  await assertRejects(
    () => buildPdfBytes(altered, filer),
    Error,
    "cannot repeat a W-2 code Z",
  );
});

Deno.test("two 1099-MISC box 15 rows cannot exceed the same 1099-NEC inclusion", () => {
  const result = external409aFiling("1099nec");
  assertEquals(result.diagnostics, []);
  const pending = structuredClone(buildPending(result.pending));
  const misc = (pending as unknown as {
    f1099m: { f1099ms: Array<{ source_document_reference: string }> };
  }).f1099m.f1099ms;
  misc.push({
    ...misc[0],
    source_document_reference: "issued 2025 1099-MISC copy B",
  });
  (pending as unknown as { schedule2: { line17h_nqdc_tax: number } })
    .schedule2.line17h_nqdc_tax = 414;
  let failed = false;
  try {
    assertSchedule2Line17HSources(pending, extractFilerIdentity(general));
  } catch (error) {
    failed = true;
    assertStringIncludes(
      String(error),
      "exceeds identified W-2 or 1099-NEC income",
    );
  }
  assert(failed);
});
