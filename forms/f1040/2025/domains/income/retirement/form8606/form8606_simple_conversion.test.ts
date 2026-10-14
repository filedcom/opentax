import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { reviewedRothOwnerInventory } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/roth-inventory.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { reconcileForm8606RothInventories } from "./form8606_roth_inventory_reconciliation.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { simpleConversionReturnSource } from "./form8606_simple_conversion.fixture.ts";
const root = ".state/research/simple-roth-clock-oct6";
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
Deno.test("actual distinct SIMPLE employer first deposit and annual regular IRA sources reach current Form8606, 1040, native and retained Form4852 PDF", async () => {
  await Deno.mkdir(root, { recursive: true });
  const source = await simpleConversionReturnSource(1667);
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const f = (pending.form8606 as any).owner_forms[0];
  assertEquals(
    source.reviews[0].current_conversion!.annual_traditional_activity!
      .contributions[0].form5498.box1_ira_contributions,
    2000,
  );
  assertEquals(
    source.reviews[0].current_conversion!.inventory.traditional_accounts.length,
    2,
  );
  assertEquals(f.print_line7_distributions, 5500);
  assertEquals(f.print_line8_conversions, 12000);
  assertEquals(f.print_line9_combined_value, 27500);
  assertEquals(f.print_line10_basis_ratio, .145);
  assertEquals(f.print_line11_nontaxable_conversion, 1740);
  assertEquals(f.print_line12_nontaxable_distribution, 798);
  assertEquals(f.print_line14_remaining_basis, 2462);
  assertEquals(f.print_line18_taxable_conversion, 10260);
  assertEquals(pending.f1040.line4a_ira_gross, 17500);
  assertEquals(pending.f1040.line4b_ira_taxable, 14962);
  assertEquals(pending.f1040.line23_other_taxes, 470);
  assertEquals(pending.f1040.line24_total_tax, 23128);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    source.filer,
    [],
    source.retained.documents,
  );
  assertEquals((prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length, 1);
  assertEquals(source.retained.reviewed_source.records.length, 2);
  assertEquals(
    prepared.bundle.xml.includes(
      "<TotalIRAConvertedToRothAmt>12000</TotalIRAConvertedToRothAmt>",
    ),
    true,
  );
  await Deno.writeTextFile(`${root}/simple-current.xml`, prepared.bundle.xml);
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${root}/simple-current.xml`,
    ],
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    source.filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  await Deno.writeFile(`${root}/simple-current.pdf`, pdf);
  await Deno.writeTextFile(
    `${root}/simple-current.origins.json`,
    JSON.stringify(origins, null, 2),
  );
  await Deno.writeTextFile(
    `${root}/simple-current.source-pending.json`,
    JSON.stringify(
      { inputs: source.inputs, filer: source.filer, pending },
      null,
      2,
    ),
  );
  await Deno.mkdir(`${root}/simple-current-retained`, { recursive: true });
  const docs = [];
  for (const [j, d] of source.retained.documents.entries()) {
    const path = `simple-current-retained/document-${j + 1}.bin`;
    await Deno.writeFile(`${root}/${path}`, d.bytes);
    docs.push({
      document_reference: d.document_reference,
      path,
      sha256: digest(d.bytes),
    });
  }
  await Deno.writeTextFile(
    `${root}/simple-current.documents.json`,
    JSON.stringify(docs, null, 2),
  );
  console.log(
    JSON.stringify({
      pages: (await PDFDocument.load(pdf)).getPageCount(),
      pdf_sha256: digest(pdf),
      retained_documents: docs.length,
    }),
  );
});
Deno.test("SIMPLE first-employer-deposit clock, owner, plan, account and substitute classification reject conflicts", async () => {
  const source = await simpleConversionReturnSource(1669);
  const origin = (r: any) => r.current_conversion.inventory.simple_origins[0];
  const issued = (r: any) =>
    r.current_conversion.accounts[0].transfers[1].issued_form1099r;
  for (
    const mutation of [
      (r: any) => {
        origin(r).employer_deposits[0].deposited_on = "2023-04-11";
      },
      (r: any) => {
        origin(r).employer_deposits[0].deposited_on = "2023-02-30";
      },
      (r: any) => {
        origin(r).employer_deposits[0].employer_ein = "999887777";
      },
      (r: any) => {
        origin(r).employer_deposits[0].plan_reference = "OTHER";
      },
      (r: any) => {
        origin(r).employer_deposits[0].owner_ssn = "999887777";
      },
      (r: any) => {
        origin(r).employer_deposits[0].account_number = "OTHER";
      },
      (r: any) => {
        origin(r).employer_deposits[1].deposited_on = "2025-04-09";
      },
      (r: any) => {
        issued(r).originating_account_type = undefined;
      },
      (r: any) => {
        issued(r).distributed_on = "2025-04-09";
      },
      (r: any) => {
        origin(r).account_opened_on = "2024-04-10";
      },
    ]
  ) {
    const changed = structuredClone(source.reviews[0]);
    mutation(changed);
    assertThrows(() => reviewedRothOwnerInventory(changed));
  }
  // An older, unrelated employer deposit cannot mature this plan's clock.
  const other = structuredClone(source.reviews[0]);
  origin(other).employer_deposits[0].deposited_on = "2023-04-11";
  const oldEmployer = structuredClone(origin(other));
  oldEmployer.source_document_reference = "other-employer-plan-inventory";
  oldEmployer.employer_ein = "123123123";
  oldEmployer.plan_reference = "OTHER-PLAN";
  oldEmployer.custodian_ein = "123123124";
  oldEmployer.account_number = "OTHER-SIMPLE";
  oldEmployer.plan_document = {
    ...oldEmployer.plan_document,
    source_document_reference: "other-employer-plan-document",
    employer_ein: oldEmployer.employer_ein,
    plan_reference: oldEmployer.plan_reference,
    custodian_ein: oldEmployer.custodian_ein,
    account_number: oldEmployer.account_number,
  };
  oldEmployer.employer_deposits = [{
    ...oldEmployer.employer_deposits[0],
    source_document_reference: "other-employer-old-deposit",
    employer_ein: oldEmployer.employer_ein,
    plan_reference: oldEmployer.plan_reference,
    custodian_ein: oldEmployer.custodian_ein,
    account_number: oldEmployer.account_number,
    deposited_on: "2022-04-10",
  }];
  other.current_conversion!.inventory.simple_origins!.push(oldEmployer);
  other.current_conversion!.inventory.traditional_accounts.push({
    custodian_ein: oldEmployer.custodian_ein,
    account_number: oldEmployer.account_number,
  });
  other.current_conversion!.year_end_statements.push({
    source_document_reference: "other-employer-year-end",
    owner_ssn: other.owner_identity.owner_ssn,
    custodian_ein: oldEmployer.custodian_ein,
    account_number: oldEmployer.account_number,
    as_of: "2025-12-31",
    fair_market_value: 0,
  });
  assertThrows(() => reviewedRothOwnerInventory(other));
  // The identical historical account under this employer does mature the
  // newer account's clock, without borrowing another employer's history.
  const sameEmployer = structuredClone(other);
  const older = sameEmployer.current_conversion!.inventory.simple_origins![1];
  older.employer_ein = origin(sameEmployer).employer_ein;
  older.plan_document.employer_ein = older.employer_ein;
  older.employer_deposits[0].employer_ein = older.employer_ein;
  const settled = reviewedRothOwnerInventory(sameEmployer);
  assertEquals(
    settled.review.current_conversion!.accounts[0].transfers[1].issued_form1099r
      .distributed_on,
    "2025-04-10",
  );
  const prepared = await f1040_2025.prepareReturn(
    f1040_2025.executeReturn(source.inputs).pending,
    source.filer,
    [],
    source.retained.documents,
  );
  assertEquals(
    prepared.bundle.xml.includes(
      "<TotalIRAConvertedToRothAmt>12000</TotalIRAConvertedToRothAmt>",
    ),
    true,
  );
  const bad = structuredClone(source.inputs) as any;
  bad.f4852[1].distribution_source.account_type = "traditional_ira";
  bad.f4852[1].retirement_source.roth_owner_inventory_review =
    source.reviews[0];
  const result = f1040_2025.executeReturn(bad);
  assertThrows(
    () =>
      reconcileForm8606RothInventories(
        normalizeAllPending(result.pending),
        source.filer,
      ),
    Error,
    "matching retained Form4852 account classification",
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    )
  );
  const tampered = source.retained.documents.map((d) => ({
    ...d,
    bytes: d.bytes.slice(),
  }));
  const deposit = tampered.find((d) =>
    d.document_reference ===
      source.reviews[0].current_conversion!.inventory.simple_origins![0]
        .employer_deposits[0].source_document_reference
  )!;
  const altered = JSON.parse(new TextDecoder().decode(deposit.bytes));
  altered.deposited_on = "2023-04-11";
  deposit.bytes = new TextEncoder().encode(JSON.stringify(altered));
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      f1040_2025.executeReturn(source.inputs).pending,
      source.filer,
      [],
      tampered,
    )
  );
});
