import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { FormType } from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import { annualRecharacterizationSource } from "./form4852_recharacterization.fixture.ts";
import {
  form4852BaseInputs,
  form4852Filer,
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
  substitute,
} from "./form4852_filing.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
const root = ".state/research/form4852-recharacterization";
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const wages = (spouse = false, amount = 75000) => ({
  employer_name: spouse
    ? "Spouse Owned Wage Employer"
    : "Primary Owned Wage Employer",
  employer_ein: spouse ? "553456789" : "223456789",
  employer_address_line1: "3 Source Way",
  employer_address_city: "Sacramento",
  employer_address_state: "CA",
  employer_address_zip: "95814",
  employee_ssn: spouse ? "444556666" : "111223333",
  ts: spouse ? "S" : "T",
  source_document_reference: spouse
    ? "2025-spouse-issued-W2"
    : "2025-primary-issued-W2",
  box1_wages: amount,
  box2_fed_withheld: spouse ? 4000 : amount > 100000 ? 40000 : 11000,
  box3_ss_wages: amount,
  box4_ss_withheld: Math.round(amount * .062 * 100) / 100,
  box5_medicare_wages: amount,
  box6_medicare_withheld: Math.round(amount * .0145 * 100) / 100,
});
Deno.test("2025 retained annual recharacterization records derive N gross, owner contribution limits and native/print statements across accounts and spouses", async () => {
  const cases = [
    {
      id: "single-loss-cents",
      joint: false,
      salary: 75000,
      reviews: [
        annualRecharacterizationSource(1401, "111223333", 7000, -1000.50),
      ],
      gross: 5999.50,
      total: 7955,
    },
    {
      id: "single-magi-phase-cents",
      joint: false,
      salary: 159290.50,
      reviews: [annualRecharacterizationSource(1402, "111223333", 2670, 12.49)],
      gross: 2682.49,
      total: 27297,
    },
    {
      id: "joint-both-owner-multiple-accounts",
      joint: true,
      salary: 75000,
      reviews: [
        annualRecharacterizationSource(1403, "111223333", 3000, 100),
        annualRecharacterizationSource(1404, "111223333", 4000, -.50),
        annualRecharacterizationSource(1405, "444556666", 3500, -200),
        annualRecharacterizationSource(1406, "444556666", 3500, 300.49),
      ],
      gross: 14199.99,
      total: 9546,
    },
  ];
  await Deno.mkdir(root, { recursive: true });
  const manifest = [];
  for (const row of cases) {
    for (
      const owner of new Set(
        row.reviews.map((r) => r.original_contribution.owner_ssn),
      )
    ) {
      const owned = row.reviews.filter((r) =>
        r.original_contribution.owner_ssn === owner
      );
      const inventory = {
        ...owned[0].annual_contribution_inventory,
        regular_contribution_receipts: owned.map((r) =>
          r.original_contribution
        ),
      };
      for (const r of owned) r.annual_contribution_inventory = inventory;
    }
    const items = row.reviews.map((r) => {
      const c = r.original_contribution,
        n = Number(c.account_number.split("-").at(-1));
      return substitute(FormType.R_1099, n, {
        retirement_account_type: "traditional_ira",
        recipient_ssn: c.owner_ssn,
        subject_ts: c.owner_ssn === "444556666" ? "S" : "T",
        gross_distribution: r.transfer.amount_transferred,
        taxable_amount: 0,
        distribution_code: "N",
        is_ira: false,
        retirement_source: {
          payer_name: "Reviewed Retirement Custodian",
          payer_ein: c.custodian_ein,
          box1_gross_distribution: r.transfer.amount_transferred,
          box2a_taxable_amount: 0,
          box7_distribution_code: "N",
          box7_ira_simple_indicator: false,
          ts: c.owner_ssn === "444556666" ? "S" : "T",
          ira_recharacterization_review: r,
        },
      });
    });
    const filer = row.joint
      ? {
        ...form4852Filer,
        filingStatus: FilingStatus.MarriedFilingJointly,
        spouse: {
          ssn: "444556666",
          firstName: "Sam",
          lastName: "Example",
          nameControl: "EXAM",
        },
      }
      : form4852Filer;
    const retained = await retainedForm4852Sources(
      items,
      filer,
      await officialForm4852EvidenceTemplate("f4852"),
    );
    const inputs = {
      ...form4852BaseInputs(row.joint),
      w2: [
        wages(false, row.salary),
        ...(row.joint ? [wages(true, 40000)] : []),
      ],
      f4852: items,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], row.id);
    const p = normalizeAllPending(result.pending);
    console.log(row.id, p.f1040);
    assertEquals(p.f1040.line4a_ira_gross, row.gross);
    assertEquals(p.f1040.line4b_ira_taxable, 0);
    assertEquals(p.f1040.line5a_pension_gross ?? 0, 0);
    assertEquals(p.f1040.line24_total_tax, row.total);
    assertEquals(p.form8606, undefined);
    assertEquals(p.form5329, undefined);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      filer,
      [],
      retained.documents,
    );
    assertEquals(prepared.bundle.attachments, []);
    assertEquals(
      (prepared.bundle.xml.match(/<IRARecharacterizationStmt /g) ?? []).length,
      items.length,
    );
    assertEquals(prepared.bundle.xml.includes("<IRASEPSIMPLEInd>"), false);
    const path = `${root}/${row.id}`;
    await Deno.mkdir(path, { recursive: true });
    await Deno.writeTextFile(`${path}/return.xml`, prepared.bundle.xml);
    const x = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, `${path}/return.xml`],
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    await Deno.writeFile(`${path}/return.pdf`, bytes);
    await Deno.writeTextFile(
      `${path}/source.json`,
      JSON.stringify({ inputs, filer }, null, 2),
    );
    await Deno.writeTextFile(
      `${path}/pending.json`,
      JSON.stringify(prepared.bundle.pending, null, 2),
    );
    const documents: { reference: string; file: string; sha256: string }[] = [];
    for (const d of retained.documents) {
      const file = `retained-${documents.length}.${
        d.bytes[0] === 37 ? "pdf" : "json"
      }`;
      await Deno.writeFile(`${path}/${file}`, d.bytes);
      documents.push({
        reference: d.document_reference,
        file,
        sha256: createHash("sha256").update(d.bytes).digest("hex"),
      });
    }
    manifest.push({
      id: row.id,
      pages: (await PDFDocument.load(bytes)).getPageCount(),
      origins,
      pdf_sha256: createHash("sha256").update(bytes).digest("hex"),
      documents,
    });
    for (
      const mutate of [
        (p: any) =>
          delete p.f1099r.substitute_f1099rs[0].ira_recharacterization_review,
        (p: any) =>
          p.f1099r.substitute_f1099rs[0].box7_ira_simple_indicator = true,
        (p: any) =>
          p.f1099r.substitute_f1099rs[0].ira_recharacterization_review
            .original_contribution.owner_ssn = "444556666",
        (p: any) => p.f1040.line4a_ira_gross -= 1,
        (p: any) => p.f1040.line4b_ira_taxable = 1,
      ]
    ) {
      const changed = structuredClone(prepared.bundle.pending) as any;
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, filer, [], retained.documents)
      );
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
        })
      );
    }
    if (row.id === "single-loss-cents") {
      const low = { ...inputs, w2: [wages(false, 30000)] };
      const graph = f1040_2025.executeReturn(low);
      assertEquals(graph.diagnostics, []);
      assertEquals(normalizeAllPending(graph.pending).f1040.line11_agi, 30000);
      await assertRejects(
        () =>
          f1040_2025.prepareReturn(
            graph.pending,
            filer,
            [],
            retained.documents,
          ),
        Error,
        "Form8880 source join",
      );
      await assertRejects(
        () =>
          buildPdfBytes(graph.pending, filer, ".pdf-cache", {
            ...prepared.bundle,
            pending: graph.pending,
          }),
        Error,
        "PDF source differs from the prepared MeF return",
      );
    }
    // Rehash both metadata bindings: this must reach the parsed actual source facts.
    const changed = structuredClone(prepared.bundle.pending) as any;
    const docs = retained.documents.map((d) => ({
      ...d,
      bytes: d.bytes.slice(),
    }));
    const reference = row.reviews[0].transfer.source_document_reference;
    const d = docs.find((d) => d.document_reference === reference)!;
    const facts = JSON.parse(new TextDecoder().decode(d.bytes));
    facts.custodian_calculated_related_earnings += 1;
    d.bytes = new TextEncoder().encode(JSON.stringify(facts));
    for (const rec of changed.f4852.reviewed_source.records) {
      for (const t of rec.treatment_documents) {
        if (t.document_reference === reference) {
          t.sha256 = createHash("sha256").update(d.bytes).digest("hex");
        }
      }
    }
    await assertRejects(
      () => f1040_2025.prepareReturn(changed, filer, [], docs),
      Error,
      "retirement treatment parsed source facts differ",
    );
    await assertRejects(() =>
      buildPdfBytes(changed, filer, ".pdf-cache", {
        ...prepared.bundle,
        pending: changed,
        retainedSourceDocuments: docs,
      })
    );
  }
  await Deno.writeTextFile(
    `${root}/held-manifest.json`,
    JSON.stringify(manifest, null, 2),
  );
});
