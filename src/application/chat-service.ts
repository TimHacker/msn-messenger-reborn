import { Message } from "../domain/message";
import { Username } from "../domain/username";
import type { MessageGateway, SessionStore } from "./ports";

export class ChatService {
  private user: Username | null = null;
  private readonly messages: Message[] = [];
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly session: SessionStore,
    private readonly gateway: MessageGateway,
  ) {
    const saved = session.load();
    if (saved) this.user = Username.create(saved);
    gateway.subscribe((dto) => {
      const m = Message.create(Username.create(dto.author), dto.text);
      if (!m) return;
      this.messages.push(m);
      this.listeners.forEach((l) => l());
    });
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
    if (m) this.gateway.publish({ author: m.author.value, text: m.text });
  }

  history(): string[] {
    return this.messages.map((m) => m.display());
  }

  onUpdate(listener: () => void): void {
    this.listeners.push(listener);
  }
}
