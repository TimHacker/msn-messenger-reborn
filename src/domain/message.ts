import { Username } from "./username";

export class Message {
  private constructor(readonly author: Username, readonly text: string) {}
  /** Returns null for blank text. */
  static create(author: Username, raw: string): Message | null {
    const text = raw.trim();
    return text ? new Message(author, text) : null;
  }
  display(): string {
    return `${this.author.value}: ${this.text}`;
  }
}
