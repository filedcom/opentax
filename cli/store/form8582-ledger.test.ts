import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { passivePropertyInputs } from "../../forms/f1040/2025/eic_passive_property.fixture.ts";
import { appendInput, createReturn, loadReturn, updateInput } from "./store.ts";
import {
  archiveForm8582LedgerCandidate,
  readForm8582LedgerCandidate,
} from "./form8582-ledger.ts";

const reference = "Synthetic candidate reference; no IRS acceptance";

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
