/**
 * Transmitter credentials, read at run time and never stored in the repo:
 * `~/.opentax/mef.json` (mode 0600) and/or OPENTAX_MEF_* environment
 * variables, which take precedence. The certificate and private key are file
 * paths; an encrypted key's passphrase comes only from the environment.
 */
import {
  createPrivateKey,
  createPublicKey,
  type KeyObject,
  X509Certificate,
} from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import type { SigningCredential } from "./wssecurity.ts";

export enum MefEnvironment {
  Ats = "ats",
  Production = "production",
}

/** Release 10.9 URLs (MeF 10.9 Release Notes; Pub 4164 §4.1.6: 'la' for production, 'la.alt' for ATS). */
export const MEF_BASE_URLS: Readonly<Record<MefEnvironment, string>> = {
  [MefEnvironment.Ats]: "https://la.alt.www4.irs.gov/a2a/mef",
  [MefEnvironment.Production]: "https://la.www4.irs.gov/a2a/mef",
};

export const MEF_TEST_CD: Readonly<Record<MefEnvironment, MefTestCd>> = {
  [MefEnvironment.Ats]: MefTestCd.Test,
  [MefEnvironment.Production]: MefTestCd.Production,
};

export const MEF_ENV = {
  config: "OPENTAX_MEF_CONFIG",
  etin: "OPENTAX_MEF_ETIN",
  efin: "OPENTAX_MEF_EFIN",
  softwareId: "OPENTAX_MEF_SOFTWARE_ID",
  appSysId: "OPENTAX_MEF_APP_SYS_ID",
  certificate: "OPENTAX_MEF_CERT",
  privateKey: "OPENTAX_MEF_KEY",
  passphrase: "OPENTAX_MEF_KEY_PASSPHRASE",
} as const;

const fileSchema = z.object({
  etin: z.string(),
  efin: z.string(),
  softwareId: z.string(),
  appSysId: z.string(),
  certificate: z.string(),
  privateKey: z.string(),
  endpoints: z.object({
    ats: z.string().url(),
    production: z.string().url(),
  }).partial().strict(),
  /** Production stays refused unless this is true and the run confirms. */
  productionEnabled: z.boolean(),
  /** Sign a wsu:Timestamp on Login besides the MeFHeader and Body. */
  signTimestamp: z.boolean(),
}).partial().strict();

const resolvedSchema = z.object({
  etin: z.string().regex(/^[0-9]{5}$/, "ETIN must be five digits"),
  efin: z.string().regex(/^[0-9]{6}$/, "EFIN must be six digits"),
  softwareId: z.string().regex(
    /^[0-9]{8}$/,
    "Software ID must be eight digits",
  ),
  appSysId: z.string().min(1),
  certificate: z.string().min(1),
  privateKey: z.string().min(1),
});

export type MefConfig = z.infer<typeof resolvedSchema> & {
  readonly baseUrls: Readonly<Record<MefEnvironment, string>>;
  readonly productionEnabled: boolean;
  readonly signTimestamp: boolean;
  readonly source: string;
};

export class MefConfigError extends Error {}

export type MefConfigSources = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly home: string;
};

export function defaultConfigPath(home: string): string {
  return join(home, ".opentax", "mef.json");
}

async function assertPrivate(path: string, what: string): Promise<void> {
  const info = await stat(path);
  if ((info.mode & 0o077) !== 0) {
    throw new MefConfigError(
      `${what} ${path} is readable by other users; run chmod 600 ${path}`,
    );
  }
}

async function readConfigFile(path: string, required: boolean) {
  const raw = await readFile(path, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" && !required) return undefined;
      throw new MefConfigError(`Cannot read MeF config ${path}: ${error.code}`);
    },
  );
  if (raw === undefined) return {};
  await assertPrivate(path, "MeF config");
  const parsed = fileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new MefConfigError(
      `MeF config ${path}: ${
        parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(
          "; ",
        )
      }`,
    );
  }
  return parsed.data;
}

/** Merge the config file with the environment; names the missing setting and where to put it. */
export async function loadMefConfig(
  sources: MefConfigSources,
): Promise<MefConfig> {
  const explicit = sources.env[MEF_ENV.config];
  const path = explicit ?? defaultConfigPath(sources.home);
  const file = await readConfigFile(path, explicit !== undefined);
  const pick = (key: keyof typeof resolvedSchema.shape) =>
    sources.env[MEF_ENV[key]] ?? file[key];
  const merged = {
    etin: pick("etin"),
    efin: pick("efin"),
    softwareId: pick("softwareId"),
    appSysId: pick("appSysId"),
    certificate: pick("certificate"),
    privateKey: pick("privateKey"),
  };
  const missing = Object.entries(merged).filter(([, v]) => v === undefined)
    .map(([key]) =>
      `${key} (${
        MEF_ENV[key as keyof typeof resolvedSchema.shape]
      } or "${key}" in ${path})`
    );
  if (missing.length > 0) {
    throw new MefConfigError(`MeF transmission needs ${missing.join(", ")}`);
  }
  const resolved = resolvedSchema.safeParse(merged);
  if (!resolved.success) {
    throw new MefConfigError(
      resolved.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  return {
    ...resolved.data,
    baseUrls: {
      [MefEnvironment.Ats]: file.endpoints?.ats ??
        MEF_BASE_URLS[MefEnvironment.Ats],
      [MefEnvironment.Production]: file.endpoints?.production ??
        MEF_BASE_URLS[MefEnvironment.Production],
    },
    productionEnabled: file.productionEnabled === true,
    signTimestamp: file.signTimestamp ?? true,
    source: path,
  };
}

function samePublicKey(key: KeyObject, certificate: X509Certificate): boolean {
  const der = (k: KeyObject) => k.export({ type: "spki", format: "der" });
  return der(createPublicKey(key)).equals(der(certificate.publicKey));
}

/** The strong-authentication certificate and its signing key, checked against each other. */
export async function loadSigningCredential(
  config: MefConfig,
  env: Readonly<Record<string, string | undefined>>,
  now: Date,
): Promise<SigningCredential> {
  await assertPrivate(config.privateKey, "MeF private key");
  const pem = await readFile(config.certificate, "utf8");
  const first = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/
    .exec(pem)?.[0];
  if (first === undefined) {
    throw new MefConfigError(`${config.certificate} holds no PEM certificate`);
  }
  const certificate = new X509Certificate(first);
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey({
      key: await readFile(config.privateKey, "utf8"),
      passphrase: env[MEF_ENV.passphrase],
    });
  } catch {
    throw new MefConfigError(
      `Cannot read the private key ${config.privateKey}; if it is encrypted, set ${MEF_ENV.passphrase}`,
    );
  }
  if (!samePublicKey(privateKey, certificate)) {
    throw new MefConfigError(
      `Private key ${config.privateKey} does not belong to certificate ${config.certificate}`,
    );
  }
  if (
    now < new Date(certificate.validFrom) || now > new Date(certificate.validTo)
  ) {
    throw new MefConfigError(
      `Certificate ${config.certificate} is valid only ${certificate.validFrom} to ${certificate.validTo}`,
    );
  }
  return { certificate, privateKey };
}

/** Replace every secret occurrence in text before it is printed. */
export function redact(text: string, secrets: readonly string[]): string {
  return secrets.filter((s) => s.length >= 4).reduce(
    (out, secret) => out.split(secret).join("[redacted]"),
    text,
  );
}
