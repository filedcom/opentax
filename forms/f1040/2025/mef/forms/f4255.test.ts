import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema } from "../../../nodes/inputs/f4255/index.ts";
import { form4255Row } from "../../form4255.fixture.ts";
import { form4255 } from "./f4255.ts";

Deno.test("Form 4255 stages a source-bound positive row but closes native export", () => {
  assertEquals(inputSchema.safeParse({ rows: [form4255Row] }).success, true);
  assertThrows(
    () => form4255.build({ rows: [form4255Row] }),
    Error,
    "authenticated prior-credit and IRS determination source bytes",
  );
});

Deno.test("Form 4255 rejects EP notice or prior-return changes before native export", () => {
  assertThrows(
    () =>
      form4255.build({
        rows: [{
          ...form4255Row,
          excessive_payment_notice: {
            ...form4255Row.excessive_payment_notice,
            net_epe_portion: 299,
          },
        }],
      }),
    Error,
  );
  assertEquals(
    inputSchema.safeParse({
      rows: [{
        ...form4255Row,
        prior_credit_evidence: {
          ...form4255Row.prior_credit_evidence,
          prior_credit_claimed: 9_999,
        },
      }],
    }).success,
    false,
  );
});
