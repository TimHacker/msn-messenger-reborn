export interface SessionStore {
  load(): string | null;
  save(username: string): void;
}
