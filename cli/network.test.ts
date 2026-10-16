import { test } from "bun:test";
import { assertEquals, assertRejects } from "@std/assert";
import {
  ALLOWED_HOSTS,
  NetworkPolicyError,
  restrictedFetch,
} from "./network.ts";

const reached: string[] = [];
const fake = Object.assign(
  (input: string | URL | Request) => {
    reached.push(String(input instanceof Request ? input.url : input));
    return Promise.resolve(new Response("ok"));
  },
  { preconnect: () => {} },
) as unknown as typeof fetch;

test("binary fetch reaches only the allowed HTTPS hosts", async () => {
  const guarded = restrictedFetch(ALLOWED_HOSTS, fake);
  await guarded("https://www.irs.gov/pub/irs-pdf/f1040.pdf");
  await guarded(new URL("https://api.github.com/repos/x/y/releases/latest"));
  await guarded(
    new Request("https://github.com/x/y/releases/latest/download/a"),
  );
  for (
    const url of [
      "http://www.irs.gov/pub/irs-pdf/f1040.pdf",
      "https://irs.gov.example.com/",
      "https://www.irs.gov.evil.test/",
      "https://example.com/",
      "https://127.0.0.1/",
    ]
  ) {
    await assertRejects(() => guarded(url), NetworkPolicyError, "not allowed");
  }
  assertEquals(reached, [
    "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
    "https://api.github.com/repos/x/y/releases/latest",
    "https://github.com/x/y/releases/latest/download/a",
  ]);
});
