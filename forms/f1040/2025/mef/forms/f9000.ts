import type { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { inputSchema } from "../../../nodes/inputs/f9000/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = z.input<typeof inputSchema> | readonly [];
const personNamePattern = /^([A-Za-z0-9'-] ?)*[A-Za-z0-9'-]$/;

export function form9000Identity(
  person: "taxpayer" | "spouse",
  context: MefBuildContext,
): { name: string; ssn: string } {
  const filer = context.filer;
  if (!filer) throw new Error("Form 9000 needs the filed Form 1040 identity");
  if (
    person === "spouse" &&
    (filer.filingStatus !== FilingStatus.MarriedFilingJointly || !filer.spouse)
  ) {
    throw new Error("Form 9000 spouse request needs a joint Form 1040");
  }
  const owner = person === "taxpayer" ? filer : filer.spouse!;
  const name = [
    owner.firstName,
    owner.middleInitial,
    owner.lastName,
    owner.suffix,
  ].filter((part) => part !== undefined && part !== "").join(" ");
  const ssn = person === "taxpayer" ? filer.primarySSN : filer.spouse!.ssn;
  if (
    !owner.firstName || !owner.lastName || name.length > 35 ||
    !personNamePattern.test(name) || !/^\d{9}$/.test(ssn)
  ) {
    throw new Error("Form 9000 person name and SSN need filed identity");
  }
  return { name, ssn };
}

export function buildForm9000(
  raw: Input,
  context: MefBuildContext = {},
): readonly string[] {
  if (Array.isArray(raw) && raw.length === 0) return [];
  const source = inputSchema.parse(raw);
  return source.requests.map((request) => {
    const identity = form9000Identity(request.person, context);
    return elements("IRS9000", [
      element("PersonNm", identity.name),
      element("SSN", identity.ssn),
      element("AlternativeMediaCd", request.alternative_media_code),
    ]);
  });
}

export const form9000: MefFormDescriptor<"f9000", Input, readonly string[]> = {
  pendingKey: "f9000",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f9000.pdf",
  build: buildForm9000,
};
