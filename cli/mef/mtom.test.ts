import { expect, test } from "bun:test";
import { binaryContent, decodeMultipart, encodeMtom } from "./mtom.ts";
import { childElements, parseXml } from "./xml.ts";

test("MTOM round-trips binary attachments byte for byte and resolves xop:Include", () => {
  const bytes = Uint8Array.from({ length: 4096 }, (_, i) => (i * 37) % 256);
  // Bytes that look like a delimiter must not split the part.
  bytes.set(new TextEncoder().encode("\r\n--MIMEBoundary_\r\n"), 100);
  const envelope =
    '<?xml version="1.0" encoding="UTF-8"?>\n<A xmlns:xop="http://www.w3.org/2004/08/xop/include"><Att><xop:Include href="cid:1.part%40x"/></Att><Inline>AAEC</Inline></A>';
  const encoded = encodeMtom(
    envelope,
    [{ contentId: "1.part@x", bytes }],
    "0.root@x",
  );
  expect(encoded.contentType).toMatch(
    /^multipart\/related; boundary="MIMEBoundary_[0-9a-f]+"; type="application\/xop\+xml"; start="<0.root@x>"; start-info="text\/xml"$/,
  );
  const { root, parts } = decodeMultipart(encoded.body, encoded.contentType);
  expect(new TextDecoder().decode(root.bytes)).toBe(envelope);
  expect(root.headers.get("content-type")).toBe(
    'application/xop+xml; charset=UTF-8; type="text/xml"',
  );
  expect(parts[1].headers.get("content-type")).toBe("application/octet-stream");
  const [att, inline] = childElements(parseXml(envelope).root);
  expect(Buffer.from(binaryContent(att, parts)).equals(Buffer.from(bytes)))
    .toBe(true);
  expect([...binaryContent(inline, parts)]).toEqual([0, 1, 2]);
});
