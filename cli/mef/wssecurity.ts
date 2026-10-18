/**
 * WS-Security for MeF strong authentication (STP guide §1.4.5): the Login
 * request carries the X.509 certificate as a BinarySecurityToken and an
 * XML signature over the MeFHeader and SOAP Body (at least those two
 * references), using exclusive C14N, SHA-256 digests and RSA-SHA256 (or
 * ECDSA-SHA256 for an EC certificate). Later requests in the session carry
 * the SAML Security block Login returned instead, never a signature
 * (§1.4.3.3, §1.6.4 notes 2–3).
 */
import {
  createHash,
  createPublicKey,
  type KeyObject,
  randomBytes,
  sign,
  verify,
  X509Certificate,
} from "node:crypto";
import { WSU_NAMESPACE } from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import {
  DS_NAMESPACE,
  SOAP_ENV_NAMESPACE,
  soapEnvelope,
  WSSE_NAMESPACE,
} from "./protocol.ts";
import {
  attributeValue,
  child,
  childElements,
  descendants,
  elementsById,
  exclusiveCanonical,
  parseXml,
  textContent,
  type XmlElement,
} from "./xml.ts";

export const EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";
export const RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
export const ECDSA_SHA256 =
  "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256";
export const SHA256_DIGEST = "http://www.w3.org/2001/04/xmlenc#sha256";
export const X509_TOKEN =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3";
export const BASE64_ENCODING =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary";

export type SigningCredential = {
  readonly certificate: X509Certificate;
  readonly privateKey: KeyObject;
};

export type SignedEnvelopeParts = {
  /** MeFHeader carrying wsu:Id="<headerId>". */
  readonly mefHeader: string;
  readonly headerId: string;
  /** The SOAP Body's request element. */
  readonly body: string;
  readonly now: Date;
  readonly credential: SigningCredential;
  /** Also sign a wsu:Timestamp (an optional extra reference, §1.4.5.2). */
  readonly timestamp: boolean;
};

export class SignatureError extends Error {}

export function newWsuId(prefix: string): string {
  return `${prefix}-${randomBytes(12).toString("hex")}`;
}

function signatureMethod(key: KeyObject): string {
  if (key.asymmetricKeyType === "rsa") return RSA_SHA256;
  if (key.asymmetricKeyType === "ec") return ECDSA_SHA256;
  throw new SignatureError(
    `MeF signing key type ${key.asymmetricKeyType} is not RSA or ECDSA`,
  );
}

function digest(element: XmlElement): string {
  return createHash("sha256").update(exclusiveCanonical(element), "utf8")
    .digest("base64");
}

