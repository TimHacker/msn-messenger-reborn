import { Message } from "../domain/message";
import { Username } from "../domain/username";
import type { ChatLine, MessageGateway, SessionStore } from "./ports";

export class ChatService {
  private user: Username | null = null;
  private readonly lines: ChatLine[] = [];
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly session: SessionStore,
    private readonly gateway: MessageGateway,
  ) {
    const saved = session.load();
    if (saved) this.user = Username.create(saved);
    gateway.subscribe((dto) => {
      if (dto.kind === "system") {
        if (dto.author === this.user?.value) return; // don't announce yourself to yourself
        this.lines.push({ text: dto.text, kind: "system" });
      } else {
        const m = Message.create(Username.create(dto.author), dto.text);
        if (!m) return;
        this.lines.push({ text: m.display(), kind: "chat" });
      }
      this.listeners.forEach((l) => l());
    });
  }

  join(rawName: string): void {
    this.user = Username.create(rawName);
    this.session.save(this.user.value);
    this.gateway.publish({ author: this.user.value, text: `${this.user.value} joined the chat`, kind: "system" });
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
    return this.lines.map((l) => l.text);
  }

  entries(): readonly ChatLine[] {
    return this.lines;
  }

  onUpdate(listener: () => void): void {
    this.listeners.push(listener);
  }
}
