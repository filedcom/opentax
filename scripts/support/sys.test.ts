import { test } from "bun:test";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "./sys.ts";

test("temporary directories and files are created inside their directory", async () => {
  const plain = await sys.makeTempDir();
  assertEquals(dirname(plain), tmpdir());
  const named = await sys.makeTempDir({ prefix: "named-", dir: plain });
  assertEquals(dirname(named), plain);
  assertStringIncludes(named, join(plain, "named-"));
  const file = await sys.makeTempFile({ dir: plain, suffix: ".xml" });
  assertEquals(dirname(file), plain);
  assertEquals((await sys.stat(file)).isFile, true);
  await sys.remove(plain, { recursive: true });
});
