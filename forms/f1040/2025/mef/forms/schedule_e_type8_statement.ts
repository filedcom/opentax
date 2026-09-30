import { PDFDocument } from "pdf-lib";
import type { z } from "zod";
import type { FilerIdentity } from "../../../mef/header.ts";
import { inputSchema } from "../../../nodes/inputs/schedule_e/index.ts";
import { appendScheduleEPartIStatement } from "../../pdf/forms/schedule_e_part_i_statement.ts";
import type { MefPdfAttachment } from "../form-descriptor.ts";

type Fields = Partial<z.infer<typeof inputSchema>>;

export const SCHEDULE_E_TYPE8_STATEMENT_FILE =
  "ScheduleEType8PropertyDescription.pdf";

export async function buildScheduleEType8Statement(
  fields: Fields,
  filer?: FilerIdentity,
): Promise<MefPdfAttachment | undefined> {
  const items = fields.schedule_es ?? [];
  if (
    !items.some((item) =>
      item.property_type === 8 &&
      (item.property_type_other_desc?.length ?? 0) > 20
    )
  ) return undefined;
  const document = await PDFDocument.create();
  const rows = items.flatMap((item, index) =>
    item.property_type === 8 && item.property_type_other_desc
      ? [{
        copy: Math.floor(index / 3) + 1,
        column: ["A", "B", "C"][index % 3],
        property: item.property_description,
        address:
          `${item.street_address}, ${item.city}, ${item.state} ${item.zip}`,
        line: "Type 8",
        description: item.property_type_other_desc,
      }]
      : []
  );
  await appendScheduleEPartIStatement(document, rows, filer);
  return {
    fileName: SCHEDULE_E_TYPE8_STATEMENT_FILE,
    description: "Schedule E Type 8 Property Descriptions",
    bytes: await document.save(),
  };
}
