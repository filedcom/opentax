import { assertThrows } from "@std/assert";
import { assertForm6251TrustSource } from "./form6251_trust_source.ts";

const copy = {
  estate_trust_name: "Example Trust",
  estate_trust_ein: "123456789",
  source_document_reference: "issued-k1-1",
  box12_code_a_amt_adjustment: -800,
  box12_codes_b_through_f_absent: true,
  box12_codes_g_through_i_absent: true,
};

Deno.test("Form 6251 line 2j replays identified trust K-1 code A copies", () => {
  const fields = { line2j_estates_and_trusts: -800 };
  const pending = { k1_trust: { k1_trusts: [copy] } };
  assertForm6251TrustSource(fields, pending);
  for (
    const altered of [
      { ...copy, box12_code_a_amt_adjustment: -700 },
      { ...copy, box12_codes_b_through_f_absent: undefined },
      { ...copy, source_document_reference: undefined },
    ]
  ) {
    assertThrows(
      () =>
        assertForm6251TrustSource(fields, {
          k1_trust: { k1_trusts: [altered] },
        }),
      Error,
      "distinct retained trust K-1 code A sources",
    );
  }
  assertThrows(
    () => assertForm6251TrustSource({}, pending),
    Error,
    "distinct retained trust K-1 code A sources",
  );
  assertThrows(
    () =>
      assertForm6251TrustSource(fields, {
        k1_trust: {
          k1_trusts: [copy, copy],
        },
      }),
    Error,
    "distinct retained trust K-1 code A sources",
  );
});
