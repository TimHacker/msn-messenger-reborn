// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createApp } from "../../src/main";
import { InMemoryHub } from "../../src/adapters/realtime/in-memory-hub";

const mount = (hub: InMemoryHub, name: string) => {
  // Several widgets share one document, so look elements up by scoped attribute selector.
  const root = document.createElement("div");
  document.body.appendChild(root);
  createApp(root, new Map(), hub.connect());
  (root.querySelector('[id="username-input"]') as HTMLInputElement).value = name;
  (root.querySelector('[id="join-form"]') as HTMLFormElement).requestSubmit();
  return {
    say(text: string) {
      (root.querySelector('[id="message-input"]') as HTMLInputElement).value = text;
      (root.querySelector('[id="send-button"]') as HTMLElement).click();
    },
    chat: () => root.querySelector('[id="chat-box"]')!.textContent,
  };
};

describe("Real-time chat (bonus #5)", () => {
  it("shows a message to every connected user, with the sender's name", () => {
    const hub = new InMemoryHub();
    const alice = mount(hub, "Alice");
    const bob = mount(hub, "Bob");
    alice.say("Hello Bob!");
    expect(bob.chat()).toContain("Alice: Hello Bob!");
    expect(alice.chat()).toContain("Alice: Hello Bob!");
    bob.say("Hi Alice");
    expect(alice.chat()).toContain("Bob: Hi Alice");
  });
});
