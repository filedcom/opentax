/** The IRS MeF files under irs/: which are present, missing or altered (see irs/README.md). */
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import { z } from "zod";
import { repositoryFiles } from "./repository.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));

const manifestSchema = z.object({
  packages: z.array(z.object({
    id: z.string().min(1),
    use: z.string().min(1),
    source: z.string().min(1),
    path: z.string().min(1),
    files: z.record(z.string().regex(/^[0-9a-f]{64}$/)).refine(
      (files) => Object.keys(files).length > 0,
    ),
  })),
});

export type IrsManifest = z.infer<typeof manifestSchema>;

export enum IrsStatus {
  Present = "present",
  Missing = "missing",
  Altered = "altered",
}

export async function readIrsManifest(base = root): Promise<IrsManifest> {
  return manifestSchema.parse(
    JSON.parse(await fs.readFile(join(base, "irs/manifest.json"), "utf8")),
  );
}

/** Each package's status: every listed file present with its recorded SHA-256. */
export async function irsPackageStatus(
  manifest: IrsManifest,
  base = root,
): Promise<{ id: string; status: IrsStatus; detail: string[] }[]> {
  return await Promise.all(manifest.packages.map(async (pkg) => {
    const detail: string[] = [];
    let missing = 0, altered = 0;
    for (const [file, sha256] of Object.entries(pkg.files)) {
      const path = join(base, "irs", pkg.path, file);
      const bytes = await fs.readFile(path).catch(() => null);
      if (bytes === null) {
        missing++;
        detail.push(`missing irs/${pkg.path}/${file}`);
      } else if (createHash("sha256").update(bytes).digest("hex") !== sha256) {
        altered++;
        detail.push(`altered irs/${pkg.path}/${file}`);
      }
    }
    const status = altered > 0
      ? IrsStatus.Altered
      : missing > 0
      ? IrsStatus.Missing
      : IrsStatus.Present;
    return { id: pkg.id, status, detail };
  }));
}

/** irs/ locations named in source that no manifest package covers. */
export function undeclaredIrsReferences(
  sources: ReadonlyMap<string, string>,
  manifest: IrsManifest,
): string[] {
  const declared = manifest.packages.flatMap((pkg) =>
    pkg.path === "rules"
      ? Object.keys(pkg.files).map((file) => `rules/${file}`)
      : [pkg.path]
  );
  const problems = new Set<string>();
  for (const [path, text] of sources) {
    for (
      const match of text.matchAll(
        /\birs\/((?:(?:mef|wsdl)\/[^/"'`\s]+)|(?:rules\/[^"'`\s]+))/g,
      )
    ) {
      if (
        !declared.some((d) => match[1] === d || match[1].startsWith(`${d}/`))
      ) {
        problems.add(`${path}: irs/${match[1]} is not in irs/manifest.json`);
      }
    }
  }
  return [...problems].sort();
}

async function main(args: string[]): Promise<number> {
  const manifest = await readIrsManifest();
  const statuses = await irsPackageStatus(manifest);
  const sources = new Map<string, string>();
  const own = "scripts/testing/irs.test.ts";
  for (
    const path of (await repositoryFiles(root)).filter((p) =>
      p.endsWith(".ts") && p !== own
    )
  ) {
    sources.set(path, await fs.readFile(join(root, path), "utf8"));
  }
  const undeclared = undeclaredIrsReferences(sources, manifest);
  if (args.includes("--json")) {
    console.log(JSON.stringify({ packages: statuses, undeclared }, null, 2));
  } else {
    for (const { id, status, detail } of statuses) {
      console.log(`${status.padEnd(8)} ${id}`);
      for (const line of detail) console.log(`         ${line}`);
    }
    for (const line of undeclared) console.error(line);
    console.log(
      `${
        statuses.filter((s) => s.status === IrsStatus.Present).length
      } of ${statuses.length} IRS packages present; see irs/README.md to install`,
    );
  }
  // Absent packages are normal (CI); altered files and undeclared references are not.
  return undeclared.length > 0 ||
      statuses.some((s) => s.status === IrsStatus.Altered)
    ? 1
    : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
