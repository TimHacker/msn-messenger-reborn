import { ChatService } from "./application/chat-service";
import { StorageSessionStore, fromWebStorage, type KeyValueStorage } from "./adapters/storage/session-store";
import { mountChatUi } from "./adapters/ui/chat-ui";

/** Composition root: wires adapters to the application core. */
export function createApp(root: HTMLElement, storage: KeyValueStorage): void {
  mountChatUi(root, new ChatService(new StorageSessionStore(storage)));
}

const root = document.getElementById("app");
if (root) createApp(root, fromWebStorage(localStorage));
