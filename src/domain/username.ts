export class InvalidUsernameError extends Error {}

export class Username {
  private constructor(readonly value: string) {}
  static create(raw: string): Username {
    const v = raw.trim();
    if (!v) throw new InvalidUsernameError("Please enter a username");
    return new Username(v);
  }
}
