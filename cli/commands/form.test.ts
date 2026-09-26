import { assertEquals, assertRejects } from "@std/assert";
import { appendInput, loadInputs } from "../store/store.ts";
import {
  formAddCommand,
  formDeleteCommand,
  formGetCommand,
  formListCommand,
  formUpdateCommand,
} from "./form.ts";
import { createReturnCommand } from "./return.ts";

async function makeReturn(tmpDir: string): Promise<string> {
  const { returnId } = await createReturnCommand({
    year: 2025,
    baseDir: tmpDir,
  });
  return returnId;
}

// ─── form add ────────────────────────────────────────────────────────────────

Deno.test("formAddCommand valid W-2 appends entry with id w2_01", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const result = await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1_wages": 85000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });

    assertEquals(result.id, "w2_01");
    assertEquals(result.nodeType, "w2");

    const inputs = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(inputs["w2"].length, 1);
    assertEquals(inputs["w2"][0].id, "w2_01");
    assertEquals(inputs["w2"][0].fields["box1_wages"], 85000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand two W-2 appends produce w2_01 and w2_02", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1_wages": 85000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });
    await formAddCommand({
      returnId,
      nodeType: "w2",
      dataJson: '{"box1_wages": 45000, "box2_fed_withheld": 0}',
      baseDir: tmpDir,
    });

    const inputs = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(inputs["w2"].length, 2);
    assertEquals(inputs["w2"][0].id, "w2_01");
    assertEquals(inputs["w2"][1].id, "w2_02");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand accepts and persists normalized 1099-MISC TINs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await formAddCommand({
      returnId,
      nodeType: "f1099m",
      dataJson: JSON.stringify({
        payer_name: "Example Broker",
        payer_tin: "13-3863700",
        recipient_tin: "000-00-0000",
        box8_substitute_payments: 608.60,
      }),
      baseDir: tmpDir,
    });

    const entry = await formGetCommand({
      returnId,
      entryId: "f1099m_01",
      baseDir: tmpDir,
    });
    assertEquals(entry.fields.payer_tin, "133863700");
    assertEquals(entry.fields.recipient_tin, "000000000");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand invalid data (missing box1_wages) rejects with validation error", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "w2",
          dataJson: '{"employer": "Acme"}',
          baseDir: tmpDir,
        }),
      Error,
      "Validation error",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("form add rejects a misspelled W-2 field without storing the entry", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "w2",
          dataJson: JSON.stringify({
            box1_wages: 300000,
            box2_fed_withheld: 60000,
            box17_state_income_tax: 25000,
          }),
          baseDir: tmpDir,
        }),
      Error,
      "Unrecognized field: box17_state_income_tax",
    );
    assertEquals((await loadInputs(`${tmpDir}/${returnId}`))["w2"], undefined);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("form update rejects unknown fields on a refined schema without changing stored data", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const added = await formAddCommand({
      returnId,
      nodeType: "schedule_a",
      dataJson: JSON.stringify({ line_8a_mortgage_interest_1098: 20000 }),
      baseDir: tmpDir,
    });
    await assertRejects(
      () =>
        formUpdateCommand({
          returnId,
          entryId: added.id,
          dataJson: JSON.stringify({
            line_8a_mortgage_interest_1098: 20000,
            line_9_investment_interst: 5000,
          }),
          baseDir: tmpDir,
        }),
      Error,
      "Unrecognized field: line_9_investment_interst",
    );
    assertEquals(
      (await formGetCommand({ returnId, entryId: added.id, baseDir: tmpDir }))
        .fields,
      { line_8a_mortgage_interest_1098: 20000 },
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand malformed JSON string rejects with Invalid JSON", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "w2",
          dataJson: "not-valid-json",
          baseDir: tmpDir,
        }),
      Error,
      "Invalid JSON",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand unknown nodeType rejects with Unknown node type", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "1099div",
          dataJson: '{"box1": 500}',
          baseDir: tmpDir,
        }),
      Error,
      "Unknown node type",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formAddCommand rejects registered intermediate nodes that cannot run as inputs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formAddCommand({
          returnId,
          nodeType: "form2555",
          dataJson: '{"foreign_wages":100000,"bona_fide_resident":true}',
          baseDir: tmpDir,
        }),
      Error,
      "Node type form2555 is not a valid input for f1040/2025",
    );

    const inputs = await loadInputs(`${tmpDir}/${returnId}`);
    assertEquals(inputs["form2555"], undefined);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ─── form list ───────────────────────────────────────────────────────────────

