import { InvalidUsernameError } from "../../domain/username";
import type { ChatService } from "../../application/chat-service";

export function mountChatUi(root: HTMLElement, chat: ChatService): void {
  // Attribute selector keeps lookups scoped to this widget even when several share a document.
  const byId = (id: string) => root.querySelector(`[id="${id}"]`);
  const render = () => (chat.currentUser ? renderChat() : renderJoin());

  const renderJoin = () => {
    root.innerHTML = `
      <form id="join-form" class="card">
        <h1>MSN Messenger Reborn</h1>
        <label>Pick a username <input id="username-input" autofocus /></label>
        <button type="submit">Sign in</button>
        <p id="join-error" class="error"></p>
      </form>`;
    byId("join-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        chat.join((byId("username-input") as HTMLInputElement).value);
        render();
      } catch (err) {
        if (!(err instanceof InvalidUsernameError)) throw err;
        byId("join-error")!.textContent = err.message;
      }
    });
  };

  const renderChat = () => {
    root.innerHTML = `
      <div class="card">
        <h1>Chat – ${escapeHtml(chat.currentUser!.value)}</h1>
        <div id="chat-box"></div>
        <div class="composer">
          <input id="message-input" placeholder="Type a message…" />
          <button id="send-button">Send</button>
        </div>
      </div>`;
    const input = byId("message-input") as HTMLInputElement;
    const box = byId("chat-box") as HTMLElement;
    const paint = () => {
      box.replaceChildren(
        ...chat.history().map((line) => {
          const p = document.createElement("p");
          p.textContent = line;
          return p;
        }),
      );
      box.scrollTop = box.scrollHeight;
    };
    chat.onUpdate(() => root.contains(box) && paint());
    const send = () => {
      chat.send(input.value);
      input.value = "";
    };
    paint();
    byId("send-button")!.addEventListener("click", send);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  };

  render();
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
