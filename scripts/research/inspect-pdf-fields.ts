/**
 * inspect-pdf-fields.ts
 *
 * Audit real IRS AcroForm fields against every registered PDF descriptor.
 *
 * Usage:
 *   deno run --allow-net=www.irs.gov --allow-read --allow-write scripts/research/inspect-pdf-fields.ts
 *
 * Output:
 *   .state/research/ty2025-pdf-field-audit/<pendingKey>-<index>.json
 *   .state/research/ty2025-pdf-field-audit/cache/<URL key>.pdf
 */

import { PDFDocument } from "pdf-lib";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { ALL_PDF_FORMS } from "../../forms/f1040/2025/pdf/forms/index.ts";
import type { PdfFormDescriptor } from "../../forms/f1040/2025/pdf/reviews/execution/form-descriptor.ts";

const DUMP_DIR =
  new URL("../../.state/research/ty2025-pdf-field-audit/", import.meta.url)
    .pathname;
const CACHE_DIR = join(DUMP_DIR, "cache");

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
  wrongType: Array<{ name: string; expected: string; actual: string }>;
  unmapped: FieldInfo[];
}

async function downloadWithCache(url: string): Promise<Uint8Array> {
  const filename = url.replace(/[^a-z0-9]/gi, "_") + ".pdf";
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

function mappedFieldTypes(descriptor: PdfFormDescriptor): Map<string, string> {
  const types = new Map<string, string>();
  const add = (
    name: string,
    kind: "text" | "checkbox" | "checkboxWhen" | "radio",
  ) => {
    const type = kind === "text"
      ? "PDFTextField"
      : kind === "radio"
      ? "PDFRadioGroup"
      : "PDFCheckBox";
    const previous = types.get(name);
    if (previous !== undefined && previous !== type) {
      throw new Error(
        `${descriptor.pendingKey}: conflicting mapped field type for ${name}`,
      );
    }
    types.set(name, type);
  };
  for (
    const entry of [
      ...descriptor.fields,
      ...(descriptor.filerFields ?? []),
    ]
  ) {
    add(entry.pdfField, entry.kind);
    for (
      const name of "extraPdfFields" in entry ? entry.extraPdfFields ?? [] : []
    ) {
      add(name, entry.kind);
    }
  }
  if (descriptor.rows) {
    for (let row = 0; row < descriptor.rows.maxRows; row++) {
      for (const field of descriptor.rows.rowFields) {
        let name = field.pdfFieldPattern.replace("{row}", String(row + 1));
        if (field.fieldNumBase !== undefined) {
          if (descriptor.rows.rowStride === undefined) {
            throw new Error(`${descriptor.pendingKey}: row stride is missing`);
          }
          name = name.replace(
            "{field_num}",
            String(field.fieldNumBase + row * descriptor.rows.rowStride)
              .padStart(2, "0"),
          );
        }
        add(name, field.kind);
      }
    }
  }
  return types;
}

async function inspectForm(
  descriptor: PdfFormDescriptor,
): Promise<FormDump & { error?: string }> {
  let bytes: Uint8Array;
  try {
    bytes = await downloadWithCache(descriptor.pdfUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `  [ERROR] failed to download ${descriptor.pendingKey}: ${message}`,
    );
    return {
      pendingKey: descriptor.pendingKey,
      pdfUrl: descriptor.pdfUrl,
      realFields: [],
      matched: [],
      missing: [],
      wrongType: [],
      unmapped: [],
      error: `download failed: ${message}`,
    };
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `  [ERROR] failed to parse ${descriptor.pendingKey}: ${message}`,
    );
    return {
      pendingKey: descriptor.pendingKey,
      pdfUrl: descriptor.pdfUrl,
      realFields: [],
      matched: [],
      missing: [],
      wrongType: [],
      unmapped: [],
      error: `parse failed: ${message}`,
    };
  }

  const form = doc.getForm();
  const realFields: FieldInfo[] = form.getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name,
  }));

  const realFieldTypes = new Map(realFields.map((f) => [f.name, f.type]));
  const mappedTypes = mappedFieldTypes(descriptor);
  const uniqueMappedNames = [...mappedTypes.keys()];

  const matched = uniqueMappedNames.filter((n) => realFieldTypes.has(n));
  const missing = uniqueMappedNames.filter((n) => !realFieldTypes.has(n));
  const wrongType = matched.flatMap((name) => {
    const expected = mappedTypes.get(name)!;
    const actual = realFieldTypes.get(name)!;
    return expected === actual ? [] : [{ name, expected, actual }];
  });

  const mappedNamesSet = new Set(uniqueMappedNames);
  const unmapped = realFields.filter((f) => !mappedNamesSet.has(f.name));

  return {
    pendingKey: descriptor.pendingKey,
    pdfUrl: descriptor.pdfUrl,
    realFields,
    matched,
    missing,
    wrongType,
    unmapped,
  };
}

async function main() {
  await ensureDir(CACHE_DIR);
  await ensureDir(DUMP_DIR);

  const results: Array<FormDump & { error?: string }> = [];
  let formsWithMissing = 0;
  let formsWithWrongType = 0;
  let formsWithUnmapped = 0;
  let formsWithErrors = 0;

  console.log(`\nInspecting ${ALL_PDF_FORMS.length} IRS PDF forms...\n`);

  for (const [index, descriptor] of ALL_PDF_FORMS.entries()) {
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
        `! wrong type: ${dump.wrongType.length}  ` +
        `? unmapped: ${dump.unmapped.length}`,
    );

    if (dump.missing.length > 0) {
      formsWithMissing++;
      console.log(`  MISSING (in descriptor but not in PDF):`);
      for (const name of dump.missing) {
        console.log(`    - ${name}`);
      }
    }
    if (dump.wrongType.length > 0) {
      formsWithWrongType++;
      for (const field of dump.wrongType) {
        console.log(
          `  WRONG TYPE ${field.name}: expected ${field.expected}, found ${field.actual}`,
        );
      }
    }

    // Write per-form dump
    const dumpPath = join(DUMP_DIR, `${descriptor.pendingKey}-${index}.json`);
    await Deno.writeTextFile(dumpPath, JSON.stringify(dump, null, 2));
  }

  formsWithUnmapped = results.filter(
    (r) => !r.error && r.unmapped.length > 0,
  ).length;

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total forms inspected : ${ALL_PDF_FORMS.length}`);
  console.log(`Forms with errors     : ${formsWithErrors}`);
  console.log(
    `Forms with missing    : ${formsWithMissing}  (descriptor names not in PDF)`,
  );
  console.log(`Forms with wrong type : ${formsWithWrongType}`);
  console.log(
    `Forms with unmapped   : ${formsWithUnmapped}  (PDF fields not in descriptor)`,
  );
  console.log("");

  // Print f1040 personal info fields
  const f1040Dump = results.find((r) => r.pendingKey === "f1040");
  if (f1040Dump && !f1040Dump.error) {
    console.log("f1040 — first 30 real fields (personal info / header):");
    for (const f of f1040Dump.realFields.slice(0, 30)) {
      console.log(`  ${f.name}  [${f.type}]`);
    }
  }

  console.log(`\nDumps written to ${DUMP_DIR}\n`);
  if (formsWithErrors > 0 || formsWithMissing > 0 || formsWithWrongType > 0) {
    throw new Error(
      `IRS PDF field audit failed: ${formsWithErrors} template errors, ${formsWithMissing} descriptors with missing fields, ${formsWithWrongType} with wrong field types`,
    );
  }
}

await main();
