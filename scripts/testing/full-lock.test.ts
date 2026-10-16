import { test } from "bun:test";
import * as sys from "../support/sys.ts";
import { assertRejects } from "@std/assert";
import { join } from "node:path";
import { acquireFullRunLock, releaseFullRunLock } from "./full-lock.ts";

test("full regression lock refuses a concurrent owner and foreign release", async () => {
  const path = join(await sys.makeTempDir(), "full.lock");
  const owner = { pid: process.pid, evidence: "first", startedAt: "retained" };
  await acquireFullRunLock(path, owner);
  await assertRejects(
    () => acquireFullRunLock(path, { ...owner, evidence: "second" }),
    Error,
      "EEXIST",
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
