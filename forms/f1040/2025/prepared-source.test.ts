import { assertNotEquals } from "@std/assert";
import { preparedSourceSha256 } from "./prepared-source.ts";

Deno.test("prepared source hash binds canonical Form 8949 sale rows", async () => {
  const source = {
    form8949: [{ part: "E", proceeds: 5_000, gain_loss: 3_000 }],
  };
  const changed = {
    form8949: [{ part: "E", proceeds: 5_001, gain_loss: 3_001 }],
  };
  assertNotEquals(
    await preparedSourceSha256(source, undefined),
    await preparedSourceSha256(changed, undefined),
  );
});
