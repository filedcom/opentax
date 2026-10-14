import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../2025/index.ts";
import { normalizeAllPending } from "../../../../2025/return-processing/pending.ts";
import {
  buildPdfBytes,
  type PdfPageOrigin,
} from "../../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { inputSchema as fecSchema } from "../../../../nodes/inputs/income/foreign/fec/index.ts";
import { categorySummarySchema } from "../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { appendAlternativeCompensationStatement } from "../../../../2025/pdf/forms/credits/foreign/f1116/f1116_alternative_compensation_statement.ts";

// IRS 2025 Tax Computation Worksheet, single 250,525–626,350:
// 284,250 * 35% - 30,452.75 = 69,034.75, rounded to 69,035.
// https://www.irs.gov/publications/p1040
export async function verifyEmployerPacket(
  raw: Parameters<typeof normalizeAllPending>[0],
  employerCount: number,
) {
  const pending = normalizeAllPending(raw);
  const fec = fecSchema.parse(pending.fec);
  assertEquals(fec.fecs.length, employerCount);
  assertEquals(pending.f1040.line1h_other_earned, 300000);
  assertEquals(pending.f1040.line11_agi, 300000);
  assertEquals(pending.f1040.line15_taxable_income, 284250);
  assertEquals(pending.f1040.line16_income_tax, 69035);
  assertEquals(pending.schedule3.line1_foreign_tax_credit, 2000);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 2000);
  assertEquals(pending.f1040.line24_total_tax, 67035);
  assertEquals(pending.f1040.line37_amount_owed, 67035);
  const filer = extractFilerIdentity(pending.f1040);
  const prepared = await f1040_2025.prepareReturn(raw, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<AltBasisCompensationSourceStmt documentId=",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<ForeignCountryCd>GM</ForeignCountryCd>",
  );
  assertEquals(prepared.bundle.attachments.length, 1);
  assertEquals(
    (await PDFDocument.load(prepared.bundle.attachments[0].bytes))
      .getPageCount(),
    1,
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  assertEquals(origins.filter((p) => p.formKey === "form_1116").length, 3);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 7);
  const textPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(textPath, pdf);
    const result = await new Deno.Command("pdftotext", {
      args: ["-f", "6", "-l", "6", textPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    const printed = new TextDecoder().decode(result.stdout).replace(
      /\s+/g,
      " ",
    );
    for (
      const expected of [
        "Alternative compensation allocation",
        "Consulting salary",
        "Client project locations",
        "foreign source $140,000.00",
        "foreign source $120,000.00",
        "2025 employee workday ledger",
        employerCount === 1
          ? "U.S. source $160,000.00"
          : "U.S. source $60,000.00",
        employerCount === 1
          ? "U.S. source $180,000.00"
          : "U.S. source $80,000.00",
      ]
    ) assertStringIncludes(printed, expected);
  } finally {
    await Deno.remove(textPath);
  }
  const root = Deno.env.get("OPENTAX_FORM1116_EMPLOYER_PROOF_DIR");
  if (root) {
    await Deno.mkdir(root, { recursive: true });
    const id = `${employerCount}-employers`;
    await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${root}/${id}.json`,
      JSON.stringify(
        {
          pending,
          filer,
          origins,
          employerCount,
          attachments: prepared.bundle.attachments.map((
            { bytes: _bytes, ...meta },
          ) => meta),
        },
        null,
        2,
      ),
    );
    await Deno.writeFile(
      `${root}/${id}-conversion.pdf`,
      prepared.bundle.attachments[0].bytes,
    );
  }
  for (
    const altered of [
      { ...pending, fec: undefined },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line1h_other_earned: 300001,
        },
      },
      {
        ...pending,
        schedule3: { ...pending.schedule3, line1_foreign_tax_credit: 2001 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 2001 },
      },
    ]
  ) {
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer), Error);
    await assertRejects(() => buildPdfBytes(altered, filer), Error);
  }
  const first = fec.fecs[0];
  const alternative = first.alternative_compensation_sourcing;
  const currency = first.foreign_tax_currency;
  assert(alternative && alternative.ordinary_time_basis && currency);
  for (
    const changed of [
      { ...first, compensation_owner_ssn: "999887777" },
      {
        ...first,
        compensation_source_document_reference: "Unmatched employer record",
      },
      { ...first, compensation_usd: first.compensation_usd + 1 },
      { ...first, foreign_service_compensation_usd: 139999 },
      {
        ...first,
        alternative_compensation_sourcing: {
          ...alternative,
          ordinary_time_basis: {
            ...alternative.ordinary_time_basis,
            foreign_service_days:
              alternative.ordinary_time_basis.foreign_service_days + 1,
          },
        },
      },
      {
        ...first,
        foreign_tax_currency: { ...currency, usd_per_foreign_unit: 1.26 },
      },
    ]
  ) {
    const altered = {
      ...pending,
      fec: { fecs: [changed, ...fec.fecs.slice(1)] },
    };
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer), Error);
    await assertRejects(() => buildPdfBytes(altered, filer), Error);
  }
  if (employerCount === 1) {
    const longAlternative = {
      ...alternative,
      ordinary_time_basis: {
        ...alternative.ordinary_time_basis,
        workday_ledger_document_reference: "WORKDAY-".repeat(1000) +
          "END-REFERENCE",
      },
    };
    const fields = {
      ...pending.form_1116,
      category_summaries: categorySummarySchema.array().parse(
        pending.form_1116.category_summaries,
      ).map((summary) => ({
        ...summary,
        items: summary.items.map((item) => ({
          ...item,
          alternative_compensation_sourcing: longAlternative,
        })),
      })),
    };
    const all = {
      ...pending,
      form_1116: fields,
      fec: {
        fecs: [{
          ...first,
          alternative_compensation_sourcing: longAlternative,
        }],
      },
    };
    const document = await PDFDocument.create();
    await assertRejects(
      () =>
        Promise.resolve(
          appendAlternativeCompensationStatement(
            document,
            fields,
            undefined,
            all,
          ),
        ),
      Error,
      "needs taxpayer name and SSN",
    );
    await appendAlternativeCompensationStatement(document, fields, filer, all);
    assert(document.getPageCount() > 1);
    const bytes = await document.save();
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, bytes);
      const result = await new Deno.Command("pdftotext", {
        args: [path, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0);
      const printed = new TextDecoder().decode(result.stdout);
      assertStringIncludes(printed.replace(/\s/g, ""), "END-REFERENCE");
      assertEquals(
        printed.match(/Alternative compensation allocation/g)?.length,
        document.getPageCount(),
      );
      assertEquals(
        printed.match(/111223333/g)?.length,
        document.getPageCount(),
      );
    } finally {
      await Deno.remove(path);
    }
    if (root) await Deno.writeFile(`${root}/statement-overflow.pdf`, bytes);
  }
}
