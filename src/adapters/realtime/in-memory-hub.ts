import type { ChatMessageDto, MessageGateway } from "../../application/ports";

/** In-process gateway: a hub that fans messages out to every connected gateway. Also serves as the offline/loopback mode.
 *  Mirrors the server: a "join" becomes a system notice for everyone else. */
export class InMemoryHub {
  private readonly handlers: Array<(m: ChatMessageDto) => void> = [];

  connect(): MessageGateway {
    let self: ((m: ChatMessageDto) => void) | undefined;
    return {
      publish: (m) => {
        if (m.kind === "join") {
          const notice: ChatMessageDto = { author: m.author, text: `${m.author} joined the chat`, kind: "system" };
          this.handlers.forEach((h) => h !== self && h(notice));
        } else {
          this.handlers.forEach((h) => h(m));
        }
      },
      subscribe: (h) => {
        self = h;
        this.handlers.push(h);
      },
    };
  }
}