function reference(id: string, digestValue: string): string {
  return `<ds:Reference URI="#${id}"><ds:Transforms><ds:Transform Algorithm="${EXC_C14N}"></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="${SHA256_DIGEST}"></ds:DigestMethod><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference>`;
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function envelope(
  header: string,
  security: string,
  body: string,
  bodyId: string,
) {
  return soapEnvelope(
    [header, security],
    body,
    ` xmlns:wsu="${WSU_NAMESPACE}" wsu:Id="${bodyId}"`,
  );
}

function onlyById(root: XmlElement, id: string): XmlElement {
  const found = elementsById(root, id);
  if (found.length !== 1) {
    throw new SignatureError(
      `Signature reference #${id} matches ${found.length} elements`,
    );
  }
  return found[0];
}

/** A signed Login (or single-step) envelope, ready to POST. */
export function signedEnvelope(parts: SignedEnvelopeParts): string {
  const method = signatureMethod(parts.credential.privateKey);
  const bodyId = newWsuId("id");
  const tokenId = newWsuId("X509");
  const timestampId = newWsuId("TS");
  const timestamp = parts.timestamp
    ? `<wsu:Timestamp wsu:Id="${timestampId}"><wsu:Created>${
      isoSeconds(parts.now)
    }</wsu:Created><wsu:Expires>${
      isoSeconds(new Date(parts.now.getTime() + 5 * 60_000))
    }</wsu:Expires></wsu:Timestamp>`
    : "";
  const token =
    `<wsse:BinarySecurityToken EncodingType="${BASE64_ENCODING}" ValueType="${X509_TOKEN}" wsu:Id="${tokenId}">${
      parts.credential.certificate.raw.toString("base64")
    }</wsse:BinarySecurityToken>`;
  const security = (signature: string) =>
    `<wsse:Security xmlns:wsse="${WSSE_NAMESPACE}" xmlns:wsu="${WSU_NAMESPACE}">${timestamp}${token}${signature}</wsse:Security>`;
  const unsigned = parseXml(
    envelope(parts.mefHeader, security(""), parts.body, bodyId),
  ).root;
  const ids = [
    parts.headerId,
    bodyId,
    ...(parts.timestamp ? [timestampId] : []),
  ];
  const signedInfo =
    `<ds:SignedInfo><ds:CanonicalizationMethod Algorithm="${EXC_C14N}"></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="${method}"></ds:SignatureMethod>${
      ids.map((id) => reference(id, digest(onlyById(unsigned, id)))).join("")
    }</ds:SignedInfo>`;
  const signature = (value: string) =>
    `<ds:Signature xmlns:ds="${DS_NAMESPACE}">${signedInfo}<ds:SignatureValue>${value}</ds:SignatureValue><ds:KeyInfo><wsse:SecurityTokenReference><wsse:Reference URI="#${tokenId}" ValueType="${X509_TOKEN}"></wsse:Reference></wsse:SecurityTokenReference></ds:KeyInfo></ds:Signature>`;
  const placed = parseXml(
    envelope(parts.mefHeader, security(signature("")), parts.body, bodyId),
  ).root;
  const canonicalSignedInfo = exclusiveCanonical(
    descendants(placed, DS_NAMESPACE, "SignedInfo")[0],
  );
  const value = sign("sha256", Buffer.from(canonicalSignedInfo, "utf8"), {
    key: parts.credential.privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64");
  return envelope(
    parts.mefHeader,
    security(signature(value)),
    parts.body,
    bodyId,
  );
}

export type VerifiedSignature = {
  readonly certificate: X509Certificate;
  /** The Ids every ds:Reference covered, with their elements. */
  readonly signed: ReadonlyMap<string, XmlElement>;
};

function algorithm(element: XmlElement | undefined): string | undefined {
  return element === undefined
    ? undefined
    : attributeValue(element, "", "Algorithm");
}

/** Verify the request's WS-Security signature; throws SignatureError on any mismatch. */
export function verifyEnvelopeSignature(xml: string): VerifiedSignature {
  const root = parseXml(xml).root;
  const header = child(root, SOAP_ENV_NAMESPACE, "Header");
  const security = header && child(header, WSSE_NAMESPACE, "Security");
  const signature = security && child(security, DS_NAMESPACE, "Signature");
  if (!security || !signature) {
    throw new SignatureError("Request has no WS-Security signature");
  }
  const signedInfo = child(signature, DS_NAMESPACE, "SignedInfo");
  const signatureValue = child(signature, DS_NAMESPACE, "SignatureValue");
  if (!signedInfo || !signatureValue) {
    throw new SignatureError("Signature has no SignedInfo or SignatureValue");
  }
  if (
    algorithm(child(signedInfo, DS_NAMESPACE, "CanonicalizationMethod")) !==
      EXC_C14N
  ) {
    throw new SignatureError("SignedInfo is not exclusive-C14N canonicalized");
  }
  const method = algorithm(child(signedInfo, DS_NAMESPACE, "SignatureMethod"));
  const signed = new Map<string, XmlElement>();
  for (const ref of descendants(signedInfo, DS_NAMESPACE, "Reference")) {
    const uri = attributeValue(ref, "", "URI") ?? "";
    if (!uri.startsWith("#")) {
      throw new SignatureError(`Unsupported reference URI ${uri}`);
    }
    const transforms = child(ref, DS_NAMESPACE, "Transforms");
    const transformAlgorithms = transforms === undefined
      ? []
      : childElements(transforms).map(algorithm);
    if (transformAlgorithms.join() !== EXC_C14N) {
      throw new SignatureError(
        `Reference ${uri} transform is not exclusive C14N`,
      );
    }
    if (algorithm(child(ref, DS_NAMESPACE, "DigestMethod")) !== SHA256_DIGEST) {
      throw new SignatureError(`Reference ${uri} digest is not SHA-256`);
    }
    const target = onlyById(root, uri.slice(1));
    const expected = textContent(child(ref, DS_NAMESPACE, "DigestValue")!)
      .trim();
    if (digest(target) !== expected) {
      throw new SignatureError(`Digest of ${uri} does not match`);
    }
    signed.set(uri.slice(1), target);
  }
  const tokenRef = descendants(signature, WSSE_NAMESPACE, "Reference")[0];
  const tokenId = tokenRef && attributeValue(tokenRef, "", "URI");
  if (!tokenId?.startsWith("#")) {
    throw new SignatureError(
      "KeyInfo does not reference a BinarySecurityToken",
    );
  }
  const token = onlyById(root, tokenId.slice(1));
  if (
    !token.name.endsWith("BinarySecurityToken") ||
    attributeValue(token, "", "ValueType") !== X509_TOKEN
  ) {
    throw new SignatureError("Signing token is not an X.509v3 certificate");
  }
  const certificate = new X509Certificate(
    Buffer.from(textContent(token).replace(/\s+/g, ""), "base64"),
  );
  const publicKey = createPublicKey(certificate.publicKey.export({
    type: "spki",
    format: "pem",
  }));
  if (method !== signatureMethod(publicKey)) {
    throw new SignatureError(`Signature method ${method} does not fit the key`);
  }
  const valid = verify(
    "sha256",
    Buffer.from(exclusiveCanonical(signedInfo), "utf8"),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(textContent(signatureValue).replace(/\s+/g, ""), "base64"),
  );
  if (!valid) throw new SignatureError("SignatureValue does not verify");
  return { certificate, signed };
}
