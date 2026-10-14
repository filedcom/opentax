import { qualifiedRothSource } from "./form4852_qualified_roth.fixture.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { createHash } from "node:crypto";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { FormType } from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import {
  form4852BaseInputs,
  form4852Filer,
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
  substitute,
} from "./form4852_filing.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { assertForm4852RetainedEvidence } from "./form4852_retained_evidence.ts";
import { FilingStatus } from "../../../../../mef/header.ts";

const root = ".state/research/form4852-ira-margin";
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const w2 = {
  employer_name: "Other Payroll Employer",
  employer_ein: "223456789",
  employer_address_line1: "3 Source Way",
  employer_address_city: "Sacramento",
  employer_address_state: "CA",
  employer_address_zip: "95814",
  employee_ssn: "111223333",
  source_document_reference: "2025-issued-other-employer-W2",
  box1_wages: 75000,
  box2_fed_withheld: 11000,
  box3_ss_wages: 75000,
  box4_ss_withheld: 4650,
  box5_medicare_wages: 75000,
  box6_medicare_withheld: 1087.5,
};
Deno.test("actual retained account classifications and printable IRA/SEP/SIMPLE margins bind multiple source copies and owners to whole returns", async () => {
  const template = await officialForm4852EvidenceTemplate("f4852");
  const make = (
    n: number,
    kind: string,
    gross: number,
    facts: Record<string, unknown> = {},
  ) =>
    substitute(FormType.R_1099, n, {
      retirement_account_type: kind,
      gross_distribution: gross,
      taxable_amount: gross,
      distribution_code: "7",
      is_ira: kind !== "non_ira",
      ...facts,
    });
  const cases = [
    {
      id: "single-traditional-sep-pension",
      joint: false,
      items: [
        make(1301, "traditional_ira", 10000),
        make(1302, "sep_ira", 2000),
        make(1303, "non_ira", 6000),
      ],
      gross: 12000,
      taxable: 93000,
      total: 11915,
      refund: 0,
    },
    {
      id: "joint-traditional-sep-simple-rothsimple-pension",
      joint: true,
      items: [
        make(1304, "traditional_ira", 10000),
        make(1305, "sep_ira", 2000),
        make(1306, "simple_ira", 4000, {
          distribution_code: "S",
          subject_ts: "S",
          recipient_ssn: "444556666",
        }),
        make(1307, "roth_simple_ira", 5000, {
          qualified_roth_review: qualifiedRothSource(1307, "roth_simple_ira"),
          distribution_code: "Q",
          taxable_amount: 0,
        }),
        make(1308, "non_ira", 6000),
        make(1309, "roth_sep_ira", 5000, {
          qualified_roth_review: qualifiedRothSource(1309, "roth_sep_ira"),
          distribution_code: "Q",
          taxable_amount: 0,
          is_ira: false,
        }),
      ],
      gross: 26000,
      taxable: 97000,
      total: 8386,
      refund: 2614,
    },
  ];
  await Deno.mkdir(root, { recursive: true });
  const manifest = [];
  for (const row of cases) {
    const base = form4852BaseInputs(row.joint);
    base.general.taxpayer_dob = "1964-06-15";
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
    const retained = await retainedForm4852Sources(row.items, filer, template);
    const inputs = {
      ...base,
      w2: [w2],
      f4852: row.items,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], row.id);
    const p = normalizeAllPending(result.pending);
    console.log(row.id, p.f1040);
    assertEquals(p.f1040.line4a_ira_gross, row.gross);
    assertEquals(p.f1040.line4b_ira_taxable, row.joint ? 16000 : 12000);
    assertEquals(p.f1040.line5a_pension_gross, 6000);
    assertEquals(p.f1040.line11_agi, row.taxable);
    assertEquals(p.f1040.line24_total_tax, row.total);
    if (row.refund) assertEquals(p.f1040.line35a_refund, row.refund);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      filer,
      [],
      retained.documents,
    );
    assertEquals(prepared.bundle.attachments, []);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      row.items.length,
    );
    const path = `${root}/${row.id}`;
    await Deno.mkdir(path, { recursive: true });
    await Deno.writeTextFile(`${path}/return.xml`, prepared.bundle.xml);
    const x = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, `${path}/return.xml`],
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    await Deno.writeFile(`${path}/return.pdf`, pdf);
    await Deno.writeTextFile(
      `${path}/source.json`,
      JSON.stringify({ inputs, filer }, null, 2),
    );
    await Deno.writeTextFile(
      `${path}/pending.json`,
      JSON.stringify(prepared.bundle.pending, null, 2),
    );
    const docs: { reference: string; file: string; sha256: string }[] = [];
    for (const d of retained.documents) {
      const name = `retained-${docs.length}.${
        d.bytes[0] === 37 ? "pdf" : "json"
      }`;
      await Deno.writeFile(`${path}/${name}`, d.bytes);
      docs.push({
        reference: d.document_reference,
        file: name,
        sha256: createHash("sha256").update(d.bytes).digest("hex"),
      });
    }
    manifest.push({
      id: row.id,
      pages: (await PDFDocument.load(pdf)).getPageCount(),
      origins,
      pdf_sha256: createHash("sha256").update(pdf).digest("hex"),
      documents: docs,
    });
    const changed = structuredClone(prepared.bundle.pending) as any;
    changed.f4852.f4852s[0].distribution_source.account_type = "sep_ira";
    await assertRejects(() =>
      f1040_2025.prepareReturn(changed, filer, [], retained.documents)
    );
    await assertRejects(() =>
      buildPdfBytes(changed, filer, ".pdf-cache", {
        ...prepared.bundle,
        pending: changed,
      })
    );
    const missing = structuredClone(prepared.bundle.pending) as any;
    delete missing.f4852.f4852s[0].distribution_source.account_type;
    await assertRejects(() =>
      f1040_2025.prepareReturn(missing, filer, [], retained.documents)
    );
    if (row.joint) {
      const qIndex = row.items.findIndex((i) => i.distribution_code === "Q");
      for (
        const mutation of [
          "missing-qualification",
          "first-year",
          "owner",
          "date",
          "birth",
          "traditional-simple",
        ]
      ) {
        const bad = structuredClone(inputs) as any;
        const q = bad.f4852[qIndex];
        if (mutation === "missing-qualification") {
          delete q.qualified_roth_review;
        }
        if (mutation === "first-year") {
          q.qualified_roth_review.first_contribution.designated_tax_year = 2024;
        }
        if (mutation === "owner") {
          q.qualified_roth_review.registration.owner_ssn = "444556666";
        }
        if (mutation === "date") {
          q.qualified_roth_review.eligibility.date_of_birth = "1964-02-30";
        }
        if (mutation === "birth") {
          q.qualified_roth_review.eligibility.date_of_birth = "1985-06-15";
        }
        if (mutation === "traditional-simple") {
          q.distribution_source.account_type = "simple_ira";
        }
        assertEquals(
          f1040_2025.executeReturn(bad).diagnostics.length > 0,
          true,
          mutation,
        );
        const altered = structuredClone(prepared.bundle.pending) as any;
        altered.f4852.f4852s[qIndex] = q;
        await assertRejects(() =>
          f1040_2025.prepareReturn(altered, filer, [], retained.documents)
        );
        await assertRejects(() =>
          buildPdfBytes(altered, filer, ".pdf-cache", {
            ...prepared.bundle,
            pending: altered,
          })
        );
      }
      const altered = structuredClone(prepared.bundle.pending) as any;
      const q = altered.f4852.f4852s[qIndex];
      const reference =
        q.qualified_roth_review.first_form5498.source_document_reference;
      const documents = retained.documents.map((d) => ({
        ...d,
        bytes: d.bytes.slice(),
      }));
      const d = documents.find((d) => d.document_reference === reference)!;
      const facts = JSON.parse(new TextDecoder().decode(d.bytes));
      facts.box10_regular_roth_contributions += 1;
      d.bytes = new TextEncoder().encode(JSON.stringify(facts));
      const digest = createHash("sha256").update(d.bytes).digest("hex");
      altered.f4852.reviewed_source.records[qIndex].treatment_documents.find((
        d: any,
      ) => d.document_reference === reference).sha256 = digest;
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer, [], documents),
        Error,
        "parsed source facts",
      );
      await assertRejects(
        () =>
          buildPdfBytes(
            altered,
            filer,
            ".pdf-cache",
            {
              ...prepared.bundle,
              pending: altered,
              retainedSourceDocuments: documents,
            } as any,
          ),
        Error,
        "parsed source facts",
      );
    }
    for (
      const mutation of [
        "hidden",
        "wrong-appearance",
        "missing",
        "moved",
        "optional-content",
        "appearance-subtype",
        "rotation",
      ]
    ) {
      const docs = retained.documents.map((d) => ({
        ...d,
        bytes: d.bytes.slice(),
      }));
      const pending = structuredClone(prepared.bundle.pending) as any;
      const record = pending.f4852.reviewed_source.records[0];
      const d = docs.find((d) =>
        d.document_reference === record.completed_form.document_reference
      )!;
      const source = await PDFDocument.load(d.bytes);
      const annots = source.getPage(0).node.Annots()!;
      const annotation = source.context.lookup(
        annots.get(annots.size() - 1),
      ) as PDFDict;
      if (mutation === "hidden") {
        annotation.set(PDFName.of("F"), PDFNumber.of(2));
      }
      if (mutation === "wrong-appearance") {
        annotation.set(
          PDFName.of("AP"),
          source.context.obj({
            N: source.context.register(
              source.context.flateStream("q Q", { BBox: [0, 0, 29, 12] }),
            ),
          }),
        );
      }
      if (mutation === "optional-content") {
        annotation.set(
          PDFName.of("OC"),
          source.context.obj({
            Type: "OCG",
            Name: PDFString.of("Hidden qualification label"),
          }),
        );
      }
      if (mutation === "rotation") {
        annotation.set(PDFName.of("Rotate"), PDFNumber.of(90));
      }
      if (mutation === "appearance-subtype") {
        const ap = annotation.lookup(PDFName.of("AP")) as PDFDict;
        const appearance = ap.lookup(PDFName.of("N")) as any;
        appearance.dict.set(PDFName.of("Subtype"), PDFName.of("Image"));
      }
      if (mutation === "missing") annots.remove(annots.size() - 1);
      if (mutation === "moved") {
        annotation.set(PDFName.of("Rect"), source.context.obj([0, 0, 29, 12]));
      }
      d.bytes = new Uint8Array(await source.save());
      record.completed_form.sha256 = createHash("sha256").update(d.bytes)
        .digest("hex");
      await assertRejects(
        () => assertForm4852RetainedEvidence(pending, filer, docs),
        Error,
        "Retained Form4852 IRA",
        mutation,
      );
      await assertRejects(() =>
        f1040_2025.prepareReturn(pending, filer, [], docs)
      );
      await assertRejects(() =>
        buildPdfBytes(
          pending,
          filer,
          ".pdf-cache",
          {
            ...prepared.bundle,
            pending,
            retainedSourceDocuments: docs,
          } as any,
        )
      );
    }
  }
  await Deno.writeTextFile(
    `${root}/held-manifest.json`,
    JSON.stringify(manifest, null, 2),
  );
});

