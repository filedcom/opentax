import { test } from "bun:test";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import metadata from "./review_tip_health_cf_beneficiary.metadata.json" with {
  type: "json",
};
// Fresh module processes make cyclic eager initialization observable independently of test import order.
for (
  const entry of [
    "./review_tip_health_cf_beneficiary.fixture.ts",
    "../../deductions/additional/qualified_tip_health.fixture.ts",
    "../../deductions/additional/mixed_cf_qualified_tip.fixture.ts",
    "../../deductions/business/form8995_qualified_tips.fixture.ts",
  ]
) {
  test(`review source entrypoint ${entry} initializes retained packet catalog`, async () => {
    const code = `await import(${
      JSON.stringify(new URL(entry, import.meta.url).href)
    });
      const {pdfReviewFixtures}=await import(${
      JSON.stringify(new URL("../../../review_fixtures.ts", import.meta.url).href)
    });
      for(const id of ${JSON.stringify(metadata.map((r) => r.id))}) {
        if(pdfReviewFixtures.filter(f=>f.id===id).length!==1) throw Error('retained packet inventory '+id);
      }
      console.log('eighteen retained packets ready');`;
    const result = await new sys.Command(process.execPath, {
      args: ["--eval", code],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    assertStringIncludes(
      new TextDecoder().decode(result.stdout),
      "eighteen retained packets ready",
    );
  });
}
