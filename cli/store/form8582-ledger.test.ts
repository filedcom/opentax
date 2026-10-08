import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { passivePropertyInputs } from "../../forms/f1040/2025/domains/credits/earned-income/earned-income/eic_passive_property.fixture.ts";
import { reconcileForm8582NextYearOpening } from "../../forms/f1040/nodes/intermediate/forms/income/business/form8582/next_year_import.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { buildForm8582Ledger } from "../../forms/f1040/nodes/intermediate/forms/income/business/form8582/ledger.ts";
import { assertThrows } from "@std/assert";
import { buildPending } from "../../forms/f1040/2025/mef/execution/pending.ts";
import { buildMefBundle } from "../../forms/f1040/2025/mef/builder.ts";
import {
  buildPdfBytes,
  type PdfPageOrigin,
} from "../../forms/f1040/2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { PDFDocument } from "pdf-lib";
import { appendInput, createReturn, loadReturn, updateInput } from "./store.ts";
import {
  archiveForm8582LedgerCandidate,
  readForm8582LedgerCandidate,
} from "./form8582-ledger.ts";

const reference = "Synthetic candidate reference; no IRS acceptance";

function firstYearSaleInputs(active: boolean, entire: boolean) {
  const inputs = passivePropertyInputs();
  delete inputs.f4835;
  inputs.w2[0].box1_wages = 160000;
  const activityId = "first-year-rental";
  const name = "First-year rental";
  inputs.schedule_e = [{
    tsj: "T",
    activity_id: activityId,
    property_description: name,
    property_type: 1,
    activity_type: active ? "A" : "B",
    active_participation: active,
    fair_rental_days: 180,
    personal_use_days: 0,
    rent_income: 0,
    expense_taxes: 5000,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    disposed_of: true,
    first_year_activity_source: {
      activity_id: activityId,
      activity_name: name,
      activity_acquired_on: "2025-01-01",
      acquisition_document_reference: "Synthetic current rental acquisition",
      not_grouped_with_prior_activity: true,
    },
    passive_property_sales: [{
      activity_id: activityId,
      activity_name: name,
      part: "II",
      property_description: "Rental equipment",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: entire ? 15000 : 9000,
      cost_or_other_basis: 7000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: entire,
      buyer_unrelated: true,
      fully_taxable: true,
      installment_method: false,
      disposition_document_reference: "Synthetic current equipment closing",
    }],
  }];
  return inputs;
}

