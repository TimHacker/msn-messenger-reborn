import type { SessionStore } from "../../application/ports";

export interface KeyValueStorage {
  get(key: string): string | undefined | null;
  set(key: string, value: string): void;
}

const KEY = "msn-username";

export class StorageSessionStore implements SessionStore {
  constructor(private readonly storage: KeyValueStorage) {}
  load() {
    return this.storage.get(KEY) ?? null;
  }
  save(username: string) {
    this.storage.set(KEY, username);
  }
}

export const fromWebStorage = (s: Storage): KeyValueStorage => ({
  get: (k) => s.getItem(k),
  set: (k, v) => s.setItem(k, v),
});
