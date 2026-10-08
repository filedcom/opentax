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
  const file = await Deno.open(path, {
    write: true,
    createNew: true,
    mode: 0o600,
  });
  try {
    await file.write(
      new TextEncoder().encode(JSON.stringify(ownerSchema.parse(owner))),
    );
  } finally {
    file.close();
  }
}

export async function releaseFullRunLock(
  path: string,
  owner: Owner,
): Promise<void> {
  const recorded = ownerSchema.parse(JSON.parse(await Deno.readTextFile(path)));
  if (
    recorded.pid !== owner.pid || recorded.evidence !== owner.evidence ||
    recorded.startedAt !== owner.startedAt
  ) throw new Error("Full-run lock ownership changed");
  await Deno.remove(path);
}
