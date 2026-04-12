import { VERSION, GITHUB_REPO } from "../version.ts";

const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

interface GithubRelease {
  readonly tag_name: string;
  readonly html_url: string;
}

/** Compare two semver strings. Returns >0 if b is newer than a. */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const resp = await fetch(RELEASES_API, {
      headers: { "Accept": "application/vnd.github.v3+json" },
    });
    if (!resp.ok) return null;
    return await resp.json() as GithubRelease;
  } catch {
    return null;
  }
}

function cacheDir(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  return `${home}/.opentax`;
}

function cachePath(): string {
  return `${cacheDir()}/update-check.json`;
}

interface UpdateCache {
  readonly checkedAt: number;
  readonly latestVersion: string;
}

async function readCache(): Promise<UpdateCache | null> {
  try {
    const text = await Deno.readTextFile(cachePath());
    return JSON.parse(text) as UpdateCache;
  } catch {
    return null;
  }
}

async function writeCache(cache: UpdateCache): Promise<void> {
  try {
    await Deno.mkdir(cacheDir(), { recursive: true });
    await Deno.writeTextFile(cachePath(), JSON.stringify(cache));
  } catch {
    // Non-critical -- skip silently
  }
}

/**
 * Update check. Prints a one-line notice to stderr if a newer version
 * is available. Network fetch runs at most once per day (cached).
 */
export async function checkForUpdate(): Promise<void> {
  const cache = await readCache();
  if (cache && (Date.now() - cache.checkedAt) < CHECK_INTERVAL_MS) {
    if (compareSemver(VERSION, cache.latestVersion) > 0) {
      console.error(
        `\nUpdate available: ${VERSION} → ${cache.latestVersion}. Run \`opentax update\` to upgrade.\n`,
      );
    }
    return;
  }

  try {
    const release = await fetchLatestRelease();
    if (!release) return;
    const latest = release.tag_name.replace(/^v/, "");
    await writeCache({ checkedAt: Date.now(), latestVersion: latest });
    if (compareSemver(VERSION, latest) > 0) {
      console.error(
        `\nUpdate available: ${VERSION} → ${latest}. Run \`opentax update\` to upgrade.\n`,
      );
    }
  } catch {
    // Network errors are non-critical
  }
}

/** `tax version` -- print current version */
export function versionCommand(): void {
  console.log(`opentax ${VERSION}`);
}

/** Detect the asset name for the current platform */
function assetName(): string {
  const os = Deno.build.os;
  const arch = Deno.build.arch;

  if (os === "darwin" && arch === "aarch64") return "opentax-macos-arm64";
  if (os === "darwin" && arch === "x86_64") return "opentax-macos-x64";
  if (os === "linux" && arch === "x86_64") return "opentax-linux-x64";
  if (os === "linux" && arch === "aarch64") return "opentax-linux-arm64";
  if (os === "windows" && arch === "x86_64") return "opentax-windows-x64.exe";

  throw new Error(`Unsupported platform: ${os}/${arch}`);
}

/** `tax update` -- download latest release and replace the running binary */
export async function updateCommand(): Promise<void> {
  console.log(`Current version: ${VERSION}`);
  console.log("Checking for updates...");

  const release = await fetchLatestRelease();
  if (!release) {
    console.error("Could not reach GitHub. Check your internet connection.");
    Deno.exit(1);
  }

  const latest = release.tag_name.replace(/^v/, "");
  if (compareSemver(VERSION, latest) <= 0) {
    console.log(`Already up to date (${VERSION}).`);
    return;
  }

  console.log(`New version available: ${latest}`);

  const asset = assetName();
  const downloadUrl =
    `https://github.com/${GITHUB_REPO}/releases/latest/download/${asset}`;

  console.log(`Downloading ${asset}...`);

  const resp = await fetch(downloadUrl);
  if (!resp.ok || !resp.body) {
    console.error(`Download failed: ${resp.status} ${resp.statusText}`);
    Deno.exit(1);
  }

  // Write to a temp file next to the current binary, then swap
  const currentBinary = Deno.execPath();
  const tmpPath = `${currentBinary}.update`;

  const file = await Deno.open(tmpPath, {
    write: true,
    create: true,
    truncate: true,
    mode: 0o755,
  });

  try {
    await resp.body.pipeTo(file.writable);
  } catch (err) {
    await Deno.remove(tmpPath).catch(() => {});
    throw err;
  }

  await Deno.rename(tmpPath, currentBinary);
  await writeCache({ checkedAt: Date.now(), latestVersion: latest });

  console.log(`Updated to ${latest}. Restart to use the new version.`);
}
