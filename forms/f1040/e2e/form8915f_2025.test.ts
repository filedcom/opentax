import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const plan = buildExecutionPlan(registry);
const disaster = {
  retirement_source_kind: "plan",
  owner: "T",
  recipient_ssn: "111223333",
  fema_number: "DR-4871-TX",
  disaster_begin_date: "2025-03-26",
  disaster_declaration_date: "2025-05-21",
  distribution_date: "2025-06-01",
  qualified_area_home_review_reference: "reviewed principal home in Texas",
  economic_loss_review_reference: "reviewed 2025 flood loss",
  eligible_retirement_source_review_reference:
    "reviewed eligible employer plan",
  no_prior_distributions_review_reference: "reviewed 2025 disaster ledger",
  no_repayments_review_reference: "reviewed retirement repayment ledger",
  source_1099r_document_reference: "issued 2025 1099-R account 123",
  source_1099r_payer_ein: "123456789",
  source_1099r_account_number: "123",
  gross_distribution: 20_000,
  taxable_distribution: 20_000,
  full_inclusion_elected: true,
};
const inputs = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
  },
  f1099r: [{
    payer_name: "Example Plan",
    payer_ein: "12-3456789",
    account_number: "123",
    source_document_reference: "issued 2025 1099-R account 123",
    ts: "T",
    box1_gross_distribution: 20_000,
    box2a_taxable_amount: 20_000,
    box7_distribution_code: "7",
    form8915f_treatment: "full",
    box13_date_of_payment: "2025-06-01",
  }],
  f8915f: [disaster],
};

Deno.test("reviewed 2025 Form 8915-F plan distribution reaches full native and PDF return", async () => {
  const result = execute(plan, registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 20_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 20_000);
  const filer = extractFilerIdentity(result.pending.f1040);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, filer);
  assertStringIncludes(xml, "<IRS8915F documentId=");
  assertStringIncludes(
    xml,
    "<CYTaxableDistributionsAmt>20000</CYTaxableDistributionsAmt>",
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 6, true);
  const changedSource = structuredClone(result.pending);
  const changed1099r = changedSource.f1099r as {
    f1099rs: Array<{ box2a_taxable_amount: number }>;
  };
  changed1099r.f1099rs[0].box2a_taxable_amount = 19_999;
  assertThrows(
    () => buildMefXml(buildPending(changedSource), filer),
    Error,
    "Form 8915-F",
  );
});

Deno.test("2025 Form 8915-F three-year election reports only the first-year pension share", async () => {
  const spreadInputs = {
    ...inputs,
    f1099r: [{ ...inputs.f1099r[0], form8915f_treatment: "three_years" }],
    f8915f: [{ ...disaster, full_inclusion_elected: false }],
  };
  const result = execute(plan, registry, spreadInputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 20_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 6_667);
  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(buildPending(result.pending), filer);
  assertStringIncludes(
    xml,
    "<CYQlfySelectedDistriAmt>6667</CYQlfySelectedDistriAmt>",
  );
  assertStringIncludes(
    xml,
    "<CYTaxableDistributionsAmt>6667</CYTaxableDistributionsAmt>",
  );
  assertEquals(xml.includes("<OptOutSpreadThreeYrsInd>"), false);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 6);
  const { f8915f: _missingForm, ...orphan } = result.pending;
  assertThrows(
    () => buildMefXml(buildPending(orphan), filer),
    Error,
    "needs one matching Form 8915-F",
  );
  await assertRejects(
    () => buildPdfBytes(orphan, filer),
    Error,
    "needs one matching Form 8915-F",
  );
});

for (
  const [fullInclusion, currentYearTaxable] of [
    [true, 20_000],
    [false, 6_667],
  ] as const
) {
  Deno.test(`2025 Form 8915-F traditional IRA ${fullInclusion ? "full" : "spread"} route reaches full return`, async () => {
    const iraInputs = {
      ...inputs,
      f1099r: [{
        ...inputs.f1099r[0],
        box7_ira_simple_indicator: true,
        form8915f_treatment: fullInclusion ? "full" : "three_years",
      }],
      f8915f: [{
        ...disaster,
        retirement_source_kind: "traditional_ira",
        eligible_retirement_source_review_reference:
          "reviewed traditional IRA account statement",
        no_ira_basis_review_reference:
          "reviewed traditional IRA nondeductible-basis history",
        full_inclusion_elected: fullInclusion,
      }],
    };
    const result = execute(plan, registry, iraInputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040?.line4a_ira_gross, 20_000);
    assertEquals(result.pending.f1040?.line4b_ira_taxable, currentYearTaxable);
    assertEquals(result.pending.f1040?.line5b_pension_taxable, undefined);
    const filer = extractFilerIdentity(result.pending.f1040);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertStringIncludes(xml, "<QlfyDistriTrdnSEPSIMPLERothGrp>");
    assertStringIncludes(
      xml,
      `<CYTaxableDistributionsAmt>${currentYearTaxable}</CYTaxableDistributionsAmt>`,
    );
    assertEquals(xml.includes("<QlfyDsstrDistriNotIRAPlansGrp>"), false);
    assertEquals(
      xml.includes("<OptOutSpreadThreeYrsInd>X</OptOutSpreadThreeYrsInd>"),
      fullInclusion,
    );
    const xsd = new URL(
      "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, xml);
      const validation = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, xmlPath],
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
    } finally {
      await Deno.remove(xmlPath);
    }
    const pdf = await buildPdfBytes(result.pending, filer);
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 6);
    if (!fullInclusion) {
      const changed = structuredClone(result.pending);
      (changed.f1040 as Record<string, unknown>).line4b_ira_taxable = 6_666;
      assertThrows(
        () => buildMefXml(buildPending(changed), filer),
        Error,
        "must match Form 1040 lines 4a and 4b",
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer),
        Error,
        "must match Form 1040 lines 4a and 4b",
      );
    }
  });
}