async function source(base: string, rent = 2000, farmIncome = true) {
  const inputs = passivePropertyInputs(-3000);
  const property = inputs.schedule_e[0];
  property.passive_property_sales[0].current_loss_source_reference =
    property.current_property_source.source_reference;
  property.rent_income = rent;
  property.current_property_source.rent_payments[0].amount = rent;
  if (farmIncome) {
    inputs.f4835[0].livestock_crop_income = 9000;
    inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  const returned = await createReturn(2025, base);
  const entry = await appendInput(returned.returnPath, "start", inputs);
  return { ...returned, inputs, entry };
}

Deno.test("durable Form 8582 candidates preserve original characters and private source/XML bytes without marking acceptance", async () => {
  const base = await Deno.makeTempDir();
  try {
    for (
      const c of [
        { rent: 2000, farm: true, total: 2000, lines: [500, 1500] },
        { rent: 2000, farm: false, total: 9000, lines: [1000, 3000, 5000] },
        { rent: 8000, farm: false, total: 5000, lines: [5000] },
        { rent: 4000, farm: false, total: 7000, lines: [2000, 5000] },
      ]
    ) {
      const facts = await source(base, c.rent, c.farm);
      const before = await loadReturn(facts.returnPath);
      const record = await archiveForm8582LedgerCandidate(
        base,
        facts.returnId,
        reference,
      );
      assertEquals(record.status, "acceptance-unverified");
      assertEquals(record.taxpayerSsn, facts.inputs.general.taxpayer_ssn);
      assertEquals(record.ledger.ending_unallowed_loss, c.total);
      assertEquals(
        record.ledger.activities.flatMap((row) =>
          row.lines.map((line) => line.ending_unallowed_loss)
        ),
        c.lines,
      );
      assertEquals(
        await readForm8582LedgerCandidate(
          base,
          facts.returnId,
          record.recordId,
          reference,
        ),
        record,
      );
      assertEquals(await loadReturn(facts.returnPath), before);
      const root = join(facts.returnPath, "form8582-ledger-candidates");
      const path = join(root, record.recordId);
      const archivedSource = JSON.parse(
        await Deno.readTextFile(join(path, "source.json")),
      );
      assertEquals(archivedSource, before);
      assert(
        (await Deno.readTextFile(join(path, "form8582.xml"))).includes(
          "<TotalLossesAllowedAmt>",
        ),
      );
      if (Deno.build.os !== "windows") {
        for (const directory of [root, path]) {
          assertEquals((await Deno.stat(directory)).mode! & 0o777, 0o700);
        }
        for (const file of ["record.json", "source.json", "form8582.xml"]) {
          assertEquals(
            (await Deno.stat(join(path, file))).mode! & 0o777,
            0o600,
          );
        }
      }
    }
  } finally {
    await Deno.remove(base, { recursive: true });
  }
});

Deno.test("Form 8582 candidate rejects byte corruption, coherent ledger forgery, changed reference and source edits with unchanged PAL totals", async () => {
  const base = await Deno.makeTempDir();
  try {
    const facts = await source(base);
    const record = await archiveForm8582LedgerCandidate(
      base,
      facts.returnId,
      reference,
    );
    const path = join(
      facts.returnPath,
      "form8582-ledger-candidates",
      record.recordId,
    );
    const read = () =>
      readForm8582LedgerCandidate(
        base,
        facts.returnId,
        record.recordId,
        reference,
      );
    await assertRejects(() =>
      readForm8582LedgerCandidate(
        base,
        facts.returnId,
        record.recordId,
        "another filing",
      )
    );
    for (const name of ["source.json", "form8582.xml"]) {
      const original = await Deno.readFile(join(path, name));
      await Deno.writeTextFile(join(path, name), "corrupt");
      await assertRejects(
        read,
        Error,
        "differs from archived or current sources",
      );
      await Deno.writeFile(join(path, name), original);
    }
    const forged = structuredClone(record);
    const [operating, ordinary] = forged.ledger.activities[0].lines;
    operating.allowed_loss -= 1;
    operating.ending_unallowed_loss += 1;
    ordinary.allowed_loss += 1;
    ordinary.ending_unallowed_loss -= 1;
    await Deno.writeTextFile(join(path, "record.json"), JSON.stringify(forged));
    await assertRejects(
      read,
      Error,
      "differs from archived or current sources",
    );
    await Deno.writeTextFile(join(path, "record.json"), JSON.stringify(record));
    const falselyAccepted = { ...record, status: "accepted" };
    await Deno.writeTextFile(
      join(path, "record.json"),
      JSON.stringify(falselyAccepted),
    );
    await assertRejects(read);
    await Deno.writeTextFile(join(path, "record.json"), JSON.stringify(record));
    const prior = await Deno.readFile(join(path, "source.json"));
    facts.inputs.w2[0].employer_name = "Edited employer source";
    await updateInput(facts.returnPath, facts.entry.id, facts.inputs);
    await assertRejects(
      read,
      Error,
      "differs from archived or current sources",
    );
    assertEquals(await Deno.readFile(join(path, "source.json")), prior);
  } finally {
    await Deno.remove(base, { recursive: true });
  }
});

Deno.test("Form 8582 candidate concurrent snapshots do not overwrite and reject foreign identity, unsupported year and unresolved sources", async () => {
  const base = await Deno.makeTempDir();
  try {
    const facts = await source(base);
    const records = await Promise.all([
      archiveForm8582LedgerCandidate(base, facts.returnId, reference),
      archiveForm8582LedgerCandidate(base, facts.returnId, reference),
    ]);
    assert(records[0].recordId !== records[1].recordId);
    assertEquals(records[0].sourceSha256, records[1].sourceSha256);
    const root = join(facts.returnPath, "form8582-ledger-candidates");
    const names = [];
    for await (const entry of Deno.readDir(root)) names.push(entry.name);
    assertEquals(names.sort(), records.map((r) => r.recordId).sort());
    const other = await source(base);
    const otherRecord = await archiveForm8582LedgerCandidate(
      base,
      other.returnId,
      reference,
    );
    const path = join(root, records[0].recordId, "record.json");
    await Deno.writeTextFile(path, JSON.stringify(otherRecord));
    await assertRejects(() =>
      readForm8582LedgerCandidate(
        base,
        facts.returnId,
        records[0].recordId,
        reference,
      )
    );
    const unsupported = await createReturn(2026, base);
    await assertRejects(
      () =>
        archiveForm8582LedgerCandidate(base, unsupported.returnId, reference),
      Error,
      "TY2025",
    );
    delete facts.inputs.schedule_e[0].passive_property_sales[0]
      .current_loss_source_reference;
    await updateInput(facts.returnPath, facts.entry.id, facts.inputs);
    await assertRejects(() =>
      archiveForm8582LedgerCandidate(base, facts.returnId, reference)
    );
    const after = [];
    for await (const entry of Deno.readDir(root)) after.push(entry.name);
    assertEquals(after.sort(), names.sort());
    await assertRejects(() =>
      archiveForm8582LedgerCandidate(base, "../escape", reference)
    );
  } finally {
    await Deno.remove(base, { recursive: true });
  }
});

Deno.test("durable first-year rental sale ledgers retain allowed operating character and zero closing balance for an entire overall gain", async () => {
  const base = await Deno.makeTempDir();
  try {
    for (const active of [false, true]) {
      for (const entire of [false, true]) {
        // Active entire-gain export remains guarded by the existing graph.
        if (active && entire) continue;
        const inputs = firstYearSaleInputs(active, entire);
        const graph = f1040_2025.executeReturn(inputs);
        assertEquals(graph.diagnostics, []);
        const pending = normalizeAllPending(graph.pending);
        const facts = await createReturn(2025, base);
        const entry = await appendInput(facts.returnPath, "start", inputs);
        const record = await archiveForm8582LedgerCandidate(
          base,
          facts.returnId,
          reference,
        );
        assertEquals(record.status, "acceptance-unverified");
        const expectedSuspended = entire ? 0 : 3000;
        assertEquals(record.ledger.ending_unallowed_loss, expectedSuspended);
        assertEquals(record.ledger.activities[0].lines, [{
          reporting_form: "schedule_e",
          opening_unallowed_loss: 0,
          current_year_loss: 5000,
          current_same_part_income: 0,
          allowed_loss: entire ? 5000 : 2000,
          ending_unallowed_loss: expectedSuspended,
        }]);
        assertEquals(record.ledger.activities[0].reporting_part, "viii");
        assertEquals(pending.schedule1.line4_other_gains, entire ? 8000 : 2000);
        assertEquals(
          pending.schedule1.line5_schedule_e,
          entire ? -5000 : -2000,
        );
        assertEquals(pending.f1040.line11_agi, entire ? 163000 : 160000);
        assertEquals(
          await readForm8582LedgerCandidate(
            base,
            facts.returnId,
            record.recordId,
            reference,
          ),
          record,
        );
        if (!entire) {
          const opening = {
            tax_year: 2026,
            prior_accepted_return_reference: reference,
            rows: [{
              activity_id: "first-year-rental",
              reporting_part: "viii",
              reporting_form: "schedule_e",
              prior_unallowed_loss: 3000,
            }],
          };
          // Contract arithmetic only: the candidate reference remains unverified.
          assertEquals(
            reconcileForm8582NextYearOpening(
              opening,
              record.ledger,
              pending.form8582,
              reference,
            ),
            opening,
          );
        }
        for (
          const mutate of [
            (p: any) => {
              delete p.activities[0].first_year_activity_source;
            },
            (p: any) => {
              p.activities[0].first_year_activity_source.activity_acquired_on =
                "2024-01-01";
            },
            (p: any) => {
              p.activities[0].first_year_activity_source.activity_id =
                "different";
            },
            (p: any) => {
              p.current_4797_sale_gains[0].part = "I";
            },
            (p: any) => {
              p.current_4797_sale_gains[0].entire_activity_interest_disposed =
                undefined;
            },
            (p: any) => {
              p.current_4797_sale_gains[0].gain = 5000;
            },
          ]
        ) {
          const changed = structuredClone(pending.form8582);
          mutate(changed);
          assertThrows(() => buildForm8582Ledger(changed, reference));
        }
        inputs.schedule_e[0].first_year_activity_source.activity_acquired_on =
          "2025-02-01";
        await updateInput(facts.returnPath, entry.id, inputs);
        await assertRejects(() =>
          archiveForm8582LedgerCandidate(base, facts.returnId, reference)
        );
      }
    }
  } finally {
    await Deno.remove(base, { recursive: true });
  }
});

Deno.test("first-year sale ledger sources produce complete native and prepared PDF packets", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  const schema = new URL(
    "../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  for (
    const c of [
      { id: "other-retained", active: false, entire: false },
      { id: "active-retained", active: true, entire: false },
      { id: "other-entire-gain", active: false, entire: true },
    ]
  ) {
    const inputs = firstYearSaleInputs(c.active, c.entire);
    const graph = f1040_2025.executeReturn(inputs);
    assertEquals(graph.diagnostics, []);
    const pending = normalizeAllPending(graph.pending);
    const before = structuredClone(pending);
    const filer = extractFilerIdentity(pending.f1040)!;
    const bundle = await buildMefBundle(buildPending(pending), {
      filer,
      attachments: [],
    });
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      bundle.pending,
      filer,
      undefined,
      bundle,
      origins,
    );
    assertEquals(
      (await PDFDocument.load(bytes)).getPageCount(),
      origins.length,
    );
    assert(origins.some((p) => p.formKey === "form8582"));
    assert(origins.some((p) => p.formKey === "form4797"));
    assertEquals(pending.schedule1.line4_other_gains, c.entire ? 8000 : 2000);
    assertEquals(pending.schedule1.line5_schedule_e, c.entire ? -5000 : -2000);
    assertEquals(pending.f1040.line11_agi, c.entire ? 163000 : 160000);
    assertEquals(pending, before);
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const validated = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, temp],
        stderr: "piped",
      }).output();
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
    } finally {
      await Deno.remove(temp);
    }
    if (output) {
      const dir = join(output, c.id);
      await Deno.mkdir(dir, { mode: 0o700 });
      await Deno.writeFile(join(dir, "return.pdf"), bytes, {
        createNew: true,
        mode: 0o600,
      });
      await Deno.writeTextFile(join(dir, "return.xml"), bundle.xml, {
        createNew: true,
        mode: 0o600,
      });
      await Deno.writeTextFile(
        join(dir, "source-pending.json"),
        JSON.stringify(
          {
            inputs,
            pending,
            preparedPending: bundle.pending,
            origins,
            carryforwards: graph.carryforwards,
            ledger: buildForm8582Ledger(pending.form8582, reference),
            issuerVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
        { createNew: true, mode: 0o600 },
      );
    }
  }
});
