import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  inputSchema,
  verifyGroupedDistributionSources,
} from "../../../../../nodes/inputs/income/retirement/f8915f/index.ts";
import { groupedDistributionXml } from "../../../../mef/forms/income/retirement/f8915f_groups.ts";
import { TS } from "../../../../../nodes/types.ts";
import { distributionPackets } from "./form8915f_inventory.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM8915F_INVENTORY_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const entry of distributionPackets) {
  Deno.test(`Form 8915-F owned inventory complete return: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending), e = entry.expected;
    assertEquals(pending.f1040.line4a_ira_gross ?? 0, e.iraGross);
    assertEquals(pending.f1040.line4b_ira_taxable ?? 0, e.iraTaxable);
    assertEquals(pending.f1040.line5a_pension_gross ?? 0, e.planGross);
    assertEquals(pending.f1040.line5b_pension_taxable ?? 0, e.planTaxable);
    assertEquals(
      pending.f1040.line11_agi,
      150000 + e.iraTaxable + e.planTaxable,
    );
    assertEquals(
      pending.f1040.line15_taxable_income,
      150000 + e.iraTaxable + e.planTaxable - (entry.joint ? 31500 : 15750),
    );
    assertEquals(Math.round(Number(pending.f1040.line24_total_tax)), e.tax);
    assertEquals(pending.f1040.line25a_w2_withheld, 25000);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const groups = verifyGroupedDistributionSources(
      entry.inputs.f8915f,
      pending.f1099r,
      filer,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const xml = prepared.bundle.xml;
    const forms = [...xml.matchAll(/<IRS8915F\b[^>]*>([\s\S]*?)<\/IRS8915F>/g)]
      .map((m) => m[1]);
    assertEquals(forms.length, groups.length);
    assertEquals(
      xml.match(/<IRS1099R documentId=/g)?.length,
      entry.inputs.f1099r.length,
    );
    for (const [index, g] of groups.entries()) {
      assertStringIncludes(forms[index], `<SSN>${g.first.recipient_ssn}</SSN>`);
      assertStringIncludes(
        forms[index],
        `<QualifiedDistributionsAmt>${g.lines.line6_total_qualified}</QualifiedDistributionsAmt>`,
      );
      for (const item of g.items) {
        assertStringIncludes(
          forms[index],
          `<DistributionDt>${item.distribution_date}</DistributionDt>`,
        );
      }
      assertEquals(
        (forms[index].match(/<OptOutSpreadThreeYrsInd>X/g) ?? []).length,
        g.first.full_inclusion_elected
          ? Number(g.lines.line8_plan_qualified > 0) +
            Number(g.lines.line20_ira_qualified > 0)
          : 0,
      );
    }
    assertEquals(prepared.bundle.attachments.length, e.worksheets ?? 0);
    for (const attachment of prepared.bundle.attachments) {
      assertStringIncludes(xml, attachment.fileName);
      const id =
        /<BinaryAttachment\b[^>]*documentId="([^"]+)"[^>]*>[\s\S]*?<AttachmentLocationTxt>/
          .exec(xml)?.[1];
      assertExists(id);
      assertStringIncludes(
        xml,
        `referenceDocumentId="${id}" referenceDocumentName="BinaryAttachment"`,
      );
    }
    if (e.worksheets) {
      assertThrows(
        () =>
          groupedDistributionXml(pending.f8915f, {
            filer,
            pending,
            phase: "final",
            documentIdsByAttachmentFileName: {},
          }),
        Error,
        "worksheet",
      );
      const missingAttachment = {
        ...structuredClone(prepared.bundle),
        attachments: prepared.bundle.attachments.slice(1),
      };
      await assertRejects(
        () =>
          buildPdfBytes(
            missingAttachment.pending,
            filer,
            ".pdf-cache",
            missingAttachment,
          ),
        Error,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((p) => p.formKey === "f8915f").length,
      4 * groups.length + (e.extraPages ?? 0),
    );
    const mutate1040 = structuredClone(pending);
    mutate1040.f1040.line5b_pension_taxable = e.planTaxable + 1;
    const missingForm = structuredClone(pending);
    delete missingForm.f8915f;
    const omittedSource = structuredClone(pending);
    omittedSource.f1099r = { f1099rs: entry.inputs.f1099r.slice(1) };
    const wrongRecipient = structuredClone(pending);
    wrongRecipient.f1099r = {
      f1099rs: entry.inputs.f1099r.map((r, i) =>
        i === 0 ? { ...r, recipient_ssn: "999887777" } : r
      ),
    };
    const changedAmount = structuredClone(pending);
    changedAmount.f8915f = {
      f8915fs: entry.inputs.f8915f.map((r, i) =>
        i === 0
          ? {
            ...r,
            gross_distribution: r.gross_distribution + 1,
            taxable_distribution: r.taxable_distribution + 1,
          }
          : r
      ),
    };
    const changedElection = structuredClone(pending);
    changedElection.f8915f = {
      f8915fs: entry.inputs.f8915f.map((r) => ({
        ...r,
        full_inclusion_elected: !r.full_inclusion_elected,
      })),
    };
    const changedDate = structuredClone(pending);
    changedDate.f8915f = {
      f8915fs: entry.inputs.f8915f.map((r, i) =>
        i === 0 ? { ...r, distribution_date: "2025-08-15" } : r
      ),
    };
    const mutations = [
      mutate1040,
      missingForm,
      omittedSource,
      wrongRecipient,
      changedAmount,
      changedElection,
      changedDate,
    ];
    for (const mutation of mutations) {
      await assertRejects(
        () => f1040_2025.prepareReturn(mutation, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutation, filer), Error);
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, xml);
      for (const attachment of prepared.bundle.attachments) {
        await Deno.writeFile(
          `${root}/${entry.id}-${attachment.fileName}`,
          attachment.bytes,
        );
      }
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs: entry.inputs,
            pending,
            filer,
            origins,
            groups,
            expected: e,
            rejectedNative: mutations.length,
            rejectedFreshPdf: mutations.length,
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
  });
}

type Inputs = (typeof distributionPackets)[number]["inputs"];
const publicMutations: Array<[string, (i: Inputs) => void]> = [
  ["combined owner limit", (i) => {
    i.f8915f[0].gross_distribution = 12003;
    i.f8915f[0].taxable_distribution = 12003;
  }],
  ["conflicting election", (i) => {
    i.f8915f[0].full_inclusion_elected = true;
  }],
  ["different disaster", (i) => {
    i.f8915f[0].fema_number = "DR-4872-TX";
  }],
  ["duplicate source reference", (i) => {
    i.f8915f[0].source_1099r_document_reference =
      i.f8915f[1].source_1099r_document_reference;
  }],
  ["duplicate account", (i) => {
    i.f8915f[0].source_1099r_account_number =
      i.f8915f[1].source_1099r_account_number;
  }],
  ["wrong qualified recipient", (i) => {
    i.f8915f[0].recipient_ssn = "999887777";
  }],
  ["wrong issued recipient", (i) => {
    i.f1099r[0].recipient_ssn = "999887777";
  }],
  ["omitted qualified source", (i) => {
    i.f1099r.shift();
  }],
  ["omitted qualified record", (i) => {
    i.f8915f.splice(0, 2);
  }],
  ["inconsistent source amount", (i) => {
    i.f1099r[0].box1_gross_distribution++;
  }],
  ["missing IRA basis history", (i) => {
    i.f8915f[2].no_ira_basis_review_reference = undefined;
  }],
  ["unreviewed ordinary source", (i) => {
    i.f1099r.push({
      ...i.f1099r[0],
      source_document_reference: "ordinary",
      account_number: "ordinary",
      form8915f_treatment: undefined,
    });
  }],
  ["missing issued reference", (i) => {
    i.f1099r[0].source_document_reference = undefined;
  }],
  ["ambiguous issued reference", (i) => {
    i.f1099r[0].source_document_reference =
      i.f1099r[1].source_document_reference;
  }],
  ["source election mismatch", (i) => {
    i.f1099r[0].form8915f_treatment = "full";
  }],
  ["source repayment mismatch", (i) => {
    i.f1099r[0].form8915f_repayment_amount = 1;
  }],
  ["source distribution date mismatch", (i) => {
    i.f1099r[0].box13_date_of_payment = "2025-08-01";
  }],
  ["spouse on single return", (i) => {
    i.f8915f.forEach((r) => {
      r.owner = "S";
      r.recipient_ssn = "987654321";
    });
    i.f1099r.forEach((r) => {
      r.ts = TS.S;
      r.recipient_ssn = "987654321";
    });
  }],
];
for (const [name, mutate] of publicMutations) {
  Deno.test(`Form 8915-F inventory rejects ${name}`, () => {
    const inputs = structuredClone(distributionPackets[2].inputs);
    mutate(inputs);
    assertThrows(() => f1040_2025.executeReturn(inputs));
  });
}
Deno.test("Form 8915-F grouped calculation is independent of issued-source order", () => {
  const entry = distributionPackets[7];
  const original = f1040_2025.executeReturn(entry.inputs);
  const reversed = f1040_2025.executeReturn({
    ...entry.inputs,
    f8915f: [...entry.inputs.f8915f].reverse(),
    f1099r: [...entry.inputs.f1099r].reverse(),
  });
  assertEquals(reversed.pending.f1040, original.pending.f1040);
});
Deno.test("Form 8915-F repayments reject duplicate transactions and inconsistent filing dates", () => {
  const items = structuredClone(distributionPackets[7].inputs.f8915f);
  const first = items[0].repayment, second = items[1].repayment;
  if (first.kind !== "timely" || second.kind !== "timely") {
    throw new Error("fixture repayments missing");
  }
  second.repayment_record_reference = first.repayment_record_reference;
  assertThrows(() => inputSchema.parse({ f8915fs: items }));
  second.repayment_record_reference = "different transaction";
  second.return_filing_date = "2026-04-09";
  assertThrows(() => inputSchema.parse({ f8915fs: items }));
});

Deno.test("Form 8915-F ordinary inventories reject duplicate account copies", () => {
  const inputs = structuredClone(distributionPackets[9].inputs);
  inputs.f1099r[3].account_number = inputs.f1099r[2].account_number;
  assertThrows(
    () => f1040_2025.executeReturn(inputs),
    Error,
    "distinct issued",
  );
});
Deno.test("Form 8915-F joint repayments require one return filing date", () => {
  const inputs = structuredClone(distributionPackets[7].inputs);
  const spouse = inputs.f8915f[3].repayment;
  if (spouse.kind !== "timely") throw new Error("fixture repayment missing");
  spouse.return_filing_date = "2026-04-09";
  assertThrows(
    () => f1040_2025.executeReturn(inputs),
    Error,
    "filing/deadline",
  );
});
