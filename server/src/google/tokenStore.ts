import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Credentials } from "google-auth-library";

/**
 * Saves each device's Google tokens in server/data/tokens.json (gitignored),
 * so you stay signed in across server restarts. Fine for development; for a
 * real deployment, use a database and encrypt the refresh tokens.
 */
export interface StoredAuth {
  tokens: Credentials;
  email?: string;
}

const FILE = join(dirname(fileURLToPath(import.meta.url)), "../../data/tokens.json");

function load(): Record<string, StoredAuth> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(all: Record<string, StoredAuth>) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all, null, 2), { mode: 0o600 });
}

export const tokenStore = {
  get(deviceId: string): StoredAuth | undefined {
    return load()[deviceId];
  },
  set(deviceId: string, auth: StoredAuth) {
    const all = load();
    all[deviceId] = auth;
    save(all);
  },
  /** Google only sends a refresh_token the first time, so merge instead of replacing. */
  mergeTokens(deviceId: string, tokens: Credentials) {
    const all = load();
    if (!all[deviceId]) return;
    all[deviceId].tokens = { ...all[deviceId].tokens, ...tokens };
    save(all);
  },
  delete(deviceId: string) {
    const all = load();
    delete all[deviceId];
    save(all);
  },
};
