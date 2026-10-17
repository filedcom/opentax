import * as fs from "node:fs/promises";
import * as sys from "../../../../scripts/support/sys.ts";

export const RETURN_4868_XSD = new URL(
  "../../../../irs/4868/2026v1.0/Extensions/4868/Return4868.xsd",
  import.meta.url,
).pathname;

export function return4868XsdAvailable(): boolean {
  try {
    sys.statSync(RETURN_4868_XSD);
    return true;
  } catch {
    // The IRS schema package is local-only (irs/README.md).
    return false;
  }
}

/** xmllint against the official TY2026 v1.0 Return4868.xsd; throws its report. */
export async function validateReturn4868Xsd(xml: string): Promise<void> {
  const path = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(path, xml);
    const output = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_4868_XSD, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (output.code !== 0) {
      throw new Error(new TextDecoder().decode(output.stderr));
    }
  } finally {
    await sys.remove(path);
  }
}