Deno.test("formListCommand returns empty array for fresh return", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const result = await formListCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.length, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formListCommand returns all entries across node types", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "w2", { box1_wages: 30000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "general", { filing_status: 1 });

    const result = await formListCommand({ returnId, baseDir: tmpDir });
    assertEquals(result.length, 3);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formListCommand filters by nodeType", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "general", { filing_status: 1 });

    const result = await formListCommand({ returnId, baseDir: tmpDir, nodeType: "w2" });
    assertEquals(result.length, 1);
    assertEquals(result[0].nodeType, "w2");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formListCommand returns entries with fields", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 85000, box2_fed_withheld: 10000 });

    const result = await formListCommand({ returnId, baseDir: tmpDir });
    assertEquals(result[0].fields["box1_wages"], 85000);
    assertEquals(result[0].fields["box2_fed_withheld"], 10000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ─── form get ────────────────────────────────────────────────────────────────

Deno.test("formGetCommand returns correct entry by id", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 5000 });

    const result = await formGetCommand({ returnId, entryId: "w2_01", baseDir: tmpDir });
    assertEquals(result.id, "w2_01");
    assertEquals(result.nodeType, "w2");
    assertEquals(result.fields["box1_wages"], 50000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formGetCommand throws for nonexistent entry", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => formGetCommand({ returnId, entryId: "w2_99", baseDir: tmpDir }),
      Error,
      "Entry not found",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formGetCommand retrieves second entry correctly", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "w2", { box1_wages: 75000, box2_fed_withheld: 0 });

    const result = await formGetCommand({ returnId, entryId: "w2_02", baseDir: tmpDir });
    assertEquals(result.fields["box1_wages"], 75000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ─── form update ─────────────────────────────────────────────────────────────

Deno.test("formUpdateCommand replaces entry data", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 5000 });

    const updated = await formUpdateCommand({
      returnId,
      entryId: "w2_01",
      dataJson: JSON.stringify({ box1_wages: 75000, box2_fed_withheld: 8000 }),
      baseDir: tmpDir,
    });
    assertEquals(updated.id, "w2_01");
    assertEquals(updated.nodeType, "w2");

    const entry = await formGetCommand({ returnId, entryId: "w2_01", baseDir: tmpDir });
    assertEquals(entry.fields["box1_wages"], 75000);
    assertEquals(entry.fields["box2_fed_withheld"], 8000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formUpdateCommand persists normalized 1099-MISC TINs", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "f1099m", {
      payer_name: "Example Broker",
      payer_tin: "133863700",
      recipient_tin: "000000000",
    });

    await formUpdateCommand({
      returnId,
      entryId: "f1099m_01",
      dataJson: JSON.stringify({
        payer_name: "Example Broker",
        payer_tin: "13-3863700",
        recipient_tin: "000-00-0000",
        box8_substitute_payments: 608.60,
      }),
      baseDir: tmpDir,
    });

    const entry = await formGetCommand({
      returnId,
      entryId: "f1099m_01",
      baseDir: tmpDir,
    });
    assertEquals(entry.fields.payer_tin, "133863700");
    assertEquals(entry.fields.recipient_tin, "000000000");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formUpdateCommand validates against schema", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });

    await assertRejects(
      () =>
        formUpdateCommand({
          returnId,
          entryId: "w2_01",
          dataJson: JSON.stringify({ box2_fed_withheld: 0 }),
          baseDir: tmpDir,
        }),
      Error,
      "Validation error",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formUpdateCommand rejects legacy stored intermediate nodes", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "form2555", {
      foreign_wages: 100000,
      bona_fide_resident: true,
    });

    await assertRejects(
      () =>
        formUpdateCommand({
          returnId,
          entryId: "form2555_01",
          dataJson: '{"foreign_wages":90000,"bona_fide_resident":true}',
          baseDir: tmpDir,
        }),
      Error,
      "Node type form2555 is not a valid input for f1040/2025",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formUpdateCommand throws for nonexistent entry", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () =>
        formUpdateCommand({
          returnId,
          entryId: "w2_99",
          dataJson: JSON.stringify({ box1_wages: 50000, box2_fed_withheld: 0 }),
          baseDir: tmpDir,
        }),
      Error,
      "Entry not found",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formUpdateCommand does not affect other entries", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "w2", { box1_wages: 30000, box2_fed_withheld: 0 });

    await formUpdateCommand({
      returnId,
      entryId: "w2_01",
      dataJson: JSON.stringify({ box1_wages: 99000, box2_fed_withheld: 0 }),
      baseDir: tmpDir,
    });

    const entry2 = await formGetCommand({ returnId, entryId: "w2_02", baseDir: tmpDir });
    assertEquals(entry2.fields["box1_wages"], 30000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// ─── form delete ─────────────────────────────────────────────────────────────

Deno.test("formDeleteCommand removes entry", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });
    await appendInput(returnPath, "w2", { box1_wages: 30000, box2_fed_withheld: 0 });

    const deleted = await formDeleteCommand({ returnId, entryId: "w2_01", baseDir: tmpDir });
    assertEquals(deleted.id, "w2_01");
    assertEquals(deleted.nodeType, "w2");

    const remaining = await formListCommand({ returnId, baseDir: tmpDir });
    assertEquals(remaining.length, 1);
    assertEquals(remaining[0].id, "w2_02");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formDeleteCommand throws for nonexistent entry", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    await assertRejects(
      () => formDeleteCommand({ returnId, entryId: "w2_99", baseDir: tmpDir }),
      Error,
      "Entry not found",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("formDeleteCommand removing all entries leaves empty list", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const returnId = await makeReturn(tmpDir);
    const returnPath = `${tmpDir}/${returnId}`;
    await appendInput(returnPath, "w2", { box1_wages: 50000, box2_fed_withheld: 0 });

    await formDeleteCommand({ returnId, entryId: "w2_01", baseDir: tmpDir });

    const remaining = await formListCommand({ returnId, baseDir: tmpDir });
    assertEquals(remaining.length, 0);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
