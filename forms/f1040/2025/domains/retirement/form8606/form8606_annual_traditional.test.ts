import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import {
  annualTraditionalCases,
  annualTraditionalReturnSource,
} from "./form8606_annual_traditional.fixture.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { form8606Pdf } from "../../../pdf/forms/retirement/f8606.ts";
import { PDFDocument } from "pdf-lib";
const root = ".state/research/annual-traditional-source-box2a-corrected";
// Independently worked annual lines: ratio is rounded to at least three decimals before
// multiplying each line7/8. Traditional taxable = line15c + line18; Roth source
// ordering independently supplies remaining earnings/recapture, never gross twice.
const expected = [
  {
    gross: 23000,
    taxable: 11662,
    incomeTax: 21866,
    other: 1083,
    total: 22949,
    withheld: 3100,
    ratio: .167,
    conversionBasis: 1670,
    withdrawalBasis: 668,
    remaining: 2662,
  },
  {
    gross: 24500,
    taxable: 13066,
    incomeTax: 22203,
    other: 1214,
    total: 23417,
    withheld: 4200,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2566,
  },
  {
    gross: 43500,
    taxable: 22568,
    incomeTax: 15363,
    other: 2312,
    total: 17675,
    withheld: 7200,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2566,
  },
  {
    gross: 19500,
    taxable: 8505,
    incomeTax: 21108,
    other: 0,
    total: 21108,
    withheld: 4100,
    ratio: .190,
    conversionBasis: 950,
    withdrawalBasis: 1045,
    remaining: 1005,
  },
  {
    gross: 15500,
    taxable: 13066,
    incomeTax: 22203,
    other: 464,
    total: 22667,
    withheld: 1100,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2566,
  },
  {
    gross: 24501,
    taxable: 13067,
    incomeTax: 22203,
    other: 1214,
    total: 23417,
    withheld: 4200.5,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2567,
  },
  {
    gross: 10500,
    taxable: 9499,
    incomeTax: 21347,
    other: 950,
    total: 22297,
    withheld: 3100,
    ratio: .0007,
    conversionBasis: 1,
    withdrawalBasis: 0,
    remaining: 0,
  },
  {
    gross: 24501,
    taxable: 13067,
    incomeTax: 22203,
    other: 1214,
    total: 23417,
    withheld: 4200.5,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2567,
  },
  {
    gross: 24500,
    taxable: 13066,
    incomeTax: 22203,
    other: 1114,
    total: 23317,
    withheld: 4200,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2566,
  },
  {
    gross: 24500,
    taxable: 13066,
    incomeTax: 30090,
    other: 1114,
    total: 31204,
    withheld: 4200,
    ratio: .157,
    conversionBasis: 1570,
    withdrawalBasis: 864,
    remaining: 2566,
  },
];
Deno.test("actual annual traditional paid contributions/distributions plus conversion derive complete owner PartsI/II/III and1040", async () => {
  await Deno.mkdir(root, { recursive: true });
  for (const [n, row] of annualTraditionalCases.entries()) {
    const source = await annualTraditionalReturnSource(row, 1001 + n),
      r = f1040_2025.executeReturn(source.inputs),
      p = normalizeAllPending(r.pending),
      e = expected[n];
    assertEquals(r.diagnostics, [], row.id);
    assertEquals(p.f1040.line4a_ira_gross, e.gross);
    assertEquals(p.f1040.line4b_ira_taxable, e.taxable);
    assertEquals(p.f1040.line16_income_tax, e.incomeTax);
    assertEquals(p.f1040.line23_other_taxes ?? 0, e.other);
    assertEquals(p.f1040.line24_total_tax, e.total);
    assertEquals(p.f1040.line25b_withheld_1099, e.withheld);
    if (n === 9) {
      assertEquals(p.f1040.line11_agi, 170930);
      // Income tax:1192.50+4386+12072.50+51830*.24=30090.20 ->30090.
      // Actual Roth MAGI = 170930 minus conversion taxable 8430 = 162500.
      // Worksheet2-2: full limit7000 * remaining2500/15000 -> rounded1170;
      // lesser of1170 and7000 minus traditional2000 permits actual Roth1000.
      assertEquals(
        source.reviews[0].contributions.filter((c) =>
          c.form5498.tax_year === 2025
        ).reduce((sum, c) => sum + c.form5498.box10_roth_contributions, 0),
        1000,
      );
    }
    const fields = (p.form8606 as any).owner_forms;
    assertEquals(fields.length, n === 2 ? 2 : 1);
    assertEquals(
      fields[0].print_line1_nondeductible,
      n === 6 ? 1 : n === 5 || n === 7 ? 2001 : 2000,
    );
    assertEquals(
      fields[0].print_line4_post_year_contributions,
      n === 6 ? 0 : 1000,
    );
    assertEquals(fields[0].print_line10_basis_ratio, e.ratio);
    assertEquals(
      fields[0].print_line11_nontaxable_conversion,
      e.conversionBasis,
    );
    assertEquals(
      fields[0].print_line12_nontaxable_distribution,
      e.withdrawalBasis,
    );
    assertEquals(fields[0].print_line14_remaining_basis, e.remaining);
    if (n === 7) {
      assertEquals(
        source.reviews[0].current_conversion!.inventory.traditional_accounts
          .length,
        2,
      );
      assertEquals(
        source.reviews[0].current_conversion!.annual_traditional_activity!
          .contributions.length,
        2,
      );
      assertEquals(
        source.reviews[0].current_conversion!.annual_traditional_activity!
          .withdrawals[1].issued_form1099r.payer_ein,
        "665432110",
      );
    }
    if (n === 2) {
      assertEquals(fields[1].print_line10_basis_ratio, .095);
      assertEquals(fields[1].print_line11_nontaxable_conversion, 475);
      assertEquals(fields[1].print_line12_nontaxable_distribution, 523);
      assertEquals(fields[1].print_line14_remaining_basis, 1002);
      assertEquals(fields[1].print_line15c_taxable, 4977);
      assertEquals(fields[1].print_line18_taxable_conversion, 4525);
    }
    const prepared = await f1040_2025.prepareReturn(
      r.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(prepared.bundle.attachments, []);
    for (const review of source.reviews) {
      for (
        const t of review.current_conversion!.accounts.flatMap((a) =>
          a.transfers
        )
      ) {
        const i = t.issued_form1099r;
        if (i.source_kind !== "completed_form4852") {
          assertEquals(i.box2a_taxable_amount, t.receipt.amount);
        }
      }
    }
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8606 /g) ?? []).length,
      fields.length,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        `<NondedIRACurrTYNondedContriAmt>${
          n === 6 ? 1 : n === 5 || n === 7 ? 2001 : 2000
        }</NondedIRACurrTYNondedContriAmt>`,
      ),
      true,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        `<NondedIRAPostTaxYrContriAmt>${
          n === 6 ? 0 : 1000
        }</NondedIRAPostTaxYrContriAmt>`,
      ),
      true,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        `<NondedIRATaxableAmt>${
          fields[0].print_line15c_taxable
        }</NondedIRATaxableAmt>`,
      ),
      true,
    );
    if (n === 4) {
      assertEquals(
        prepared.bundle.xml.includes("TotNonQlfyDistriFromRothIRAAmt"),
        false,
      );
    }
    await Deno.writeTextFile(`${root}/${row.id}.xml`, prepared.bundle.xml);
    const schema = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/${row.id}.xml`,
      ],
    }).output();
    assertEquals(schema.code, 0, new TextDecoder().decode(schema.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      source.filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    await Deno.writeFile(`${root}/${row.id}.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/${row.id}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${row.id}.source.json`,
      JSON.stringify(
        { inputs: source.inputs, filer: source.filer, pending: p },
        null,
        2,
      ),
    );
    await Deno.mkdir(`${root}/${row.id}-retained`, { recursive: true });
    const docs = [];
    for (const [j, d] of source.retained.documents.entries()) {
      const path = `${row.id}-retained/document-${j + 1}.bin`;
      await Deno.writeFile(`${root}/${path}`, d.bytes);
      docs.push({
        document_reference: d.document_reference,
        path,
        sha256: createHash("sha256").update(d.bytes).digest("hex"),
      });
    }
    await Deno.writeTextFile(
      `${root}/${row.id}.documents.json`,
      JSON.stringify(docs, null, 2),
    );
    console.log(
      `${row.id}: ${
        (await PDFDocument.load(pdf)).getPageCount()
      } pages, ${docs.length} actual retained records`,
    );
    for (
      const [mutationIndex, mutation] of [
        (v: any) => v.f1040.line4b_ira_taxable++,
        (v: any) => v.f1040.line25b_withheld_1099++,
        (v: any) =>
          v.form8606.owner_forms[0].print_line4_post_year_contributions++,
        (v: any) => v.form8606.owner_forms[0].print_line15c_taxable++,
        (v: any) =>
          v.f1099r.f1099rs.find((i: any) => i.box7_ira_simple_indicator)
            .box4_federal_withheld++,
        (v: any) => v.w2.w2s[0].employee_ssn = "999887777",
      ].entries()
    ) {
      const bad = structuredClone(p);
      mutation(bad);
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          bad,
          source.filer,
          [],
          source.retained.documents,
        )
      );
      await assertRejects(() =>
        buildPdfBytes(bad, source.filer, ".pdf-cache", prepared.bundle)
      );
      if (mutationIndex !== 1) {
        assertThrows(() =>
          form8606Pdf.instances!(bad.form8606, source.filer, bad)
        );
      }
    }
  }
});
Deno.test("annual traditional source declarations paid receipts and owner/lineage/retained bytes reject conflicts", async () => {
  const source = await annualTraditionalReturnSource(
    annualTraditionalCases[1],
    1101,
  );
  for (
    const mutate of [
      (r: any) =>
        r.current_conversion.annual_traditional_activity.contributions[0]
          .receipts[0].amount++,
      (r: any) =>
        r.current_conversion.annual_traditional_activity.contributions[0]
          .receipts[1].received_on = "2026-02-30",
      (r: any) =>
        r.current_conversion.annual_traditional_activity.contributions[0]
          .form5498.owner_ssn = "999887777",
      (r: any) =>
        r.current_conversion.annual_traditional_activity.withdrawals[0]
          .disposition.cash_paid_to_owner++,
      (r: any) =>
        r.current_conversion.annual_traditional_activity.withdrawals[1]
          .issued_form1099r.distribution_reference =
            r.current_conversion.annual_traditional_activity.withdrawals[0]
              .issued_form1099r.distribution_reference,
      (r: any) =>
        r.current_conversion.accounts[0].transfers[0].unconverted_disposition
          .cash_paid_to_owner++,
      (r: any) =>
        r.current_conversion.inventory.no_current_traditional_contributions =
          true,
    ]
  ) {
    const inputs = structuredClone(source.inputs) as any;
    for (const i of inputs.f1099r) mutate(i.roth_owner_inventory_review);
    for (const i of inputs.f4852) {
      mutate(i.retirement_source.roth_owner_inventory_review);
    }
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics.some((d) => d.severity === "error"), true);
  }
  const r = f1040_2025.executeReturn(source.inputs),
    p = normalizeAllPending(r.pending);
  const receipt =
    source.reviews[0].current_conversion!.annual_traditional_activity!
      .contributions[0].receipts[0];
  const docs = source.retained.documents.map((d) => ({
    ...d,
    bytes: new Uint8Array(d.bytes),
  }));
  const changed = docs.find((d) =>
    d.document_reference === receipt.source_document_reference
  )!;
  changed.bytes = new TextEncoder().encode(
    JSON.stringify({ ...receipt, amount: receipt.amount + 1 }),
  );
  const hash = createHash("sha256").update(changed.bytes).digest("hex");
  for (
    const binding of [
      (p.f4852 as any).reviewed_source,
      ...(p.f4852_reviewed_source
        ? [(p.f4852_reviewed_source as any).reviewed_source]
        : []),
    ]
  ) {
    for (const record of binding.records) {
      for (const d of record.treatment_documents) {
        if (d.document_reference === receipt.source_document_reference) {
          d.sha256 = hash;
        }
      }
    }
  }
  await assertRejects(
    () => f1040_2025.prepareReturn(p, source.filer, [], docs),
    Error,
    "parsed source facts",
  );
});

Deno.test("annual actual concurrent Roth regular contribution rejects excessive sourced MAGI", async () => {
  const source = await annualTraditionalReturnSource(
    annualTraditionalCases[8],
    1201,
  );
  const inputs = structuredClone(source.inputs);
  Object.assign(inputs.w2[0], {
    box1_wages: 180000,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.2,
    box5_medicare_wages: 180000,
    box6_medicare_withheld: 2610,
  });
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const p = normalizeAllPending(result.pending);
  assertEquals(p.f1040.line11_agi, 193066);
  await assertRejects(
    () =>
      f1040_2025.prepareReturn(
        result.pending,
        source.filer,
        [],
        source.retained.documents,
      ),
    Error,
    "actual MAGI/combined-contribution eligibility",
  );
  assertThrows(
    () => form8606Pdf.instances!(p.form8606, source.filer, p),
    Error,
    "actual MAGI/combined-contribution eligibility",
  );
});
