import { ChatService } from "./application/chat-service";
import type { MessageGateway } from "./application/ports";
import { StorageSessionStore, fromWebStorage, type KeyValueStorage } from "./adapters/storage/session-store";
import { InMemoryHub } from "./adapters/realtime/in-memory-hub";
import { WebSocketGateway } from "./adapters/realtime/websocket-gateway";
import { mountChatUi } from "./adapters/ui/chat-ui";

/** Composition root: wires adapters to the application core. */
export function createApp(
  root: HTMLElement,
  storage: KeyValueStorage,
  gateway: MessageGateway = new InMemoryHub().connect(),
): void {
  mountChatUi(root, new ChatService(new StorageSessionStore(storage), gateway));
}

const root = document.getElementById("app");
if (root) {
  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  createApp(root, fromWebStorage(localStorage), wsUrl ? new WebSocketGateway(wsUrl) : undefined);
}
