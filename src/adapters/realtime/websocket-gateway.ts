import type { ChatMessageDto, MessageGateway } from "../../application/ports";

export class WebSocketGateway implements MessageGateway {
  private readonly socket: WebSocket;
  private readonly handlers: Array<(m: ChatMessageDto) => void> = [];
  private readonly outbox: string[] = [];

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.addEventListener("open", () => this.outbox.splice(0).forEach((p) => this.socket.send(p)));
    this.socket.addEventListener("message", (e) => {
      const dto = JSON.parse(String(e.data)) as ChatMessageDto;
      this.handlers.forEach((h) => h(dto));
    });
  }

  publish(message: ChatMessageDto): void {
    const payload = JSON.stringify(message);
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(payload);
    else this.outbox.push(payload);
  }

  subscribe(handler: (m: ChatMessageDto) => void): void {
    this.handlers.push(handler);
  }

  close(): void {
    this.socket.close();
  }
}
