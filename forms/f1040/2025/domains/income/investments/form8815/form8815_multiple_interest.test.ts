import { assertEquals, assertRejects } from "@std/assert";
import { createHash } from "node:crypto";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((row) =>
  row.id === "single-form8815-series-ee-bond-exclusion"
)!;
function sources(joint = false): any {
  const input: any = structuredClone(base.inputs);
  if (joint) {
    Object.assign(input.general, {
      filing_status: "mfj",
      spouse_first_name: "Morgan",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1981-04-10",
    });
  }
  const wages = joint ? 160000 : 100000;
  Object.assign(input.w2[0], {
    box1_wages: wages,
    box3_ss_wages: wages,
    box4_ss_withheld: wages * .062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * .0145,
  });
  const recipient = "111223333";
  input.f1099int = [
    {
      payer_name: "Treasury Savings Bonds",
      recipient_tin: recipient,
      account_number: "EE-001",
      source_document_reference: "redeemed-ee-copy",
      box3: 1200,
    },
    {
      payer_name: "Treasury Savings Bonds",
      recipient_tin: recipient,
      account_number: "I-002",
      source_document_reference: "redeemed-i-copy",
      box3: 800,
    },
    {
      payer_name: "Example Bank",
      recipient_tin: joint ? "222334444" : recipient,
      account_number: "BANK-003",
      source_document_reference: "bank-interest-copy",
      box1: 300,
    },
    {
      payer_name: "Treasury Marketable Notes",
      recipient_tin: recipient,
      account_number: "NOTE-004",
      source_document_reference: "noneligible-treasury-copy",
      box3: 500,
    },
  ];
  Object.assign(input.form8815, {
    filing_status: joint ? "mfj" : "single",
    bond_interest_source_references: ["redeemed-ee-copy", "redeemed-i-copy"],
    line2_qualified_education_expenses: 8000,
    line3_nontaxable_education_benefits: 2000,
    line6_worksheet: {
      paper_ee_face_value: 12000,
      electronic_ee_and_i_face_value: 4000,
      interest_reported_in_prior_years: 0,
    },
    line9_worksheet: {
      ...input.form8815.line9_worksheet,
      schedule_b_line2_interest: 2800,
      other_1040_and_schedule1_income: wages,
    },
  });
  return input;
}
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
for (const joint of [false, true]) {
  Deno.test(`Form8815 ${joint ? "joint" : "single"} distinct redeemed bonds and bank/noneligible Treasury interest reach full native/PDF packet`, async () => {
    const inputs = sources(joint);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    // Independent 2025 form math: net expenses6000/proceeds12000=.500;
    // eligible interest2000 gives tentative1000, despite all-interest2800.
    const exclusion = joint ? 548 : 780;
    assertEquals(pending.form8815.line6, 2000);
    assertEquals(pending.form8815.line7, .5);
    assertEquals(pending.form8815.line8, 1000);
    assertEquals(pending.form8815.line9, joint ? 162800 : 102800);
    assertEquals(pending.form8815.line12, joint ? .452 : .220);
    assertEquals(pending.form8815.line14, exclusion);
    assertEquals(pending.schedule_b.print_line2_total, 2800);
    assertEquals(pending.schedule_b.ee_bond_exclusion, exclusion);
    assertEquals(pending.f1040.line2b_taxable_interest, 2800 - exclusion);
    assertEquals(
      pending.f1040.line11_agi,
      (joint ? 160000 : 100000) + 2800 - exclusion,
    );
    const filer = extractFilerIdentity(pending.f1040)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const root = `.state/research/form8815-multiple-interest-oct6/${
      joint ? "joint" : "single"
    }`;
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeTextFile(
      `${root}/source-pending.json`,
      JSON.stringify({ inputs, filer, pending }, null, 2),
    );
    await Deno.writeTextFile(`${root}/return.xml`, prepared.bundle.xml);
    const xsd = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${root}/return.xml`,
      ],
    }).output();
    assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(origins.map((p) => p.formKey), [
      "f1040",
      "f1040",
      "schedule_b",
      "form8815",
    ]);
    await Deno.writeFile(`${root}/return.pdf`, pdf);
    await Deno.writeTextFile(
      `${root}/origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/manifest.json`,
      JSON.stringify(
        {
          constructed: true,
          pages: origins.length,
          pdf_sha256: hash(pdf),
          xml_sha256: hash(new TextEncoder().encode(prepared.bundle.xml)),
          eligible_references: inputs.form8815.bond_interest_source_references,
          exclusion,
        },
        null,
        2,
      ),
    );
  });
}
Deno.test("Form8815 multiple interest references reject unmatched, duplicate, owner and adjustment conflicts in full export", async () => {
  const changes: ((input: any) => void)[] = [
    (x) => delete x.form8815.bond_interest_source_references,
    (x) => x.form8815.bond_interest_source_references.push("redeemed-ee-copy"),
    (x) =>
      x.form8815.bond_interest_source_references[1] = "missing-issued-copy",
    (x) => x.form8815.bond_interest_source_references[1] = "bank-interest-copy",
    (x) =>
      x.form8815.bond_interest_source_references[1] =
        "noneligible-treasury-copy",
    (x) => x.f1099int[0].box3 = 1100,
    (x) => x.f1099int[2].source_document_reference = "redeemed-ee-copy",
    (x) => x.f1099int[2].recipient_tin = "999887777",
    (x) => delete x.f1099int[2].recipient_tin,
    (x) => x.f1099int[3].box12 = 100,
  ];
  for (const change of changes) {
    const inputs = sources();
    change(inputs);
    const result = f1040_2025.executeReturn(inputs);
    if (result.diagnostics.length) continue;
    const filer = extractFilerIdentity(result.pending.f1040)!;
    await assertRejects(() => f1040_2025.prepareReturn(result.pending, filer));
  }
});
