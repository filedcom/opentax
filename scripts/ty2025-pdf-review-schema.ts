import { basename, dirname, join } from "@std/path";
import { sha256Hex } from "../forms/f1040/2025/prepared-source.ts";

/** Reviewed local TY2025 v5.4 bytes; these are not IRS-issued digests. */
export const REVIEW_RETURN1040_XSD_SHA256 =
  "e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c";
/** SHA-256 of sorted `relative-path NUL file-sha256 NEWLINE` records for 746 schema files. */
export const REVIEW_SCHEMA_TREE_SHA256 =
  "2d5c287ae16cc217bfaa27b697cb48eb4ed198f20eee3d728921ae15806d7ff4";

export function assertReviewSchemaDigest(actualDigest: string): void {
  if (actualDigest !== REVIEW_RETURN1040_XSD_SHA256) {
    throw new Error(
      "TY2025 Return1040.xsd SHA-256 differs from the reviewed local v5.4 schema",
    );
  }
}

export function assertReviewSchemaTreeDigest(actualDigest: string): void {
  if (actualDigest !== REVIEW_SCHEMA_TREE_SHA256) {
    throw new Error(
      "TY2025 schema tree SHA-256 differs from the reviewed local v5.4 archive",
    );
  }
}

export async function schemaTreeDigest(root: string): Promise<string> {
  const files: string[] = [];
  async function visit(parts: string[]): Promise<void> {
    for await (const entry of Deno.readDir(join(root, ...parts))) {
      const child = [...parts, entry.name];
      if (entry.isSymlink) {
        throw new Error(
          `TY2025 schema tree contains a symlink: ${child.join("/")}`,
        );
      }
      if (entry.isDirectory) await visit(child);
      else if (entry.isFile) files.push(child.join("/"));
      else {throw new Error(
          `TY2025 schema tree has an invalid entry: ${child.join("/")}`,
        );}
    }
  }
  await visit([]);
  files.sort();
  const records: string[] = [];
  for (const name of files) {
    const digest = await sha256Hex(
      await Deno.readFile(join(root, ...name.split("/"))),
    );
    records.push(`${name}\0${digest}\n`);
  }
  return sha256Hex(new TextEncoder().encode(records.join("")));
}

export async function assertReviewSchemaTree(xsdPath: string): Promise<void> {
  const ind1040 = dirname(xsdPath);
  const individualIncomeTax = dirname(ind1040);
  const root = dirname(individualIncomeTax);
  if (
    basename(xsdPath) !== "Return1040.xsd" ||
    basename(ind1040) !== "Ind1040" ||
    basename(individualIncomeTax) !== "IndividualIncomeTax" ||
    basename(root) !== "2025v5.4"
  ) {
    throw new Error(
      "TY2025 review requires the v5.4 Return1040.xsd schema path",
    );
  }
  assertReviewSchemaTreeDigest(await schemaTreeDigest(root));
}
