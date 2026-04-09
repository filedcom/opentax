/**
 * inspect-pdf-fields.ts
 *
 * One-time script to download real IRS PDFs and enumerate actual AcroForm
 * field names. Compares real field names against the mapped names in each
 * PdfFormDescriptor and writes a JSON dump per form.
 *
 * Usage:
 *   deno run --allow-net=www.irs.gov --allow-read --allow-write scripts/inspect-pdf-fields.ts
 *
 * Output:
 *   .state/field-dumps/<pendingKey>.json  — per-form dump
 *   .state/field-dumps/cache/<filename>   — cached PDFs (avoid re-downloading)
 */

import { PDFDocument } from "pdf-lib";
import { ensureDir } from "@std/fs";
import { join, basename } from "@std/path";
import { ALL_PDF_FORMS } from "../forms/f1040/2025/pdf/forms/index.ts";

const CACHE_DIR = new URL("../.state/field-dumps/cache/", import.meta.url).pathname;
const DUMP_DIR = new URL("../.state/field-dumps/", import.meta.url).pathname;

interface FieldInfo {
  name: string;
  type: string;
}

interface FormDump {
  pendingKey: string;
  pdfUrl: string;
  realFields: FieldInfo[];
  matched: string[];
  missing: string[];
  unmapped: FieldInfo[];
}

async function downloadWithCache(url: string): Promise<Uint8Array> {
  const filename = basename(url);
  const cachePath = join(CACHE_DIR, filename);

  try {
    const cached = await Deno.readFile(cachePath);
    console.log(`  [cache hit] ${filename}`);
    return cached;
  } catch {
    // Not cached — download
  }

  console.log(`  [downloading] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(cachePath, bytes);
  console.log(`  [cached] ${filename} (${bytes.length} bytes)`);
  return bytes;
}

async function inspectForm(descriptor: {
  pendingKey: string;
  pdfUrl: string;
  PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]>;
}): Promise<FormDump & { error?: string }> {
  let bytes: Uint8Array;
  try {
    bytes = await downloadWithCache(descriptor.pdfUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] failed to download ${descriptor.pendingKey}: ${message}`);
    return {
      pendingKey: descriptor.pendingKey,
      pdfUrl: descriptor.pdfUrl,
      realFields: [],
      matched: [],
      missing: [],
      unmapped: [],
      error: `download failed: ${message}`,
    };
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] failed to parse ${descriptor.pendingKey}: ${message}`);
    return {
      pendingKey: descriptor.pendingKey,
      pdfUrl: descriptor.pdfUrl,
      realFields: [],
      matched: [],
      missing: [],
      unmapped: [],
      error: `parse failed: ${message}`,
    };
  }

  const form = doc.getForm();
  const realFields: FieldInfo[] = form.getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));

  const realFieldNames = new Set(realFields.map((f) => f.name));

  // IRS AcroForm names from the descriptor (right-hand side of map tuples)
  const mappedIrsNames = descriptor.PDF_FIELD_MAP.map(([, irs]) => irs);
  // De-duplicate in case multiple domain keys map to the same IRS field
  const uniqueMappedNames = [...new Set(mappedIrsNames)];

  const matched = uniqueMappedNames.filter((n) => realFieldNames.has(n));
  const missing = uniqueMappedNames.filter((n) => !realFieldNames.has(n));

  const mappedNamesSet = new Set(uniqueMappedNames);
  const unmapped = realFields.filter((f) => !mappedNamesSet.has(f.name));

  return {
    pendingKey: descriptor.pendingKey,
    pdfUrl: descriptor.pdfUrl,
    realFields,
    matched,
    missing,
    unmapped,
  };
}

async function main() {
  await ensureDir(CACHE_DIR);
  await ensureDir(DUMP_DIR);

  const results: Array<FormDump & { error?: string }> = [];
  let formsWithMissing = 0;
  let formsWithUnmapped = 0;
  let formsWithErrors = 0;

  console.log(`\nInspecting ${ALL_PDF_FORMS.length} IRS PDF forms...\n`);

  for (const descriptor of ALL_PDF_FORMS) {
    console.log(`\n[${descriptor.pendingKey}] ${descriptor.pdfUrl}`);
    const dump = await inspectForm(descriptor);
    results.push(dump);

    if (dump.error) {
      formsWithErrors++;
      console.log(`  ERROR: ${dump.error}`);
      continue;
    }

    const mappedCount = dump.matched.length + dump.missing.length;
    console.log(
      `  real fields: ${dump.realFields.length}  ` +
      `mapped: ${mappedCount}  ` +
      `✓ matched: ${dump.matched.length}  ` +
      `✗ missing: ${dump.missing.length}  ` +
      `? unmapped: ${dump.unmapped.length}`
    );

    if (dump.missing.length > 0) {
      formsWithMissing++;
      console.log(`  MISSING (in descriptor but not in PDF):`);
      for (const name of dump.missing) {
        console.log(`    - ${name}`);
      }
    }

    // Write per-form dump
    const dumpPath = join(DUMP_DIR, `${descriptor.pendingKey}.json`);
    await Deno.writeTextFile(dumpPath, JSON.stringify(dump, null, 2));
  }

  formsWithUnmapped = results.filter(
    (r) => !r.error && r.unmapped.length > 0
  ).length;

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total forms inspected : ${ALL_PDF_FORMS.length}`);
  console.log(`Forms with errors     : ${formsWithErrors}`);
  console.log(`Forms with missing    : ${formsWithMissing}  (descriptor names not in PDF)`);
  console.log(`Forms with unmapped   : ${formsWithUnmapped}  (PDF fields not in descriptor)`);
  console.log("");

  // Print f1040 personal info fields
  const f1040Dump = results.find((r) => r.pendingKey === "f1040");
  if (f1040Dump && !f1040Dump.error) {
    console.log("f1040 — first 30 real fields (personal info / header):");
    for (const f of f1040Dump.realFields.slice(0, 30)) {
      console.log(`  ${f.name}  [${f.type}]`);
    }
  }

  console.log("\nDumps written to scripts/field-dumps/\n");
}

await main();
