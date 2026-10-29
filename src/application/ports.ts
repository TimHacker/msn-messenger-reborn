export interface ChatMessageDto {
  author: string;
  text: string;
  /** Omitted means "chat" (backwards compatible). */
  kind?: "chat" | "system";
}

export interface ChatLine {
  text: string;
  kind: "chat" | "system";
}

/** Driven port: delivers published messages to every connected user (including the sender). */
export interface MessageGateway {
  publish(message: ChatMessageDto): void;
  subscribe(handler: (message: ChatMessageDto) => void): void;
}

export interface SessionStore {
  load(): string | null;
  save(username: string): void;
}
