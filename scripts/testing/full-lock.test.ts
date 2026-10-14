import { assertRejects } from "@std/assert";
import { join } from "@std/path";
import { acquireFullRunLock, releaseFullRunLock } from "./full-lock.ts";

Deno.test("full regression lock refuses a concurrent owner and foreign release", async () => {
  const path = join(await Deno.makeTempDir(), "full.lock");
  const owner = { pid: Deno.pid, evidence: "first", startedAt: "retained" };
  await acquireFullRunLock(path, owner);
  await assertRejects(
    () => acquireFullRunLock(path, { ...owner, evidence: "second" }),
    Deno.errors.AlreadyExists,
  );
  await assertRejects(
    () => releaseFullRunLock(path, { ...owner, evidence: "second" }),
    Error,
    "ownership changed",
  );
  await releaseFullRunLock(path, owner);
  await acquireFullRunLock(path, { ...owner, evidence: "second" });
  await releaseFullRunLock(path, { ...owner, evidence: "second" });
});
