import { assertEquals, assertStringIncludes } from "@std/assert";
import { createHash } from "node:crypto";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";
import { PficRegime } from "../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { FormType } from "../../../../nodes/inputs/income/wages/f4852/index.ts";
import { annualRecharacterizationSource } from "../wages/form4852/form4852_recharacterization.fixture.ts";
import {
  form4852BaseInputs,
  form4852Filer,
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
  substitute,
} from "../wages/form4852/form4852_filing.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
function copy(document_id: string, content: string) {
  const bytes = new TextEncoder().encode(content);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
}
Deno.test("Reviewed IRA recharacterization and multiple PFIC MTM dispositions reconcile in one full-XSD packet", async () => {
  const sale = (
    id: string,
    value: number,
    basis: number,
    inclusions: number,
  ) => ({
    transaction_id: id,
    disposition_date: id === "sale-gain" ? "2025-06-01" : "2025-10-01",
    shares_disposed: 10,
    fair_market_value_usd: value,
    adjusted_basis_usd: basis,
    unreversed_inclusions_usd: inclusions,
    broker_record_id: `${id}-broker`,
    basis_record_id: `${id}-basis`,
    broker_record: copy(`${id}-broker`, `${id} broker proceeds ${value}`),
    basis_record: copy(`${id}-basis`, `${id} adjusted basis ${basis}`),
  });
  const review = annualRecharacterizationSource(
    1451,
    "111223333",
    7000,
    -1000.50,
  );
  const item = substitute(FormType.R_1099, 1451, {
    retirement_account_type: "traditional_ira",
    recipient_ssn: "111223333",
    subject_ts: "T",
    gross_distribution: 5999.50,
    taxable_amount: 0,
    distribution_code: "N",
    is_ira: false,
    retirement_source: {
      payer_name: "Reviewed Retirement Custodian",
      payer_ein: "123456790",
      box1_gross_distribution: 5999.50,
      box2a_taxable_amount: 0,
      box7_distribution_code: "N",
      box7_ira_simple_indicator: false,
      ts: "T",
      ira_recharacterization_review: review,
    },
  });
  const retained = await retainedForm4852Sources(
    [item],
    form4852Filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const inputs = {
    ...form4852BaseInputs(),
    w2: [{
      employer_name: "Primary Owned Wage Employer",
      employer_ein: "223456789",
      employer_address_line1: "3 Source Way",
      employer_address_city: "Sacramento",
      employer_address_state: "CA",
      employer_address_zip: "95814",
      employee_ssn: "111223333",
      ts: "T",
      source_document_reference: "2025-primary-issued-W2",
      box1_wages: 75000,
      box2_fed_withheld: 11000,
      box3_ss_wages: 75000,
      box4_ss_withheld: 4650,
      box5_medicare_wages: 75000,
      box6_medicare_withheld: 1087.50,
    }],
    f4852: [item],
    f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    f8621: [{
      company_name: "MTM Source Fund",
      company_ein_or_ref: "MTM001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.MTM,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      mtm_adjusted_basis_at_year_end: 20000,
      mtm_unreversed_inclusions: 0,
      mtm_dispositions: [
        sale("sale-gain", 2400, 2000, 0),
        sale("sale-loss", 1800, 2000, 300),
      ],
      parent_source: {
        corporation_address: {
          line1: "1 Market Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "mtm_new_2025",
        no_outstanding_section1294_election: true,
        issuer_record: copy(
          "mtm-issuer",
          "Issuer 2025 holdings and exchange listing",
        ),
        mtm_year_end_value_record: {
          ...copy("mtm-quote", "Market quoted value 20000 at 2025 year end"),
          quoted_value_usd: 20000,
          market_name: "Recognized Exchange",
        },
        mtm_adjusted_basis_record: {
          ...copy("mtm-basis", "Adjusted stock basis 20000 and no inclusions"),
          adjusted_basis_usd: 20000,
          unreversed_inclusions_usd: 0,
        },
      },
    }],
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line4a_ira_gross, 5999.50);
  assertEquals(pending.f1040.line4b_ira_taxable, 0);
  assertEquals(pending.schedule1.line8z_form8621_mtm, 200);
  assertEquals(pending.f1040.line11_agi, 75200);
  assertEquals(pending.f1040.line24_total_tax, 7999);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    form4852Filer,
    [],
    retained.documents,
  );
  assertStringIncludes(prepared.bundle.xml, "<IRARecharacterizationStmt");
  assertStringIncludes(prepared.bundle.xml, "<GainOrLossMrktToMrktElectStmt");
  const out = ".state/research/ira-pfic-statement-order";
  await Deno.mkdir(out, { recursive: true });
  const xmlFile = `${out}/return.xml`;
  await Deno.writeTextFile(xmlFile, prepared.bundle.xml);
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      xmlFile,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    form4852Filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify(
      { inputs, filer: form4852Filer, pending: prepared.bundle.pending },
      null,
      2,
    ),
  );
  await Deno.mkdir(`${out}/retained`, { recursive: true });
  for (const d of retained.documents) {
    await Deno.writeFile(`${out}/retained/${d.document_reference}`, d.bytes);
  }
  await Deno.writeTextFile(
    `${out}/documents.json`,
    JSON.stringify(
      retained.documents.map((d) => ({
        reference: d.document_reference,
        sha256: createHash("sha256").update(d.bytes).digest("hex"),
      })),
      null,
      2,
    ),
  );
});
