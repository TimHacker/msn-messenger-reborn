import { Message } from "../domain/message";
import { Username } from "../domain/username";
import type { SessionStore } from "./ports";

export class ChatService {
  private user: Username | null = null;
  private readonly messages: Message[] = [];

  constructor(private readonly session: SessionStore) {
    const saved = session.load();
    if (saved) this.user = Username.create(saved);
  }

  join(rawName: string): void {
    this.user = Username.create(rawName);
    this.session.save(this.user.value);
  }

  get currentUser(): Username | null {
    return this.user;
  }

  send(rawText: string): void {
    if (!this.user) throw new Error("Join before sending");
    const m = Message.create(this.user, rawText);
    if (m) this.messages.push(m);
  }

  history(): string[] {
    return this.messages.map((m) => m.display());
  }
}
