import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { z } from "zod";

const ownerSchema = z.object({
  pid: z.number().int().positive(),
  evidence: z.string().min(1),
  startedAt: z.string().min(1),
}).strict();
type Owner = z.infer<typeof ownerSchema>;

export async function acquireFullRunLock(
  path: string,
  owner: Owner,
): Promise<void> {
  const file = await fs.open(path, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(ownerSchema.parse(owner)));
  } finally {
    await file.close();
  }
}

export async function releaseFullRunLock(
  path: string,
  owner: Owner,
): Promise<void> {
  const recorded = ownerSchema.parse(
    JSON.parse(await fs.readFile(path, "utf8")),
  );
  if (
    recorded.pid !== owner.pid || recorded.evidence !== owner.evidence ||
    recorded.startedAt !== owner.startedAt
  ) throw new Error("Full-run lock ownership changed");
  await sys.remove(path);
}
