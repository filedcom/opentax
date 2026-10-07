import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { normalizeAllPending } from "../pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";
import { tipHealthCfBeneficiaryReviewFixtures } from "./review-tip-health-cf-beneficiary.fixture.ts";
import metadata from "./review-tip-health-cf-beneficiary.metadata.json" with {
  type: "json",
};
import { assertReviewPageOrigins } from "../../../../scripts/ty2025-pdf-review-page-origins.ts";
const fixtures = tipHealthCfBeneficiaryReviewFixtures();
const roots: Record<string, string> = {
  "tip-health": "/tmp/opentax-qualified-tip-health-evidence",
  "mixed-cf-tip": "/tmp/opentax-mixed-cf-qualified-tip-evidence",
  "partial-beneficiary":
    "/tmp/opentax-form4972-beneficiary-multiple-partial-oct6/.state/research/2026-10-06-form4972-beneficiary-multiple-partial",
};
// Form titles independently observed on first pages of the frozen original PDFs.
const titles: Record<string, string> = {
  f1040: "U.S. Individual Income Tax Return",
  schedule1: "SCHEDULE 1",
  schedule1a: "SCHEDULE 1-A",
  schedule2: "SCHEDULE 2",
  schedule3: "SCHEDULE 3",
  schedule_c: "SCHEDULE C",
  schedule_f: "SCHEDULE F",
  schedule_se: "SCHEDULE SE",
  f3800: "General Business Credit",
  f5884: "Work Opportunity Credit",
  form6251: "Alternative Minimum Tax—Individuals",
  form7206: "Self-Employed Health Insurance Deduction",
  form8959: "Additional Medicare Tax",
  form8960: "Net Investment Income Tax—",
  form8995: "Simplified Computation",
  form8995a: "Qualified Business Income Deduction",
  form4972: "Tax on Lump-Sum Distributions",
};
const replay = Deno.args.includes("--replay-reviewed");
const output = "/tmp/opentax-reviewed-18-catalog-evidence";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const correctedIds = [
  "tip-health-advanced-wotc-fully-phased-out",
  "mixed-cf-tip-above-zero-wotc",
  "mixed-cf-tip-owned-health",
];
function atPath(value: any, path: string): any {
  return path.split(".").reduce((part, key) => part?.[key], value);
}
function setPath(value: any, path: string, next: unknown): void {
  const parts = path.split(".");
  const parent = parts.slice(0, -1).reduce((part, key) => part[key], value);
  parent[parts.at(-1)!] = next;
}
async function renderedPage(pdf: string, page: number): Promise<Uint8Array> {
  const result = await new Deno.Command("pdftoppm", {
    args: [
      "-f",
      String(page),
      "-l",
      String(page),
      "-scale-to",
      "750",
      "-singlefile",
      "-png",
      pdf,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  return result.stdout;
}
async function hash(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
    ),
  ).map((n) => n.toString(16).padStart(2, "0")).join("");
}
function canonical(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]]))
        : v,
  );
}
Deno.test("catalog adds eighteen reviewed public packets with frozen copy inventory and no input aliases", () => {
  assertEquals(fixtures.length, 18);
  assertEquals(metadata.reduce((n, r) => n + r.pageCount, 0), 375);
  assertEquals(metadata.reduce((n, r) => n + r.ownerCopies.length, 0), 77);
  assertEquals(
    metadata.filter((r) => r.corrected6251).map((r) => r.id),
    correctedIds,
  );
  for (const fixture of fixtures) {
    const registered = pdfReviewFixtures.filter((f) => f.id === fixture.id);
    assertEquals(registered.length, 1);
    assertEquals(registered[0].inputs, fixture.inputs);
    assertEquals(registered[0].expectedPdfForms, fixture.expectedPdfForms);
    assertEquals(registered[0].filer, fixture.filer);
  }
  const mutated: any = tipHealthCfBeneficiaryReviewFixtures()[0].inputs;
  mutated.general.taxpayer_first_name = "Changed";
  assertEquals(
    (tipHealthCfBeneficiaryReviewFixtures()[0].inputs.general as any)
      .taxpayer_first_name,
    "Alex",
  );
});
for (const row of metadata) {
  Deno.test(`review catalog ${row.id} actual sources/filer/owner copies/native/fullXSD/PDF/page origins`, async () => {
    const fixture = fixtures.find((f) => f.id === row.id)!;
    assertEquals(
      await hash(new TextEncoder().encode(canonical(fixture.inputs))),
      row.inputsSha256,
    );
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const { timestamp: _timestamp, ...filer } = extractFilerIdentity(
      pending.f1040,
    )!;
    assertEquals(JSON.parse(JSON.stringify(filer)), fixture.filer);
    const prepared = await f1040_2025.prepareReturn(pending, fixture.filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      fixture.filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertReviewPageOrigins(
      row.id,
      origins,
      fixture.expectedPdfForms,
      row.pageOrigins,
    );
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), row.pageCount);
    assertEquals(doc.getForm().getFields().length, 0);
    const correction = row.corrected6251;
    if (correction) {
      assertEquals(pending.form6251.taxable_excess, correction.taxableExcess);
      const independentlyRounded = Math.round(
        correction.taxableExcess * correction.rate - correction.subtract,
      );
      assertEquals(independentlyRounded, correction.tentativeMinimumTax);
      assertEquals(pending.form6251.tentative_tax, independentlyRounded);
      assertEquals(pending.form6251.net_tmt, independentlyRounded);
      assertEquals(
        pending.f1040.credit_limit_form6251_line9,
        independentlyRounded,
      );
      assertEquals(
        (pending.f3800.tax_context as any).tentativeMinimumTax,
        independentlyRounded,
      );
    }
    assertEquals(
      await hash(pdf),
      correction?.currentPdfSha256 ?? row.originalPdfSha256,
    );
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeFile(path, pdf);
      await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
      const firstPages = origins.filter((o, i) =>
        i === 0 || o.formKey !== origins[i - 1].formKey ||
        o.formCopy !== origins[i - 1].formCopy
      );
      for (const first of firstPages) {
        const text = await new Deno.Command("pdftotext", {
          args: [
            "-f",
            String(first.pageNumber),
            "-l",
            String(first.pageNumber),
            "-layout",
            path,
            "-",
          ],
          stdout: "piped",
        }).output();
        assertEquals(text.code, 0);
        assertStringIncludes(
          new TextDecoder().decode(text.stdout).slice(0, 900),
          titles[first.formKey],
        );
      }
      for (const owner of row.ownerCopies) {
        const text = await new Deno.Command("pdftotext", {
          args: [
            "-f",
            String(owner.pageNumber),
            "-l",
            String(owner.pageNumber),
            "-layout",
            path,
            "-",
          ],
          stdout: "piped",
        }).output();
        assertEquals(text.code, 0);
        const extracted = new TextDecoder().decode(text.stdout);
        assertStringIncludes(extracted, owner.name);
        assertStringIncludes(extracted.replace(/[ -]/g, ""), owner.ssn);
      }
      let available = false;
      try {
        await Deno.stat(xsd);
        available = true;
      } catch { /* local schema cache is optional outside held proof */ }
      if (replay) {
        assertEquals(
          available,
          true,
          "Held replay requires the complete local XSD",
        );
      }
      if (available) {
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, xmlPath],
          stderr: "piped",
        }).output();
        assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      }
      if (replay) {
        const root = roots[row.artifactGroup];
        const originalSource = await Deno.readFile(
          `${root}/${row.originalSourceName}`,
        );
        const originalPdf = await Deno.readFile(
          `${root}/${row.originalPdfName}`,
        );
        assertEquals(await hash(originalSource), row.originalSourceSha256);
        assertEquals(await hash(originalPdf), row.originalPdfSha256);
        if (!correction) assertEquals(originalPdf, pdf);
        const source = JSON.parse(new TextDecoder().decode(originalSource));
        assertEquals(source.inputs ?? source.input, fixture.inputs);
        const settledOriginal: any = normalizeAllPending(source.pending);
        if (row.id === "tip-health-advanced-wotc-fully-phased-out") {
          assertEquals(
            settledOriginal.f1040.form5884_determined_credit,
            undefined,
          );
          const issued = source.inputs.f5884.f5884s;
          assertEquals(issued.length, 1);
          assertEquals(issued[0].hours_worked, 400);
          const wages = issued[0].wage_records.reduce(
            (n: number, w: any) => n + w.qualified_wages,
            0,
          );
          assertEquals(wages, 6000);
          const determined = wages * .4;
          assertEquals(determined, 2400);
          assertEquals(pending.f1040.form5884_determined_credit, determined);
          assertEquals(
            settledOriginal.f1040.form3800_source_credits.specifiedCredit,
            determined,
          );
        }
        for (const difference of row.pendingReconciliation) {
          const old = atPath(settledOriginal, difference.path);
          assertEquals(old === undefined ? "absent" : old, difference.original);
          assertEquals(atPath(pending, difference.path), difference.current);
          if (
            difference.path === "form6251.amti" ||
            difference.path === "form6251.taxable_excess"
          ) {
            assertEquals(Math.round(Number(old)), difference.current);
          }
          if (difference.path === "form4972.source_forms.0.recipient_ssn") {
            assertEquals(
              difference.current,
              (source.inputs ?? source.input).f1099r[0].recipient_ssn,
            );
          }
          setPath(settledOriginal, difference.path, difference.current);
        }
        assertEquals(canonical(settledOriginal), canonical(pending));
        if (correction) {
          const changed: number[] = [];
          for (let page = 1; page <= row.pageCount; page++) {
            if (
              (await hash(
                await renderedPage(
                  `${root}/${row.originalPdfName}`,
                  page,
                ),
              )) !==
                (await hash(await renderedPage(path, page)))
            ) changed.push(page);
          }
          assertEquals(changed, correction.changedPageNumbers);
          assertEquals(changed.map((page) => origins[page - 1].formKey), [
            "f3800",
            "f3800",
            "form6251",
          ]);
        }
        await Deno.mkdir(output, { recursive: true });
        await Deno.writeFile(`${output}/${row.id}.pdf`, pdf);
        await Deno.writeTextFile(
          `${output}/${row.id}.xml`,
          prepared.bundle.xml,
        );
        await Deno.writeTextFile(
          `${output}/${row.id}.json`,
          JSON.stringify(
            {
              inputs: fixture.inputs,
              pending,
              filer: fixture.filer,
              pageOrigins: origins,
            },
            null,
            2,
          ),
        );
      }
    } finally {
      await Deno.remove(path);
      await Deno.remove(xmlPath);
    }
  });
}

