import type { ChatMessageDto, MessageGateway } from "../../application/ports";

/** In-process gateway: a hub that fans messages out to every connected gateway. Also serves as the offline/loopback mode. */
export class InMemoryHub {
  private readonly handlers: Array<(m: ChatMessageDto) => void> = [];

  connect(): MessageGateway {
    return {
      publish: (m) => this.handlers.forEach((h) => h(m)),
      subscribe: (h) => void this.handlers.push(h),
    };
  }
}