Deno.test("inherited CodeQ substitutes bind original-owner death and five-year sources without changing living owner's SIMPLE penalty eligibility", async () => {
  const item = substitute(FormType.R_1099, 1310, {
    gross_distribution: 5000,
    taxable_amount: 0,
    distribution_code: "Q",
    is_ira: true,
    retirement_account_type: "roth_simple_ira",
    qualified_roth_review: qualifiedRothSource(1310, "roth_simple_ira", true),
  });
  const retained = await retainedForm4852Sources(
    [item],
    form4852Filer,
    await officialForm4852EvidenceTemplate("f4852"),
  );
  const inputs = {
    ...form4852BaseInputs(),
    w2: [w2],
    f4852: [item],
    f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
  };
  const actual = f1040_2025.executeReturn(inputs);
  assertEquals(actual.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    actual.pending,
    form4852Filer,
    [],
    retained.documents,
  );
  assertEquals(
    normalizeAllPending(actual.pending).f1040.line4a_ira_gross,
    5000,
  );
  assertEquals(
    normalizeAllPending(actual.pending).f1040.line4b_ira_taxable ?? 0,
    0,
  );
  for (
    const mutation of [
      "later-death",
      "living-original-owner",
      "wrong-decedent",
      "late-first-contribution",
    ]
  ) {
    const bad = structuredClone(inputs) as any;
    const r = bad.f4852[0].qualified_roth_review;
    if (mutation === "later-death") r.eligibility.died_on = "2026-01-01";
    if (mutation === "living-original-owner") {
      r.registration.original_owner_ssn = "111223333";
    }
    if (mutation === "wrong-decedent") {
      r.eligibility.original_owner_ssn = "888990000";
    }
    if (mutation === "late-first-contribution") {
      r.first_contribution.designated_tax_year = 2024;
    }
    assertEquals(
      f1040_2025.executeReturn(bad).diagnostics.length > 0,
      true,
      mutation,
    );
    const pending = structuredClone(prepared.bundle.pending) as any;
    pending.f4852.f4852s[0] = bad.f4852[0];
    await assertRejects(() =>
      f1040_2025.prepareReturn(pending, form4852Filer, [], retained.documents)
    );
    await assertRejects(() =>
      buildPdfBytes(pending, form4852Filer, ".pdf-cache", {
        ...prepared.bundle,
        pending,
      })
    );
  }
});