Deno.test("review metadata binds source owners and rejects missing copies or changed page origins", () => {
  for (const row of metadata) {
    const source: any = tipHealthCfBeneficiaryReviewFixtures().find((f) =>
      f.id === row.id
    )!.inputs;
    for (const owner of row.ownerCopies) {
      const i = owner.formCopy - 1;
      let recipient = "T";
      if (owner.formKey === "schedule_c") {
        recipient = source.schedule_c[i].proprietor_recipient ?? "T";
      }
      if (owner.formKey === "schedule_f") {
        recipient = source.schedule_f.schedule_fs[i].proprietor_recipient ??
          "T";
      }
      if (owner.formKey === "schedule_se") recipient = i === 0 ? "T" : "S";
      if (owner.formKey === "form7206") {
        const health = source.form7206;
        recipient = health.independent_schedule_c_plans
          ? [...health.independent_schedule_c_plans.plans].sort((
            a: any,
            b: any,
          ) => a.business_reference.localeCompare(b.business_reference))[i]
            .recipient
          : health.single_schedule_c_plan.recipient;
      }
      assertEquals(owner.recipient, recipient);
      const prefix = recipient === "S" ? "spouse" : "taxpayer";
      assertEquals(
        owner.ssn,
        source.general[`${prefix}_ssn`].replace(/\D/g, ""),
      );
      assertEquals(
        owner.name,
        [
          source.general[`${prefix}_first_name`],
          source.general[`${prefix}_middle_initial`],
          source.general[`${prefix}_last_name`],
        ].filter(Boolean).join(" "),
      );
    }
  }
  const row = metadata.find((r) => r.id === "mixed-cf-tip-owned-health")!;
  const changed = structuredClone(row.pageOrigins);
  changed[0].formKey = "schedule_f";
  assertThrows(
    () =>
      assertReviewPageOrigins(
        row.id,
        row.pageOrigins,
        row.expectedPdfForms,
        changed,
      ),
    Error,
    "recorded PDF page origins differ",
  );
  assertThrows(
    () =>
      assertReviewPageOrigins(
        row.id,
        row.pageOrigins,
        row.expectedPdfForms.filter((k) => k !== "form7206"),
        row.pageOrigins,
      ),
    Error,
    "unexpected PDF form origin",
  );
});
