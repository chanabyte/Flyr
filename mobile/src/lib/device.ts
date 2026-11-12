import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const KEY = "flyr.deviceId";
let cached: string | null = null;

/**
 * A random ID made once per install and kept in secure storage. The server
 * stores this phone's Google sign-in under it, so treat it like a password.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  cached = id;
  return id;
}
