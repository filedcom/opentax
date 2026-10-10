import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  rentedHomeCases,
  rentedHomeFixture,
} from "./form8829_sources.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

// The original business-loss case is retained in the fixture and discovery
// evidence; its existing Form8995 loss-carryforward boundary stays deferred.
for (const c of rentedHomeCases.filter((c) => c.id !== "business-loss")) {
  Deno.test(`Reviewed rented-home records through full return: ${c.id}`, async () => {
    const input = rentedHomeFixture(c),
      result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(result.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending = prepared.bundle.pending;
    const expected: { [id: string]: [number, number, number] } = {
      "monthly-full": [4100, 0, 8830],
      "income-limited": [2000, 2100, 0],
      "zero-income": [0, 4100, 0],
      "part-year": [2440, 0, 4038],
      "fractional-area": [6295, 0, 8322],
    };
    const [deduction, carry, tax] = expected[c.id];
    assertEquals(pending.form_8829?.line36, deduction);
    assertEquals(pending.form_8829?.line43, carry);
    assertEquals(
      pending.schedule1?.line3_schedule_c ?? 0,
      c.profit - deduction,
    );
    assertEquals(pending.f1040?.line24_total_tax, tax);
    assert(
      prepared.bundle.xml.includes(
        `<AllowableHomeBusExpnssSchCAmt>${deduction}</AllowableHomeBusExpnssSchCAmt>`,
      ),
    );
    assert(
      prepared.bundle.xml.includes(
        `<OperatingExpensesAmt>${carry}</OperatingExpensesAmt>`,
      ),
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(origins.filter((o) => o.formKey === "form_8829").length, 1);
    const mutations: Array<(p: any) => void> = [
      (p) => delete p.form_8829.rented_home.source_evidence,
      (p) =>
        p.form_8829.rented_home.source_evidence.home_identifier =
          "Different-home",
      (p) =>
        p.form_8829.rented_home.source_evidence.business_reference =
          "Different-business",
      (p) =>
        p.form_8829.rented_home.source_evidence.recipient_tin = "999887777",
      (p) =>
        p.form_8829.rented_home.source_evidence.home_use_record
          .business_area_sqft++,
      (p) =>
        p.form_8829.rented_home.source_evidence.home_use_record.use_started_on =
          "2025-12-31",
      (p) => p.form_8829.rented_home.source_evidence.expenses[0].amount++,
      (p) =>
        p.form_8829.rented_home.source_evidence.expenses.push({
          ...p.form_8829.rented_home.source_evidence.expenses[0],
        }),
      (p) =>
        p.form_8829.rented_home.source_evidence.expenses[0].covered_through =
          "2026-01-01",
      (p) =>
        p.form_8829.rented_home.source_evidence.expenses[0]
          .not_claimed_elsewhere_confirmed = false,
      (p) =>
        p.form_8829.rented_home.source_evidence.expenses.find((e: any) =>
          e.category === "repairs_direct"
        ).direct_repairs_business_area_only_confirmed = false,
      (p) => p.form_8829.rented_home.prior_operating_carryover++,
      (p) => p.form_8829.line36++,
      (p) => p.form_8829.line43++,
      (p) =>
        p.schedule_c.schedule_cs[0].business_reference = "Different-business",
      (p) => p.schedule_c.schedule_cs[0].proprietor_recipient = "S",
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(pending);
      mutate(changed);
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      const sourceSha256 = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256,
        })
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM8829_SOURCE_EVIDENCE");
    } catch { /* Optional private evidence. */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            id: c.id,
            input,
            pending,
            origins,
            expected: { deduction, carry, tax },
            nativeRejections: mutations.length,
            pdfRejections: mutations.length,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
    }
  });
}

Deno.test("Rented-home public calculation rejects conflicting reviewed records", () => {
  const mutations: Array<(input: any) => void> = [
    (i) =>
      i.form_8829.rented_home.source_evidence.home_identifier = "Detached home",
    (i) =>
      i.form_8829.rented_home.source_evidence.home_use_record
        .business_area_sqft++,
    (i) => i.form_8829.rented_home.source_evidence.expenses[0].amount++,
    (i) =>
      i.form_8829.rented_home.source_evidence.expenses[0].covered_from =
        "2024-01-01",
    (i) =>
      i.form_8829.rented_home.source_evidence.expenses.push({
        ...i.form_8829.rented_home.source_evidence.expenses[0],
      }),
    (i) =>
      i.form_8829.rented_home.source_evidence.carryover
        .line43_operating_carryover++,
    (i) =>
      i.form_8829.rented_home.source_evidence.carryover.recipient_tin =
        "999887777",
  ];
  for (const mutate of mutations) {
    const input = rentedHomeFixture(rentedHomeCases[0]);
    mutate(input);
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.severity === "error"
      ),
    );
  }
});
